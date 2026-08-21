import { connectorRegistry } from './connectors/connector-registry';

export const PROVIDER_REQUIRED_SCOPES: Record<string, string[]> = {
  google: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
  gmail: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
  ],
  sheets: ['https://www.googleapis.com/auth/spreadsheets'],
  microsoft: [
    'offline_access',
    'https://graph.microsoft.com/User.Read',
    'https://graph.microsoft.com/Mail.Send',
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/Calendars.Read',
  ],
  outlook_trigger: [
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/Calendars.Read',
  ],
  microsoft_teams: [],
  twitter: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  whatsapp: ['business_management', 'whatsapp_business_management', 'whatsapp_business_messaging'],
  linkedin: ['openid', 'profile', 'email', 'w_member_social'],
  notion: ['read_content', 'update_content', 'insert_content'],
  calendly: [],
  linear: [],
  trello: [],
  typeform: [],
  stripe: [],
  shopify: [],
  slack: ['chat:write', 'app_mentions:read', 'channels:history', 'groups:history', 'im:history', 'mpim:history', 'commands'],
  discord: [],
  telegram: [],
  instagram: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_messages', 'instagram_manage_comments', 'pages_show_list', 'pages_read_engagement', 'pages_manage_metadata', 'business_management'],
  facebook: [
    'public_profile',
    'email',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
    'pages_manage_posts',
    'pages_manage_engagement',
    'pages_messaging',
    'leads_retrieval',
  ],
  github: ['repo'],
  gitlab: ['api'],
  jira: [],
  salesforce: ['api', 'refresh_token'],
  zoho: ['ZohoCRM.modules.ALL', 'ZohoCRM.users.READ'],
  zoom: ['meeting:write:meeting', 'meeting:read:meeting', 'meeting:read:list_meetings', 'user:read:user'],
  youtube: [
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.upload',
  ],
};

const NODE_PROVIDER: Record<string, string> = {
  google_gmail: 'google',
  gmail: 'google',
  gmail_trigger: 'google',
  google_sheets: 'google',
  google_doc: 'google',
  google_docs: 'google',
  google_calendar: 'google',
  google_drive: 'google',
  google_contacts: 'google',
  google_tasks: 'google',
  google_bigquery: 'google',
  google_big_query: 'google',
  notion: 'notion',
  calendly: 'calendly',
  linear: 'linear',
  linear_trigger: 'linear',
  trello: 'trello',
  trello_trigger: 'trello',
  stripe: 'stripe',
  stripe_trigger: 'stripe',
  shopify: 'shopify',
  shopify_trigger: 'shopify',
  typeform: 'typeform',
  typeform_trigger: 'typeform',
  telegram: 'telegram',
  telegram_trigger: 'telegram',
  slack_message: 'slack',
  slack_trigger: 'slack',
  discord: 'discord',
  discord_trigger: 'discord',
  discord_webhook: 'discord',
  twitter: 'twitter',
  instagram: 'instagram',
  instagram_trigger: 'instagram',
  facebook: 'facebook',
  facebook_trigger: 'facebook',
  linkedin: 'linkedin',
  whatsapp: 'whatsapp',
  whatsapp_cloud: 'whatsapp',
  whatsapp_trigger: 'whatsapp',
  github: 'github',
  github_trigger: 'github',
  gitlab_trigger: 'gitlab',
  jira_trigger: 'jira',
  salesforce: 'salesforce',
  zoho: 'zoho',
  zoho_crm: 'zoho',
  outlook: 'microsoft',
  outlook_trigger: 'microsoft',
  google_calendar_trigger: 'google',
  google_sheets_trigger: 'google',
  google_drive_trigger: 'google',
  microsoft: 'microsoft',
  microsoft_teams: 'microsoft_teams',
  microsoft_teams_trigger: 'microsoft_teams',
  youtube: 'youtube',
  zoom_video: 'zoom',
};

export function normalizeProvider(provider: string): string {
  const key = provider.trim().toLowerCase();
  return NODE_PROVIDER[key] || key;
}

