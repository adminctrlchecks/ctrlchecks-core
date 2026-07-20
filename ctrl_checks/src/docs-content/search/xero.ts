import type { DocsSearchIndexItem } from '../search-index';

const fields = [
  ['Access Token', 'accessToken', 'Xero OAuth access token sent as Bearer authorization.'],
  ['Tenant ID', 'tenantId', 'Xero organisation tenant ID sent as Xero-Tenant-Id.'],
  ['Resource', 'resource', 'contacts invoices items payments or accounts.'],
  ['Operation', 'operation', 'get_many get_by_id create or update.'],
  ['Record ID', 'recordId', 'Xero record GUID required for get_by_id and update.'],
  ['Payload (JSON)', 'payload', 'JSON body for create and update.'],
  ['Where Filter', 'where', 'Xero WHERE filter for get_many.'],
  ['Order', 'order', 'Xero sort order for get_many.'],
  ['Page', 'page', 'Xero page number for get_many.'],
  ['Modified After (ISO 8601)', 'modifiedAfter', 'If-Modified-Since timestamp for incremental sync.'],
  ['Summarize Errors', 'summarizeErrors', 'Request summarized Xero validation errors.'],
  ['Include Archived', 'includeArchived', 'Include archived records where supported.'],
  ['Unit Decimal Places', 'unitdp', 'Unit amount precision, usually 2 or 4.'],
] as const;

export const xeroSearchIndex = [
  {
    type: 'node',
    title: 'Xero',
    slug: 'xero',
    category: 'HTTP & API',
    href: '/docs/nodes/xero',
    text: 'Xero Call Xero Accounting API contacts invoices items payments accounts. Returns success resource operation tenantId record records count pagination meta error.',
  },
  {
    type: 'operation',
    title: 'Xero: Run Xero Operation',
    slug: 'xero',
    category: 'HTTP & API',
    href: '/docs/nodes/xero#operation-default',
    text: 'Xero Accounting API Run Xero Operation get_many get_by_id create update. Xero HTTP errors return success false with error details; config failures return _error.',
  },
  ...fields.map(([title, key, text]) => ({
    type: 'field' as const,
    title: `Xero: ${title}`,
    slug: 'xero',
    category: 'HTTP & API',
    href: '/docs/nodes/xero#operation-default',
    text: `Xero ${title} ${key} ${text}`,
  })),
] satisfies DocsSearchIndexItem[];
