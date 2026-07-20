# Execution Log Display Fix — Bugfix Design

## Overview

When a user triggers a distributed workflow execution, the frontend execution console remains
empty for the entire run. The backend completes successfully, but the frontend never receives
or displays any status or logs.

The root cause is a chain of four interconnected bugs that together break the data pipeline
from execution creation through status polling to frontend display:

1. **Missing `user_id`** — `DistributedOrchestrator.startExecution()` inserts the execution
   record without a `user_id`, making it invisible to every user-scoped query (db-proxy
   enforces `WHERE user_id = $1` on the `executions` table).
2. **Wrong column names** — `getExecutionStatus` selects `error_message` and `completed_at`,
   but `execute-workflow.ts` writes `error` and `finished_at`, so the status response always
   returns `null` for completion time and error details.
3. **Premature polling abort** — The frontend stops polling after only 3 consecutive 404
   responses, which is too aggressive given the ~100 ms window before the background
   `execute-workflow.ts` process starts and the execution record becomes queryable.
4. **Wrong `workflow_id` stored** — `DistributedOrchestrator` stores `workflowDef.id`
   (from `workflow_definitions`) instead of the caller-supplied `workflowId`, so the
   `execute-workflow.ts` resume path may fail to locate the execution record.

The fix is minimal and surgical: four targeted changes, one per bug, with no changes to
the db-proxy security layer or the non-distributed execution path.

---

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger each bug — missing `user_id`,
  wrong column names, premature 404 abort, or wrong `workflow_id`.
- **Property (P)**: The desired correct behavior for each bug condition — execution record
  is visible, status response is accurate, polling is tolerant, and `workflow_id` matches.
- **Preservation**: Existing behaviors that must remain unchanged — non-distributed execution
  path, db-proxy `user_id` filtering, terminal-status polling stop, and execution lock logic.
- **`startExecution(workflowId, inputData)`**: Method in
  `worker/src/services/workflow-executor/distributed/distributed-orchestrator.ts` that
  creates the execution record and queues the first node(s).
- **`getExecutionStatus(req, res)`**: Handler in
  `worker/src/api/distributed-execute-workflow.ts` that serves `GET /api/execution-status/:id`.
- **`handleExecutionStarted`**: Event handler in
  `ctrl_checks/src/components/workflow/ExecutionConsole.tsx` that starts the polling loop
  when a `workflow-execution-started` event fires.
- **`distributedExecuteWorkflow`**: The caller of `startExecution` in
  `worker/src/api/distributed-execute-workflow.ts`; it already has `currentUserId` extracted
  from the auth header.
- **`workflowDef.id`**: The UUID from the `workflow_definitions` table — may differ from the
  `workflowId` passed into the distributed endpoint.
- **`notFoundCount`**: Counter in the polling loop that tracks consecutive 404 responses.

---

## Bug Details

### Bug Condition

The four bugs each have a distinct trigger condition. Together they form a compound bug
condition: any one of them alone is enough to break the execution console display.

**Formal Specification:**

```
FUNCTION isBugCondition(context)
  INPUT: context — the distributed execution flow context
  OUTPUT: boolean

  RETURN (
    -- Bug 1: execution record has no user_id
    context.executionRecord.user_id IS NULL

    OR

    -- Bug 2: status endpoint reads wrong columns
    context.statusQuery.selects CONTAINS 'error_message'
    OR context.statusQuery.selects CONTAINS 'completed_at'

    OR

    -- Bug 3: polling aborts too early
    context.notFoundCount >= 3
    AND context.elapsedMs < 15_000

    OR

    -- Bug 4: wrong workflow_id stored
    context.executionRecord.workflow_id = workflowDef.id
    AND workflowDef.id != callerWorkflowId
  )
END FUNCTION
```

### Examples

**Bug 1 — Missing `user_id`:**
- User triggers workflow `wf-abc`. `startExecution("wf-abc", {})` inserts execution row
  with `workflow_id = "wf-abc"` but no `user_id`. db-proxy query `SELECT * FROM executions
  WHERE user_id = 'user-123'` returns zero rows. Frontend console stays empty.

**Bug 2 — Wrong column names:**
- Execution completes. `execute-workflow.ts` writes `finished_at = "2024-01-01T12:00:00Z"`
  and `error = null`. `getExecutionStatus` selects `completed_at` (NULL) and `error_message`
  (NULL). Response: `{ completed_at: null, error: null }`. Frontend never sees completion.