// A granted OAuth scope implies every narrower capability it strictly contains.
// The connect flow grants broad scopes in one batch (e.g. Google requests the full
// `.../spreadsheets` at consent, never `.../spreadsheets.readonly`), while per-operation
// requirements are declared at least privilege (a Sheets read asks for `.readonly`).
// Without this map, scopesCover would exact-string-miss the broad grant and report a
// fully-capable connection as "missing scope". Only list PROVEN containment pairs — a
// wrong row would incorrectly open the gate for an under-scoped connection.
const SCOPE_IMPLIES: Record<string, string[]> = {
  'https://www.googleapis.com/auth/spreadsheets': ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  'https://www.googleapis.com/auth/drive': [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
  ],
  'https://www.googleapis.com/auth/gmail.modify': ['https://www.googleapis.com/auth/gmail.readonly'],
};

export function scopeSet(scopes: string[]): string {
  const normalized = Array.from(new Set(scopes.map((scope) => scope.trim()).filter(Boolean)));
  normalized.sort((a, b) => a.localeCompare(b));
  return normalized.length > 0 ? normalized.join('+') : 'default';
}

export function splitScopeSet(value: string | null | undefined): string[] {
  if (!value || value === 'default') return [];
  return value.split('+').map((scope) => scope.trim()).filter(Boolean);
}

export function scopesCover(available: string[], required: string[]): boolean {
  const have = new Set(available);
  for (const granted of available) {
    for (const implied of SCOPE_IMPLIES[granted] || []) have.add(implied);
  }
  return required.every((scope) => have.has(scope));
}

export function requiredScopesForProvider(provider: string, explicitScopes: string[] = []): string[] {
  if (explicitScopes.length > 0) return Array.from(new Set(explicitScopes));
  return PROVIDER_REQUIRED_SCOPES[normalizeProvider(provider)] || [];
}

// Minimum scopes needed to execute a specific node type.
// The preflight only checks these, so a Sheets-only credential isn't blocked by missing Gmail scopes.
const NODE_REQUIRED_SCOPES: Record<string, string[]> = {
  google_sheets:   ['https://www.googleapis.com/auth/spreadsheets'],
  google_gmail:    ['https://www.googleapis.com/auth/gmail.send'],
  gmail:           ['https://www.googleapis.com/auth/gmail.send'],
  gmail_trigger:   ['https://www.googleapis.com/auth/gmail.readonly'],
  google_doc:      ['https://www.googleapis.com/auth/documents'],
  google_docs:     ['https://www.googleapis.com/auth/documents'],
  google_calendar: ['https://www.googleapis.com/auth/calendar.events'],
  google_calendar_trigger: ['https://www.googleapis.com/auth/calendar.events'],
  google_sheets_trigger: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  google_drive_trigger: ['https://www.googleapis.com/auth/drive.readonly'],
  google_drive:    ['https://www.googleapis.com/auth/drive'],
  google_contacts: ['https://www.googleapis.com/auth/contacts'],
  google_tasks:    ['https://www.googleapis.com/auth/tasks'],
  google_bigquery: ['https://www.googleapis.com/auth/bigquery'],
  youtube:         ['https://www.googleapis.com/auth/youtube.force-ssl'],
  outlook:         ['offline_access', 'https://graph.microsoft.com/User.Read', 'https://graph.microsoft.com/Mail.Send'],
  outlook_trigger: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Calendars.Read'],
};

const NODE_OPERATION_REQUIRED_SCOPES: Record<string, Record<string, string[]>> = {
  google_gmail: {
    send: ['https://www.googleapis.com/auth/gmail.send'],
    read: ['https://www.googleapis.com/auth/gmail.readonly'],
    get: ['https://www.googleapis.com/auth/gmail.readonly'],
    list: ['https://www.googleapis.com/auth/gmail.readonly'],
  },
  gmail: {
    send: ['https://www.googleapis.com/auth/gmail.send'],
    read: ['https://www.googleapis.com/auth/gmail.readonly'],
    get: ['https://www.googleapis.com/auth/gmail.readonly'],
    list: ['https://www.googleapis.com/auth/gmail.readonly'],
  },
  google_sheets: {
    read: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    get: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    append: ['https://www.googleapis.com/auth/spreadsheets'],
    update: ['https://www.googleapis.com/auth/spreadsheets'],
    write: ['https://www.googleapis.com/auth/spreadsheets'],
  },
};

