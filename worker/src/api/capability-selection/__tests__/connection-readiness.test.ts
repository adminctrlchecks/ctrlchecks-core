/**
 * POST /api/capability-selection/connection-readiness
 *
 * Two properties this endpoint must hold, both of which it previously got wrong:
 *
 * 1. `credentialRequired` distinguishes "verified" from "nothing to verify". Without it the
 *    node-selection screen renders a credential-free node like manual_trigger as green
 *    "Connected", claiming an account link that does not exist.
 * 2. It fails CLOSED. The catch used to return `connected: true` for every node so as not to
 *    block the wizard — but those rows override the client's cheap check, so any exception
 *    silently disabled the gate and let un-connected nodes through to execution.
 */

import capabilityConnectionReadiness from '../connection-readiness';
import { getWorkflowConnectionReadiness } from '../../../services/workflow-connection-readiness';
import { credentialRequirementForNode } from '../../../services/credential-scope-registry';

jest.mock('../../../services/workflow-connection-readiness', () => ({
  getWorkflowConnectionReadiness: jest.fn(),
}));

jest.mock('../../../services/credential-scope-registry', () => ({
  credentialRequirementForNode: jest.fn(),
}));

jest.mock('../../../core/registry/unified-node-registry', () => ({
  unifiedNodeRegistry: { get: jest.fn(() => ({ label: 'Test Node' })) },
}));

jest.mock('../../../core/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const mockedReadiness = getWorkflowConnectionReadiness as jest.MockedFunction<
  typeof getWorkflowConnectionReadiness
>;
const mockedRequirement = credentialRequirementForNode as jest.MockedFunction<
  typeof credentialRequirementForNode
>;

function makeRes() {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(nodeTypes: string[]) {
  return { user: { id: 'user-1' }, body: { nodeTypes } } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedRequirement.mockReturnValue({ provider: 'slack', requiredScopes: [] });
});

describe('credentialRequired', () => {
  it('is false for a node with no readiness row — nothing to connect', async () => {
    mockedReadiness.mockResolvedValue({ rows: [] } as any);
    const res = makeRes();

    await capabilityConnectionReadiness(makeReq(['manual_trigger']), res);

    const body = res.json.mock.calls[0][0];
    expect(body.nodes[0].credentialRequired).toBe(false);
    expect(body.nodes[0].connected).toBe(true);
    expect(body.blocking).toEqual([]);
  });

  it('is true for a node that produced a readiness row', async () => {
    mockedReadiness.mockResolvedValue({
      rows: [
        {
          nodeId: 'slack',
          nodeType: 'slack',
          nodeLabel: 'Slack',
          status: 'ready',
          provider: 'slack',
          providerLabel: 'Slack',
        },
      ],
    } as any);
    const res = makeRes();

    await capabilityConnectionReadiness(makeReq(['slack']), res);

    const body = res.json.mock.calls[0][0];
    expect(body.nodes[0].credentialRequired).toBe(true);
    expect(body.nodes[0].connected).toBe(true);
  });

  it('reports a gated but unconnected node as blocking', async () => {
    mockedReadiness.mockResolvedValue({
      rows: [
        {
          nodeId: 'slack',
          nodeType: 'slack',
          nodeLabel: 'Slack',
          status: 'missing',
          provider: 'slack',
        },
      ],
    } as any);
    const res = makeRes();

    await capabilityConnectionReadiness(makeReq(['slack']), res);

    const body = res.json.mock.calls[0][0];
    expect(body.nodes[0].credentialRequired).toBe(true);
    expect(body.nodes[0].connected).toBe(false);
    expect(body.blocking).toEqual(['slack']);
    expect(body.ready).toBe(false);
  });
});

describe('fails closed when the check cannot complete', () => {
  it('blocks a credential-requiring node instead of reporting it connected', async () => {
    mockedReadiness.mockRejectedValue(new Error('vault unreachable'));
    mockedRequirement.mockReturnValue({ provider: 'slack', requiredScopes: [] });
    const res = makeRes();

    await capabilityConnectionReadiness(makeReq(['slack']), res);

    const body = res.json.mock.calls[0][0];
    expect(body.nodes[0].connected).toBe(false);
    expect(body.nodes[0].credentialRequired).toBe(true);
    expect(body.nodes[0].status).toBe('error');
    expect(body.blocking).toEqual(['slack']);
    expect(body.ready).toBe(false);
  });

  it('does not invent a requirement for a credential-free node', async () => {
    // A transport failure must not block the wizard on manual_trigger, which needs nothing.
    mockedReadiness.mockRejectedValue(new Error('vault unreachable'));
    mockedRequirement.mockReturnValue(null);
    const res = makeRes();

    await capabilityConnectionReadiness(makeReq(['manual_trigger']), res);

    const body = res.json.mock.calls[0][0];
    expect(body.nodes[0].connected).toBe(true);
    expect(body.nodes[0].credentialRequired).toBe(false);
    expect(body.blocking).toEqual([]);
    expect(body.ready).toBe(true);
  });
});
