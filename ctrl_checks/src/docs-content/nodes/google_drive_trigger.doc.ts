import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const drivePushDocs = 'https://developers.google.com/drive/api/guides/push';

const fieldHelp = {
  folderId: `What this field means: Folder ID is an optional Google Drive folder to use as a scope filter after Drive reports file changes.

Why it matters: Without a folder filter, the trigger can receive accepted changes from the connected account's broader Drive change feed. A folder filter keeps the workflow focused on uploads, edits, or removals in one business folder.

When to fill it: Fill it when the workflow should watch one shared folder, team folder, intake folder, or customer folder. Leave it empty when any file change visible to the connected account should be considered.

What to enter: Paste the Google Drive folder ID, not the folder name or full URL.

Where the value comes from: Open the folder in Google Drive and copy the long ID after /folders/ in the browser URL.

How to use it later: The trigger output includes {{$json.parents}}, so later nodes can confirm which parent folders Google returned for the changed file.

Accepted format: A Google Drive folder ID such as 1a2b3c4d5e6f7g8h9i0j. Use plain ID text only.

Real workplace example: Watch the Vendor Invoices folder so each new PDF can be routed to finance approval.

If it is empty or wrong: Empty watches the broader Drive change feed. A wrong folder ID usually filters out real files because their parents array does not contain that ID.

Common mistake: Pasting the folder name, a file ID, or the whole sharing URL instead of the folder ID.`,
  eventTypes: `What this field means: Event Types controls which normalized Google Drive changes are allowed to start the workflow.

Why it matters: Created files, edited files, trashed files, and removed files can need different business responses. This field prevents a deletion alert from running for every normal upload.

When to fill it: Keep both file_changed and file_deleted when the workflow should react to all meaningful file changes. Use file_changed for document processing. Use file_deleted for removal or audit notifications.

What to enter: file_changed, file_deleted, or both separated by commas.

Where the value comes from: Choose it from the Drive event your workflow cares about after Google reports a change.

How to use it later: The output includes {{$json.eventType}}, so a Switch or If/Else node can route file_changed and file_deleted differently.

Accepted format: Comma-separated text or an array in workflow JSON. The runtime normalizes spaces and hyphens to underscores.

Options and when to choose them: file_changed is used when the Drive change includes a created or updated file. file_deleted is used when Google marks the file removed or trashed.

Real workplace example: file_changed for an AI document-review workflow, and file_deleted for an operations alert when a shared file is removed.

If it is empty or wrong: Empty falls back to file_changed and file_deleted. Unsupported values do not match runtime event types, so events are ignored.

Common mistake: Expecting file_changed to mean only brand-new uploads. Google Drive changes can also represent edits or metadata updates.`,
  query: `What this field means: Keyword Filter is optional text that must appear in the file name before the workflow starts.

Why it matters: Shared folders often contain many files. This field lets one folder feed focused workflows such as invoices, contracts, resumes, statements, or reports without processing unrelated files.

When to fill it: Fill it when the workflow should only handle files whose names contain a stable word or phrase. Leave it empty when every accepted file change should start the workflow.

What to enter: A simple keyword or short phrase such as invoice, contract, resume, bank statement, or QBR.

Where the value comes from: Choose wording your team consistently uses in Drive file names.

How to use it later: Matching events expose {{$json.name}}, {{$json.fileId}}, {{$json.mimeType}}, {{$json.webViewLink}}, and {{$json.parents}} for downstream Drive, AI, notification, or database nodes.

Accepted format: Plain text. Matching is case-insensitive and checks only the normalized file name, not file content.

Real workplace example: invoice for a finance workflow that should process files named Vendor Invoice - July.pdf but ignore onboarding forms.

If it is empty or wrong: Empty accepts all configured event types. A typo or keyword missing from the file name filters out the file change.

Common mistake: Expecting this to search inside PDFs, Docs, or spreadsheets. It only checks the Drive file name returned by the changes API.`,
};

