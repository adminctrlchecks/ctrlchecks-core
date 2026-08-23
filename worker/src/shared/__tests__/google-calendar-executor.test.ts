const mockEventsList = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
      })),
    },
    calendar: jest.fn(() => ({
      events: {
        list: mockEventsList,
      },
    })),
  },
}));

jest.mock('../google-sheets', () => ({
  getGoogleAccessToken: jest.fn().mockResolvedValue('test-access-token'),
}));

import { executeGoogleCalendarOperation, resolveGoogleCalendarSingleEvents } from '../google-calendar-executor';

/**
 * Regression: `events.list` with orderBy:"startTime" + singleEvents:false is invalid per
 * Google Calendar's API and always 400s ("Bad Request"). This was the node's own hardcoded
 * default combination — every plain "list my events" tool call failed, unrelated to what the
 * user asked or what the AI Agent did.
 */
describe('resolveGoogleCalendarSingleEvents', () => {
  beforeEach(() => {
    mockEventsList.mockReset();
    mockEventsList.mockResolvedValue({ data: { items: [] } });
  });

  it('forces singleEvents true when orderBy is startTime, even if singleEvents was false/unset', () => {
    expect(resolveGoogleCalendarSingleEvents('startTime', false)).toBe(true);
    expect(resolveGoogleCalendarSingleEvents('startTime', undefined)).toBe(true);
  });

  it('respects an explicit singleEvents:true alongside orderBy startTime (no-op, already valid)', () => {
    expect(resolveGoogleCalendarSingleEvents('startTime', true)).toBe(true);
  });

  it('leaves singleEvents untouched for any other orderBy value', () => {
    expect(resolveGoogleCalendarSingleEvents('updated', false)).toBe(false);
    expect(resolveGoogleCalendarSingleEvents('updated', true)).toBe(true);
    expect(resolveGoogleCalendarSingleEvents(undefined, false)).toBe(false);
    expect(resolveGoogleCalendarSingleEvents(undefined, undefined)).toBe(false);
  });

  it('omits blank optional event-list filters before calling Google', async () => {
    await executeGoogleCalendarOperation({} as any, ['user-1'], {
      resource: 'event',
      operation: 'list',
      calendarId: 'primary',
      timeMin: '',
      timeMax: '',
      q: '',
      maxResults: 1,
      singleEvents: false,
      orderBy: 'startTime',
      returnAll: false,
    });

    expect(mockEventsList).toHaveBeenCalledTimes(1);
    const request = mockEventsList.mock.calls[0][0];
    expect(request).toMatchObject({
      calendarId: 'primary',
      maxResults: 1,
      singleEvents: true,
      orderBy: 'startTime',
    });
    expect(request).not.toHaveProperty('timeMin');
    expect(request).not.toHaveProperty('timeMax');
    expect(request).not.toHaveProperty('q');
  });
});
