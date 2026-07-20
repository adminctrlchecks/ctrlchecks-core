# Execution Status Stale Cache Fix — Bugfix Design

## Overview

Two independent bugs cause the workflow execution UI to display stale node statuses and introduce
race conditions during workflow initialization.

**Bug 1 — Stale Redis cache on execution completion**: The `redisGetCache` middleware
(`worker/src/middleware/redisGetCache.ts`) caches all successful GET responses, including
`/api/execution-status/:executionId?lite=1`. When the worker finishes execution and writes
`status: 'success' | 'failed'` plus `finished_at` to the `executions` table via
`PersistentLayer.updateExecutionStatus`, no code path invalidates the corresponding Redis key.
The frontend polls and receives `X-Cache: HIT` responses with stale `pending/running` data until
the TTL expires (default 60 s). At that point every polling client gets a cache miss simultaneously
and all node statuses flip at once — a "batch flip" instead of progressive updates.

**Bug 2 — Concurrent `attach-inputs` race condition**: The `attachInputsHandler` in
`worker/src/api/attach-inputs.ts` has no in-flight deduplication. When the same `workflowId`
receives 3–4 simultaneous `POST /attach-inputs` requests, each independently runs the full
validation + credential discovery + topology fingerprint pipeline. Because each request reads the
same DB row, computes a new topology hash, and writes it back, the last writer wins and earlier
writers log `Post-freeze fingerprint mismatch` warnings. The resulting state is inconsistent and
the 12–15 s pipeline runs redundantly N times.

The fix strategy for Bug 1 is targeted cache invalidation: after `PersistentLayer.updateExecutionStatus`
writes a terminal status (`success` or `failed`), delete the Redis key(s) for that execution ID so
the next poll fetches fresh data. For Bug 2 the fix is a process-level in-flight map: the first
request for a given `workflowId` runs the pipeline and stores a `Promise`; subsequent concurrent
requests await that same `Promise` and return its result without re-running the pipeline.

---

## Glossary

- **Bug_Condition_1 (C₁)**: An execution status request where the execution is complete in the DB
  but the Redis cache still holds a stale non-terminal response for that execution ID.
- **Bug_Condition_2 (C₂)**: An `attach-inputs` request for a `workflowId` that already has an
  in-flight `attach-inputs` pipeline running for the same workflow.
- **Property (P)**: The desired correct behavior when the bug condition holds.
- **Preservation**: Existing behaviors that must remain unchanged after the fix.
- **`redisGetCache`**: Express middleware in `worker/src/middleware/redisGetCache.ts` that caches
  successful GET responses in Redis using a key derived from `req.path` + params/query/auth hash.
- **`buildCacheKey(req)`**: Function in `redisGetCache.ts` that produces the Redis key string for a
  given request. The fix must reproduce this key at invalidation time.
- **`PersistentLayer.updateExecutionStatus`**: Method in
  `worker/src/services/workflow-executor/persistent-layer.ts` that writes terminal status
  (`success` | `failed`) and `finished_at` to the `executions` table. This is the canonical
  completion write point for Bug 1 invalidation.
- **`attachInputsHandler`**: Default export of `worker/src/api/attach-inputs.ts`; the full
  validation + credential discovery + topology fingerprint pipeline for a workflow.
- **In-flight map**: A `Map<workflowId, Promise<Response>>` held in module scope inside
  `attach-inputs.ts` that deduplicates concurrent requests for the same workflow.
- **Topology fingerprint**: A deterministic hash of the workflow graph structure computed by
  `fingerprintWorkflowTopology` in `worker/src/core/utils/workflow-topology-fingerprint.ts`.
  Concurrent writes of different fingerprints cause the `Post-freeze fingerprint mismatch` warning.

---

## Bug Details

### Bug 1 — Stale Cache

The bug manifests when a workflow execution transitions to a terminal state (`success` or `failed`)
in the database but the Redis cache for `/api/execution-status/:executionId` still holds the
pre-completion response. The `redisGetCache` middleware writes the response body to Redis on every
successful GET and serves it on subsequent requests without re-querying the DB. The worker's
`PersistentLayer.updateExecutionStatus` has no awareness of the HTTP cache layer and performs no
invalidation.

**Formal Specification:**

