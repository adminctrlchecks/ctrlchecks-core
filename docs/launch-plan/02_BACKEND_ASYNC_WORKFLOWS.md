# 02 — Backend Async Workflows

---

## Current Synchronous Execution Path

Evidence: `worker/src/api/execute-workflow.ts` line 18709 onward

```
POST /api/execute-workflow
  → req body: { workflowId, executionId?, input, useQueue? }
  → fetch workflow from DB
  → validate confirmed status
  → check execution lock (409 if already running)
  → topological sort DAG
  → for each node: resolve credentials → executeNode() → wait for result
  → return full result JSON (may take 30–120 seconds for complex workflows)
  → HTTP connection held open entire time
```

**Why it blocks**: `executeNode()` calls external APIs (Gemini, Gmail, Sheets, Slack etc). Each node can take 5–30 seconds. A 5-node workflow = 150 seconds blocking the HTTP thread. Under load, all 3 replicas (app1/app2/app3) can fill their thread pools and stop accepting new requests.

---

## Target Async Architecture

```
POST /api/execute-workflow
  → validate auth + workflow
  → create execution row with status = 'queued'
  → push job to execution-queue (Redis list)
  → return 202 { executionId, status: 'queued' }  ← fast, ~200ms

Worker process (kafkaRequestConsumer.ts or new queue-worker):
  → pull job from queue
  → run topological sort
  → for each node: executeNode()
  → update execution row to 'running' then 'success'/'failed'
  → publish Redis event → WebSocket bridge → browser
```

---

## Queue / Background Execution Design

**Existing infrastructure to leverage:**

- `worker/src/services/execution-queue.ts` — already exists with Redis-backed queue
- `worker/src/workers/kafkaRequestConsumer.ts` — already a worker process
- `ENABLE_EXECUTION_QUEUE` env var at line 18727 of execute-workflow.ts — already wired, just not set

**What needs to change:**

1. Set `ENABLE_EXECUTION_QUEUE=true` in `infra/docker-compose.yml` for all app services
2. Wire `execution-queue.ts` to actually call the execution logic (currently the queue enqueues but may not call executeWorkflow)
3. Add a dedicated queue-worker process (or extend kafkaRequestConsumer) that pulls jobs and runs them
4. Return 202 with `executionId` immediately when queue mode is active

---

## Worker Process Design

**Option A (recommended):** Extend existing `kafkaRequestConsumer.ts` pattern

Create `worker/src/workers/executionQueueWorker.ts`:
```typescript
import { getExecutionQueue } from '../services/execution-queue';
import { executeWorkflowJob } from '../services/execution-job-runner';

async function start() {
  const queue = await getExecutionQueue();
  queue.on('job', async (job) => {
    await executeWorkflowJob(job);
  });
}
```

Add to `infra/docker-compose.yml`:
```yaml
execution-worker:
  <<: *app
  command: npm run start:execution-worker
  deploy:
    replicas: 2
```

Add to `worker/package.json`:
```json
"start:execution-worker": "ts-node src/workers/executionQueueWorker.ts"
```

---

## Job Lifecycle

```
queued → running → success
                 → failed (retry if retryCount < maxRetries)
                           → failed (permanent, retryCount >= maxRetries)
       → cancelled (user called /cancel)
```

---

## Status Model

The `executions` table already exists. It needs additional columns.

**Existing columns** (from `worker/prisma/migrations/0001_init_memory_system.sql`):
- `id`, `workflow_id`, `status`, `input_data`, `result_data`, `started_at`, `finished_at`, `execution_time`, `error_message`, `context`

**Missing columns** (need migration):
- `user_id` — required for authorization without joining workflows table
- `queued_at` — timestamp when job was enqueued
- `progress` — integer 0–100 for step-by-step progress
- `current_step` — label of currently running node
- `error_code` — machine-readable error class

---

## Migration SQL

File: `worker/prisma/migrations/0005_execution_async_fields.sql`

```sql
-- Add async execution columns to existing executions table
ALTER TABLE executions
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_step VARCHAR(255),
  ADD COLUMN IF NOT EXISTS error_code VARCHAR(128);

-- Backfill user_id from workflows table for existing rows
UPDATE executions e
SET user_id = w.user_id
FROM workflows w
WHERE e.workflow_id = w.id
  AND e.user_id IS NULL;

-- Index for user-scoped execution queries
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_queued_at ON executions(queued_at);

COMMENT ON COLUMN executions.user_id IS 'Direct user reference for fast auth checks without workflow join';
COMMENT ON COLUMN executions.queued_at IS 'When the job was placed in the async queue';
COMMENT ON COLUMN executions.progress IS 'Percentage complete 0-100';
COMMENT ON COLUMN executions.current_step IS 'Human-readable label of currently running node';
COMMENT ON COLUMN executions.error_code IS 'Machine-readable error class (RATE_LIMITED, TIMEOUT, CREDENTIAL_MISSING, etc.)';
```

