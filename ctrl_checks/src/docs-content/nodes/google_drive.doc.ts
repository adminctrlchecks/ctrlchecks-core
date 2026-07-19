import type { NodeDoc } from '../types';

const operationHelpText = `What this field means: Operation chooses which Google Drive action this node performs.

Why it matters: It decides which Drive API call runs and which other fields become required.

When to fill it: Choose it first, before filling any other field.

What to enter: Choose list to see files in a folder, upload to add a new file, or download to fetch an existing file's content. Important limitation: Delete also appears in this dropdown, but the runtime executor does not implement it — selecting Delete always fails with "Unsupported Google Drive operation: delete". Do not rely on it to remove files.

Where the value comes from: This is a fixed dropdown choice made while building the workflow.

How to use it later: The output shape depends on the operation — list returns a files array, upload/download return file metadata (and download also returns the file's content) merged directly into $json.

Accepted format: One of list, upload, or download (Delete is present in the dropdown but not functional).

Real workplace example: Use list to check a shared folder for new uploads, upload to save a generated report, and download to read a file's content into a later step.

If it is empty or wrong: Runtime defaults to list when missing, and returns "Unsupported Google Drive operation: ..." for delete or any other unrecognized value.

Common mistake: Selecting Delete expecting the file to be removed — it is not implemented and always returns an error instead.

Dropdown options: list fetches files (optionally inside one folder) and needs no other required field. upload adds a new file and needs File Name and File Data. download fetches an existing file's metadata and content and needs File ID. delete is shown in the dropdown but is not implemented by the runtime executor.`;

const folderIdHelpText = `What this field means: Folder ID limits List to files inside one specific Google Drive folder, and sets the destination folder for Upload.

Why it matters: Without it, List returns files from across the account (not scoped to a folder), and Upload saves to the Drive root.

When to fill it: Optional for list and upload.

What to enter: The folder's ID from its Google Drive URL.

Where the value comes from: Open the target folder in Google Drive and copy the ID segment from the URL: https://drive.google.com/drive/folders/THIS_PART.

How to use it later: This is not echoed back in the node's own output; it only scopes which files are listed or where the uploaded file lands.

Accepted format: A Google Drive folder ID string.

Real workplace example: Scope List to a shared "Invoices" folder so only relevant files come back, or upload generated reports directly into a "Reports" folder.

If it is empty or wrong: Empty for list returns files from across the whole Drive (subject to Drive API defaults); empty for upload saves to the root folder. A wrong/inaccessible folder ID returns a Drive API error.

Common mistake: Pasting a file ID here instead of a folder ID — Drive treats them as different ID types.`;

const fileIdHelpText = `What this field means: File ID identifies the specific Google Drive file this Download operation should fetch.

Why it matters: Download needs to know exactly which file's metadata and content to retrieve.

When to fill it: Required for download.

What to enter: Map {{$json.id}} from a previous List or Upload step, or paste the ID from the file's Google Drive URL.

Where the value comes from: A previous Google Drive List step's files array, a previous Upload step's own output, or the file's share URL (https://drive.google.com/file/d/THIS_PART/view).

How to use it later: The same ID is echoed back at {{$json.id}} and {{$json.fileId}} after download.

Accepted format: A Google Drive file ID string.

Real workplace example: Loop over {{$json.files}} from a List step and use each item's {{$json.id}} to download that specific file.

If it is empty or wrong: Runtime returns the error "fileId is required for download" when blank. A wrong or inaccessible ID returns a Drive API error.

Common mistake: Using a folder ID here instead of a file ID — Download expects a file, not a folder.`;

const fileNameHelpText = `What this field means: File Name is the name the uploaded file will have in Google Drive.

Why it matters: Upload needs a name to save the file under; Drive does not infer one automatically from the content.

When to fill it: Required for upload.

What to enter: A descriptive file name with extension, such as invoice-1048.pdf.

Where the value comes from: Type it directly, or map one from an earlier step, such as {{$json.generatedFileName}}.

How to use it later: The saved name is echoed back at {{$json.name}} and {{$json.fileName}} after upload.

Accepted format: Plain text, ideally including a file extension matching MIME Type.

Real workplace example: "Invoice-{{$json.invoiceNumber}}.pdf" for a generated invoice document.

If it is empty or wrong: Runtime returns the error "fileName is required for upload" when blank.

Common mistake: Leaving off the file extension, which can make the file harder to open correctly from outside Drive's own preview.`;

