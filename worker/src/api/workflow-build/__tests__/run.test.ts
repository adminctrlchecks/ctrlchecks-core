/**
 * POST /api/workflow-build/run (Phase 8) — chained first run.
 *
 * ⚠️ The headline property under test is **G1**: an `if_else` must fire exactly ONE
 * branch. A naive topological walk fires both, which in a real workflow means a real
 * email AND a real Slack message when only one should have gone.
 */

import type { Response } from 'express';
import runWorkflowBuild, { topologicalOrder } from '../run';
import { executeNode } from '../../execute-workflow';
import { __resetMemoryStore } from '../../../core/execution/build-run-state';

jest.mock('../../execute-workflow', () => ({ executeNode: jest.fn() }));
jest.mock('../../../core/database/db-client', () => ({ getDbClient: () => ({}) }));
jest.mock('../../../core/registry/unified-node-registry', () => ({
  unifiedNodeRegistry: { get: jest.fn(() => ({ label: 'node' })) },
}));

const mockedExecute = executeNode as jest.MockedFunction<typeof executeNode>;

function mockRes() {
  const lines: string[] = [];
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      lines.push(JSON.stringify(payload));
      return this;
    },
    write(chunk: string) {
      lines.push(chunk.trim());
      return true;
    },
    end() {},
  };
  return {
    res: res as unknown as Response,
    events: () => lines.filter(Boolean).map((l) => JSON.parse(l)),
    raw: res,
  };
}

const req = (body: Record<string, unknown>, userId: string | null = 'user-1') =>
  ({ user: userId ? { id: userId } : undefined, body }) as never;

const node = (id: string, type: string, config: Record<string, unknown> = {}) => ({
  id,
  type,
  data: { type, label: id, config },
});

beforeEach(() => {
  jest.clearAllMocks();
  __resetMemoryStore();
  mockedExecute.mockResolvedValue({ ok: true } as never);
});

describe('topologicalOrder', () => {
  it('orders a linear chain', () => {
    const nodes = [node('c', 'x'), node('a', 'x'), node('b', 'x')];
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ];
    expect(topologicalOrder(nodes, edges).map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps cycle members rather than dropping them', () => {
    const nodes = [node('a', 'x'), node('b', 'x')];
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
    ];
    expect(topologicalOrder(nodes, edges)).toHaveLength(2);
  });
});

describe('⚠️ G1 — exactly one branch of an if_else runs', () => {
  const nodes = [
    node('trigger', 'manual_trigger'),
    node('branch', 'if_else'),
    node('truePath', 'google_sheets', { operation: 'read' }),
    node('falsePath', 'google_sheets', { operation: 'read' }),
  ];
  const edges = [
    { source: 'trigger', target: 'branch' },
    { source: 'branch', target: 'truePath', sourceHandle: 'true' },
    { source: 'branch', target: 'falsePath', sourceHandle: 'false' },
  ];

  it('runs only the taken branch and marks the other not_exercised', async () => {
    (mockedExecute as unknown as { mockImplementation: (fn: (n: { id: string }) => Promise<unknown>) => void }).mockImplementation(async (n: { id: string }) => {
      const id = n.id;
      if (id === 'branch') return { condition: true } as never;
      return { ok: true, from: id } as never;
    });

    const { res, events } = mockRes();
    await runWorkflowBuild(req({ nodes, edges }), res);

    const executed = mockedExecute.mock.calls.map((c) => (c[0] as unknown as { id: string }).id);
    expect(executed).toContain('truePath');
    expect(executed).not.toContain('falsePath'); // the whole point

    const byNode = new Map(events().filter((e) => e.type === 'node').map((e) => [e.nodeId, e.status]));
    expect(byNode.get('truePath')).toBe('passed');
    expect(byNode.get('falsePath')).toBe('not_exercised');
  });

  it('runs the other branch when the condition is false', async () => {
    (mockedExecute as unknown as { mockImplementation: (fn: (n: { id: string }) => Promise<unknown>) => void }).mockImplementation(async (n: { id: string }) => {
      const id = n.id;
      if (id === 'branch') return { condition: false } as never;
      return { ok: true } as never;
    });

    const { res } = mockRes();
    await runWorkflowBuild(req({ nodes, edges }), res);

    const executed = mockedExecute.mock.calls.map((c) => (c[0] as unknown as { id: string }).id);
    expect(executed).toContain('falsePath');
    expect(executed).not.toContain('truePath');
  });

  it('does not let not_exercised block Continue', async () => {
    (mockedExecute as unknown as { mockImplementation: (fn: (n: { id: string }) => Promise<unknown>) => void }).mockImplementation(async (n: { id: string }) => {
      const id = n.id;
      if (id === 'branch') return { condition: true } as never;
      return { ok: true } as never;
    });

    const { res, events } = mockRes();
    await runWorkflowBuild(req({ nodes, edges }), res);

    const complete = events().find((e) => e.type === 'complete');
    expect(complete.canContinue).toBe(true);
    expect(complete.blocking).toEqual([]);
  });
});

