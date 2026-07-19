import type { DocsSearchIndexItem } from '../search-index';

export const googleCalendarTriggerSearchIndex = [
  {
    slug: 'google_calendar_trigger',
    title: 'Google Calendar Trigger',
    type: 'node' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_calendar_trigger',
    text: 'Google Calendar Trigger starts workflows from Google Calendar event_changed and event_cancelled changes. CtrlChecks registers a Google Calendar web_hook push notification channel, validates channel ID and token, then incrementally syncs changed events with a sync token.',
  },
  {
    slug: 'google_calendar_trigger',
    title: 'Google Calendar Trigger: Receive Calendar Change',
    type: 'operation' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_calendar_trigger#operation-receive',
    text: 'Receive Calendar Change uses calendarId, eventTypes, and query. The channel is registered automatically on activation, initial sync notifications do not start workflows, channels last roughly 7 days, renewal runs about every 6 hours, and outputs include eventId, eventType, source, userId, username, text, timestamp, calendarId, eventIdRaw, subject, organizer, start, end, attendees, htmlLink, raw, trigger, workflow_id, node_id, sessionId, and _googleCalendar.',
  },
  {
    slug: 'google_calendar_trigger',
    title: 'Google Calendar Trigger Fields',
    type: 'field' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_calendar_trigger#fields',
    text: 'Calendar ID defaults to primary or can use a shared calendar ID from Google Calendar settings. Event Types supports event_changed for created or updated events and event_cancelled for cancelled events. Keyword Filter query matches event title and description case-insensitively.',
  },
  {
    slug: 'google_calendar_trigger',
    title: 'Google Calendar Trigger Connection',
    type: 'field' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_calendar_trigger#credentials',
    text: 'Google Calendar Trigger uses a Google OAuth2 connection stored in Connections and the credential vault. The runtime requests calendar.events scope and the connected Google account needs access to the watched calendar. Test the Google connection with account identity checks such as oauth2/v2/userinfo. Do not put OAuth tokens, refresh tokens, passwords, client secrets, or channel tokens in normal workflow fields.',
  },
] satisfies DocsSearchIndexItem[];
