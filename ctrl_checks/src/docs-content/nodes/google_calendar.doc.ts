import type { NodeDoc } from '../types';

const operationHelpText = `What this field means: Operation chooses which Google Calendar event action this node performs.

Why it matters: It decides which Calendar API call runs and which other fields become required.

When to fill it: Choose it first, before filling any other field.

What to enter: Choose list to fetch events in a time range, create to add a new event, update to change an existing event, or delete to remove one. Runtime also supports get (fetch one event by ID), quickAdd (create an event from a plain-English sentence), and move (transfer an event to a different calendar) — these three are not yet in this dropdown but work when set directly in workflow JSON, typically by an AI-generated workflow.

Where the value comes from: This is a fixed dropdown choice made while building the workflow.

How to use it later: The output shape depends on the operation — list returns an items array of event objects, while get/create/update/quickAdd/move return a single raw Google Calendar event object merged directly into $json, and delete returns only {success: true}.

Accepted format: One of list, create, update, or delete from the visual dropdown (or get, quickAdd, move when set directly in workflow JSON).

Real workplace example: Use list to show a team's meetings for the week, create to book a new interview slot, update to change a meeting's time, and delete to cancel it.

If it is empty or wrong: Runtime defaults to list when missing, and returns "Unknown resource ... or operation ..." for any unsupported value.

Common mistake: Choosing update or delete without filling Event ID — Google Calendar cannot identify which event to change without it.

Dropdown options: list fetches events between Time Min and Time Max and needs only Calendar ID. create adds a new event and needs Calendar ID, Event Title, Start Time, and End Time. update changes an existing event and needs Calendar ID and Event ID, plus whichever fields are changing. delete removes an event and needs Calendar ID and Event ID.`;

const resourceHelpText = `What this field means: Resource is an internal field that selects which Google Calendar API area this node talks to — this node's visual panel always uses the event resource.

Why it matters: Google Calendar's API is organized into several resources (event, calendar, calendarList, acl, settings, colors, freebusy, watch); this node's runtime supports all of them, but the visual panel only exposes event-based operations.

When to fill it: Never fill it manually in the visual panel — it defaults to event automatically. Only relevant when a workflow JSON is built or edited directly (typically by AI generation) to reach one of the other resources.

What to enter: Leave it unset in the visual panel. If editing workflow JSON directly, one of event, calendar, calendarList, eventInstance, acl, settings, colors, freebusy, or watch.

Where the value comes from: The visual panel sets this internally; it is not shown as a field to fill.

How to use it later: This does not appear in the node's own output; it only routes which internal handler runs.

Accepted format: One of the resource names above.

Real workplace example: Every event booked, listed, updated, or cancelled through the visual panel uses resource=event automatically; no manual entry is needed.

If it is empty or wrong: Runtime defaults to event. An unrecognized value combined with an unsupported operation for it returns "Unknown resource ... or operation ...".

Common mistake: Assuming this field needs to be typed manually in the visual panel — it does not; it is set behind the scenes.`;

const credentialIdHelpText = `What this field means: Credential ID is an internal reference to a specific saved Google connection, used only in advanced multi-account setups.

Why it matters: Almost every workflow does not need this — Google Calendar automatically uses the Google account connected for this workflow.

When to fill it: Leave it empty unless you specifically manage multiple Google connections.

What to enter: A saved credential reference, normally generated and stored by the Connections system itself, not typed by hand.

Where the value comes from: The credential system (Connections) generates and stores this value when you connect a Google account.

How to use it later: This field does not appear in the node's own output; the resolved Google account is used silently to authorize Calendar API calls.

Accepted format: An internal credential reference string.

Real workplace example: Most workflows never touch this field — a single connected Google account in Connections is enough for every Calendar node.

If it is empty or wrong: Empty is the normal, expected state; Calendar then resolves the connected Google account automatically.

Common mistake: Typing an email address or password into this field — it is not a login field.`;

const calendarIdHelpText = `What this field means: Calendar ID identifies which specific Google Calendar this operation reads or writes.

Why it matters: A Google account can have many calendars (personal, shared, team); this tells the API exactly which one to use.

When to fill it: Always required for every event operation.

What to enter: primary for the connected account's own default calendar, or the specific calendar's ID/email address for a shared or secondary calendar.

Where the value comes from: For shared calendars, open Google Calendar -> the calendar's settings -> "Integrate calendar" -> Calendar ID.

How to use it later: This is not echoed back as a top-level field, but it determines which calendar the returned event's htmlLink and organizer refer to.

Accepted format: The literal word primary, or a calendar ID that looks like an email address (often ending in @group.calendar.google.com for shared calendars).

Real workplace example: Use primary for personal reminders, or a shared "Team Interviews" calendar ID for scheduling candidate interviews.

If it is empty or wrong: Runtime throws "calendarId is required", or a wrong ID returns a Calendar API error such as "Not Found".

Common mistake: Pasting the calendar's display name instead of its ID/email address.`;

