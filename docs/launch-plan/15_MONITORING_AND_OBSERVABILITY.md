# 15 — Monitoring and Observability

---

## Current State

**Status: Partial — console logging only, no structured metrics**

What exists:
- Extensive `console.log` throughout worker — not structured, not queryable
- `worker/src/core/observability/distributed-tracing.ts` — trace context exists
- No Sentry, no Datadog, no Prometheus, no CloudWatch custom metrics
- No structured log format (JSON) — just free-text console

---

## Logs to Add

### 1. Execution Lifecycle Logs

Add to `worker/src/services/execution-job-runner.ts`:

```typescript
// Structured log format — use this pattern everywhere
function logExecution(level: 'info' | 'warn' | 'error', event: string, data: object) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    service: 'execution-worker',
    ...data,
  }));
}

// Usage:
logExecution('info', 'execution.queued', { executionId, workflowId, userId });
logExecution('info', 'execution.started', { executionId, workflowId, userId });
logExecution('info', 'execution.node.started', { executionId, nodeType, nodeIndex, total });
logExecution('info', 'execution.node.completed', { executionId, nodeType, durationMs });
logExecution('info', 'execution.completed', { executionId, totalDurationMs, nodeCount });
logExecution('error', 'execution.failed', { executionId, errorCode, errorMessage, nodeType });
logExecution('warn', 'execution.timeout', { executionId, timeoutMs });
logExecution('warn', 'execution.retry', { executionId, attempt, maxRetries });
```

### 2. Gemini Key Pool Logs

In `worker/src/services/ai/gemini-key-pool.ts`:
```typescript
// SAFE: log only index, NEVER the key value
console.warn(JSON.stringify({ event: 'gemini.key.rate_limited', keyIndex: index, cooldownMs }));
console.error(JSON.stringify({ event: 'gemini.key.auth_failed', keyIndex: index }));
console.info(JSON.stringify({ event: 'gemini.keys.exhausted', keyCount: this.keys.length }));
```

### 3. WebSocket Bridge Logs

In `worker/src/services/ws-redis-bridge.ts`:
```typescript
console.info(JSON.stringify({ event: 'ws.client.connected', executionId, userId }));
console.info(JSON.stringify({ event: 'ws.client.disconnected', executionId, userId }));
console.info(JSON.stringify({ event: 'ws.event.published', executionId, status }));
console.warn(JSON.stringify({ event: 'ws.redis.unavailable' }));
```

### 4. Queue Logs

In `worker/src/services/execution-queue.ts`:
```typescript
console.info(JSON.stringify({ event: 'queue.job.added', jobId, executionId, queueDepth }));
console.info(JSON.stringify({ event: 'queue.job.started', jobId, executionId }));
console.error(JSON.stringify({ event: 'queue.job.failed', jobId, executionId, error }));
console.warn(JSON.stringify({ event: 'queue.depth.high', depth: pendingCount }));
```

---

## Metrics to Add

Add a `/api/metrics` endpoint (or expose as health endpoint data):

```typescript
// worker/src/api/metrics.ts
export async function metricsHandler(req, res) {
  const db = getDbClient();
  
  // Execution counts by status (last 1 hour)
  const { data: execStats } = await db
    .from('executions')
    .select('status')
    .gte('queued_at', new Date(Date.now() - 3600000).toISOString());
  
  const counts = { queued: 0, running: 0, success: 0, failed: 0 };
  execStats?.forEach(e => counts[e.status] = (counts[e.status] || 0) + 1);
  
  // Gemini pool metrics (no key values)
  const geminiPool = getGeminiKeyPool();
  
  res.json({
    executions: counts,
    gemini: geminiPool.getMetrics(),
    websocket: {
      connections: getWsConnectionCount(),  // from ws-redis-bridge
    },
    queue: {
      pending: await getQueueDepth(),
    },
  });
}
```

Register route in `worker/src/index.ts`:
```typescript
app.get('/api/metrics', asyncHandler(metricsHandler));
```

---

## Alerts to Add

Since there is no external alerting infrastructure yet, add threshold-based console warnings that can be wired to PagerDuty/Slack later:

```typescript
// Check every 30 seconds:
setInterval(async () => {
  const queueDepth = await getQueueDepth();
  if (queueDepth > 200) {
    console.error(JSON.stringify({ event: 'alert.queue.depth_high', depth: queueDepth }));
  }
  
  const stuckCount = await countStuckExecutions(); // running for > 10 min
  if (stuckCount > 0) {
    console.error(JSON.stringify({ event: 'alert.execution.stuck', count: stuckCount }));
  }
}, 30000);
```

