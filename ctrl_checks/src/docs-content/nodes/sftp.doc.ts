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
  description: 'Choose the SFTP action: get, put, list, or delete. Runtime aliases download and upload are also accepted.',
  options: ['get', 'put', 'list', 'delete'],
  defaultValue: 'get',
  helpText: help('The secure file-transfer action to run over SSH.', 'It controls whether Remote Path is read as a file, upload target, folder, or delete target.', 'Always choose it before setting path/content fields.', 'Choose get, put, list, or delete. Generated configs may also send download/upload aliases.', 'This is a workflow choice, not a value from the server.', 'Downstream nodes can read {{$json.output.operation}} in registry execution or success/_error on legacy execution.', 'One of get, put, list, delete; aliases download/upload normalize to get/put in the registry override.', 'A bank-reconciliation workflow chooses get to download /daily/transactions.csv.', 'Unsupported values fail with Unsupported SFTP operation or sftp: unsupported operation.', 'Do not choose put unless Content/Data Base64/File Data contains the file body.'),
  example: 'get',
};

const host: FieldDoc = {
  name: 'Host',
  internalKey: 'host',
  type: 'string',
  required: true,
  description: 'SFTP server hostname or IP address.',
  placeholder: 'sftp.example.com',
  helpText: help('The SSH/SFTP server address CtrlChecks connects to.', 'Without Host, no secure file-transfer session can start.', 'Fill it for every SFTP operation.', 'Enter the hostname or IP only, without sftp:// and without a path.', 'Get it from your hosting provider, partner transfer instructions, or server administrator.', 'Map {{$json.sftpHost}} only for approved dynamic tenant-specific servers.', 'Hostname or IP address such as sftp.company.com or 203.0.113.22.', 'A payroll workflow connects to sftp.payroll-vendor.com.', 'Missing Host returns sftp: host is required or host is required.', 'Do not paste a full URL such as sftp://server/outbox.'),
  example: 'sftp.payroll-vendor.com',
};

const port: FieldDoc = {
  name: 'Port',
  internalKey: 'port',
  type: 'number',
  required: false,
  description: 'SFTP/SSH TCP port.',
  defaultValue: '22',
  helpText: help('The network port for the SSH/SFTP service.', 'Some servers use custom SSH ports, and the wrong port prevents connection.', 'Fill it when the server does not use port 22.', 'Enter 22 or the custom numeric port from your server admin.', 'Get it from SFTP connection instructions.', 'Map {{$json.sftpPort}} only when the port is known from upstream configuration.', 'Number from 1 through 65535.', 'A vendor requires SFTP on port 2222.', 'Wrong ports usually return SFTP_FAILED or sftp error connection messages.', 'Do not use FTP port 21 here; SFTP uses SSH.'),
  example: '22',
};

const username: FieldDoc = {
  name: 'Username',
  internalKey: 'username',
  type: 'string',
  required: true,
  description: 'SSH/SFTP username.',
  helpText: help('The SSH account name used to sign in to the SFTP server.', 'SFTP needs a username plus either Password or Private Key.', 'Fill it for every SFTP operation.', 'Enter the username exactly as provided.', 'Get it from the server admin, hosting panel, or partner setup sheet.', 'Use a saved SFTP connection when possible; map {{$json.sftpUsername}} only for controlled generated configs.', 'Plain username string such as deploy, reports_inbound, or vendor_sftp.', 'A partner gives username acme_reports for nightly uploads.', 'Missing Username returns username is required in registry execution or may fail during legacy connection.', 'Do not use your Microsoft/Google account email unless it is actually the SFTP username.'),
  example: 'acme_reports',
};

const password: FieldDoc = {
  name: 'Password',
  internalKey: 'password',
  type: 'password',
  required: false,
  description: 'SFTP password, used when no private key is supplied.',
  helpText: help('The SSH password for the SFTP user.', 'The registry executor requires either Password or Private Key; many SFTP servers allow only one method.', 'Fill it when the account uses password authentication.', 'Enter the SFTP password through a saved credential when possible.', 'Get it from the server admin or hosting panel.', 'Downstream nodes should never use this value; they use file outputs such as dataBase64 or output.data.', 'Secret text. Leave blank when using Private Key authentication.', 'A vendor creates a temporary SFTP password for an upload account.', 'Missing both Password and Private Key returns password or privateKey is required.', 'Do not paste an SSH private key into Password.'),
  example: '{{$credentials.sftp.password}}',
};

