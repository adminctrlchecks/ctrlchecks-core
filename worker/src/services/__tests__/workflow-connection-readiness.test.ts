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

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnectionByProvider: jest.fn(),
  },
}));

jest.mock('../../core/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { resolveCredentialDryRun } = jest.requireMock('../credential-resolver') as {
  resolveCredentialDryRun: jest.Mock;
};
const { connectionService } = jest.requireMock('../../credentials-system/connection-service') as {
  connectionService: { findCanonicalConnectionByProvider: jest.Mock };
};

const GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';

const gmailNode = {
  id: 'n1',
  type: 'custom',
  data: { type: 'google_gmail', label: 'Send Email' },
};

const baseInput = {
  workflowId: 'wf-1',
  userId: 'user-1',
  nodes: [gmailNode],
};

const notFoundContext = { userId: 'user-1', provider: 'google', requiredScopes: [GMAIL_SEND] };

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
    connectionService.findCanonicalConnectionByProvider.mockReset();
    connectionService.findCanonicalConnectionByProvider.mockResolvedValue(null);
  });

  it('reports missing when a connections row is active but unified_credentials has no row', async () => {
    resolveCredentialDryRun.mockRejectedValue(new CredentialNotFoundError(notFoundContext));
    connectionService.findCanonicalConnectionByProvider.mockResolvedValue({
      id: 'conn-1',
      provider: 'google',
      status: 'active',
    });

    const result = await getWorkflowConnectionReadiness(baseInput);

    expect(result.ready).toBe(false);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.status).toBe('missing');
    expect(row.provider).toBe('google');
    expect(row.credentialTypeId).toBe('google_oauth2');
    expect(row.connectionId).toBe('conn-1');
    expect(row.source).toBe('connections');
    expect(row.reason).toMatch(/reconnect/i);
    expect(result.summary).toEqual({
      requiredCount: 1,
      readyCount: 0,
      missingCount: 1,
      missingScopeCount: 0,
      expiredCount: 0,
    });
  });

  it('reports missing_scope when the Google credential lacks gmail.send', async () => {
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
    connectionService.findCanonicalConnectionByProvider.mockResolvedValue({ id: 'conn-1' });

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

  it('reports expired when the credential cannot be refreshed', async () => {
    resolveCredentialDryRun.mockRejectedValue(new CredentialExpiredError(notFoundContext));

    const result = await getWorkflowConnectionReadiness(baseInput);

    expect(result.rows[0].status).toBe('expired');
    expect(result.summary.expiredCount).toBe(1);
  });

  it('skips nodes without credential requirements and dedupes lookups per provider+scopes', async () => {
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
    expect(connectionService.findCanonicalConnectionByProvider).toHaveBeenCalledTimes(1);
  });

  it('returns only non-ready rows when includeSatisfied is false', async () => {
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

  it('does not fail readiness when the connections lookup errors', async () => {
    resolveCredentialDryRun.mockResolvedValue({
      id: 'cred-1',
      userId: 'user-1',
      provider: 'google',
      scopes: [GMAIL_SEND],
      expiresAt: null,
      source: 'oauth_callback',
    });
    connectionService.findCanonicalConnectionByProvider.mockRejectedValue(new Error('db down'));

    const result = await getWorkflowConnectionReadiness(baseInput);

    expect(result.ready).toBe(true);
    expect(result.rows[0].connectionId).toBeUndefined();
  });
});
