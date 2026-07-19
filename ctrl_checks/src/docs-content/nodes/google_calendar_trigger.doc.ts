import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const calendarPushDocs = 'https://developers.google.com/calendar/api/guides/push';

const fieldHelp = {
  calendarId: `What this field means: Calendar ID tells CtrlChecks which Google Calendar to watch for event changes.

Why it matters: A Google account can own or access many calendars. This field keeps the trigger pointed at the calendar whose meetings, appointments, or cancellations should start the workflow.

When to fill it: Leave the default primary when the connected account's main calendar is the source. Fill it when watching a shared team calendar, room calendar, project calendar, or customer-specific calendar.

What to enter: Use primary for the connected account's main calendar, or paste the exact Calendar ID for another Google Calendar.

Where the value comes from: In Google Calendar, open Settings, select the calendar, and copy Calendar ID from the Integrate calendar section. Shared calendars often have IDs ending in @group.calendar.google.com.

How to use it later: The trigger output includes {{$json.calendarId}}, so later nodes can log the source calendar or pass it into a Google Calendar action node.

Accepted format: primary, an email-like calendar ID, or a long Google calendar identifier such as team-ops@group.calendar.google.com.

Real workplace example: Watch support-oncall@group.calendar.google.com so on-call schedule changes create internal notifications.

If it is empty or wrong: Empty uses primary. A wrong calendar ID can register the wrong calendar, fail with a Google Calendar API error, or produce no events.

Common mistake: Using the visible calendar name, event URL, or event ID instead of the Calendar ID.`,
  eventTypes: `What this field means: Event Types controls which normalized Google Calendar changes are allowed to start the workflow.

Why it matters: The runtime sees both changed events and cancelled events during incremental sync. This field lets a meeting-prep workflow ignore cancellations, or lets a cancellation workflow ignore ordinary edits.

When to fill it: Keep both event_changed and event_cancelled when the workflow should react to all calendar changes. Use only event_changed for new or updated meetings. Use only event_cancelled for cancellation follow-up.

What to enter: event_changed, event_cancelled, or both separated by commas.

Where the value comes from: Choose based on the business event that should start work after Google notifies CtrlChecks that the watched calendar changed.

How to use it later: The output includes {{$json.eventType}}, so Switch or If/Else nodes can route changed and cancelled events differently.

Accepted format: Comma-separated text or an array in workflow JSON. Spaces and hyphens are normalized to underscores.

Options and when to choose them: event_changed is used for created or updated Google Calendar events. event_cancelled is used when Google marks the event status as cancelled.

Real workplace example: event_changed for drafting meeting briefs, and event_cancelled for sending room-release or customer-rescheduling notifications.

If it is empty or wrong: Empty falls back to event_changed and event_cancelled. Unsupported values do not match any runtime event type, so changes are ignored.

Common mistake: Expecting the trigger to run at the meeting start time. It runs when the event record changes, not when the meeting begins.`,
  query: `What this field means: Keyword Filter is optional text that must appear in the event title or description before the workflow starts.

Why it matters: It lets one watched calendar support focused workflows, such as only demo meetings, interviews, escalations, renewals, or incidents.

When to fill it: Fill it when the workflow should ignore most events and only process events containing a known word or phrase. Leave it empty when every accepted event type should start the workflow.

What to enter: A plain keyword or phrase such as demo, interview, renewal, incident, onboarding, or customer escalation.

Where the value comes from: Choose a word your team consistently puts in event titles or descriptions.

How to use it later: Matching events still expose {{$json.subject}}, {{$json.text}}, {{$json.organizer}}, {{$json.start}}, and {{$json.attendees}} for downstream nodes.

Accepted format: Plain text. Matching is case-insensitive and checks the event subject plus description text.

Real workplace example: demo for a sales workflow that prepares CRM context only for demo calls.

If it is empty or wrong: Empty accepts all configured event types. A typo or keyword that is not present in the event title/description filters out the event.

Common mistake: Treating this as a Calendar search query or formula. It is only a simple keyword filter after the changed event is fetched.`,
};

