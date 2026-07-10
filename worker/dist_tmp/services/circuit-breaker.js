"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const logger_1 = require("../core/logger");
class CircuitBreaker {
    constructor(name, windowSize = 5, failureThreshold = 3, cooldownMs = 60000, now = Date.now) {
        this.name = name;
        this.windowSize = windowSize;
        this.failureThreshold = failureThreshold;
        this.cooldownMs = cooldownMs;
        this.now = now;
        this.state = 'CLOSED';
        this.window = []; // true = success, false = failure
        this.openedAt = 0;
        this.halfOpenInFlight = false;
    }
    /**
     * Returns true if the caller should attempt the remote call.
     * Returns false when the circuit is OPEN (still cooling down).
     *
     * Side effect: transitions OPEN → HALF_OPEN when cooldown expires.
     */
    canAttempt() {
        if (this.state === 'CLOSED')
            return true;
        if (this.state === 'OPEN') {
            if (this.now() - this.openedAt >= this.cooldownMs && !this.halfOpenInFlight) {
                this.halfOpenInFlight = true;
                this.state = 'HALF_OPEN';
                logger_1.logger.infoObj({ service: this.name, state: 'HALF_OPEN' }, 'circuit breaker state transition');
                return true;
            }
            return false;
        }
        // HALF_OPEN: only the one in-flight probe is allowed
        return false;
    }
    /** Call after a successful remote response. Transitions HALF_OPEN/OPEN → CLOSED. */
    recordSuccess() {
        this.window.push(true);
        if (this.window.length > this.windowSize)
            this.window.shift();
        if (this.state !== 'CLOSED') {
            this.state = 'CLOSED';
            this.halfOpenInFlight = false;
            this.openedAt = 0;
            logger_1.logger.infoObj({ service: this.name, state: 'CLOSED' }, 'circuit breaker state transition');
        }
    }
    /** Call after a failed remote response (non-2xx or network error). */
    recordFailure() {
        this.window.push(false);
        if (this.window.length > this.windowSize)
            this.window.shift();
        this.halfOpenInFlight = false;
        const failures = this.window.filter(r => !r).length;
        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.openedAt = this.now();
            logger_1.logger.warnObj({ service: this.name, state: 'OPEN', prevState: 'HALF_OPEN', failures }, 'circuit breaker state transition');
        }
        else if (this.state === 'CLOSED' && failures >= this.failureThreshold) {
            this.state = 'OPEN';
            this.openedAt = this.now();
            logger_1.logger.warnObj({ service: this.name, state: 'OPEN', prevState: 'CLOSED', failures, window: this.window.length }, 'circuit breaker state transition');
        }
    }
    getState() { return this.state; }
    /** Exposed for diagnostics / health-check endpoints. */
    getStats() {
        return {
            state: this.state,
            failures: this.window.filter(r => !r).length,
            windowSize: this.window.length,
            openedAt: this.openedAt,
        };
    }
}
exports.CircuitBreaker = CircuitBreaker;