const privateKey: FieldDoc = {
  name: 'Private Key',
  internalKey: 'privateKey',
  type: 'textarea',
  required: false,
  description: 'PEM SSH private key for key-based authentication.',
  helpText: help('The private half of an SSH key pair used instead of a password.', 'Many production SFTP servers require key-based login.', 'Fill it when your SFTP account authenticates with an SSH key.', 'Paste the full PEM key including BEGIN and END lines, preferably in a saved SFTP connection.', 'Generate it with your server team or get it from your approved secure key store.', 'Never pass this downstream; use it only for the connection.', 'PEM text such as -----BEGIN OPENSSH PRIVATE KEY----- ... -----END OPENSSH PRIVATE KEY-----.', 'An accounting SFTP server authorizes the public key and CtrlChecks stores the private key in Connections.', 'Malformed keys return SFTP_FAILED or sftp error authentication messages.', 'Do not paste the public key here; the server keeps the public key, CtrlChecks uses the private key.'),
  example: '-----BEGIN OPENSSH PRIVATE KEY-----',
};

const passphrase: FieldDoc = {
  name: 'Passphrase',
  internalKey: 'passphrase',
  type: 'password',
  required: false,
  description: 'Password that unlocks an encrypted private key.',
  helpText: help('The extra secret for an encrypted SSH private key.', 'Encrypted keys cannot be used until the passphrase unlocks them.', 'Fill it only when your private key was created with a passphrase.', 'Enter the passphrase in the saved SFTP connection or mapped credential field.', 'Get it from the team or key store that generated the private key.', 'It is never useful downstream; downstream nodes use transfer outputs.', 'Secret text. Leave blank for unencrypted private keys.', 'A security team gives a private key and separate passphrase for vendor upload access.', 'Wrong passphrases return SFTP_FAILED or authentication errors.', 'Do not put the account password here unless it is specifically the key passphrase.'),
  example: '{{$credentials.sftp.passphrase}}',
};

const remotePath: FieldDoc = {
  name: 'Remote Path',
  internalKey: 'remotePath',
  type: 'string',
  required: true,
  description: 'Remote file or directory path on the SFTP server.',
  placeholder: '/incoming/orders.csv',
  helpText: help('The file or folder location on the remote SFTP server.', 'It is the target for get, put, list, or delete.', 'Fill it for every operation. List uses a folder; file operations use a file path.', 'Enter an absolute path such as /incoming/orders.csv or a relative path allowed by the account.', 'Get it from partner instructions, your SFTP client, or a previous List Files operation.', 'Map {{$json.remotePath}} or build /exports/{{$json.reportDate}}.csv.', 'SFTP path string. / starts at server root; ~/ may work when the server permits home-relative paths.', 'A claims workflow uploads /inbound/claims_{{$json.batchId}}.csv.', 'Blank paths default to / or . in some executor paths but fail for file operations.', 'Do not include sftp://host in the path.'),
  example: '/incoming/orders.csv',
};

const pathAlias: FieldDoc = {
  name: 'Path Alias',
  internalKey: 'path',
  type: 'string',
  required: false,
  description: 'Backend alias for Remote Path.',
  helpText: help('An alternate backend name for Remote Path used by generated configs.', 'The registry override accepts path as well as remotePath.', 'Use it only in generated or API-created workflows; the panel uses Remote Path.', 'Enter the same SFTP path you would use in Remote Path.', 'Usually comes from generated configuration or upstream file metadata.', 'Map {{$json.path}} when a previous list output uses that key.', 'SFTP path string such as /outbox/report.pdf.', 'A generated workflow sets path to /exports/daily.csv.', 'If both path and remotePath are empty, get/put/delete fail.', 'Do not set path and remotePath to different locations; remotePath wins.'),
  example: '/outbox/report.pdf',
};

