# Implementation Plan

- [x] 1. Write bug condition exploration tests (BEFORE implementing any fix)
  - **Property 1: Bug Condition** - Stale Cache After Execution Completion + Concurrent Pipeline Duplication
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms both bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist

  **Bug 1 — Stale Cache exploration:**
  - Seed Redis with a `status: 'running'` execution-status response for execution `abc-123` using `buildCacheKey`-equivalent key pattern `/api/execution-status/abc-123:<hash>`
  - Call `persistentLayer.updateExecutionStatus('abc-123', 'success')` (no cache invalidation in unfixed code)
  - Simulate a GET to `/api/execution-status/abc-123?lite=1` via the `redisGetCache` middleware
  - Assert the response still shows `status: 'running'` (stale) — **EXPECTED FAILURE on unfixed code**
  - Document counterexample: `getExecutionStatus('abc-123')` returns `status='running'` after DB shows `status='success'`
  - Also verify key-variant coverage: seed `?lite=1` key, assert `?lite=true` variant also returns stale data

  **Bug 2 — Concurrent pipeline duplication exploration:**
  - Mock `fingerprintWorkflowTopology` (or a sentinel function inside the pipeline) with a call counter
  - Fire 4 concurrent `POST /attach-inputs` requests for the same `workflowId` against the unfixed handler
  - Assert counter > 1 (pipeline ran multiple times) — **EXPECTED FAILURE on unfixed code**
  - Spy on `console.warn`; assert `Post-freeze fingerprint mismatch` warning appears
  - Document counterexample: pipeline invocation count equals N for N concurrent requests

  - Run both tests on UNFIXED code
  - **EXPECTED OUTCOME**: Both tests FAIL (this is correct — it proves both bugs exist)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Non-Terminal Cache Behavior + Single attach-inputs Request Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs first, observe outputs, then encode as properties
  - **GOAL**: Capture baseline behavior that must survive the fix

  **Preservation for Bug 1 — Active execution cache must be preserved:**
  - Observe: seed Redis with `status: 'running'` for an in-progress execution; call `getExecutionStatus` → returns cached `running` response (cache HIT)
  - Write property-based test: for all execution status requests where `isBugCondition_StaleCache` returns false (execution NOT completed in DB), the response is identical between original and fixed handler
  - Specifically: active (non-terminal) executions still return cache HITs after the fix
  - Verify test PASSES on UNFIXED code

  **Preservation for Bug 1 — Redis-unavailable fallback:**
  - Observe: disable Redis (return `null` from `getCacheRedisClient`); call `getExecutionStatus` → falls back to DB, no crash
  - Write property-based test: for all requests where Redis is unavailable, `getExecutionStatus` returns correct DB data without throwing
  - Verify test PASSES on UNFIXED code

  **Preservation for Bug 1 — Non-existent execution ID:**
  - Observe: request status for unknown execution ID → 404 response
  - Write property-based test: for random unknown execution IDs, response is 404 unchanged
  - Verify test PASSES on UNFIXED code

  **Preservation for Bug 2 — Single non-concurrent attach-inputs:**
  - Observe: fire 1 `POST /attach-inputs` request with no concurrent duplicates → pipeline runs once, correct response returned
  - Write property-based test: for all `attach-inputs` requests where `isBugCondition_ConcurrentAttachInputs` returns false (no concurrent duplicate), the response payload shape and phase transition are identical between original and fixed handler
  - Verify test PASSES on UNFIXED code

  **Preservation for Bug 2 — Sequential (non-concurrent) second request:**
  - Observe: fire a second request 20 s after the first completes → pipeline runs normally (no stuck in-flight map entry)
  - Write property-based test: after a completed pipeline, a subsequent non-concurrent request runs the full pipeline fresh
  - Verify test PASSES on UNFIXED code

  - Run all preservation tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix Bug 1 — Stale Redis cache on execution completion

  - [x] 3.1 Add `invalidateExecutionStatusCache` to `worker/src/middleware/redisGetCache.ts`
    - Add a new exported async function `invalidateExecutionStatusCache(executionId: string, client: RedisClientType): Promise<void>`
    - Build the SCAN pattern: `pattern = "/api/execution-status/" + executionId + ":*"`
    - Use Redis `SCAN` with `MATCH pattern` to iterate all matching keys (handles `?lite=1`, `?lite=true`, no-query, and different auth-hash variants without needing to reconstruct the exact `buildCacheKey` hash)
    - For each key found, call `client.del(key)`
    - Log deleted key count at debug level: `[RedisGetCache] invalidated N key(s) for execution ${executionId}`
    - Export the function so `PersistentLayer` can import it
    - _Bug_Condition: isBugCondition_StaleCache(X) where X.executionCompletedInDB=true AND X.redisCacheKeyExists=true AND X.redisCacheReflectsCompletion=false_
    - _Expected_Behavior: After invalidation, next GET /api/execution-status/:executionId returns DB-fresh data (status='success'|'failed'), not a stale cache HIT_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Call `invalidateExecutionStatusCache` fire-and-forget from `PersistentLayer.updateExecutionStatus` in `worker/src/services/workflow-executor/persistent-layer.ts`
    - Import `getCacheRedisClient` and `invalidateExecutionStatusCache` from `../../middleware/redisGetCache`
    - In `updateExecutionStatus`, after the Supabase `.update()` succeeds, add a conditional fire-and-forget block:
      ```typescript
      if (status === 'success' || status === 'failed') {
        getCacheRedisClient(process.env.REDIS_URL || 'redis://redis:6379')
          .then(client => client ? invalidateExecutionStatusCache(executionId, client) : null)
          .catch(err => console.warn('[PersistentLayer] Cache invalidation failed (non-fatal):', err));
      }
      ```
    - Do NOT `await` the invalidation — cache invalidation must not block or throw on the execution completion path
    - Wrap in `.catch()` that logs but swallows errors to satisfy Preservation Requirement 3.5 (Redis unavailable must not crash the worker)
    - Only trigger for terminal statuses (`'success'` | `'failed'`); do NOT call for `'running'` or `'waiting'` (Preservation Requirement 3.1)
    - _Bug_Condition: isBugCondition_StaleCache — triggered only when status IN ['success', 'failed']_
    - _Expected_Behavior: Redis keys matching /api/execution-status/{executionId}:* are deleted; next poll fetches fresh DB data_
    - _Preservation: status='running'|'waiting' writes do NOT trigger invalidation; Redis unavailable does NOT throw_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.5_

  - [x] 3.3 Verify Bug 1 exploration test now passes
    - **Property 1: Expected Behavior** - Cache Invalidation on Execution Completion
    - **IMPORTANT**: Re-run the SAME test from task 1 (Bug 1 portion) — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `getExecutionStatus` returns `status='success'` after `updateExecutionStatus('abc-123', 'success')` is called
    - Run bug condition exploration test from step 1 (Bug 1)
    - **EXPECTED OUTCOME**: Test PASSES (confirms stale cache bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Verify Bug 1 preservation tests still pass
    - **Property 2: Preservation** - Non-Terminal Cache Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 (Bug 1 portion) — do NOT write new tests
    - Run: active execution cache HIT preserved, Redis-unavailable fallback, non-existent execution 404
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions in cache behavior)
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [-] 4. Fix Bug 2 — Concurrent attach-inputs race condition

  - [x] 4.1 Add module-level in-flight deduplication map to `worker/src/api/attach-inputs.ts`
    - Add a module-level constant before `attachInputsHandler`:
      ```typescript
      const attachInputsInFlight = new Map<string, Promise<unknown>>();
      ```
    - Keyed by `workflowId`; holds the `Promise` of the running pipeline result for that workflow
    - This map is process-scoped (module singleton), which is the correct scope for a single worker process
    - _Bug_Condition: isBugCondition_ConcurrentAttachInputs(X) where X.concurrentRequestCount > 1 AND X.workflowId = X.otherInFlightRequest.workflowId_
    - _Requirements: 2.4, 2.5_

  - [x] 4.2 Extract the handler body into a private `runAttachInputsPipeline(req, res)` function and wrap with deduplication logic
    - Refactor the existing `attachInputsHandler` body (everything inside `runWithBuildUsageTracking`) into a private async function `runAttachInputsPipeline(req: Request, res: Response): Promise<unknown>` that returns the response payload (not the `res` object)
    - In `attachInputsHandler`, before any DB reads or pipeline work, add deduplication logic:
      ```typescript
      const workflowId = req.params.workflowId || req.body.workflowId;
      if (attachInputsInFlight.has(workflowId)) {
        const result = await attachInputsInFlight.get(workflowId)!;
        return res.json(result);
      }
      const pipelinePromise = runAttachInputsPipeline(req, res);
      attachInputsInFlight.set(workflowId, pipelinePromise);
      try {
        const result = await pipelinePromise;
        return res.json(result);
      } finally {
        attachInputsInFlight.delete(workflowId);
      }
      ```
    - The `finally` block MUST delete the map entry so a stuck entry never blocks future requests for that workflow (covers both success and error paths)
    - Deduplication key is `workflowId` only (not payload hash) — intentional: if two requests arrive with different inputs for the same workflow, the second awaits the first; first request's inputs win, eliminating the fingerprint conflict
    - _Bug_Condition: isBugCondition_ConcurrentAttachInputs — concurrent requests for same workflowId_
    - _Expected_Behavior: pipelineInvocationCount(workflowId) = 1 for any number of concurrent requests; fingerprintMismatchWarningCount = 0_
    - _Preservation: Single non-concurrent requests run the full pipeline unchanged; map entry is cleaned up after completion so sequential requests are unaffected_
    - _Requirements: 2.4, 2.5, 3.3_

  - [ ] 4.3 Verify Bug 2 exploration test now passes
    - **Property 1: Expected Behavior** - Single Pipeline Execution Under Concurrency
    - **IMPORTANT**: Re-run the SAME test from task 1 (Bug 2 portion) — do NOT write a new test
    - The test from task 1 encodes the expected behavior: pipeline invocation count = 1 for 4 concurrent requests; no `Post-freeze fingerprint mismatch` warnings
    - Run bug condition exploration test from step 1 (Bug 2)
    - **EXPECTED OUTCOME**: Test PASSES (confirms concurrent race condition is fixed)
    - _Requirements: 2.4, 2.5_

  - [ ] 4.4 Verify Bug 2 preservation tests still pass
    - **Property 2: Preservation** - Single attach-inputs Request Unchanged
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 (Bug 2 portion) — do NOT write new tests
    - Run: single non-concurrent request runs full pipeline, sequential second request runs fresh pipeline
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions in attach-inputs behavior)
    - _Requirements: 3.3_

- [ ] 5. Checkpoint — Ensure all tests pass
  - Re-run the full test suite covering both bugs and all preservation cases
  - Confirm Property 1 (Bug Condition) tests pass for both Bug 1 and Bug 2
  - Confirm Property 2 (Preservation) tests pass for all five preservation requirements (3.1–3.5)
  - Confirm no new TypeScript diagnostics in `worker/src/middleware/redisGetCache.ts`, `worker/src/services/workflow-executor/persistent-layer.ts`, and `worker/src/api/attach-inputs.ts`
  - Ensure all tests pass; ask the user if questions arise
