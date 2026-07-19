import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const scopes = 'meeting:write:meeting, meeting:read:meeting, meeting:read:list_meetings, user:read:user';
const zoomDocs = 'https://developers.zoom.us/docs/integrations/oauth/';

const operationHelp = `What this field means: Operation tells CtrlChecks which Zoom meeting action to run for the selected Zoom account.

Why it matters: Each option calls a different Zoom API path. Create Meeting makes a new meeting, List Meetings reads scheduled meetings for the connected user, Get Meeting reads one meeting, Update Meeting changes one meeting, and Delete Meeting removes one meeting.

When to fill it: Choose it every time. The backend requires this field and defaults to Create Meeting only when old workflow data does not include a value.

What to enter: Pick Create Meeting when a form, CRM deal, or booking should create a new Zoom room. Pick List Meetings when you need recent scheduled meeting IDs. Pick Get Meeting when a later step needs the full details for one meeting. Pick Update Meeting when the workflow should change topic, duration, or start time. Pick Delete Meeting only when the workflow is meant to cancel a meeting.

Where the value comes from: This is usually a fixed choice you set while building the workflow, not a value from Zoom. AI-generated workflows can set it from the requested action.

How to use it later: The selected operation controls whether later nodes can use fields such as {{$json.data.id}}, {{$json.data.join_url}}, {{$json.data.meetings}}, {{$json.data.updated}}, or {{$json.data.deleted}}.

Accepted format: One dropdown value: createMeeting, listMeetings, getMeeting, updateMeeting, or deleteMeeting.

Real workplace example: Use Create Meeting after a sales demo request form, then send {{$json.data.join_url}} to the prospect by email.

If it is empty or wrong: Runtime falls back to createMeeting when empty, or returns an unsupported-operation error when the value is not one of the five supported options.

Common mistake: Choosing Delete Meeting for a cancellation workflow without first mapping the exact meetingId returned by Create Meeting, List Meetings, or Get Meeting.`;

const topicHelp = `What this field means: Topic is the title Zoom shows for the meeting.

Why it matters: A clear topic helps hosts, guests, calendar users, and downstream notifications understand what the meeting is for. Runtime uses Meeting when Create Meeting is selected and this field is blank.

When to fill it: Fill it for Create Meeting when you want a useful meeting name. Fill it for Update Meeting only when the title should change. Leave it blank on Update Meeting when the existing Zoom title should stay the same.

What to enter: Type a short title, or combine fixed words with workflow data such as Discovery call with {{$json.companyName}}.

Where the value comes from: It often comes from a booking form, CRM opportunity, support ticket, class roster, project name, or calendar request captured earlier in the workflow.

How to use it later: Zoom returns the final topic under {{$json.data.topic}} for create/get/list responses, so later email, Slack, or CRM nodes can repeat the same meeting name.

Accepted format: Plain text. Keep it human-readable and avoid secrets because invitees may see it.

Real workplace example: Q3 Renewal Review - {{$json.accountName}}.

If it is empty or wrong: Create Meeting still runs with the generic title Meeting. Update Meeting ignores an empty topic and leaves the old title unchanged.

Common mistake: Mapping a whole customer object instead of a single text value like {{$json.companyName}} or {{$json.eventTitle}}.`;

const durationHelp = `What this field means: Duration is the planned meeting length in minutes.

Why it matters: Zoom uses this value for scheduled meeting metadata and calendar planning. Runtime defaults to 60 minutes when Create Meeting runs without a duration.

When to fill it: Fill it for Create Meeting when the meeting should be shorter or longer than one hour. Fill it for Update Meeting only when the planned length should change.

What to enter: Use a number such as 15, 30, 45, 60, or 90. You can also map a numeric value from an earlier booking or event step, such as {{$json.durationMinutes}}.

Where the value comes from: It usually comes from the meeting type, appointment length, training session length, support escalation policy, or calendar booking duration.

How to use it later: Zoom returns duration in meeting details, usually under {{$json.data.duration}}, so later nodes can mention the expected length in confirmations.

Accepted format: Number of minutes. Do not include words like minutes or hour in this field.

Real workplace example: 30 for a customer onboarding kickoff.

If it is empty or wrong: Create Meeting uses 60. Non-numeric text may become an invalid number and cause Zoom to reject the request or save an unexpected value.

Common mistake: Entering 1.5 for a 90-minute meeting. Use 90 instead.`;