const fields: FieldDoc[] = [
  {
    name: 'Folder ID',
    internalKey: 'folderId',
    type: 'string',
    required: false,
    description: 'Optional Google Drive folder ID used to filter changed files by parent folder.',
    helpText: fieldHelp.folderId,
    placeholder: '1a2b3c4d5e6f7g8h9i0j',
    example: '1a2b3c4d5e6f7g8h9i0j',
  },
  {
    name: 'Event Types',
    internalKey: 'eventTypes',
    type: 'string',
    required: false,
    description: 'Comma-separated Drive change types that may start the workflow.',
    helpText: fieldHelp.eventTypes,
    placeholder: 'file_changed, file_deleted',
    defaultValue: 'file_changed, file_deleted',
    options: ['file_changed', 'file_deleted'],
    example: 'file_changed',
    notes: 'file_changed covers created or updated file changes. file_deleted covers Drive changes where the file is removed or trashed.',
  },
  {
    name: 'Keyword Filter',
    internalKey: 'query',
    type: 'string',
    required: false,
    description: 'Optional keyword matched against the Drive file name.',
    helpText: fieldHelp.query,
    placeholder: 'invoice',
    example: 'invoice',
  },
];

const receiveOperation: OperationDoc = {
  name: 'Receive Drive Change',
  value: 'receive',
  description: 'Start the workflow after Google Drive sends a push notification, CtrlChecks validates the saved channel ID/token, then reads the Drive changes feed from the saved page token. Activation stores a fresh start page token, so older Drive changes do not replay into the workflow.',
  fields,
  outputExample: {
    eventId: 'file_1-1784399000000',
    eventType: 'file_changed',
    source: 'google_drive',
    userId: 'owner@example.com',
    username: 'Owner Name',
    text: 'Vendor Invoice - July.pdf',
    timestamp: '2026-07-18T10:15:00.000Z',
    fileId: 'file_1',
    name: 'Vendor Invoice - July.pdf',
    mimeType: 'application/pdf',
    parents: ['1a2b3c4d5e6f7g8h9i0j'],
    modifiedTime: '2026-07-18T10:15:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/file_1/view',
    raw: { fileId: 'file_1', removed: false, file: { id: 'file_1', name: 'Vendor Invoice - July.pdf' } },
    trigger: 'google_drive',
    workflow_id: 'workflow_123',
    node_id: 'drive-trigger-1',
    sessionId: 'gdrive_workflow_123_file_1',
    _googleDrive: true,
  },
  outputDescription: 'eventId: Unique normalized event ID from fileId and processing time. eventType: file_changed or file_deleted. source: google_drive. userId: owner email when available. username: owner display name when available. text: file name used for query matching. timestamp: modifiedTime or processing time. fileId: raw Google Drive file ID. name: Drive file name. mimeType: Drive MIME type. parents: parent folder IDs returned by Drive. modifiedTime: Drive modified timestamp or null. webViewLink: browser link when Drive provides one. raw: original Drive change object. trigger: google_drive marker. workflow_id: workflow receiving the event. node_id: trigger node ID. sessionId: Drive trigger session ID. _googleDrive: internal true marker.',
  usageExample: {
    scenario: 'Route new invoice PDFs uploaded to a shared finance folder into an approval and summary workflow',
    inputValues: {
      folderId: '1a2b3c4d5e6f7g8h9i0j',
      eventTypes: 'file_changed',
      query: 'invoice',
    },
    expectedOutput: 'The workflow receives the Drive change after Google notifies CtrlChecks. Downstream nodes can use {{$json.name}}, {{$json.fileId}}, {{$json.mimeType}}, {{$json.webViewLink}}, {{$json.parents}}, and {{$json.eventType}}.',
  },
  externalDocsUrl: drivePushDocs,
};

