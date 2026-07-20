import type { FieldDoc, NodeDoc } from '../types';

const help = (field: string, why: string, when: string, enter: string, source: string, format: string, example: string, wrong: string, mistake: string) => `What this field is: ${field}
Why it matters: ${why}
When to fill it: ${when}
What to enter: ${enter}
Where the value comes from: ${source}
How to use it later: Map previous data with {{$json.fieldName}} and use this node output later as {{$json.items}}, {{$json.cursor}}, {{$json.dataBase64}}, {{$json.metadata}}, {{$json.sizeBytes}}, or {{$json.deleted}}.
Accepted format: ${format}
Real workplace example: ${example}
If it is empty or wrong: ${wrong}
Common mistake: ${mistake}`;

const f = (name: string, internalKey: string, type: FieldDoc['type'], required: boolean, description: string, text: Parameters<typeof help>, extra: Partial<FieldDoc> = {}): FieldDoc => ({
  name,
  internalKey,
  type,
  required,
  description,
  helpText: help(...text),
  ...extra,
});

const fields: FieldDoc[] = [
  f('Access Token', 'accessToken', 'password', false, 'Dropbox OAuth access token fallback.', ['The OAuth token used when a saved Dropbox connection is not selected or cannot be retrieved.', 'Dropbox rejects file API calls without a valid token.', 'Prefer a saved Dropbox connection. Fill this direct field only for legacy/manual workflows.', 'Paste a Dropbox OAuth access token with files.metadata.read, files.content.read, and/or files.content.write scopes as needed.', 'Create it through a Dropbox app or OAuth flow, then store it in Connections. Avoid mapping secrets from ordinary workflow payloads.', 'Secret bearer token string.', 'A saved Dropbox OAuth2 connection for the operations team folder.', 'The run returns _error "Dropbox: access token not found..." or Dropbox 401/403 errors.', 'Do not paste Dropbox tokens into Path, Content, Data, logs, or test input data.'], { placeholder: 'Use Connections when possible', notes: 'The runtime first checks this field, then tries the credential vault key "dropbox".' }),
  f('Operation', 'operation', 'select', true, 'Dropbox file action to run.', ['The action this node should run against Dropbox.', 'It decides whether the runtime lists, downloads, uploads, or deletes a file/folder path.', 'Choose it before filling Path, Content, Data Base64, Data, or Recursive.', 'Use read to download, upload to write, list to list folder entries, and delete to remove a file or folder. The runtime normalizes read to download.', 'Choose from the dropdown based on the file workflow you are building.', 'One of read, upload, list, or delete. Runtime also accepts download.', 'read to fetch a customer-uploaded CSV from Dropbox before parsing it.', 'The run returns an unsupported operation _error if the value is stale or misspelled.', 'Do not choose delete when you only need to check whether a file exists.'], { options: ['read', 'upload', 'list', 'delete'], defaultValue: 'read' }),
  f('Path', 'path', 'string', false, 'Dropbox file or folder path.', ['The Dropbox path identifies the file or folder to read, upload, list, or delete.', 'Dropbox APIs use this path to locate the target item.', 'Required for read/download, upload, and delete. For list, blank means the Dropbox root folder.', 'Enter a path beginning with /, such as /Reports/orders.csv. Use a folder path for list.', 'Copy it from Dropbox, build it from a file name, or map from a previous step such as /Reports/{{$json.fileName}}.', 'Dropbox path string beginning with /, or blank for root list.', '/Customer Uploads/{{$json.customerId}}/contract.pdf.', 'The run returns path is required for download/upload/delete or Dropbox returns not_found.', 'Do not paste a Dropbox sharing URL; use the internal path.'], { placeholder: '/Reports/orders.csv', example: '/Customer Uploads/1048/contract.pdf' }),
  f('Content', 'content', 'textarea', false, 'Plain text or file content for upload.', ['The upload body used when Data Base64 and Data are not provided.', 'The runtime converts it to bytes and uploads it to Dropbox.', 'Use it with upload for text, CSV, JSON, or generated report content.', 'Enter fixed content or map a previous step value such as {{$json.csvReport}}.', 'Comes from a report generator, HTTP response, text formatter, database export, or form content.', 'String content. Binary files should usually use Data Base64.', '{{$json.csvReport}} for a daily Dropbox export.', 'The run returns _error "Dropbox: dataBase64, data, or content is required for upload".', 'Do not paste huge binary files as normal text content.'], { placeholder: '{{$json.fileContent}}', example: '{{$json.csvReport}}' }),
  f('Data Base64', 'dataBase64', 'string', false, 'Base64 upload body.', ['The base64-encoded bytes to upload.', 'It lets binary files travel through JSON workflow data without corruption.', 'Use it with upload when a previous node produced base64 file content.', 'Map the base64 string, usually {{$json.dataBase64}}.', 'Comes from Read Binary File, HTTP download, another storage node, or a generated PDF step.', 'Base64 string without a data URL prefix.', '{{$json.dataBase64}} for a PDF contract.', 'Invalid base64 can upload corrupted content.', 'Do not use Data Base64 for a Dropbox path or metadata; it is the file body.'], { placeholder: '{{$json.dataBase64}}', example: '{{$json.dataBase64}}' }),
  f('Data', 'data', 'string', false, 'Alternative upload body.', ['A fallback upload body used when Data Base64 is blank.', 'The runtime accepts strings, binary-like values, or objects and converts objects to JSON bytes.', 'Use it with upload when a previous step stores the file body as data.', 'Map {{$json.data}} or enter JSON/text content.', 'Comes from HTTP Request, AI output, database export, or another file-processing step.', 'String, object, Buffer, or Uint8Array from runtime config; UI users usually provide text or mapped JSON.', '{"rows":12,"status":"ready"}', 'Upload may fail if Data is empty or produce unexpected JSON if an object is passed.', 'Do not confuse Data with Dropbox metadata.'], { placeholder: '{{$json.data}}', example: '{"status":"ready"}' }),
  f('Recursive', 'recursive', 'boolean', false, 'Whether list should include nested folders.', ['This toggle is sent to Dropbox list_folder.', 'It controls whether List returns only the selected folder or everything beneath it.', 'Use it only with list.', 'Turn it on to list all nested files under Path; leave off for one folder level.', 'Choose it from the folder size and downstream processing need. You can map {{$json.recursive}}.', 'Boolean true or false. Runtime defaults to false.', 'true to scan all files under /Customer Uploads for an audit.', 'List may return too many entries or miss nested files.', 'Do not turn it on for very large Dropbox folders unless downstream steps can handle the result size.'], { defaultValue: 'false', example: 'true' }),
];

