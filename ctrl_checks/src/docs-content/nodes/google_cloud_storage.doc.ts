import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const docsUrl = 'https://cloud.google.com/storage/docs';

function rich(label: string, meaning: string, enter: string, wrong: string, later: string, source = 'Copy it from a Google Cloud service account JSON key, Google Cloud Console, or map a workflow value such as {{$json.fileName}}.'): string {
  return (
    `What this field is: ${label} - ${meaning}\n` +
    `Why it matters: Google Cloud Storage uses these values to authenticate, choose the bucket/object, and decide whether to upload, download, delete, or list files.\n` +
    `When to fill it: Fill Project ID, Client Email, Private Key, Operation, and Bucket for every run, then fill File Name, File Content, or Filter when the selected operation needs them.\n` +
    `What to enter: ${enter}\n` +
    `Where the value comes from: ${source}\n` +
    `How to use it later: ${later}\n` +
    `Accepted format: Operation is upload, download, delete, or list. Bucket is a GCS bucket name. File Name is an object path. Private Key may include escaped \\n line breaks.\n` +
    `Real workplace example: A form workflow maps {{$json.invoiceText}} into File Content, uploads invoices/{{$json.invoiceId}}.txt, then sends {{$json.fileName}} and {{$json.fileSize}} to a notification step.\n` +
    `If it is empty or wrong: ${wrong}\n` +
    `Common mistake: Using Google OAuth or a Firebase web key. This runtime creates a GCS Storage client from service account projectId, clientEmail, and privateKey fields.`
  );
}

const fields: FieldDoc[] = [
  { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'GCS operation to run.', options: ['upload', 'download', 'delete', 'list'], defaultValue: 'upload', helpText: rich('Operation', 'the object-storage action to execute.', 'Choose upload to save content, download to read one object, delete to remove one object, or list to enumerate objects by optional prefix.', 'Blank or unsupported values return Invalid operation: <value>.', 'Use {{$json.fileName}}, {{$json.fileSize}}, {{$json.data}}, {{$json.deleted}}, {{$json.count}}, or {{$json._error}} after the node.') },
  { name: 'Project ID', internalKey: 'projectId', type: 'string', required: true, description: 'Google Cloud project ID for the service account.', placeholder: 'my-gcp-project', helpText: rich('Project ID', 'the GCP project used to initialize the Storage client.', 'Enter project_id from the service account JSON or Google Cloud Console.', 'Blank returns projectId is required. Wrong projects can cause permission or bucket-not-found errors.', 'This is setup-only; downstream nodes use returned file metadata or data.') },
  { name: 'Client Email', internalKey: 'clientEmail', type: 'email', required: true, description: 'Service account email.', placeholder: 'workflow-service@project-id.iam.gserviceaccount.com', helpText: rich('Client Email', 'the service account identity used for GCS API calls.', 'Enter client_email from the service account JSON.', 'Blank returns clientEmail is required. Wrong emails or disabled accounts cause authentication errors.', 'Do not map this downstream; use file outputs instead.') },
  { name: 'Private Key', internalKey: 'privateKey', type: 'textarea', required: true, description: 'Service account private key.', placeholder: '-----BEGIN PRIVATE KEY-----\\n...', helpText: rich('Private Key', 'the PEM private key paired with Client Email.', 'Paste private_key from the JSON key, preserving line breaks or escaped \\n sequences.', 'Blank returns privateKey is required. Malformed keys return a Google authentication error.', 'Keep this secret in Connections/credential vault when possible; never send it to later nodes.') },
  { name: 'Bucket Name', internalKey: 'bucket', type: 'string', required: true, description: 'GCS bucket name.', placeholder: 'company-uploads', helpText: rich('Bucket Name', 'the storage bucket selected by storage.bucket(bucket).', 'Enter an existing bucket name such as company-uploads or reports-prod.', 'Blank returns bucket is required. Wrong bucket names or missing IAM permissions return GCS API errors.', 'File operations return object names, content, or counts from this bucket.') },
  { name: 'File Name', internalKey: 'fileName', type: 'string', required: false, description: 'Object name/path used by upload, download, and delete.', placeholder: 'invoices/inv-1001.txt', helpText: rich('File Name', 'the object path inside the bucket.', 'Enter a path such as file.txt, folder/file.json, or invoices/{{$json.invoiceId}}.txt.', 'Upload without it returns fileName is required for upload. Download/delete without it return fileName is required for download/delete.', 'Upload/download/delete return {{$json.fileName}}; later nodes can log or share that path.') },
  { name: 'File Content', internalKey: 'fileContent', type: 'textarea', required: false, description: 'Content saved by upload.', placeholder: 'Hello World', helpText: rich('File Content', 'the payload written to GCS during upload.', 'Enter text, a JSON object/string, Buffer-like value from a previous step, or map {{$json.fileContent}}. Objects are JSON-stringified before upload.', 'Upload with null or undefined returns fileContent is required for upload. Empty string is allowed and uploads a zero-byte object.', 'Upload returns {{$json.fileSize}} based on the UTF-8 buffer length.') },
  { name: 'Filter Prefix', internalKey: 'filter', type: 'string', required: false, description: 'Optional object-name prefix for list.', placeholder: 'invoices/2026/', helpText: rich('Filter Prefix', 'the prefix passed to getFiles({prefix}).', 'Enter a folder-like prefix such as invoices/ or exports/2026/. Leave blank to list the bucket root/all visible objects.', 'Wrong prefixes simply return an empty data array and count 0 unless the bucket call itself fails.', 'List returns {{$json.data}} as file metadata objects and {{$json.count}} as the number returned.') },
];