export const googleDriveTriggerDoc: NodeDoc = {
  slug: 'google_drive_trigger',
  displayName: 'Google Drive Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Google-Drive.svg',
  description: 'Start workflows when files are created, updated, trashed, or removed in Google Drive using Drive push notification channels and incremental change sync.',
  credentialType: 'Google OAuth2',
  credentialSetupSteps: [
    'Create or choose a Google OAuth2 connection in Connections. The credential system stores the OAuth access token and refresh token in the credential vault; normal workflow fields only store folder and filter settings.',
    'Make sure the connected Google account has Viewer access or Editor access to the watched Drive files or folder and grants Drive read access. The runtime requests the https://www.googleapis.com/auth/drive.readonly scope for watch registration and change sync.',
    'Test the Google OAuth2 connection from Connections. The shared Google credential test uses Google account identity checks such as https://www.googleapis.com/oauth2/v2/userinfo before Drive API calls run.',
    'Add Google Drive Trigger, select or rely on the saved Google account connection, then set optional Folder ID, Event Types, and any Keyword Filter.',
    'Save and activate the workflow. CtrlChecks automatically gets a fresh Drive changes start page token and creates a Google Drive web_hook channel pointed at the generated webhook URL, so older changes do not replay.',
    'The channel lifetime is roughly 7 days. CtrlChecks stores channel state in Redis with a short buffer and runs a renewal sweep about every 6 hours to renew channels before expiry.',
    'Connect an outgoing line from this trigger to the first action, AI Agent, If/Else, or Google Drive node that should receive the file change.',
    'Each downstream service node still needs its own account connection. A Google Drive Trigger connection authorizes this watch/sync step only and does not automatically authorize Slack, Gmail, Google Sheets, databases, or other service nodes.',
    'Do not put OAuth tokens, refresh tokens, passwords, client secrets, channel tokens, or Google account passwords in Folder ID, Event Types, Keyword Filter, file names, or file data fields.',
  ],
  credentialDocsUrl: drivePushDocs,
  resources: [
    {
      name: 'Webhook',
      description: 'Receives Google Drive push notifications, validates channel state, then incrementally syncs changed files.',
      operations: [receiveOperation],
    },
  ],
  commonErrors: [
    {
      error: 'PUBLIC_BASE_URL is required to register Google Drive watch channels.',
      cause: 'The worker cannot build the public webhook URL that Google Drive must call for this trigger.',
      fix: 'Set PUBLIC_BASE_URL in the worker environment, restart the worker, and activate the workflow again.',
    },
    {
      error: 'No active Google connection found. Connect Google (Drive) in Connections first.',
      cause: 'CtrlChecks could not find a usable Google OAuth2 connection for the workflow owner.',
      fix: 'Open Connections, connect Google OAuth2 with Drive read access, confirm the credential test succeeds, and activate again.',
    },
    {
      error: 'Google Drive API error (403)',
      cause: 'The connected Google account cannot watch or read the Drive change feed, selected folder, or changed file metadata.',
      fix: 'Share the folder or files with the connected Google account, reconnect Google OAuth2 if scopes changed, and test the connection before registering the watch channel.',
    },
    {
      error: 'Ignored notification with invalid channel/token',
      cause: 'The incoming Google notification did not match the stored channel ID or channel token for this workflow node.',
      fix: 'Re-save or re-activate the workflow so CtrlChecks registers a fresh channel and token for the trigger.',
    },
    {
      error: 'PUBLIC_BASE_URL is required to execute Google Drive-triggered workflows.',
      cause: 'The worker received and accepted a Drive file change but did not have the public base URL needed for the internal workflow handoff.',
      fix: 'Set PUBLIC_BASE_URL for the worker environment and restart the worker before relying on production Drive triggers.',
    },
    {
      error: 'No files trigger after activation',
      cause: 'Activation stores a fresh start page token, the initial sync notification is only a handshake, Event Types may filter the change, Folder ID may not match the file parents, or Keyword Filter may not match the file name.',
      fix: 'Create, edit, trash, or remove a file after activation, confirm Event Types, Folder ID, and Keyword Filter, and check that the connected account can see the file.',
    },
    {
      error: 'Next node cannot find Drive file fields',
      cause: 'The downstream node is using Google Drive action-node output names or expects optional fields that Drive did not return for a removed file.',
      fix: 'Use trigger output paths such as {{$json.name}}, {{$json.fileId}}, {{$json.mimeType}}, {{$json.parents}}, {{$json.webViewLink}}, {{$json.eventType}}, or {{$json.raw}}.',
    },
    {
      error: 'Permission denied after Google Drive Trigger',
      cause: 'The trigger could read Drive changes, but a downstream service node is trying to use a different app without its own account connection or permission.',
      fix: 'Connect the downstream service node to its own account connection and confirm that account has the needed permission for its action.',
    },
  ],
  relatedNodes: ['google_drive', 'google_gmail', 'google_sheets', 'ai_agent', 'if_else', 'switch'],
};
