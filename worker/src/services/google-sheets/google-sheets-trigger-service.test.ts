import { connectionService } from '../../credentials-system/connection-service';
import { getGoogleAccessToken } from '../../shared/google-sheets';
import { getRedisClient } from '../../shared/redis-client';
import {
  autoRegisterGoogleSheetsPollingForWorkflow,
  buildGoogleSheetsExecutionInput,
  pollAllGoogleSheetsTriggers,
  registerGoogleSheetsPolling,
  shouldAcceptGoogleSheetsEvent,
  unregisterGoogleSheetsPolling,
  type NormalizedGoogleSheetsEvent,
} from './google-sheets-trigger-service';

jest.mock('../../credentials-system/connection-service', () => ({
  connectionService: {
    findCanonicalConnectionByProvider: jest.fn(),
  },
}));

jest.mock('../../shared/google-sheets', () => ({
  getGoogleAccessToken: jest.fn(),
}));

jest.mock('../../shared/redis-client', () => ({
  getRedisClient: jest.fn(),
}));

jest.mock('../../core/database/aws-db-client', () => ({
  getDbClient: jest.fn(),
}));

function makeFakeRedis() {
  const store = new Map<string, string>();
  return {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
  };
}

function makeEvent(overrides: Partial<NormalizedGoogleSheetsEvent> = {}): NormalizedGoogleSheetsEvent {
  return {
    eventId: 'sheet1-3-row_added-1',
    eventType: 'row_added',
    source: 'google_sheets',
    userId: null,
    username: '',
    text: 'Jane Doe jane@example.com',
    timestamp: '2026-07-17T12:00:00.000Z',
    spreadsheetId: 'sheet-1',
    sheetName: 'Sheet1',
    rowNumber: 3,
    values: ['Jane Doe', 'jane@example.com'],
    row: { Name: 'Jane Doe', Email: 'jane@example.com' },
    raw: {},
    ...overrides,
  };
}

describe('google-sheets-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
  });

  it('filters events by type and keyword query', () => {
    const event = makeEvent();
    expect(shouldAcceptGoogleSheetsEvent(event, {})).toEqual({ accepted: true });
    expect(shouldAcceptGoogleSheetsEvent(event, { eventTypes: 'row_updated' })).toMatchObject({ accepted: false });
    expect(shouldAcceptGoogleSheetsEvent(event, { query: 'jane' })).toEqual({ accepted: true });
    expect(shouldAcceptGoogleSheetsEvent(event, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized row fields', () => {
    const event = makeEvent();
    expect(buildGoogleSheetsExecutionInput({ workflowId: 'wf1', nodeId: 'sheet-node', normalized: event })).toMatchObject({
      trigger: 'google_sheets',
      workflow_id: 'wf1',
      node_id: 'sheet-node',
      rowNumber: 3,
      _googleSheets: true,
    });
  });

  it('captures a baseline row count on first registration without emitting events', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (getGoogleAccessToken as jest.Mock).mockResolvedValue('access-token-1');
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ values: [['Name', 'Email'], ['John', 'john@example.com']] }),
    });

    const result = await registerGoogleSheetsPolling({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'sheet-node',
      spreadsheetId: 'sheet-1',
    });

    expect(result).toMatchObject({ success: true, connectionId: 'conn-1', rowCount: 2 });

    // Re-registering should be idempotent and not reset the baseline.
    const second = await registerGoogleSheetsPolling({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'sheet-node',
      spreadsheetId: 'sheet-1',
    });
    expect(second.rowCount).toBe(2);
  });

  it('rejects registration without a spreadsheet ID', async () => {
    (getRedisClient as jest.Mock).mockResolvedValue(makeFakeRedis());
    await expect(registerGoogleSheetsPolling({
      userId: 'user-1',
      workflowId: 'wf1',
      nodeId: 'sheet-node',
      spreadsheetId: '',
    })).rejects.toThrow('spreadsheet ID');
  });

  it('auto-registers saved Google Sheets trigger nodes and reports missing spreadsheet ID errors', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (getGoogleAccessToken as jest.Mock).mockResolvedValue('access-token-1');
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ values: [['Name'], ['John']] }),
    });

    const result = await autoRegisterGoogleSheetsPollingForWorkflow({
      userId: 'user-1',
      workflow: {
        id: 'wf1',
        status: 'active',
        nodes: [
          { id: 'sheet-node', type: 'custom', data: { type: 'google_sheets_trigger', config: { spreadsheetId: 'sheet-1' } } },
          { id: 'sheet-node-2', type: 'custom', data: { type: 'google_sheets_trigger', config: {} } },
        ],
      },
    });

    expect(result).toEqual([
      expect.objectContaining({ nodeId: 'sheet-node', success: true, rowCount: 2 }),
      expect.objectContaining({ nodeId: 'sheet-node-2', success: false, error: expect.stringContaining('Spreadsheet ID') }),
    ]);
  });

  it('unregisters polling and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });

    const result = await unregisterGoogleSheetsPolling({ userId: 'user-1', workflowId: 'wf1', nodeId: 'sheet-node' });
    expect(result).toMatchObject({ success: true, connectionId: 'conn-1' });
    expect(fakeRedis.del).toHaveBeenCalled();
  });

  it('does nothing when the polling sweep finds no active workflows', async () => {
    const { getDbClient } = require('../../core/database/aws-db-client');
    (getDbClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: async () => ({ data: [], error: null }),
        }),
      }),
    });
    await expect(pollAllGoogleSheetsTriggers()).resolves.toBeUndefined();
  });
});
