# 09 — Testing Strategy

---

## Test Infrastructure Summary

| Layer | Tool | Location |
|---|---|---|
| Backend unit + integration | Jest | `worker/src/**/__tests__/` |
| Frontend component | Vitest | `ctrl_checks/src/**/__tests__/` |
| Load testing | k6 | `tests/load/` (create this dir) |
| Smoke tests | Shell script | `scripts/smoke-test.sh` (create this) |
| E2E | Not currently set up | Future — not in this launch scope |

---

## Unit Tests

### Backend unit tests

Run: `cd worker && npm test`

Tests to add for this launch:

| File | Tests |
|---|---|
| `worker/src/api/__tests__/async-execution.test.ts` | POST returns 202, status transitions, user auth |
| `worker/src/api/__tests__/lazy-loading.test.ts` | App imports without optional SDKs loaded |
| `worker/src/services/ai/__tests__/gemini-key-pool.test.ts` | Key rotation, cooldown, metrics |
| `worker/src/services/__tests__/ws-redis-bridge.test.ts` | Pub/sub bridge, auth, cleanup |

### Frontend unit tests

Run: `cd ctrl_checks && npm run test:vitest`

Tests to add:

| File | Tests |
|---|---|
| `ctrl_checks/src/__tests__/executionProgress.test.tsx` | All 7 status states render correctly |
| `ctrl_checks/src/__tests__/lazyWizard.test.tsx` | Wizard chunk not in initial load |
| `ctrl_checks/src/hooks/__tests__/useExecutionStatus.test.ts` | Polling + WS integration |
| `ctrl_checks/src/hooks/__tests__/useExecutionWebSocket.test.ts` | Reconnect backoff |

---

## Integration Tests

### Execution flow integration test

File: `worker/src/tests/integration/execution-flow.integration.test.ts`

```
Setup: Start app with ENABLE_EXECUTION_QUEUE=true and test Redis
Tests:
  ✓ POST /api/execute-workflow enqueues job, returns 202
  ✓ Worker picks up job, updates status to "running"
  ✓ Worker completes job, status becomes "success"
  ✓ Result data is stored in executions.result_data
  ✓ Redis event is published on status change
  ✓ GET /api/workflows/executions/:id returns correct status
  ✓ GET /api/workflows/:workflowId/executions returns list
```

### WebSocket Redis bridge integration test

File: `worker/src/tests/integration/ws-bridge.integration.test.ts`

```
Setup: Redis instance + two simulated WS connections
Tests:
  ✓ publishExecutionEvent() reaches WS client on same instance
  ✓ publishExecutionEvent() reaches WS client on different instance (via Redis sub)
  ✓ Authenticated client receives events
  ✓ Unauthenticated client is rejected
```

---

## UI Tests

### Bundle-size check

```bash
# In ctrl_checks/package.json scripts:
"size-check": "npm run build && npx bundlesize"
```

Thresholds:
- `dist/assets/index-*.js`: max 150KB gzipped
- `dist/assets/AutonomousAgentWizard-*.js`: max 600KB gzipped

### Component render tests

Run in Vitest with jsdom:
```
✓ ExecutionConsole renders "queued" state
✓ ExecutionConsole renders progress bar at 40%
✓ ExecutionConsole renders error message
✓ ExecutionStatusBanner shows retry button only on failure
✓ WizardLoadingSkeleton renders correctly
✓ WizardErrorBoundary shows recovery message on import failure
```

---

## Load Tests

### Tool: k6

Install: `npm install -g k6` or use Docker: `docker run grafana/k6`

Create: `tests/load/baseline.js`

