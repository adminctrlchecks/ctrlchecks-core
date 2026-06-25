/**
 * circuit-breaker.ts
 *
 * Lightweight sliding-window circuit breaker for microservice clients.
 *
 * States:
 *   CLOSED    — normal operation; all attempts allowed.
 *   OPEN      — too many recent failures; all attempts blocked for `cooldownMs`.
 *   HALF_OPEN — cooldown elapsed; exactly one probe attempt allowed.
 *               Success → CLOSED. Failure → OPEN (timer resets).
 *
 * Usage:
 *   const breaker = new CircuitBreaker('my-service');
 *   if (!breaker.canAttempt()) return null;          // fall back to monolith
 *   try {
 *     const result = await callRemote();
 *     breaker.recordSuccess();
 *     return result;
 *   } catch {
 *     breaker.recordFailure();
 *     return null;
 *   }
 *
 * The `now` parameter is injectable for testing (pass () => fakeTimestamp).
 */

import { logger } from '../core/logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private window: boolean[] = [];  // true = success, false = failure
  private openedAt = 0;
  private halfOpenInFlight = false;

  constructor(
    private readonly name: string,
    private readonly windowSize = 5,
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 60_000,
    readonly now: () => number = Date.now,
  ) {}

  /**
   * Returns true if the caller should attempt the remote call.
   * Returns false when the circuit is OPEN (still cooling down).
   *
   * Side effect: transitions OPEN → HALF_OPEN when cooldown expires.
   */
  canAttempt(): boolean {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      if (this.now() - this.openedAt >= this.cooldownMs && !this.halfOpenInFlight) {
        this.halfOpenInFlight = true;
        this.state = 'HALF_OPEN';
        logger.infoObj({ service: this.name, state: 'HALF_OPEN' }, 'circuit breaker state transition');
        return true;
      }
      return false;
    }

    // HALF_OPEN: only the one in-flight probe is allowed
    return false;
  }

  /** Call after a successful remote response. Transitions HALF_OPEN/OPEN → CLOSED. */
  recordSuccess(): void {
    this.window.push(true);
    if (this.window.length > this.windowSize) this.window.shift();

    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      this.halfOpenInFlight = false;
      this.openedAt = 0;
      logger.infoObj({ service: this.name, state: 'CLOSED' }, 'circuit breaker state transition');
    }
  }

  /** Call after a failed remote response (non-2xx or network error). */
  recordFailure(): void {
    this.window.push(false);
    if (this.window.length > this.windowSize) this.window.shift();
    this.halfOpenInFlight = false;

    const failures = this.window.filter(r => !r).length;

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.openedAt = this.now();
      logger.warnObj(
        { service: this.name, state: 'OPEN', prevState: 'HALF_OPEN', failures },
        'circuit breaker state transition',
      );
    } else if (this.state === 'CLOSED' && failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = this.now();
      logger.warnObj(
        { service: this.name, state: 'OPEN', prevState: 'CLOSED', failures, window: this.window.length },
        'circuit breaker state transition',
      );
    }
  }

  getState(): CircuitState { return this.state; }

  /** Exposed for diagnostics / health-check endpoints. */
  getStats(): { state: CircuitState; failures: number; windowSize: number; openedAt: number } {
    return {
      state: this.state,
      failures: this.window.filter(r => !r).length,
      windowSize: this.window.length,
      openedAt: this.openedAt,
    };
  }
}