const content: FieldDoc = {
  name: 'Content',
  internalKey: 'content',
  type: 'textarea',
  required: false,
  description: 'File body for Put File.',
  helpText: help('The bytes or text to upload over SFTP.', 'Put File cannot upload an empty file body.', 'Fill it only for put/upload operations.', 'Enter plain text, base64, or a data URL. Base64 is safest for PDFs and images.', 'Usually comes from a generated report, downloaded file, PDF, or CSV step.', 'Map {{$json.dataBase64}} for binary content or {{$json.csvReport}} for text.', 'String payload. Plain text, base64, or data URL.', 'A settlement workflow uploads {{$json.csvReport}} to /settlements/out.csv.', 'Missing content returns dataBase64, content, or fileData is required for put, or sftp put: dataBase64 (or content) is required on the legacy path.', 'Do not paste a local laptop path; this field is the file body itself.'),
  example: '{{$json.dataBase64}}',
};

const dataBase64: FieldDoc = {
  name: 'Data Base64',
  internalKey: 'dataBase64',
  type: 'textarea',
  required: false,
  description: 'Base64 upload body for Put File.',
  helpText: help('A backend-supported upload body field for binary bytes.', 'It keeps binary file content safe through workflow JSON.', 'Use it for put/upload when upstream produced base64.', 'Map {{$json.dataBase64}}.', 'Usually comes from Read Binary File or a cloud download node.', 'After get, downstream nodes may use returned dataBase64 as the next file body.', 'Base64 string without spaces, or a data URL in the registry path.', 'A PDF download is re-uploaded to SFTP as {{$json.dataBase64}}.', 'If Data Base64, Content, and File Data are all empty, put fails.', 'Do not put JSON metadata here unless the receiving server expects that exact file content.'),
  example: '{{$json.dataBase64}}',
};

const fileData: FieldDoc = {
  name: 'File Data',
  internalKey: 'fileData',
  type: 'textarea',
  required: false,
  description: 'Legacy registry upload content alias.',
  helpText: help('An older backend alias for upload content.', 'Some generated workflows use fileData instead of content or dataBase64.', 'Use it only for generated configs or old workflows.', 'Enter the same payload you would put in Content.', 'Usually comes from a previous file-producing step.', 'Map {{$json.fileData}} only when upstream actually has that key.', 'Plain text, base64, or data URL string.', 'A legacy PDF workflow maps fileData into the SFTP upload.', 'If all body aliases are empty, put fails.', 'Do not provide conflicting payloads in Content and File Data.'),
  example: '{{$json.fileData}}',
};

const fields = [operation, host, port, username, password, privateKey, passphrase, remotePath, pathAlias, content, dataBase64, fileData];

const op = (name: string, value: string, description: string, inputValues: Record<string, string>, outputExample: Record<string, unknown>, expectedOutput: string) => ({
  name,
  value,
  description,
  fields,
  outputExample,
  outputDescription: 'Registry execution returns success plus output.operation and output.data. Legacy execution can return top-level items/count for list, dataBase64/sizeBytes for get, path/sizeBytes for put, deleted/path for delete, or _error on failure.',
  usageExample: { scenario: description, inputValues, expectedOutput },
  externalDocsUrl: 'https://en.wikipedia.org/wiki/SSH_File_Transfer_Protocol',
});