function normalizeOperation(operation: unknown): string {
  return String(operation || '').trim().toLowerCase();
}

export function credentialRequirementForNode(
  nodeType: string,
  operation?: unknown,
): { provider: string; requiredScopes: string[] } | null {
  const key = nodeType.trim().toLowerCase();
  const provider = NODE_PROVIDER[key];
  if (provider) {
    const operationScopes = NODE_OPERATION_REQUIRED_SCOPES[key]?.[normalizeOperation(operation)];
    const requiredScopes = operationScopes ?? NODE_REQUIRED_SCOPES[key] ?? requiredScopesForProvider(provider);
    return { provider, requiredScopes };
  }

  // NODE_PROVIDER above only covers OAuth-scoped providers. Non-OAuth node types
  // (database connection strings, Stripe/Shopify/AWS/SFTP API keys, etc.) aren't
  // listed there, so without this fallback they silently skip the scope-aware
  // readiness gate (getWorkflowConnectionReadiness) and fall through to the legacy
  // discovery path. Fall back to the connector registry — the single source of
  // truth for node->provider mapping — instead of hand-duplicating another
  // 30-40 node type entries here that would drift out of sync over time.
  const connector = connectorRegistry.getConnectorByNodeType(key);
  if (connector) {
    return {
      provider: connector.credentialContract.provider,
      requiredScopes: connector.credentialContract.scopes ?? [],
    };
  }

  // Final fallback: the node registry's own credentialSchema.
  //
  // A node can declare `credentialSchema.requirements` without having a connector entry
  // (connectors model provider disambiguation for intent matching, which not every node
  // participates in). Those nodes previously resolved to `null` here, produced no
  // readiness row, and were therefore reported as connected — so they reached execution
  // with no credential and failed at runtime instead of at the gate.
  //
  // Consulting the registry closes that hole universally: any node that declares a
  // credential requirement is gated, including nodes added in the future, with no
  // per-node entries to maintain in this file.
  //
  // Required via lazy import: this module sits underneath the readiness path, while the
  // registry self-registers ~180 nodes at import time. A top-level import would couple
  // their load order for no benefit.
  const registryRequirements = requirementsFromNodeRegistry(key);
  if (registryRequirements) return registryRequirements;

  return null;
}

/**
 * Provider + scopes derived from `unifiedNodeRegistry`'s credentialSchema.
 *
 * Returns null when the node declares no required credential, which is the correct
 * "nothing to connect" answer rather than a missing-data answer.
 */
function requirementsFromNodeRegistry(
  nodeType: string,
): { provider: string; requiredScopes: string[] } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { unifiedNodeRegistry } = require('../core/registry/unified-node-registry');
    const requirements = unifiedNodeRegistry.getRequiredCredentials(nodeType) ?? [];
    if (requirements.length === 0) return null;

    // A node needing several credentials still resolves to one requirement row here,
    // matching what the rest of the readiness path models. Take the first declared
    // provider deterministically rather than guessing a "primary" one.
    const primary = requirements.find((req: { provider?: string }) => req.provider);
    if (!primary?.provider) return null;

    const requiredScopes: string[] = Array.from(
      new Set<string>(
        requirements
          .filter((req: { provider?: string }) => req.provider === primary.provider)
          .flatMap((req: { requiredScopes?: string[]; scopes?: string[] }) =>
            req.requiredScopes ?? req.scopes ?? [],
          ),
      ),
    );

    return {
      provider: primary.provider,
      requiredScopes: requiredScopes.length > 0
        ? requiredScopes
        : requiredScopesForProvider(primary.provider),
    };
  } catch {
    // Never let a registry load failure turn into a silently-open gate; callers treat
    // null as "no requirement", so failing closed is handled by the caller's own error path.
    return null;
  }
}
