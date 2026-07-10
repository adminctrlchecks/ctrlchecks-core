import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const p95Latency = new Trend('execute_p95');
const wsReconnects = new Counter('ws_reconnects');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // ramp to 100 VU
    { duration: '5m', target: 500 },  // hold at 500 VU
    { duration: '2m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    execute_p95: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  // 1. Start workflow execution
  const res = http.post(
    `${BASE_URL}/api/execute-workflow`,
    JSON.stringify({
      workflowId: __ENV.TEST_WORKFLOW_ID,
      input: {},
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );

  check(res, {
    'execute returns 202': (r) => r.status === 202,
    'executionId present': (r) => !!r.json('executionId'),
  });

  p95Latency.add(res.timings.duration);
  const executionId = res.json('executionId');
  if (!executionId) {
    sleep(1);
    return;
  }

  // 2. Poll until complete or 60 seconds elapsed
  let attempts = 0;
  while (attempts < 20) {
    sleep(3);
    const statusRes = http.get(
      `${BASE_URL}/api/execution-status/${executionId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    check(statusRes, { 'status poll 200': (r) => r.status === 200 });
    const status = statusRes.json('status');
    if (status === 'success' || status === 'failed' || status === 'error') break;
    attempts++;
  }

  sleep(1);
}
