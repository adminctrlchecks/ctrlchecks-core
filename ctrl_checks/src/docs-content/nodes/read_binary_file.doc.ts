import type { FieldDoc, NodeDoc } from '../types';

const help = (field: string, why: string, when: string, enter: string, source: string, later: string, format: string, example: string, wrong: string, mistake: string) => `What this field is: ${field}
Why it matters: ${why}
When to fill it: ${when}
What to enter: ${enter}
Where the value comes from: ${source}
How to use it later: ${later}
Accepted format: ${format}
Real workplace example: ${example}
If it is empty or wrong: ${wrong}
Common mistake: ${mistake}`;

const fields: FieldDoc[] = [
  {
    name: 'Source Type',
    internalKey: 'sourceType',
    type: 'select',
    required: true,
    description: 'Choose whether to read by managed asset ID or safe server storage path.',
    options: ['assetId', 'serverPath'],
    defaultValue: 'assetId',
    helpText: help('The source lookup mode for the file.', 'It decides whether the runtime searches workflow_file_assets by Asset ID or reads a path inside the binary storage root.', 'Choose it before setting Asset ID or Storage Path.', 'Use assetId for files created by Write Binary File. Use serverPath only for files already under the backend binary storage root.', 'Asset IDs come from Write Binary File output. Server paths come from trusted backend storage, not cloud links.', 'Use returned dataBase64, fileName, mimeType, and sizeBytes in downstream file, email, OCR, or upload nodes.', 'assetId or serverPath.', 'A PDF generation flow uses assetId to read {{$json.assetId}} before emailing it.', 'Wrong source type makes the runtime look in the wrong place and return read_binary_file: <message>.', 'Do not paste Google Drive, Dropbox, S3, or public URLs here. Use those connector nodes first.'),
    example: 'assetId',
  },
  {
    name: 'Asset ID',
    internalKey: 'assetId',
    type: 'string',
    required: false,
    description: 'Workflow file asset ID returned by Write Binary File.',
    helpText: help('The database ID of a managed workflow file asset.', 'It lets the runtime find the stored file metadata and storage key.', 'Fill it when Source Type is Workflow File Asset.', 'Map {{$json.assetId}} from a previous Write Binary File step.', 'It comes from Write Binary File output when Persist Metadata was enabled.', 'After reading, downstream nodes use {{$json.dataBase64}}, {{$json.fileName}}, and {{$json.mimeType}}.', 'UUID-style asset ID string.', 'A contract workflow reads asset {{$json.assetId}} before sending it as an email attachment.', 'Missing Asset ID returns read_binary_file: assetId is required when sourceType is assetId.', 'Do not use storageKey or filePath in Asset ID; those are different fields.'),
    example: '{{$json.assetId}}',
  },
  {
    name: 'Storage Path',
    internalKey: 'filePath',
    type: 'string',
    required: false,
    description: 'Path under the backend binary file root.',
    helpText: help('A safe server-side file path relative to the configured binary storage root.', 'The service blocks paths outside the storage root to protect the host filesystem.', 'Use it only with Source Type serverPath and only for trusted backend files.', 'Enter a relative path such as reports/report.pdf.', 'It comes from backend storage or a trusted earlier Write Binary File custom path.', 'Read output gives dataBase64 and metadata for downstream steps.', 'Relative storage path. No drive letters, no .. traversal, no cloud URLs.', 'An internal batch reads reports/daily.pdf from backend storage.', 'Unsafe or missing paths return read_binary_file: filePath or storageKey is required or a safe-path error.', 'Do not paste C:\\Users\\... paths or public URLs.'),
    example: 'reports/report.pdf',
  },
  {
    name: 'Storage Key',
    internalKey: 'storageKey',
    type: 'string',
    required: false,
    description: 'Backend storage-key alias under the binary file root.',
    helpText: help('A backend alias for the stored file path.', 'Some generated configs or Write Binary File outputs use storageKey instead of filePath.', 'Use it with Source Type serverPath when you have a storageKey from an earlier step.', 'Map {{$json.storageKey}}.', 'It comes from Write Binary File output or trusted backend storage metadata.', 'After read, downstream nodes can continue with {{$json.dataBase64}}.', 'Relative storage key string under the binary root.', 'A generated workflow reads {{$json.storageKey}} from an earlier asset step.', 'If Storage Key and Storage Path are both empty for serverPath, read fails.', 'Do not put a cloud object key here unless that same key exists in backend binary storage.'),
    example: '{{$json.storageKey}}',
  },
  {
    name: 'Max Size',
    internalKey: 'maxSize',
    type: 'number',
    required: false,
    description: 'Maximum bytes allowed for the read.',
    defaultValue: '10485760',
    helpText: help('The largest file size this node will read into memory.', 'It protects worker memory from unexpectedly large files.', 'Fill it when you want a limit different from the default 10 MB.', 'Enter a byte count such as 10485760 for 10 MB.', 'Choose it from your workflow policy or the expected file size.', 'Use sizeBytes in output to log or branch after the read.', 'Positive integer bytes.', 'An invoice workflow sets 5242880 so files over 5 MB are rejected before email.', 'Files larger than Max Size return read_binary_file: File too large or a size-limit error.', 'Do not enter MB text like 10MB; enter bytes.'),
    example: '10485760',
  },
];