**Bug 3 — Premature polling abort:**
- Frontend starts polling at T=0ms. Background `execute-workflow.ts` starts at T=80ms.
  Polls at T=1000ms, T=2000ms, T=3000ms all return 404 (execution not yet visible because
  of Bug 1, or not yet started). `notFoundCount` reaches 3. Polling stops. Console stays
  empty even after execution completes.

**Bug 4 — Wrong `workflow_id`:**
- `workflowDef.id = "def-uuid-999"`, `workflowId = "wf-abc"`. Execution record stored with
  `workflow_id = "def-uuid-999"`. `execute-workflow.ts` resume path queries
  `.eq('id', providedExecutionId)` — this actually works because it queries by `id`, not
  `workflow_id`. However, the lock release and event logging use `execution.workflow_id`,
  which is now `"def-uuid-999"` instead of `"wf-abc"`, potentially breaking lock release.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The non-distributed `execute-workflow.ts` path (no `providedExecutionId`) MUST continue
  to insert execution records with `user_id: workflow.user_id` exactly as it does today.
- db-proxy MUST continue to enforce `WHERE user_id = $1` on all `executions` queries —
  this is correct security behavior and must not be relaxed.
- The frontend polling loop MUST continue to stop immediately when a terminal status
  (`success`, `failed`, `completed`, `error`) is received.
- The execution lock acquire/release flow MUST continue to prevent concurrent executions.
- `getExecutionStatus` MUST continue to return the full `steps` array ordered by `sequence`.
- The `workflow-execution-started` event MUST continue to immediately show the execution
  as `running` in the console list before the first poll completes.

**Scope:**
All inputs that do NOT involve the distributed execution path are completely unaffected.
This includes:
- Direct calls to `execute-workflow.ts` without a `providedExecutionId`.
- Any frontend interaction that does not trigger the `workflow-execution-started` event.
- All db-proxy read/write operations for tables other than `executions`.

**Note:** The actual expected correct behavior for each bug is defined in the Correctness
Properties section below. This section focuses on what must NOT change.

---

## Hypothesized Root Cause

### Bug 1 — Missing `user_id` in `startExecution`

`DistributedOrchestrator.startExecution()` was written as a standalone orchestrator that
receives only `workflowId` and `inputData`. It has no access to the authenticated user's
identity. The `user_id` field was simply never added to the insert payload. The caller
(`distributedExecuteWorkflow`) already extracts `currentUserId` from the auth header but
does not pass it down to `startExecution`.

**Specific location:**
```typescript
// distributed-orchestrator.ts, startExecution(), ~line 80
const { data: execution, error: execError } = await this.supabase
  .from('executions')
  .insert({
    workflow_id: workflowIdForExecution,
    status: 'pending',
    // ❌ user_id is missing
    ...
  })
```

### Bug 2 — Wrong column names in `getExecutionStatus`

The `getExecutionStatus` handler was written referencing column names that don't match
what `execute-workflow.ts` actually writes. The `executions` table uses `finished_at`
(not `completed_at`) and `error` (not `error_message`) based on the insert in
`execute-workflow.ts` line ~17384. The status handler also maps `completed_at` in the
response object, so even if the select were fixed, the response key would still be wrong.

**Specific location:**
```typescript
// distributed-execute-workflow.ts, getExecutionStatus(), select clause
.select(lite
  ? 'id, workflow_id, status, current_node, started_at, finished_at, completed_at, error_message'
  //                                                                  ^^^^^^^^^^^  ^^^^^^^^^^^^^
  //                                                                  wrong        wrong
  : '*')
```

And in the response object:
```typescript
completed_at: execution.completed_at,   // ❌ should be finished_at
error: execution.error_message,          // ❌ should be error
```

### Bug 3 — Premature polling abort at 3 consecutive 404s

The threshold of 3 was chosen without accounting for the latency between the HTTP response
returning the `executionId` and the background `setImmediate` task actually creating the
execution record in the database. In practice this window can be 50–200 ms, and the first
poll fires at 1000 ms — but if Bug 1 is also present, the record is invisible via db-proxy
even after it exists, so 404s accumulate quickly. The fix to Bug 1 reduces the 404 window,
but the threshold should still be raised as a defense-in-depth measure.

