export const PROVIDER_REQUIRED_SCOPES: Record<string, string[]> = {
  google: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/contacts',
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/bigquery',
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

export function credentialRequirementForNode(nodeType: string): { provider: string; requiredScopes: string[] } | null {
  const key = nodeType.trim().toLowerCase();
  const provider = NODE_PROVIDER[key];
  if (!provider) return null;
  const requiredScopes = NODE_REQUIRED_SCOPES[key] ?? requiredScopesForProvider(provider);
  return { provider, requiredScopes };
}