---

## Health Endpoints

Update `/api/health` to return structured health data:

```typescript
// worker/src/index.ts — update health endpoint
app.get('/api/health', async (req, res) => {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
    gemini: 'unknown',
    queue: 'unknown',
  };
  
  try { await db.raw('SELECT 1'); checks.database = 'ok'; } catch { checks.database = 'error'; }
  try { await redisClient.ping(); checks.redis = 'ok'; } catch { checks.redis = 'error'; }
  checks.gemini = getGeminiKeyPool().getMetrics().some(k => !k.isCooling) ? 'ok' : 'all_cooling';
  checks.queue = (await getQueueDepth()) < 500 ? 'ok' : 'overloaded';
  
  const healthy = Object.values(checks).every(v => v === 'ok');
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'healthy' : 'degraded', checks });
});

app.get('/api/health/gemini', (req, res) => {
  res.json({ keys: getGeminiKeyPool().getMetrics() });
});
```

---

## Error Tracking

For this launch: grep logs for `"level":"error"` in docker logs.

Future improvement (not in this launch scope):
- Add Sentry: `npm install @sentry/node`
- Initialize with `SENTRY_DSN` env var
- Capture unhandled exceptions and rejected promises

---

## AI-Specific Monitoring

| Metric | Where to check |
|---|---|
| Gemini key health | `GET /api/health/gemini` |
| Rate-limit count per key | Gemini metrics endpoint |
| Fallback count | Grep logs for `gemini.key.rate_limited` |
| AI request success rate | Grep logs for `execution.node.completed` where nodeType contains `ai` |

---

## Database Monitoring

```bash
# Current DB connection count through PgBouncer
docker compose exec pgbouncer psql -h 127.0.0.1 -p 6432 -U $DB_USER -d pgbouncer -c "SHOW STATS"

# Pool details
SHOW POOLS;

# Long-running queries (sign of blocking)
psql $DIRECT_DATABASE_URL -c "SELECT pid, duration, query FROM pg_stat_activity WHERE duration > interval '30 seconds'"

# Stuck executions (running > 10 min)
psql $DIRECT_DATABASE_URL -c "
  SELECT id, workflow_id, user_id, started_at, 
         EXTRACT(EPOCH FROM (now() - started_at))/60 AS minutes_running
  FROM executions
  WHERE status = 'running'
    AND started_at < now() - INTERVAL '10 minutes'
"
```

---

## PgBouncer Monitoring

```bash
# Overall stats
SHOW STATS;     -- total_requests, avg_query_count, avg_query_time

# Pool status  
SHOW POOLS;     -- cl_active, cl_waiting, sv_active, sv_idle, sv_used

# Watch for cl_waiting > 0 (clients waiting for a server connection = saturation)
```

---

## Redis Monitoring

```bash
# Memory usage
docker compose exec redis redis-cli info memory | grep used_memory_human

# Pub/sub channel status
docker compose exec redis redis-cli pubsub channels 'ctrlchecks:ws:*'

# Queue depth
docker compose exec redis redis-cli llen ctrlchecks:execution-queue
```

---

## Kafka Monitoring

```bash
# Consumer group lag (should be near 0 when healthy)
docker compose exec kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe --group request-consumer-group
```

---

## WebSocket Monitoring

```bash
# Active WS connections (from log grep)
docker compose logs app1 app2 app3 | grep 'ws.client.connected' | wc -l

# Reconnects (sign of instability)
docker compose logs | grep 'ws.client.disconnected' | tail -20
```

---

## Frontend Error Monitoring

For this launch: check browser console manually after deploy.

Future: Add Sentry browser SDK:
```typescript
// ctrl_checks/src/main.tsx
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
```

---

## Required Metrics Summary

| Metric | Target Value | Alert if |
|---|---|---|
| Executions queued (per hour) | Any | Queue depth > 200 for > 5 min |
| Executions failed rate | < 5% | > 10% failure rate |
| Execution avg duration | < 60s | p95 > 120s |
| DB connections (server-side) | < 50 | > 80 |
| Redis memory | < 100MB | > 500MB |
| Gemini keys available | At least 1 | All keys cooling |
| API p95 latency (enqueue) | < 2s | > 5s sustained |
| API error rate | < 1% | > 5% |
| WS reconnects | < 5/min | > 20/min |
| Queue depth | < 100 | > 500 |
