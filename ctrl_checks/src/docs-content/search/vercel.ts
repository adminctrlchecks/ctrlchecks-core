import type { DocsSearchIndexItem } from '../search-index';

export const vercelSearchIndex = [
  { type: 'node', title: 'Vercel', slug: 'vercel', category: 'DevOps', href: '/docs/nodes/vercel', text: 'Vercel deployment node for deploy and list_deployments. Output is success, data, error with structured error codes.' },
  { type: 'operation', title: 'Vercel: Deploy Project', slug: 'vercel', category: 'DevOps', href: '/docs/nodes/vercel#operation-deploy', text: 'Deploy Project validates token and projectName then POSTs /v13/deployments. Output data has deploymentId, projectName, url, status, createdAt.' },
  { type: 'operation', title: 'Vercel: List Deployments', slug: 'vercel', category: 'DevOps', href: '/docs/nodes/vercel#operation-list_deployments', text: 'List Deployments GETs /v13/deployments and returns data.deployments and data.total.' },
  { type: 'field', title: 'Vercel: operation', slug: 'vercel', category: 'DevOps', href: '/docs/nodes/vercel#field-operation', text: 'Operation must be deploy or list_deployments or runtime returns INVALID_OPERATION.' },
  { type: 'field', title: 'Vercel: projectName', slug: 'vercel', category: 'DevOps', href: '/docs/nodes/vercel#field-projectName', text: 'Project name required for deploy. Valid characters letters numbers hyphen underscore max 128.' },
  { type: 'field', title: 'Vercel: token', slug: 'vercel', category: 'DevOps', href: '/docs/nodes/vercel#field-token', text: 'Vercel API token from token field or saved vercel credential. Missing token returns MISSING_TOKEN.' },
] satisfies DocsSearchIndexItem[];
