import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getRedis } from '../lib/redis';
import { getDb } from '../lib/db';

const router = Router();

// Redis queue keys — must match worker/src/services/execution-queue.ts
const SHARED_QUEUE_KEY = 'workflow:execution:queue';        // Phase 2: shared with worker
const ENGINE_QUEUE_KEY = 'workflow:execution:engine-queue'; // Phase 3: engine-owned queue
const JOB_KEY_PREFIX = 'workflow:execution:job:';

// Use the engine-specific queue when the consumer is active; otherwise fall
// back to the shared worker queue (Phase 2 behaviour).
function getQueueKey(): string {
  return process.env.EXECUTION_ENGINE_CONSUMER_ENABLED === 'true'
    ? ENGINE_QUEUE_KEY
    : SHARED_QUEUE_KEY;
}

/**
 * POST /execute
 *
 * Architecture (Phase 2 — shared Redis queue):
 *   1. Validate request
 *   2. Pre-create execution record in Postgres (status = 'queued')
 *   3. Push job into the shared Redis sorted-set queue
 *   4. Return 202 — worker's ExecutionQueue picks it up and runs it
 *
 * The worker's existing WebSocket bridge (ws-redis-bridge) handles
 * status streaming to the client — no changes needed there.
 *
 * See docs/engineering/execution-engine-contract.md
 */
router.post('/', async (req: Request, res: Response) => {
  const {
    workflowId,
    executionId: providedExecutionId,
    userId,
    input = {},
    metadata = {},
  } = req.body ?? {};

  if (!workflowId || typeof workflowId !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      code: 'MISSING_WORKFLOW_ID',
      message: 'workflowId is required',
      ref: req.requestId,
    });
  }

  const executionId: string = typeof providedExecutionId === 'string' ? providedExecutionId : randomUUID();
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const nowIso = new Date().toISOString();

  // ── Pre-create execution record (non-fatal on failure) ────────────────────
  try {
    const db = await getDb();
    if (db) {
      await db.query(
        `INSERT INTO executions
           (id, workflow_id, user_id, status, trigger, input, logs, started_at, last_heartbeat, timeout_seconds)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          executionId,
          workflowId,
          userId ?? null,
          'pending',
          'manual',
          JSON.stringify(input),
          JSON.stringify([]),
          nowIso,
          nowIso,
          3600,
        ],
      );
    }
  } catch (dbErr) {
    console.warn('[execution-engine] Could not pre-create execution record:', (dbErr as Error).message);
  }

  // ── Enqueue in shared Redis queue ─────────────────────────────────────────
  const redis = await getRedis();
  if (!redis) {
    return res.status(503).json({
      error: 'Service Unavailable',
      code: 'REDIS_UNAVAILABLE',
      message: 'Execution queue is not reachable (Redis unavailable)',
      ref: req.requestId,
    });
  }

  const job = {
    id: jobId,
    workflowId,
    executionId,
    input,
    userId: userId ?? undefined,
    priority: 0,
    maxRetries: 3,
    retryDelay: 5000,
    createdAt: Date.now(),
    status: 'queued',
    retryCount: 0,
    metadata: {
      ...metadata,
      source: 'execution-engine', // tag so worker defensively skips if it somehow sees this job
    },
  };

  const queueKey = getQueueKey();
  try {
    await redis.setex(`${JOB_KEY_PREFIX}${jobId}`, 3600, JSON.stringify(job));
    await redis.zadd(queueKey, 0, jobId);
  } catch (redisErr) {
    console.error('[execution-engine] Redis enqueue failed:', (redisErr as Error).message);
    return res.status(503).json({
      error: 'Service Unavailable',
      code: 'QUEUE_ERROR',
      message: 'Failed to enqueue execution job',
      ref: req.requestId,
    });
  }

  console.log(`[execution-engine] Queued: ${executionId} (job: ${jobId}, workflow: ${workflowId}, queue: ${queueKey})`);

  return res.status(202).json({
    queued: true,
    executionId,
    jobId,
    statusUrl: `/executions/${executionId}/status`,
  });
});

export default router;
