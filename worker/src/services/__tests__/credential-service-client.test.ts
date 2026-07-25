/**
 * Unit tests for credential-service-client.ts
 *
 * Phase 2: real fetch, canary routing, shouldUseCredentialService.
 */
export {};

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

if (!AbortSignal.timeout) {
  (AbortSignal as any).timeout = (_ms: number) => new AbortController().signal;
}

// ─── Flag disabled (default) ──────────────────────────────────────────────────

describe('credential-service-client — flag disabled (default)', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.CREDENTIAL_SERVICE_ENABLED;
    delete process.env.CREDENTIAL_SERVICE_CANARY_PERCENT;
    mockFetch.mockReset();
  });

  it('isCredentialServiceEnabled returns false', async () => {
    const { isCredentialServiceEnabled } = await import('../credential-service-client');
    expect(isCredentialServiceEnabled()).toBe(false);
  });

  it('listConnectionsRemote returns null — no fetch', async () => {
    const { listConnectionsRemote } = await import('../credential-service-client');
    const result = await listConnectionsRemote('user-1');
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('isCredentialServiceHealthy returns false — no fetch', async () => {
    const { isCredentialServiceHealthy } = await import('../credential-service-client');
    const ok = await isCredentialServiceHealthy();
    expect(ok).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shouldUseCredentialService always returns false when flag is off', async () => {
    const { shouldUseCredentialService } = await import('../credential-service-client');
    const ids = Array.from({ length: 20 }, (_, i) => `user-${i}`);
    for (const id of ids) {
      expect(shouldUseCredentialService(id)).toBe(false);
    }
  });
});

// ─── Flag enabled, canary percent = 0 ────────────────────────────────────────

describe('credential-service-client — ENABLED=true, CANARY_PERCENT=0', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.CREDENTIAL_SERVICE_ENABLED = 'true';
    process.env.CREDENTIAL_SERVICE_CANARY_PERCENT = '0';
    mockFetch.mockReset();
  });

  afterEach(() => {
    delete process.env.CREDENTIAL_SERVICE_ENABLED;
    delete process.env.CREDENTIAL_SERVICE_CANARY_PERCENT;
  });

  it('shouldUseCredentialService always false at 0%', async () => {
    const { shouldUseCredentialService } = await import('../credential-service-client');
    const ids = Array.from({ length: 50 }, (_, i) => `user-${i}`);
    expect(ids.every(id => !shouldUseCredentialService(id))).toBe(true);
  });

  it('default canary percent is 0 (must opt in)', async () => {
    jest.resetModules();
    process.env.CREDENTIAL_SERVICE_ENABLED = 'true';
    delete process.env.CREDENTIAL_SERVICE_CANARY_PERCENT;
    const { getCanaryPercent } = await import('../credential-service-client');
    expect(getCanaryPercent()).toBe(0);
  });
});

// ─── Flag enabled, canary percent = 100 ──────────────────────────────────────

describe('credential-service-client — ENABLED=true, CANARY_PERCENT=100', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.CREDENTIAL_SERVICE_ENABLED = 'true';
    process.env.CREDENTIAL_SERVICE_CANARY_PERCENT = '100';
    process.env.CREDENTIAL_SERVICE_URL = 'http://localhost:3004';
    process.env.CREDENTIAL_SERVICE_KEY = 'test-key';
    mockFetch.mockReset();
  });

  afterEach(() => {
    delete process.env.CREDENTIAL_SERVICE_ENABLED;
    delete process.env.CREDENTIAL_SERVICE_CANARY_PERCENT;
    delete process.env.CREDENTIAL_SERVICE_URL;
    delete process.env.CREDENTIAL_SERVICE_KEY;
  });

  it('shouldUseCredentialService always true at 100%', async () => {
    const { shouldUseCredentialService } = await import('../credential-service-client');
    const ids = Array.from({ length: 50 }, (_, i) => `user-${i}`);
    expect(ids.every(id => shouldUseCredentialService(id))).toBe(true);
  });

  it('listConnectionsRemote calls fetch and returns connections on 200', async () => {
    const fakeConnections = [{ id: 'c1', provider: 'google' }];
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ connections: fakeConnections }),
    });

    const { listConnectionsRemote } = await import('../credential-service-client');
    const result = await listConnectionsRemote('user-abc');

    expect(result).toEqual(fakeConnections);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3004/connections',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-service-key': 'test-key',
          'x-user-id': 'user-abc',
        }),
      }),
    );
  });

  it('listConnectionsRemote returns null on non-2xx', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    const { listConnectionsRemote } = await import('../credential-service-client');
    const result = await listConnectionsRemote('user-abc');
    expect(result).toBeNull();
  });

  it('listConnectionsRemote returns null on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const { listConnectionsRemote } = await import('../credential-service-client');
    const result = await listConnectionsRemote('user-abc');
    expect(result).toBeNull();
  });
});