const startTimeHelp = `What this field means: Start Time is when the Zoom meeting should begin.

Why it matters: When Start Time is filled, runtime creates or updates a scheduled meeting. When it is blank during Create Meeting, runtime creates an instant meeting instead.

When to fill it: Fill it for scheduled calls, classes, interviews, demos, or handoffs. Leave it blank only when the workflow should create a meeting that can start immediately.

What to enter: Use an ISO 8601 timestamp such as 2026-05-01T10:00:00Z, or map one from a previous step such as {{$json.startsAt}}.

Where the value comes from: It often comes from Calendly, Google Calendar, a form date/time answer, a CRM appointment field, or a scheduling system.

How to use it later: Zoom returns start_time under {{$json.data.start_time}} for create/get/list responses, so later nodes can include the scheduled time in reminders.

Accepted format: ISO 8601 date and time. The Z suffix means UTC; use a timestamp with an offset when your source provides one.

Real workplace example: 2026-05-01T15:30:00Z for a sales demo scheduled in UTC.

If it is empty or wrong: Empty creates an instant meeting on Create Meeting. Wrong formats can make Zoom reject the request or schedule the meeting at the wrong time.

Common mistake: Typing local wording like Friday 3 PM instead of mapping or converting it to an exact timestamp.`;

const meetingIdHelp = `What this field means: Meeting ID identifies the exact Zoom meeting to read, update, or delete.

Why it matters: Zoom accounts can have many meetings with similar names. The ID tells Zoom which single meeting should be changed or removed.

When to fill it: Required for Get Meeting, Update Meeting, and Delete Meeting. It is not used for Create Meeting or List Meetings.

What to enter: Use the numeric Zoom meeting id returned by Create Meeting, List Meetings, or Get Meeting. Map it as {{$json.data.id}} after Create Meeting, or from a list item such as {{$json.data.meetings[0].id}} when your workflow selects one meeting.

Where the value comes from: It comes from an earlier Zoom step, a CRM record where you stored the meeting ID, a calendar event description, or an admin lookup process.

How to use it later: Runtime echoes it in update/delete confirmations as {{$json.data.meetingId}}, which is useful for audit logs and cancellation notices.

Accepted format: Zoom meeting ID text or number, usually digits such as 81234567890. Do not use the whole join URL unless another step extracts the ID first.

Real workplace example: {{$json.zoomMeetingId}} from a support case that stores the scheduled troubleshooting call.

If it is empty or wrong: Runtime returns Zoom getMeeting: meetingId is required, Zoom updateMeeting: meetingId is required, Zoom deleteMeeting: meetingId is required, or Zoom returns a not-found or permission error.

Common mistake: Mapping join_url instead of id. The join URL is for attendees; this field needs the meeting ID.`;

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Choose the Zoom meeting action to run: createMeeting creates a meeting, listMeetings lists scheduled meetings, getMeeting reads one meeting, updateMeeting changes one meeting, and deleteMeeting removes one meeting.',
  helpText: operationHelp,
  options: ['createMeeting', 'listMeetings', 'getMeeting', 'updateMeeting', 'deleteMeeting'],
  example: 'createMeeting',
  notes: 'Create Meeting needs optional Topic, Duration, and Start Time. List Meetings needs no extra fields. Get Meeting needs Meeting ID. Update Meeting needs Meeting ID and any fields you want to change. Delete Meeting needs Meeting ID and should be used carefully because it removes the Zoom meeting.',
};

