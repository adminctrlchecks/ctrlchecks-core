# 08 — Realtime WebSocket Redis Bridge

---

## Current WebSocket Implementation

Evidence: `worker/src/index.ts` lines 1647–1674, `ctrl_checks/src/components/workflow/ExecutionConsole.tsx`, `ctrl_checks/src/components/workflow/RealtimeExecutionVisualizer.tsx`

**What exists:**
- Two WebSocket servers initialized in `worker/src/index.ts`:
  - `/ws/executions` — real-time execution visualization
  - `/ws/chat` — chat trigger WebSocket
- Frontend `ExecutionConsole.tsx` connects to `ws://localhost:3001/ws/executions?executionId=...`
- Frontend `RealtimeExecutionVisualizer.tsx` also connects to same endpoint
- WebSocket library: `ws` v8.19.0 (already in `worker/package.json`)

**The critical problem:**
- 3 app replicas (app1, app2, app3) each maintain their OWN in-memory WebSocket connection maps
- If the workflow runs on app2 but the user's browser is connected to app1's WebSocket, no updates reach the user
- nginx round-robins HTTP requests but cannot guarantee sticky sessions for WebSocket in the current config

---

## Current Redis Implementation

Evidence: `worker/src/middleware/redisGetCache.ts`, `worker/src/middleware/redisTokenBucket.ts`

- Redis 7-alpine in docker-compose, port 6379
- Used for HTTP response caching and rate limiting
- `ioredis` v5.9.3 in package.json
- **NOT** currently used for pub/sub

---

## Target Architecture

```
Workflow execution (runs on any replica):
  app2: executeNode() completes step
    → publishes to Redis channel: workflow:execution:{executionId}
    → message: { type, executionId, userId, status, progress, currentStep, ... }

All replicas (app1, app2, app3) subscribe to Redis:
  app1 receives Redis message
    → finds WebSocket connection for this userId or executionId in its local map
    → sends message to browser client

  app2 receives Redis message (already processed, but still forwards to its own clients)
  app3 receives Redis message → same

Browser:
  ← WebSocket message arrives regardless of which replica the workflow ran on
```

---

## Redis Pub/Sub Channel Design

```
Channels:
  workflow:execution:{executionId}   ← per-execution events (primary)
  user:{userId}:events               ← all events for a user (for dashboard)
```

---

## New File to Create

**`worker/src/services/ws-redis-bridge.ts`** — currently MISSING from codebase (confirmed by file scan)

```typescript
import { createClient, RedisClientType } from 'redis';
import WebSocket from 'ws';

type ConnectionMap = Map<string, Set<WebSocket>>; // executionId → Set of WS clients

const CHANNEL_PREFIX = process.env.WEBSOCKET_REDIS_CHANNEL_PREFIX || 'ctrlchecks:ws';

let publisher: RedisClientType | null = null;
let subscriber: RedisClientType | null = null;
const executionConnections: ConnectionMap = new Map();
const userConnections: Map<string, Set<WebSocket>> = new Map();

/**
 * Initialize Redis pub/sub bridge.
 * Call once on server startup after Redis is confirmed available.
 */
export async function initWsRedisBridge(redisUrl: string): Promise<void> {
  publisher = createClient({ url: redisUrl });
  subscriber = createClient({ url: redisUrl });

  await publisher.connect();
  await subscriber.connect();

  // Subscribe to all execution update channels
  await subscriber.pSubscribe(`${CHANNEL_PREFIX}:execution:*`, (message, channel) => {
    try {
      const event = JSON.parse(message);
      broadcastToExecution(event.executionId, event);
      broadcastToUser(event.userId, event);
    } catch (e) {
      console.error('[WsRedisBridge] Failed to parse Redis message:', e);
    }
  });

  console.log('[WsRedisBridge] Initialized — subscribed to Redis pub/sub');
}

/**
 * Publish an execution update event (called by the execution engine).
 */
export async function publishExecutionEvent(event: ExecutionEvent): Promise<void> {
  if (!publisher) return; // Graceful degradation if Redis unavailable
  const channel = `${CHANNEL_PREFIX}:execution:${event.executionId}`;
  await publisher.publish(channel, JSON.stringify(event));
}

/**
 * Register a WebSocket connection for an execution and user.
 */
export function registerWsConnection(executionId: string, userId: string, ws: WebSocket): void {
  if (!executionConnections.has(executionId)) {
    executionConnections.set(executionId, new Set());
  }
  executionConnections.get(executionId)!.add(ws);

  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)!.add(ws);

  ws.on('close', () => {
    executionConnections.get(executionId)?.delete(ws);
    userConnections.get(userId)?.delete(ws);
  });
}

function broadcastToExecution(executionId: string, event: object): void {
  const clients = executionConnections.get(executionId);
  if (!clients) return;
  const message = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function broadcastToUser(userId: string, event: object): void {
  const clients = userConnections.get(userId);
  if (!clients) return;
  const message = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export interface ExecutionEvent {
  type: 'workflow.execution.updated';
  executionId: string;
  workflowId: string;
  userId: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  progress: number;
  currentStep: string | null;
  errorMessage: string | null;
  updatedAt: string;
}
```

