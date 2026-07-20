import type { DocsSearchIndexItem } from '../search-index';

export const onedriveSearchIndex = [
  { type: 'node', title: 'OneDrive', slug: 'onedrive', category: 'File', href: '/docs/nodes/onedrive', text: 'OneDrive file node for read, upload, list, and delete through Microsoft Graph using a Microsoft OAuth connection or accessToken fallback.' },
  { type: 'operation', title: 'OneDrive: Read File', slug: 'onedrive', category: 'File', href: '/docs/nodes/onedrive#operation-read', text: 'Read downloads one OneDrive file by path and returns dataBase64 and sizeBytes for downstream email, parsing, archive, or upload steps.' },
  { type: 'operation', title: 'OneDrive: Upload File', slug: 'onedrive', category: 'File', href: '/docs/nodes/onedrive#operation-upload', text: 'Upload writes content, dataBase64, or data to the OneDrive path and returns Microsoft Graph metadata.' },
  { type: 'operation', title: 'OneDrive: List Files', slug: 'onedrive', category: 'File', href: '/docs/nodes/onedrive#operation-list', text: 'List returns OneDrive items from root or a folder path so a workflow can select a file to read or delete.' },
  { type: 'operation', title: 'OneDrive: Delete File', slug: 'onedrive', category: 'File', href: '/docs/nodes/onedrive#operation-delete', text: 'Delete removes one OneDrive item by fileId or path and returns deleted true on success.' },
  { type: 'field', title: 'OneDrive: Path', slug: 'onedrive', category: 'File', href: '/docs/nodes/onedrive#operation-upload', text: 'Path is required for read and upload; include the final file name in path because fileName is legacy-only.' },
  { type: 'field', title: 'OneDrive: Content', slug: 'onedrive', category: 'File', href: '/docs/nodes/onedrive#operation-upload', text: 'Content, dataBase64, and data are upload body fields for OneDrive upload.' },
] satisfies DocsSearchIndexItem[];
