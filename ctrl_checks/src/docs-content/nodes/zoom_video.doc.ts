import type { NodeDoc, OperationDoc } from '../types';

const scopes = 'meeting:write:meeting, meeting:read:meeting, meeting:read:list_meetings, user:read:user';
const zoomDocs = 'https://developers.zoom.us/docs/integrations/oauth/';

const outputExample = {
  success: true,
  data: {
    id: 81234567890,
    topic: 'Weekly Standup',
    join_url: 'https://zoom.us/j/81234567890',
    start_time: '2026-05-01T10:00:00Z',
  },
};

const outputDescription = 'success: True when Zoom accepted the request. data: The raw Zoom API response, including fields such as id, topic, join_url, start_url, and start_time when Zoom returns them.';

const operation = (
  name: string,
  value: string,
  description: string,
  fields: OperationDoc['fields'],
  inputValues: Record<string, string>,
  expectedOutput: string,
): OperationDoc => ({
  name,
  value,
  description,
  fields,
  outputExample,
  outputDescription,
  usageExample: {
    scenario: description,
    inputValues,
    expectedOutput,
  },
  externalDocsUrl: zoomDocs,
});

const meetingIdField = {
  name: 'Meeting ID',
  internalKey: 'meetingId',
  type: 'string' as const,
  required: true,
  description: 'Zoom meeting ID for the meeting to read, update, or delete.',
  helpText: 'Use the id returned by Create Meeting or List Meetings.',
  placeholder: '81234567890',
  example: '81234567890',
};

const updateFields = [
  meetingIdField,
  {
    name: 'Topic',
    internalKey: 'topic',
    type: 'string' as const,
    required: false,
    description: 'New meeting topic/title.',
    placeholder: 'Weekly Standup',
    example: 'Weekly Standup',
  },
  {
    name: 'Duration',
    internalKey: 'duration',
    type: 'number' as const,
    required: false,
    description: 'Meeting duration in minutes.',
    placeholder: '30',
    example: '30',
  },
  {
    name: 'Start Time',
    internalKey: 'startTime',
    type: 'string' as const,
    required: false,
    description: 'Scheduled start time in ISO 8601 format.',
    placeholder: '2026-05-01T10:00:00Z',
    example: '2026-05-01T10:00:00Z',
  },
];

export const zoomVideoDoc: NodeDoc = {
  slug: 'zoom_video',
  displayName: 'Zoom Video',
  category: 'Communication',
  logoUrl: '/icons/nodes/zoom_video.svg',
  description: 'Create and manage Zoom meetings using a Zoom OAuth connection.',
  credentialType: 'Zoom OAuth2',
  credentialSetupSteps: [
    'Use the Zoom OAuth2 connection picker in the Debug or Properties panel.',
    'Click + Add to start the generic CtrlChecks OAuth flow for Zoom.',
    `Approve these scopes in Zoom: ${scopes}.`,
    'The Zoom Marketplace app must allow the callback URL https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback.',
    'After redirect, select the saved Zoom OAuth2 connection on the node.',
  ],
  credentialDocsUrl: zoomDocs,
  resources: [
    {
      name: 'Meetings',
      description: 'Create, list, read, update, and delete Zoom meetings.',
      operations: [
        operation(
          'Create Meeting',
          'createMeeting',
          'Create a Zoom meeting for the connected user.',
          updateFields.filter((field) => field.internalKey !== 'meetingId'),
          { topic: '{{$json.title}}', startTime: '{{$json.startsAt}}', duration: '30' },
          'Zoom returns the created meeting, including id, join_url, and start_url when available.',
        ),
        operation(
          'List Meetings',
          'listMeetings',
          'List scheduled Zoom meetings for the connected user.',
          [],
          {},
          'Zoom returns a meetings collection under data.',
        ),
        operation(
          'Get Meeting',
          'getMeeting',
          'Get details for one Zoom meeting.',
          [meetingIdField],
          { meetingId: '{{$json.id}}' },
          'Zoom returns the selected meeting details under data.',
        ),
        operation(
          'Update Meeting',
          'updateMeeting',
          'Update topic, duration, or start time for one Zoom meeting.',
          updateFields,
          { meetingId: '{{$json.id}}', topic: '{{$json.newTitle}}', duration: '45' },
          'Zoom returns success with the updated meeting ID when the API responds with 204.',
        ),
        operation(
          'Delete Meeting',
          'deleteMeeting',
          'Delete one Zoom meeting.',
          [meetingIdField],
          { meetingId: '{{$json.id}}' },
          'Zoom returns success with deleted: true when the API responds with 204.',
        ),
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Authentication failed',
      cause: 'The Zoom OAuth connection is missing, expired, or lacks the required meeting scopes.',
      fix: 'Reconnect Zoom OAuth2 in CtrlChecks Connections, then select it on the node.',
    },
    {
      error: 'meetingId is required',
      cause: 'Get, update, and delete operations need a Zoom meeting ID.',
      fix: 'Use the id from a previous Create Meeting or List Meetings step.',
    },
    {
      error: 'OAuth redirect failed',
      cause: 'The Zoom Marketplace app redirect URL does not match the worker callback URL.',
      fix: 'Add https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback to the Zoom app allow list.',
    },
  ],
  relatedNodes: ['google_calendar', 'slack', 'google_gmail'],
};
