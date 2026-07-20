import type { NodeDoc, OperationDoc } from '../types';

const operationHelp = [
  'What this field is: The Calendly read action this node will run.',
  'Why it matters: Each option calls a different Calendly API endpoint and changes which URI fields matter.',
  'When to fill it: Required for every Calendly node.',
  'What to enter: Choose get_user to identify the connected user, get_events for scheduled events, get_event_types for booking-page types, or get_scheduled_events for scheduled meetings by user URI.',
  'Where the value comes from: Select one option from the dropdown in the node panel.',
  'How to use it later: The output includes {{$json.operation}} plus returned Calendly data, collection, user, and count fields depending on the selected operation.',
  'Accepted format: One of get_events, get_event_types, get_scheduled_events, or get_user.',
  'Real workplace example: Run get_user first, then map {{$json.user.uri}} into a later get_event_types or get_scheduled_events step.',
  'If it is empty or wrong: Runtime returns success false with Unsupported Calendly operation.',
  'Common mistake: Choosing get_events when you need event types. Event types are booking templates; scheduled events are actual booked meetings.',
].join('\n');

const accessTokenHelp = [
  'What this field is: An optional Calendly Personal Access Token fallback for this one node.',
  'Why it matters: The node needs a Calendly token either from Connections or this fallback field before it can call the API.',
  'When to fill it: Leave it blank when you have a saved Calendly connection; fill it only for legacy workflows or quick tests where the panel explicitly asks for a token.',
  'What to enter: A Calendly Personal Access Token copied from Calendly API and Webhooks settings.',
  'Where the value comes from: Prefer CtrlChecks Connections, which stores the token in the credential vault; Calendly shows personal access tokens in account developer settings.',
  'How to use it later: Do not map this as {{$json.accessToken}} into downstream nodes. Save it in Connections so later Calendly steps can reuse the connection safely.',
  'Accepted format: The token string issued by Calendly. Treat it as a secret.',
  'Real workplace example: Save the operations team Calendly token in Connections and leave this field blank in every workflow node.',
  'If it is empty or wrong: Runtime tries the saved Calendly connection; if none is found, it returns success false with a connection required message.',
  'Common mistake: Pasting tokens into normal workflow fields and screenshots. Store secrets in Connections whenever possible.',
].join('\n');

const userUriHelp = [
  'What this field is: The full Calendly API URI for the user whose events or event types should be listed.',
  'Why it matters: get_event_types and get_scheduled_events require a user URI so Calendly knows which account to query.',
  'When to fill it: Required for get_event_types and get_scheduled_events. Optional for get_events. Not needed for get_user.',
  'What to enter: A URI such as https://api.calendly.com/users/AAAAAAAAAAAAAAAA, or a mapped value from a previous Calendly get_user step.',
  'Where the value comes from: Run get_user first and copy {{$json.user.uri}} or the URI from {{$json.data.resource.uri}}.',
  'How to use it later: Later steps can reuse the same user URI with {{$json.user.uri}} when chaining Calendly operations.',
  'Accepted format: Full Calendly API URI beginning with https://api.calendly.com/users/.',
  'Real workplace example: Query all scheduled demos for the sales rep whose URI was returned by the first Calendly step.',
  'If it is empty or wrong: get_event_types and get_scheduled_events return success false with userUri is required, or Calendly returns an API error.',
  'Common mistake: Pasting the public scheduling page URL instead of the API user URI returned by Calendly.',
].join('\n');

const eventTypeUriHelp = [
  'What this field is: The full Calendly API URI for a specific event type, such as a 30-minute demo booking page.',
  'Why it matters: get_scheduled_events can use it to narrow results to meetings booked from one event type.',
  'When to fill it: Optional for get_scheduled_events. Leave it blank to list all scheduled events for the user.',
  'What to enter: A URI such as https://api.calendly.com/event_types/BBBBBBBBBBBBBBBB.',
  'Where the value comes from: Run get_event_types and map the selected item URI from the returned collection.',
  'How to use it later: Use {{$json.collection[0].uri}} from a prior event-types lookup when a later step should filter to one booking type.',
  'Accepted format: Full Calendly API URI beginning with https://api.calendly.com/event_types/.',
  'Real workplace example: Filter scheduled events to only Product Demo calls before sending a CRM follow-up.',
  'If it is empty or wrong: Blank is allowed and lists all scheduled events; a wrong URI can make Calendly return an API error or empty collection.',
  'Common mistake: Using an event UUID or public booking URL instead of the API event type URI.',
].join('\n');

