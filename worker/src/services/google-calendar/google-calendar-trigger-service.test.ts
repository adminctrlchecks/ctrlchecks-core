import { config } from '../../core/config';
import { connectionService } from '../../credentials-system/connection-service';
import { getGoogleAccessToken } from '../../shared/google-sheets';
import { getRedisClient } from '../../shared/redis-client';
import {
  buildGoogleCalendarExecutionInput,
  fetchChangedCalendarEvents,
  parseGoogleCalendarNotification,
  registerGoogleCalendarWatch,
  shouldAcceptGoogleCalendarEvent,
  unregisterGoogleCalendarWatch,
  validateGoogleCalendarNotification,
  type NormalizedGoogleCalendarEvent,
} from './google-calendar-trigger-service';

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

function makeEvent(overrides: Partial<NormalizedGoogleCalendarEvent> = {}): NormalizedGoogleCalendarEvent {
  return {
    eventId: 'evt-1-2026-07-17T12:00:00.000Z',
    eventType: 'event_changed',
    source: 'google_calendar',
    userId: 'user@example.com',
    username: 'User',
    text: 'Weekly sync',
    timestamp: '2026-07-17T12:00:00.000Z',
    calendarId: 'primary',
    eventIdRaw: 'evt-1',
    subject: 'Team Standup',
    organizer: 'user@example.com',
    start: '2026-07-18T09:00:00-07:00',
    end: '2026-07-18T09:15:00-07:00',
    attendees: ['teammate@example.com'],
    htmlLink: 'https://calendar.google.com/event?eid=evt-1',
    raw: {},
    ...overrides,
  };
}

describe('google-calendar-trigger-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = jest.fn();
    config.publicBaseUrl = 'https://ctrlchecks.example';
  });

  it('parses Google Calendar notification headers', () => {
    const req: any = {
      headers: {
        'x-goog-channel-id': 'chan-1',
        'x-goog-resource-id': 'res-1',
        'x-goog-resource-state': 'exists',
        'x-goog-channel-token': 'token-1',
      },
    };
    expect(parseGoogleCalendarNotification(req)).toEqual({
      channelId: 'chan-1',
      resourceId: 'res-1',
      resourceState: 'exists',
      channelToken: 'token-1',
    });
  });

  it('filters events by type and keyword query', () => {
    const event = makeEvent();
    expect(shouldAcceptGoogleCalendarEvent(event, {})).toEqual({ accepted: true });
    expect(shouldAcceptGoogleCalendarEvent(event, { eventTypes: 'event_cancelled' })).toMatchObject({ accepted: false });
    expect(shouldAcceptGoogleCalendarEvent(event, { query: 'standup' })).toEqual({ accepted: true });
    expect(shouldAcceptGoogleCalendarEvent(event, { query: 'unrelated-keyword' })).toMatchObject({ accepted: false });
  });

  it('builds workflow execution input with normalized calendar fields', () => {
    const event = makeEvent();
    expect(buildGoogleCalendarExecutionInput({ workflowId: 'wf1', nodeId: 'gcal-node', normalized: event })).toMatchObject({
      trigger: 'google_calendar',
      workflow_id: 'wf1',
      node_id: 'gcal-node',
      subject: 'Team Standup',
      _googleCalendar: true,
    });
  });

  it('normalizes changed events from the Calendar API incremental sync', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        items: [{
          id: 'evt-1',
          status: 'confirmed',
          summary: 'Team Standup',
          organizer: { email: 'user@example.com', displayName: 'User' },
          start: { dateTime: '2026-07-18T09:00:00-07:00' },
          end: { dateTime: '2026-07-18T09:15:00-07:00' },
          attendees: [{ email: 'teammate@example.com' }],
          htmlLink: 'https://calendar.google.com/event?eid=evt-1',
          updated: '2026-07-17T12:00:00.000Z',
        }],
        nextSyncToken: 'sync-token-2',
      }),
    });

    const result = await fetchChangedCalendarEvents({ accessToken: 'token-1', calendarId: 'primary', syncToken: 'sync-token-1' });
    expect(result.nextSyncToken).toBe('sync-token-2');
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ eventType: 'event_changed', subject: 'Team Standup', organizer: 'user@example.com' });
  });

  it('registers a new watch channel and validates its channel/token', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (getGoogleAccessToken as jest.Mock).mockResolvedValue('access-token-1');
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ resourceId: 'res-1', expiration: '1799999999000' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ items: [], nextSyncToken: 'sync-token-1' }) });

    const result = await registerGoogleCalendarWatch({ userId: 'user-1', workflowId: 'wf1', nodeId: 'gcal-node' });

    expect(result).toMatchObject({
      success: true,
      webhookUrl: 'https://ctrlchecks.example/api/google-calendar/webhook/wf1/gcal-node',
      connectionId: 'conn-1',
    });

    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(requestInit.body);
    expect(requestBody.token).toBeTruthy();
    expect(requestBody.id).toBe(result.channelId);

    await expect(validateGoogleCalendarNotification('wf1', 'gcal-node', {
      channelId: result.channelId,
      resourceId: 'res-1',
      resourceState: 'exists',
      channelToken: requestBody.token,
    })).resolves.toBe(true);

    await expect(validateGoogleCalendarNotification('wf1', 'gcal-node', {
      channelId: result.channelId,
      resourceId: 'res-1',
      resourceState: 'exists',
      channelToken: 'wrong-token',
    })).resolves.toBe(false);
  });

  it('unregisters a watch channel and clears local state', async () => {
    const fakeRedis = makeFakeRedis();
    (getRedisClient as jest.Mock).mockResolvedValue(fakeRedis);
    (getGoogleAccessToken as jest.Mock).mockResolvedValue('access-token-1');
    (connectionService.findCanonicalConnectionByProvider as jest.Mock).mockResolvedValue({ id: 'conn-1' });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ resourceId: 'res-1', expiration: '1799999999000' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ items: [], nextSyncToken: 'sync-token-1' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => '' });

    await registerGoogleCalendarWatch({ userId: 'user-1', workflowId: 'wf1', nodeId: 'gcal-node' });

    const result = await unregisterGoogleCalendarWatch({ userId: 'user-1', workflowId: 'wf1', nodeId: 'gcal-node' });
    expect(result).toMatchObject({ success: true, connectionId: 'conn-1' });
    expect(fakeRedis.del).toHaveBeenCalled();
  });
});
