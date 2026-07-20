import { runSQLServerNode } from './sqlServerNode';

const mockQuery = jest.fn();
const mockExecute = jest.fn();
const mockInput = jest.fn();
const mockClose = jest.fn();
const mockConnect = jest.fn();

function mockPool() {
  mockInput.mockReturnThis();
  return {
    request: jest.fn(() => ({
      input: mockInput,
      query: mockQuery,
      execute: mockExecute,
    })),
    close: mockClose,
  };
}

const fakeSqlClient = {
  connect: (...args: unknown[]) => mockConnect(...args),
};

describe('runSQLServerNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ recordset: [{ id: 1 }], rowsAffected: [1] });
    mockExecute.mockResolvedValue({ recordset: [{ ok: true }], returnValue: 0 });
    mockClose.mockResolvedValue(undefined);
    mockConnect.mockResolvedValue(mockPool());
  });

  it('executes canonical sql_server executeQuery config', async () => {
    const result = await runSQLServerNode({
      inputs: {
        host: 'server.database.windows.net',
        port: 1433,
        database: 'app',
        username: 'user',
        password: 'secret',
        operation: 'executeQuery',
        query: 'SELECT TOP 1 * FROM dbo.Users WHERE id = @id',
        params: { id: 1 },
      },
      previousOutputs: {},
      workflowId: 'wf_1',
      nodeId: 'node_1',
      userId: 'user_1',
    } as any, fakeSqlClient as any);

    expect(result).toEqual({ success: true, data: { rows: [{ id: 1 }], rowsAffected: 1 } });
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({
      server: 'server.database.windows.net',
      database: 'app',
      user: 'user',
      password: 'secret',
    }));
    expect(mockInput).toHaveBeenCalledWith('id', 1);
    expect(mockQuery).toHaveBeenCalledWith('SELECT TOP 1 * FROM dbo.Users WHERE id = @id');
    expect(mockClose).toHaveBeenCalled();
  });

  it('normalizes legacy server/select/filter config into an executable query', async () => {
    const result = await runSQLServerNode({
      inputs: {
        server: 'legacy.sql.local',
        database: 'app',
        username: 'user',
        password: 'secret',
        operation: 'select',
        table: 'dbo.Users',
        filters: '{"status":"active"}',
        limit: 25,
      },
      previousOutputs: {},
      workflowId: 'wf_1',
      nodeId: 'node_1',
      userId: 'user_1',
    } as any, fakeSqlClient as any);

    expect(result.success).toBe(true);
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({ server: 'legacy.sql.local' }));
    expect(mockInput).toHaveBeenCalledWith('param0', 'active');
    expect(mockQuery).toHaveBeenCalledWith('SELECT TOP (25) * FROM [dbo].[Users] WHERE [status] = @param0');
  });

  it('returns a clean validation error for missing host', async () => {
    const result = await runSQLServerNode({
      inputs: {
        database: 'app',
        username: 'user',
        password: 'secret',
        operation: 'executeQuery',
        query: 'SELECT 1',
      },
      previousOutputs: {},
      workflowId: 'wf_1',
      nodeId: 'node_1',
      userId: 'user_1',
    } as any, fakeSqlClient as any);

    expect(result).toEqual({ success: false, error: 'host is required' });
    expect(mockConnect).not.toHaveBeenCalled();
  });
});