**Rollback SQL:**
```sql
ALTER TABLE executions
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS queued_at,
  DROP COLUMN IF EXISTS progress,
  DROP COLUMN IF EXISTS current_step,
  DROP COLUMN IF EXISTS error_code;

DROP INDEX IF EXISTS idx_executions_user_id;
DROP INDEX IF EXISTS idx_executions_queued_at;
```

---

## Retry Strategy

```typescript
// In execution-queue.ts — already has maxRetries field
maxRetries: 3,
retryDelay: 5000,  // 5s first retry
// Exponential: 5s → 10s → 20s
```

- Retry on: network errors, temporary API failures, Gemini rate limits (after key rotation fails)
- Do NOT retry on: credential errors, invalid workflow JSON, user cancellation

---

## Failure Handling

When a job fails permanently:
1. Update `executions.status = 'failed'`
2. Write `executions.error_message` and `executions.error_code`
3. Publish Redis event `workflow:execution:{executionId}` with `status: 'failed'`
4. Log structured error with `executionId`, `userId`, `errorCode`

---

## Timeout Handling

Evidence: `worker/src/core/execution/timeout-watchdog.ts` already exists

- Set execution timeout at 5 minutes (300,000ms)
- If timeout fires: set status to `failed`, error_code to `TIMEOUT`, release lock
- Lock file: `worker/src/services/execution/execution-lock.ts` (already exists)

---

## Idempotency Strategy

- Each execution has a UUID `executionId`
- If client retries the same `executionId`, check if row exists → return existing status instead of creating duplicate
- Lock check at `execution-lock.ts` already prevents duplicate concurrent runs

---

## API Changes

### Current endpoint
```
POST /api/execute-workflow
Body: { workflowId, input }
Response: 200 { success: true, results: [...] }  ← synchronous, blocks
```

### New behavior (when ENABLE_EXECUTION_QUEUE=true)
```
POST /api/execute-workflow
Body: { workflowId, input }
Response: 202 { executionId: "uuid", status: "queued" }  ← fast

GET /api/workflows/executions/:executionId
Response: 200 { id, status, progress, current_step, error_message, result_data }

GET /api/workflows/:workflowId/executions
Response: 200 { executions: [...] }

POST /api/workflows/executions/:executionId/cancel
Response: 200 { cancelled: true }
```

Note: `cancel-execution.ts` already exists at `worker/src/api/cancel-execution.ts`

---

## Backend Files to Modify

| File | Change |
|---|---|
| `worker/src/api/execute-workflow.ts` line 18727 | Ensure queue path returns 202 immediately |
| `worker/src/services/execution-queue.ts` | Verify job pulls work and calls execution logic |
| `infra/docker-compose.yml` | Add `ENABLE_EXECUTION_QUEUE=true` to app1/app2/app3 |
| `worker/package.json` | Add `start:execution-worker` script |

---

## Backend Files to Create

| File | Purpose |
|---|---|
| `worker/src/workers/executionQueueWorker.ts` | Worker process that pulls jobs and runs them |
| `worker/src/services/execution-job-runner.ts` | Extracted logic that runs a single workflow job (extracted from execute-workflow.ts) |
| `worker/prisma/migrations/0005_execution_async_fields.sql` | Add user_id, queued_at, progress, current_step, error_code |

---

## Tests to Add

File: `worker/src/api/__tests__/async-execution.test.ts`

```
✓ POST /api/execute-workflow returns 202 with executionId when ENABLE_EXECUTION_QUEUE=true
✓ Returned executionId exists in executions table with status "queued"
✓ After worker processes job, status changes to "running" then "success"
✓ Failed execution stores error_message and sets status to "failed"
✓ Long workflow does not block the HTTP thread (resolves under 2s)
✓ User cannot GET another user's execution (403)
✓ User cannot cancel another user's execution (403)
✓ Retry: job with transient error retries up to maxRetries
✓ Cancelled job does not run even if in queue
✓ Duplicate executionId returns existing row instead of creating new
```
