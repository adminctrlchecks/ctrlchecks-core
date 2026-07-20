import type { DocsSearchIndexItem } from '../search-index';

export const readBinaryFileSearchIndex = [
  { type: 'node', title: 'Read Binary File', slug: 'read_binary_file', category: 'File', href: '/docs/nodes/read_binary_file', text: 'Read Binary File reads a managed workflow file asset by assetId or a safe serverPath/storageKey and returns dataBase64 plus file metadata.' },
  { type: 'operation', title: 'Read Binary File: Configure', slug: 'read_binary_file', category: 'File', href: '/docs/nodes/read_binary_file#operation-configure', text: 'Configure resolves assetId or serverPath and returns dataBase64, fileName, mimeType, sizeBytes, checksumSha256, storageKey, and filePath.' },
  { type: 'field', title: 'Read Binary File: Asset ID', slug: 'read_binary_file', category: 'File', href: '/docs/nodes/read_binary_file#operation-configure', text: 'Asset ID comes from Write Binary File output and is required when sourceType is assetId.' },
  { type: 'field', title: 'Read Binary File: Storage Path', slug: 'read_binary_file', category: 'File', href: '/docs/nodes/read_binary_file#operation-configure', text: 'Storage Path and storageKey are safe backend binary-root paths, not cloud links or local desktop paths.' },
] satisfies DocsSearchIndexItem[];
