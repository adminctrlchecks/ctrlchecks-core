import type { DocsSearchIndexItem } from '../search-index';

export const ftpSearchIndex = [
  { type: 'node', title: 'FTP', slug: 'ftp', category: 'File', href: '/docs/nodes/ftp', text: 'FTP file transfer node for get, put, list, and delete operations on FTP servers using host, port, username, password, secure FTPS, remotePath, content, dataBase64, and fileData.' },
  { type: 'operation', title: 'FTP: Get File', slug: 'ftp', category: 'File', href: '/docs/nodes/ftp#operation-get', text: 'Download one FTP file from remotePath and return dataBase64 and size details for downstream parsing, email, storage, or upload steps.' },
  { type: 'operation', title: 'FTP: Put File', slug: 'ftp', category: 'File', href: '/docs/nodes/ftp#operation-put', text: 'Upload content, dataBase64, or fileData to an FTP remotePath for partner handoffs, reports, order feeds, and legacy server integrations.' },
  { type: 'operation', title: 'FTP: List Files', slug: 'ftp', category: 'File', href: '/docs/nodes/ftp#operation-list', text: 'List one FTP directory and return file items so the workflow can choose a file to download or verify that an expected file arrived.' },
  { type: 'operation', title: 'FTP: Delete File', slug: 'ftp', category: 'File', href: '/docs/nodes/ftp#operation-delete', text: 'Delete one FTP file at remotePath after approval, retention, or successful processing.' },
  { type: 'field', title: 'FTP: Host', slug: 'ftp', category: 'File', href: '/docs/nodes/ftp#operation-get', text: 'FTP host is the server hostname or IP address, without ftp:// and without the folder path.' },
  { type: 'field', title: 'FTP: Remote Path', slug: 'ftp', category: 'File', href: '/docs/nodes/ftp#operation-get', text: 'Remote Path is the file or folder location on the FTP server; use a file path for get, put, delete and a folder for list.' },
  { type: 'field', title: 'FTP: Content', slug: 'ftp', category: 'File', href: '/docs/nodes/ftp#operation-put', text: 'Content, dataBase64, and fileData are upload body fields for Put File; plain text, base64, and data URLs are supported.' },
] satisfies DocsSearchIndexItem[];
