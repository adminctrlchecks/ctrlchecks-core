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
    name: 'File Name',
    internalKey: 'fileName',
    type: 'string',
    required: true,
    description: 'Name stored in file metadata.',
    helpText: help('The human file name for the managed asset.', 'It is used for metadata, MIME inference, and downstream attachment or upload names.', 'Fill it for every normal write.', 'Enter a file name with an extension, or map {{$json.fileName}}.', 'Usually comes from the report, invoice, customer, or generated file metadata upstream.', 'Read Binary File and email/storage nodes can use {{$json.fileName}} later.', 'File name string such as report.pdf or orders.csv.', 'An invoice workflow writes invoice-{{$json.invoiceId}}.pdf.', 'If missing, the runtime may infer a safe fallback from filePath, but downstream names become less clear.', 'Do not include an unsafe absolute machine path here.'),
    example: 'invoice-1048.pdf',
  },
  {
    name: 'MIME Type',
    internalKey: 'mimeType',
    type: 'string',
    required: false,
    description: 'Content type stored with the asset.',
    defaultValue: 'application/octet-stream',
    helpText: help('The file content type.', 'It helps downstream upload, email, and preview steps handle the file correctly.', 'Fill it when you know the file type or the extension is unusual.', 'Enter a MIME type such as application/pdf, text/csv, image/png, or application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.', 'Get it from the generator/downloader node or choose it from the file format you are creating.', 'Downstream nodes can use {{$json.mimeType}} as upload Content-Type or email attachment type.', 'MIME type string.', 'A CSV export uses text/csv.', 'If blank, CtrlChecks infers common types from File Name or uses application/octet-stream.', 'Do not enter a file extension like .pdf; enter application/pdf.'),
    example: 'application/pdf',
  },
  {
    name: 'Binary Data',
    internalKey: 'dataBase64',
    type: 'textarea',
    required: true,
    description: 'Primary file body: base64, data URL, or plain text payload.',
    helpText: help('The bytes or text that will be written as the file.', 'Without a body, there is no file to store.', 'Fill it for every write unless using a legacy body alias.', 'Map {{$json.dataBase64}} for binary files, paste a data URL, or provide plain text for text files.', 'Usually comes from PDF generation, image generation, Read Binary File, cloud download, OCR, or CSV generation.', 'This same dataBase64 is returned so upload/email nodes can use {{$json.dataBase64}} immediately.', 'Base64 string, data URL, or plain text string.', 'A PDF node returns {{$json.dataBase64}}, which Write Binary File stores as invoice-1048.pdf.', 'Missing all body aliases returns write_binary_file: dataBase64, data, content, fileData, or fileContent is required.', 'Do not paste a local file path; this field is the file content itself.'),
    example: '{{$json.dataBase64}}',
  },
  {
    name: 'Folder',
    internalKey: 'folder',
    type: 'string',
    required: false,
    description: 'Optional namespace under managed workflow storage.',
    helpText: help('A folder-like namespace used when CtrlChecks builds the storage key automatically.', 'It keeps generated files organized under the binary storage root.', 'Fill it when you want files grouped by workflow, customer, or date.', 'Enter a relative folder such as reports or invoices/2026.', 'Choose it from your workflow naming convention or map {{$json.customerId}} safely.', 'Returned storageKey shows where the file was stored.', 'Relative folder path, no drive letters and no .. traversal.', 'A billing workflow stores files under invoices/{{$json.customerId}}.', 'Unsafe folders are rejected by safe-path validation.', 'Do not put a full local or cloud path here.'),
    example: 'invoices/2026',
  },
  {
    name: 'Custom Storage Path',
    internalKey: 'filePath',
    type: 'string',
    required: false,
    description: 'Advanced explicit storage key/path under the binary root.',
    helpText: help('A custom relative path for where the backend file is written.', 'It overrides the automatic folder/file-name storage-key generation.', 'Use it only for controlled advanced workflows that need a predictable storageKey.', 'Enter a relative path such as reports/month-end.pdf.', 'Usually comes from trusted internal workflow configuration.', 'Returned filePath and storageKey can be used by Read Binary File serverPath mode.', 'Relative path under BINARY_FILE_ROOT only.', 'An internal archival flow writes exports/2026-07/orders.csv.', 'Unsafe paths are rejected before writing.', 'Do not use C:\\, /etc, ../, or cloud URLs.'),
    example: 'reports/month-end.pdf',
  },
  {
    name: 'Persist Metadata',
    internalKey: 'persist',
    type: 'boolean',
    required: false,
    description: 'Whether to save workflow_file_assets metadata.',
    defaultValue: 'true',
    helpText: help('Controls whether asset metadata is persisted in the database.', 'Persisted metadata lets Read Binary File look the file up later by Asset ID.', 'Keep it enabled for normal workflows; disable only for temporary files that will never be read by Asset ID.', 'Use true or false.', 'This is a workflow retention decision.', 'When true, downstream nodes can use {{$json.assetId}}; when false, use storageKey/filePath instead.', 'Boolean true or false.', 'A contract workflow keeps Persist Metadata true so an approval step can read the same asset later.', 'If false, metadataPersisted is false and Asset ID lookup may not work later.', 'Do not disable it when a later Read Binary File step expects assetId.'),
    example: 'true',
  },
  {
    name: 'Data',
    internalKey: 'data',
    type: 'textarea',
    required: false,
    description: 'Legacy body alias for Binary Data.',
    helpText: help('An older backend alias for file content.', 'The runtime checks it when dataBase64 is empty.', 'Use it only for generated configs or old workflows.', 'Enter the same file body you would put in Binary Data.', 'Usually comes from upstream nodes with a generic data field.', 'The written result still returns dataBase64 for downstream use.', 'String payload: base64, data URL, or plain text.', 'A legacy CSV generator stores the CSV in {{$json.data}}.', 'If all body fields are empty, writing fails.', 'Do not put metadata JSON here unless you want that JSON to be the file content.'),
    example: '{{$json.data}}',
  },
  {
    name: 'Legacy Content Alias',
    internalKey: 'content',
    type: 'textarea',
    required: false,
    description: 'Legacy body alias for Binary Data.',
    helpText: help('An alternate upload body field.', 'It keeps cloud-download or old generated configs working.', 'Use it when upstream output is named content and contains the actual file body.', 'Map {{$json.content}} or paste plain text.', 'Usually comes from HTTP, storage, or generated text nodes.', 'The node returns normalized dataBase64 for later file operations.', 'String payload: base64, data URL, or plain text.', 'A text generation workflow stores {{$json.content}} as summary.txt.', 'If content is empty and no other body alias exists, writing fails.', 'Do not use this for a file URL; it expects the file content.'),
    example: '{{$json.content}}',
  },
  {
    name: 'File Data',
    internalKey: 'fileData',
    type: 'textarea',
    required: false,
    description: 'Backend body alias useful after some file nodes.',
    helpText: help('A backend-supported alias for Binary Data.', 'Some file-producing nodes and generated configs call the payload fileData.', 'Use it only when upstream has fileData and dataBase64 is not available.', 'Map {{$json.fileData}}.', 'Usually comes from older file-processing nodes.', 'The result normalizes it to dataBase64 for downstream use.', 'String payload: base64, data URL, or plain text.', 'A legacy image node emits {{$json.fileData}}, which is saved as product.png.', 'If all payload aliases are empty, write fails.', 'Do not provide conflicting fileData and dataBase64 values.'),
    example: '{{$json.fileData}}',
  },
];

