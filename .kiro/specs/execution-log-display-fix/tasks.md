# Implementation Plan

- [x] 1. Fix `workflow_id` and add `userId` parameter to `startExecution`
  - In `distributed-orchestrator.ts`, add optional `userId?: string` as a third parameter to `startExecution()`
  - Change `const workflowIdForExecution = workflowDef.id || workflowId` → `const workflowIdForExecution = workflowId`
  - Add `user_id: userId` to the `executions` insert payload
  - _Bug_Condition: `context.executionRecord.user_id IS NULL` OR `context.executionRecord.workflow_id = workflowDef.id AND workflowDef.id != callerWorkflowId`_
  - _Expected_Behavior: execution record has `user_id = userId` and `workflow_id = workflowId` (caller-supplied)_
  - _Preservation: non-distributed `execute-workflow.ts` path is untouched; lock acquire/release continues to use the correct `workflowId`_
  - _Requirements: 2.1, 2.5, 2.6_

- [x] 2. Pass `userId` from `distributedExecuteWorkflow` to `startExecution`
  - In `distributed-execute-workflow.ts`, change the `orchestrator.startExecution(workflowId, input)` call to `orchestrator.startExecution(workflowId, input, currentUserId ?? workflow.user_id)`
  - `currentUserId` is already extracted from the auth header earlier in the function; `workflow.user_id` is available from the workflow fetch
  - _Bug_Condition: `startExecution` is called without a `userId` argument, so the new parameter is always `undefined`_
  - _Expected_Behavior: the `userId` argument receives the authenticated user's ID (or the workflow owner's ID as fallback)_
  - _Preservation: all other logic in `distributedExecuteWorkflow` is unchanged_
  - _Requirements: 2.1, 2.6_

- [x] 3. Fix column names in `getExecutionStatus` lite select and response mapping
  - In `distributed-execute-workflow.ts`, in the `getExecutionStatus` handler, remove `completed_at, error_message` from the lite select string and keep `finished_at, error`
  - Change `completed_at: execution.completed_at` → `completed_at: execution.finished_at` in the response object
  - Change `error: execution.error_message` → `error: execution.error` in the response object
  - _Bug_Condition: `context.statusQuery.selects CONTAINS 'error_message' OR context.statusQuery.selects CONTAINS 'completed_at'`_
  - _Expected_Behavior: `response.completed_at` equals the value of `finished_at`; `response.error` equals the value of `error`_
  - _Preservation: full (non-lite) select uses `'*'` and is unchanged; `steps` array ordering by `sequence` is unchanged_
  - _Requirements: 2.2, 2.3_

- [x] 4. Raise 404 polling tolerance in `ExecutionConsole.tsx`
  - In `ctrl_checks/src/components/workflow/ExecutionConsole.tsx`, inside the `handleExecutionStarted` polling loop, add `const elapsedMs = Date.now() - startedAt;` before the 404 threshold check
  - Change `if (notFoundCount >= 3)` → `if (notFoundCount >= 10 && elapsedMs >= 15_000)`
  - _Bug_Condition: `context.notFoundCount >= 3 AND context.elapsedMs < 15_000`_
  - _Expected_Behavior: polling continues until at least 10 consecutive 404s AND 15 seconds have elapsed_
  - _Preservation: terminal-status stop (`isTerminalStatus`) fires immediately and is unaffected; `MAX_DURATION_MS` (5 min) cap is unchanged; `workflow-execution-started` event still immediately shows execution as `running`_
  - _Requirements: 2.4_

- [x] 5. Checkpoint — verify the full distributed execution flow end-to-end
  - Trigger a workflow execution via the distributed endpoint and confirm the execution record is visible in the frontend console immediately
  - Confirm the console shows live node step updates while the workflow runs
  - Confirm the console transitions to the terminal state (success or failed) with the correct `completed_at` timestamp and `error` value
  - Confirm that a second trigger while one execution is running is correctly rejected with a 409 (lock still works)
  - Confirm that a workflow executed via the non-distributed `execute-workflow.ts` path still behaves identically to before
  - Ensure all existing tests pass