```javascript
import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const p95Latency = new Trend('execute_p95');
const wsReconnects = new Counter('ws_reconnects');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp to 100 VU
    { duration: '5m', target: 500 },   // hold at 500 VU
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // p95 < 2 seconds
    http_req_failed: ['rate<0.01'],     // error rate < 1%
    execute_p95: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8088';
const TOKEN = __ENV.AUTH_TOKEN;       // Cognito JWT for test user

export default function() {
  // 1. Start workflow execution
  const res = http.post(`${BASE_URL}/api/execute-workflow`, JSON.stringify({
    workflowId: __ENV.TEST_WORKFLOW_ID,
    input: {},
  }), {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  });

  check(res, {
    'execute returns 202': (r) => r.status === 202,
    'executionId present': (r) => !!r.json('executionId'),
  });
  
  p95Latency.add(res.timings.duration);
  const executionId = res.json('executionId');

  // 2. Poll status until complete or timeout
  let attempts = 0;
  while (attempts < 20) {
    sleep(3);
    const statusRes = http.get(`${BASE_URL}/api/workflows/executions/${executionId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    check(statusRes, { 'status 200': (r) => r.status === 200 });
    const status = statusRes.json('status');
    if (status === 'success' || status === 'failed') break;
    attempts++;
  }

  sleep(1);
}
```

### Pass/Fail Thresholds

| Metric | Threshold |
|---|---|
| p95 latency (enqueue) | < 2000ms |
| Error rate | < 1% |
| DB connections (via PgBouncer stats) | < 50 server connections |
| Redis memory | < 100MB |
| Worker queue depth | < 200 pending jobs |
| Gemini rate-limit fallbacks | < 5% of requests |
| WebSocket reconnects | < 10 per minute |

---

## Smoke Tests

Create: `scripts/smoke-test.sh`

```bash
#!/bin/bash
set -e

BASE_URL=${BASE_URL:-http://localhost:8088}
TOKEN=${AUTH_TOKEN}

echo "=== CtrlChecks Smoke Tests ==="

# 1. Health check
HEALTH=$(curl -sf "$BASE_URL/api/health")
echo "✓ Health: $HEALTH"

# 2. Auth endpoint
AUTH_CHECK=$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/auth-status")
echo "✓ Auth: $AUTH_CHECK"

# 3. Workflow list
WORKFLOWS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/db/workflows")
echo "✓ Workflows: $(echo $WORKFLOWS | jq '.length') workflows"

# 4. Start execution (test workflow)
EXEC=$(curl -sf -X POST "$BASE_URL/api/execute-workflow" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"'$SMOKE_WORKFLOW_ID'","input":{}}')
EXEC_ID=$(echo $EXEC | jq -r '.executionId')
echo "✓ Execute: executionId=$EXEC_ID"

# 5. Check execution status
sleep 2
STATUS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/workflows/executions/$EXEC_ID")
echo "✓ Status: $(echo $STATUS | jq -r '.status')"

# 6. WebSocket check
python3 -c "import websocket; ws = websocket.create_connection('ws://localhost:3001/ws/executions?executionId=$EXEC_ID&token=$TOKEN'); print('✓ WebSocket: connected'); ws.close()"

echo "=== All smoke tests passed ==="
```

---

## Manual QA Checklist

Before each deploy:

- [ ] Start full Docker Compose stack locally
- [ ] Log in as test user
- [ ] Create a simple workflow (Gmail → Gemini → Slack)
- [ ] Trigger execution — verify 202 response and queued state in UI
- [ ] Watch live progress update in ExecutionConsole
- [ ] Verify success state and result displayed
- [ ] Disconnect network briefly — verify reconnecting state then resume
- [ ] Trigger with invalid credentials — verify failed state with error message
- [ ] Click cancel during running execution — verify cancelled
- [ ] Click retry — verify new execution starts
- [ ] Check Executions page shows correct status history
- [ ] Verify wizard loads via spinner (not inline with page)
- [ ] Check DevTools: Airtable, Notion SDKs not in initial network requests

---

## Mocking Strategy

| Service | Test mock |
|---|---|
| Gemini API | Mock `getGeminiKeyPool().getKey()` to return test key |
| AWS RDS | Test database (separate schema or test containers) |
| Redis | `ioredis-mock` for unit tests; real Redis for integration |
| WebSocket | `ws` mock or in-memory test server |
| AWS Cognito | Mock `aws-jwt-verify` to return fixed userId |

---

## CI Commands

Add to future CI pipeline (GitHub Actions):
```yaml
- name: Backend tests
  run: cd worker && npm test

- name: Frontend tests  
  run: cd ctrl_checks && npm run test:vitest

- name: Bundle size check
  run: cd ctrl_checks && npm run size-check

- name: Type check
  run: cd worker && npm run type-check
```
