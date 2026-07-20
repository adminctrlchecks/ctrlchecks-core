import type { DocsSearchIndexItem } from '../search-index';

export const googleCloudStorageSearchIndex = [
  { type: 'node', title: 'Google Cloud Storage', slug: 'google_cloud_storage', category: 'Database', href: '/docs/nodes/google_cloud_storage', text: 'Google Cloud Storage node supports upload download delete list with service account projectId clientEmail privateKey bucket.' },
  { type: 'operation', title: 'Google Cloud Storage: Upload Download Delete', slug: 'google_cloud_storage', category: 'Database', href: '/docs/nodes/google_cloud_storage#operation-upload', text: 'upload returns fileName fileSize. download returns fileName data as UTF-8 string. delete returns fileName deleted true.' },
  { type: 'operation', title: 'Google Cloud Storage: List Files', slug: 'google_cloud_storage', category: 'Database', href: '/docs/nodes/google_cloud_storage#operation-list', text: 'list returns data array of file metadata name size updated and count. filter is a prefix passed to getFiles.' },
  { type: 'field', title: 'Google Cloud Storage: Fields', slug: 'google_cloud_storage', category: 'Database', href: '/docs/nodes/google_cloud_storage#operation-upload', text: 'operation projectId clientEmail privateKey bucket fileName fileContent filter. Uses service account credentials, not Google OAuth or Firebase web API key.' },
  { type: 'field', title: 'Google Cloud Storage: Connection', slug: 'google_cloud_storage', category: 'Database', href: '/docs/nodes/google_cloud_storage#operation-upload', text: 'Store Google Cloud Storage service account projectId clientEmail privateKey in Connections credential vault and grant bucket IAM permissions.' },
] satisfies DocsSearchIndexItem[];