---

## Backend Publish Points

Add `publishExecutionEvent()` calls in the execution worker at each lifecycle transition:

```typescript
// In executionQueueWorker.ts or execution-job-runner.ts:

// When job starts:
await publishExecutionEvent({
  type: 'workflow.execution.updated',
  executionId, workflowId, userId,
  status: 'running', progress: 0, currentStep: 'Starting...', errorMessage: null,
  updatedAt: new Date().toISOString(),
});

// When each node completes:
await publishExecutionEvent({ ..., progress: (nodeIndex / totalNodes) * 100, currentStep: nodeName });

// On completion:
await publishExecutionEvent({ ..., status: 'success', progress: 100, currentStep: null });

// On failure:
await publishExecutionEvent({ ..., status: 'failed', errorMessage: err.message });
```

---

## Backend Subscribe Points

In `worker/src/index.ts`, after server starts:
```typescript
if (process.env.REDIS_URL) {
  const { initWsRedisBridge } = await import('./services/ws-redis-bridge');
  await initWsRedisBridge(process.env.REDIS_URL);
}
```

In the `/ws/executions` WebSocket upgrade handler:
```typescript
wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(req.url?.split('?')[1] || '');
  const executionId = params.get('executionId');
  const userId = verifyAuthFromWsRequest(req); // validate JWT from query or header
  
  if (!userId || !executionId) { ws.close(4001, 'Unauthorized'); return; }
  
  registerWsConnection(executionId, userId, ws);
});
```

---

## Authentication and Authorization

WebSocket connections must validate auth before subscribing:
```typescript
function verifyAuthFromWsRequest(req: IncomingMessage): string | null {
  // Option 1: JWT in query string (simpler)
  const token = new URLSearchParams(req.url?.split('?')[1]).get('token');
  // Option 2: Sec-WebSocket-Protocol header (more secure)
  
  if (!token) return null;
  try {
    const payload = jwtVerifier.verify(token);
    return payload.sub; // userId from Cognito JWT
  } catch {
    return null;
  }
}
```

**Security rules:**
- Never trust `userId` from request body or query params — always extract from verified JWT
- Do not send one user's execution events to another user's WebSocket

---

## Frontend Reconnect Strategy

In `ctrl_checks/src/hooks/useExecutionWebSocket.ts`:

```typescript
function connectWithBackoff(executionId: string, token: string, onMessage: (e: ExecutionEvent) => void) {
  let ws: WebSocket;
  let retryDelay = 1000;
  let retryTimer: number;

  function connect() {
    ws = new WebSocket(`${WS_URL}/ws/executions?executionId=${executionId}&token=${token}`);
    
    ws.onopen = () => { retryDelay = 1000; /* reset backoff */ };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose = () => {
      retryTimer = setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, 30000); // max 30s
        connect();
      }, retryDelay);
    };
  }

  connect();
  return () => { clearTimeout(retryTimer); ws?.close(); };
}
```

---

## Polling Fallback

If WebSocket connection fails to establish within 5 seconds, start polling:
```typescript
// In useExecutionStatus.ts
if (!wsConnected && status !== 'success' && status !== 'failed') {
  pollInterval = setInterval(() => fetchStatus(executionId), 3000);
}
```

---

## nginx Sticky Sessions (Optional)

For WebSocket, nginx should not round-robin mid-connection. Update `infra/nginx.conf`:
```nginx
upstream backend {
  ip_hash;  # Sticky sessions by client IP
  server app1:3001;
  server app2:3001;
  server app3:3001;
}
```

With Redis bridge, sticky sessions are not strictly required (any replica receives events), but they reduce unnecessary overhead.

---

## Backend Files to Modify

| File | Change |
|---|---|
| `worker/src/index.ts` | Call `initWsRedisBridge()` on startup; update `/ws/executions` handler to call `registerWsConnection()` |
| `infra/nginx.conf` | Add `ip_hash` for sticky sessions (optional but helpful) |

---

## Backend Files to Create

| File | Purpose |
|---|---|
| `worker/src/services/ws-redis-bridge.ts` | Redis pub/sub + WebSocket connection registry (MISSING — create this) |

---

## Tests to Add

File: `worker/src/services/__tests__/ws-redis-bridge.test.ts`

```
✓ Publishing an event reaches a WebSocket client subscribed to that executionId
✓ Event published by "replica 2" is received by client on "replica 1" (via Redis)
✓ Unauthorized connection is closed with code 4001
✓ User A cannot receive User B's execution events (different userIds)
✓ After WS disconnect, connection is removed from map (no memory leak)
✓ If Redis is unavailable, execution still runs (graceful degradation)
✓ Reconnecting client receives latest status on reconnect
✓ Duplicate events do not cause double-update in UI (idempotent message handling)
```
