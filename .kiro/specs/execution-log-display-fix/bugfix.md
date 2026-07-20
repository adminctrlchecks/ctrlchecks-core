# Bugfix Requirements Document

## Introduction

When a user triggers a workflow execution, the frontend execution console never displays logs or status updates — it stays empty for the entire run. The backend completes execution successfully (all nodes run, Gmail is sent, status is updated to `success`), but the frontend never reflects this.

The root cause is a chain of four interconnected bugs:

1. `DistributedOrchestrator.startExecution()` creates the execution record without a `user_id`, making it invisible to the db-proxy (which filters all `executions` queries by `user_id`).
2. The `/api/execution-status/:id` endpoint queries the wrong column names (`error_message` instead of `error`, `completed_at` instead of `finished_at`), causing the status response to always return null for completion time and error details.
3. The frontend polling logic gives up after only 3 consecutive 404 responses — too aggressively — before the background execution has had time to start.
4. The `execute-workflow.ts` resume path may fail to find the execution record when `DistributedOrchestrator` stores `workflowDef.id` instead of the actual `workflowId` in the `workflow_id` column.

Together, these bugs mean the execution record is invisible to the frontend, the status endpoint returns stale/wrong data, and polling stops before the execution has a chance to complete.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `DistributedOrchestrator.startExecution()` creates an execution record THEN the system inserts the row without a `user_id` field, making it invisible to any query filtered by `user_id`

1.2 WHEN the frontend calls `/api/execution-status/:id` and the execution exists THEN the system returns `null` for `completed_at` because the actual completion timestamp is stored in `finished_at`, not `completed_at`

1.3 WHEN the frontend calls `/api/execution-status/:id` and the execution has an error THEN the system returns `null` for the error field because the endpoint selects `error_message` but the column written by `execute-workflow.ts` is `error`

1.4 WHEN the frontend receives 3 consecutive 404 responses from `/api/execution-status/:id` THEN the system stops polling entirely and falls back to `loadExecutions()`, which also returns no results because the execution has no `user_id`

1.5 WHEN `execute-workflow.ts` is called with a `providedExecutionId` in the resume path THEN the system may fail to find the execution record if `DistributedOrchestrator` stored `workflowDef.id` (from `workflow_definitions` table) instead of the actual `workflowId` in the `workflow_id` column

1.6 WHEN `loadExecutions()` queries the `executions` table via db-proxy THEN the system returns zero rows for the newly created execution because db-proxy enforces `WHERE user_id = $1` and the execution record has no `user_id`

### Expected Behavior (Correct)

2.1 WHEN `DistributedOrchestrator.startExecution()` creates an execution record THEN the system SHALL include the `user_id` of the workflow owner in the insert, so the record is visible to all user-scoped queries

2.2 WHEN the frontend calls `/api/execution-status/:id` and the execution has completed THEN the system SHALL return the correct completion timestamp by reading from `finished_at` (the column that `execute-workflow.ts` actually writes to)

2.3 WHEN the frontend calls `/api/execution-status/:id` and the execution has an error THEN the system SHALL return the correct error message by reading from the `error` column (the column that `execute-workflow.ts` actually writes to)

2.4 WHEN the frontend receives 404 responses from `/api/execution-status/:id` during early polling THEN the system SHALL continue polling with a higher tolerance (at least 10 consecutive 404s, or a time-based threshold) to account for the ~100ms window before `execute-workflow.ts` starts running

2.5 WHEN `execute-workflow.ts` is called with a `providedExecutionId` in the resume path THEN the system SHALL locate the execution record using only the `id` field (not filtering by `workflow_id`), or the `workflow_id` stored SHALL match the `workflowId` passed to the distributed endpoint

2.6 WHEN `loadExecutions()` queries the `executions` table via db-proxy after an execution is started THEN the system SHALL return the new execution record because it has a `user_id` matching the authenticated user

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a workflow execution is triggered via the non-distributed `execute-workflow.ts` path (without a `providedExecutionId`) THEN the system SHALL CONTINUE TO create the execution record with `user_id: workflow.user_id` as it does today

3.2 WHEN the frontend polls `/api/execution-status/:id` for a running execution that returns a valid 200 response THEN the system SHALL CONTINUE TO update the execution console in real-time with node statuses and step data

3.3 WHEN the frontend polling detects a terminal status (`success`, `failed`, `completed`, `error`) THEN the system SHALL CONTINUE TO stop polling and load the full execution details

3.4 WHEN db-proxy handles a GET request for the `executions` table THEN the system SHALL CONTINUE TO enforce `WHERE user_id = $1` scoping so users can only see their own executions

3.5 WHEN `getExecutionStatus` returns execution steps THEN the system SHALL CONTINUE TO include the full `steps` array ordered by `sequence` ascending

3.6 WHEN the execution lock is acquired and released during the distributed execution flow THEN the system SHALL CONTINUE TO prevent concurrent executions of the same workflow

3.7 WHEN the frontend dispatches a `workflow-execution-started` event THEN the system SHALL CONTINUE TO immediately show the execution as `running` in the console list before the first poll completes
