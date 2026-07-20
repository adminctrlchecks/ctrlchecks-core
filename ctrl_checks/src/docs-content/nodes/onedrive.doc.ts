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

const operation: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Choose the OneDrive action: read/download, upload, list, or delete.',
  options: ['read', 'upload', 'list', 'delete'],
  defaultValue: 'read',
  helpText: help('The Microsoft Graph file action to run against the signed-in user drive.', 'It decides whether Path is treated as a file, folder, upload destination, or delete fallback.', 'Always choose it before filling file fields.', 'Choose read to download, upload to write, list to list a folder, or delete to remove an item.', 'This is a workflow choice, not a value copied from OneDrive.', 'Use success, items, dataBase64, metadata, deleted, or _error in later steps depending on the operation.', 'One of read, upload, list, delete. Runtime normalizes read to download internally.', 'A finance workflow chooses upload to store a generated /Reports/month-end.xlsx file.', 'Unsupported values return OneDrive: Unsupported operation "<operation>".', 'Do not use download as the visual value; use read in the panel.'),
  example: 'read',
};

const accessToken: FieldDoc = {
  name: 'Access Token',
  internalKey: 'accessToken',
  type: 'password',
  required: true,
  description: 'Microsoft Graph OAuth access token fallback.',
  helpText: help('The Microsoft OAuth token used to call OneDrive through Microsoft Graph.', 'Without a token or saved Microsoft connection, OneDrive cannot list, download, upload, or delete files.', 'Prefer a saved Microsoft connection; use this field only as a direct legacy fallback.', 'Enter a valid Microsoft Graph access token with OneDrive file permissions.', 'Create it through Microsoft OAuth/Azure app registration or use CtrlChecks Connections for Microsoft.', 'Do not use the token downstream; downstream nodes use outputs such as items, dataBase64, metadata, or deleted.', 'Bearer access token string. It expires and must have file scopes.', 'An operations workflow uses a saved Microsoft connection with Files.ReadWrite access to upload reports.', 'Missing token returns OneDrive: access token not found. Connect Microsoft or provide accessToken.', 'Do not paste a client secret here; this field expects an access token, and Connections is preferred.'),
  example: '{{$credentials.microsoft.accessToken}}',
};

const path: FieldDoc = {
  name: 'File Path',
  internalKey: 'path',
  type: 'string',
  required: false,
  description: 'OneDrive file or folder path. Required for read/upload; optional for list; delete can use path or fileId.',
  placeholder: '/Documents/report.pdf',
  helpText: help('The OneDrive path under the signed-in user drive.', 'The runtime uses it to build Microsoft Graph /me/drive/root:path requests.', 'Fill it for read and upload. Use it for list when listing a specific folder. Use it for delete when you do not have File ID.', 'Enter a leading-slash path such as /Reports/report.pdf; CtrlChecks normalizes missing leading slash.', 'Copy it from OneDrive folder structure, a previous list item, or an upstream file naming step.', 'Map {{$json.path}} from a previous file-listing step or build /Reports/{{$json.fileName}}.', 'Path string beginning with /, no full https://onedrive URL.', 'A sales report workflow uploads to /Reports/{{$json.month}}/pipeline.xlsx.', 'Missing path returns OneDrive: path is required for download or upload.', 'Do not rely on Legacy File Name for upload; include the final file name in Path.'),
  example: '/Reports/month-end.xlsx',
};

const fileId: FieldDoc = {
  name: 'File ID',
  internalKey: 'fileId',
  type: 'string',
  required: false,
  description: 'OneDrive item ID for delete operations.',
  helpText: help('The Microsoft Graph drive item ID.', 'Delete can target an item by ID even when the path has changed.', 'Fill it for delete when a previous list or upload returned an item ID.', 'Enter the item ID from Microsoft Graph metadata.', 'Get it from OneDrive list/upload metadata or a Microsoft Graph lookup.', 'Map {{$json.id}} or {{$json.metadata.id}} from an earlier OneDrive step.', 'Opaque OneDrive item ID string.', 'A cleanup workflow deletes the exact item returned by a previous List Files step.', 'If delete has neither File ID nor Path, it returns OneDrive: fileId or path is required for delete.', 'Do not use File ID for read/upload in the current runtime; those operations use Path.'),
  example: '01ABC123DEF456',
};

