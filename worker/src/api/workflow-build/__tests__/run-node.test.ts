/**
 * POST /api/workflow-build/run-node (Phase 7b).
 *
 * ⚠️ This endpoint performs REAL external operations. The single most important
 * property under test is that `executeNode` is NOT reached unless the user consented
 * to a write, and never at all for a destructive node without explicit consent.
 *
 * `executeNode` is mocked here, so these tests assert the *gate*, not the side effect.
 */

import type { Response } from 'express';
import runNode from '../run-node';
import { executeNode } from '../../execute-workflow';
import { __resetMemoryStore } from '../../../core/execution/build-run-state';

jest.mock('../../execute-workflow', () => ({ executeNode: jest.fn() }));
jest.mock('../../../core/database/db-client', () => ({ getDbClient: () => ({}) }));
jest.mock('../../../core/registry/unified-node-registry', () => ({
  unifiedNodeRegistry: {
    get: jest.fn((type: string) => (type === 'unknown_node' ? undefined : { label: type })),
  },
}));

const mockedExecute = executeNode as jest.MockedFunction<typeof executeNode>;

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: any };
}

function req(body: Record<string, unknown>, userId: string | null = 'user-1') {
  return { user: userId ? { id: userId } : undefined, body } as never;
}

const sheetsNode = {
  id: 'n1',
  type: 'google_sheets',
  data: { type: 'google_sheets', label: 'Read Sheet', config: { operation: 'read' } },
};
const slackNode = {
  id: 'n2',
  type: 'slack',
  data: { type: 'slack', label: 'Post to Slack', config: { operation: 'send', channel: '#alerts' } },
};
const deleteNode = {
  id: 'n3',
  type: 'db',
  data: { type: 'db', label: 'Delete Rows', config: { operation: 'delete' } },
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetMemoryStore();
  mockedExecute.mockResolvedValue({ rows: [{ id: 1 }] } as never);
});

describe('⚠️ consent gate — the guard on real side effects', () => {
  it('NEVER calls executeNode for a write without consent', async () => {
    const res = mockRes();
    await runNode(req({ nodes: [slackNode], edges: [], nodeId: 'n2' }), res);

    expect(mockedExecute).not.toHaveBeenCalled();
    expect(res.body.status).toBe('awaiting_consent');
    expect(res.body.firstRunClass).toBe('write');
  });

  it('NEVER calls executeNode for a destructive node without consent', async () => {
    const res = mockRes();
    await runNode(req({ nodes: [deleteNode], edges: [], nodeId: 'n3' }), res);

    expect(mockedExecute).not.toHaveBeenCalled();
    expect(res.body.status).toBe('awaiting_consent');
    expect(res.body.firstRunClass).toBe('destructive');
    expect(res.body.requiresStrongConfirmation).toBe(true);
  });

  it('rejects truthy-but-not-true consent, so a loose body cannot authorise a send', async () => {
    for (const sloppy of ['true', 'yes', 1, {}]) {
      jest.clearAllMocks();
      const res = mockRes();
      await runNode(req({ nodes: [slackNode], edges: [], nodeId: 'n2', consented: sloppy }), res);
      expect(mockedExecute).not.toHaveBeenCalled();
      expect(res.body.status).toBe('awaiting_consent');
    }
  });

  it('executes a write once consent is exactly true', async () => {
    const res = mockRes();
    await runNode(req({ nodes: [slackNode], edges: [], nodeId: 'n2', consented: true }), res);

    expect(mockedExecute).toHaveBeenCalledTimes(1);
    expect(res.body.status).toBe('passed');
  });

  it('auto-runs a read without any consent', async () => {
    const res = mockRes();
    await runNode(req({ nodes: [sheetsNode], edges: [], nodeId: 'n1' }), res);

    expect(mockedExecute).toHaveBeenCalledTimes(1);
    expect(res.body.status).toBe('passed');
    expect(res.body.firstRunClass).toBe('read');
  });

  it('names the real effect and target in the consent prompt', async () => {
    const res = mockRes();
    await runNode(req({ nodes: [slackNode], edges: [], nodeId: 'n2' }), res);
    expect(res.body.consentPrompt).toContain('Post to Slack');
    expect(res.body.consentPrompt).toContain('#alerts');
    expect(res.body.consentPrompt).toMatch(/not a rehearsal/i);
  });

  it('warns that a destructive run cannot be undone', async () => {
    const res = mockRes();
    await runNode(req({ nodes: [deleteNode], edges: [], nodeId: 'n3' }), res);
    expect(res.body.consentPrompt).toMatch(/cannot be undone/i);
  });
});

