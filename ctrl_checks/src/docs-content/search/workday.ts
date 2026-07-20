import type { DocsSearchIndexItem } from '../search-index';

const fields = [
  ['Base URL', 'baseUrl', 'Workday REST API base URL.'],
  ['Tenant', 'tenant', 'Workday tenant identifier used for default URL and echoed output.'],
  ['Auth Type', 'authType', 'oauth2 Bearer token or basic username password authentication.'],
  ['Access Token', 'accessToken', 'OAuth token used when authType is oauth2.'],
  ['Username', 'username', 'Basic Auth username.'],
  ['Password', 'password', 'Basic Auth password.'],
  ['Resource', 'resource', 'workers jobs organizations supervisoryOrganizations or positions.'],
  ['Operation', 'operation', 'get_many get_by_id create or update.'],
  ['Record ID', 'recordId', 'Workday ID for get_by_id and update.'],
  ['Payload (JSON)', 'payload', 'JSON body for create and update.'],
  ['Limit', 'limit', 'limit query parameter for get_many.'],
  ['Offset', 'offset', 'offset query parameter for get_many.'],
  ['Raw Path (Override)', 'rawPath', 'custom REST path appended to baseUrl instead of the resource path.'],
] as const;

export const workdaySearchIndex = [
  {
    type: 'node',
    title: 'Workday',
    slug: 'workday',
    category: 'HTTP & API',
    href: '/docs/nodes/workday',
    text: 'Workday Call Workday REST API paths for workers jobs organizations supervisory organizations positions. Returns success resource operation tenant records record count pagination meta error.',
  },
  {
    type: 'operation',
    title: 'Workday: Run Workday Operation',
    slug: 'workday',
    category: 'HTTP & API',
    href: '/docs/nodes/workday#operation-default',
    text: 'Workday REST API Run Workday Operation get_many get_by_id create update. rawPath overrides resource path. API failures return success false and error string.',
  },
  ...fields.map(([title, key, text]) => ({
    type: 'field' as const,
    title: `Workday: ${title}`,
    slug: 'workday',
    category: 'HTTP & API',
    href: '/docs/nodes/workday#operation-default',
    text: `Workday ${title} ${key} ${text}`,
  })),
] satisfies DocsSearchIndexItem[];