const fields: FieldDoc[] = [
  {
    name: 'Calendar ID',
    internalKey: 'calendarId',
    type: 'string',
    required: false,
    description: 'Google Calendar ID to watch; defaults to primary.',
    helpText: fieldHelp.calendarId,
    placeholder: 'primary',
    defaultValue: 'primary',
    example: 'primary',
  },
  {
    name: 'Event Types',
    internalKey: 'eventTypes',
    type: 'string',
    required: false,
    description: 'Comma-separated calendar change types that may start the workflow.',
    helpText: fieldHelp.eventTypes,
    placeholder: 'event_changed, event_cancelled',
    defaultValue: 'event_changed, event_cancelled',
    options: ['event_changed', 'event_cancelled'],
    example: 'event_changed, event_cancelled',
    notes: 'event_changed covers created or updated events. event_cancelled covers events whose Google status is cancelled.',
  },
  {
    name: 'Keyword Filter',
    internalKey: 'query',
    type: 'string',
    required: false,
    description: 'Optional keyword matched against event title and description.',
    helpText: fieldHelp.query,
    placeholder: 'demo',
    example: 'demo',
  },
];

const receiveOperation: OperationDoc = {
  name: 'Receive Calendar Change',
  value: 'receive',
  description: 'Start the workflow after Google Calendar sends a push notification for the watched calendar, CtrlChecks validates the channel ID/token, then performs an incremental sync to fetch the created, updated, or cancelled events. Google sends an initial sync notification when the channel is created; that handshake does not start a workflow.',
  fields,
  outputExample: {
    eventId: 'abc123-2026-07-18T09:30:00.000Z',
    eventType: 'event_changed',
    source: 'google_calendar',
    userId: 'organizer@example.com',
    username: 'organizer@example.com',
    text: 'Discuss renewal risks and next steps',
    timestamp: '2026-07-18T09:30:00.000Z',
    calendarId: 'primary',
    eventIdRaw: 'abc123',
    subject: 'Customer renewal review',
    organizer: 'organizer@example.com',
    start: '2026-07-20T14:00:00-04:00',
    end: '2026-07-20T14:30:00-04:00',
    attendees: ['ae@example.com', 'csm@example.com'],
    htmlLink: 'https://www.google.com/calendar/event?eid=abc123',
    raw: { id: 'abc123', status: 'confirmed', summary: 'Customer renewal review' },
    trigger: 'google_calendar',
    workflow_id: 'workflow_123',
    node_id: 'calendar-trigger-1',
    sessionId: 'gcal_workflow_123_abc123',
    _googleCalendar: true,
  },
  outputDescription: 'eventId: Unique normalized ID made from the Google event ID and updated timestamp. eventType: event_changed or event_cancelled. source: google_calendar. userId: organizer email when available. username: organizer display name or email. text: event description used with subject for query matching. timestamp: Google updated time or processing time. calendarId: watched calendar ID. eventIdRaw: raw Google Calendar event ID. subject: event summary/title. organizer: organizer email. start: event start dateTime or all-day date. end: event end dateTime or all-day date. attendees: attendee email list. htmlLink: link to open the event in Google Calendar. raw: original Google Calendar event object. trigger: google_calendar marker. workflow_id: workflow receiving the event. node_id: trigger node ID. sessionId: calendar trigger session ID. _googleCalendar: internal true marker.',
  usageExample: {
    scenario: 'Prepare a customer renewal brief whenever a matching calendar event is created or updated on the sales calendar',
    inputValues: {
      calendarId: 'primary',
      eventTypes: 'event_changed, event_cancelled',
      query: 'renewal',
    },
    expectedOutput: 'The workflow receives the changed event after Google notifies CtrlChecks. Downstream nodes can use {{$json.subject}}, {{$json.start}}, {{$json.organizer}}, {{$json.attendees}}, {{$json.eventType}}, and {{$json.htmlLink}}.',
  },
  externalDocsUrl: calendarPushDocs,
};

