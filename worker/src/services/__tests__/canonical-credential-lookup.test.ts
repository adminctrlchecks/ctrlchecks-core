jest.mock('../credential-service-client', () => ({
  shouldUseCredentialService: jest.fn(),
  listConnectionsRemote: jest.fn(),
  getDecryptedConnectionRemote: jest.fn(),
}));

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    listConnections: jest.fn(),
    findCanonicalConnection: jest.fn(),
    findCanonicalConnectionByProvider: jest.fn(),
    getDecryptedConnection: jest.fn(),
    markUsed: jest.fn(),
  },
}));

const remoteClient = jest.requireMock('../credential-service-client') as {
  shouldUseCredentialService: jest.Mock;
  listConnectionsRemote: jest.Mock;
  getDecryptedConnectionRemote: jest.Mock;
};
const { connectionService } = jest.requireMock('../../credentials-system/connection-service') as {
  connectionService: {
    listConnections: jest.Mock;
    findCanonicalConnection: jest.Mock;
    findCanonicalConnectionByProvider: jest.Mock;
    getDecryptedConnection: jest.Mock;
    markUsed: jest.Mock;
  };
};

const now = new Date().toISOString();

describe('canonical credential lookup', () => {
  beforeEach(() => {
    remoteClient.shouldUseCredentialService.mockReset();
    remoteClient.listConnectionsRemote.mockReset();
    remoteClient.getDecryptedConnectionRemote.mockReset();
    Object.values(connectionService).forEach((fn) => fn.mockReset());
  });

  it('finds provider connections from credential-service for canary users', async () => {
    remoteClient.shouldUseCredentialService.mockReturnValue(true);
    remoteClient.listConnectionsRemote.mockResolvedValue([
      {
        id: 'remote-supabase',
        provider: 'supabase',
        credentialTypeId: 'supabase_api_key',
        authType: 'api_key',
        status: 'active',
        expiresAt: null,
        createdAt: now,
        updatedAt: now,
        lastUsedAt: null,
      },
    ]);

    const { findCanonicalConnectionByProvider } = await import('../canonical-credential-lookup');
    const result = await findCanonicalConnectionByProvider('user-1', 'supabase');

    expect(result?.source).toBe('credential_service');
    expect(result?.connection.id).toBe('remote-supabase');
    expect(connectionService.findCanonicalConnectionByProvider).not.toHaveBeenCalled();
  });

  it('falls back to local store when credential-service is unavailable', async () => {
    remoteClient.shouldUseCredentialService.mockReturnValue(true);
    remoteClient.listConnectionsRemote.mockResolvedValue(null);
    connectionService.findCanonicalConnectionByProvider.mockResolvedValue({ id: 'local-supabase' });

    const { findCanonicalConnectionByProvider } = await import('../canonical-credential-lookup');
    const result = await findCanonicalConnectionByProvider('user-1', 'supabase');

    expect(result?.source).toBe('connections');
    expect(result?.connection.id).toBe('local-supabase');
  });

  it('retrieves decrypted remote credentials for runtime', async () => {
    remoteClient.shouldUseCredentialService.mockReturnValue(true);
    remoteClient.getDecryptedConnectionRemote.mockResolvedValue({
      id: 'remote-supabase',
      provider: 'supabase',
      credentialTypeId: 'supabase_api_key',
      status: 'active',
      credentials: { projectUrl: 'https://project.supabase.co', token: 'service-role-key' },
    });

    const { getDecryptedConnection } = await import('../canonical-credential-lookup');
    const result = await getDecryptedConnection('user-1', 'remote-supabase');

    expect(result?.source).toBe('credential_service');
    expect(result?.connection.credentials).toEqual({
      projectUrl: 'https://project.supabase.co',
      token: 'service-role-key',
    });
    expect(connectionService.getDecryptedConnection).not.toHaveBeenCalled();
  });
});
