/**
 * Tests for the scope-aware workflow connection readiness service.
 *
 * Covers the "Active but Not connected" contradiction: a saved `connections`
 * row can exist while the runtime `unified_credentials` store is missing,
 * scope-limited, or expired.
 */

import {
  getWorkflowConnectionReadiness,
  canonicalProvider,
  canonicalCredentialTypeId,
} from '../workflow-connection-readiness';
import {
  CredentialExpiredError,
  CredentialMissingScopeError,
  CredentialNotFoundError,
} from '../credential-errors';

jest.mock('../credential-resolver', () => ({
  resolveCredentialDryRun: jest.fn(),
}));

jest.mock('../canonical-credential-lookup', () => ({
  canonicalProvider: (provider: string) => {
    const key = provider.trim().toLowerCase();
    if (key === 'gmail' || key === 'google_gmail') return 'google';
    return key;
  },
  canonicalCredentialTypeId: (value: string) => {
    const key = value.trim().toLowerCase().replace(/\s+/g, ' ');
    if (key === 'google_oauth' || key === 'google oauth') return 'google_oauth2';
    return key.replace(/\s+/g, '_');
  },
  listCanonicalConnectionsByProvider: jest.fn(),
  getDecryptedConnection: jest.fn(),
}));

jest.mock('../../core/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { resolveCredentialDryRun } = jest.requireMock('../credential-resolver') as {
  resolveCredentialDryRun: jest.Mock;
};
const { listCanonicalConnectionsByProvider, getDecryptedConnection } = jest.requireMock('../canonical-credential-lookup') as {
  listCanonicalConnectionsByProvider: jest.Mock;
  getDecryptedConnection: jest.Mock;
};

const GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';
const SHEETS_WRITE = 'https://www.googleapis.com/auth/spreadsheets';
const CONN_UUID = '11111111-1111-4111-8111-111111111111';

const gmailNode = {
  id: 'n1',
  type: 'custom',
  data: { type: 'google_gmail', label: 'Send Email' },
};

const supabaseNode = {
  id: 'supabase-1',
  type: 'custom',
  data: { type: 'supabase', label: 'Query Supabase' },
};

const sheetsAppendNode = {
  id: 'sheets-1',
  type: 'custom',
  data: { type: 'google_sheets', label: 'Append Row', config: { operation: 'append' } },
};

const baseInput = {
  workflowId: 'wf-1',
  userId: 'user-1',
  nodes: [gmailNode],
};

const notFoundContext = { userId: 'user-1', provider: 'google', requiredScopes: [GMAIL_SEND] };

function mockActiveGoogleConnection() {
  listCanonicalConnectionsByProvider.mockResolvedValue({
    connections: [{ id: 'conn-1', name: 'Google', provider: 'google', authType: 'oauth2', status: 'active' }],
    source: 'connections',
  });
}

describe('canonical mapping', () => {
  it('maps provider aliases to canonical providers', () => {
    expect(canonicalProvider('gmail')).toBe('google');
    expect(canonicalProvider('google_gmail')).toBe('google');
    expect(canonicalProvider('Google')).toBe('google');
  });

  it('maps credential type aliases to canonical ids', () => {
    expect(canonicalCredentialTypeId('google_oauth')).toBe('google_oauth2');
    expect(canonicalCredentialTypeId('Google OAuth')).toBe('google_oauth2');
    expect(canonicalCredentialTypeId('google_oauth2')).toBe('google_oauth2');
  });
});