**Specific location:**
```typescript
// ExecutionConsole.tsx, handleExecutionStarted polling loop
} else if (statusResponse.status === 404) {
  notFoundCount += 1;
  if (notFoundCount >= 3) {   // ❌ too low
    pollStopped = true;
    await loadExecutions();
    return;
  }
```

### Bug 4 — `workflowDef.id` used instead of caller `workflowId`

`getWorkflowDefinition` returns a `WorkflowDefinition` object whose `id` field is the UUID
from the `workflow_definitions` table. When a workflow is looked up by its `workflows.id`
UUID, `workflowDef.id` equals `workflowId` and there is no bug. However, the code has an
explicit fallback `workflowDef.id || workflowId` that implies the author was uncertain.
The real risk is when `workflow_definitions` is queried first and returns a different UUID.
The safest fix is to always use the caller-supplied `workflowId` for the `workflow_id`
column, since that is the ID the rest of the system (lock, event logger, frontend) uses.

**Specific location:**
```typescript
// distributed-orchestrator.ts, startExecution()
const workflowIdForExecution = workflowDef.id || workflowId;  // ❌ should always be workflowId
```

---

## Correctness Properties

Property 1: Bug Condition — Execution Record Visibility

_For any_ distributed workflow execution where `startExecution()` is called with a valid
`workflowId` and a non-null `userId`, the fixed `startExecution()` SHALL insert the
execution record with `user_id = userId` (falling back to `workflow.user_id` if `userId`
is not provided), so that the record is returned by any db-proxy query scoped to that user.

**Validates: Requirements 2.1, 2.6**

Property 2: Bug Condition — Accurate Status Response

_For any_ execution that has completed (i.e., `finished_at` is non-null) or failed (i.e.,
`error` is non-null), the fixed `getExecutionStatus` SHALL return a response where
`completed_at` maps to the value of the `finished_at` column and `error` maps to the value
of the `error` column, so that the frontend correctly detects terminal state.

**Validates: Requirements 2.2, 2.3**

Property 3: Bug Condition — Polling Tolerance

_For any_ sequence of consecutive 404 responses from `/api/execution-status/:id` where
fewer than 10 consecutive 404s have occurred AND fewer than 15 seconds have elapsed since
polling started, the fixed polling loop SHALL continue polling and SHALL NOT call
`loadExecutions()` or set `pollStopped = true`.

**Validates: Requirements 2.4**

Property 4: Bug Condition — Correct `workflow_id` Stored

_For any_ call to `startExecution(workflowId, inputData)`, the fixed implementation SHALL
store exactly `workflowId` (the caller-supplied argument) in the `workflow_id` column of
the execution record, regardless of what `workflowDef.id` returns.

**Validates: Requirements 2.5**

Property 5: Preservation — Non-Distributed Path Unchanged

_For any_ execution created via the non-distributed `execute-workflow.ts` path (no
`providedExecutionId`), the fixed code SHALL produce exactly the same execution record
as the original code, including `user_id: workflow.user_id`, `workflow_id: workflowId`,
and all other fields.

**Validates: Requirements 3.1**

Property 6: Preservation — db-proxy Security Unchanged

_For any_ GET request to `/api/db/executions` via db-proxy, the fixed code SHALL continue
to enforce `WHERE user_id = $1` scoping, returning only rows belonging to the authenticated
user.

**Validates: Requirements 3.4**

---

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the following four surgical changes are needed:

---

**File**: `worker/src/services/workflow-executor/distributed/distributed-orchestrator.ts`

**Function**: `startExecution(workflowId, inputData)`

**Change 1 — Accept optional `userId` parameter:**

```typescript
// Before
async startExecution(
  workflowId: string,
  inputData: ExecutionInput
): Promise<string>

// After
async startExecution(
  workflowId: string,
  inputData: ExecutionInput,
  userId?: string          // ← new optional parameter
): Promise<string>
```

**Change 2 — Always use caller `workflowId` and include `user_id` in insert:**