const fileName: FieldDoc = {
  name: 'Legacy File Name',
  internalKey: 'fileName',
  type: 'string',
  required: false,
  description: 'Legacy UI upload name; current runtime does not read it directly.',
  helpText: help('A legacy field kept for older workflow configs.', 'The runtime uploads to Path, so this field alone does not choose the destination.', 'Only fill it when keeping older generated configs readable; new workflows should put the file name in Path.', 'Enter the final file name only if you also set Path with the same file name.', 'Usually comes from an upstream file metadata field such as {{$json.fileName}}.', 'Use it for human clarity, but downstream behavior depends on Path and runtime output metadata.', 'File name with extension, such as report.pdf.', 'A legacy workflow shows report.pdf here but uploads to /Reports/report.pdf through Path.', 'If Path is empty, upload still fails even when File Name is filled.', 'Do not assume File Name creates a file in OneDrive by itself.'),
  example: 'report.pdf',
};

const content: FieldDoc = {
  name: 'Content',
  internalKey: 'content',
  type: 'textarea',
  required: false,
  description: 'Upload body for OneDrive upload.',
  helpText: help('The file bytes or text to upload.', 'Upload cannot create a file without a body.', 'Fill it for upload operations.', 'Enter plain text, base64, or a data URL. Base64 is safest for Office files, PDFs, and images.', 'Usually comes from Write Binary File, Read Binary File, S3/Dropbox download, report generation, or CSV generation.', 'Map {{$json.dataBase64}} for binary content or {{$json.csvReport}} for text reports.', 'String payload; base64, data URL, or plain text.', 'A billing workflow maps {{$json.dataBase64}} and uploads /Invoices/invoice-1048.pdf.', 'Missing upload content returns OneDrive: dataBase64, data, or content is required for upload.', 'Do not paste a local desktop file path; this is the file content.'),
  example: '{{$json.dataBase64}}',
};

const dataBase64: FieldDoc = {
  name: 'Data Base64',
  internalKey: 'dataBase64',
  type: 'textarea',
  required: false,
  description: 'Base64 upload body alias.',
  helpText: help('A backend-supported upload content field for binary bytes.', 'It lets generated workflows pass binary content safely.', 'Use it for upload when a previous node returned base64.', 'Map {{$json.dataBase64}}.', 'Usually comes from a file download or Write Binary File step.', 'Downloaded OneDrive files also return dataBase64 for downstream upload or parsing.', 'Base64 string, usually without spaces.', 'A PDF generated earlier is uploaded as {{$json.dataBase64}}.', 'If dataBase64, data, and content are all empty, upload fails.', 'Do not put metadata JSON here unless you want that JSON to become the file content.'),
  example: '{{$json.dataBase64}}',
};

const data: FieldDoc = {
  name: 'Data',
  internalKey: 'data',
  type: 'textarea',
  required: false,
  description: 'Legacy upload body alias.',
  helpText: help('An older backend alias for upload content.', 'The runtime checks data when dataBase64 and content are empty.', 'Use it only for generated configs or old workflows.', 'Enter the same payload you would put in Content.', 'Usually comes from an upstream node using a generic data key.', 'Map {{$json.data}} only when that field contains the file body.', 'String payload, not a structured OneDrive metadata object.', 'A legacy report step stores CSV text in {{$json.data}} before upload.', 'If all upload body fields are empty, upload fails.', 'Do not confuse this with returned list data; for OneDrive list the runtime returns items.'),
  example: '{{$json.data}}',
};

const fields = [operation, accessToken, path, fileId, fileName, content, dataBase64, data];

const op = (name: string, value: string, description: string, inputValues: Record<string, string>, outputExample: Record<string, unknown>, expectedOutput: string) => ({
  name,
  value,
  description,
  fields,
  outputExample,
  outputDescription: 'Returns flattened fields from the legacy executor: list gives success/items; read gives success/path/dataBase64/sizeBytes; upload gives success/path/sizeBytes/metadata; delete gives success/deleted/path. Failures return _error and sometimes _errorDetails.',
  usageExample: { scenario: description, inputValues, expectedOutput },
  externalDocsUrl: 'https://learn.microsoft.com/graph/onedrive-concept-overview',
});