const topicField: FieldDoc = {
  name: 'Meeting Topic',
  internalKey: 'topic',
  type: 'string',
  required: false,
  description: 'Meeting title used when creating a meeting or changing an existing meeting title.',
  helpText: topicHelp,
  placeholder: 'Weekly Team Sync',
  example: 'Discovery call with {{$json.companyName}}',
};

const durationField: FieldDoc = {
  name: 'Duration',
  internalKey: 'duration',
  type: 'number',
  required: false,
  description: 'Planned meeting length in minutes for create and update operations.',
  helpText: durationHelp,
  placeholder: '30',
  example: '30',
};

const startTimeField: FieldDoc = {
  name: 'Start Time',
  internalKey: 'startTime',
  type: 'string',
  required: false,
  description: 'Scheduled start timestamp for create and update operations; blank create requests become instant meetings.',
  helpText: startTimeHelp,
  placeholder: '2026-05-01T10:00:00Z',
  example: '{{$json.startsAt}}',
};

const meetingIdField: FieldDoc = {
  name: 'Meeting ID',
  internalKey: 'meetingId',
  type: 'string',
  required: true,
  description: 'Zoom meeting ID required when reading, updating, or deleting one existing meeting.',
  helpText: meetingIdHelp,
  placeholder: '81234567890',
  example: '{{$json.data.id}}',
};

const outputDescriptions = {
  createMeeting: 'success: true when Zoom created the meeting. data: raw Zoom meeting details such as id, uuid, topic, start_url, join_url, start_time, duration, and settings. _error and _errorDetails appear when Zoom rejects the request, so the next node can route or log the failure.',
  listMeetings: 'success: true when Zoom returned scheduled meetings. data: raw Zoom list response, usually including meetings, page_count, page_number, page_size, and total_records. _error and _errorDetails appear when authorization or permissions fail.',
  getMeeting: 'success: true when Zoom returned the selected meeting. data: raw Zoom meeting details such as id, uuid, topic, join_url, start_time, duration, timezone, agenda, and settings. _error and _errorDetails appear when the meeting is missing or inaccessible.',
  updateMeeting: 'success: true when Zoom accepted the update. data: { updated: true, meetingId } after Zoom returns HTTP 204, or a raw Zoom response if Zoom returns a body. _error and _errorDetails appear when validation, permissions, or meeting lookup fail.',
  deleteMeeting: 'success: true when Zoom deleted the meeting. data: { deleted: true, meetingId } after Zoom returns HTTP 204. _error and _errorDetails appear when the meeting ID is missing, already gone, or not owned by the connected account.',
};

const operation = (
  name: string,
  value: string,
  description: string,
  fields: FieldDoc[],
  inputValues: Record<string, string>,
  outputExample: Record<string, unknown>,
  outputDescription: string,
  expectedOutput: string,
): OperationDoc => ({
  name,
  value,
  description,
  fields: [operationField, ...fields],
  outputExample,
  outputDescription,
  usageExample: {
    scenario: description,
    inputValues: { operation: value, ...inputValues },
    expectedOutput,
  },
  externalDocsUrl: zoomDocs,
});