```typescript
// Before
const workflowIdForExecution = workflowDef.id || workflowId;

const { data: execution, error: execError } = await this.supabase
  .from('executions')
  .insert({
    workflow_id: workflowIdForExecution,
    status: 'pending',
    // no user_id
    ...
  })

// After
// Bug 4 fix: always use the caller-supplied workflowId
const workflowIdForExecution = workflowId;

// Bug 1 fix: include user_id, falling back to workflow owner
const effectiveUserId = userId ?? workflowDef.userId ?? undefined;

const { data: execution, error: execError } = await this.supabase
  .from('executions')
  .insert({
    workflow_id: workflowIdForExecution,
    status: 'pending',
    user_id: effectiveUserId,   // ← added
    ...
  })
```

Note: `WorkflowDefinition` does not currently carry a `userId` field. The fallback
`workflowDef.userId` is a safety net; the primary path is the `userId` argument passed
from the caller. If neither is available, `user_id` is omitted (preserving current
behavior for any non-authenticated call paths).

---

**File**: `worker/src/api/distributed-execute-workflow.ts`

**Function**: `distributedExecuteWorkflow` — caller of `startExecution`

**Change 3 — Pass `currentUserId` to `startExecution`:**

```typescript
// Before
const executionId = await orchestrator.startExecution(workflowId, input);

// After
const executionId = await orchestrator.startExecution(
  workflowId,
  input,
  currentUserId ?? workflow.user_id   // ← pass userId; fall back to workflow owner
);
```

`currentUserId` is already extracted from the auth header earlier in the function.
`workflow.user_id` is available from the workflow fetch at the top of the handler.

---

**File**: `worker/src/api/distributed-execute-workflow.ts`

**Function**: `getExecutionStatus`

**Change 4 — Fix column names in select and response mapping:**

```typescript
// Before (lite select)
.select(lite
  ? 'id, workflow_id, status, current_node, started_at, finished_at, completed_at, error_message'
  : '*')

// After (lite select)
.select(lite
  ? 'id, workflow_id, status, current_node, started_at, finished_at, error'
  : '*')

// Before (response object)
const response: Record<string, unknown> = {
  ...
  completed_at: execution.completed_at,
  error: execution.error_message,
  ...
};

// After (response object)
const response: Record<string, unknown> = {
  ...
  completed_at: execution.finished_at,   // ← read finished_at, expose as completed_at
  error: execution.error,                 // ← read error, not error_message
  ...
};
```

---

**File**: `ctrl_checks/src/components/workflow/ExecutionConsole.tsx`

**Function**: `handleExecutionStarted` polling loop

**Change 5 — Raise 404 tolerance and add time-based threshold:**

```typescript
// Before
} else if (statusResponse.status === 404) {
  notFoundCount += 1;
  if (notFoundCount >= 3) {
    pollStopped = true;
    await loadExecutions();
    return;
  }
  await new Promise((r) => setTimeout(r, 1000));
}

// After
} else if (statusResponse.status === 404) {
  notFoundCount += 1;
  const elapsedMs = Date.now() - startedAt;
  // Give up only after 10 consecutive 404s AND at least 15 seconds have elapsed.
  // This tolerates the ~100ms background-task startup window and the user_id
  // propagation delay, while still eventually stopping on a genuinely missing execution.
  if (notFoundCount >= 10 && elapsedMs >= 15_000) {
    pollStopped = true;
    await loadExecutions();
    return;
  }
  await new Promise((r) => setTimeout(r, 1000));
}
```

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that
demonstrate each bug on unfixed code to confirm the root cause analysis; then verify the
fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix.
Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write unit tests that call the affected functions with controlled inputs and
assert the expected outcomes. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:

1. **Bug 1 — Missing `user_id`**: Call `startExecution("wf-test", {})` on unfixed code.
   Inspect the inserted row. Assert `user_id IS NOT NULL` — will fail on unfixed code.

2. **Bug 2 — Wrong column names**: Create an execution with `finished_at` and `error` set.
   Call `getExecutionStatus` on unfixed code. Assert `response.completed_at` is non-null
   and `response.error` is non-null — will fail on unfixed code (both return null).

3. **Bug 3 — Premature abort**: Simulate 3 consecutive 404 responses within the first
   5 seconds of polling. Assert that `pollStopped` is still `false` — will fail on unfixed
   code (polling stops after 3 × 404).