const operationField = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select' as const,
  required: true,
  description: 'Choose which Calendly read action to run.',
  helpText: operationHelp,
  defaultValue: 'get_events',
  options: ['get_events', 'get_event_types', 'get_scheduled_events', 'get_user'],
  example: 'get_user',
};

const accessTokenField = {
  name: 'Personal Access Token',
  internalKey: 'accessToken',
  type: 'string' as const,
  required: false,
  description: 'Optional Calendly token fallback; prefer a saved Calendly connection.',
  helpText: accessTokenHelp,
  placeholder: 'Optional if saved in Connections',
  example: 'Stored in Connections',
};

const userUriField = {
  name: 'User URI',
  internalKey: 'userUri',
  type: 'url' as const,
  required: false,
  description: 'Calendly API user URI used for user-specific list operations.',
  helpText: userUriHelp,
  placeholder: 'https://api.calendly.com/users/AAAAAAAAAAAAAAAA',
  example: '{{$json.user.uri}}',
};

const eventTypeUriField = {
  name: 'Event Type URI',
  internalKey: 'eventTypeUri',
  type: 'url' as const,
  required: false,
  description: 'Optional Calendly API event type URI used to filter scheduled events.',
  helpText: eventTypeUriHelp,
  placeholder: 'https://api.calendly.com/event_types/BBBBBBBBBBBBBBBB',
  example: '{{$json.collection[0].uri}}',
};

const calendlyFields = [operationField, accessTokenField, userUriField, eventTypeUriField];

const makeOperation = (operation: {
  name: string;
  value: string;
  description: string;
  inputValues: Record<string, string>;
  outputExample: Record<string, unknown>;
  scenario: string;
  expectedOutput: string;
}): OperationDoc => ({
  name: operation.name,
  value: operation.value,
  description: operation.description,
  fields: calendlyFields,
  outputExample: operation.outputExample,
  outputDescription: 'On success, the runtime preserves incoming fields and returns success: true, operation, data, collection when Calendly returns a list, user when data.resource is present, and count when collection is an array. Failures return success: false with error and may include the operation; no fields are deleted from the input.',
  usageExample: {
    scenario: operation.scenario,
    inputValues: operation.inputValues,
    expectedOutput: operation.expectedOutput,
  },
  externalDocsUrl: 'https://developer.calendly.com/api-docs',
});