const eventIdHelpText = `What this field means: Event ID identifies the specific calendar event this Get, Update, Delete, or Move operation should act on.

Why it matters: Calendar needs to know exactly which existing event to change or remove.

When to fill it: Required for get, update, delete, and move. Not used for list or create (create generates a new ID automatically).

What to enter: Map {{$json.id}} from a previous List step's items array, or from a previous Create/Update step's own output.

Where the value comes from: A previous Google Calendar List, Create, or Update step's output includes id for each event.

How to use it later: The same ID is echoed back at {{$json.id}} after update, useful for chaining further changes.

Accepted format: A Google Calendar event ID string.

Real workplace example: Loop over {{$json.items}} from a List step and use each item's {{$json.id}} to update or cancel that specific meeting.

If it is empty or wrong: Runtime throws "calendarId and eventId are required" (or a similar combined message per operation). A wrong or already-deleted ID returns a Calendar API "Not Found" error.

Common mistake: Reusing an Event ID from a different calendar than the one specified in Calendar ID — event IDs are only valid within their original calendar.`;

const summaryHelpText = `What this field means: Event Title (summary) is the short title shown for the event in Google Calendar.

Why it matters: It is the first thing people see in their calendar view and in meeting notifications.

When to fill it: Required for create. Optional for update — only include it if the title is changing.

What to enter: A short, clear title such as "Team Standup" or "Interview: {{$json.candidateName}}".

Where the value comes from: Type it directly, or map it from upstream data such as a booking form or CRM record.

How to use it later: The saved title is echoed back at {{$json.summary}} after create/update/get/list.

Accepted format: Plain text.

Real workplace example: "Interview: {{$json.candidateName}} for {{$json.role}}".

If it is empty or wrong: Runtime throws "summary is required" for create when blank. Update without a value simply keeps the existing title.

Common mistake: Leaving this generic ("Meeting") for every event, making the calendar hard to scan at a glance.`;

const startTimeHelpText = `What this field means: Start Time is the moment this event begins, entered as a single ISO 8601 timestamp.

Why it matters: Runtime automatically converts this into the Calendar API's required {dateTime: "..."} object format before sending the request — you do not need to build that object yourself.

When to fill it: Required for create. Optional for update — only include it if the event is being rescheduled.

What to enter: A full ISO 8601 date-time such as 2025-01-15T10:00:00Z (UTC) or with an offset such as 2025-01-15T10:00:00-05:00.

Where the value comes from: Type a fixed time, or map one from an upstream scheduling form, e.g. {{$json.startTime}}.

How to use it later: The saved start is echoed back at {{$json.start}} (as an object with dateTime) after create/update/get/list.

Accepted format: ISO 8601 date-time string with timezone offset or Z for UTC.

Real workplace example: "2025-01-15T14:00:00Z" for a 2pm UTC interview slot.

If it is empty or wrong: Runtime throws "calendarId, start, and end are required" for create when both Start Time and the advanced Start field are empty. An invalid timestamp format returns a Calendar API validation error.

Common mistake: Providing a date without a time (like 2025-01-15) — Calendar expects a full date-time for timed events, or a separate all-day event format that this field does not build automatically.`;

const endTimeHelpText = `What this field means: End Time is the moment this event ends, entered as a single ISO 8601 timestamp.

Why it matters: Like Start Time, runtime automatically converts this into the Calendar API's {dateTime: "..."} object format.

When to fill it: Required for create. Optional for update — only include it if the event's end time is changing.

What to enter: A full ISO 8601 date-time such as 2025-01-15T11:00:00Z, which must be after Start Time.

Where the value comes from: Type a fixed time, or map one from an upstream scheduling form, e.g. {{$json.endTime}}.

How to use it later: The saved end is echoed back at {{$json.end}} (as an object with dateTime) after create/update/get/list.

Accepted format: ISO 8601 date-time string with timezone offset or Z for UTC.

Real workplace example: "2025-01-15T15:00:00Z" to end a 2pm UTC interview slot at 3pm.

If it is empty or wrong: Runtime throws "calendarId, start, and end are required" for create when both End Time and the advanced End field are empty. An end time before the start time returns a Calendar API validation error.

Common mistake: Setting End Time earlier than Start Time, which Google Calendar rejects.`;

const descriptionHelpText = `What this field means: Description is the longer event details text shown when someone opens the event in Google Calendar.

Why it matters: Runtime automatically packages this into the eventData.description field sent to the Calendar API.

When to fill it: Optional for create and update.

What to enter: Meeting agenda, joining instructions, or any longer context attendees should see.

Where the value comes from: Type it directly, or map it from an earlier step such as a form's notes field or an AI-generated agenda.

How to use it later: The saved description is echoed back inside {{$json.description}} after create/update/get.

Accepted format: Plain text; Google Calendar also supports basic HTML in this field.

Real workplace example: "Quarterly planning review. Please bring your team's roadmap doc."

If it is empty or wrong: Empty is fine and simply leaves the event without extra details.

Common mistake: Putting the meeting location in Description instead of a dedicated location field — this node does not currently expose a separate Location field in the visual panel.`;

