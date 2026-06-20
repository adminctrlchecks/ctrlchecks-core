/**
 * T4 Live E2E Harness — runs real HTTP flows against http://127.0.0.1:3001
 *
 * Required env:
 *   LIVE_TEST_BEARER_TOKEN  — Cognito JWT for a dedicated test user (NOT main admin)
 *
 * Optional:
 *   LIVE_TEST_USER_ID       — override userId for cleanup (defaults to token sub)
 *   LIVE_E2E_BASE_URL       — defaults to http://127.0.0.1:3001
 *
 * All test artifacts are prefixed `live-test-` and deleted after the run.
 */

const BASE_URL = process.env.LIVE_E2E_BASE_URL ?? 'http://127.0.0.1:3001';
const TOKEN = process.env.LIVE_TEST_BEARER_TOKEN ?? '';

if (!TOKEN) {
  console.error('❌ LIVE_TEST_BEARER_TOKEN is required');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

interface StepResult {
  step: string;
  pass: boolean;
  detail?: string;
}

const results: StepResult[] = [];
let createdWorkflowId: string | null = null;

function log(step: string, pass: boolean, detail?: string) {
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${step}${detail ? ` — ${detail}` : ''}`);
  results.push({ step, pass, detail });
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function get(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function del(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function run() {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  T4 Live E2E Harness`);
  console.log(`  Base: ${BASE_URL}`);
  console.log(`${'═'.repeat(50)}\n`);

  // ── Step 1: Health ─────────────────────────────────────────────────────────
  const health = await get('/health/ready');
  log('Step 1: /health/ready', health.status === 200 && (health.body as any)?.status === 'ready',
    `status=${health.status}`);

  // ── Step 2: Save minimal workflow ──────────────────────────────────────────
  const minimalWorkflow = {
    nodes: [
      { id: 'node_1', type: 'manual_trigger', position: { x: 100, y: 100 }, data: { type: 'manual_trigger', label: 'Manual Trigger', config: {} } },
      { id: 'node_2', type: 'log_output', position: { x: 300, y: 100 }, data: { type: 'log_output', label: 'Log Output', config: { message: 'live-test-ok' } } },
    ],
    edges: [{ id: 'e1', source: 'node_1', target: 'node_2' }],
  };

  const saveRes = await post('/api/save-workflow', {
    workflow: { ...minimalWorkflow, name: 'live-test-harness', trigger: 'manual' },
  });
  const savedId = (saveRes.body as any)?.workflow?.id ?? (saveRes.body as any)?.id;
  const saveOk = saveRes.status === 200 && !!savedId;
  log('Step 2: POST /api/save-workflow', saveOk,
    `status=${saveRes.status} id=${savedId ?? 'none'}`);
  if (saveOk) createdWorkflowId = savedId;

  // ── Step 3: Execute workflow ───────────────────────────────────────────────
  if (createdWorkflowId) {
    const execRes = await post('/api/execute-workflow', {
      workflowId: createdWorkflowId,
      input: { _trigger: 'live-test' },
    });
    const execId = (execRes.body as any)?.executionId;
    const execOk = [200, 202].includes(execRes.status);
    log('Step 3: POST /api/execute-workflow', execOk,
      `status=${execRes.status} executionId=${execId ?? 'none'}`);

    // ── Step 3b: Poll until terminal ──────────────────────────────────────
    if (execOk && execId) {
      let terminalStatus = '';
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const poll = await get(`/api/execution-status/${execId}`);
        const status = (poll.body as any)?.status ?? '';
        if (['success', 'failed', 'completed', 'error'].includes(status)) {
          terminalStatus = status;
          break;
        }
      }
      log('Step 3b: execution reaches terminal status', terminalStatus === 'success',
        `terminal=${terminalStatus || 'timeout'}`);
    }
  } else {
    log('Step 3: POST /api/execute-workflow', false, 'skipped — no workflow ID from step 2');
    log('Step 3b: execution terminal status', false, 'skipped');
  }

  // ── Step 4: Check delegation metrics ──────────────────────────────────────
  const metrics = await fetch(`${BASE_URL}/metrics`, { headers }).then(r => r.text()).catch(() => '');
  const crudHit = /workflow_crud_delegation_total\{result="hit"\}/.test(metrics);
  log('Step 4: workflow-crud delegation metric present', crudHit,
    crudHit ? 'hit counter found' : 'no hit counter — possible if write went to local path');

  // ── Step 5: Cleanup ────────────────────────────────────────────────────────
  if (createdWorkflowId) {
    const delRes = await del(`/api/workflows/${createdWorkflowId}`);
    log('Step 5: DELETE test workflow', [200, 204].includes(delRes.status),
      `status=${delRes.status}`);
  } else {
    log('Step 5: DELETE test workflow', true, 'skipped — nothing to clean up');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(50)}`);
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`  T4 Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(50)}\n`);

  if (failed > 0) {
    console.log('Failed steps:');
    results.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.step}: ${r.detail ?? ''}`));
    process.exit(1);
  }

  console.log('✅ T4 Live E2E PASS');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ T4 harness crashed:', err);
  process.exit(1);
});
