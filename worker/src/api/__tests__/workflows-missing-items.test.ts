/**
 * Tests for GET /api/workflows/:workflowId/missing-items
 *
 * Verifies the endpoint keeps the legacy `credentials` array (derived from
 * the scope-aware readiness service for OAuth providers) while also returning
 * the new `connectionReadiness` envelope.
 */

import getMissingItemsHandler from '../workflows-missing-items';

jest.mock('../../services/ai/credential-input-discovery', () => ({
  getUnifiedMissingItems: jest.fn(),
}));

jest.mock('../../services/workflow-connection-readiness', () => ({
  getWorkflowConnectionReadiness: jest.fn(),
  canonicalProvider: (provider: string) => provider.trim().toLowerCase(),
}));

jest.mock('../../core/database/aws-db-client', () => ({
  getDbClient: jest.fn(),
}));

jest.mock('../../core/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { getUnifiedMissingItems } = jest.requireMock('../../services/ai/credential-input-discovery') as {
  getUnifiedMissingItems: jest.Mock;
};
const { getWorkflowConnectionReadiness } = jest.requireMock('../../services/workflow-connection-readiness') as {
  getWorkflowConnectionReadiness: jest.Mock;
};
const { getDbClient } = jest.requireMock('../../core/database/aws-db-client') as {
  getDbClient: jest.Mock;
};

const GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';

function makeRes() {
  const res: any = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
  return res;
}

function makeReq() {
  return {
    params: { workflowId: 'wf-1' },
    headers: { authorization: 'Bearer token-abc' },
  } as any;
}

function makeReadinessRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    workflowId: 'wf-1',
    nodeId: 'n1',
    nodeType: 'google_gmail',
    nodeLabel: 'Send Email',
    provider: 'google',
    credentialTypeId: 'google_oauth2',
    authType: 'oauth2',
    requiredScopes: [GMAIL_SEND],
    status: 'ready',
    source: 'unified_credentials',
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockDb(nodes: unknown[] = [{ id: 'n1', data: { type: 'google_gmail', label: 'Send Email' } }]) {
  getDbClient.mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { nodes, graph: null } }),
        }),
      }),
    }),
  });
}

function baseMissingItems() {
  return {
    credentials: [
      {
        provider: 'google',
        type: 'oauth',
        nodes: ['n1'],
        fields: [],
        displayName: 'Google',
        vaultKey: 'google',
        satisfied: false,
      },
      {
        provider: 'openai',
        type: 'api_key',
        nodes: ['n2'],
        fields: ['apiKey'],
        displayName: 'OpenAI',
        vaultKey: 'openai',
        satisfied: false,
      },
    ],
    inputs: [],
    display: {
      summary: { missingCredentialCount: 2, missingInputCount: 0 },
      inputsByNode: [],
    },
  };
}

describe('getMissingItemsHandler', () => {
  beforeEach(() => {
    getUnifiedMissingItems.mockReset();
    getWorkflowConnectionReadiness.mockReset();
    getDbClient.mockReset();
  });

  it('returns legacy credentials plus the new connectionReadiness envelope', async () => {
    mockDb();
    getUnifiedMissingItems.mockResolvedValue(baseMissingItems());
    const readiness = {
      workflowId: 'wf-1',
      ready: true,
      rows: [makeReadinessRow()],
      missing: [],
      summary: { requiredCount: 1, readyCount: 1, missingCount: 0, missingScopeCount: 0, expiredCount: 0 },
    };
    getWorkflowConnectionReadiness.mockResolvedValue(readiness);

    const res = makeRes();
    await getMissingItemsHandler(makeReq(), res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.connectionReadiness).toEqual(readiness);

    // Readiness says google is ready → legacy google row flips to satisfied
    const google = body.credentials.find((c: any) => c.provider === 'google');
    expect(google).toBeDefined();
    expect(google.satisfied).toBe(true);

    // Non-readiness providers pass through untouched
    const openai = body.credentials.find((c: any) => c.provider === 'openai');
    expect(openai).toBeDefined();
    expect(openai.satisfied).toBe(false);

    expect(body.display.summary.missingCredentialCount).toBe(1);
  });

  it('derives a missing legacy credential row from a missing_scope readiness row', async () => {
    mockDb();
    const items = baseMissingItems();
    // Discovery thought google was satisfied — readiness must override it
    items.credentials[0].satisfied = true;
    getUnifiedMissingItems.mockResolvedValue(items);

    const missingRow = makeReadinessRow({
      status: 'missing_scope',
      availableScopes: ['https://www.googleapis.com/auth/spreadsheets'],
      reason: 'Connected google account is missing required permission(s)',
    });
    getWorkflowConnectionReadiness.mockResolvedValue({
      workflowId: 'wf-1',
      ready: false,
      rows: [missingRow],
      missing: [missingRow],
      summary: { requiredCount: 1, readyCount: 0, missingCount: 1, missingScopeCount: 1, expiredCount: 0 },
    });

    const res = makeRes();
    await getMissingItemsHandler(makeReq(), res);

    const body = res.json.mock.calls[0][0];
    const google = body.credentials.find((c: any) => c.provider === 'google');
    expect(google.satisfied).toBe(false);
    expect(google.nodes).toEqual(['n1']);
    expect(google.scopes).toContain(GMAIL_SEND);
    expect(body.connectionReadiness.missing[0].status).toBe('missing_scope');
    expect(body.display.summary.missingCredentialCount).toBe(2);
  });

  it('falls back to discovery-only results when readiness fails', async () => {
    mockDb();
    getUnifiedMissingItems.mockResolvedValue(baseMissingItems());
    getWorkflowConnectionReadiness.mockRejectedValue(new Error('boom'));

    const res = makeRes();
    await getMissingItemsHandler(makeReq(), res);

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.connectionReadiness).toBeUndefined();
    expect(body.credentials).toHaveLength(2);
  });

  it('skips readiness for anonymous requests', async () => {
    getDbClient.mockReturnValue({
      auth: { getUser: jest.fn() },
      from: jest.fn(),
    });
    getUnifiedMissingItems.mockResolvedValue(baseMissingItems());

    const res = makeRes();
    await getMissingItemsHandler({ params: { workflowId: 'wf-1' }, headers: {} } as any, res);

    expect(getWorkflowConnectionReadiness).not.toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.connectionReadiness).toBeUndefined();
  });
});
