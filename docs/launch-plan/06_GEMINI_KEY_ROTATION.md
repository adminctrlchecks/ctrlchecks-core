# 06 — Gemini Key Rotation

---

## Current Gemini Integration Files

| File | Role |
|---|---|
| `worker/src/services/ai/gemini-orchestrator.ts` | Central singleton, imported by 42+ files |
| `worker/src/core/config.ts` line 42 | Reads `process.env.GEMINI_API_KEY` |
| `worker/src/services/ai/gemini-wallet-service.ts` | Token cost tracking |

**Current single-key configuration:**
```typescript
// worker/src/core/config.ts line 42
geminiApiKey: process.env.GEMINI_API_KEY,
```

`gemini-orchestrator.ts` uses this single key for all requests. No rotation, no fallback. If this key hits rate limits → all AI generation fails.

---

## Required New Env Format

```bash
# Backward compatible: if GEMINI_API_KEYS exists, use it
GEMINI_API_KEYS=key1,key2,key3

# Legacy: kept for backward compatibility (used if GEMINI_API_KEYS is not set)
GEMINI_API_KEY=key1

# Rotation behavior
GEMINI_KEY_COOLDOWN_SECONDS=60
GEMINI_MAX_RETRIES=2
```

---

## New File to Create

**`worker/src/services/ai/gemini-key-pool.ts`**

This file is currently **MISSING** from the codebase (confirmed by file scan).

```typescript
/**
 * Gemini API Key Pool
 * Round-robin selection with cooldown on rate-limit errors.
 */

export interface KeyPoolEntry {
  index: number;           // 0-based, for logging only (NEVER log the key itself)
  coolingUntil: number;    // epoch ms — key is unavailable until this time
  failureCount: number;    // cumulative auth failures
  requestCount: number;    // total requests (for metrics)
  rateLimitCount: number;  // total rate-limit hits
}

export class GeminiKeyPool {
  private keys: string[];
  private entries: KeyPoolEntry[];
  private cursor: number = 0;
  private cooldownMs: number;

  constructor(keys: string[], cooldownSeconds: number = 60) {
    if (!keys || keys.length === 0) throw new Error('At least one Gemini API key is required');
    this.keys = keys;
    this.cooldownMs = cooldownSeconds * 1000;
    this.entries = keys.map((_, i) => ({
      index: i,
      coolingUntil: 0,
      failureCount: 0,
      requestCount: 0,
      rateLimitCount: 0,
    }));
  }

  /** Get the next available key. Returns null if all are cooling. */
  getKey(): { key: string; index: number } | null {
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.cursor + i) % this.keys.length;
      const entry = this.entries[idx];
      if (entry.coolingUntil <= now && entry.failureCount < 5) {
        this.cursor = (idx + 1) % this.keys.length;
        entry.requestCount++;
        return { key: this.keys[idx], index: idx };
      }
    }
    return null; // All keys unavailable
  }

  /** Call when a request receives a rate-limit error */
  markRateLimited(index: number): void {
    const entry = this.entries[index];
    entry.rateLimitCount++;
    entry.coolingUntil = Date.now() + this.cooldownMs;
    console.warn(`[GeminiKeyPool] Key[${index}] rate-limited. Cooling for ${this.cooldownMs / 1000}s`);
  }

  /** Call when a request receives an auth error */
  markAuthFailed(index: number): void {
    this.entries[index].failureCount++;
    console.error(`[GeminiKeyPool] Key[${index}] auth failed (failureCount: ${this.entries[index].failureCount})`);
  }

  /** Mark key as healthy after a successful request */
  markSuccess(index: number): void {
    // Reset cooldown on next success after cooling period
    // (coolingUntil is time-based, not reset on success — just let it expire)
  }

  /** Safe metrics — never includes key values */
  getMetrics() {
    return this.entries.map(e => ({
      index: e.index,
      requestCount: e.requestCount,
      rateLimitCount: e.rateLimitCount,
      failureCount: e.failureCount,
      isCooling: e.coolingUntil > Date.now(),
      coolingRemainingMs: Math.max(0, e.coolingUntil - Date.now()),
    }));
  }
}

/** Singleton pool — initialized once from env vars */
let _pool: GeminiKeyPool | null = null;

export function getGeminiKeyPool(): GeminiKeyPool {
  if (!_pool) {
    const keysEnv = process.env.GEMINI_API_KEYS;
    const singleKey = process.env.GEMINI_API_KEY;
    const keys = keysEnv
      ? keysEnv.split(',').map(k => k.trim()).filter(Boolean)
      : singleKey ? [singleKey] : [];
    
    if (keys.length === 0) throw new Error('No Gemini API keys configured');
    
    const cooldown = parseInt(process.env.GEMINI_KEY_COOLDOWN_SECONDS || '60', 10);
    _pool = new GeminiKeyPool(keys, cooldown);
    console.log(`[GeminiKeyPool] Initialized with ${keys.length} key(s)`);
  }
  return _pool;
}
```