describe('auth and ownership (G5)', () => {
  it('401s without a user', async () => {
    const res = mockRes();
    await runNode(req({ nodes: [sheetsNode], nodeId: 'n1' }, null), res);
    expect(res.statusCode).toBe(401);
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('403s when another user targets an existing build', async () => {
    const first = mockRes();
    await runNode(req({ nodes: [sheetsNode], edges: [], nodeId: 'n1' }), first);
    const buildId = first.body.buildId;

    const res = mockRes();
    await runNode(req({ buildId, nodeId: 'n1' }, 'attacker'), res);
    expect(res.statusCode).toBe(403);
  });
});

describe('idempotency (G3)', () => {
  it('does not re-execute an unchanged, already-passed node', async () => {
    const first = mockRes();
    await runNode(req({ nodes: [sheetsNode], edges: [], nodeId: 'n1' }), first);
    expect(mockedExecute).toHaveBeenCalledTimes(1);

    const second = mockRes();
    await runNode(
      req({ buildId: first.body.buildId, nodes: [sheetsNode], edges: [], nodeId: 'n1' }),
      second
    );
    expect(mockedExecute).toHaveBeenCalledTimes(1); // still one
    expect(second.body.deduped).toBe(true);
    expect(second.body.status).toBe('passed');
  });

  it('re-executes after the config changes (G2 invalidation)', async () => {
    const first = mockRes();
    await runNode(req({ nodes: [sheetsNode], edges: [], nodeId: 'n1' }), first);

    const edited = {
      ...sheetsNode,
      data: { ...sheetsNode.data, config: { operation: 'read', range: 'A1:B2' } },
    };
    const second = mockRes();
    await runNode(
      req({ buildId: first.body.buildId, nodes: [edited], edges: [], nodeId: 'n1' }),
      second
    );
    expect(mockedExecute).toHaveBeenCalledTimes(2);
    expect(second.body.deduped).toBeUndefined();
  });
});

describe('fan-out cap (§2.3)', () => {
  it('feeds exactly one record downstream from a 500-row read', async () => {
    mockedExecute.mockResolvedValue({
      rows: Array.from({ length: 500 }, (_, i) => ({ id: i })),
    } as never);

    const res = mockRes();
    await runNode(req({ nodes: [sheetsNode], edges: [], nodeId: 'n1' }), res);

    expect(res.body.output.rows).toHaveLength(1);
    expect(res.body.samplingNote).toBe(
      'Ran with 1 of 500 — the full set runs when you execute the workflow.'
    );
  });

  it('says nothing about sampling when there was nothing to cap', async () => {
    mockedExecute.mockResolvedValue({ rows: [{ id: 1 }] } as never);
    const res = mockRes();
    await runNode(req({ nodes: [sheetsNode], edges: [], nodeId: 'n1' }), res);
    expect(res.body.samplingNote).toBeUndefined();
  });
});

describe('failure → guidance, never a raw error (§2.2)', () => {
  it('returns needs_attention with field-level guidance', async () => {
    mockedExecute.mockResolvedValue({
      _error: 'Slack API error: 404 Not Found - channel_not_found',
      _nodeType: 'slack',
    } as never);

    const res = mockRes();
    await runNode(req({ nodes: [slackNode], edges: [], nodeId: 'n2', consented: true }), res);

    expect(res.body.status).toBe('needs_attention');
    expect(res.body.guidance.field.fieldName).toBe('channel');
    expect(res.body.guidance.headline).not.toMatch(/failed/i);
  });

  it('turns a thrown exception into guidance rather than a 500', async () => {
    mockedExecute.mockRejectedValue(new Error('socket hang up'));
    const res = mockRes();
    await runNode(req({ nodes: [sheetsNode], edges: [], nodeId: 'n1' }), res);

    expect(res.body.status).toBe('needs_attention');
    expect(res.body.guidance.severity).toBe('needs_attention');
    expect(res.body.guidance.technicalDetail).toContain('socket hang up');
  });

  it('never uses the word "failed" in the status vocabulary', async () => {
    mockedExecute.mockRejectedValue(new Error('boom'));
    const res = mockRes();
    await runNode(req({ nodes: [sheetsNode], edges: [], nodeId: 'n1' }), res);
    expect(JSON.stringify(res.body)).not.toMatch(/"status":"failed"/);
  });
});

describe('request validation', () => {
  it('400s without a nodeId', async () => {
    const res = mockRes();
    await runNode(req({ nodes: [sheetsNode] }), res);
    expect(res.statusCode).toBe(400);
  });

  it('404s for a node outside the build', async () => {
    const res = mockRes();
    await runNode(req({ nodes: [sheetsNode], edges: [], nodeId: 'nope' }), res);
    expect(res.statusCode).toBe(404);
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('400s for an unknown node type', async () => {
    const res = mockRes();
    await runNode(
      req({ nodes: [{ id: 'x', type: 'unknown_node', data: {} }], edges: [], nodeId: 'x' }),
      res
    );
    expect(res.statusCode).toBe(400);
    expect(mockedExecute).not.toHaveBeenCalled();
  });
});