export const zoomVideoDoc: NodeDoc = {
  slug: 'zoom_video',
  displayName: 'Zoom Video',
  category: 'Communication',
  logoUrl: '/icons/nodes/zoom_video.svg',
  description: 'Create, list, read, update, and delete Zoom meetings from a workflow using a saved Zoom OAuth2 connection.',
  credentialType: 'Zoom OAuth2 connection stored in Connections and the credential vault',
  credentialSetupSteps: [
    'Connect the Zoom account that owns or manages the meetings this workflow should create, read, update, or delete. The node uses a Zoom OAuth2 credential, not a normal workflow text field.',
    `Approve the Zoom OAuth scopes used by the runtime: ${scopes}. These allow meeting creation, meeting reads, scheduled meeting lists, and a user profile test request.`,
    'CtrlChecks stores the OAuth access token, refresh token, and internal credential reference in Connections and the credential vault. Do not put OAuth tokens, client secrets, passwords, or app credentials in Topic, Meeting ID, Duration, Start Time, or input data.',
    'Use the connection picker or Connections page, click Connect Zoom, sign in to Zoom, approve the requested access, then select the saved Zoom OAuth2 connection on this node.',
    'Test the connection with the Test Zoom action. It calls https://api.zoom.us/v2/users/me, so a successful test proves the token is valid before meeting operations run.',
    'If the OAuth callback fails, confirm the Zoom Marketplace app allow list contains https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback or the environment value behind GENERIC_ZOOM_OAUTH_REDIRECT_URI.',
    'Connect this node to its outgoing line after any trigger or scheduling step. Downstream service nodes still need their own account connection, for example Gmail to email the join link or Slack to notify a channel.',
  ],
  credentialDocsUrl: zoomDocs,
  resources: [
    {
      name: 'Meetings',
      description: 'Create, list, read, update, and delete scheduled or instant Zoom meetings for the connected Zoom user.',
      operations: [
        operation(
          'Create Meeting',
          'createMeeting',
          'Create a new Zoom meeting for the connected user. Use it when a form submission, booking request, support escalation, class enrollment, or CRM event should produce a Zoom link automatically.',
          [topicField, durationField, startTimeField],
          { topic: 'Discovery call with {{$json.companyName}}', startTime: '{{$json.startsAt}}', duration: '30' },
          {
            success: true,
            data: {
              id: 81234567890,
              topic: 'Discovery call with Acme Corp',
              join_url: 'https://zoom.us/j/81234567890',
              start_url: 'https://zoom.us/s/81234567890',
              start_time: '2026-05-01T10:00:00Z',
              duration: 30,
            },
          },
          outputDescriptions.createMeeting,
          'Zoom returns {{$json.success}} and the created meeting under {{$json.data}}. Send {{$json.data.join_url}} to attendees and store {{$json.data.id}} for later update or delete steps.',
        ),
        operation(
          'List Meetings',
          'listMeetings',
          'List the connected user\'s scheduled Zoom meetings. Use it when a workflow needs to look up upcoming meetings before choosing one to read, update, cancel, or copy into a report.',
          [],
          {},
          {
            success: true,
            data: {
              page_size: 30,
              total_records: 2,
              meetings: [
                { id: 81234567890, topic: 'Weekly Team Sync', start_time: '2026-05-01T10:00:00Z', join_url: 'https://zoom.us/j/81234567890' },
              ],
            },
          },
          outputDescriptions.listMeetings,
          'Zoom returns {{$json.success}} and a scheduled meeting list under {{$json.data.meetings}}. A later step can use {{$json.data.meetings[0].id}} when it needs one meeting ID.',
        ),
        operation(
          'Get Meeting',
          'getMeeting',
          'Read the full details for one Zoom meeting. Use it before sending reminders, updating a CRM record, checking the current start time, or confirming that a stored meeting ID is still valid.',
          [meetingIdField],
          { meetingId: '{{$json.zoomMeetingId}}' },
          {
            success: true,
            data: {
              id: 81234567890,
              topic: 'Customer onboarding',
              join_url: 'https://zoom.us/j/81234567890',
              start_time: '2026-05-01T10:00:00Z',
              duration: 45,
              timezone: 'UTC',
            },
          },
          outputDescriptions.getMeeting,
          'Zoom returns {{$json.success}} and the selected meeting details under {{$json.data}}. Use {{$json.data.join_url}}, {{$json.data.topic}}, and {{$json.data.start_time}} in reminders.',
        ),
        operation(
          'Update Meeting',
          'updateMeeting',
          'Change one existing Zoom meeting by ID. Use it when a customer reschedules, a training session gets longer, or an operations team renames a meeting after a case is reassigned.',
          [meetingIdField, topicField, durationField, startTimeField],
          { meetingId: '{{$json.zoomMeetingId}}', topic: 'Rescheduled onboarding with {{$json.companyName}}', startTime: '{{$json.newStartsAt}}', duration: '45' },
          {
            success: true,
            data: {
              updated: true,
              meetingId: '81234567890',
            },
          },
          outputDescriptions.updateMeeting,
          'Zoom returns {{$json.success}} and an update confirmation under {{$json.data.updated}} with {{$json.data.meetingId}} so the next step can log which meeting changed.',
        ),
        operation(
          'Delete Meeting',
          'deleteMeeting',
          'Delete one existing Zoom meeting by ID. Use it only for cancellation workflows where the meeting should be removed after a booking, case, class, or internal event is cancelled.',
          [meetingIdField],
          { meetingId: '{{$json.zoomMeetingId}}' },
          {
            success: true,
            data: {
              deleted: true,
              meetingId: '81234567890',
            },
          },
          outputDescriptions.deleteMeeting,
          'Zoom returns {{$json.success}} and a delete confirmation under {{$json.data.deleted}} with {{$json.data.meetingId}}. Notify attendees from an earlier saved email field, not from deleted meeting details.',
        ),
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Zoom: accessToken is required. Connect a Zoom account via /connections or provide an access token.',
      cause: 'No active Zoom OAuth2 connection was selected or the credential resolver could not inject a token for this node.',
      fix: 'Reconnect Zoom in Connections, select the Zoom OAuth2 connection on this node, test it, and keep tokens in the credential vault instead of normal workflow fields.',
    },
    {
      error: 'Zoom getMeeting: meetingId is required.',
      cause: 'Get Meeting was selected without the Zoom meeting ID that identifies the meeting to read.',
      fix: 'Map the id from Create Meeting, List Meetings, a CRM record, or a stored workflow field such as {{$json.zoomMeetingId}}.',
    },
    {
      error: 'Zoom updateMeeting: meetingId is required.',
      cause: 'Update Meeting needs the existing meeting ID before it can change topic, duration, or start time.',
      fix: 'Fill Meeting ID and only fill Topic, Duration, or Start Time for values that should change.',
    },
    {
      error: 'Zoom deleteMeeting: meetingId is required.',
      cause: 'Delete Meeting was selected without the exact meeting ID to remove.',
      fix: 'Use the numeric meeting id, not the join_url. Add a confirmation or filter step before delete workflows when cancellations are sensitive.',
    },
    {
      error: 'Zoom createMeeting failed (401) / Zoom listMeetings failed (403)',
      cause: 'The Zoom token is expired, the account admin blocked the app, or the connection does not include meeting:write:meeting, meeting:read:meeting, meeting:read:list_meetings, and user:read:user.',
      fix: 'Reconnect Zoom OAuth2, approve all requested scopes, and ask a Zoom admin to allow the marketplace app if installs are restricted.',
    },
    {
      error: 'Zoom updateMeeting failed (404) / Zoom deleteMeeting failed (404)',
      cause: 'The meeting ID is wrong, belongs to a different Zoom user, or the meeting was already deleted.',
      fix: 'Run List Meetings or Get Meeting first with the same connected account, then map the returned {{$json.data.id}} into Meeting ID.',
    },
    {
      error: 'Next node cannot find Zoom meeting fields',
      cause: 'Create/Get/List return raw Zoom data under data, while Update/Delete return confirmation flags under data.updated or data.deleted.',
      fix: 'Use {{$json.data.join_url}} after Create or Get, {{$json.data.meetings}} after List, {{$json.data.updated}} after Update, and {{$json.data.deleted}} after Delete.',
    },
    {
      error: 'Permission denied after Zoom Video',
      cause: 'The next service node is not connected even though the Zoom node itself succeeded.',
      fix: 'Connect each downstream service node with its own account connection, for example Gmail for email delivery or Slack for channel notifications.',
    },
  ],
  relatedNodes: ['google_calendar', 'slack_message', 'google_gmail', 'calendly'],
};