export const onedriveDoc: NodeDoc = {
  slug: 'onedrive',
  displayName: 'OneDrive',
  category: 'File',
  logoUrl: '/icons/nodes/onedrive.svg',
  description: 'List, download, upload, and delete files in Microsoft OneDrive through Microsoft Graph.',
  credentialType: 'Microsoft OAuth2',
  credentialSetupSteps: [
    'Prefer a saved Microsoft connection in CtrlChecks Connections so the OAuth token is stored in the credential vault instead of workflow fields.',
    'Connect this node output to downstream parser, notification, approval, or storage steps; any service node account connection should stay on the relevant service node or saved Microsoft connection.',
    'Grant Microsoft Graph file permissions such as Files.ReadWrite for uploads/deletes and Files.Read for read/list workflows.',
    'Use Path for read/upload/list. Use File ID only for delete when a previous OneDrive response returned the item ID.',
    'Test with List on a harmless folder or Read on a known small file before enabling Upload or Delete.',
  ],
  credentialDocsUrl: 'https://learn.microsoft.com/graph/onedrive-concept-overview',
  resources: [
    {
      name: 'Operations',
      description: 'OneDrive uses read/upload/list/delete in the visual panel. The runtime normalizes read to download internally.',
      operations: [
        op('Read File', 'read', 'Download one OneDrive file by path and return base64 bytes so later workflow steps can attach, parse, archive, or upload the file somewhere else.', { operation: 'read', path: '/Contracts/contract-1048.pdf' }, { success: true, path: '/Contracts/contract-1048.pdf', dataBase64: 'JVBERi0x...', sizeBytes: 24512 }, 'Use {{$json.dataBase64}} as the file body for email, parsing, or storage.'),
        op('Upload File', 'upload', 'Upload one text or binary payload to a OneDrive path, commonly for generated reports, customer documents, approval files, and Microsoft 365 team handoffs.', { operation: 'upload', path: '/Reports/month-end.xlsx', content: '{{$json.dataBase64}}' }, { success: true, path: '/Reports/month-end.xlsx', sizeBytes: 4096, metadata: { id: '01ABC123', name: 'month-end.xlsx' } }, 'Use {{$json.metadata.id}} or {{$json.path}} in notifications or logs.'),
        op('List Files', 'list', 'List files under the root or a specific OneDrive folder path so a workflow can detect arrivals, pick a document, branch on folder contents, or prepare a later read/delete step.', { operation: 'list', path: '/Reports' }, { success: true, items: [{ id: '01ABC123', name: 'month-end.xlsx', size: 4096 }] }, 'Use {{$json.items}} to choose which file to read or delete.'),
        op('Delete File', 'delete', 'Delete one OneDrive item by File ID or Path after a retention rule, duplicate check, approval step, or successful migration confirms the item should be removed.', { operation: 'delete', fileId: '01ABC123DEF456' }, { success: true, deleted: true, path: '01ABC123DEF456' }, 'Use {{$json.deleted}} to audit cleanup.'),
      ],
    },
  ],
  commonErrors: [
    { error: 'OneDrive: access token not found. Connect Microsoft or provide accessToken.', cause: 'No saved Microsoft credential was found and Access Token is empty.', fix: 'Create/select a Microsoft OAuth2 connection or provide a direct legacy access token.' },
    { error: 'OneDrive: path is required for download', cause: 'Read was selected without Path.', fix: 'Enter a OneDrive path such as /Contracts/contract.pdf.' },
    { error: 'OneDrive: path is required for upload', cause: 'Upload was selected without Path.', fix: 'Put the final folder and file name in Path, such as /Reports/report.pdf.' },
    { error: 'OneDrive: dataBase64, data, or content is required for upload', cause: 'Upload has no file body.', fix: 'Map Content, Data Base64, or Data from a previous step.' },
    { error: 'OneDrive: fileId or path is required for delete', cause: 'Delete has neither File ID nor Path.', fix: 'Map File ID from a previous list/upload result or provide the exact Path.' },
    { error: 'OneDrive list/download/upload/delete failed (<status>)', cause: 'Microsoft Graph rejected the token, permissions, path, file, or request body.', fix: 'Check the saved Microsoft connection, Graph scopes, account file access, path spelling, and _errorDetails.' },
    { error: 'OneDrive: Unsupported operation "<operation>". Supported: read, upload, list, delete', cause: 'The operation value is stale or unsupported.', fix: 'Use read, upload, list, or delete from the dropdown.' },
  ],
  relatedNodes: ['google_drive', 'dropbox', 'aws_s3', 'read_binary_file', 'write_binary_file'],
};
