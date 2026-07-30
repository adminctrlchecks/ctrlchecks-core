/**
 * POST /api/capability-selection/connection-status
 *
 * The fast, presence-only check that lets the node-selection screen paint the right chip for
 * EVERY candidate on first render, instead of showing "Connect" for a service the user
 * connected weeks ago.
 *
 * The property that matters most here is what it must NOT do: it must never resolve or
 * refresh a credential. That is why it can be called across the whole candidate list, while
 * `/connection-readiness` stays restricted to selected nodes.
 */

import capabilityConnectionStatus from '../connection-status';
import { listCanonicalConnections } from '../../../services/canonical-credential-lookup';
import { credentialRequirementForNode } from '../../../services/credential-scope-registry';

jest.mock('../../../services/canonical-credential-lookup', () => ({
  listCanonicalConnections: jest.fn(),
  canonicalProvider: (p: string) => String(p || '').toLowerCase(),
}));

jest.mock('../../../services/credential-scope-registry', () => ({
  credentialRequirementForNode: jest.fn(),
}));

jest.mock('../../../core/registry/unified-node-registry', () => ({
  unifiedNodeRegistry: { get: jest.fn((t: string) => ({ label: `Label:${t}` })) },
}));

jest.mock('../../../core/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const mockedList = listCanonicalConnections as jest.MockedFunction<typeof listCanonicalConnections>;
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

function connection(provider: string, over: Record<string, unknown> = {}) {
  return { provider, status: 'active', authType: 'oauth2', expiresAt: null, ...over } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockResolvedValue({ connections: [], source: 'connections' } as any);
});

describe('connection status', () => {
  it('reports a node as connected when an active connection exists for its provider', async () => {
    mockedRequirement.mockReturnValue({ provider: 'google', requiredScopes: [] });
    mockedList.mockResolvedValue({
      connections: [connection('google')],
      source: 'connections',
    } as any);
    const res = makeRes();

    await capabilityConnectionStatus(makeReq(['google_sheets']), res);

    const body = res.json.mock.calls[0][0];
    expect(body.nodes[0]).toMatchObject({
      nodeType: 'google_sheets',
      credentialRequired: true,
      connected: true,
      provider: 'google',
    });
  });

  it('reports a node as unconnected when the user has no connection for its provider', async () => {
    mockedRequirement.mockReturnValue({ provider: 'slack', requiredScopes: [] });
    const res = makeRes();

    await capabilityConnectionStatus(makeReq(['slack_message']), res);

    expect(res.json.mock.calls[0][0].nodes[0]).toMatchObject({
      credentialRequired: true,
      connected: false,
    });
  });

  it('never claims a credential-free node is "connected to" anything', async () => {
    mockedRequirement.mockReturnValue(null);
    const res = makeRes();

    await capabilityConnectionStatus(makeReq(['manual_trigger']), res);

    expect(res.json.mock.calls[0][0].nodes[0]).toMatchObject({
      credentialRequired: false,
      connected: true,
    });
  });

  it('ignores revoked and expired connections', async () => {
    mockedRequirement.mockReturnValue({ provider: 'google', requiredScopes: [] });
    mockedList.mockResolvedValue({
      connections: [
        connection('google', { status: 'revoked' }),
        connection('google', { expiresAt: new Date(Date.now() - 60_000).toISOString() }),
      ],
      source: 'connections',
    } as any);
    const res = makeRes();

    await capabilityConnectionStatus(makeReq(['google_sheets']), res);

    expect(res.json.mock.calls[0][0].nodes[0].connected).toBe(false);
  });

  it('reads the connection list once regardless of how many nodes are asked about', async () => {
    mockedRequirement.mockReturnValue({ provider: 'google', requiredScopes: [] });
    const res = makeRes();

    await capabilityConnectionStatus(
      makeReq(['google_sheets', 'google_doc', 'google_gmail', 'google_drive']),
      res,
    );

    // One read for the whole screen — this is what makes it safe to call across every
    // candidate rather than only the selected ones.
    expect(mockedList).toHaveBeenCalledTimes(1);
    expect(res.json.mock.calls[0][0].nodes).toHaveLength(4);
  });

  it('never claims a connection it could not verify', async () => {
    mockedRequirement.mockReturnValue({ provider: 'google', requiredScopes: [] });
    mockedList.mockRejectedValue(new Error('db unreachable'));
    const res = makeRes();

    await capabilityConnectionStatus(makeReq(['google_sheets']), res);

    const node = res.json.mock.calls[0][0].nodes[0];
    expect(node.credentialRequired).toBe(true);
    // A false "Connected" is unrecoverable for the user; an extra Connect prompt is not.
    expect(node.connected).toBe(false);
  });

  it('rejects an unauthenticated request', async () => {
    const res = makeRes();
    await capabilityConnectionStatus({ body: { nodeTypes: ['slack'] } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
