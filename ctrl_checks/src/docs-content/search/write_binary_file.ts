import type { DocsSearchIndexItem } from '../search-index';

export const writeBinaryFileSearchIndex = [
  { type: 'node', title: 'Write Binary File', slug: 'write_binary_file', category: 'File', href: '/docs/nodes/write_binary_file', text: 'Write Binary File stores base64, data URL, or plain text as a managed workflow file asset and returns assetId, dataBase64, storageKey, and metadata.' },
  { type: 'operation', title: 'Write Binary File: Configure', slug: 'write_binary_file', category: 'File', href: '/docs/nodes/write_binary_file#operation-configure', text: 'Configure writes one safe binary file asset using fileName, mimeType, dataBase64, folder, filePath, persist, and legacy body aliases.' },
  { type: 'field', title: 'Write Binary File: Binary Data', slug: 'write_binary_file', category: 'File', href: '/docs/nodes/write_binary_file#operation-configure', text: 'Binary Data/dataBase64 is the primary file body; data, content, and fileData are supported aliases.' },
  { type: 'field', title: 'Write Binary File: Persist Metadata', slug: 'write_binary_file', category: 'File', href: '/docs/nodes/write_binary_file#operation-configure', text: 'Persist Metadata saves workflow_file_assets metadata so a later Read Binary File node can read by assetId.' },
] satisfies DocsSearchIndexItem[];
