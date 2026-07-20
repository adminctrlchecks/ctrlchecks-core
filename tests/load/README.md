# Load Tests

## Prerequisites

Install k6: https://k6.io/docs/get-started/installation/

```bash
# macOS
brew install k6

# Windows (choco)
choco install k6

# Docker
docker pull grafana/k6
```

## Running

```bash
# Against local stack (requires running docker-compose stack)
BASE_URL=http://localhost:3001 \
AUTH_TOKEN=<cognito-jwt> \
TEST_WORKFLOW_ID=<workflow-uuid> \
k6 run tests/load/baseline.js

# Via Docker
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:3001 \
  -e AUTH_TOKEN=<jwt> \
  -e TEST_WORKFLOW_ID=<uuid> \
  grafana/k6 run - < tests/load/baseline.js
```

## Pass/Fail Thresholds

| Metric | Threshold |
|---|---|
| p95 enqueue latency | < 2000ms |
| HTTP error rate | < 1% |
| `execute_p95` custom metric | < 2000ms |

The test fails (non-zero exit) if any threshold is breached.

## What the test does

1. Ramps from 0 → 100 virtual users over 2 minutes
2. Holds at 500 VUs for 5 minutes
3. Ramps back to 0 over 2 minutes
4. Each VU: POSTs to `/api/execute-workflow`, then polls `/api/execution-status/:id` until terminal or 60s timeout

## Interpreting results

- `http_req_duration` p95 > 2s: backend is slow under load — check DB connection pool and worker queue depth
- `http_req_failed` > 1%: check worker logs for errors (queue overflow, rate limits)
- High `ws_reconnects`: check Redis pub/sub bridge health