```
FUNCTION isBugCondition_StaleCache(X)
  INPUT: X of type ExecutionStatusRequest
  OUTPUT: boolean

  RETURN X.executionCompletedInDB = true
     AND X.redisCacheKeyExists = true
     AND X.redisCacheReflectsCompletion = false
END FUNCTION
```

**Examples:**

- Execution `abc-123` finishes at T=0. Worker writes `status='success'`, `finished_at=T`. At T=5s
  the frontend polls `/api/execution-status/abc-123?lite=1`. Redis returns the T=-5s cached body
  with `status='running'`. Frontend shows nodes still running. **Expected**: `status='success'`.
- At T=60s the Redis TTL expires. All polling clients simultaneously get a cache miss, fetch from
  DB, and receive `status='success'`. All node indicators flip at once. **Expected**: progressive
  updates during execution, immediate flip on completion.
- Execution `xyz-456` is still running. Frontend polls and gets a cached `status='running'`
  response. **Expected**: this is correct — caching during active execution is desired (see
  Preservation Requirement 3.1).

### Bug 2 — Concurrent attach-inputs

The bug manifests when the same `workflowId` receives multiple simultaneous `POST /attach-inputs`
requests. Each request independently reads the workflow from DB, runs the full pipeline, and writes
back a new topology fingerprint. Because there is no lock or deduplication, the last writer's
fingerprint overwrites earlier writers' fingerprints, causing mismatch warnings on the earlier
requests.

**Formal Specification:**

```
FUNCTION isBugCondition_ConcurrentAttachInputs(X)
  INPUT: X of type AttachInputsRequest
  OUTPUT: boolean

  RETURN X.concurrentRequestCount > 1
     AND X.workflowId = X.otherInFlightRequest.workflowId
     AND X.pipelineAlreadyRunning = true
END FUNCTION
```

**Examples:**

- Workflow `wf-789` receives 4 simultaneous `POST /attach-inputs` at T=0. All 4 read the same DB
  row, run the 12–15 s pipeline independently, and write back 4 topology hashes. Requests 1–3 log
  `Post-freeze fingerprint mismatch`. **Expected**: only 1 pipeline runs; requests 2–4 await and
  return the same result.
- Workflow `wf-789` receives a single `POST /attach-inputs`. No concurrent request exists.
  **Expected**: pipeline runs normally, no change in behavior (Preservation Requirement 3.3).
- Workflow `wf-789` receives a second request 20 s after the first completes. No in-flight request
  exists. **Expected**: second request runs the pipeline normally.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- 3.1 — While a workflow execution is still in progress, the system SHALL continue to serve cached
  execution status responses to reduce database load during active polling.
- 3.2 — When the frontend polls for a workflow that has never been executed, the system SHALL
  continue to return the correct initial state without errors.
- 3.3 — When a single `POST /attach-inputs` request is made with no concurrent duplicates, the
  system SHALL continue to run the full validation and credential discovery pipeline and return the
  correct response unchanged.
- 3.4 — When an execution status is requested for a non-existent execution ID, the system SHALL
  continue to return the appropriate 404 response.
- 3.5 — When Redis is unavailable, the system SHALL continue to fall back to fetching execution
  status directly from the database without errors.

**Scope:**

All requests that do NOT satisfy `isBugCondition_StaleCache` or `isBugCondition_ConcurrentAttachInputs`
must be completely unaffected by this fix. This includes:

- Active (non-terminal) execution status polls — cache HIT behavior must be preserved.
- Single (non-concurrent) `attach-inputs` requests — full pipeline must run as before.
- All other API routes — the `redisGetCache` middleware change must be scoped to execution status
  invalidation only.

---

## Hypothesized Root Cause

### Bug 1 — Stale Cache

1. **No invalidation hook in `PersistentLayer`**: `updateExecutionStatus` writes to the DB but has
   no reference to the Redis cache client. The cache layer (`redisGetCache` middleware) and the
   persistence layer are completely decoupled — by design for separation of concerns, but without
   an invalidation contract.

2. **Cache key is request-scoped**: `buildCacheKey` hashes `req.params + req.query + req.body +
   auth`. The `?lite=1` query parameter produces a different key than `?lite=true` or no query.
   Any invalidation must cover all key variants for a given `executionId`, or use a pattern-based
   `DEL` / `SCAN` approach.

