import type { DocsSearchIndexItem } from '../search-index';

export const googleDriveTriggerSearchIndex = [
  {
    slug: 'google_drive_trigger',
    title: 'Google Drive Trigger',
    type: 'node' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_drive_trigger',
    text: 'Google Drive Trigger starts workflows from Google Drive file_changed and file_deleted events. CtrlChecks registers a Drive changes.watch web_hook channel, stores a start page token, validates channel ID and token, then incrementally syncs changed files.',
  },
  {
    slug: 'google_drive_trigger',
    title: 'Google Drive Trigger: Receive Drive Change',
    type: 'operation' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_drive_trigger#operation-receive',
    text: 'Receive Drive Change uses folderId, eventTypes, and query. Activation gets a fresh changes startPageToken so old changes do not replay. Initial sync notifications do not start workflows. Watch channels last roughly 7 days and renew about every 6 hours. Outputs include eventId, eventType, source, userId, username, text, timestamp, fileId, name, mimeType, parents, modifiedTime, webViewLink, raw, trigger, workflow_id, node_id, sessionId, and _googleDrive.',
  },
  {
    slug: 'google_drive_trigger',
    title: 'Google Drive Trigger Fields',
    type: 'field' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_drive_trigger#fields',
    text: 'Folder ID is optional and filters changed files by parent folder ID after Drive returns file metadata. Event Types supports file_changed for created or updated files and file_deleted for removed or trashed files. Keyword Filter query matches the Drive file name case-insensitively.',
  },
  {
    slug: 'google_drive_trigger',
    title: 'Google Drive Trigger Connection',
    type: 'field' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_drive_trigger#credentials',
    text: 'Google Drive Trigger uses a Google OAuth2 connection stored in Connections and the credential vault. The runtime requests drive.readonly scope and the connected Google account needs Viewer access or Editor access to watched files or folders. Test the Google connection with account identity checks such as oauth2/v2/userinfo. Do not put OAuth tokens, refresh tokens, passwords, client secrets, or channel tokens in normal workflow fields.',
  },
] satisfies DocsSearchIndexItem[];