export const googleCalendarTriggerDoc: NodeDoc = {
  slug: 'google_calendar_trigger',
  displayName: 'Google Calendar Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Google-Calender.svg',
  description: 'Start workflows from new, updated, or cancelled Google Calendar events delivered through Google push notification channels and incremental event sync.',
  credentialType: 'Google OAuth2',
  credentialSetupSteps: [
    'Create or choose a Google OAuth2 connection in Connections. The credential system stores the OAuth access token and refresh token in the credential vault; normal workflow fields only store calendar and filter settings.',
    'Make sure the connected Google account has access to the watched calendar and grants Calendar event access. The runtime requests the https://www.googleapis.com/auth/calendar.events scope for watch registration and event sync.',
    'Test the Google OAuth2 connection from Connections. The shared Google credential test uses Google account identity checks such as https://www.googleapis.com/oauth2/v2/userinfo before Calendar API calls run.',
    'Add Google Calendar Trigger, select or rely on the saved Google account connection, then set Calendar ID, Event Types, and any Keyword Filter.',
    'Save and activate the workflow. CtrlChecks automatically creates a Google Calendar web_hook channel pointed at the generated webhook URL and seeds an initial sync token, so existing events do not replay.',
    'The channel lifetime is roughly 7 days. CtrlChecks stores channel state in Redis with a short buffer and runs a renewal sweep about every 6 hours to renew channels before expiry.',
    'Connect an outgoing line from this trigger to the first action, AI Agent, If/Else, or Google Calendar node that should receive the event change.',
    'Each downstream service node still needs its own account connection. A Google Calendar Trigger connection authorizes this watch/sync step only and does not automatically authorize Slack, Gmail, Google Sheets, databases, or other service nodes.',
    'Do not put OAuth tokens, refresh tokens, passwords, client secrets, channel tokens, or Google account passwords in Calendar ID, Event Types, Keyword Filter, or event description fields.',
  ],
  credentialDocsUrl: calendarPushDocs,
  resources: [
    {
      name: 'Webhook',
      description: 'Receives Google Calendar push notifications, validates channel state, then incrementally syncs changed events.',
      operations: [receiveOperation],
    },
  ],
  commonErrors: [
    {
      error: 'PUBLIC_BASE_URL is required to register Google Calendar watch channels.',
      cause: 'The worker cannot build the public webhook URL that Google Calendar must call for this trigger.',
      fix: 'Set PUBLIC_BASE_URL in the worker environment, restart the worker, and activate the workflow again.',
    },
    {
      error: 'No active Google connection found. Connect Google (Calendar) in Connections first.',
      cause: 'CtrlChecks could not find a usable Google OAuth2 connection for the workflow owner.',
      fix: 'Open Connections, connect Google OAuth2 with Calendar event access, confirm the credential test succeeds, and activate again.',
    },
    {
      error: 'Google Calendar API error (403)',
      cause: 'The connected Google account cannot watch or read the selected calendar, or the OAuth grant does not include Calendar event access.',
      fix: 'Share the calendar with the connected account, reconnect Google OAuth2 if scopes changed, and test the connection before registering the watch channel.',
    },
    {
      error: 'Ignored notification with invalid channel/token',
      cause: 'The incoming Google notification did not match the stored channel ID or channel token for this workflow node.',
      fix: 'Re-save or re-activate the workflow so CtrlChecks registers a fresh channel and token for the trigger.',
    },
    {
      error: 'PUBLIC_BASE_URL is required to execute Google Calendar-triggered workflows.',
      cause: 'The worker received and accepted a calendar event but did not have the public base URL needed for the internal workflow handoff.',
      fix: 'Set PUBLIC_BASE_URL for the worker environment and restart the worker before relying on production calendar triggers.',
    },
    {
      error: 'No events trigger after activation',
      cause: 'The initial sync notification is only a handshake, existing events are seeded into the sync token, Event Types may filter the event, or Keyword Filter does not match the subject/description.',
      fix: 'Create, update, or cancel a calendar event after activation, confirm Event Types and Keyword Filter, and check that the watched Calendar ID is correct.',
    },
    {
      error: 'Next node cannot find calendar fields',
      cause: 'The downstream node is using action-node field names instead of trigger output names, or the event does not contain optional data such as attendees or htmlLink.',
      fix: 'Use trigger output paths such as {{$json.subject}}, {{$json.start}}, {{$json.organizer}}, {{$json.attendees}}, {{$json.eventIdRaw}}, or {{$json.raw}}.',
    },
    {
      error: 'Permission denied after Google Calendar Trigger',
      cause: 'The trigger could read calendar changes, but a downstream service node is trying to use a different app without its own account connection or permission.',
      fix: 'Connect the downstream service node to its own account connection and confirm that account has the needed permission for its action.',
    },
  ],
  relatedNodes: ['google_calendar', 'google_gmail', 'google_sheets', 'ai_agent', 'if_else', 'switch'],
};