describe('getWorkflowConnectionReadiness', () => {
  beforeEach(() => {
    resolveCredentialDryRun.mockReset();
    listCanonicalConnectionsByProvider.mockReset();
    listCanonicalConnectionsByProvider.mockResolvedValue({ connections: [], source: 'connections' });
    getDecryptedConnection.mockReset();
    getDecryptedConnection.mockResolvedValue(null);
  });

  it('reports missing when a connections row is active but unified_credentials has no row', async () => {
    resolveCredentialDryRun.mockRejectedValue(new CredentialNotFoundError(notFoundContext));
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [{
        id: 'conn-1',
        name: 'Google',
        provider: 'google',
        authType: 'oauth2',
        status: 'active',
      }],
      source: 'connections',
    });

    const result = await getWorkflowConnectionReadiness(baseInput);

    expect(result.ready).toBe(false);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.status).toBe('runtime_missing');
    expect(row.provider).toBe('google');
    expect(row.credentialTypeId).toBe('google_oauth2');
    expect(row.connectionId).toBe('conn-1');
    expect(row.source).toBe('connections');
    expect(row.reason).toMatch(/reconnect/i);
    expect(result.summary).toEqual({
      requiredCount: 1,
      readyCount: 0,
      missingCount: 0,
      invalidRefCount: 0,
      runtimeMissingCount: 1,
      missingScopeCount: 0,
      expiredCount: 0,
      revokedCount: 0,
      errorCount: 0,
    });
  });

  it('reports missing_scope when the Google credential lacks gmail.send', async () => {
    mockActiveGoogleConnection();
    const availableScopes = ['https://www.googleapis.com/auth/spreadsheets'];
    resolveCredentialDryRun.mockRejectedValue(
      new CredentialMissingScopeError(notFoundContext, availableScopes),
    );

    const result = await getWorkflowConnectionReadiness(baseInput);

    expect(result.ready).toBe(false);
    const row = result.rows[0];
    expect(row.status).toBe('missing_scope');
    expect(row.requiredScopes).toContain(GMAIL_SEND);
    expect(row.availableScopes).toEqual(availableScopes);
    expect(row.reason).toContain('gmail.send');
    expect(result.summary.missingScopeCount).toBe(1);
  });

  it('reports ready when the Google credential covers gmail.send', async () => {
    resolveCredentialDryRun.mockResolvedValue({
      id: 'cred-1',
      userId: 'user-1',
      provider: 'google',
      scopes: [GMAIL_SEND],
      expiresAt: null,
      source: 'oauth_callback',
    });
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [{ id: 'conn-1', name: 'Google', provider: 'google', authType: 'oauth2', status: 'active' }],
      source: 'connections',
    });

    const result = await getWorkflowConnectionReadiness(baseInput);

    expect(result.ready).toBe(true);
    expect(result.missing).toHaveLength(0);
    const row = result.rows[0];
    expect(row.status).toBe('ready');
    expect(row.credentialId).toBe('cred-1');
    expect(row.connectionId).toBe('conn-1');
    expect(row.source).toBe('unified_credentials');
    expect(row.availableScopes).toEqual([GMAIL_SEND]);
    expect(resolveCredentialDryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: 'google',
        requiredScopes: [GMAIL_SEND],
      }),
    );
  });

  it('checks the union of provider operation requirements for all rows in the workflow', async () => {
    resolveCredentialDryRun.mockResolvedValue({
      id: 'cred-union',
      userId: 'user-1',
      provider: 'google',
      scopes: [GMAIL_SEND, SHEETS_WRITE],
      expiresAt: null,
      source: 'oauth_callback',
    });
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [{ id: 'conn-1', name: 'Google', provider: 'google', authType: 'oauth2', status: 'active' }],
      source: 'connections',
    });

    const result = await getWorkflowConnectionReadiness({
      workflowId: 'wf-1',
      userId: 'user-1',
      nodes: [gmailNode, sheetsAppendNode],
    });

    expect(result.ready).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((row) => row.status)).toEqual(['ready', 'ready']);
    expect(result.rows.find((row) => row.nodeId === 'n1')?.requiredScopes).toEqual([GMAIL_SEND]);
    expect(result.rows.find((row) => row.nodeId === 'sheets-1')?.requiredScopes).toEqual([SHEETS_WRITE]);
    expect(resolveCredentialDryRun).toHaveBeenCalledTimes(1);
    expect(resolveCredentialDryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: 'google',
        requiredScopes: expect.arrayContaining([GMAIL_SEND, SHEETS_WRITE]),
      }),
    );
  });

  it('reports ready for Supabase when an active local connection exists', async () => {
    resolveCredentialDryRun.mockRejectedValue(
      new CredentialNotFoundError({ userId: 'user-1', provider: 'supabase', requiredScopes: [] }),
    );
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [{ id: 'supabase-local', name: 'Supabase', provider: 'supabase', authType: 'api_key', status: 'active' }],
      source: 'connections',
    });

    const result = await getWorkflowConnectionReadiness({
      workflowId: 'wf-1',
      userId: 'user-1',
      nodes: [supabaseNode],
    });

    expect(result.ready).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.rows[0]).toMatchObject({
      provider: 'supabase',
      credentialTypeId: 'supabase_api_key',
      connectionId: 'supabase-local',
      credentialId: 'supabase-local',
      source: 'connections',
      status: 'ready',
    });
  });

  it('reports ready for Supabase when an active remote credential-service connection exists', async () => {
    resolveCredentialDryRun.mockRejectedValue(
      new CredentialNotFoundError({ userId: 'user-1', provider: 'supabase', requiredScopes: [] }),
    );
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [{ id: 'supabase-remote', name: 'Supabase', provider: 'supabase', authType: 'api_key', status: 'active' }],
      source: 'credential_service',
    });

    const result = await getWorkflowConnectionReadiness({
      workflowId: 'wf-1',
      userId: 'user-1',
      nodes: [supabaseNode],
    });

    expect(result.ready).toBe(true);
    expect(result.rows[0].source).toBe('credential_service');
    expect(result.rows[0].connectionId).toBe('supabase-remote');
  });

  it('reports missing for Supabase when no active connection exists in either source', async () => {
    resolveCredentialDryRun.mockRejectedValue(
      new CredentialNotFoundError({ userId: 'user-1', provider: 'supabase', requiredScopes: [] }),
    );
    listCanonicalConnectionsByProvider.mockResolvedValue({ connections: [], source: 'connections' });

    const result = await getWorkflowConnectionReadiness({
      workflowId: 'wf-1',
      userId: 'user-1',
      nodes: [supabaseNode],
    });

    expect(result.ready).toBe(false);
    expect(result.rows[0]).toMatchObject({
      provider: 'supabase',
      status: 'missing',
      source: 'none',
    });
  });

  it('reports expired when the credential cannot be refreshed', async () => {
    mockActiveGoogleConnection();
    resolveCredentialDryRun.mockRejectedValue(new CredentialExpiredError(notFoundContext));

    const result = await getWorkflowConnectionReadiness(baseInput);

    expect(result.rows[0].status).toBe('expired');
    expect(result.summary.expiredCount).toBe(1);
  });

  it('skips nodes without credential requirements and dedupes lookups per provider+scopes', async () => {
    mockActiveGoogleConnection();
    resolveCredentialDryRun.mockResolvedValue({
      id: 'cred-1',
      userId: 'user-1',
      provider: 'google',
      scopes: [GMAIL_SEND],
      expiresAt: null,
      source: 'oauth_callback',
    });

    const result = await getWorkflowConnectionReadiness({
      ...baseInput,
      nodes: [
        gmailNode,
        { id: 'n2', data: { type: 'google_gmail', label: 'Second Email' } },
        { id: 'n3', data: { type: 'manual_trigger', label: 'Start' } },
      ],
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.nodeId)).toEqual(['n1', 'n2']);
    // Same provider + scopes → one credential lookup, one connection lookup
    expect(resolveCredentialDryRun).toHaveBeenCalledTimes(1);
    expect(listCanonicalConnectionsByProvider).toHaveBeenCalledTimes(1);
  });

  it('returns only non-ready rows when includeSatisfied is false', async () => {
    mockActiveGoogleConnection();
    resolveCredentialDryRun.mockResolvedValue({
      id: 'cred-1',
      userId: 'user-1',
      provider: 'google',
      scopes: [GMAIL_SEND],
      expiresAt: null,
      source: 'oauth_callback',
    });

    const result = await getWorkflowConnectionReadiness({ ...baseInput, includeSatisfied: false });

    expect(result.ready).toBe(true);
    expect(result.rows).toHaveLength(0);
    expect(result.summary.requiredCount).toBe(1);
  });

  it('reports missing when the provider connection lookup errors before an active row can be found', async () => {
    resolveCredentialDryRun.mockResolvedValue({
      id: 'cred-1',
      userId: 'user-1',
      provider: 'google',
      scopes: [GMAIL_SEND],
      expiresAt: null,
      source: 'oauth_callback',
    });
    listCanonicalConnectionsByProvider.mockRejectedValue(new Error('db down'));

    const result = await getWorkflowConnectionReadiness(baseInput);

    expect(result.ready).toBe(false);
    expect(result.rows[0].status).toBe('missing');
    expect(result.rows[0].connectionId).toBeUndefined();
  });

  it('treats legacy credentialId provider aliases as provider fallback without UUID lookup', async () => {
    resolveCredentialDryRun.mockResolvedValue({
      id: 'cred-1',
      userId: 'user-1',
      provider: 'google',
      scopes: [GMAIL_SEND],
      expiresAt: null,
      source: 'oauth_callback',
    });
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [{ id: CONN_UUID, name: 'Google', provider: 'google', authType: 'oauth2', status: 'active' }],
      source: 'connections',
    });

    const result = await getWorkflowConnectionReadiness({
      ...baseInput,
      nodes: [{
        ...gmailNode,
        data: {
          ...gmailNode.data,
          config: { credentialId: 'google' },
        },
      }],
    });

    expect(getDecryptedConnection).not.toHaveBeenCalled();
    expect(result.ready).toBe(true);
    expect(result.rows[0]).toMatchObject({
      status: 'ready',
      legacyRef: 'google',
      connectionId: CONN_UUID,
    });
  });

  it('returns invalid_ref for an explicit stale UUID connection reference', async () => {
    getDecryptedConnection.mockRejectedValue(new Error('Connection not found'));

    const result = await getWorkflowConnectionReadiness({
      ...baseInput,
      nodes: [{
        ...gmailNode,
        data: {
          ...gmailNode.data,
          connectionRefs: { google_oauth2: CONN_UUID },
        },
      }],
    });

    expect(result.ready).toBe(false);
    expect(result.rows[0]).toMatchObject({
      status: 'invalid_ref',
      action: 'repair',
      explicitRef: CONN_UUID,
    });
    expect(resolveCredentialDryRun).not.toHaveBeenCalled();
  });

  it('accepts provider_connection aliases as explicit saved connection references', async () => {
    getDecryptedConnection.mockResolvedValue({
      connection: {
        id: CONN_UUID,
        name: 'Google Workspace Primary',
        provider: 'google',
        credentialTypeId: 'google_oauth2',
        authType: 'oauth2',
        status: 'active',
      },
      source: 'connections',
    });
    resolveCredentialDryRun.mockResolvedValue({
      id: 'cred-1',
      userId: 'user-1',
      provider: 'google',
      scopes: [GMAIL_SEND],
      expiresAt: null,
      source: 'oauth_callback',
    });

    const result = await getWorkflowConnectionReadiness({
      ...baseInput,
      nodes: [{
        ...gmailNode,
        data: {
          ...gmailNode.data,
          connectionRefs: { google_connection: CONN_UUID },
        },
      }],
    });

    expect(result.ready).toBe(true);
    expect(result.rows[0]).toMatchObject({
      status: 'ready',
      connectionId: CONN_UUID,
      connectionName: 'Google Workspace Primary',
    });
  });

  it('falls back from a stale explicit UUID connection reference to one compatible provider connection', async () => {
    getDecryptedConnection.mockRejectedValue(new Error('Connection not found'));
    resolveCredentialDryRun.mockResolvedValue({
      id: 'cred-union',
      userId: 'user-1',
      provider: 'google',
      scopes: [GMAIL_SEND, SHEETS_WRITE],
      expiresAt: null,
      source: 'oauth_callback',
    });
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [{ id: 'conn-1', name: 'Google', provider: 'google', authType: 'oauth2', status: 'active' }],
      source: 'connections',
    });

    const result = await getWorkflowConnectionReadiness({
      workflowId: 'wf-1',
      userId: 'user-1',
      nodes: [
        {
          ...gmailNode,
          data: {
            ...gmailNode.data,
            connectionRefs: { google_oauth2: CONN_UUID },
          },
        },
        {
          ...sheetsAppendNode,
          data: {
            ...sheetsAppendNode.data,
            connectionRefs: { google_oauth2: CONN_UUID },
          },
        },
      ],
    });

    expect(result.ready).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((row) => row.status)).toEqual(['ready', 'ready']);
    expect(result.rows.every((row) => row.connectionId === 'conn-1')).toBe(true);
    expect(resolveCredentialDryRun).toHaveBeenCalledTimes(1);
    expect(resolveCredentialDryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: 'google',
        requiredScopes: expect.arrayContaining([GMAIL_SEND, SHEETS_WRITE]),
      }),
    );
  });

  it('does not fall back when an explicit UUID points at a different provider', async () => {
    getDecryptedConnection.mockResolvedValue({
      connection: {
        id: CONN_UUID,
        name: 'Slack',
        provider: 'slack',
        credentialTypeId: 'slack_oauth2',
        authType: 'oauth2',
        status: 'active',
      },
      source: 'connections',
    });
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [{ id: 'conn-1', name: 'Google', provider: 'google', authType: 'oauth2', status: 'active' }],
      source: 'connections',
    });

    const result = await getWorkflowConnectionReadiness({
      ...baseInput,
      nodes: [{
        ...gmailNode,
        data: {
          ...gmailNode.data,
          connectionRefs: { google_oauth2: CONN_UUID },
        },
      }],
    });

    expect(result.ready).toBe(false);
    expect(result.rows[0]).toMatchObject({
      status: 'invalid_ref',
      action: 'select_connection',
      explicitRef: CONN_UUID,
    });
    expect(resolveCredentialDryRun).not.toHaveBeenCalled();
  });

  it('falls back from a stale legacy credentialId UUID to one compatible provider connection', async () => {
    getDecryptedConnection.mockRejectedValue(new Error('Connection could not be loaded'));
    resolveCredentialDryRun.mockResolvedValue({
      id: 'cred-union',
      userId: 'user-1',
      provider: 'google',
      scopes: [GMAIL_SEND, SHEETS_WRITE],
      expiresAt: null,
      source: 'oauth_callback',
    });
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [{ id: 'conn-1', name: 'Google', provider: 'google', authType: 'oauth2', status: 'active' }],
      source: 'connections',
    });

    const result = await getWorkflowConnectionReadiness({
      workflowId: 'wf-1',
      userId: 'user-1',
      nodes: [
        {
          ...gmailNode,
          data: {
            ...gmailNode.data,
            config: { credentialId: CONN_UUID },
          },
        },
        {
          ...sheetsAppendNode,
          data: {
            ...sheetsAppendNode.data,
            config: { ...sheetsAppendNode.data.config, credentialId: CONN_UUID },
          },
        },
      ],
    });

    expect(result.ready).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((row) => row.status)).toEqual(['ready', 'ready']);
    expect(result.rows.every((row) => row.connectionId === 'conn-1')).toBe(true);
    expect(result.rows.every((row) => row.legacyRef === CONN_UUID)).toBe(true);
    expect(resolveCredentialDryRun).toHaveBeenCalledTimes(1);
    expect(resolveCredentialDryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: 'google',
        requiredScopes: expect.arrayContaining([GMAIL_SEND, SHEETS_WRITE]),
      }),
    );
  });

  it('shows select guidance for stale legacy credentialId UUID when multiple provider connections match', async () => {
    getDecryptedConnection.mockRejectedValue(new Error('Connection could not be loaded'));
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [
        { id: 'conn-1', name: 'Google A', provider: 'google', authType: 'oauth2', status: 'active' },
        { id: 'conn-2', name: 'Google B', provider: 'google', authType: 'oauth2', status: 'active' },
      ],
      source: 'connections',
    });

    const result = await getWorkflowConnectionReadiness({
      ...baseInput,
      nodes: [{
        ...gmailNode,
        data: {
          ...gmailNode.data,
          config: { credentialId: CONN_UUID },
        },
      }],
    });

    expect(result.ready).toBe(false);
    expect(result.rows[0]).toMatchObject({
      status: 'invalid_ref',
      action: 'select_connection',
      legacyRef: CONN_UUID,
      candidateConnectionIds: ['conn-1', 'conn-2'],
    });
    expect(resolveCredentialDryRun).not.toHaveBeenCalled();
  });

  it('requires explicit selection when multiple active provider connections match', async () => {
    listCanonicalConnectionsByProvider.mockResolvedValue({
      connections: [
        { id: CONN_UUID, name: 'Google A', provider: 'google', authType: 'oauth2', status: 'active' },
        { id: '22222222-2222-4222-8222-222222222222', name: 'Google B', provider: 'google', authType: 'oauth2', status: 'active' },
      ],
      source: 'connections',
    });

    const result = await getWorkflowConnectionReadiness(baseInput);

    expect(result.ready).toBe(false);
    expect(result.rows[0]).toMatchObject({
      status: 'invalid_ref',
      action: 'select_connection',
      candidateConnectionIds: [CONN_UUID, '22222222-2222-4222-8222-222222222222'],
    });
    expect(resolveCredentialDryRun).not.toHaveBeenCalled();
  });
});