export const readBinaryFileDoc: NodeDoc = {
  slug: 'read_binary_file',
  displayName: 'Read Binary File',
  category: 'File',
  logoUrl: '/icons/nodes/read_binary_file.svg',
  description: 'Read a managed workflow file asset or safe backend binary-storage file and return its bytes as base64.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account connection is required; this node does not use credentials and reads CtrlChecks-managed binary storage only.',
    'Connect this node output to the next parser, email, upload, or approval step; any service node account connection belongs on that downstream service node, not here.',
    'Use Asset ID for normal workflows after Write Binary File. The asset metadata is read from workflow_file_assets.',
    'Use Server Storage Path or Storage Key only for files already under the configured backend binary storage root.',
    'For Google Drive, S3, Dropbox, OneDrive, public URLs, or email attachments, use the relevant connector/download node first.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Read Binary File has one configuration operation: resolve a safe local file source and return dataBase64 plus metadata.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Read a workflow file asset or a safe server storage path and return base64 bytes plus metadata for downstream email, upload, OCR, parser, or approval steps.',
          fields,
          outputExample: { success: true, assetId: 'asset-id', fileName: 'report.pdf', mimeType: 'application/pdf', sizeBytes: 2048, checksumSha256: 'abc123...', storageProvider: 'local', storageKey: 'reports/report.pdf', filePath: 'C:/safe-root/reports/report.pdf', dataBase64: 'JVBERi0x...' },
          outputDescription: 'Returns success, assetId when used, fileName, mimeType, sizeBytes, checksumSha256, storageProvider, storageKey, filePath, and dataBase64. Failures return _error from execute-workflow.',
          usageExample: { scenario: 'Read a generated PDF asset and attach it to an email', inputValues: { sourceType: 'assetId', assetId: '{{$json.assetId}}', maxSize: '10485760' }, expectedOutput: 'Use {{$json.dataBase64}} as the attachment body and {{$json.fileName}} as the attachment name.' },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'assetId is required when sourceType is assetId', cause: 'Source Type is assetId but Asset ID is empty.', fix: 'Map {{$json.assetId}} from Write Binary File or switch Source Type to serverPath.' },
    { error: 'file asset not found: <assetId>', cause: 'No stored asset metadata matched the ID for this user/workflow context.', fix: 'Confirm Persist Metadata was enabled and map the Asset ID from the correct previous run.' },
    { error: 'filePath or storageKey is required', cause: 'Source Type is serverPath but both Storage Path and Storage Key are empty.', fix: 'Fill Storage Path or map {{$json.storageKey}}.' },
    { error: 'unsafe file path outside binary storage root', cause: 'The path escapes the configured safe storage directory.', fix: 'Use a relative path under BINARY_FILE_ROOT or read by Asset ID.' },
    { error: 'read_binary_file: <message>', cause: 'File lookup, safe-path validation, file read, or size validation failed.', fix: 'Check Source Type, Asset ID, Storage Path/Key, Max Size, and whether the file exists.' },
  ],
  relatedNodes: ['write_binary_file', 'aws_s3', 'dropbox', 'onedrive', 'google_drive'],
};