export const sftpDoc: NodeDoc = {
  slug: 'sftp',
  displayName: 'SFTP',
  category: 'File',
  logoUrl: '/icons/nodes/sftp.svg',
  description: 'Transfer files securely over SSH using password or private-key authentication.',
  credentialType: 'SFTP Credentials',
  credentialSetupSteps: [
    'Create or select SFTP Credentials in CtrlChecks Connections so Host, Port, Username, Password, Private Key, and Passphrase can be stored in the credential vault.',
    'Connect this node output to downstream parser, notification, or storage steps; any service node account connection should stay on the relevant service node or saved connection.',
    'Ask the server owner whether the account uses password authentication or SSH private-key authentication, and confirm the allowed folder.',
    'Store private keys and passphrases in Connections. Do not paste production SSH keys into normal workflow fields.',
    'Test with List on a harmless directory before running Get, Put, or Delete against production files.',
  ],
  credentialDocsUrl: 'https://en.wikipedia.org/wiki/SSH_File_Transfer_Protocol',
  resources: [
    {
      name: 'Operations',
      description: 'SFTP supports get, put, list, and delete in the visual panel. Registry-generated aliases download and upload are accepted too.',
      operations: [
        op('Get File', 'get', 'Download one file from an SFTP server and return bytes as base64 so later workflow steps can parse, email, store, or forward the file without needing direct SSH access.', { operation: 'get', host: 'sftp.payroll-vendor.com', remotePath: '/daily/transactions.csv' }, { success: true, output: { operation: 'get', data: { path: '/daily/transactions.csv', size: 4096, dataBase64: 'VHJhbnNhY3Rpb25JZA==' } } }, 'Use {{$json.output.data.dataBase64}} or legacy {{$json.dataBase64}} as file content for parsing, storage, or email attachment.'),
        op('Put File', 'put', 'Upload one text or binary payload to a remote SFTP path for secure partner handoffs, bank files, vendor reports, regulated data exchanges, or server-side import folders.', { operation: 'put', host: 'sftp.payroll-vendor.com', remotePath: '/inbound/report.csv', content: '{{$json.csvReport}}' }, { success: true, output: { operation: 'put', data: { path: '/inbound/report.csv', size: 4096, uploaded: true } } }, 'Use {{$json.output.data.uploaded}}, {{$json.output.data.path}}, or legacy {{$json.uploaded}} to confirm the file was written.'),
        op('List Files', 'list', 'List files in one SFTP directory so the workflow can detect arrivals, choose a file to download, avoid duplicate processing, or audit what the remote account can see.', { operation: 'list', host: 'sftp.payroll-vendor.com', remotePath: '/daily' }, { success: true, output: { operation: 'list', data: [{ name: 'transactions.csv', size: 4096, type: '-' }] } }, 'Use {{$json.output.data}} or legacy {{$json.items}} to choose a remote path for a later Get File step.'),
        op('Delete File', 'delete', 'Remove one file from the SFTP server after a successful import, explicit approval, retention rule, or deduplication check confirms the remote copy can be deleted.', { operation: 'delete', host: 'sftp.payroll-vendor.com', remotePath: '/daily/processed.csv' }, { success: true, output: { operation: 'delete', data: { path: '/daily/processed.csv', deleted: true } } }, 'Use {{$json.output.data.deleted}}, {{$json.output.data.path}}, or legacy {{$json.deleted}} to log cleanup.'),
      ],
    },
  ],
  commonErrors: [
    { error: 'sftp: host is required', cause: 'Host is empty or the saved SFTP credential did not inject it.', fix: 'Fill Host or select a saved SFTP connection.' },
    { error: 'username is required', cause: 'The registry executor has no SFTP username.', fix: 'Complete Username in the saved SFTP connection or node config.' },
    { error: 'password or privateKey is required', cause: 'The registry executor has neither password nor private key for SSH authentication.', fix: 'Add either Password or Private Key to the saved SFTP connection.' },
    { error: 'remotePath is required for get / remotePath is required for put / remotePath is required for delete', cause: 'A file operation has no target path.', fix: 'Fill Remote Path with the exact SFTP file path.' },
    { error: 'dataBase64, content, or fileData is required for put', cause: 'Put File has no upload body.', fix: 'Map Content, Data Base64, or File Data from a previous step.' },
    { error: 'Unsupported SFTP operation: <operation>. Supported: get, put, list, delete', cause: 'The operation value is stale or unsupported.', fix: 'Use get, put, list, delete, or generated aliases download/upload.' },
    { error: 'SFTP_FAILED / sftp error: <message>', cause: 'The server rejected host, username, password, private key, path, permissions, or network access.', fix: 'Check credentials, firewall, port, key format, passphrase, remote path, and folder permissions.' },
  ],
  relatedNodes: ['ftp', 'read_binary_file', 'write_binary_file', 'aws_s3', 'dropbox'],
};
