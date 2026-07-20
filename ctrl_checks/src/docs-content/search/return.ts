import type { DocsSearchIndexItem } from '../search-index';

export const returnSearchIndex = [
  {
    type: 'node',
    title: 'Return',
    slug: 'return',
    category: 'Flow',
    href: '/docs/nodes/return',
    text: 'Return stops the current workflow path and emits success __return returnedValue.'
  },
  {
    type: 'operation',
    title: 'Return: Configure',
    slug: 'return',
    category: 'Flow',
    href: '/docs/nodes/return#operation-configure',
    text: 'Configure Return value or includeInput; returnedValue is the real output key.'
  },
  {
    type: 'field',
    title: 'Return: Value',
    slug: 'return',
    category: 'Flow',
    href: '/docs/nodes/return#operation-configure',
    text: 'Value JSON expression used as returnedValue when Include Input is off.'
  },
  {
    type: 'field',
    title: 'Return: Include Input',
    slug: 'return',
    category: 'Flow',
    href: '/docs/nodes/return#operation-configure',
    text: 'Include Input checkbox returns the full incoming object and overrides Value.'
  }
] satisfies DocsSearchIndexItem[];
