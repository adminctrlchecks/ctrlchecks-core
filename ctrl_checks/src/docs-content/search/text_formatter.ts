import type { DocsSearchIndexItem } from '../search-index';

export const textFormatterSearchIndex = [
  {
    type: 'node',
    title: 'Text Formatter',
    slug: 'text_formatter',
    category: 'Data',
    href: '/docs/nodes/text_formatter',
    text: 'Text Formatter Render text from a template and current workflow data.'
  },
  {
    type: 'operation',
    title: 'Text Formatter: Format',
    slug: 'text_formatter',
    category: 'Data',
    href: '/docs/nodes/text_formatter#operation-default',
    text: 'Resolve template expressions against incoming data.'
  },
  {
    type: 'field',
    title: 'Text Formatter: Template',
    slug: 'text_formatter',
    category: 'Data',
    href: '/docs/nodes/text_formatter#operation-default',
    text: 'template Text template to resolve'
  }
] satisfies DocsSearchIndexItem[];
