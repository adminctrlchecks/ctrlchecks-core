import type { FieldDoc, NodeDoc } from '../types';

const help = (field: string, why: string, when: string, enter: string, source: string, format: string, example: string, wrong: string, mistake: string) => `What this field is: ${field}
Why it matters: ${why}
When to fill it: ${when}
What to enter: ${enter}
Where the value comes from: ${source}
How to use it later: Map previous data with {{$json.fieldName}} and use this node output later as {{$json.bucket}}, {{$json.key}}, {{$json.items}}, {{$json.dataBase64}}, {{$json.sizeBytes}}, {{$json.uploaded}}, or {{$json.deleted}}.
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
  f('Operation', 'operation', 'select', true, 'S3 action to run.', ['The file action this node should run against S3.', 'It decides whether the node lists, downloads, uploads, or deletes objects.', 'Choose it before filling Key, Prefix, Content, Data, or Data Base64.', 'Use get to download, put to upload, list to list objects, and delete to remove an object. The runtime also accepts download/upload aliases.', 'Choose from the dropdown based on the file workflow you are building.', 'One of get, put, list, delete, download, or upload.', 'put to upload a generated report PDF to S3.', 'The run returns _error that operation is required or unsupported.', 'Do not choose delete when you only need to confirm a file exists.'], { options: ['get', 'put', 'list', 'delete'], defaultValue: 'get' }),
  f('Region', 'region', 'string', true, 'AWS region for the bucket.', ['The AWS region where the S3 bucket exists.', 'The AWS SDK sends requests to the regional S3 endpoint.', 'Fill it for every operation, especially when buckets are outside us-east-1.', 'Enter a region code such as us-east-1, us-west-2, eu-west-1, or ap-south-1.', 'Find it in the S3 bucket Properties page or AWS console. You can map {{$json.awsRegion}} for multi-region workflows.', 'AWS region code string.', 'ap-south-1 for a Mumbai-region uploads bucket.', 'AWS may return bucket region or redirect errors.', 'Do not enter a location label like Mumbai; use the region code.'], { placeholder: 'us-east-1', defaultValue: 'us-east-1', example: 'ap-south-1' }),
  f('Access Key ID', 'accessKeyId', 'string', false, 'AWS access key ID.', ['The public ID part of an AWS access key pair.', 'It lets the AWS SDK identify which IAM principal is making the request.', 'Use it only when the worker is not using an IAM role or saved AWS S3 connection.', 'Enter an access key ID that has the needed S3 permissions.', 'Create or copy it from AWS IAM Security Credentials, then store it in Connections when possible. Avoid mapping secrets from normal data.', 'String that usually starts with AKIA or ASIA.', 'AKIAIOSFODNN7EXAMPLE for a limited S3 upload user.', 'AWS returns credentials or access denied errors.', 'Do not use long-lived admin keys for a narrow file workflow.'], { placeholder: 'AKIA...', example: 'AKIAIOSFODNN7EXAMPLE' }),
  f('Secret Access Key', 'secretAccessKey', 'password', false, 'AWS secret access key.', ['The secret half of the AWS access key pair.', 'The AWS SDK cannot sign requests with only the Access Key ID.', 'Use it only when not relying on an IAM role or saved AWS S3 connection.', 'Paste the secret access key for the Access Key ID.', 'Copy it from IAM only at key creation time or from your secret manager. Store it in Connections when possible.', 'Secret text stored as a masked value when entered directly.', 'A saved AWS S3 credential limited to s3:GetObject and s3:PutObject on one bucket.', 'AWS returns signature or authentication errors.', 'Do not put AWS secrets in Content, Data, sample payloads, or logs.'], { placeholder: 'Use Connections when possible', notes: 'Prefer IAM roles or Connections over direct workflow fields.' }),
  f('Session Token', 'sessionToken', 'string', false, 'Temporary AWS session token.', ['The token part of temporary AWS credentials.', 'Temporary STS credentials require Access Key ID, Secret Access Key, and Session Token together.', 'Fill it only when your AWS credentials are temporary.', 'Paste the session token from STS, SSO, or your secret broker.', 'Copy it from the same place that issued the temporary access key. You can map {{$json.awsSessionToken}} only from a secure credential step.', 'Long token string.', 'A temporary token for an assumed upload role.', 'AWS returns invalid token or signature errors.', 'Do not use an expired session token with a fresh access key.'], { placeholder: '{{$json.sessionToken}}' }),
  f('Bucket', 'bucket', 'string', true, 'S3 bucket name.', ['The bucket that contains or will receive the object.', 'Every S3 operation needs a bucket target.', 'Required for get, put, list, and delete.', 'Enter the bucket name exactly as shown in AWS.', 'Copy it from the S3 Buckets list, a deployment variable, or your storage runbook. You can map {{$json.bucket}} for tenant-specific buckets.', 'Lowercase bucket name string; no s3:// prefix.', 'acme-customer-uploads-prod.', 'The run returns _error "aws_s3: bucket is required" or AWS says the bucket does not exist.', 'Do not paste an S3 URL; use only the bucket name.'], { placeholder: 'my-bucket', example: 'acme-customer-uploads-prod' }),
  f('Object Key', 'key', 'string', false, 'Path of the object inside the bucket.', ['The S3 object key identifies the file within the bucket.', 'Get, Put, and Delete need it to know which object to read, write, or remove.', 'Required for get/download, put/upload, and delete. Not used by list.', 'Enter a path such as reports/2026-07/report.csv.', 'Use a file name from a previous step, generated report ID, form upload name, or database row. Map it as reports/{{$json.reportId}}.pdf.', 'S3 key string with forward slashes for folders; no leading s3://bucket/.', 'invoices/2026/INV-1048.pdf.', 'The run returns _error that key is required or affects the wrong file.', 'Do not start with the bucket name again; Key is only the path inside the bucket.'], { placeholder: 'path/to/file.txt', example: 'invoices/2026/INV-1048.pdf' }),
  f('Prefix', 'prefix', 'string', false, 'Object prefix filter for list.', ['The prefix limits List Objects to keys that start with this text.', 'It prevents list from returning unrelated files.', 'Use it only with list.', 'Enter a folder-like prefix such as reports/2026/ or leave blank to list from the bucket root.', 'Copy it from the folder layout in S3 or build it from a date/customer value like reports/{{$json.year}}/.', 'Plain key prefix string.', 'exports/2026-07-20/ to list one daily export folder.', 'List may return too many files or no files.', 'Do not use wildcard characters; S3 Prefix is starts-with text, not a glob.'], { placeholder: 'folder/', example: 'exports/2026-07-20/' }),
  f('Content', 'content', 'textarea', false, 'Plain text or file content for upload.', ['The upload body used when Operation is Put and Data Base64/Data are not provided.', 'The runtime converts it to bytes and sends it to S3.', 'Use it for put/upload when you are uploading text, JSON, CSV, or already prepared file text.', 'Enter fixed content or map a previous step value such as {{$json.csv}}.', 'Comes from a report generator, HTTP response, text formatter, database export, or form content.', 'String content. Binary files should usually use Data Base64.', '{{$json.csvReport}} for a daily CSV file.', 'The run returns _error "dataBase64, data, or content is required for upload".', 'Do not paste huge binary blobs as plain text; use base64 or a file/binary node.'], { placeholder: '{{$json.fileContent}}', example: '{{$json.csvReport}}' }),
  f('Data Base64', 'dataBase64', 'string', false, 'Base64 upload body.', ['The base64-encoded file bytes for upload.', 'It preserves binary files such as PDFs and images through JSON workflow data.', 'Use it for put/upload when the previous node produced base64 file data.', 'Map the base64 string, usually {{$json.dataBase64}}.', 'Comes from Read Binary File, HTTP download, file upload, or another storage node.', 'Base64 string without data: prefix.', '{{$json.dataBase64}} from a generated PDF.', 'Invalid base64 uploads corrupted content or may fail service-side validation.', 'Do not include data:application/pdf;base64, unless a previous node already strips or expects it.'], { placeholder: '{{$json.dataBase64}}', example: '{{$json.dataBase64}}' }),
  f('Data', 'data', 'string', false, 'Alternative upload body.', ['A fallback upload body used when Data Base64 is blank.', 'The runtime accepts strings, binary-like values, or objects and converts objects to JSON bytes.', 'Use it for put/upload when a previous step holds the payload under data.', 'Map {{$json.data}} or enter JSON/text content.', 'Comes from HTTP Request, AI output, database export, or a file-processing step.', 'String, object, Buffer, or Uint8Array from runtime config; UI users usually provide text or mapped JSON.', '{"status":"ready","count":42}', 'Upload may fail if Data is empty or produce unexpected JSON if an object is passed.', 'Do not use Data for metadata; this is the file body.'], { placeholder: '{{$json.data}}', example: '{"status":"ready"}' }),
];

const op = (name: string, value: string, description: string, inputValues: Record<string, string>, outputExample: Record<string, unknown>, outputDescription: string) => ({
  name,
  value,
  description,
  fields,
  outputExample,
  outputDescription,
  usageExample: {
    scenario: `${name} files in AWS S3 after a report, form upload, webhook, or scheduled export step provides the bucket, key, prefix, or file content.`,
    inputValues: { operation: value, region: 'ap-south-1', accessKeyId: 'Use saved AWS S3 connection or IAM role', secretAccessKey: 'Use saved AWS S3 connection or IAM role', bucket: 'acme-customer-uploads-prod', ...inputValues },
    expectedOutput: 'Use S3 output later as {{$json.items}}, {{$json.dataBase64}}, {{$json.key}}, {{$json.uploaded}}, or {{$json.deleted}}.',
  },
  externalDocsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/API/API_Operations.html',
});

export const awsS3Doc: NodeDoc = {
  slug: 'aws_s3',
  displayName: 'AWS S3',
  category: 'File',
  logoUrl: '/icons/nodes/aws_s3.svg',
  description: 'List, download, upload, and delete objects in Amazon S3 buckets. Use it for reports, backups, imports, customer files, exports, and file handoff between systems.',
  credentialType: 'AWS S3 API Key',
  credentialSetupSteps: [
    'Prefer an IAM role for the worker or a saved AWS S3 API Key connection in CtrlChecks Connections. Store Access Key ID, Secret Access Key, optional Session Token, and default Region in the credential vault.',
    'Grant the least S3 permissions needed: s3:ListBucket for list, s3:GetObject for get/download, s3:PutObject for put/upload, and s3:DeleteObject only when delete is required.',
    'Limit the IAM policy to the exact bucket and prefix used by the workflow when possible.',
    'Test with List on a harmless prefix or Get on a known small object before enabling Put or Delete.',
    'Connect this node output to the next node with an outgoing line; downstream service node account connection is still required for email, Slack, CRM, database, or AI steps.',
  ],
  credentialDocsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-iam.html',
  resources: [
    {
      name: 'Operations',
      description: 'The visible UI uses get and put; the runtime normalizes them to download and upload internally. Failures return _error while successes are returned as flattened workflow fields.',
      operations: [
        op('Get Object', 'get', 'Downloads one object from S3 and returns dataBase64, sizeBytes, contentType, and etag. Use it when a later workflow step needs the file bytes.', { key: 'invoices/2026/INV-1048.pdf' }, { bucket: 'acme-customer-uploads-prod', key: 'invoices/2026/INV-1048.pdf', dataBase64: 'JVBERi0x...', sizeBytes: 24512, contentType: 'application/pdf', etag: '"abc123"' }, 'bucket: bucket read from. key: object key. dataBase64: downloaded bytes. sizeBytes: byte length. contentType: S3 content type. etag: S3 entity tag. _error appears for missing bucket/key or AWS errors.'),
        op('Put Object', 'put', 'Uploads Content, Data Base64, or Data to S3 at Bucket and Key. Use it to save generated reports, exports, logs, or files from previous steps.', { key: 'exports/2026-07-20/orders.csv', content: '{{$json.csvReport}}' }, { bucket: 'acme-customer-uploads-prod', key: 'exports/2026-07-20/orders.csv', sizeBytes: 4096, etag: '"def456"', uploaded: true }, 'bucket: bucket written to. key: uploaded object key. sizeBytes: uploaded bytes. etag: S3 entity tag. uploaded: true on success. _error appears for missing key/body or AWS errors.'),
        op('List Objects', 'list', 'Lists up to 1000 objects in Bucket that start with Prefix. Use it to find available files before download or to audit export folders.', { prefix: 'exports/2026-07-20/' }, { bucket: 'acme-customer-uploads-prod', prefix: 'exports/2026-07-20/', items: [{ key: 'exports/2026-07-20/orders.csv', size: 4096, lastModified: '2026-07-20T09:00:00Z', etag: '"def456"' }], count: 1 }, 'bucket: bucket listed. prefix: prefix used. items: array of objects with key, size, lastModified, and etag. count: number returned. _error appears for missing bucket or AWS errors.'),
        op('Delete Object', 'delete', 'Deletes one object from S3. Use it only for tightly scoped cleanup where Key comes from a trusted previous step or approved list.', { key: 'tmp/imports/old-file.csv' }, { success: true, bucket: 'acme-customer-uploads-prod', key: 'tmp/imports/old-file.csv', deleted: true }, 'success: true on delete success. bucket/key identify the deleted object. deleted: true. _error appears for missing key or AWS errors.'),
      ],
    },
  ],
  commonErrors: [
    { error: 'aws_s3: operation is required (get/download, put/upload, list, delete)', cause: 'Operation is empty.', fix: 'Choose Get, Put, List, or Delete in the node panel.' },
    { error: 'aws_s3: bucket is required', cause: 'Bucket is empty or an expression resolved blank.', fix: 'Enter the bucket name without s3:// and verify mapped data exists.' },
    { error: 'aws_s3: key is required for download', cause: 'Get/download was selected without an object key.', fix: 'Map or type the exact S3 object key to download.' },
    { error: 'aws_s3: key is required for upload', cause: 'Put/upload was selected without an object key.', fix: 'Enter the destination key such as exports/{{$json.reportDate}}/report.csv.' },
    { error: 'aws_s3: dataBase64, data, or content is required for upload', cause: 'Put/upload has no file body.', fix: 'Map Content, Data Base64, or Data from a previous step.' },
    { error: 'aws_s3: unsupported operation "<operation>" (supported: get, put, list, delete)', cause: 'The operation value is not supported by the legacy switch.', fix: 'Use the UI values get, put, list, or delete, or runtime aliases download/upload.' },
    { error: 'aws_s3: <AWS error message>', cause: 'AWS rejected credentials, region, permissions, bucket, key, or network access.', fix: 'Check IAM permissions, bucket region, credentials, session token expiry, object key, and S3 service availability.' },
  ],
  relatedNodes: ['google_cloud_storage', 'dropbox', 'read_binary_file', 'write_binary_file'],
};
