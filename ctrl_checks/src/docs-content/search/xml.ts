import type { DocsSearchIndexItem } from '../search-index';

export const xmlSearchIndex = [
  {
    type: 'node',
    title: 'XML',
    slug: 'xml',
    category: 'Data',
    href: '/docs/nodes/xml',
    text: 'XML Parse extract from or validate XML content.'
  },
  {
    type: 'operation',
    title: 'XML: Process XML',
    slug: 'xml',
    category: 'Data',
    href: '/docs/nodes/xml#operation-default',
    text: 'Operations: parse extract validate.'
  },
  {
    type: 'field',
    title: 'XML: Operation',
    slug: 'xml',
    category: 'Data',
    href: '/docs/nodes/xml#operation-default',
    text: 'operation XML operation parse extract or validate'
  },
  {
    type: 'field',
    title: 'XML: XML',
    slug: 'xml',
    category: 'Data',
    href: '/docs/nodes/xml#operation-default',
    text: 'xml XML content or template expression'
  },
  {
    type: 'field',
    title: 'XML: XPath',
    slug: 'xml',
    category: 'Data',
    href: '/docs/nodes/xml#operation-default',
    text: 'xpath Slash path used by extract after parsing'
  },
  {
    type: 'field',
    title: 'XML: Max Size',
    slug: 'xml',
    category: 'Data',
    href: '/docs/nodes/xml#operation-default',
    text: 'maxSize Maximum XML payload size in bytes'
  }
] satisfies DocsSearchIndexItem[];
