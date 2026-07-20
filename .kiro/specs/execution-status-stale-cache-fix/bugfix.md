# Bugfix Requirements Document

## Introduction

Two related bugs cause the workflow execution UI to display stale node statuses after execution completes, and introduce race conditions during workflow initialization.

**Bug 1 — Stale Redis cache on execution completion**: The `/api/execution-status/{id}?lite=1` endpoint is cached in Redis. When the worker finishes execution and writes final node statuses to the database, it never invalidates or updates the corresponding Redis cache key. The frontend polls this endpoint and receives `304 Not Modified` responses with stale "running/pending" data until the TTL expires naturally. At that point, a cache miss triggers a fresh DB fetch and all node statuses flip to their final state simultaneously — a "batch flip" instead of real-time progressive updates.

**Bug 2 — Concurrent `attach-inputs` race condition**: The same workflow receives 3–4 simultaneous `POST /attach-inputs` requests. Each request independently runs the full validation and credential discovery pipeline, causing repeated `Post-freeze fingerprint mismatch` warnings as concurrent requests overwrite each other's topology hashes. These requests take 12–15 seconds each and run in parallel, producing inconsistent state.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a workflow execution completes and the worker writes final node statuses to the database THEN the system does not invalidate the Redis cache for `/api/execution-status/{id}?lite=1`, causing the cached stale "pending/running" response to persist until the TTL expires naturally

1.2 WHEN the frontend polls `/api/execution-status/{id}?lite=1` while the Redis cache holds a stale completed-execution entry THEN the system returns `304 Not Modified` with outdated node statuses instead of the current database state

1.3 WHEN the Redis TTL finally expires after execution has already completed THEN the system fetches fresh data from the database and all node statuses update simultaneously in a single "batch flip", rather than reflecting real-time progressive updates during execution

1.4 WHEN a workflow receives multiple simultaneous `POST /attach-inputs` requests THEN the system runs the full validation and credential discovery pipeline independently for each concurrent request without any deduplication or locking mechanism

1.5 WHEN multiple concurrent `attach-inputs` requests complete their pipeline independently THEN the system produces repeated `Post-freeze fingerprint mismatch` warnings as each request overwrites the topology hash written by the others

### Expected Behavior (Correct)

2.1 WHEN a workflow execution completes and the worker writes final node statuses to the database THEN the system SHALL invalidate or update the Redis cache key for `/api/execution-status/{id}?lite=1` so that subsequent polls reflect the completed state immediately

2.2 WHEN the frontend polls `/api/execution-status/{id}?lite=1` after execution has completed THEN the system SHALL return the current node statuses from the database (or a freshly updated cache), not a stale cached response

2.3 WHEN node statuses change during or after execution THEN the system SHALL reflect those changes to the frontend progressively as they occur, without requiring a TTL expiry to trigger a cache miss

2.4 WHEN a workflow receives multiple simultaneous `POST /attach-inputs` requests THEN the system SHALL deduplicate or serialize these requests so that only one instance of the full validation and credential discovery pipeline runs at a time for a given workflow

2.5 WHEN a concurrent `attach-inputs` request arrives while another is already in progress for the same workflow THEN the system SHALL either queue the duplicate request, return the result of the in-progress request, or reject it with an appropriate response — without running a second independent pipeline

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a workflow execution is still in progress THEN the system SHALL CONTINUE TO serve cached execution status responses to reduce database load during active polling

3.2 WHEN the frontend polls `/api/execution-status/{id}?lite=1` for a workflow that has never been executed THEN the system SHALL CONTINUE TO return the correct initial state without errors

3.3 WHEN a single `POST /attach-inputs` request is made for a workflow with no concurrent duplicates THEN the system SHALL CONTINUE TO run the full validation and credential discovery pipeline and return the correct response

3.4 WHEN a workflow execution status is requested for a workflow ID that does not exist THEN the system SHALL CONTINUE TO return the appropriate not-found response

3.5 WHEN the Redis cache is unavailable THEN the system SHALL CONTINUE TO fall back to fetching execution status directly from the database without errors

---

## Bug Condition Derivation

### Bug 1 — Stale Cache

```pascal
FUNCTION isBugCondition_StaleCache(X)
  INPUT: X of type ExecutionStatusRequest
  OUTPUT: boolean

  // Bug triggers when: execution is complete in DB but Redis cache still holds stale data
  RETURN X.executionCompletedInDB = true
     AND X.redisCacheKeyExists = true
     AND X.redisCacheReflectsCompletion = false
END FUNCTION

// Property: Fix Checking — Cache Invalidation on Completion
FOR ALL X WHERE isBugCondition_StaleCache(X) DO
  response ← getExecutionStatus'(X)
  ASSERT response.nodeStatuses = DB.getNodeStatuses(X.executionId)
  ASSERT response.httpStatus ≠ 304
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_StaleCache(X) DO
  ASSERT getExecutionStatus(X) = getExecutionStatus'(X)
END FOR
```

### Bug 2 — Concurrent attach-inputs

```pascal
FUNCTION isBugCondition_ConcurrentAttachInputs(X)
  INPUT: X of type AttachInputsRequest
  OUTPUT: boolean

  // Bug triggers when: same workflowId receives multiple simultaneous requests
  RETURN X.concurrentRequestCount > 1
     AND X.workflowId = X.otherInFlightRequest.workflowId
END FUNCTION

// Property: Fix Checking — No Duplicate Pipeline Execution
FOR ALL X WHERE isBugCondition_ConcurrentAttachInputs(X) DO
  results ← attachInputs'(X.concurrentRequests)
  ASSERT pipelineExecutionCount(X.workflowId) = 1
  ASSERT fingerprintMismatchWarnings(X.workflowId) = 0
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_ConcurrentAttachInputs(X) DO
  ASSERT attachInputs(X) = attachInputs'(X)
END FOR
```
