import { listSupabaseTablesHandler, previewSupabaseTableHandler } from '../database-explorer';
import { connectionService } from '../../credentials-system/connection-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    getDecryptedConnection: jest.fn(),
  },
}));

const mockConnectionService = connectionService as jest.Mocked<typeof connectionService>;

function mockReq(body: Record<string, unknown>) {
  return { body, user: { id: 'user-1' } } as any;
}

function mockRes() {
  const res: any = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('database-explorer Supabase handlers', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    mockConnectionService.getDecryptedConnection.mockResolvedValue({
      id: 'conn-1',
      userId: 'user-1',
      provider: 'supabase',
      credentialTypeId: 'supabase_api_key',
      name: 'Supabase',
      status: 'active',
      credentials: {
        projectUrl: 'https://project-ref.supabase.co/rest/v1',
        token: 'service-role-token',
      },
    } as any);
  });

  it('lists tables using a normalized project URL and explicit OpenAPI accept header', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        paths: {
          '/users': {},
          '/orders': {},
          '/rpc/refresh_stats': {},
          '/': {},
        },
      }),
    });

    const res = mockRes();

    await listSupabaseTablesHandler(mockReq({ connectionId: 'conn-1' }), res);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://project-ref.supabase.co/rest/v1/',
      {
        headers: {
          apikey: 'service-role-token',
          Authorization: 'Bearer service-role-token',
          Accept: 'application/openapi+json',
        },
      }
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, tables: ['orders', 'users'] });
  });

  it('previews a known table after fetching table names through the normalized URL', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paths: { '/users': {} } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, email: 'user@example.com' }],
      });

    const res = mockRes();

    await previewSupabaseTableHandler(mockReq({ connectionId: 'conn-1', table: 'users' }), res);

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://project-ref.supabase.co/rest/v1/users?select=*&limit=5',
      {
        headers: {
          apikey: 'service-role-token',
          Authorization: 'Bearer service-role-token',
        },
      }
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      columns: ['id', 'email'],
      rows: [{ id: 1, email: 'user@example.com' }],
    });
  });
});
