import type { DocsSearchIndexItem } from '../search-index';

export const setVariableSearchIndex = [
  {
    type: 'node',
    title: 'Set Variable',
    slug: 'set_variable',
    category: 'Data',
    href: '/docs/nodes/set_variable',
    text: 'Set Variable Create one or more named values for later workflow steps.'
  },
  {
    type: 'operation',
    title: 'Set Variable: Set',
    slug: 'set_variable',
    category: 'Data',
    href: '/docs/nodes/set_variable#operation-default',
    text: 'Set one name/value pair or legacy values array.'
  },
  {
    type: 'field',
    title: 'Set Variable: Name',
    slug: 'set_variable',
    category: 'Data',
    href: '/docs/nodes/set_variable#operation-default',
    text: 'name Variable name for single assignment'
  },
  {
    type: 'field',
    title: 'Set Variable: Value',
    slug: 'set_variable',
    category: 'Data',
    href: '/docs/nodes/set_variable#operation-default',
    text: 'value Value to store under name'
  },
  {
    type: 'field',
    title: 'Set Variable: Values',
    slug: 'set_variable',
    category: 'Data',
    href: '/docs/nodes/set_variable#operation-default',
    text: 'values Legacy multi-assignment array'
  },
  {
    type: 'field',
    title: 'Set Variable: Keep Source',
    slug: 'set_variable',
    category: 'Data',
    href: '/docs/nodes/set_variable#operation-default',
    text: 'keepSource Keep incoming fields and add variables'
  }
] satisfies DocsSearchIndexItem[];
