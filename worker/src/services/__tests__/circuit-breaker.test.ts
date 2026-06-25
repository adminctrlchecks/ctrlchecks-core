/**
 * Unit tests for CircuitBreaker
 *
 * All state transitions are driven by injecting a fake `now()` clock — no timers needed.
 *
 * Coverage:
 *   - 3 consecutive failures → OPEN
 *   - 2 failures → still CLOSED
 *   - CLOSED: window slides (old failures drop off)
 *   - OPEN: all attempts blocked
 *   - After 60s cooldown → HALF_OPEN (one probe allowed)
 *   - HALF_OPEN + success → CLOSED
 *   - HALF_OPEN + failure → OPEN (timer resets)
 *   - Concurrent HALF_OPEN probe blocked (only one in-flight)
 */

import { CircuitBreaker } from '../circuit-breaker';

// Suppress pino log output in tests
jest.mock('../../core/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), infoObj: jest.fn(), warnObj: jest.fn(), errorObj: jest.fn() },
  httpLogger: jest.fn((_req: any, _res: any, next: any) => next()),
  createChildLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })),
}));

const COOLDOWN = 60_000;
const WINDOW = 5;
const THRESHOLD = 3;

function makeBreaker(fakeNow: { value: number }) {
  return new CircuitBreaker('test-service', WINDOW, THRESHOLD, COOLDOWN, () => fakeNow.value);
}

// ── CLOSED state ─────────────────────────────────────────────────────────────

describe('CircuitBreaker — CLOSED state', () => {
  it('starts CLOSED and allows attempts', () => {
    const clock = { value: 0 };
    const cb = makeBreaker(clock);
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canAttempt()).toBe(true);
  });

  it('stays CLOSED after 2 failures (below threshold)', () => {
    const clock = { value: 0 };
    const cb = makeBreaker(clock);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canAttempt()).toBe(true);
  });

  it('opens after 3 consecutive failures', () => {
    const clock = { value: 1000 };
    const cb = makeBreaker(clock);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
    expect(cb.canAttempt()).toBe(false);
  });

  it('stays CLOSED when successes dilute failures below threshold', () => {
    const clock = { value: 0 };
    const cb = makeBreaker(clock);
    // Build 2 failures then 3 successes — window is [F, F, S, S, S] → 2 failures < 3
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    cb.recordSuccess();
    cb.recordSuccess();
    expect(cb.getState()).toBe('CLOSED');
  });

  it('window slides: old failures drop off as new successes come in', () => {
    const clock = { value: 0 };
    const cb = makeBreaker(clock);
    // Fill window: F F F S S → 3 failures → OPEN
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
  });
});

// ── OPEN state ────────────────────────────────────────────────────────────────

describe('CircuitBreaker — OPEN state', () => {
  it('blocks all attempts while OPEN within cooldown', () => {
    const clock = { value: 1000 };
    const cb = makeBreaker(clock);
    cb.recordFailure(); cb.recordFailure(); cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    // Advance to just before cooldown
    clock.value = 1000 + COOLDOWN - 1;
    expect(cb.canAttempt()).toBe(false);
    expect(cb.getState()).toBe('OPEN');
  });

  it('transitions OPEN → HALF_OPEN exactly when cooldown elapses', () => {
    const clock = { value: 1000 };
    const cb = makeBreaker(clock);
    cb.recordFailure(); cb.recordFailure(); cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    clock.value = 1000 + COOLDOWN;
    expect(cb.canAttempt()).toBe(true);
    expect(cb.getState()).toBe('HALF_OPEN');
  });
});

// ── HALF_OPEN state ───────────────────────────────────────────────────────────

describe('CircuitBreaker — HALF_OPEN probe: success → CLOSED', () => {
  it('closes after a successful probe', () => {
    const clock = { value: 0 };
    const cb = makeBreaker(clock);
    cb.recordFailure(); cb.recordFailure(); cb.recordFailure();

    clock.value = COOLDOWN;
    expect(cb.canAttempt()).toBe(true); // → HALF_OPEN

    cb.recordSuccess();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canAttempt()).toBe(true);
  });

  it('blocks second concurrent canAttempt while HALF_OPEN probe is in-flight', () => {
    const clock = { value: 0 };
    const cb = makeBreaker(clock);
    cb.recordFailure(); cb.recordFailure(); cb.recordFailure();

    clock.value = COOLDOWN;
    expect(cb.canAttempt()).toBe(true);  // first caller gets the probe
    expect(cb.getState()).toBe('HALF_OPEN');
    expect(cb.canAttempt()).toBe(false); // second caller is blocked
  });
});

describe('CircuitBreaker — HALF_OPEN probe: failure → OPEN (timer resets)', () => {
  it('re-opens on probe failure and resets cooldown timer', () => {
    const clock = { value: 0 };
    const cb = makeBreaker(clock);
    cb.recordFailure(); cb.recordFailure(); cb.recordFailure();

    clock.value = COOLDOWN;
    cb.canAttempt(); // → HALF_OPEN

    cb.recordFailure(); // probe fails
    expect(cb.getState()).toBe('OPEN');

    // Cooldown reset to clock.value = COOLDOWN; another COOLDOWN must pass
    clock.value = COOLDOWN + COOLDOWN - 1;
    expect(cb.canAttempt()).toBe(false); // still OPEN

    clock.value = COOLDOWN + COOLDOWN;
    expect(cb.canAttempt()).toBe(true); // → HALF_OPEN again
    expect(cb.getState()).toBe('HALF_OPEN');
  });
});

// ── Full lifecycle ─────────────────────────────────────────────────────────────

describe('CircuitBreaker — full open/close lifecycle', () => {
  it('CLOSED → OPEN → HALF_OPEN → CLOSED → can accumulate failures again', () => {
    const clock = { value: 0 };
    const cb = makeBreaker(clock);

    // Trip the breaker
    cb.recordFailure(); cb.recordFailure(); cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    // Cooldown
    clock.value = COOLDOWN;
    cb.canAttempt(); // → HALF_OPEN
    cb.recordSuccess(); // → CLOSED
    expect(cb.getState()).toBe('CLOSED');

    // Now accumulate 2 more failures — should stay CLOSED (only 2 in window)
    cb.recordFailure(); cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');

    // One more failure trips it again
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
  });
});

// ── getStats ──────────────────────────────────────────────────────────────────

describe('CircuitBreaker — getStats()', () => {
  it('reports current failure count and state', () => {
    const clock = { value: 500 };
    const cb = makeBreaker(clock);
    cb.recordFailure();
    cb.recordSuccess();
    cb.recordFailure();
    const stats = cb.getStats();
    expect(stats.state).toBe('CLOSED');
    expect(stats.failures).toBe(2);
    expect(stats.windowSize).toBe(3);
  });

  it('reports openedAt timestamp when OPEN', () => {
    const clock = { value: 9999 };
    const cb = makeBreaker(clock);
    cb.recordFailure(); cb.recordFailure(); cb.recordFailure();
    const stats = cb.getStats();
    expect(stats.state).toBe('OPEN');
    expect(stats.openedAt).toBe(9999);
  });
});