const op = (name: string, value: string, description: string, inputValues: Record<string, string>, outputExample: Record<string, unknown>, outputDescription: string) => ({
  name,
  value,
  description,
  fields,
  outputExample,
  outputDescription,
  usageExample: {
    scenario: `${name} Dropbox files after a form upload, report, import, approval, or scheduled cleanup step provides a file path or folder path.`,
    inputValues: { operation: value, accessToken: 'Use saved Dropbox connection', ...inputValues },
    expectedOutput: 'Use Dropbox output later as {{$json.items}}, {{$json.dataBase64}}, {{$json.metadata}}, {{$json.sizeBytes}}, or {{$json.deleted}}.',
  },
  externalDocsUrl: 'https://www.dropbox.com/developers/documentation/http/documentation',
});

export const dropboxDoc: NodeDoc = {
  slug: 'dropbox',
  displayName: 'Dropbox',
  category: 'File',
  logoUrl: '/icons/nodes/dropbox.svg',
  description: 'List, download, upload, and delete files in Dropbox from a workflow. Use it for shared folders, customer uploads, document handoff, imports, exports, and cleanup.',
  credentialType: 'Dropbox OAuth2',
  credentialSetupSteps: [
    'Create or select a Dropbox OAuth2 connection in CtrlChecks Connections so the access token is stored in the credential vault instead of workflow fields.',
    'Grant the Dropbox app the scopes needed by the workflow: files.metadata.read for list, files.content.read for read/download, and files.content.write for upload/delete.',
    'Choose whether the Dropbox app should have app-folder or full-Dropbox access, and keep production workflows on the narrowest access that works.',
    'Test with List on a small folder or Read on a known small file before enabling Upload or Delete.',
    'Connect this node output to the next node with an outgoing line; downstream service node account connection is still required for email, Slack, CRM, database, AI, or other storage steps.',
  ],
  credentialDocsUrl: 'https://developers.dropbox.com/oauth-guide',
  resources: [
    {
      name: 'Operations',
      description: 'Dropbox calls the Dropbox HTTP API directly. The visible Download File operation uses value read, which the runtime normalizes to download. Failures return _error and sometimes _errorDetails.',
      operations: [
        op('Download File', 'read', 'Downloads one Dropbox file and returns base64 file bytes plus Dropbox metadata. Use it before parsing a file, attaching it elsewhere, or moving content to another system.', { path: '/Customer Uploads/1048/contract.pdf' }, { success: true, path: '/Customer Uploads/1048/contract.pdf', dataBase64: 'JVBERi0x...', sizeBytes: 24512, metadata: { name: 'contract.pdf', path_display: '/Customer Uploads/1048/contract.pdf' } }, 'success: true on download. path: file path read. dataBase64: downloaded bytes. sizeBytes: byte length. metadata: parsed Dropbox metadata. _error/_errorDetails appear on token, path, or API failure.'),
        op('Upload File', 'upload', 'Uploads Content, Data Base64, or Data to Dropbox at Path, overwriting the existing file. Use it to save reports, generated documents, exports, or transformed files.', { path: '/Reports/2026-07-20/orders.csv', content: '{{$json.csvReport}}' }, { success: true, path: '/Reports/2026-07-20/orders.csv', sizeBytes: 4096, metadata: { name: 'orders.csv', id: 'id:abc123' } }, 'success: true on upload. path: destination path. sizeBytes: uploaded bytes. metadata: Dropbox upload response. _error/_errorDetails appear on missing path/body, token, permission, or API failure.'),
        op('List Files', 'list', 'Lists files and folders inside Path, or the Dropbox root when Path is blank. Use it to discover files before download or audit a shared folder.', { path: '/Reports', recursive: 'false' }, { success: true, items: [{ '.tag': 'file', name: 'orders.csv', path_display: '/Reports/orders.csv' }], cursor: 'cursor_abc', hasMore: false }, 'success: true on list. items: Dropbox entries array. cursor: list cursor. hasMore: whether Dropbox has more entries. _error/_errorDetails appear on token, path, or API failure.'),
        op('Delete File', 'delete', 'Deletes one Dropbox file or folder at Path. Use it only for tightly scoped cleanup where Path comes from a trusted previous list or approval step.', { path: '/Temp/old-export.csv' }, { success: true, path: '/Temp/old-export.csv', deleted: true, metadata: { name: 'old-export.csv' } }, 'success: true on delete. path: deleted path. deleted: true. metadata: Dropbox metadata for deleted item. _error/_errorDetails appear on missing path, token, permission, or API failure.'),
      ],
    },
  ],
  commonErrors: [
    { error: 'Dropbox: access token not found. Connect Dropbox or provide accessToken.', cause: 'No saved Dropbox credential was found and Access Token is empty.', fix: 'Create/select a Dropbox OAuth2 connection in Connections or provide a direct legacy access token.' },
    { error: 'Dropbox: path is required for download', cause: 'Read/download was selected without Path.', fix: 'Enter a Dropbox file path beginning with /, or map one from a previous List Files step.' },
    { error: 'Dropbox: path is required for upload', cause: 'Upload was selected without a destination Path.', fix: 'Enter a full Dropbox path including file name, such as /Reports/{{$json.fileName}}.' },
    { error: 'Dropbox: dataBase64, data, or content is required for upload', cause: 'Upload has no file body.', fix: 'Map Content, Data Base64, or Data from a previous step.' },
    { error: 'Dropbox: path is required for delete', cause: 'Delete was selected without Path.', fix: 'Map a trusted path from a previous List Files step or approval record.' },
    { error: 'Dropbox: Unsupported operation "<operation>". Supported: read, upload, list, delete', cause: 'The operation value is not supported by the legacy switch.', fix: 'Use read, upload, list, or delete from the dropdown; download is also accepted by runtime-generated configs.' },
    { error: 'Dropbox list/download/upload/delete failed (<status>)', cause: 'Dropbox rejected the token, scopes, path, app-folder access, or API request.', fix: 'Check the saved Dropbox connection, OAuth scopes, path, app access type, and _errorDetails from the run.' },
  ],
  relatedNodes: ['aws_s3', 'google_cloud_storage', 'onedrive', 'read_binary_file', 'write_binary_file'],
};
