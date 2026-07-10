/**
 * engine-runner.ts
 *
 * Lifecycle runner for engine-owned jobs. Calls the worker's internal
 * /api/internal/engine-execute route (sync, useQueue=false) and emits
 * structured observability logs. The worker handles all DB state and WS
 * events during execution — the runner logs accepted/completed/failed here.
 */

import { publishExecutionEvent } from '../lib/ws-publish';
import { getDb } from '../lib/db';
import { getRedis } from '../lib/redis';

export interface EngineJob {
  id: string;
  workflowId: string;
  executionId: string;
  input: Record<string, unknown>;
  userId?: string;
  metadata?: Record<string, unknown>;
}

function structuredLog(
  level: 'info' | 'error',
  event: 'accepted' | 'completed' | 'failed',
  fields: Record<string, unknown>,
): void {
  process.stdout.write(
    JSON.stringify({ level, event, service: 'execution-engine', ts: new Date().toISOString(), ...fields }) + '\n',
  );
}

/**
 * Runs a single engine job end-to-end:
 *   1. Emit structured "accepted" log
 *   2. Publish "running" WS event so clients see it immediately
 *   3. POST to worker's internal execute route (synchronous — waits for completion)
 *   4. Emit structured "completed" or "failed" log + durationMs
 */
export async function runEngineJob(job: EngineJob): Promise<void> {
  const { id: jobId, workflowId, executionId, input, userId } = job;
  const startedAt = Date.now();

  structuredLog('info', 'accepted', { executionId, jobId, workflowId });

  // Publish running event before HTTP call so client UI updates immediately
  await publishExecutionEvent(executionId, {
    type: 'EXECUTION_UPDATE',
    data: { executionId, status: 'running', progress: 0, currentStep: null },
  }).catch(() => { /* non-fatal */ });

  const workerUrl = (process.env.WORKER_INTERNAL_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
  const workerKey = process.env.WORKER_INTERNAL_KEY ?? '';
  const timeoutMs = parseInt(process.env.EXECUTION_TIMEOUT_MS ?? '1800000', 10);

  let success = false;
  let errorMsg: string | undefined;

  try {
    const resp = await fetch(`${workerUrl}/api/internal/engine-execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-engine-key': workerKey,
      },
      body: JSON.stringify({ workflowId, executionId, input, userId }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const body = await resp.json().catch(() => ({}));

    if (!resp.ok || !(body as any).success) {
      errorMsg = (body as any)?.error ?? `Worker returned ${resp.status}`;
    } else {
      success = true;
    }
  } catch (err: any) {
    errorMsg = err?.message ?? String(err);
  }

  const durationMs = Date.now() - startedAt;

  if (success) {
    structuredLog('info', 'completed', { executionId, jobId, workflowId, durationMs });
  } else {
    structuredLog('error', 'failed', { executionId, jobId, workflowId, durationMs, error: errorMsg });

    // Write failed status to DB so polling sees a terminal state (not pending forever)
    const db = await getDb();
    if (db) {
      await db.query(
        `UPDATE executions SET status = 'failed', error = $1, finished_at = NOW() WHERE id = $2`,
        [errorMsg ?? 'engine error', executionId],
      ).catch((e: unknown) => structuredLog('error', 'failed', { executionId, msg: 'db-update-failed', err: String(e) }));
    }

    // Invalidate Redis cache so /api/execution-status stops serving stale 'pending'
    const redis = await getRedis();
    if (redis) {
      const pattern = `/api/execution-status/${executionId}:*`;
      let cursor = '0';
      do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100) as [string, string[]];
        cursor = newCursor;
        if (keys.length > 0) await redis.del(...keys).catch(() => { /* non-fatal */ });
      } while (cursor !== '0');
    }

    // Publish failed WS event so client UI doesn't hang on "running"
    await publishExecutionEvent(executionId, {
      type: 'EXECUTION_UPDATE',
      data: { executionId, status: 'failed', error: errorMsg },
    }).catch(() => { /* non-fatal */ });
  }
}