4. **Bug 4 — Wrong `workflow_id`**: Mock `getWorkflowDefinition` to return a
   `WorkflowDefinition` with `id = "def-uuid-different"` when called with
   `workflowId = "wf-actual"`. Call `startExecution("wf-actual", {})` on unfixed code.
   Assert `execution.workflow_id === "wf-actual"` — will fail on unfixed code
   (stores `"def-uuid-different"`).

**Expected Counterexamples**:
- Bug 1: Inserted row has `user_id = null`, causing db-proxy to return zero rows.
- Bug 2: `response.completed_at` is `null` even when execution has finished.
- Bug 3: Polling loop exits after 3 × 404 at T≈3s, before execution is visible.
- Bug 4: `execution.workflow_id` is `workflowDef.id`, not the caller's `workflowId`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions
produce the expected behavior.

**Pseudocode:**
```
FOR ALL context WHERE isBugCondition(context) DO
  result := fixedFunction(context)
  ASSERT expectedBehavior(result)
END FOR
```

Specifically:
- For Bug 1: `startExecution(wfId, input, userId)` → `execution.user_id === userId`
- For Bug 2: `getExecutionStatus(req)` → `response.completed_at === execution.finished_at`
- For Bug 3: After 9 × 404 at T=5s → `pollStopped === false`
- For Bug 4: `startExecution("wf-actual", input)` → `execution.workflow_id === "wf-actual"`

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed
functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL context WHERE NOT isBugCondition(context) DO
  ASSERT originalFunction(context) = fixedFunction(context)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking
because it generates many test cases automatically across the input domain, catches edge
cases that manual unit tests might miss, and provides strong guarantees that behavior is
unchanged for all non-buggy inputs.

**Test Plan**: Observe behavior on UNFIXED code first for non-bug inputs, then write
property-based tests capturing that behavior.

**Test Cases**:

1. **Non-distributed path preservation**: Call `execute-workflow.ts` without
   `providedExecutionId`. Assert the inserted execution record has `user_id: workflow.user_id`
   and `workflow_id: workflowId` — unchanged by the fix.

2. **db-proxy scoping preservation**: Query `/api/db/executions` as user A. Assert that
   execution records belonging to user B are not returned — unchanged by the fix.

3. **Terminal status stops polling**: Simulate a 200 response with `status: "success"`.
   Assert `pollStopped === true` immediately — unchanged by the fix.

4. **Steps array preservation**: Call `getExecutionStatus` for an execution with 3 steps.
   Assert `response.steps.length === 3` and steps are ordered by `sequence` ascending —
   unchanged by the fix.

5. **Lock behavior preservation**: Verify that `acquireExecutionLock` and
   `releaseExecutionLock` are still called with the correct `workflowId` (the caller-supplied
   one, not `workflowDef.id`) — this is actually improved by Bug 4 fix.

### Unit Tests

- Test `startExecution` inserts `user_id` when `userId` argument is provided.
- Test `startExecution` falls back to `workflow.user_id` when `userId` is not provided.
- Test `startExecution` always stores caller `workflowId` in `workflow_id` column.
- Test `getExecutionStatus` maps `finished_at` → `completed_at` in response.
- Test `getExecutionStatus` maps `error` → `error` in response (not `error_message`).
- Test polling loop does not stop after 9 consecutive 404s within 15 seconds.
- Test polling loop does stop after 10 consecutive 404s AND 15+ seconds elapsed.
- Test polling loop stops immediately on terminal status regardless of 404 count.

### Property-Based Tests

- Generate random `userId` values (UUID, empty string, undefined) and verify that
  `startExecution` always stores a non-null `user_id` when a valid UUID is provided.
- Generate random execution records with arbitrary `finished_at` and `error` values and
  verify that `getExecutionStatus` always maps them correctly in the response.
- Generate random sequences of 404 and 200 responses and verify that the polling loop
  only stops on terminal status or after the combined count+time threshold is exceeded.
- Generate random `workflowId` / `workflowDef.id` pairs and verify that the stored
  `workflow_id` always equals the caller-supplied `workflowId`.

### Integration Tests

- Full distributed execution flow: trigger workflow → poll status → assert console shows
  running steps → assert console shows terminal state after completion.
- Verify execution record is visible via db-proxy immediately after `startExecution` returns.
- Verify that switching between distributed and non-distributed execution paths produces
  consistent execution records in the `executions` table.
- Verify that the execution lock is acquired and released with the correct `workflowId`
  throughout the distributed flow.
