/**
 * Smart Search — deterministic candidate index.
 *
 * Every candidate here comes from a real, existing source: the node
 * registry (features), the templates table, a curated list of real routes
 * that already exist in ctrl_checks/src/App.tsx (pages/settings), and
 * optional docs candidates the frontend prefiltered from its own bundled
 * docs-content/search-index.ts. Nothing here is invented, and admin-only
 * routes are deliberately never included, so there is no path for an
 * inaccessible result to appear regardless of user role.
 */

import { unifiedNodeRegistry } from '../../core/registry/unified-node-registry';
import { getDbClient } from '../../core/database/aws-db-client';
import { logger } from '../../core/logger';
import type { DocsCandidateInput, SearchCandidate } from './types';

const PAGE_CANDIDATES: SearchCandidate[] = [
  { title: 'Dashboard', description: 'Overview of your workflows, executions, and stats.', type: 'page', url: '/dashboard', keywords: 'home overview stats' },
  { title: 'Workflows', description: 'Browse, edit, and manage all your workflows.', type: 'page', url: '/workflows', keywords: 'automations list manage' },
  { title: 'Templates', description: 'Ready-made workflow templates you can copy and customize.', type: 'page', url: '/templates', keywords: 'starter examples prebuilt landing page' },
  { title: 'Executions', description: 'History and status of past workflow runs.', type: 'page', url: '/executions', keywords: 'runs history logs' },
  { title: 'Connections', description: 'Connect and manage third-party accounts and credentials.', type: 'page', url: '/connections', keywords: 'oauth api key credentials integrations accounts' },
  { title: 'Adaptive UI', description: 'Get personalized capability and setup suggestions from a described goal.', type: 'page', url: '/adaptive-ui', keywords: 'suggestions recommendations personalize' },
  { title: 'Build a workflow with AI', description: 'Describe what you want to automate and let AI build the workflow.', type: 'action', url: '/workflow/ai', keywords: 'create new build first project get started beginner' },
  { title: 'Documentation', description: 'Guides and reference docs for nodes and features.', type: 'page', url: '/docs', keywords: 'help guide reference how to' },
  { title: 'Profile', description: 'Your account details.', type: 'setting', url: '/profile', keywords: 'account name email' },
  { title: 'Billing & Subscription', description: 'View or change your plan, usage, and billing.', type: 'setting', url: '/subscriptions', keywords: 'billing plan upgrade pricing payment subscription change' },
  { title: 'API Keys', description: 'Manage API keys for programmatic access.', type: 'setting', url: '/settings/api-keys', keywords: 'developer api key token' },
  { title: 'Teams', description: 'Manage team members and access.', type: 'setting', url: '/settings/teams', keywords: 'team members invite collaborators' },
  { title: 'Notification Settings', description: 'Control which notifications you receive.', type: 'setting', url: '/settings/notifications', keywords: 'alerts email notifications preferences' },
];

async function loadTemplateCandidates(): Promise<SearchCandidate[]> {
  try {
    const db = getDbClient();
    const { data, error } = await db
      .from('templates')
      .select('name, description, category')
      .eq('is_active', true)
      .limit(50);

    if (error || !data) return [];
    return data.map((template: any) => ({
      title: template.name || 'Template',
      description: String(template.description || '').slice(0, 160),
      type: 'template' as const,
      url: '/templates',
      keywords: template.category || '',
    }));
  } catch (error) {
    logger.warn('[SmartSearch] Failed to load template candidates (non-fatal):', error);
    return [];
  }
}

function loadFeatureCandidates(): SearchCandidate[] {
  return unifiedNodeRegistry.getAllTypes().map((nodeType) => {
    const def = unifiedNodeRegistry.get(nodeType);
    const keywords = [
      ...(def?.tags || []),
      ...(def?.capabilities || []),
      ...(def?.aiSelectionCriteria?.keywords || []),
    ].join(' ');
    return {
      title: def?.label || nodeType,
      description: (def?.description || '').slice(0, 160),
      type: 'feature' as const,
      // Every feature/node points at the AI builder — the one place a node
      // can actually be used — rather than a per-node doc page, since doc
      // coverage across ~180 node types is partial and a missing doc page
      // would be a broken link (an invented-looking result).
      url: '/workflow/ai',
      keywords,
    };
  });
}

function loadDocsCandidates(docsCandidates: DocsCandidateInput[]): SearchCandidate[] {
  return docsCandidates.slice(0, 10).map((doc) => ({
    title: doc.title,
    description: doc.snippet.slice(0, 160),
    type: 'article' as const,
    url: doc.href,
    keywords: '',
  }));
}

export async function buildSearchCandidates(docsCandidates: DocsCandidateInput[] = []): Promise<SearchCandidate[]> {
  const templateCandidates = await loadTemplateCandidates();
  return [...PAGE_CANDIDATES, ...loadFeatureCandidates(), ...templateCandidates, ...loadDocsCandidates(docsCandidates)];
}