// ─── Canary distribution at 50% ──────────────────────────────────────────────

describe('credential-service-client — canary distribution at 50%', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.CREDENTIAL_SERVICE_ENABLED = 'true';
    process.env.CREDENTIAL_SERVICE_CANARY_PERCENT = '50';
  });

  afterEach(() => {
    delete process.env.CREDENTIAL_SERVICE_ENABLED;
    delete process.env.CREDENTIAL_SERVICE_CANARY_PERCENT;
  });

  it('routes approximately 50% of user IDs to credential service', async () => {
    const { shouldUseCredentialService } = await import('../credential-service-client');
    const ids = Array.from({ length: 100 }, (_, i) => `user-canary-${i}`);
    const count = ids.filter(id => shouldUseCredentialService(id)).length;
    // Generous bounds for FNV-1a distribution on 100 IDs
    expect(count).toBeGreaterThanOrEqual(35);
    expect(count).toBeLessThanOrEqual(65);
  });

  it('is deterministic — same userId always gives same result', async () => {
    const { shouldUseCredentialService } = await import('../credential-service-client');
    const id = 'user-stable-hash-test';
    const first = shouldUseCredentialService(id);
    expect(shouldUseCredentialService(id)).toBe(first);
    expect(shouldUseCredentialService(id)).toBe(first);
  });
});

// ── Phase 4 CRUD remote methods ───────────────────────────────────────────────

