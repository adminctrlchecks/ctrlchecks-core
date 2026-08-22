import { resolveGoogleCalendarSingleEvents } from '../google-calendar-executor';

/**
 * Regression: `events.list` with orderBy:"startTime" + singleEvents:false is invalid per
 * Google Calendar's API and always 400s ("Bad Request"). This was the node's own hardcoded
 * default combination — every plain "list my events" tool call failed, unrelated to what the
 * user asked or what the AI Agent did.
 */
describe('resolveGoogleCalendarSingleEvents', () => {
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
});
