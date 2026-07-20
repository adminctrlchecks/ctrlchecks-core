import type { FieldDoc, NodeDoc } from '../types';

const help = (
  field: string,
  why: string,
  when: string,
  enter: string,
  source: string,
  later: string,
  format: string,
  example: string,
  wrong: string,
  mistake: string,
) => `What this field is: ${field}
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
  description: 'Choose the FTP action: get, put, list, or delete. Runtime aliases download and upload are also accepted.',
  options: ['get', 'put', 'list', 'delete'],
  defaultValue: 'get',
  helpText: help(
    'The file action CtrlChecks should perform on the FTP server. Get downloads one file, Put uploads one file, List reads a directory, and Delete removes one file.',
    'The operation decides whether Remote Path is treated as a file or folder and whether Content is required.',
    'Always choose it before filling the file fields.',
    'Choose get for a download, put for an upload, list for a directory listing, or delete for removal. Generated configs may also send download/upload aliases.',
    'This is a workflow decision, not a value copied from the FTP server.',
    'Downstream nodes can check {{$json.output.operation}} in the registry path or success/_error in the legacy path.',
    'One of get, put, list, delete; aliases download and upload normalize to get and put in the registry override.',
    'A finance workflow chooses get to download /bank-drops/daily.csv every morning.',
    'Unsupported values fail with an unsupported operation error before the transfer completes.',
    'Do not choose put unless Content has the bytes you want to upload.',
  ),
  example: 'get',
};

const host: FieldDoc = {
  name: 'Host',
  internalKey: 'host',
  type: 'string',
  required: true,
  description: 'FTP server hostname or IP address.',
  placeholder: 'ftp.example.com',
  helpText: help(
    'The FTP server address CtrlChecks connects to.',
    'Without the correct host, the worker cannot open an FTP connection.',
    'Fill it for every FTP operation.',
    'Enter only the hostname or IP address, without ftp:// and without a folder path.',
    'Get it from your hosting control panel, FTP account page, or server administrator.',
    'You usually do not map this dynamically; if a tenant-specific server is stored upstream, use {{$json.ftpHost}}.',
    'Hostname or IP address such as ftp.company.com or 203.0.113.10.',
    'A retailer enters ftp.fulfillment-partner.com to exchange order files with a warehouse.',
    'Missing Host returns ftp: host is required, or the connection fails with ftp error: <message>.',
    'Do not paste a full URL such as ftp://server.com/inbox; put /inbox in Remote Path.',
  ),
  example: 'ftp.fulfillment-partner.com',
};

const port: FieldDoc = {
  name: 'Port',
  internalKey: 'port',
  type: 'number',
  required: false,
  description: 'FTP TCP port.',
  defaultValue: '21',
  helpText: help(
    'The network port used to connect to the FTP service.',
    'Some servers use a custom port, and the wrong port makes the connection fail even when Host is correct.',
    'Fill it when your provider gives a port other than 21.',
    'Enter 21 for normal FTP, or the custom numeric port from your provider. Enable Secure FTP only when explicit FTPS/TLS is required.',
    'Get it from the FTP account or server connection details.',
    'If an earlier setup step stores a port, map it as {{$json.ftpPort}}.',
    'Number from 1 through 65535.',
    'A hosting provider gives port 2121 for a locked-down upload account.',
    'Wrong ports usually return ftp error: <connection message>.',
    'Do not use SFTP port 22 here; use the SFTP node for SSH-based transfers.',
  ),
  example: '21',
};

const username: FieldDoc = {
  name: 'Username',
  internalKey: 'username',
  type: 'string',
  required: true,
  description: 'FTP login username.',
  helpText: help(
    'The account name used to sign in to the FTP server.',
    'FTP servers check username and password before allowing file operations.',
    'Fill it for every non-anonymous FTP workflow.',
    'Enter the username exactly as your provider shows it.',
    'Get it from cPanel, Plesk, your hosting dashboard, or your server administrator.',
    'Use a saved FTP connection when available; otherwise map a controlled value such as {{$json.ftpUsername}} only for approved dynamic setups.',
    'Plain username string, often ftpuser, uploads@example.com, or a server account name.',
    'A warehouse gives the username acme_inbound for nightly product-feed uploads.',
    'Wrong usernames usually return ftp error: <login rejected message>.',
    'Do not use your CtrlChecks login email unless it is also the FTP username.',
  ),
  example: 'acme_inbound',
};

const password: FieldDoc = {
  name: 'Password',
  internalKey: 'password',
  type: 'password',
  required: true,
  description: 'FTP account password.',
  helpText: help(
    'The secret used with Username to authenticate to FTP.',
    'Without the right password, the server rejects every operation.',
    'Fill it through a saved FTP connection whenever possible; direct workflow fields are a legacy fallback.',
    'Enter the FTP password or map a credential value from the vault.',
    'Get it from the person or hosting panel that created the FTP account.',
    'Downstream nodes should never use this value; they use transfer outputs such as dataBase64, items, path, or deleted.',
    'Secret text. It is not a file path, token URL, or SSH key.',
    'A partner creates a password for the acme_inbound FTP account.',
    'Wrong passwords return ftp error: <login/authentication message>.',
    'Do not store shared production FTP passwords in normal workflow fields when a saved connection can hold them.',
  ),
  example: '{{$credentials.ftp.password}}',
};

const secure: FieldDoc = {
  name: 'Secure FTP',
  internalKey: 'secure',
  type: 'boolean',
  required: false,
  description: 'Enable explicit FTPS/TLS in the registry executor.',
  defaultValue: 'false',
  helpText: help(
    'Whether the FTP connection should use explicit TLS/FTPS.',
    'Some FTP servers refuse plain FTP and require TLS.',
    'Enable it only when your FTP provider says FTPS or explicit TLS is required.',
    'Use true for explicit FTPS/TLS, false for plain FTP.',
    'Get this from the server connection instructions.',
    'You normally do not map this, but a setup record could provide {{$json.useFtps}}.',
    'Boolean true or false.',
    'A hosting provider says "Use explicit FTP over TLS" for compliance uploads, so Secure FTP is true.',
    'Wrong TLS settings can cause ftp error: <connection or handshake message>.',
    'Do not confuse FTPS with SFTP; SFTP is SSH-based and uses the SFTP node.',
  ),
  example: 'false',
};

const remotePath: FieldDoc = {
  name: 'Remote Path',
  internalKey: 'remotePath',
  type: 'string',
  required: true,
  description: 'Remote file or directory path on the FTP server.',
  placeholder: '/incoming/orders.csv',
  helpText: help(
    'The file or folder location on the FTP server.',
    'The runtime uses this as the download file, upload destination, list folder, or delete target.',
    'Fill it for every operation. For List, use a directory. For Get, Put, and Delete, use a file path.',
    'Enter an absolute path such as /incoming/orders.csv or a relative path allowed by your FTP account.',
    'Get it from the partner file-transfer instructions, your FTP client, or a previous List operation.',
    'Map paths such as {{$json.remotePath}} or build one like /exports/{{$json.reportDate}}.csv.',
    'FTP path string. Slash-separated folder names are accepted.',
    'A payroll workflow downloads /outbox/payroll_{{$json.runDate}}.csv.',
    'Blank paths default to / in the legacy executor but fail for file operations in the registry path.',
    'Do not include the host or ftp:// prefix in this field.',
  ),
  example: '/incoming/orders.csv',
};

const pathAlias: FieldDoc = {
  name: 'Path Alias',
  internalKey: 'path',
  type: 'string',
  required: false,
  description: 'Backend alias for Remote Path used by generated registry configs.',
  helpText: help(
    'An alternate backend name for Remote Path.',
    'The registry override accepts path as well as remotePath, so generated configs still work.',
    'Use it only in generated or API-created workflow configs; the visual panel uses Remote Path.',
    'Enter the same FTP path you would put in Remote Path.',
    'Usually comes from an AI-generated config or upstream value.',
    'Map {{$json.path}} when a previous file-listing step returns that key.',
    'FTP path string such as /incoming/orders.csv.',
    'A generated workflow sets path to /reports/daily.csv for download.',
    'If both path and remotePath are empty, file operations fail.',
    'Do not fill both with different values; remotePath wins in the patched registry override.',
  ),
  example: '/incoming/orders.csv',
};

const content: FieldDoc = {
  name: 'Content',
  internalKey: 'content',
  type: 'textarea',
  required: false,
  description: 'File body for Put File.',
  helpText: help(
    'The bytes or text to upload to the FTP server.',
    'Put File cannot upload an empty body.',
    'Fill it only for put/upload operations.',
    'Enter plain text for text files, base64 for binary files, or a data URL.',
    'Usually comes from a previous file, report, PDF, CSV, or AI generation step.',
    'Map {{$json.dataBase64}} for binary downloads or {{$json.csv}} for generated text reports.',
    'String payload. Base64 or data URL is safest for PDFs, images, and spreadsheets.',
    'A nightly export maps {{$json.csvReport}} and uploads it to /outbox/orders.csv.',
    'Missing upload content returns dataBase64, content, or fileData is required for put, or ftp put: dataBase64 (or content) is required on the legacy path.',
    'Do not paste a local computer file path here; this field is the file content itself.',
  ),
  example: '{{$json.dataBase64}}',
};

const dataBase64: FieldDoc = {
  name: 'Data Base64',
  internalKey: 'dataBase64',
  type: 'textarea',
  required: false,
  description: 'Base64 upload body for Put File.',
  helpText: help(
    'A backend-supported upload body field for binary file content.',
    'It lets generated configs pass binary data without overloading Content.',
    'Use it for put/upload when a previous node produced base64 bytes.',
    'Enter a base64 string or map {{$json.dataBase64}}.',
    'Usually comes from Read Binary File, OneDrive/S3/Dropbox download, PDF generation, or OCR output.',
    'Map it directly as {{$json.dataBase64}}; downstream FTP output may also include dataBase64 after get.',
    'Base64 string without spaces, or a data URL when handled by the registry path.',
    'A PDF generated earlier is uploaded as {{$json.dataBase64}}.',
    'If it is empty and Content/File Data are empty, put fails.',
    'Do not base64-encode normal text unless the receiving partner expects binary-safe transfer.',
  ),
  example: '{{$json.dataBase64}}',
};

const fileData: FieldDoc = {
  name: 'File Data',
  internalKey: 'fileData',
  type: 'textarea',
  required: false,
  description: 'Legacy registry upload body alias.',
  helpText: help(
    'An older backend alias for upload content.',
    'Some AI-generated configs use fileData instead of content or dataBase64.',
    'Use it only for generated configs or old workflows; the visual panel uses Content.',
    'Enter the same payload you would put in Content.',
    'Usually comes from an earlier file-producing node.',
    'Map {{$json.fileData}} only when upstream actually uses that key.',
    'Plain text, base64, or data URL string.',
    'A legacy workflow maps fileData from an older PDF node.',
    'If all upload-body aliases are empty, put fails.',
    'Do not use File Data and Content with different payloads in the same run.',
  ),
  example: '{{$json.fileData}}',
};

const fields = [operation, host, port, username, password, secure, remotePath, pathAlias, content, dataBase64, fileData];

const op = (
  name: string,
  value: string,
  description: string,
  inputValues: Record<string, string>,
  outputExample: Record<string, unknown>,
  expectedOutput: string,
) => ({
  name,
  value,
  description,
  fields,
  outputExample,
  outputDescription: 'Registry execution returns success plus output.operation and output.data. Legacy execution can return top-level items/count for list, dataBase64/sizeBytes for get, path/sizeBytes for put, deleted/path for delete, or _error on failure.',
  usageExample: {
    scenario: description,
    inputValues,
    expectedOutput,
  },
  externalDocsUrl: 'https://en.wikipedia.org/wiki/File_Transfer_Protocol',
});

export const ftpDoc: NodeDoc = {
  slug: 'ftp',
  displayName: 'FTP',
  category: 'File',
  logoUrl: '/icons/nodes/ftp.svg',
  description: 'Transfer files to and from FTP servers. Use SFTP instead whenever the server supports SSH-based secure transfer.',
  credentialType: 'FTP Credentials',
  credentialSetupSteps: [
    'Create or select FTP Credentials in CtrlChecks Connections so Host, Port, Username, and Password are stored in the credential vault instead of normal workflow fields.',
    'Connect this node output to downstream parser, notification, or storage steps; any service node account connection should stay on the relevant service node or saved connection.',
    'Ask the server owner which folder your account can access and whether uploads, downloads, listing, and deletes are allowed.',
    'Use the least-privilege FTP account possible. FTP is not encrypted unless explicit FTPS/TLS is enabled, so prefer SFTP when available.',
    'Test with List on a harmless directory before running Get, Put, or Delete against production files.',
  ],
  credentialDocsUrl: 'https://en.wikipedia.org/wiki/File_Transfer_Protocol',
  resources: [
    {
      name: 'Operations',
      description: 'FTP supports get, put, list, and delete in the visual panel. Registry-generated aliases download and upload are accepted too.',
      operations: [
        op('Get File', 'get', 'Download one file from an FTP server and return its bytes as base64 so later workflow steps can parse, email, archive, or re-upload the file without needing direct FTP access.', {
          operation: 'get',
          host: 'ftp.fulfillment-partner.com',
          remotePath: '/incoming/orders.csv',
        }, { success: true, output: { operation: 'get', data: { path: '/incoming/orders.csv', size: 4096, dataBase64: 'T3JkZXJJZCxTdGF0dXM=' } } }, 'Use {{$json.output.data.dataBase64}} in the registry path, or {{$json.dataBase64}} on the legacy path.'),
        op('Put File', 'put', 'Upload one text or binary payload to a remote FTP path, usually for partner handoffs, report exports, order feeds, or legacy server integrations that expect files in a watched folder.', {
          operation: 'put',
          host: 'ftp.fulfillment-partner.com',
          remotePath: '/outbox/report.csv',
          content: '{{$json.csvReport}}',
        }, { success: true, output: { operation: 'put', data: { path: '/outbox/report.csv', size: 4096, uploaded: true } } }, 'Use {{$json.output.data.uploaded}}, {{$json.output.data.path}}, or legacy {{$json.uploaded}} to confirm the partner file was written.'),
        op('List Files', 'list', 'List files in one FTP directory so the workflow can inspect available partner files, choose the newest export, branch on whether a file arrived, or prepare a later Get File step.', {
          operation: 'list',
          host: 'ftp.fulfillment-partner.com',
          remotePath: '/incoming',
        }, { success: true, output: { operation: 'list', data: [{ name: 'orders.csv', size: 4096, type: 'file' }] } }, 'Use {{$json.output.data}} or legacy {{$json.items}} to choose which remote path to download next.'),
        op('Delete File', 'delete', 'Remove one file from the FTP server after a successful handoff, duplicate check, retention decision, or human-approved cleanup step confirms the file should no longer remain there.', {
          operation: 'delete',
          host: 'ftp.fulfillment-partner.com',
          remotePath: '/incoming/processed/orders.csv',
        }, { success: true, output: { operation: 'delete', data: { path: '/incoming/processed/orders.csv', deleted: true } } }, 'Use {{$json.output.data.deleted}}, {{$json.output.data.path}}, or legacy {{$json.deleted}} to log the cleanup result.'),
      ],
    },
  ],
  commonErrors: [
    { error: 'ftp: host is required', cause: 'Host is empty or the saved FTP credential did not inject it.', fix: 'Fill Host or select a saved FTP connection with host, username, password, and port.' },
    { error: 'ftp: operation is required (get, put, list, delete)', cause: 'Operation is blank.', fix: 'Choose Get File, Put File, List Files, or Delete File.' },
    { error: 'remotePath is required for get / remotePath is required for put / remotePath is required for delete', cause: 'A file operation has no target path.', fix: 'Fill Remote Path with the exact FTP file path.' },
    { error: 'dataBase64, content, or fileData is required for put', cause: 'Put File has no upload body.', fix: 'Map Content, Data Base64, or File Data from a previous step.' },
    { error: 'Unsupported FTP operation: <operation>. Supported: get, put, list, delete', cause: 'The operation value is stale or not supported.', fix: 'Use get, put, list, delete, or generated aliases download/upload.' },
    { error: 'FTP_FAILED / ftp error: <message>', cause: 'The FTP server rejected login, permissions, path, TLS, or network access.', fix: 'Check credentials, firewall, port, secure setting, remote path, and folder permissions.' },
  ],
  relatedNodes: ['sftp', 'read_binary_file', 'write_binary_file', 'aws_s3', 'dropbox'],
};
