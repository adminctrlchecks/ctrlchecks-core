import type { DocsSearchIndexItem } from '../search-index';

export const linkedinSearchIndex = [
  { type: 'node', title: 'LinkedIn', slug: 'linkedin', category: 'Social', href: '/docs/nodes/linkedin', text: 'LinkedIn OAuth profile personal post media article company post get posts delete dryRun' },
  { type: 'operation', title: 'LinkedIn: Get profile and posts', slug: 'linkedin', category: 'Social', href: '/docs/nodes/linkedin#operation-read', text: 'get_profile get_me get_posts profile personUrn posts postCount' },
  { type: 'operation', title: 'LinkedIn: Publish posts', slug: 'linkedin', category: 'Social', href: '/docs/nodes/linkedin#operation-publish', text: 'create_post create_post_media create_article create_company_post postId assetUrn w_member_social' },
  { type: 'operation', title: 'LinkedIn: Delete or dry run', slug: 'linkedin', category: 'Social', href: '/docs/nodes/linkedin#operation-delete_or_dry_run', text: 'delete_post postId postUrn dryRun simulatedRequest' },
  { type: 'field', title: 'LinkedIn: Operation', slug: 'linkedin', category: 'Social', href: '/docs/nodes/linkedin', text: 'operation get_profile create_post media article company get_posts delete_post' },
  { type: 'field', title: 'LinkedIn: Person URN', slug: 'linkedin', category: 'Social', href: '/docs/nodes/linkedin', text: 'personUrn auto resolve OAuth member ID posting author' },
  { type: 'field', title: 'LinkedIn: Media URL', slug: 'linkedin', category: 'Social', href: '/docs/nodes/linkedin', text: 'mediaUrl public HTTPS image video upload media post' },
] satisfies DocsSearchIndexItem[];