3. **`skipPaths` only skips `/api/execution-status` prefix, not per-ID paths**: The middleware
   config in `worker/src/index.ts` adds `/api/execution-status` to `skipPaths`, which means the
   base path is skipped but parameterized paths like `/api/execution-status/abc-123` are still
   cached (the `skipPaths` check uses `req.path` exact match, not prefix match).

   > **Note**: This means the cache IS active for `/api/execution-status/:executionId` — the
   > `skipPaths` entry only skips the exact string `/api/execution-status` with no trailing
   > segment. This confirms the bug is real.

4. **TTL is global**: The default 60 s TTL applies uniformly. There is no mechanism to shorten or
   zero the TTL for terminal executions.

### Bug 2 — Concurrent attach-inputs

1. **No in-flight deduplication in `attachInputsHandler`**: The handler is a stateless async
   function. Each HTTP request gets its own call stack with no shared state to detect concurrent
   calls for the same `workflowId`.

2. **DB read-modify-write without optimistic locking**: Each request reads the workflow row,
   modifies it in memory, and writes it back. There is no row-level lock or version check to
   prevent concurrent overwrites.

3. **Topology fingerprint is computed per-request**: `fingerprintWorkflowTopology` is called
   independently by each concurrent request on potentially diverging in-memory workflow objects,
   producing different hashes that then conflict on write.

4. **No idempotency key on the route**: Unlike the distributed execution engine (which uses
   `IdempotencyManager`), the `attach-inputs` route has no idempotency key header or deduplication
   layer.

---

## Correctness Properties

Property 1: Bug Condition 1 — Cache Invalidation on Execution Completion

_For any_ execution status request where the execution has completed in the database
(`isBugCondition_StaleCache` returns true), the fixed `getExecutionStatus` handler SHALL return
the current node statuses from the database (not a stale cached response), and the HTTP response
SHALL NOT carry a stale `X-Cache: HIT` for a terminal execution.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition 2 — Single Pipeline Execution Under Concurrency

_For any_ set of concurrent `attach-inputs` requests where `isBugCondition_ConcurrentAttachInputs`
returns true (same `workflowId`, multiple simultaneous requests), the fixed handler SHALL execute
the full validation and credential discovery pipeline exactly once, and all concurrent callers SHALL
receive a response derived from that single pipeline run, with zero `Post-freeze fingerprint
mismatch` warnings produced.

**Validates: Requirements 2.4, 2.5**

Property 3: Preservation — Non-Terminal Cache Behavior Unchanged

_For any_ execution status request where the execution is NOT in a terminal state
(`isBugCondition_StaleCache` returns false), the fixed system SHALL produce the same response as
the original system, preserving cache HIT behavior for active executions.

**Validates: Requirements 3.1, 3.2, 3.4, 3.5**

Property 4: Preservation — Single attach-inputs Request Unchanged

_For any_ `attach-inputs` request where `isBugCondition_ConcurrentAttachInputs` returns false
(no concurrent duplicate), the fixed handler SHALL produce exactly the same result as the original
handler, preserving the full pipeline behavior for non-concurrent requests.

**Validates: Requirements 3.3**

---

## Fix Implementation

### Bug 1 — Cache Invalidation

**File**: `worker/src/middleware/redisGetCache.ts`

**Changes Required**:

1. **Export `getCacheRedisClient` and `buildCacheKey`** (already exported) — no change needed.

2. **Add `invalidateExecutionStatusCache(executionId, client)` helper**: A new exported function
   that deletes all Redis keys matching the execution status path for a given `executionId`. Because
   `buildCacheKey` hashes `params + query + auth`, the exact key is not reproducible without the
   original request. Use Redis `SCAN` with a pattern match on the path prefix
   `"/api/execution-status/${executionId}:"` to find and delete all variants (`?lite=1`,
   `?lite=true`, no query, different auth tokens).

   ```
   FUNCTION invalidateExecutionStatusCache(executionId, redisClient)
     pattern ← "/api/execution-status/" + executionId + ":*"
     keys ← SCAN redisClient MATCH pattern
     FOR EACH key IN keys DO
       DEL redisClient key
     END FOR
   END FUNCTION
   ```

3. **Export `invalidateExecutionStatusCache`** so `PersistentLayer` can import and call it.

**File**: `worker/src/services/workflow-executor/persistent-layer.ts`

**Changes Required**:

4. **Import `getCacheRedisClient` and `invalidateExecutionStatusCache`** from
   `../../middleware/redisGetCache`.

