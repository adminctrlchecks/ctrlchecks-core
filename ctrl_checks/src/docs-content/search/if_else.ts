import type { DocsSearchIndexItem } from '../search-index';

export const ifElseSearchIndex = [
  {
    type: 'node',
    title: 'If/Else',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else',
    text: 'If/Else make a yes-or-no decision and route matching work to TRUE and non-matching work to FALSE without credentials'
  },
  {
    type: 'operation',
    title: 'If/Else: Configure',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else#operation-configure',
    text: 'If/Else Configure conditions combineOperation branch routing TRUE FALSE previous node data'
  },
  {
    type: 'field',
    title: 'If/Else: Conditions',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else#operation-configure',
    text: 'If/Else Conditions builder field operator value JSON mode equals not_equals greater_than less_than greater_than_or_equal less_than_or_equal contains not_contains'
  },
  {
    type: 'field',
    title: 'If/Else: Condition Field',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else#operation-configure',
    text: 'If/Else Condition Field choose previous-step field path $json.status $json.orderTotal input.score'
  },
  {
    type: 'field',
    title: 'If/Else: Condition Operator',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else#operation-configure',
    text: 'If/Else Condition Operator equals not_equals greater_than less_than greater_than_or_equal less_than_or_equal contains not_contains when to choose each'
  },
  {
    type: 'field',
    title: 'If/Else: Compare Value',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else#operation-configure',
    text: 'If/Else Compare Value conditionValue approved premium 500 true false target value'
  },
  {
    type: 'field',
    title: 'If/Else: Combine Operation',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else#operation-configure',
    text: 'If/Else Combine Operation combineOperation AND all rows OR any row strict flexible routing'
  },
  {
    type: 'connection',
    title: 'If/Else: Branch Connections',
    slug: 'if_else',
    category: 'Logic',
    href: '/docs/nodes/if_else#operation-configure',
    text: 'If/Else no credentials connect TRUE output connect FALSE output downstream service node account connection'
  }
] satisfies DocsSearchIndexItem[];