---

## Integration with gemini-orchestrator.ts

`gemini-orchestrator.ts` must import and use the pool. Since it has 42+ dependents, changes must be backward compatible.

**Minimal change to `gemini-orchestrator.ts`:**

```typescript
// Add near top of class, after existing apiKey setup
import { getGeminiKeyPool } from './gemini-key-pool';

// In the method that makes Gemini requests:
private async callGeminiWithRetry(prompt: string, options: any): Promise<any> {
  const pool = getGeminiKeyPool();
  const maxRetries = parseInt(process.env.GEMINI_MAX_RETRIES || '2', 10);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const keyEntry = pool.getKey();
    if (!keyEntry) throw new Error('All Gemini API keys are rate-limited or failed');
    
    try {
      const result = await this.callGemini(prompt, { ...options, apiKey: keyEntry.key });
      pool.markSuccess(keyEntry.index);
      return result;
    } catch (error: any) {
      if (error.status === 429 || error.code === 'RESOURCE_EXHAUSTED') {
        pool.markRateLimited(keyEntry.index);
        if (attempt < maxRetries) continue; // try next key
        throw new Error('All Gemini keys rate-limited');
      }
      if (error.status === 401 || error.status === 403) {
        pool.markAuthFailed(keyEntry.index);
        throw error; // Auth errors are not retryable
      }
      throw error; // Other errors (invalid prompt, etc.) not retried
    }
  }
}
```

---

## Error Classification

| Error | Action |
|---|---|
| HTTP 429 / RESOURCE_EXHAUSTED | Mark key cooling → retry with next key |
| HTTP 401 / 403 | Mark key auth-failed → do not retry with same key |
| HTTP 400 / invalid input | Do not retry (user error, not key error) |
| Network timeout | Retry with same key (up to maxRetries) |
| All keys exhausted | Throw `GeminiAllKeysUnavailableError` |

---

## Observability

Log ONLY safe data:
```typescript
// SAFE — index only, not key value
console.warn(`[GeminiKeyPool] Key[${index}] rate-limited`);

// NEVER DO THIS:
console.log(`[Gemini] Using key: ${apiKey}`); // ← FORBIDDEN
```

Expose metrics via health endpoint:
```typescript
app.get('/api/health/gemini', (req, res) => {
  const pool = getGeminiKeyPool();
  res.json({ keys: pool.getMetrics() });
  // Returns: [{ index: 0, requestCount: 42, rateLimitCount: 1, isCooling: false }]
  // Never returns the actual key values
});
```

---

## Backend Files to Modify

| File | Change |
|---|---|
| `worker/src/core/config.ts` | Add `GEMINI_API_KEYS` parsing alongside `GEMINI_API_KEY` |
| `worker/src/services/ai/gemini-orchestrator.ts` | Use key pool in request method; maintain backward compatibility |

---

## Backend Files to Create

| File | Purpose |
|---|---|
| `worker/src/services/ai/gemini-key-pool.ts` | Key pool class + singleton factory (DOES NOT EXIST yet) |

---

## Tests to Add

File: `worker/src/services/ai/__tests__/gemini-key-pool.test.ts`

```
✓ Uses single GEMINI_API_KEY when GEMINI_API_KEYS not set
✓ Uses multiple keys when GEMINI_API_KEYS=key1,key2,key3
✓ Round-robins across keys on sequential requests
✓ Marks key[1] cooling after rate-limit error; next request uses key[2]
✓ Key[1] becomes available again after cooldown period
✓ Does not retry on HTTP 400 (invalid input)
✓ Does not log actual key values — getMetrics() returns only index
✓ Throws clear error when all keys are cooling
✓ Handles GEMINI_MAX_RETRIES=0 (no retries, throw immediately)
✓ Backward compatible: existing code calling with single key still works
```