const timeMinHelpText = `What this field means: Time Min is the earliest moment List should include events from.

Why it matters: Without a lower bound, List can return very old events mixed in with upcoming ones.

When to fill it: Optional for list; leave empty to include events from any time in the past.

What to enter: An ISO 8601 timestamp, often the current time such as {{$now}} for "from now onward."

Where the value comes from: Use {{$now}} for "from today," or a fixed date for historical reporting.

How to use it later: This narrows which events appear in {{$json.items}}; it is not echoed back as its own output field.

Accepted format: ISO 8601 date-time string.

Real workplace example: {{$now}} to list only upcoming meetings for a daily digest.

If it is empty or wrong: Empty returns events without a lower time bound, which can include far-past events.

Common mistake: Setting Time Min without also setting Time Max, expecting the result to be limited to a specific window — Time Max still needs to be set separately.`;

const timeMaxHelpText = `What this field means: Time Max is the latest moment List should include events until.

Why it matters: Combined with Time Min, it defines the exact reporting or lookup window.

When to fill it: Optional for list; leave empty to include events with no upper time bound.

What to enter: An ISO 8601 timestamp, such as one week from now for a weekly digest.

Where the value comes from: Compute or map a future timestamp from an earlier step, or use a fixed date for a specific reporting period.

How to use it later: This narrows which events appear in {{$json.items}}; it is not echoed back as its own output field.

Accepted format: ISO 8601 date-time string.

Real workplace example: A timestamp seven days after {{$now}} to list "this week's meetings."

If it is empty or wrong: Empty returns events without an upper time bound, which can include far-future recurring events.

Common mistake: Using a date-only value like 2025-01-31 without a time component in contexts expecting a precise cutoff moment.`;

const maxResultsHelpText = `What this field means: Max Results caps how many events List can return in one run.

Why it matters: It controls how much data comes back per page and how long the API call takes.

When to fill it: Optional for list.

What to enter: A whole number such as 10, 50, or 250.

Where the value comes from: This is a fixed workflow design choice based on how many events downstream nodes should realistically handle per run.

How to use it later: {{$json.items}} contains at most this many events per page; use returnAll-style looping in workflow JSON for full pagination beyond one page.

Accepted format: A positive integer.

Real workplace example: Set to 10 for a daily "next 10 meetings" digest.

If it is empty or wrong: Runtime defaults to 250 when left empty.

Common mistake: Setting this very low and assuming it also filters by date — use Time Min/Time Max for date filtering, not Max Results.`;

const qHelpText = `What this field means: Search Query is a free-text filter for List, matching event titles, descriptions, locations, and attendees.

Why it matters: It narrows a long calendar down to only relevant events.

When to fill it: Optional for list.

What to enter: Plain keywords, such as a project name or a person's name.

Where the value comes from: Type a fixed keyword, or map one from an earlier step such as a search request.

How to use it later: This only narrows which events appear in {{$json.items}}; it is not echoed back as its own field.

Accepted format: Plain text.

Real workplace example: "budget review" to find every meeting related to a specific recurring topic.

If it is empty or wrong: Empty returns all events in the time range with no keyword filtering.

Common mistake: Expecting Gmail-style search operators (like from: or subject:) — Calendar's search is simple free-text, not operator-based.`;

const startHelpText = `What this field means: Start is the advanced, raw Calendar API object form of the event start time, used instead of Start Time when you need an all-day date or explicit per-event timezone.

Why it matters: The Calendar API itself expects start as an object ({dateTime} for timed events or {date} for all-day events), not a plain string — Start Time exists precisely to hide this from most users.

When to fill it: Optional advanced alternative to Start Time. Fill it directly (typically via AI-generated workflow JSON) when you need an all-day event or a specific timeZone field.

What to enter: A JSON object such as {"dateTime": "2025-01-15T10:00:00Z"} for a timed event, or {"date": "2025-01-15"} for an all-day event.

Where the value comes from: Build it directly, or map an object produced by an earlier step that already has this shape (such as {{$json.start}} from a previous Calendar step).

How to use it later: The saved start is echoed back at {{$json.start}} after create/update/get/list.

Accepted format: A JSON object with either dateTime or date, and optionally timeZone.

Real workplace example: {"date": "2025-03-01"} to create an all-day company holiday event.

If it is empty or wrong: If both Start and Start Time are empty, create throws "calendarId, start, and end are required".

Common mistake: Filling both Start and Start Time with different values — Start (this advanced field) takes priority since Start Time is only converted into it when Start is empty.`;

