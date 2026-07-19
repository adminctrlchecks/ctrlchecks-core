import type { NodeDoc } from '../types';

export const readBinaryFileDoc: NodeDoc = {
  slug: 'read_binary_file',
  displayName: 'Read Binary File',
  category: 'Data',
  logoUrl: '/icons/nodes/read_binary_file.svg',
  description: 'Read a managed workflow file asset or a file under the backend binary storage root.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not need a saved account connection.',
    'Use Asset ID when reading a file created by Write Binary File.',
    'Use Server Storage Path only for files under the configured backend binary storage root.',
    'Do not paste Google Drive or cloud share links here. Use Google Drive Download, HTTP Request, S3, Dropbox, or OneDrive first.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Read Binary File returns file bytes as base64 for downstream PDF, email, AI, or storage nodes.',
      operations: [
        {
          name: 'Configure',
          value: 'default',
          description: 'Read a workflow file asset or safe server storage path.',
          fields: [
            {
              name: 'Source Type',
              internalKey: 'sourceType',
              type: 'string',
              required: true,
              description: 'assetId or serverPath.',
              helpText: 'Use assetId for files returned by Write Binary File. Use serverPath only for files already inside the backend binary storage root.',
              placeholder: 'assetId',
              example: 'assetId',
            },
            {
              name: 'Asset ID',
              internalKey: 'assetId',
              type: 'string',
              required: false,
              description: 'Workflow file asset ID returned by Write Binary File.',
              helpText: 'Use {{$json.assetId}} when the previous step created a file asset.',
              placeholder: '{{$json.assetId}}',
              example: '{{$json.assetId}}',
            },
            {
              name: 'Storage Path',
              internalKey: 'filePath',
              type: 'string',
              required: false,
              description: 'Path under the backend binary storage root.',
              helpText: 'This is not a cloud URL. Use paths such as reports/report.pdf only when the file exists in the configured backend storage root.',
              placeholder: 'reports/report.pdf',
              example: 'reports/report.pdf',
            },
            {
              name: 'Max Size',
              internalKey: 'maxSize',
              type: 'number',
              required: false,
              description: 'Maximum file size in bytes.',
              helpText: 'Default is 10 MB. Larger files are rejected to protect worker memory.',
              placeholder: '10485760',
              example: '10485760',
            },
          ],
          outputExample: {
            success: true,
            assetId: 'asset-id',
            fileName: 'report.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
            dataBase64: 'JVBERi0x...',
            storageKey: 'users/.../report.pdf',
          },
          outputDescription: 'Returns dataBase64, fileName, mimeType, sizeBytes, checksumSha256, storageProvider, storageKey, and filePath.',
          usageExample: {
            scenario: 'Read a PDF generated earlier in the workflow and pass it to another processor',
            inputValues: {
              sourceType: 'assetId',
              assetId: '{{$json.assetId}}',
            },
            expectedOutput: 'The file bytes are available as {{$json.dataBase64}}.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'assetId is required',
      cause: 'Source Type is Workflow File Asset, but no Asset ID was provided.',
      fix: 'Pass {{$json.assetId}} from Write Binary File or choose Server Storage Path.',
    },
    {
      error: 'unsafe file path outside binary storage root',
      cause: 'The path points outside the configured safe storage directory.',
      fix: 'Use a path under BINARY_FILE_ROOT or read the file through its assetId.',
    },
  ],
  relatedNodes: ['write_binary_file', 'google_drive', 'pdf', 'aws_s3', 'dropbox', 'onedrive'],
};