const fileDataHelpText = `What this field means: File Data is the actual content to upload, as plain text, base64, or a data URL.

Why it matters: Upload needs the real bytes of the file, not just its name.

When to fill it: Required for upload.

What to enter: Plain text content for simple text files, a base64 string for binary files, or a full data URL such as data:application/pdf;base64,JVBERi0x....

Where the value comes from: Map {{$json.dataBase64}} from a previous Read Binary File, HTTP Request, or PDF-generation step; use fileContent or dataBase64 as alternate field names if a workflow already sets those.

How to use it later: This is not echoed back in the node's own output (only file metadata is); use the returned {{$json.id}} to reference the uploaded file afterward.

Accepted format: Plain text, raw base64, or a data:mime/type;base64,... data URL.

Real workplace example: {{$json.dataBase64}} from an HTTP Request step that downloaded a PDF, re-uploaded into a shared Drive folder.

If it is empty or wrong: Runtime returns the error "fileData is required for upload" when blank (after checking the fileContent/dataBase64 aliases too).

Common mistake: Pasting a file path or URL instead of the actual file content — this field needs the bytes/text themselves, not a reference to where they live.`;

const mimeTypeHelpText = `What this field means: MIME Type tells Google Drive what kind of file is being uploaded, such as a PDF, image, or spreadsheet.

Why it matters: It affects how Drive previews the file and which apps offer to open it.

When to fill it: Optional for upload; a generic default is used if left blank.

What to enter: A standard MIME type such as application/pdf, image/png, or text/csv.

Where the value comes from: Match the actual file type being uploaded, or read it from an earlier step's file metadata such as {{$json.mimeType}}.

How to use it later: The saved type is echoed back at {{$json.mimeType}} after upload.

Accepted format: A standard MIME type string.

Real workplace example: application/pdf for a generated invoice PDF, or text/csv for an exported report.

If it is empty or wrong: Runtime defaults to application/octet-stream (generic binary) when left blank, which still uploads successfully but previews less nicely in Drive.

Common mistake: Setting the wrong MIME type for the actual content (e.g. labeling a CSV as application/pdf), which can make Drive's preview fail even though the file itself uploaded correctly.`;