const endHelpText = `What this field means: End is the advanced, raw Calendar API object form of the event end time, used instead of End Time when you need an all-day date or explicit per-event timezone.

Why it matters: Like Start, the Calendar API expects end as an object, not a plain string.

When to fill it: Optional advanced alternative to End Time. Fill it directly (typically via AI-generated workflow JSON) when you need an all-day event or a specific timeZone field.

What to enter: A JSON object such as {"dateTime": "2025-01-15T11:00:00Z"}, or {"date": "2025-01-16"} for an all-day event (Calendar's all-day end date is exclusive).

Where the value comes from: Build it directly, or map an object produced by an earlier step.

How to use it later: The saved end is echoed back at {{$json.end}} after create/update/get/list.

Accepted format: A JSON object with either dateTime or date, and optionally timeZone.

Real workplace example: {"date": "2025-03-02"} to close a single all-day event that starts 2025-03-01.

If it is empty or wrong: If both End and End Time are empty, create throws "calendarId, start, and end are required".

Common mistake: Setting an all-day event's end date the same as its start date — Calendar's all-day end date is exclusive, so a one-day event needs an end date one day after the start date.`;

const eventDataHelpText = `What this field means: Event Data is an advanced, raw object for extra Calendar event details beyond title/time/description — attendees, reminders, recurrence, color, and visibility.

Why it matters: It lets a single field carry the full richness of the Calendar API's event resource without needing a dedicated field for every possible option.

When to fill it: Optional for create and update. Description alone is enough for simple events; use this when attendees, reminders, recurrence, or visibility need to be set.

What to enter: A JSON object such as {"attendees": [{"email": "user@example.com"}], "reminders": {"useDefault": false, "overrides": [{"method": "popup", "minutes": 10}]}}.

Where the value comes from: Build it directly, or map a previously constructed object from an earlier step.

How to use it later: Runtime merges Description into this object automatically; the combined result is reflected in the saved event's own fields (such as {{$json.attendees}}).

Accepted format: A JSON object matching Google Calendar's event resource fields (attendees, reminders, recurrence, colorId, transparency, visibility, timeZone).

Real workplace example: {"attendees": [{"email": "{{$json.candidateEmail}}"}], "reminders": {"useDefault": true}} for an interview invite with an attendee added.

If it is empty or wrong: Empty is fine — the event is created with just title, time, and description. Invalid JSON is ignored by the description-merge step but can cause a Calendar API validation error if malformed once sent.

Common mistake: Putting the event title or time inside Event Data instead of using Event Title/Start Time/End Time — those dedicated fields take priority for title and time.`;

const textHelpText = `What this field means: Text is a plain-English sentence Google Calendar parses into a full event, used only by the quickAdd operation.

Why it matters: It lets a workflow create an event without separately computing title, start, and end — Google's own natural-language parser figures out the details.

When to fill it: Required when Operation is quickAdd (available via workflow JSON; not yet in the visual dropdown).

What to enter: A natural sentence such as "Team lunch Friday 12pm to 1pm at the cafe".

Where the value comes from: Type it directly, or map a sentence generated by an AI Agent step.

How to use it later: The parsed event (with its own summary/start/end) is returned directly, echoed at {{$json.summary}}, {{$json.start}}, and {{$json.end}}.

Accepted format: Plain English text describing an event, date, and time.

Real workplace example: "Interview with {{$json.candidateName}} tomorrow at 2pm for 30 minutes".

If it is empty or wrong: Runtime throws "calendarId and text are required" when blank. Ambiguous phrasing may parse into an unexpected time.

Common mistake: Expecting precise control over reminders or attendees with quickAdd — use create with Event Data instead when exact structured details matter.`;

const destinationCalendarIdHelpText = `What this field means: Destination Calendar ID is the target calendar an event should be moved to, used only by the move operation.

Why it matters: Move needs both the source (Calendar ID) and destination calendar to transfer an event between them.

When to fill it: Required when Operation is move (available via workflow JSON; not yet in the visual dropdown).

What to enter: The calendar ID (or primary) of the calendar the event should end up on.

Where the value comes from: Same place as Calendar ID — Google Calendar's "Integrate calendar" settings for the target calendar.

How to use it later: After a successful move, the event's data reflects its new calendar; use a follow-up Get with the new Calendar ID to confirm.

Accepted format: The literal word primary, or a calendar ID/email-style string.

Real workplace example: Move an event from a personal calendar to a shared "Team Events" calendar once it's confirmed.

If it is empty or wrong: Runtime throws "calendarId, eventId, and destinationCalendarId are required" when blank.

Common mistake: Providing the same calendar for both Calendar ID and Destination Calendar ID, which is a no-op move.`;