export const writeBinaryFileDoc: NodeDoc = {
  slug: 'write_binary_file',
  displayName: 'Write Binary File',
  category: 'File',
  logoUrl: '/icons/nodes/write_binary_file.svg',
  description: 'Create a managed workflow file asset from base64, a data URL, or plain text for later download, upload, email, OCR, or approval steps.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account connection is required; this node does not use credentials and writes to CtrlChecks-managed binary storage.',
    'Connect this node output to a later read, email, upload, or approval step; any service node account connection belongs on that downstream service node, not here.',
    'Provide a file body through Binary Data/dataBase64 or a supported legacy alias: data, content, fileData, or fileContent.',
    'Keep Persist Metadata enabled when a later Read Binary File step should read the file by Asset ID.',
    'Use S3, Dropbox, OneDrive, Google Drive, FTP, or SFTP nodes after this node when the file should leave CtrlChecks storage.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Write Binary File has one configuration operation: store file bytes safely and return an asset ID plus metadata.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Write one managed workflow file asset under the backend binary storage root and return assetId, dataBase64, checksum, storage keys, and persistence metadata for downstream steps.',
          fields,
          outputExample: { success: true, written: true, assetId: 'asset-id', fileName: 'invoice-1048.pdf', mimeType: 'application/pdf', sizeBytes: 24512, checksumSha256: 'abc123...', storageProvider: 'local', storageKey: 'invoices/2026/invoice-1048.pdf', filePath: 'C:/safe-root/invoices/2026/invoice-1048.pdf', dataBase64: 'JVBERi0x...', metadataPersisted: true, metadataError: undefined },
          outputDescription: 'Returns success, written, assetId, fileName, mimeType, sizeBytes, checksumSha256, storageProvider, storageKey, filePath, dataBase64, metadataPersisted, and optional metadataError. Failures return _error from execute-workflow.',
          usageExample: { scenario: 'Store a generated invoice PDF before uploading it to OneDrive', inputValues: { fileName: 'invoice-{{$json.invoiceId}}.pdf', mimeType: 'application/pdf', dataBase64: '{{$json.dataBase64}}', folder: 'invoices/2026', persist: 'true' }, expectedOutput: 'Use {{$json.assetId}} for later Read Binary File or {{$json.dataBase64}} for immediate upload.' },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'dataBase64, data, content, fileData, or fileContent is required', cause: 'No file body was provided.', fix: 'Map {{$json.dataBase64}} from a previous download/PDF/file step or provide plain text/content.' },
    { error: 'File too large', cause: 'The payload exceeds the configured max size for binary storage.', fix: 'Reduce the file size or adjust maxSize when supported by the calling config.' },
    { error: 'unsafe file path outside binary storage root', cause: 'Folder or Custom Storage Path escapes the safe storage root.', fix: 'Use a relative folder/path under BINARY_FILE_ROOT and remove drive letters or .. segments.' },
    { error: 'metadataError', cause: 'The file was written but database metadata persistence failed.', fix: 'Use storageKey/filePath for immediate follow-up, and check database connectivity before relying on Asset ID.' },
    { error: 'write_binary_file: <message>', cause: 'Payload parsing, MIME inference, safe-path validation, file write, or metadata persistence failed.', fix: 'Check File Name, Binary Data, Folder, Custom Storage Path, Persist Metadata, and worker storage permissions.' },
  ],
  relatedNodes: ['read_binary_file', 'aws_s3', 'dropbox', 'onedrive', 'google_drive', 'ftp', 'sftp'],
};