export const calendlyDoc: NodeDoc = {
  slug: 'calendly',
  displayName: 'Calendly',
  category: 'Productivity',
  logoUrl: '/integrations-logos/Calendly.svg',
  description: 'Read Calendly user, event type, and scheduled event data through the Calendly API.',
  credentialType: 'Calendly Personal Access Token Connection',
  credentialSetupSteps: [
    'What this is: The Calendly node uses a saved Calendly Personal Access Token connection so CtrlChecks can call Calendly without exposing the token in workflow fields.',
    'Where to start: In Calendly, open Integrations and Apps, API and Webhooks, then create or copy a Personal Access Token for the account whose schedule you want to read.',
    'How to connect: In CtrlChecks, open Connections, choose Add Connection, select Calendly, and save the Personal Access Token there.',
    'What is stored: CtrlChecks stores the token in the Connections credential vault. The visible Personal Access Token field is only a legacy fallback.',
    'What not to store: Do not paste Calendly tokens into normal workflow fields, examples, comments, screenshots, or downstream nodes.',
    'Test it: Run Get User first. A healthy connection returns data.resource and user with a Calendly user URI that later operations can map.',
    'Connect the output or outgoing line to the next node that should use returned Calendly data such as collection, count, or user.uri.',
    'Every downstream service node still needs its own account connection; the Calendly connection does not authenticate CRM, email, or calendar action nodes.',
  ],
  credentialDocsUrl: 'https://developer.calendly.com/api-docs',
  resources: [
    {
      name: 'Read Calendly data',
      description: 'Calendly operations in this node are read-only. They fetch user, event type, and scheduled event data.',
      operations: [
        makeOperation({
          name: 'Get User',
          value: 'get_user',
          description: 'Fetch the connected Calendly user by calling /users/me. Use this first when you need the Calendly user URI for later get_event_types or get_scheduled_events operations.',
          inputValues: {
            operation: 'get_user',
            accessToken: 'Use saved Calendly connection',
            userUri: '',
            eventTypeUri: '',
          },
          outputExample: {
            success: true,
            operation: 'get_user',
            data: { resource: { uri: 'https://api.calendly.com/users/AAAAAAAAAAAAAAAA', name: 'Asha Rao' } },
            user: { uri: 'https://api.calendly.com/users/AAAAAAAAAAAAAAAA', name: 'Asha Rao' },
          },
          scenario: 'Identify the connected Calendly user before listing that user account booking pages.',
          expectedOutput: 'The next Calendly node can map {{$json.user.uri}} into User URI for get_event_types or get_scheduled_events.',
        }),
        makeOperation({
          name: 'Get Events',
          value: 'get_events',
          description: 'List scheduled events from Calendly. If User URI is provided, the runtime adds it as a user filter; otherwise it calls scheduled_events without that filter.',
          inputValues: {
            operation: 'get_events',
            accessToken: 'Use saved Calendly connection',
            userUri: '{{$json.user.uri}}',
            eventTypeUri: '',
          },
          outputExample: {
            success: true,
            operation: 'get_events',
            data: { collection: [{ name: 'Product Demo', uri: 'https://api.calendly.com/scheduled_events/CCCC' }] },
            collection: [{ name: 'Product Demo', uri: 'https://api.calendly.com/scheduled_events/CCCC' }],
            count: 1,
          },
          scenario: 'Fetch recent scheduled Calendly meetings before notifying the sales operations team.',
          expectedOutput: 'Downstream nodes can read {{$json.collection}} and {{$json.count}} while still keeping the incoming workflow fields.',
        }),
        makeOperation({
          name: 'Get Event Types',
          value: 'get_event_types',
          description: 'List the booking-page event types for a specific Calendly user. This operation requires User URI, usually mapped from an earlier Get User operation.',
          inputValues: {
            operation: 'get_event_types',
            accessToken: 'Use saved Calendly connection',
            userUri: '{{$json.user.uri}}',
            eventTypeUri: '',
          },
          outputExample: {
            success: true,
            operation: 'get_event_types',
            data: { collection: [{ name: '30 Minute Demo', uri: 'https://api.calendly.com/event_types/BBBB' }] },
            collection: [{ name: '30 Minute Demo', uri: 'https://api.calendly.com/event_types/BBBB' }],
            count: 1,
          },
          scenario: 'List sales demo event types so a workflow can pick the right booking page for reporting.',
          expectedOutput: 'A later step can map an event type URI such as {{$json.collection[0].uri}} into Event Type URI.',
        }),
        makeOperation({
          name: 'Get Scheduled Events',
          value: 'get_scheduled_events',
          description: 'List scheduled meetings for a specific Calendly user, optionally filtered to one event type. This is the most precise operation when you already have the user URI and maybe an event type URI.',
          inputValues: {
            operation: 'get_scheduled_events',
            accessToken: 'Use saved Calendly connection',
            userUri: '{{$json.user.uri}}',
            eventTypeUri: '{{$json.collection[0].uri}}',
          },
          outputExample: {
            success: true,
            operation: 'get_scheduled_events',
            data: { collection: [{ name: 'Product Demo', status: 'active' }] },
            collection: [{ name: 'Product Demo', status: 'active' }],
            count: 1,
          },
          scenario: 'Find all booked Product Demo meetings for a sales rep before creating CRM follow-up tasks.',
          expectedOutput: 'The workflow can loop or filter {{$json.collection}} and use {{$json.count}} to decide whether follow-up work is needed.',
        }),
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Calendly connection required',
      cause: 'No saved Calendly connection was found and the fallback accessToken, token, or apiKey field was blank.',
      fix: 'Save a Calendly Personal Access Token in Connections, then leave the node token field blank and run Get User to test the connection.',
    },
    {
      error: 'userUri is required for get_event_types',
      cause: 'The operation needs a Calendly API user URI and User URI was empty.',
      fix: 'Run Get User first, then map {{$json.user.uri}} or {{$json.data.resource.uri}} into User URI.',
    },
    {
      error: 'userUri is required for get_scheduled_events',
      cause: 'Scheduled event lookup needs a specific Calendly user URI.',
      fix: 'Map the user URI from Get User. Add Event Type URI only when you want to filter to one booking type.',
    },
    {
      error: 'Unsupported Calendly operation',
      cause: 'The operation value is not get_user, get_events, get_event_types, or get_scheduled_events.',
      fix: 'Choose one of the visible dropdown options and keep imported workflow configs aligned to those values.',
    },
    {
      error: 'Calendly API error 401, 403, or 404',
      cause: 'The token is invalid, missing access, or the provided user/event type URI does not exist for that account.',
      fix: 'Reconnect Calendly, verify the token can call the Calendly API, and copy API URIs from Calendly responses rather than public booking URLs.',
    },
  ],
  relatedNodes: ['google_calendar', 'outlook_trigger', 'typeform', 'schedulewise'],
};