export const googleCalendarDoc: NodeDoc = {
  slug: 'google_calendar',
  displayName: 'Google Calendar',
  category: 'Google',
  logoUrl: '/icons/nodes/google_calendar.svg',
  description: 'List, create, update, and delete Google Calendar events through the connected Google account. Runtime also supports get, quickAdd, and move for events, plus calendar/calendarList/acl/settings/colors/freebusy/watch resources, when configured directly in workflow JSON (not exposed in this visual panel).',
  credentialType: 'Google OAuth (Calendar scope) - saved in Connections and shared with other Google nodes',
  credentialSetupSteps: [
    'In CtrlChecks, open Connections -> Add Connection -> Google, sign in with the Google account whose calendar this node should use, and grant the Calendar permission requested.',
    'The OAuth token is stored in the credential system. Do not paste Google tokens, client secrets, or passwords into Google Calendar workflow fields; Credential Id is an internal reference only, not a login field.',
    'The connected Google account needs at least "See all event details" access to the target calendar for List/Get, and "Make changes to events" access for Create/Update/Delete/Move.',
    'The same Google connection can also power Gmail, Google Sheets, and Google Drive nodes if those scopes are granted.',
    'Connect the Google Calendar output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.items}}, {{$json.id}}, {{$json.htmlLink}}, or {{$json._error}}.',
    'Downstream service node account connection setup is still required for nodes after Google Calendar; the Google connection only authorizes Calendar (and optionally Gmail/Sheets/Drive) access.',
  ],
  credentialDocsUrl: 'https://developers.google.com/calendar/api/auth',
  resources: [
    {
      name: 'Event',
      description: 'List, fetch, create, update, delete, quick-add, or move events on a Google Calendar. List/Create/Update/Delete are in the visual Operation dropdown; Get/QuickAdd/Move are runtime-supported for AI-generated or hand-edited workflow JSON.',
      operations: [
        {
          name: 'List Events',
          value: 'list',
          description: 'Fetches events from a calendar within an optional time range and keyword filter, returning an array of raw event objects for reporting, digests, or downstream loops.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Calendar action to run.', helpText: operationHelpText, placeholder: 'list', example: 'list', defaultValue: 'list', options: ['list', 'create', 'update', 'delete', 'get', 'quickAdd', 'move'] },
            { name: 'Resource', internalKey: 'resource', type: 'string', required: false, description: 'Internal API area; always event from the visual panel.', helpText: resourceHelpText, placeholder: 'event', example: 'event', defaultValue: 'event' },
            { name: 'Credential Id', internalKey: 'credentialId', type: 'string', required: false, description: 'Advanced: internal reference to a specific saved Google connection.', helpText: credentialIdHelpText, placeholder: '', example: '' },
            { name: 'Calendar Id', internalKey: 'calendarId', type: 'string', required: true, description: 'Which Google Calendar to use.', helpText: calendarIdHelpText, placeholder: 'primary', example: 'primary' },
            { name: 'Time Min', internalKey: 'timeMin', type: 'string', required: false, description: 'Earliest event time to include.', helpText: timeMinHelpText, placeholder: '{{$now}}', example: '{{$now}}' },
            { name: 'Time Max', internalKey: 'timeMax', type: 'string', required: false, description: 'Latest event time to include.', helpText: timeMaxHelpText, placeholder: '2025-01-22T00:00:00Z', example: '2025-01-22T00:00:00Z' },
            { name: 'Max Results', internalKey: 'maxResults', type: 'number', required: false, description: 'Maximum number of events to return.', helpText: maxResultsHelpText, placeholder: '250', example: '10', defaultValue: '250' },
            { name: 'Query', internalKey: 'q', type: 'string', required: false, description: 'Free-text keyword filter.', helpText: qHelpText, placeholder: 'budget review', example: 'standup' },
          ],
          outputExample: {
            items: [
              { id: 'abc123def456', summary: 'Team Standup', start: { dateTime: '2025-01-15T09:00:00Z' }, end: { dateTime: '2025-01-15T09:15:00Z' }, htmlLink: 'https://www.google.com/calendar/event?eid=...' },
            ],
          },
          outputDescription: 'items: array of raw Google Calendar event objects (id, summary, start, end, htmlLink, attendees, and more), one per matching event. There is no separate count field — use items.length. Failures return _error and _errorDetails instead of items.',
          usageExample: {
            scenario: 'List today\'s meetings for a daily standup digest',
            inputValues: { operation: 'list', calendarId: 'primary', timeMin: '{{$now}}', timeMax: '', maxResults: '10', q: '' },
            expectedOutput: 'Returns up to 10 upcoming events. Loop over {{$json.items}} and map {{$json.summary}} and {{$json.start.dateTime}} into a Slack or Email digest.',
          },
          externalDocsUrl: 'https://developers.google.com/calendar/api/v3/reference/events/list',
        },
        {
          name: 'Create Event',
          value: 'create',
          description: 'Adds a new event to a calendar. Start Time/End Time are converted automatically into the Start/End objects the Calendar API expects; Description is merged into Event Data automatically.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Calendar action to run.', helpText: operationHelpText, placeholder: 'create', example: 'create', defaultValue: 'list', options: ['list', 'create', 'update', 'delete', 'get', 'quickAdd', 'move'] },
            { name: 'Calendar Id', internalKey: 'calendarId', type: 'string', required: true, description: 'Which Google Calendar to add the event to.', helpText: calendarIdHelpText, placeholder: 'primary', example: 'primary' },
            { name: 'Event Title', internalKey: 'summary', type: 'string', required: true, description: 'The event title.', helpText: summaryHelpText, placeholder: 'Meeting with Team', example: 'Interview: {{$json.candidateName}}' },
            { name: 'Start Time (ISO 8601)', internalKey: 'startTime', type: 'string', required: true, description: 'Event start; auto-converted to Start.', helpText: startTimeHelpText, placeholder: '2024-01-15T10:00:00Z', example: '2025-01-15T14:00:00Z' },
            { name: 'End Time (ISO 8601)', internalKey: 'endTime', type: 'string', required: true, description: 'Event end; auto-converted to End.', helpText: endTimeHelpText, placeholder: '2024-01-15T11:00:00Z', example: '2025-01-15T15:00:00Z' },
            { name: 'Description', internalKey: 'description', type: 'textarea', required: false, description: 'Event details text; auto-merged into Event Data.', helpText: descriptionHelpText, placeholder: 'Event description...', example: 'Quarterly planning review.' },
            { name: 'Start', internalKey: 'start', type: 'json', required: false, description: 'Advanced raw start object; alternative to Start Time.', helpText: startHelpText, placeholder: '{"dateTime": "2025-01-15T10:00:00Z"}', example: '{"dateTime": "2025-01-15T14:00:00Z"}' },
            { name: 'End', internalKey: 'end', type: 'json', required: false, description: 'Advanced raw end object; alternative to End Time.', helpText: endHelpText, placeholder: '{"dateTime": "2025-01-15T11:00:00Z"}', example: '{"dateTime": "2025-01-15T15:00:00Z"}' },
            { name: 'Event Data', internalKey: 'eventData', type: 'json', required: false, description: 'Advanced attendees/reminders/recurrence/visibility payload.', helpText: eventDataHelpText, placeholder: '{"attendees": [{"email": "user@example.com"}]}', example: '{"attendees": [{"email": "{{$json.candidateEmail}}"}]}' },
          ],
          outputExample: {
            id: 'abc123def456',
            summary: 'Interview: Jordan Lee',
            start: { dateTime: '2025-01-15T14:00:00Z' },
            end: { dateTime: '2025-01-15T15:00:00Z' },
            htmlLink: 'https://www.google.com/calendar/event?eid=...',
            status: 'confirmed',
          },
          outputDescription: 'The raw created Google Calendar event object is merged directly into $json — id, summary, start, end, htmlLink, status, and (when provided) attendees/reminders/recurrence. There is no separate "event" wrapper key. Failures return _error and _errorDetails instead.',
          usageExample: {
            scenario: 'Book a candidate interview slot after a scheduling form is submitted',
            inputValues: { operation: 'create', calendarId: 'primary', summary: 'Interview: {{$json.candidateName}}', startTime: '{{$json.slotStart}}', endTime: '{{$json.slotEnd}}', description: 'Panel interview for {{$json.role}}.' },
            expectedOutput: 'A new event appears on the calendar. Use {{$json.id}} to update or cancel it later, and {{$json.htmlLink}} to share a direct link.',
          },
          externalDocsUrl: 'https://developers.google.com/calendar/api/v3/reference/events/insert',
        },
        {
          name: 'Update Event',
          value: 'update',
          description: 'Changes fields on an existing event, identified by Event ID. Only the fields you fill in are changed; everything else on the event is left as-is.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Calendar action to run.', helpText: operationHelpText, placeholder: 'update', example: 'update', defaultValue: 'list', options: ['list', 'create', 'update', 'delete', 'get', 'quickAdd', 'move'] },
            { name: 'Calendar Id', internalKey: 'calendarId', type: 'string', required: true, description: 'Which Google Calendar the event is on.', helpText: calendarIdHelpText, placeholder: 'primary', example: 'primary' },
            { name: 'Event Id', internalKey: 'eventId', type: 'string', required: true, description: 'Which event to update.', helpText: eventIdHelpText, placeholder: 'abc123def456', example: '{{$json.id}}' },
            { name: 'Event Title', internalKey: 'summary', type: 'string', required: false, description: 'New event title, if changing.', helpText: summaryHelpText, placeholder: 'Meeting with Team', example: 'Interview (Rescheduled): {{$json.candidateName}}' },
            { name: 'Start Time (ISO 8601)', internalKey: 'startTime', type: 'string', required: false, description: 'New start time, if rescheduling.', helpText: startTimeHelpText, placeholder: '2024-01-15T10:00:00Z', example: '2025-01-16T14:00:00Z' },
            { name: 'End Time (ISO 8601)', internalKey: 'endTime', type: 'string', required: false, description: 'New end time, if rescheduling.', helpText: endTimeHelpText, placeholder: '2024-01-15T11:00:00Z', example: '2025-01-16T15:00:00Z' },
            { name: 'Description', internalKey: 'description', type: 'textarea', required: false, description: 'New description text, if changing.', helpText: descriptionHelpText, placeholder: 'Event description...', example: 'Rescheduled due to a conflict.' },
          ],
          outputExample: {
            id: 'abc123def456',
            summary: 'Interview (Rescheduled): Jordan Lee',
            start: { dateTime: '2025-01-16T14:00:00Z' },
            end: { dateTime: '2025-01-16T15:00:00Z' },
            htmlLink: 'https://www.google.com/calendar/event?eid=...',
          },
          outputDescription: 'The raw updated Google Calendar event object is merged directly into $json, reflecting the new values plus anything left unchanged. Failures return _error and _errorDetails instead.',
          usageExample: {
            scenario: 'Reschedule an interview after a candidate requests a new time',
            inputValues: { operation: 'update', calendarId: 'primary', eventId: '{{$json.id}}', startTime: '{{$json.newSlotStart}}', endTime: '{{$json.newSlotEnd}}' },
            expectedOutput: 'The existing event moves to the new time. {{$json.start.dateTime}} confirms the updated slot.',
          },
          externalDocsUrl: 'https://developers.google.com/calendar/api/v3/reference/events/update',
        },
        {
          name: 'Delete Event',
          value: 'delete',
          description: 'Permanently removes an event from a calendar, freeing the time slot and notifying attendees according to Google Calendar\'s default update behavior.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Calendar action to run.', helpText: operationHelpText, placeholder: 'delete', example: 'delete', defaultValue: 'list', options: ['list', 'create', 'update', 'delete', 'get', 'quickAdd', 'move'] },
            { name: 'Calendar Id', internalKey: 'calendarId', type: 'string', required: true, description: 'Which Google Calendar the event is on.', helpText: calendarIdHelpText, placeholder: 'primary', example: 'primary' },
            { name: 'Event Id', internalKey: 'eventId', type: 'string', required: true, description: 'Which event to delete.', helpText: eventIdHelpText, placeholder: 'abc123def456', example: '{{$json.id}}' },
          ],
          outputExample: { success: true },
          outputDescription: 'success: true once the event is deleted. There is no event data in the response since the event no longer exists. Failures return _error and _errorDetails instead.',
          usageExample: {
            scenario: 'Cancel an interview when a candidate withdraws',
            inputValues: { operation: 'delete', calendarId: 'primary', eventId: '{{$json.id}}' },
            expectedOutput: 'The event is removed from the calendar. Use {{$json.success}} to confirm before notifying the team.',
          },
          externalDocsUrl: 'https://developers.google.com/calendar/api/v3/reference/events/delete',
        },
        {
          name: 'Get Event (runtime-supported, not yet in dropdown)',
          value: 'get',
          description: 'Fetches one existing event by ID. Runtime-supported today; reachable by setting operation to get directly in workflow JSON (such as via AI-generated workflows), not yet selectable from the visual Operation dropdown.',
          fields: [
            { name: 'Calendar Id', internalKey: 'calendarId', type: 'string', required: true, description: 'Which Google Calendar the event is on.', helpText: calendarIdHelpText, placeholder: 'primary', example: 'primary' },
            { name: 'Event Id', internalKey: 'eventId', type: 'string', required: true, description: 'Which event to fetch.', helpText: eventIdHelpText, placeholder: 'abc123def456', example: '{{$json.id}}' },
          ],
          outputExample: { id: 'abc123def456', summary: 'Team Standup', start: { dateTime: '2025-01-15T09:00:00Z' }, end: { dateTime: '2025-01-15T09:15:00Z' } },
          outputDescription: 'The raw Google Calendar event object is merged directly into $json. Failures return _error and _errorDetails instead.',
          usageExample: {
            scenario: 'Fetch full event details before deciding whether to reschedule it',
            inputValues: { operation: 'get', calendarId: 'primary', eventId: '{{$json.id}}' },
            expectedOutput: 'Returns the full event. Use {{$json.attendees}} or {{$json.start.dateTime}} in an If/Else step to decide the next action.',
          },
          externalDocsUrl: 'https://developers.google.com/calendar/api/v3/reference/events/get',
        },
        {
          name: 'Quick Add Event (runtime-supported, not yet in dropdown)',
          value: 'quickAdd',
          description: 'Creates an event from a single plain-English sentence, parsed by Google\'s own natural-language engine. Runtime-supported today; reachable by setting operation to quickAdd directly in workflow JSON, not yet selectable from the visual Operation dropdown.',
          fields: [
            { name: 'Calendar Id', internalKey: 'calendarId', type: 'string', required: true, description: 'Which Google Calendar to add the event to.', helpText: calendarIdHelpText, placeholder: 'primary', example: 'primary' },
            { name: 'Text', internalKey: 'text', type: 'string', required: true, description: 'Plain-English event description to parse.', helpText: textHelpText, placeholder: 'Team lunch Friday 12pm to 1pm', example: 'Interview with {{$json.candidateName}} tomorrow at 2pm for 30 minutes' },
          ],
          outputExample: { id: 'abc123def456', summary: 'Team lunch', start: { dateTime: '2025-01-17T12:00:00Z' }, end: { dateTime: '2025-01-17T13:00:00Z' } },
          outputDescription: 'The raw parsed and created Google Calendar event object is merged directly into $json. Failures return _error and _errorDetails instead.',
          usageExample: {
            scenario: 'Let an AI Agent draft a quick meeting invite in plain English',
            inputValues: { operation: 'quickAdd', calendarId: 'primary', text: '{{$json.aiResponse}}' },
            expectedOutput: 'Google Calendar parses the sentence into a full event. Use {{$json.start.dateTime}} to confirm what time it actually parsed to.',
          },
          externalDocsUrl: 'https://developers.google.com/calendar/api/v3/reference/events/quickAdd',
        },
        {
          name: 'Move Event (runtime-supported, not yet in dropdown)',
          value: 'move',
          description: 'Transfers an existing event from one calendar to another. Runtime-supported today; reachable by setting operation to move directly in workflow JSON, not yet selectable from the visual Operation dropdown.',
          fields: [
            { name: 'Calendar Id', internalKey: 'calendarId', type: 'string', required: true, description: 'The event\'s current calendar.', helpText: calendarIdHelpText, placeholder: 'primary', example: 'primary' },
            { name: 'Event Id', internalKey: 'eventId', type: 'string', required: true, description: 'Which event to move.', helpText: eventIdHelpText, placeholder: 'abc123def456', example: '{{$json.id}}' },
            { name: 'Destination Calendar Id', internalKey: 'destinationCalendarId', type: 'string', required: true, description: 'The calendar to move the event to.', helpText: destinationCalendarIdHelpText, placeholder: 'team-events@group.calendar.google.com', example: 'team-events@group.calendar.google.com' },
          ],
          outputExample: { id: 'abc123def456', summary: 'Team Standup', organizer: { email: 'team-events@group.calendar.google.com' } },
          outputDescription: 'The raw Google Calendar event object on its new calendar is merged directly into $json. Failures return _error and _errorDetails instead.',
          usageExample: {
            scenario: 'Move a confirmed event from a personal calendar to a shared team calendar',
            inputValues: { operation: 'move', calendarId: 'primary', eventId: '{{$json.id}}', destinationCalendarId: 'team-events@group.calendar.google.com' },
            expectedOutput: 'The event now appears on the destination calendar. Use {{$json.organizer.email}} in a follow-up Get step to confirm the move.',
          },
          externalDocsUrl: 'https://developers.google.com/calendar/api/v3/reference/events/move',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Google Calendar node: OAuth connection required', cause: 'Neither the workflow owner nor the current user has a Google account connected.', fix: 'Open Connections, add a Google connection, and grant the Calendar permission requested.' },
    { error: 'calendarId is required', cause: 'Calendar Id resolved to empty for an operation that needs it.', fix: 'Fill Calendar Id with primary or a specific calendar ID.' },
    { error: 'calendarId and eventId are required', cause: 'Event Id resolved to empty for get, update, delete, or move.', fix: 'Map {{$json.id}} from a previous List, Create, or Update step.' },
    { error: 'calendarId, start, and end are required', cause: 'Neither Start Time nor the advanced Start field (and/or End Time/End) resolved to a value for create.', fix: 'Fill Start Time and End Time with ISO 8601 timestamps.' },
    { error: 'calendarId and text are required', cause: 'Text resolved to empty for quickAdd.', fix: 'Fill Text with a plain-English event description.' },
    { error: 'calendarId, eventId, and destinationCalendarId are required', cause: 'Destination Calendar Id resolved to empty for move.', fix: 'Fill Destination Calendar Id with the target calendar.' },
    { error: 'Unknown resource "..." or operation "..."', cause: 'Resource/Operation combination is not one runtime supports.', fix: 'Use list, create, update, or delete from the visual dropdown, or get/quickAdd/move via workflow JSON.' },
    { error: 'Google Calendar event.…: … (status: 404)', cause: 'The Calendar API rejected the request — commonly a wrong Calendar Id/Event Id, or insufficient permission on the target calendar.', fix: 'Verify the IDs and confirm the connected account has access to that calendar.' },
    { error: 'Next node cannot find the event fields', cause: 'The downstream node expects a nested "event" object instead of the flat merged fields runtime actually returns.', fix: 'Use {{$json.id}}, {{$json.summary}}, {{$json.start.dateTime}} directly — Calendar event fields are merged straight into $json, not nested under an "event" key.' },
    { error: 'Permission denied after Google Calendar', cause: 'The Google connection only authorizes Calendar (and optionally Gmail/Sheets/Drive) access; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Google Calendar.' },
  ],
  relatedNodes: ['google_calendar_trigger', 'google_gmail', 'google_sheets', 'ai_agent', 'http_request'],
};