describe('credential-service-client — CRUD methods disabled (flag off)', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.CREDENTIAL_SERVICE_ENABLED;
    mockFetch.mockReset();
  });

  it('createConnectionRemote returns null without fetching', async () => {
    const { createConnectionRemote } = await import('../credential-service-client');
    const result = await createConnectionRemote('u1', { name: 'x', credentialTypeId: 'google_oauth2', provider: 'google', authType: 'oauth2' });
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('updateConnectionRemote returns null without fetching', async () => {
    const { updateConnectionRemote } = await import('../credential-service-client');
    const result = await updateConnectionRemote('u1', 'conn-id', { name: 'y' });
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('deleteConnectionByIdRemote returns false without fetching', async () => {
    const { deleteConnectionByIdRemote } = await import('../credential-service-client');
    const result = await deleteConnectionByIdRemote('u1', 'conn-id');
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('testConnectionRemote returns null without fetching', async () => {
    const { testConnectionRemote } = await import('../credential-service-client');
    const result = await testConnectionRemote('u1', 'conn-id');
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('getDecryptedConnectionRemote returns null without fetching', async () => {
    const { getDecryptedConnectionRemote } = await import('../credential-service-client');
    const result = await getDecryptedConnectionRemote('u1', 'conn-id');
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('credential-service-client — CRUD methods ENABLED=true, CANARY=100', () => {
  const CONN_ROW = {
    id: 'c-uuid-1',
    userId: 'user-crud',
    name: 'My Slack',
    credentialTypeId: 'slack_oauth2',
    provider: 'slack',
    authType: 'oauth2',
    status: 'active',
    metadata: {},
    expiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.resetModules();
    process.env.CREDENTIAL_SERVICE_ENABLED = 'true';
    process.env.CREDENTIAL_SERVICE_CANARY_PERCENT = '100';
    process.env.CREDENTIAL_SERVICE_URL = 'http://localhost:3004';
    process.env.CREDENTIAL_SERVICE_KEY = 'svc-key';
    mockFetch.mockReset();
  });

  afterEach(() => {
    delete process.env.CREDENTIAL_SERVICE_ENABLED;
    delete process.env.CREDENTIAL_SERVICE_CANARY_PERCENT;
    delete process.env.CREDENTIAL_SERVICE_URL;
    delete process.env.CREDENTIAL_SERVICE_KEY;
  });

  // ── createConnectionRemote ──

  it('createConnectionRemote POSTs to /connections and returns connection', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 201, json: () => Promise.resolve({ connection: CONN_ROW }) });
    const { createConnectionRemote } = await import('../credential-service-client');
    const result = await createConnectionRemote('user-crud', {
      name: 'My Slack', credentialTypeId: 'slack_oauth2', provider: 'slack', authType: 'oauth2',
    });
    expect(result).toEqual(CONN_ROW);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3004/connections',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-service-key': 'svc-key', 'x-user-id': 'user-crud' }),
      }),
    );
  });

  it('createConnectionRemote returns null on non-2xx', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400 });
    const { createConnectionRemote } = await import('../credential-service-client');
    const result = await createConnectionRemote('user-crud', {
      name: 'x', credentialTypeId: 'slack_oauth2', provider: 'slack', authType: 'oauth2',
    });
    expect(result).toBeNull();
  });

  it('createConnectionRemote returns null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const { createConnectionRemote } = await import('../credential-service-client');
    const result = await createConnectionRemote('user-crud', {
      name: 'x', credentialTypeId: 'slack_oauth2', provider: 'slack', authType: 'oauth2',
    });
    expect(result).toBeNull();
  });

  // ── getConnectionByProviderRemote ──

  it('getConnectionByProviderRemote GETs /connections/:provider', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ connection: CONN_ROW }) });
    const { getConnectionByProviderRemote } = await import('../credential-service-client');
    const result = await getConnectionByProviderRemote('user-crud', 'slack');
    expect(result).toEqual(CONN_ROW);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3004/connections/slack',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('getConnectionByProviderRemote returns null on 404', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const { getConnectionByProviderRemote } = await import('../credential-service-client');
    const result = await getConnectionByProviderRemote('user-crud', 'nonexistent');
    expect(result).toBeNull();
  });

  it('getDecryptedConnectionRemote GETs /connections/:id/decrypted and returns credentials for runtime', async () => {
    const decrypted = { ...CONN_ROW, credentials: { token: 'secret-token' } };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ connection: decrypted }) });
    const { getDecryptedConnectionRemote } = await import('../credential-service-client');
    const result = await getDecryptedConnectionRemote('user-crud', 'c-uuid-1');
    expect(result).toEqual(decrypted);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3004/connections/c-uuid-1/decrypted',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  // ── updateConnectionRemote ──

  it('updateConnectionRemote PATCHes /connections/:id', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ connection: { ...CONN_ROW, name: 'Renamed' } }) });
    const { updateConnectionRemote } = await import('../credential-service-client');
    const result = await updateConnectionRemote('user-crud', 'c-uuid-1', { name: 'Renamed' });
    expect(result?.name).toBe('Renamed');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3004/connections/c-uuid-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('updateConnectionRemote returns null on non-2xx', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const { updateConnectionRemote } = await import('../credential-service-client');
    expect(await updateConnectionRemote('user-crud', 'bad-id', { name: 'x' })).toBeNull();
  });

  it('updateConnectionRemote returns null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('timeout'));
    const { updateConnectionRemote } = await import('../credential-service-client');
    expect(await updateConnectionRemote('user-crud', 'c-uuid-1', {})).toBeNull();
  });

  // ── deleteConnectionByIdRemote ──

  it('deleteConnectionByIdRemote DELETEs /connections/:id and returns true on 204', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    const { deleteConnectionByIdRemote } = await import('../credential-service-client');
    expect(await deleteConnectionByIdRemote('user-crud', 'c-uuid-1')).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3004/connections/c-uuid-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('deleteConnectionByIdRemote returns true on 404 (idempotent)', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const { deleteConnectionByIdRemote } = await import('../credential-service-client');
    expect(await deleteConnectionByIdRemote('user-crud', 'missing-id')).toBe(true);
  });

  it('deleteConnectionByIdRemote returns false on 503', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    const { deleteConnectionByIdRemote } = await import('../credential-service-client');
    expect(await deleteConnectionByIdRemote('user-crud', 'c-uuid-1')).toBe(false);
  });

  it('deleteConnectionByIdRemote returns false on network error', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const { deleteConnectionByIdRemote } = await import('../credential-service-client');
    expect(await deleteConnectionByIdRemote('user-crud', 'c-uuid-1')).toBe(false);
  });

  // ── testConnectionRemote ──

  it('testConnectionRemote POSTs to /connections/:id/test', async () => {
    const testResult = { success: true, connectionId: 'c-uuid-1', status: 'active', expired: false, testedAt: new Date().toISOString() };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(testResult) });
    const { testConnectionRemote } = await import('../credential-service-client');
    const result = await testConnectionRemote('user-crud', 'c-uuid-1');
    expect(result?.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3004/connections/c-uuid-1/test',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('testConnectionRemote returns null on non-2xx', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    const { testConnectionRemote } = await import('../credential-service-client');
    expect(await testConnectionRemote('user-crud', 'c-uuid-1')).toBeNull();
  });

  it('testConnectionRemote returns null on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const { testConnectionRemote } = await import('../credential-service-client');
    expect(await testConnectionRemote('user-crud', 'c-uuid-1')).toBeNull();
  });

  // ── deleteConnectionByProviderRemote ──

  it('deleteConnectionByProviderRemote DELETEs /connections/:provider', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    const { deleteConnectionByProviderRemote } = await import('../credential-service-client');
    expect(await deleteConnectionByProviderRemote('user-crud', 'google')).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3004/connections/google',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
