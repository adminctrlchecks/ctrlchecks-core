"use strict";
/**
 * Circuit Breaker
 *
 * Prevents cascading failures by opening circuit when provider fails repeatedly.
 * Features:
 * - Per-provider circuit breakers
 * - Configurable failure thresholds
 * - Automatic recovery
 * - Half-open state for testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreakerManager = exports.CircuitBreakerManager = exports.CircuitBreaker = exports.CircuitState = void 0;
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
/**
 * Circuit Breaker
 * Manages circuit state per provider
 */
class CircuitBreaker {
    constructor(provider, config) {
        this.provider = provider;
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.totalRequests = 0;
        this.totalFailures = 0;
        this.config = {
            failureThreshold: config?.failureThreshold || 5,
            successThreshold: config?.successThreshold || 2,
            timeout: config?.timeout || 60000, // 1 minute
            resetTimeout: config?.resetTimeout || 300000, // 5 minutes
        };
    }
    /**
     * Execute function with circuit breaker protection
     */
    async execute(fn) {
        this.totalRequests++;
        // Check circuit state
        if (this.state === CircuitState.OPEN) {
            const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
            if (timeSinceLastFailure >= this.config.timeout) {
                // Try half-open state
                this.state = CircuitState.HALF_OPEN;
                this.successes = 0;
                console.log(`[CircuitBreaker] ${this.provider}: Moving to HALF_OPEN state`);
            }
            else {
                // Circuit still open
                throw new Error(`Circuit breaker OPEN for provider ${this.provider}. Retry after ${Math.ceil((this.config.timeout - timeSinceLastFailure) / 1000)}s`);
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    /**
     * Handle successful execution
     */
    onSuccess() {
        this.lastSuccessTime = Date.now();
        if (this.state === CircuitState.HALF_OPEN) {
            this.successes++;
            if (this.successes >= this.config.successThreshold) {
                // Circuit recovered
                this.state = CircuitState.CLOSED;
                this.failures = 0;
                this.successes = 0;
                console.log(`[CircuitBreaker] ${this.provider}: Circuit CLOSED (recovered)`);
            }
        }
        else if (this.state === CircuitState.CLOSED) {
            // Reset failure count on success (if enough time passed)
            const timeSinceLastFailure = this.lastFailureTime
                ? Date.now() - this.lastFailureTime
                : Infinity;
            if (timeSinceLastFailure >= this.config.resetTimeout) {
                this.failures = 0;
            }
        }
    }
    /**
     * Handle failed execution
     */
    onFailure() {
        this.totalFailures++;
        this.lastFailureTime = Date.now();
        this.failures++;
        if (this.state === CircuitState.HALF_OPEN) {
            // Failed during half-open, open circuit again
            this.state = CircuitState.OPEN;
            this.successes = 0;
            console.log(`[CircuitBreaker] ${this.provider}: Circuit OPEN (failed in half-open)`);
        }
        else if (this.state === CircuitState.CLOSED) {
            if (this.failures >= this.config.failureThreshold) {
                // Open circuit
                this.state = CircuitState.OPEN;
                console.log(`[CircuitBreaker] ${this.provider}: Circuit OPEN (${this.failures} failures)`);
            }
        }
    }
    /**
     * Get circuit breaker stats
     */
    getStats() {
        return {
            provider: this.provider,
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            totalRequests: this.totalRequests,
            totalFailures: this.totalFailures,
        };
    }
    /**
     * Manually reset circuit breaker
     */
    reset() {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = undefined;
        this.lastSuccessTime = undefined;
        console.log(`[CircuitBreaker] ${this.provider}: Circuit manually reset`);
    }
    /**
     * Check if circuit is open
     */
    isOpen() {
        return this.state === CircuitState.OPEN;
    }
    /**
     * Check if circuit is closed
     */
    isClosed() {
        return this.state === CircuitState.CLOSED;
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Circuit Breaker Manager
 * Manages circuit breakers for all providers
 */
class CircuitBreakerManager {
    constructor() {
        this.breakers = new Map();
    }
    /**
     * Get or create circuit breaker for provider
     */
    getBreaker(provider, config) {
        if (!this.breakers.has(provider)) {
            this.breakers.set(provider, new CircuitBreaker(provider, config));
        }
        return this.breakers.get(provider);
    }
    /**
     * Execute with circuit breaker protection
     */
    async execute(provider, fn, config) {
        const breaker = this.getBreaker(provider, config);
        return breaker.execute(fn);
    }
    /**
     * Get all circuit breaker stats
     */
    getAllStats() {
        return Array.from(this.breakers.values()).map(b => b.getStats());
    }
    /**
     * Reset circuit breaker for provider
     */
    reset(provider) {
        const breaker = this.breakers.get(provider);
        if (breaker) {
            breaker.reset();
        }
    }
    /**
     * Reset all circuit breakers
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
}
exports.CircuitBreakerManager = CircuitBreakerManager;
// Export singleton instance
exports.circuitBreakerManager = new CircuitBreakerManager();
