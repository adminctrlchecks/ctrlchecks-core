import type { DocsSearchIndexItem } from '../search-index';

export const dateTimeSearchIndex = [
  { type: 'node', title: 'Date/Time', slug: 'date_time', category: 'Data', href: '/docs/nodes/date_time', text: 'Date Time now format add subtract diff convertTimezone getTimezoneInfo timezone endDate value unit locale customFormat' },
  ...['now', 'format', 'add', 'subtract', 'diff', 'convertTimezone', 'getTimezoneInfo'].map((operation) => ({
    type: 'operation' as const,
    title: `Date/Time: ${operation}`,
    slug: 'date_time',
    category: 'Data',
    href: `/docs/nodes/date_time#operation-${operation}`,
    text: `Date/Time ${operation} operation date timezone value unit endDate`,
  })),
  { type: 'field', title: 'Date/Time: Operation', slug: 'date_time', category: 'Data', href: '/docs/nodes/date_time#operation-now', text: 'Date/Time operation dropdown now format add subtract diff convertTimezone getTimezoneInfo' },
  { type: 'field', title: 'Date/Time: Date', slug: 'date_time', category: 'Data', href: '/docs/nodes/date_time#operation-format', text: 'Base date ISO date expression' },
  { type: 'field', title: 'Date/Time: End Date', slug: 'date_time', category: 'Data', href: '/docs/nodes/date_time#operation-diff', text: 'End Date required for diff operation' },
  { type: 'field', title: 'Date/Time: Timezone', slug: 'date_time', category: 'Data', href: '/docs/nodes/date_time#operation-convertTimezone', text: 'IANA timezone UTC Asia Kolkata America New York' },
] satisfies DocsSearchIndexItem[];
