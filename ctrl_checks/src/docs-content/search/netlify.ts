import type { DocsSearchIndexItem } from '../search-index';

export const netlifySearchIndex = [
  { type: 'node', title: 'Netlify', slug: 'netlify', category: 'DevOps', href: '/docs/nodes/netlify', text: 'Netlify legacy executor for list_sites, get_site, create_deploy, list_deploys, get_deploy. Output uses record or records plus count.' },
  { type: 'operation', title: 'Netlify: List Sites', slug: 'netlify', category: 'DevOps', href: '/docs/nodes/netlify#operation-list_sites', text: 'List Sites calls GET /sites and returns records and count.' },
  { type: 'operation', title: 'Netlify: Get Site', slug: 'netlify', category: 'DevOps', href: '/docs/nodes/netlify#operation-get_site', text: 'Get Site requires siteId and returns record.' },
  { type: 'operation', title: 'Netlify: Create Deploy', slug: 'netlify', category: 'DevOps', href: '/docs/nodes/netlify#operation-create_deploy', text: 'Create Deploy requires siteId and payload and returns record.' },
  { type: 'operation', title: 'Netlify: List Deploys', slug: 'netlify', category: 'DevOps', href: '/docs/nodes/netlify#operation-list_deploys', text: 'List Deploys requires siteId and returns records.' },
  { type: 'operation', title: 'Netlify: Get Deploy', slug: 'netlify', category: 'DevOps', href: '/docs/nodes/netlify#operation-get_deploy', text: 'Get Deploy requires deployId and returns record.' },
  { type: 'field', title: 'Netlify: accessToken', slug: 'netlify', category: 'DevOps', href: '/docs/nodes/netlify#field-accessToken', text: 'Netlify personal access token sent as Bearer token.' },
  { type: 'field', title: 'Netlify: siteId', slug: 'netlify', category: 'DevOps', href: '/docs/nodes/netlify#field-siteId', text: 'Site ID for get site create deploy list deploys.' },
  { type: 'field', title: 'Netlify: deployId', slug: 'netlify', category: 'DevOps', href: '/docs/nodes/netlify#field-deployId', text: 'Deploy ID for get deploy.' },
  { type: 'field', title: 'Netlify: payload', slug: 'netlify', category: 'DevOps', href: '/docs/nodes/netlify#field-payload', text: 'JSON request body for create_deploy.' },
] satisfies DocsSearchIndexItem[];