describe('consent halts the chain', () => {
  const nodes = [node('t', 'manual_trigger'), node('send', 'google_gmail', { operation: 'send' })];
  const edges = [{ source: 't', target: 'send' }];

  it('stops before a write and never executes it', async () => {
    const { res, events } = mockRes();
    await runWorkflowBuild(req({ nodes, edges }), res);

    const executed = mockedExecute.mock.calls.map((c) => (c[0] as unknown as { id: string }).id);
    expect(executed).not.toContain('send');

    const awaiting = events().find((e) => e.type === 'awaiting_consent');
    expect(awaiting.nodeId).toBe('send');
    expect(awaiting.consentPrompt).toMatch(/for real/i);
    expect(events().some((e) => e.type === 'halted' && e.reason === 'awaiting_consent')).toBe(true);
  });

  it('proceeds once that node is in consentedNodeIds', async () => {
    const { res } = mockRes();
    await runWorkflowBuild(req({ nodes, edges, consentedNodeIds: ['send'] }), res);
    const executed = mockedExecute.mock.calls.map((c) => (c[0] as unknown as { id: string }).id);
    expect(executed).toContain('send');
  });
});

describe('failure handling', () => {
  it('halts on needs_attention rather than feeding a broken payload downstream', async () => {
    const nodes = [
      node('a', 'google_sheets', { operation: 'read' }),
      node('b', 'google_sheets', { operation: 'read' }),
    ];
    const edges = [{ source: 'a', target: 'b' }];

    (mockedExecute as unknown as { mockImplementation: (fn: (n: { id: string }) => Promise<unknown>) => void }).mockImplementation(async (n: { id: string }) => {
      const id = n.id;
      if (id === 'a') return { _error: 'Requested entity was not found.', _errorCode: 404 } as never;
      return { ok: true } as never;
    });

    const { res, events } = mockRes();
    await runWorkflowBuild(req({ nodes, edges }), res);

    const executed = mockedExecute.mock.calls.map((c) => (c[0] as unknown as { id: string }).id);
    expect(executed).not.toContain('b');

    const failing = events().find((e) => e.type === 'node' && e.status === 'needs_attention');
    expect(failing.guidance.field.fieldName).toBe('spreadsheetId');
    expect(failing.guidance.headline).not.toMatch(/failed/i);
  });
});

describe('fan-out cap in the chain (§2.3)', () => {
  it('passes exactly one record to the downstream node', async () => {
    const nodes = [
      node('read', 'google_sheets', { operation: 'read' }),
      node('next', 'google_sheets', { operation: 'read' }),
    ];
    const edges = [{ source: 'read', target: 'next' }];

    (mockedExecute as unknown as { mockImplementation: (fn: (n: { id: string }) => Promise<unknown>) => void }).mockImplementation(async (n: { id: string }) => {
      const id = n.id;
      if (id === 'read') {
        return { rows: Array.from({ length: 50 }, (_, i) => ({ id: i })) } as never;
      }
      return { ok: true } as never;
    });

    const { res } = mockRes();
    await runWorkflowBuild(req({ nodes, edges }), res);

    const downstreamCall = mockedExecute.mock.calls.find(
      (c) => (c[0] as unknown as { id: string }).id === 'next'
    );
    const input = downstreamCall?.[1] as { rows: unknown[] };
    expect(input.rows).toHaveLength(1);
  });
});

describe('streaming and auth', () => {
  it('streams NDJSON', async () => {
    const { res, raw } = mockRes();
    await runWorkflowBuild(req({ nodes: [node('a', 'manual_trigger')], edges: [] }), res);
    expect(raw.headers['Content-Type']).toBe('application/x-ndjson');
    expect(raw.headers['x-stream-progress']).toBe('true');
  });

  it('401s without a user', async () => {
    const { res, raw } = mockRes();
    await runWorkflowBuild(req({ nodes: [node('a', 'manual_trigger')] }, null), res);
    expect(raw.statusCode).toBe(401);
    expect(mockedExecute).not.toHaveBeenCalled();
  });
});
