import type { DocsSearchIndexItem } from '../search-index';

export const setVariableSearchIndex = [
  {
    type: 'node',
    title: 'Set Variable',
    slug: 'set_variable',
    category: 'Data',
    href: '/docs/nodes/set_variable',
    text: 'Set Variable Create exactly one named value for later workflow steps; every other incoming field is discarded.'
  },
  {
    type: 'operation',
    title: 'Set Variable: Set',
    slug: 'set_variable',
    category: 'Data',
    href: '/docs/nodes/set_variable#operation-default',
    text: 'Set one name/value pair. Legacy values array and Keep Source are not functional.'
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
    text: 'values Legacy multi-assignment array — not functional, never read at runtime'
  },
  {
    type: 'field',
    title: 'Set Variable: Keep Source',
    slug: 'set_variable',
    category: 'Data',
    href: '/docs/nodes/set_variable#operation-default',
    text: 'keepSource Not functional — never read at runtime, incoming fields are always discarded'
  }
] satisfies DocsSearchIndexItem[];
