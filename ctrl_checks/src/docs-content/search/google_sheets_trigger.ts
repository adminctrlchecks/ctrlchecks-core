import type { DocsSearchIndexItem } from '../search-index';

export const googleSheetsTriggerSearchIndex = [
  {
    slug: 'google_sheets_trigger',
    title: 'Google Sheets Trigger',
    type: 'node' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_sheets_trigger',
    text: 'Google Sheets Trigger starts workflows from Google Sheets row_added and row_updated changes. Because Google Sheets has no real-time push notifications for cell edits, CtrlChecks registers a baseline on activation and polls about every two minutes.',
  },
  {
    slug: 'google_sheets_trigger',
    title: 'Google Sheets Trigger: Poll for Row Changes',
    type: 'operation' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_sheets_trigger#operation-poll',
    text: 'Poll for Row Changes uses spreadsheetId, sheetName, hasHeaderRow, eventTypes, and query. It detects new rows after the baseline and updated tracked rows by row hash, then emits eventId, eventType, source, timestamp, spreadsheetId, sheetName, rowNumber, values, row, raw, trigger, workflow_id, node_id, sessionId, and _googleSheets.',
  },
  {
    slug: 'google_sheets_trigger',
    title: 'Google Sheets Trigger Fields',
    type: 'field' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_sheets_trigger#fields',
    text: 'Spreadsheet ID comes from the Google Sheets URL between /d/ and /edit. Sheet Name is the tab name and can be blank for the first/default sheet. Has Header Row builds the row object from row 1. Event Types supports row_added and row_updated. Keyword Filter query matches joined row text case-insensitively.',
  },
  {
    slug: 'google_sheets_trigger',
    title: 'Google Sheets Trigger Connection',
    type: 'field' as const,
    category: 'Triggers',
    href: '/docs/nodes/google_sheets_trigger#credentials',
    text: 'Google Sheets Trigger uses a Google OAuth2 connection stored in Connections and the credential vault. The connected Google account needs Viewer access or Editor access to the spreadsheet and Sheets read access. Test the Google connection with Google account identity checks such as oauth2/v2/userinfo. Do not put OAuth tokens, refresh tokens, passwords, or client secrets in normal workflow fields.',
  },
] satisfies DocsSearchIndexItem[];
