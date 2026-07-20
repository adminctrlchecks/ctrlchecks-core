import type { DocsSearchIndexItem } from '../search-index';

export const instagramSearchIndex = [
  { type: 'node', title: 'Instagram', slug: 'instagram', category: 'Social', href: '/docs/nodes/instagram', text: 'Instagram Graph API business account media publish comments hashtag story insights Meta OAuth2' },
  { type: 'operation', title: 'Instagram: Account and media publishing', slug: 'instagram', category: 'Social', href: '/docs/nodes/instagram#operation-media', text: 'user media get list create publish createAndPublish update delete getInsights container status' },
  { type: 'operation', title: 'Instagram: Comment moderation', slug: 'instagram', category: 'Social', href: '/docs/nodes/instagram#operation-comment', text: 'comment list get create reply delete hide unhide message commentId mediaId' },
  { type: 'operation', title: 'Instagram: Hashtag story insights reporting', slug: 'instagram', category: 'Social', href: '/docs/nodes/instagram#operation-reporting', text: 'hashtag search getRecentMedia getTopMedia story list insights metric period since until' },
  { type: 'field', title: 'Instagram: Resource', slug: 'instagram', category: 'Social', href: '/docs/nodes/instagram', text: 'resource user media comment hashtag story insights not message' },
  { type: 'field', title: 'Instagram: Operation', slug: 'instagram', category: 'Social', href: '/docs/nodes/instagram', text: 'operation get getMedia getInsights list create publish createAndPublish reply search' },
  { type: 'field', title: 'Instagram: Business Account ID', slug: 'instagram', category: 'Social', href: '/docs/nodes/instagram', text: 'instagramBusinessAccountId auto resolve Facebook Page instagram_business_account' },
] satisfies DocsSearchIndexItem[];