5. **Call `invalidateExecutionStatusCache` after terminal DB write**: In
   `updateExecutionStatus`, after the Supabase `.update()` succeeds and `status` is `'success'`
   or `'failed'`, call `invalidateExecutionStatusCache(executionId, client)` in a
   fire-and-forget manner (do not `await` — cache invalidation must not block or throw on the
   execution completion path). Wrap in a `try/catch` that logs but swallows errors to satisfy
   Preservation Requirement 3.5.

   ```
   IF status IN ['success', 'failed'] THEN
     getCacheRedisClient(REDIS_URL)
       .then(client => client ? invalidateExecutionStatusCache(executionId, client) : null)
       .catch(err => console.warn('[PersistentLayer] Cache invalidation failed (non-fatal):', err))
   END IF
   ```

### Bug 2 — In-Flight Deduplication

**File**: `worker/src/api/attach-inputs.ts`

**Changes Required**:

1. **Add module-level in-flight map**:

   ```
   const attachInputsInFlight = new Map<string, Promise<AttachInputsResult>>()
   ```

   Keyed by `workflowId`. Holds the `Promise` of the running pipeline for that workflow.

2. **Wrap the handler body in deduplication logic**: At the top of `attachInputsHandler`, before
   any DB reads or pipeline work:

   ```
   FUNCTION attachInputsHandler(req, res)
     workflowId ← req.params.workflowId

     IF attachInputsInFlight.has(workflowId) THEN
       result ← AWAIT attachInputsInFlight.get(workflowId)
       RETURN res.json(result)
     END IF

     pipelinePromise ← runAttachInputsPipeline(req)
     attachInputsInFlight.set(workflowId, pipelinePromise)

     TRY
       result ← AWAIT pipelinePromise
       RETURN res.json(result)
     FINALLY
       attachInputsInFlight.delete(workflowId)
     END TRY
   END FUNCTION
   ```

3. **Extract pipeline into `runAttachInputsPipeline(req)`**: Refactor the existing handler body
   into a private async function that returns the response payload (not the `res` object). This
   enables the in-flight map to hold a `Promise<payload>` that concurrent callers can await.

4. **Scope deduplication to `workflowId` only**: The in-flight key is `workflowId` alone (not
   payload hash). This is intentional — if two requests arrive with different inputs for the same
   workflow, the second still awaits the first. The first request's inputs win. This matches the
   existing behavior where the last writer wins but eliminates the fingerprint conflict.

5. **Ensure `finally` cleanup**: The `attachInputsInFlight.delete(workflowId)` call must be in a
   `finally` block so the map entry is removed even if the pipeline throws, preventing a stuck
   entry that would block all future requests for that workflow.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
each bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate both bugs BEFORE implementing the fix. Confirm
or refute the root cause analysis.

**Bug 1 Test Plan**: Write a test that simulates the full cache lifecycle — populate the Redis
cache with a `running` execution status response, then update the DB to `success` without
invalidating the cache, then call `getExecutionStatus` and assert the response is stale. Run on
UNFIXED code to observe the stale response.

**Bug 1 Test Cases**:
1. **Stale cache after completion**: Seed Redis with `status='running'` for execution `abc-123`.
   Call `updateExecutionStatus('abc-123', 'success')`. Call `getExecutionStatus` with `?lite=1`.
   Assert response still shows `status='running'` (will fail on fixed code, pass on unfixed).
2. **Batch flip on TTL expiry**: Seed Redis with TTL=1s. Wait 2s. Call `getExecutionStatus`.
   Assert response now shows `status='success'` (demonstrates the batch flip timing).
3. **Cache key variant coverage**: Seed Redis for `?lite=1` variant. Assert `?lite=true` variant
   also returns stale data (demonstrates multiple key variants exist).

**Bug 2 Test Plan**: Write a test that fires 4 concurrent `POST /attach-inputs` requests for the
same `workflowId` and counts how many times the pipeline's credential discovery function is
invoked. Run on UNFIXED code to observe N invocations.

**Bug 2 Test Cases**:
1. **Concurrent pipeline count**: Mock `credentialDiscoveryPhase.discover` with a counter. Fire 4
   concurrent requests. Assert counter === 4 on unfixed code (will be 1 on fixed code).
2. **Fingerprint mismatch warning**: Spy on `console.warn`. Fire 3 concurrent requests. Assert
   `Post-freeze fingerprint mismatch` warning appears on unfixed code.