function op(name: string, value: string, description: string, outputExample: Record<string, unknown>, outputDescription: string, inputValues: Record<string, string>): OperationDoc {
  return {
    name,
    value,
    description: `${description} This entry reflects the worker runtime and the legacy database-node wrapper output shape.`,
    fields,
    outputExample,
    outputDescription,
    usageExample: {
      scenario: `${name} in a workflow that stores, retrieves, removes, or audits cloud files`,
      inputValues: { operation: value, projectId: 'my-gcp-project', clientEmail: 'workflow-service@my-gcp-project.iam.gserviceaccount.com', privateKey: '{{$credentials.google_cloud_storage.privateKey}}', bucket: 'company-uploads', ...inputValues },
      expectedOutput: 'The next node can use {{$json.fileName}}, {{$json.fileSize}}, {{$json.data}}, {{$json.deleted}}, {{$json.count}}, or {{$json._error}} depending on the operation.',
    },
    externalDocsUrl: docsUrl,
  };
}

export const googleCloudStorageDoc: NodeDoc = {
  slug: 'google_cloud_storage',
  displayName: 'Google Cloud Storage',
  category: 'Database',
  logoUrl: '/icons/nodes/google_cloud_storage.svg',
  description: 'Upload, download, delete, and list objects in a Google Cloud Storage bucket using service account credentials. Successful upload/download/delete results return file metadata or content directly; list returns an array in data plus count.',
  credentialType: 'Google Cloud Storage Service Account',
  credentialSetupSteps: [
    'Create or select a Google Cloud service account and grant only the Storage permissions needed for the target bucket, such as Storage Object Viewer or Storage Object Admin.',
    'Generate a JSON key and store projectId, clientEmail, and privateKey in CtrlChecks Connections/credential vault where possible.',
    'Confirm the target bucket exists and the service account has permissions on that bucket.',
    'Test list with a narrow Filter prefix before enabling upload, download, or delete operations.',
    'After this node runs, connect its output to the next app, notification, report, or database step. Each downstream service node account connection is configured separately.',
  ],
  credentialDocsUrl: 'https://cloud.google.com/iam/docs/keys-create-delete',
  resources: [{ name: 'Objects', description: 'Google Cloud Storage bucket object operations through @google-cloud/storage.', operations: [
    op('Upload File', 'upload', 'Saves File Content into Bucket at File Name. Strings are uploaded as UTF-8, Buffers are used directly, and objects are JSON-stringified before writing.', { fileName: 'invoices/inv-1001.txt', fileSize: 42 }, 'fileName: object path written. fileSize: byte length of the content buffer. _error: present when credentials, bucket, fileName, fileContent, or GCS execution fails.', { fileName: 'invoices/{{$json.invoiceId}}.txt', fileContent: '{{$json.invoiceText}}' }),
    op('Download File', 'download', 'Downloads one object and returns its UTF-8 string content in data. Binary content is not preserved as binary by this runtime.', { fileName: 'invoices/inv-1001.txt', data: 'Invoice INV-1001 paid' }, 'fileName: object path downloaded. data: UTF-8 string content. _error: present when credentials, bucket, fileName, permissions, or GCS execution fails.', { fileName: 'invoices/{{$json.invoiceId}}.txt' }),
    op('Delete File', 'delete', 'Deletes one object by File Name and returns deleted:true when the SDK delete call completes.', { fileName: 'tmp/export.csv', deleted: true }, 'fileName: object path deleted. deleted: true after the delete call completes. _error: present when credentials, bucket, fileName, permissions, or GCS execution fails.', { fileName: 'tmp/{{$json.fileName}}' }),
    op('List Files', 'list', 'Lists objects in a bucket and optionally filters them by prefix using the Filter field.', { data: [{ name: 'exports/report.csv', size: '1024', updated: '2026-07-19T09:00:00.000Z' }], count: 1 }, 'data: Array of file metadata objects with name, size, and updated. count: number of objects returned. _error: present when credentials, bucket, permissions, or GCS execution fails.', { filter: 'exports/' }),
  ] }],
  commonErrors: [
    { error: 'projectId is required', cause: 'Project ID was blank before creating the Storage client.', fix: 'Copy project_id from the service account JSON or saved Google Cloud Storage connection.' },
    { error: 'clientEmail is required', cause: 'Client Email was blank.', fix: 'Copy client_email from the service account JSON.' },
    { error: 'privateKey is required', cause: 'Private Key was blank.', fix: 'Store private_key in the GCS credential and preserve newline formatting.' },
    { error: 'Invalid operation: <value>', cause: 'Operation was not upload, download, delete, or list.', fix: 'Choose a supported operation from the dropdown.' },
    { error: 'bucket is required', cause: 'Bucket Name was blank.', fix: 'Enter the existing bucket name and confirm the service account has access.' },
    { error: 'fileName/fileContent is required for <operation>', cause: 'Upload/download/delete was missing an object path or upload was missing content.', fix: 'Fill File Name for upload/download/delete and File Content for upload.' },
    { error: '<GCS operation failed> / _error', cause: 'Google authentication, IAM permission, bucket existence, object path, or Storage API execution failed.', fix: 'Read {{$json._error}}, verify service account IAM on the bucket, and test the object path in Google Cloud Console.' },
  ],
  relatedNodes: ['google_drive', 'firebase', 'mongodb', 'supabase'],
};