export const googleDriveDoc: NodeDoc = {
  slug: 'google_drive',
  displayName: 'Google Drive',
  category: 'Google',
  logoUrl: '/icons/nodes/google_drive.svg',
  description: 'List, upload, and download files in Google Drive through the connected Google account. The visual panel also shows a Delete option that is not implemented by the runtime executor.',
  credentialType: 'Google OAuth (Drive scope) - saved in Connections and shared with other Google nodes',
  credentialSetupSteps: [
    'In CtrlChecks, open Connections -> Add Connection -> Google, sign in with the Google account whose Drive files this node should use, and grant the Drive permission requested.',
    'The OAuth token is stored in the credential system. Do not paste Google tokens, client secrets, or passwords into Google Drive workflow fields.',
    'The connected Google account needs at least Viewer access to list/download a file, and Editor access (or ownership) on the target folder to upload into it.',
    'The same Google connection can also power Gmail, Google Sheets, and Google Calendar nodes if those scopes are granted.',
    'Connect the Google Drive output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.files}}, {{$json.id}}, {{$json.webViewLink}}, or {{$json._error}}.',
    'Downstream service node account connection setup is still required for nodes after Google Drive; the Google connection only authorizes Drive (and optionally Gmail/Sheets/Calendar) access.',
  ],
  credentialDocsUrl: 'https://developers.google.com/drive/api/guides/api-specific-auth',
  resources: [
    {
      name: 'Files',
      description: 'List files in Drive (optionally scoped to a folder), upload a new file, or download an existing file\'s metadata and content. Delete appears in the dropdown but is not implemented.',
      operations: [
        {
          name: 'List Files',
          value: 'list',
          description: 'Fetches files from Google Drive, optionally scoped to one folder, returning each file\'s id, name, MIME type, size, and links.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Drive action to run.', helpText: operationHelpText, placeholder: 'list', example: 'list', defaultValue: 'list', options: ['list', 'upload', 'download', 'delete'] },
            { name: 'Folder Id', internalKey: 'folderId', type: 'string', required: false, description: 'Optional folder to scope the listing to.', helpText: folderIdHelpText, placeholder: '1a2b3c4d5e6f7g8h9i0j', example: '1a2b3c4d5e6f7g8h9i0j' },
          ],
          outputExample: {
            operation: 'list',
            files: [
              { id: 'file123abc', name: 'Invoice-1048.pdf', mimeType: 'application/pdf', size: '204800', modifiedTime: '2025-01-15T09:00:00.000Z', webViewLink: 'https://drive.google.com/file/d/file123abc/view' },
            ],
          },
          outputDescription: 'files: array of Drive file objects (id, name, mimeType, size, modifiedTime, webViewLink), available directly at {{$json.files}}. data: the same raw Drive API response object, duplicated for reference. operation: echoes back "list". Failures return _error, _errorCode ("GOOGLE_DRIVE_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Check a shared "Invoices" folder for new files each morning',
            inputValues: { operation: 'list', folderId: '1a2b3c4d5e6f7g8h9i0j' },
            expectedOutput: 'Returns the files in that folder. Loop over {{$json.files}} and use each item\'s {{$json.id}} in a Download step to process new invoices.',
          },
          externalDocsUrl: 'https://developers.google.com/drive/api/reference/rest/v3/files/list',
        },
        {
          name: 'Upload File',
          value: 'upload',
          description: 'Uploads a new file to Google Drive (optionally into a specific folder), given a file name, its content, and an optional MIME type.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Drive action to run.', helpText: operationHelpText, placeholder: 'upload', example: 'upload', defaultValue: 'list', options: ['list', 'upload', 'download', 'delete'] },
            { name: 'File Name', internalKey: 'fileName', type: 'string', required: true, description: 'Name to save the file under.', helpText: fileNameHelpText, placeholder: 'document.pdf', example: 'Invoice-{{$json.invoiceNumber}}.pdf' },
            { name: 'File Data', internalKey: 'fileData', type: 'textarea', required: true, description: 'File content to upload.', helpText: fileDataHelpText, placeholder: '{{$json.dataBase64}} or data:application/pdf;base64,...', example: '{{$json.dataBase64}}' },
            { name: 'MIME Type', internalKey: 'mimeType', type: 'string', required: false, description: 'File type for the upload.', helpText: mimeTypeHelpText, placeholder: 'application/pdf', example: 'application/pdf', defaultValue: 'application/octet-stream' },
            { name: 'Folder Id', internalKey: 'folderId', type: 'string', required: false, description: 'Optional destination folder for the upload.', helpText: folderIdHelpText, placeholder: '1a2b3c4d5e6f7g8h9i0j', example: '1a2b3c4d5e6f7g8h9i0j' },
          ],
          outputExample: {
            operation: 'upload',
            id: 'file456def',
            fileId: 'file456def',
            name: 'Invoice-1048.pdf',
            fileName: 'Invoice-1048.pdf',
            mimeType: 'application/pdf',
            size: 204800,
            webViewLink: 'https://drive.google.com/file/d/file456def/view',
          },
          outputDescription: 'id/fileId: the new file\'s Drive ID (both keys hold the same value). name/fileName: the saved file name. mimeType, size, webViewLink: file metadata for the newly uploaded file. data: the same object duplicated for reference. Failures return _error, _errorCode ("GOOGLE_DRIVE_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Save a generated PDF report into a shared Drive folder',
            inputValues: { operation: 'upload', fileName: 'Report-{{$json.reportDate}}.pdf', fileData: '{{$json.dataBase64}}', mimeType: 'application/pdf', folderId: '1a2b3c4d5e6f7g8h9i0j' },
            expectedOutput: 'The file appears in the target folder. Use {{$json.id}} to reference it later, and {{$json.webViewLink}} to share a direct link.',
          },
          externalDocsUrl: 'https://developers.google.com/drive/api/guides/manage-uploads',
        },
        {
          name: 'Download File',
          value: 'download',
          description: 'Fetches an existing file\'s metadata and content by File ID, returning binary content as base64 and text/JSON content directly, so a later step can process or forward it.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Drive action to run.', helpText: operationHelpText, placeholder: 'download', example: 'download', defaultValue: 'list', options: ['list', 'upload', 'download', 'delete'] },
            { name: 'File Id', internalKey: 'fileId', type: 'string', required: true, description: 'Which file to download.', helpText: fileIdHelpText, placeholder: '1a2b3c4d5e6f7g8h9i0j', example: '{{$json.id}}' },
          ],
          outputExample: {
            operation: 'download',
            id: 'file123abc',
            fileId: 'file123abc',
            name: 'Invoice-1048.pdf',
            fileName: 'Invoice-1048.pdf',
            mimeType: 'application/pdf',
            size: 204800,
            webViewLink: 'https://drive.google.com/file/d/file123abc/view',
            dataBase64: 'JVBERi0xLjQKJ...',
          },
          outputDescription: 'id/fileId, name/fileName, mimeType, size, webViewLink, modifiedTime: metadata about the downloaded file. dataBase64: the file content, base64-encoded, for binary files (images, PDFs); a plain content field is used instead for text/JSON files. data: the same object duplicated for reference. Failures return _error, _errorCode ("GOOGLE_DRIVE_FAILED"), and _errorDetails instead.',
          usageExample: {
            scenario: 'Download an invoice PDF found by a previous List step and attach it to an email',
            inputValues: { operation: 'download', fileId: '{{$json.id}}' },
            expectedOutput: 'Returns the file\'s metadata and content. Map {{$json.dataBase64}} into an Email or Write Binary File node to forward or save it.',
          },
          externalDocsUrl: 'https://developers.google.com/drive/api/guides/manage-downloads',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Google OAuth token not found', cause: 'Neither the workflow owner nor the current user has a Google account connected with Drive scope.', fix: 'Open Connections, add a Google connection, and grant the Drive permission requested.' },
    { error: 'fileId is required for download', cause: 'File Id resolved to empty for a download operation.', fix: 'Fill File Id or map {{$json.id}} from a previous List or Upload step.' },
    { error: 'fileName is required for upload', cause: 'File Name resolved to empty for an upload operation.', fix: 'Fill File Name with a descriptive name and extension.' },
    { error: 'fileData is required for upload', cause: 'File Data (and its fileContent/dataBase64 aliases) all resolved to empty for an upload operation.', fix: 'Map {{$json.dataBase64}} from an earlier file-producing step, or fill File Data directly.' },
    { error: 'Unsupported Google Drive operation: delete', cause: 'Operation was set to delete, which the runtime executor does not implement even though it appears in the visual dropdown.', fix: 'There is no working delete path today; remove or replace this step if file deletion is required, or delete the file manually in Google Drive.' },
    { error: 'Google Drive API error (via GOOGLE_DRIVE_FAILED)', cause: 'The Drive API rejected the request — commonly a wrong Folder Id/File Id, or insufficient permission on the target file or folder.', fix: 'Check _errorDetails, verify the IDs, and confirm the connected account has access to that file or folder.' },
    { error: 'Next node cannot find the uploaded/downloaded file fields', cause: 'The downstream node is reading a nested "output" wrapper instead of the flat merged fields runtime actually returns.', fix: 'Use {{$json.id}}, {{$json.name}}, {{$json.webViewLink}}, and (for downloads) {{$json.dataBase64}} directly — these are merged straight into $json, not nested.' },
    { error: 'Permission denied after Google Drive', cause: 'The Google connection only authorizes Drive (and optionally Gmail/Sheets/Calendar) access; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Google Drive.' },
  ],
  relatedNodes: ['google_drive_trigger', 'google_sheets', 'google_gmail', 'write_binary_file', 'read_binary_file'],
};