3. **Single request unchanged**: Fire 1 request. Assert pipeline runs once and returns correct
   response (must pass on both unfixed and fixed code — preservation check).

**Expected Counterexamples**:
- Bug 1: `getExecutionStatus` returns `status='running'` after DB shows `status='success'`.
- Bug 2: `credentialDiscoveryPhase.discover` is called N times for N concurrent requests.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the
expected behavior.

**Bug 1 Pseudocode:**

```
FOR ALL X WHERE isBugCondition_StaleCache(X) DO
  result ← getExecutionStatus_fixed(X)
  ASSERT result.status = DB.getStatus(X.executionId)
  ASSERT result.status IN ['success', 'failed']
  ASSERT result.httpHeader['X-Cache'] ≠ 'HIT'  // or key was deleted
END FOR
```

**Bug 2 Pseudocode:**

```
FOR ALL X WHERE isBugCondition_ConcurrentAttachInputs(X) DO
  results ← attachInputs_fixed(X.concurrentRequests)
  ASSERT pipelineInvocationCount(X.workflowId) = 1
  ASSERT fingerprintMismatchWarningCount(X.workflowId) = 0
  ASSERT ALL results are equivalent
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions
produce the same result as the original functions.

**Bug 1 Preservation Pseudocode:**

```
FOR ALL X WHERE NOT isBugCondition_StaleCache(X) DO
  ASSERT getExecutionStatus_original(X) = getExecutionStatus_fixed(X)
END FOR
```

**Bug 2 Preservation Pseudocode:**

```
FOR ALL X WHERE NOT isBugCondition_ConcurrentAttachInputs(X) DO
  ASSERT attachInputs_original(X) = attachInputs_fixed(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain.
- It catches edge cases that manual unit tests might miss (e.g., Redis unavailable, zero-node
  workflows, already-terminal executions polled again).
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Preservation Test Cases**:
1. **Active execution cache preserved**: Verify that a `running` execution still returns a cached
   response after the fix (cache HIT must be preserved for non-terminal executions).
2. **Redis-unavailable fallback preserved**: Disable Redis. Verify `getExecutionStatus` still
   returns correct data from DB (no crash, no change in behavior).
3. **Single attach-inputs response preserved**: Verify that a single non-concurrent
   `attach-inputs` request returns the same payload shape and phase transition as before the fix.
4. **Not-found execution preserved**: Verify that a 404 response for an unknown execution ID is
   unchanged.

### Unit Tests

- Test `invalidateExecutionStatusCache` deletes all key variants for a given `executionId`.
- Test `updateExecutionStatus` calls `invalidateExecutionStatusCache` when status is `'success'`
  or `'failed'`, and does NOT call it when status is `'running'` or `'waiting'`.
- Test `updateExecutionStatus` does not throw when Redis is unavailable (cache invalidation is
  fire-and-forget).
- Test `attachInputsHandler` in-flight map: second concurrent call awaits the first promise and
  does not invoke the pipeline a second time.
- Test `attachInputsHandler` in-flight map cleanup: map entry is deleted after pipeline completes
  (success or error), so a subsequent non-concurrent request runs the pipeline fresh.
- Test `attachInputsHandler` with a single request: pipeline runs exactly once, response is
  correct.

### Property-Based Tests

- Generate random `executionId` strings and verify that after `invalidateExecutionStatusCache`,
  no Redis keys matching the pattern remain.
- Generate random concurrent request counts (2–10) for the same `workflowId` and verify that
  `pipelineInvocationCount` is always exactly 1 after the fix.
- Generate random non-concurrent `attach-inputs` payloads and verify the response is identical
  between original and fixed handler (preservation property).
- Generate random execution states (`running`, `pending`, `waiting`) and verify that
  `updateExecutionStatus` does NOT call `invalidateExecutionStatusCache` for non-terminal states
  (preservation of cache-during-active-execution behavior).

### Integration Tests

- Full execution lifecycle: start a workflow, poll status during execution (verify cache HIT),
  complete execution, poll again (verify cache MISS and correct terminal status).
- Concurrent `attach-inputs` end-to-end: fire 4 simultaneous requests against a real (or
  in-memory) handler, verify DB is written exactly once and all 4 HTTP responses are equivalent.
- Redis unavailable during completion: simulate Redis connection failure at the moment
  `updateExecutionStatus` fires; verify execution completes successfully and the error is logged
  but not propagated.
