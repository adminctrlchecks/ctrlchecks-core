import type { DocsSearchIndexItem } from '../search-index';

export const sftpSearchIndex = [
  { type: 'node', title: 'SFTP', slug: 'sftp', category: 'File', href: '/docs/nodes/sftp', text: 'SFTP secure file transfer node for get, put, list, and delete over SSH using host, port, username, password or privateKey, passphrase, remotePath, content, dataBase64, and fileData.' },
  { type: 'operation', title: 'SFTP: Get File', slug: 'sftp', category: 'File', href: '/docs/nodes/sftp#operation-get', text: 'Download one SFTP file from remotePath and return dataBase64 for parsing, email attachments, storage, or onward upload.' },
  { type: 'operation', title: 'SFTP: Put File', slug: 'sftp', category: 'File', href: '/docs/nodes/sftp#operation-put', text: 'Upload content, dataBase64, or fileData to an SFTP remotePath for secure partner and regulated file handoffs.' },
  { type: 'operation', title: 'SFTP: List Files', slug: 'sftp', category: 'File', href: '/docs/nodes/sftp#operation-list', text: 'List one SFTP directory and return file items so the workflow can detect arrivals or select a later download target.' },
  { type: 'operation', title: 'SFTP: Delete File', slug: 'sftp', category: 'File', href: '/docs/nodes/sftp#operation-delete', text: 'Delete one SFTP file at remotePath after approval, retention, or successful processing.' },
  { type: 'field', title: 'SFTP: Private Key', slug: 'sftp', category: 'File', href: '/docs/nodes/sftp#operation-get', text: 'Private Key is the SSH private key used when the SFTP account authenticates by key instead of password.' },
  { type: 'field', title: 'SFTP: Remote Path', slug: 'sftp', category: 'File', href: '/docs/nodes/sftp#operation-get', text: 'Remote Path is the file or folder location on the SFTP server; use a file path for get, put, delete and a folder for list.' },
  { type: 'field', title: 'SFTP: Content', slug: 'sftp', category: 'File', href: '/docs/nodes/sftp#operation-put', text: 'Content, dataBase64, and fileData are upload body fields for Put File; plain text, base64, and data URLs are supported.' },
] satisfies DocsSearchIndexItem[];
