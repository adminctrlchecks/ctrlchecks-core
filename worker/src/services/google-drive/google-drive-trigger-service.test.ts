import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';
import { getGoogleAccessToken } from '../../shared/google-sheets';
import { getRedisClient } from '../../shared/redis-client';
import {
  buildGoogleDriveExecutionInput,
  fetchChangedDriveFiles,
  parseGoogleDriveNotification,
  registerGoogleDriveWatch,
  shouldAcceptGoogleDriveEvent,
  unregisterGoogleDriveWatch,
  validateGoogleDriveNotification,
  type NormalizedGoogleDriveEvent,
} from './google-drive-trigger-service';

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

function makeEvent(overrides: Partial<NormalizedGoogleDriveEvent> = {}): NormalizedGoogleDriveEvent {
  return {
    eventId: 'file-1-1737200000000',
    eventType: 'file_changed',
    source: 'google_drive',
    userId: 'user@example.com',
    username: 'User',
    text: 'Q3 Report.pdf',
    timestamp: '2026-07-18T12:00:00.000Z',
    fileId: 'file-1',
    name: 'Q3 Report.pdf',
    mimeType: 'application/pdf',
    parents: ['folder-1'],
    modifiedTime: '2026-07-18T12:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/file-1/view',
    raw: {},
    ...overrides,
  };
}

describe('google-drive-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('parses Google Drive notification headers', () => {
    const req: any = {
      headers: {
        'x-goog-channel-id': 'chan-1',
        'x-goog-resource-id': 'res-1',
        'x-goog-resource-state': 'change',
        'x-goog-channel-token': 'token-1',
      },
    };
    expect(parseGoogleDriveNotification(req)).toEqual({
      channelId: 'chan-1',
      resourceId: 'res-1',
      resourceState: 'change',
      channelToken: 'token-1',
    });
  });

  it('filters events by type, folder, and keyword query', () => {
    const event = makeEvent();
    expect(shouldAcceptGoogleDriveEvent(event, {})).toEqual({ accepted: true });
    expect(shouldAcceptGoogleDriveEvent(event, { eventTypes: 'file_deleted' })).toMatchObject({ accepted: false });
    expect(shouldAcceptGoogleDriveEvent(event, { query: 'report' })).toEqual({ accepted: true });
    expect(shouldAcceptGoogleDriveEvent(event, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized file fields', () => {
    const event = makeEvent();
    expect(buildGoogleDriveExecutionInput({ workflowId: 'wf1', nodeId: 'drive-node', normalized: event })).toMatchObject({
      trigger: 'google_drive',
      workflow_id: 'wf1',
      node_id: 'drive-node',
      fileId: 'file-1',
      _googleDrive: true,
    });
  });

  it('fetches and normalizes changed files, filtering by folder', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        changes: [
          { fileId: 'file-1', file: { id: 'file-1', name: 'In folder.pdf', mimeType: 'application/pdf', parents: ['folder-1'], modifiedTime: '2026-07-18T12:00:00.000Z' } },
          { fileId: 'file-2', file: { id: 'file-2', name: 'Other folder.pdf', mimeType: 'application/pdf', parents: ['folder-2'], modifiedTime: '2026-07-18T12:00:00.000Z' } },
        ],
        newStartPageToken: 'page-2',
      }),
    });

    const result = await fetchChangedDriveFiles({ accessToken: 'token-1', pageToken: 'page-1', folderId: 'folder-1' });
    expect(result.nextPageToken).toBe('page-2');
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ fileId: 'file-1', name: 'In folder.pdf' });
  });

  it('registers a new watch channel and validates its channel/token', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (getGoogleAccessToken as jest.Mock).mockResolvedValue('access-token-1');
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ startPageToken: 'page-1' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ resourceId: 'res-1', expiration: '1799999999000' }) });

    const result = await registerGoogleDriveWatch({ userId: 'user-1', workflowId: 'wf1', nodeId: 'drive-node' });

    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/google-drive/webhook/wf1/drive-node',
      connectionId: 'conn-1',
    });

    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[1];
    const requestBody = JSON.parse(requestInit.body);
    expect(requestBody.token).toBeTruthy();
    expect(requestBody.id).toBe(result.channelId);

    await expect(validateGoogleDriveNotification('wf1', 'drive-node', {
      channelId: result.channelId,
      resourceId: 'res-1',
      resourceState: 'change',
      channelToken: requestBody.token,
    })).resolves.toBe(true);

    await expect(validateGoogleDriveNotification('wf1', 'drive-node', {
      channelId: result.channelId,
      resourceId: 'res-1',
      resourceState: 'change',
      channelToken: 'wrong-token',
    })).resolves.toBe(false);
  });

  it('unregisters a watch channel and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (getGoogleAccessToken as jest.Mock).mockResolvedValue('access-token-1');
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ startPageToken: 'page-1' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ resourceId: 'res-1', expiration: '1799999999000' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => '' });

    await registerGoogleDriveWatch({ userId: 'user-1', workflowId: 'wf1', nodeId: 'drive-node' });

    const result = await unregisterGoogleDriveWatch({ userId: 'user-1', workflowId: 'wf1', nodeId: 'drive-node' });
    expect(result).toMatchObject({ success: true, connectionId: 'conn-1' });
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
