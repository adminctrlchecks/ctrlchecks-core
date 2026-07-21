/**
 * Connector Registry - Production-Grade Connector Architecture
 * 
 * This is the single source of truth for all connectors in the system.
 * Each connector is a first-class object with strict isolation.
 * 
 * Principles:
 * - No credential sharing across connectors
 * - Each connector has explicit credential contracts
 * - Connectors define capabilities, not nodes
 * - Provider disambiguation is deterministic
 */

export interface CredentialContract {
  provider: string;
  type: 'oauth' | 'api_key' | 'webhook' | 'token' | 'basic_auth' | 'runtime';
  scopes?: string[];
  vaultKey: string;
  displayName: string;
  required: boolean;
  // ✅ PERMANENT: Data-driven field mapping (replaces hardcoded if-else blocks)
  // Specifies which config field to use for this credential type
  credentialFieldName?: string; // e.g., 'apiKey', 'apiToken', 'webhookUrl', 'accessToken'
}

export interface Connector {
  id: string; // Unique connector ID (e.g., "google_gmail", "smtp_email")
  provider: string; // Provider name (e.g., "google", "smtp")
  service: string; // Service name (e.g., "gmail", "email")
  capabilities: string[]; // What this connector can do (e.g., ["email.send", "gmail.send"])
  keywords: string[]; // Keywords that match this connector
  credentialContract: CredentialContract;
  nodeTypes: string[]; // Which node types use this connector
  description: string;
}

/**
 * Connector Registry
 * 
 * All connectors are registered here with strict isolation.
 * Each connector has its own credential contract.
 */
export class ConnectorRegistry {
  private connectors: Map<string, Connector> = new Map();

  constructor() {
    this.registerAllConnectors();
    this.validateNoNodeTypeCollisions();
  }

  /**
   * Register all connectors in the system
   */
  private registerAllConnectors(): void {
    // ============================================
    // GOOGLE GMAIL CONNECTOR
    // ============================================
    this.register({
      id: 'google_gmail',
      provider: 'google',
      service: 'gmail',
      capabilities: [
        'email.send',
        'gmail.send',
        'google.mail',
        'email.read',
        'gmail.read',
        'gmail.receive',
        'trigger.webhook',
      ],
      keywords: ['gmail', 'email', 'google mail', 'google email', 'gmail them', 'send via gmail', 'email via gmail'],
      credentialContract: {
        provider: 'google',
        type: 'oauth',
        scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.read'],
        vaultKey: 'google',
        displayName: 'Google OAuth (Gmail)',
        required: true,
      },
      // ✅ Defensive: allow alias node type to match this connector even if canonicalization
      // hasn't run yet. Canonical type remains google_gmail.
      nodeTypes: ['google_gmail', 'gmail', 'gmail_trigger'],
      description: 'Send/receive emails via Gmail API using OAuth',
    });

    // ============================================
    // SMTP EMAIL CONNECTOR
    // ============================================
    this.register({
      id: 'smtp_email',
      provider: 'smtp',
      service: 'email',
      capabilities: [
        'email.send',
        'smtp.send',
      ],
      keywords: ['smtp', 'email', 'mail server', 'email server', 'send email', 'email notification'],
      credentialContract: {
        provider: 'smtp',
        type: 'api_key', // SMTP uses username/password (treated as api_key type)
        vaultKey: 'smtp',
        displayName: 'SMTP Credentials',
        required: true,
      },
      nodeTypes: ['email'],
      description: 'Send emails via SMTP server',
    });

    // ============================================
    // SLACK OAUTH CONNECTOR
    // ============================================
    this.register({
      id: 'slack_oauth',
      provider: 'slack',
      service: 'slack',
      capabilities: [
        'notification.send',
        'slack.send',
        'message.send',
        'slack.receive',
        'message.receive',
        'trigger.webhook',
        'slack.command',
        'slack.interaction',
      ],
      keywords: ['slack', 'slack bot', 'slack oauth', 'slack message', 'slack notification', 'slack trigger', 'slack slash command'],
      credentialContract: {
        provider: 'slack',
        type: 'oauth',
        scopes: ['chat:write', 'app_mentions:read', 'channels:history', 'groups:history', 'im:history', 'mpim:history', 'commands'],
        vaultKey: 'slack',
        displayName: 'Slack OAuth2',
        required: true,
        credentialFieldName: 'accessToken',
      },
      nodeTypes: ['slack_message', 'slack_trigger'],
      description: 'Send messages to Slack and receive Slack app events via OAuth bot connection',
    });

    // ============================================
    // SLACK WEBHOOK CONNECTOR
    // ============================================
    this.register({
      id: 'slack_webhook',
      provider: 'slack_webhook',
      service: 'slack',
      capabilities: [
        'notification.send',
        'slack.send',
        'message.send',
      ],
      keywords: ['slack webhook', 'incoming webhook', 'slack notification'],
      credentialContract: {
        provider: 'slack_webhook',
        type: 'webhook',
        vaultKey: 'slack_webhook',
        displayName: 'Slack Incoming Webhook',
        required: true,
        credentialFieldName: 'webhookUrl',
      },
      nodeTypes: ['slack_webhook'],
      description: 'Send messages to Slack via incoming webhook',
    });
    // ============================================
    // MAILGUN CONNECTOR
    // ============================================
    this.register({
      id: 'mailgun',
      provider: 'mailgun',
      service: 'email',
      capabilities: [
        'email.send',
        'mailgun.send',
      ],
      keywords: ['mailgun', 'send via mailgun'],
      credentialContract: {
        provider: 'mailgun',
        type: 'api_key',
        vaultKey: 'mailgun',
        displayName: 'Mailgun API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['mailgun'],
      description: 'Send emails via Mailgun REST API',
    });

    // ============================================
    // SENDGRID CONNECTOR
    // ============================================
    this.register({
      id: 'sendgrid',
      provider: 'sendgrid',
      service: 'email',
      capabilities: [
        'email.send',
        'sendgrid.send',
      ],
      keywords: ['sendgrid', 'send grid'],
      credentialContract: {
        provider: 'sendgrid',
        type: 'api_key',
        vaultKey: 'sendgrid',
        displayName: 'SendGrid API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['sendgrid'],
      description: 'Send emails via SendGrid REST API',
    });

    // ============================================
    // GOOGLE SHEETS CONNECTOR
    // ============================================
    this.register({
      id: 'google_sheets',
      provider: 'google',
      service: 'sheets',
      capabilities: [
        'spreadsheet.read',
        'spreadsheet.write',
        'sheets.read',
        'sheets.write',
        'google_sheets.receive',
        'trigger.poll',
      ],
      keywords: ['google sheets', 'spreadsheet', 'sheets'],
      credentialContract: {
        provider: 'google',
        type: 'oauth',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/spreadsheets'],
        vaultKey: 'google',
        displayName: 'Google OAuth (Sheets)',
        required: true,
      },
      nodeTypes: ['google_sheets', 'google_sheets_trigger'],
      description: 'Read/write Google Sheets via OAuth',
    });

    // ============================================
    // GOOGLE DOCS CONNECTOR
    // ============================================
    this.register({
      id: 'google_docs',
      provider: 'google',
      service: 'docs',
      capabilities: [
        'document.read',
        'document.write',
        'docs.read',
        'docs.write',
      ],
      keywords: ['google docs', 'google document'],
      credentialContract: {
        provider: 'google',
        type: 'oauth',
        scopes: ['https://www.googleapis.com/auth/documents.readonly', 'https://www.googleapis.com/auth/documents'],
        vaultKey: 'google',
        displayName: 'Google OAuth (Docs)',
        required: true,
      },
      nodeTypes: ['google_doc'],
      description: 'Read/write Google Docs via OAuth',
    });

    // ============================================
    // DISCORD CONNECTOR
    // ============================================
    this.register({
      id: 'discord_bot_token',
      provider: 'discord',
      service: 'discord',
      capabilities: [
        'notification.send',
        'discord.send',
        'message.send',
        'discord.receive',
        'discord.interaction',
        'discord.command',
        'trigger.webhook',
      ],
      keywords: ['discord', 'discord message', 'discord bot', 'discord trigger', 'discord slash command', 'discord interaction'],
      credentialContract: {
        provider: 'discord',
        type: 'token',
        vaultKey: 'discord',
        displayName: 'Discord Bot Token',
        required: true,
        credentialFieldName: 'botToken',
      },
      nodeTypes: ['discord', 'discord_trigger'],
      description: 'Send messages to Discord channels and receive Discord interactions/webhook events',
    });
    // Discord webhook connector (separate node type)
    this.register({
      id: 'discord_webhook_connector',
      provider: 'discord',
      service: 'discord',
      capabilities: ['notification.send', 'discord.send'],
      keywords: ['discord webhook'],
      credentialContract: {
        provider: 'discord',
        type: 'webhook',
        vaultKey: 'discord_webhook',
        displayName: 'Discord Webhook URL',
        required: true,
        credentialFieldName: 'webhookUrl',
      },
      nodeTypes: ['discord_webhook'],
      description: 'Send messages to Discord via webhook',
    });

    // ============================================
    // TELEGRAM CONNECTOR
    // ============================================
    this.register({
      id: 'telegram_bot',
      provider: 'telegram',
      service: 'telegram',
      capabilities: [
        'notification.send',
        'telegram.send',
        'message.send',
        'telegram.receive',
        'message.receive',
      ],
      keywords: ['telegram', 'telegram bot', 'telegram message', 'telegram trigger', 'telegram chatbot'],
      credentialContract: {
        provider: 'telegram',
        type: 'token',
        // Telegram Bot API uses a bot token; no OAuth scopes,
        // but we still keep vaultKey for secure storage.
        vaultKey: 'telegram',
        displayName: 'Telegram Bot Token',
        required: true,
        credentialFieldName: 'botToken',
      },
      nodeTypes: ['telegram', 'telegram_trigger'],
      description: 'Send messages and receive real-time Telegram bot updates via Bot API',
    });

    // ============================================
    // SALESFORCE CONNECTOR
    // ============================================
    this.register({
      id: 'salesforce',
      provider: 'salesforce',
      service: 'crm',
      capabilities: [
        'crm.read',
        'crm.write',
        'salesforce.crm',
      ],
      keywords: ['salesforce', 'sf', 'salesforce crm'],
      credentialContract: {
        provider: 'salesforce',
        type: 'oauth',
        // Typical Salesforce OAuth scopes; adjust if your app uses a specific set.
        scopes: [
          'api',
          'refresh_token',
        ],
        vaultKey: 'salesforce',
        displayName: 'Salesforce OAuth',
        required: true,
      },
      nodeTypes: ['salesforce'],
      description: 'Interact with Salesforce CRM objects via OAuth (sObjects, SOQL, SOSL)',
    });

    // ============================================
    // HUBSPOT CONNECTOR
    // ============================================
    this.register({
      id: 'hubspot',
      provider: 'hubspot',
      service: 'crm',
      capabilities: [
        'crm.read',
        'crm.write',
        'crm.search',
        'hubspot.contact',
        'hubspot.deal',
        'hubspot.company',
      ],
      keywords: ['hubspot', 'hub spot', 'hubspot crm'],
      credentialContract: {
        provider: 'hubspot',
        type: 'api_key',
        vaultKey: 'hubspot',
        displayName: 'HubSpot API Key',
        required: true,
        credentialFieldName: 'accessToken', // Private App Tokens are the modern auth method
      },
      nodeTypes: ['hubspot'],
      description: 'Interact with HubSpot CRM objects (contacts, companies, deals, tickets) via API key',
    });

    // ============================================
    // LINKEDIN CONNECTOR
    // ============================================
    this.register({
      id: 'linkedin_oauth',
      provider: 'linkedin',
      service: 'linkedin',
      capabilities: [
        'social.post',
        'linkedin.post',
      ],
      keywords: ['linkedin', 'linkedin post'],
      credentialContract: {
        provider: 'linkedin',
        type: 'oauth',
        scopes: ['openid', 'profile', 'email', 'w_member_social'],
        vaultKey: 'linkedin',
        displayName: 'LinkedIn OAuth',
        required: true,
      },
      nodeTypes: ['linkedin'],
      description: 'Post to LinkedIn via OAuth',
    });

    // ============================================
    // DATABASE CONNECTOR
    // ============================================
    this.register({
      id: 'database_connection',
      provider: 'database',
      service: 'database',
      capabilities: [
        'database.read',
        'database.write',
        'database.query',
      ],
      keywords: ['database', 'db', 'sql'],
      credentialContract: {
        provider: 'database',
        type: 'runtime',
        vaultKey: 'database',
        displayName: 'Database Connection String',
        required: true,
        credentialFieldName: 'connectionString',
      },
      // ✅ FIX: previously listed postgresql/mysql/mongodb/db here too. Since Map iteration
      // is insertion order and this connector registers first, it silently shadowed the
      // dedicated postgresql/mysql/mongodb/db (Supabase) connectors below for every lookup,
      // injecting a nonexistent 'connectionString' field into Supabase credentials (apiKey)
      // and misreporting all four node types as "Database Connection String" in the UI.
      nodeTypes: [],
      description: 'Connect to database via connection string',
    });

    // ============================================
    // CLICKUP CONNECTOR
    // ============================================
    this.register({
      id: 'clickup',
      provider: 'clickup',
      service: 'tasks',
      capabilities: [
        'clickup.task.create',
        'clickup.task.read',
      ],
      keywords: ['clickup', 'click up', 'project management', 'tasks'],
      credentialContract: {
        provider: 'clickup',
        type: 'api_key',
        vaultKey: 'clickup',
        displayName: 'ClickUp API Key',
        required: true,
        credentialFieldName: 'apiKey', // ✅ PERMANENT: Data-driven mapping
      },
      nodeTypes: ['clickup'],
      description: 'Create and read ClickUp tasks via API key authentication',
    });

    // ============================================
    // AIRTABLE CONNECTOR
    // ============================================
    this.register({
      id: 'airtable',
      provider: 'airtable',
      service: 'database',
      capabilities: [
        'database.read',
        'database.write',
        'airtable.record',
      ],
      keywords: ['airtable', 'air table'],
      credentialContract: {
        provider: 'airtable',
        type: 'api_key',
        vaultKey: 'airtable',
        displayName: 'Airtable API Key',
        required: true,
        credentialFieldName: 'apiKey', // ✅ PERMANENT: Data-driven mapping
      },
      nodeTypes: ['airtable'],
      description: 'Read/write Airtable records via API key',
    });

    // ============================================
    // TYPEFORM CONNECTOR
    // ============================================
    this.register({
      id: 'typeform',
      provider: 'typeform',
      service: 'forms',
      capabilities: [
        'form.read',
        'form.write',
        'typeform.form',
        'typeform.receive',
        'trigger.webhook',
      ],
      keywords: ['typeform', 'type form', 'survey'],
      credentialContract: {
        provider: 'typeform',
        type: 'api_key',
        vaultKey: 'typeform',
        displayName: 'Typeform API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['typeform', 'typeform_trigger'],
      description: 'Create forms and read Typeform responses via API key',
    });

    // ============================================
    // TALLY CONNECTOR
    // ============================================
    this.register({
      id: 'tally',
      provider: 'tally',
      service: 'forms',
      capabilities: [
        'form.read',
        'tally.receive',
        'trigger.webhook',
      ],
      keywords: ['tally', 'tally.so', 'tally form'],
      credentialContract: {
        provider: 'tally',
        type: 'api_key',
        vaultKey: 'tally',
        displayName: 'Tally Personal Access Token',
        required: true,
        credentialFieldName: 'token',
      },
      nodeTypes: ['tally_trigger'],
      description: 'Receive Tally form submissions via a signed webhook, authenticated with a Personal Access Token',
    });

    // ============================================
    // CALENDLY CONNECTOR
    // ============================================
    this.register({
      id: 'calendly',
      provider: 'calendly',
      service: 'scheduling',
      capabilities: [
        'scheduling.read',
        'calendar.read',
        'calendly.events',
      ],
      keywords: ['calendly', 'booking', 'scheduled event', 'event type', 'meeting'],
      credentialContract: {
        provider: 'calendly',
        type: 'api_key',
        vaultKey: 'calendly',
        displayName: 'Calendly Personal Access Token',
        required: true,
        credentialFieldName: 'token',
      },
      nodeTypes: ['calendly'],
      description: 'Read Calendly users, event types, and scheduled events with a personal access token',
    });

    // ============================================
    // NOTION CONNECTOR
    // ============================================
    this.register({
      id: 'notion',
      provider: 'notion',
      service: 'productivity',
      capabilities: [
        'notion.read',
        'notion.write',
        'notion.page',
      ],
      keywords: ['notion'],
      credentialContract: {
        provider: 'notion',
        type: 'api_key',
        vaultKey: 'notion',
        displayName: 'Notion API Key',
        required: true,
        credentialFieldName: 'apiKey', // ✅ PERMANENT: Data-driven mapping
      },
      nodeTypes: ['notion'],
      description: 'Read/write Notion pages and databases via API key',
    });

    // ============================================
    // LINEAR CONNECTOR
    // ============================================
    this.register({
      id: 'linear',
      provider: 'linear',
      service: 'project_management',
      capabilities: [
        'issue.read',
        'issue.write',
        'linear.issue',
        'linear.receive',
        'trigger.webhook',
      ],
      keywords: ['linear', 'issue tracker', 'issue', 'team', 'sprint', 'backlog'],
      credentialContract: {
        provider: 'linear',
        type: 'api_key',
        vaultKey: 'linear',
        displayName: 'Linear Personal API Key',
        required: true,
        credentialFieldName: 'token',
      },
      nodeTypes: ['linear', 'linear_trigger'],
      description: 'Create, update, list, and receive Linear issue tracker events using a personal API key',
    });

    // ============================================
    // TRELLO CONNECTOR
    // ============================================
    this.register({
      id: 'trello',
      provider: 'trello',
      service: 'project_management',
      capabilities: [
        'kanban.read',
        'kanban.write',
        'trello.card',
        'trello.receive',
        'trigger.webhook',
      ],
      keywords: ['trello', 'board', 'card', 'list', 'kanban'],
      credentialContract: {
        provider: 'trello',
        type: 'api_key',
        vaultKey: 'trello',
        displayName: 'Trello API Key & Token',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['trello', 'trello_trigger'],
      description: 'Manage Trello boards, lists, and cards with API key and token authentication',
    });

    // ============================================
    // PIPEDRIVE CONNECTOR
    // ============================================
    this.register({
      id: 'pipedrive',
      provider: 'pipedrive',
      service: 'crm',
      capabilities: [
        'crm.read',
        'crm.write',
        'pipedrive.deal',
      ],
      keywords: ['pipedrive', 'pipe drive'],
      credentialContract: {
        provider: 'pipedrive',
        type: 'api_key',
        vaultKey: 'pipedrive',
        displayName: 'Pipedrive API Token',
        required: true,
        credentialFieldName: 'apiToken', // ✅ PERMANENT: Pipedrive uses apiToken, not apiKey
      },
      nodeTypes: ['pipedrive'],
      description: 'Interact with Pipedrive CRM via API token',
    });

    // ============================================
    // ZOHO CRM CONNECTOR
    // ============================================
    this.register({
      id: 'zoho_crm',
      provider: 'zoho',
      service: 'crm',
      capabilities: [
        'crm.read',
        'crm.write',
        'zoho.record',
      ],
      keywords: ['zoho', 'zoho crm'],
      credentialContract: {
        provider: 'zoho',
        type: 'oauth',
        scopes: ['ZohoCRM.modules.ALL'],
        vaultKey: 'zoho',
        displayName: 'Zoho CRM OAuth',
        required: true,
      },
      nodeTypes: ['zoho_crm'],
      description: 'Interact with Zoho CRM via OAuth',
    });

    // ============================================
    // TWITTER CONNECTOR
    // ============================================
    this.register({
      id: 'twitter_oauth',
      provider: 'twitter',
      service: 'twitter',
      capabilities: [
        'social.post',
        'twitter.post',
        'twitter.tweet',
      ],
      keywords: ['twitter', 'tweet', 'x.com', 'post to twitter'],
      credentialContract: {
        provider: 'twitter',
        type: 'oauth',
        scopes: ['tweet.read', 'tweet.write', 'users.read'],
        vaultKey: 'twitter',
        displayName: 'Twitter OAuth',
        required: true,
      },
      nodeTypes: ['twitter'],
      description: 'Post tweets to Twitter/X via OAuth',
    });

    // ============================================
    // ZOOM CONNECTOR
    // ============================================
    this.register({
      id: 'zoom_oauth',
      provider: 'zoom',
      service: 'video_conferencing',
      capabilities: [
        'zoom.meeting',
        'zoom.create',
        'zoom.list',
      ],
      keywords: ['zoom', 'meeting', 'video call', 'video conferencing'],
      credentialContract: {
        provider: 'zoom',
        type: 'oauth',
        scopes: ['meeting:write', 'meeting:read', 'user:read'],
        vaultKey: 'zoom',
        displayName: 'Zoom OAuth',
        required: true,
        credentialFieldName: 'accessToken',
      },
      nodeTypes: ['zoom_video'],
      description: 'Create and manage Zoom meetings via OAuth',
    });

    // ============================================
    // INSTAGRAM CONNECTOR
    // ============================================
    this.register({
      id: 'instagram_oauth',
      provider: 'instagram',
      service: 'instagram',
      capabilities: [
        'social.post',
        'instagram.post',
        'instagram.media',
        'instagram.receive',
        'instagram.message',
        'instagram.comment',
      ],
      keywords: ['instagram', 'insta', 'post to instagram', 'ig', 'instagram dm', 'instagram trigger', 'instagram comment'],
      credentialContract: {
        provider: 'instagram',
        type: 'oauth',
        scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_messages', 'instagram_manage_comments', 'pages_show_list', 'pages_read_engagement'],
        vaultKey: 'instagram',
        displayName: 'Instagram OAuth',
        required: true,
      },
      nodeTypes: ['instagram', 'instagram_trigger'],
      description: 'Post content, reply to messages/comments, and receive Instagram webhooks via OAuth',
    });

    // ============================================
    // YOUTUBE CONNECTOR
    // ============================================
    this.register({
      id: 'youtube_oauth',
      provider: 'youtube',
      service: 'youtube',
      capabilities: [
        'youtube.channels.read',
        'youtube.search',
        'video.upload',
        'video.update',
      ],
      keywords: ['youtube', 'you tube', 'yt', 'youtube channel', 'youtube videos'],
      credentialContract: {
        provider: 'youtube',
        type: 'oauth',
        scopes: [
          'https://www.googleapis.com/auth/youtube.force-ssl',
          'https://www.googleapis.com/auth/youtube.upload',
        ],
        vaultKey: 'youtube',
        displayName: 'YouTube OAuth',
        required: true,
      },
      nodeTypes: ['youtube'],
      description: 'Read, upload, and manage YouTube videos via OAuth',
    });

    // ============================================
    // OUTLOOK CONNECTOR
    // ============================================
    this.register({
      id: 'outlook_oauth',
      provider: 'microsoft',
      service: 'outlook',
      capabilities: [
        'email.send',
        'outlook.send',
        'microsoft.mail',
        'outlook.receive',
        'trigger.webhook',
      ],
      keywords: ['outlook', 'microsoft outlook', 'outlook email', 'send via outlook'],
      credentialContract: {
        provider: 'microsoft',
        type: 'oauth',
        scopes: [
          'offline_access',
          'https://graph.microsoft.com/User.Read',
          'https://graph.microsoft.com/Mail.Send',
          'https://graph.microsoft.com/Mail.Read',
          'https://graph.microsoft.com/Calendars.Read',
        ],
        vaultKey: 'microsoft',
        displayName: 'Microsoft OAuth (Outlook)',
        required: true,
      },
      nodeTypes: ['outlook', 'outlook_trigger'],
      description: 'Send and receive email via Microsoft Graph using Microsoft OAuth',
    });

    // ============================================
    // FACEBOOK CONNECTOR
    // ============================================
    this.register({
      id: 'facebook_oauth',
      provider: 'facebook',
      service: 'facebook',
      capabilities: [
        'social.post',
        'facebook.post',
        'facebook.page',
        'facebook.receive',
        'messenger.receive',
        'message.receive',
        'comment.receive',
        'lead.receive',
        'messenger.send',
        'message.send',
      ],
      keywords: ['facebook', 'fb', 'post to facebook', 'facebook trigger', 'messenger trigger', 'facebook page message', 'lead ad'],
      credentialContract: {
        provider: 'facebook',
        type: 'oauth',
        scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_metadata', 'pages_manage_posts', 'pages_manage_engagement', 'pages_messaging', 'leads_retrieval'],
        vaultKey: 'facebook',
        displayName: 'Facebook OAuth',
        required: true,
      },
      nodeTypes: ['facebook', 'facebook_trigger'],
      description: 'Post content, reply to Messenger/Page comments, and receive real-time Facebook Page webhooks via OAuth',
    });

    // ============================================
    // WHATSAPP CLOUD CONNECTOR
    // ============================================
    this.register({
      id: 'whatsapp_cloud',
      provider: 'whatsapp',
      service: 'whatsapp',
      capabilities: [
        'notification.send',
        'whatsapp.send',
        'whatsapp.receive',
        'message.send',
        'message.receive',
      ],
      keywords: ['whatsapp', 'whats app'],
      credentialContract: {
        provider: 'whatsapp',
        type: 'api_key',
        vaultKey: 'whatsapp',
        displayName: 'WhatsApp Cloud API Token',
        required: true,
        credentialFieldName: 'accessToken',
      },
      nodeTypes: ['whatsapp', 'whatsapp_cloud', 'whatsapp_trigger'],
      description: 'Send messages and receive real-time WhatsApp Cloud API webhooks',
    });

    // ============================================
    // GITHUB CONNECTOR
    // ============================================
    this.register({
      id: 'github_oauth',
      provider: 'github',
      service: 'github',
      capabilities: [
        'git.manage',
        'github.repo',
        'github.issues',
        'trigger.webhook',
        'github.receive',
      ],
      keywords: ['github', 'git hub'],
      credentialContract: {
        provider: 'github',
        type: 'oauth',
        scopes: ['repo', 'workflow'],
        vaultKey: 'github',
        displayName: 'GitHub OAuth',
        required: true,
      },
      nodeTypes: ['github', 'github_trigger'],
      description: 'GitHub repository operations and real-time webhook events via OAuth or Personal Access Token',
    });

    // ============================================
    // GOOGLE CALENDAR CONNECTOR
    // ============================================
    this.register({
      id: 'google_calendar',
      provider: 'google',
      service: 'calendar',
      capabilities: [
        'calendar.read',
        'calendar.write',
        'calendar.event',
        'google.calendar',
        'google_calendar.receive',
        'trigger.webhook',
      ],
      keywords: ['google calendar', 'calendar', 'google cal'],
      credentialContract: {
        provider: 'google',
        type: 'oauth',
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
        vaultKey: 'google',
        displayName: 'Google OAuth (Calendar)',
        required: true,
      },
      nodeTypes: ['google_calendar', 'google_calendar_trigger'],
      description: 'Read/write Google Calendar events via OAuth',
    });

    // ============================================
    // GOOGLE DRIVE CONNECTOR
    // ============================================
    this.register({
      id: 'google_drive',
      provider: 'google',
      service: 'drive',
      capabilities: [
        'file.read',
        'file.write',
        'drive.read',
        'drive.write',
        'google.drive',
        'google_drive.receive',
        'trigger.webhook',
      ],
      keywords: ['google drive', 'drive', 'google file'],
      credentialContract: {
        provider: 'google',
        type: 'oauth',
        scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive'],
        vaultKey: 'google',
        displayName: 'Google OAuth (Drive)',
        required: true,
      },
      nodeTypes: ['google_drive', 'google_drive_trigger'],
      description: 'Read/write Google Drive files via OAuth',
    });

    // ============================================
    // GOOGLE CONTACTS CONNECTOR
    // ============================================
    this.register({
      id: 'google_contacts',
      provider: 'google',
      service: 'contacts',
      capabilities: [
        'contacts.read',
        'contacts.write',
        'google.contacts',
      ],
      keywords: ['google contacts', 'contacts', 'google contact'],
      credentialContract: {
        provider: 'google',
        type: 'oauth',
        scopes: ['https://www.googleapis.com/auth/contacts.readonly', 'https://www.googleapis.com/auth/contacts'],
        vaultKey: 'google',
        displayName: 'Google OAuth (Contacts)',
        required: true,
      },
      nodeTypes: ['google_contacts'],
      description: 'Read/write Google Contacts via OAuth',
    });

    // ============================================
    // GOOGLE TASKS CONNECTOR
    // ============================================
    this.register({
      id: 'google_tasks',
      provider: 'google',
      service: 'tasks',
      capabilities: [
        'tasks.read',
        'tasks.write',
        'google.tasks',
      ],
      keywords: ['google tasks', 'tasks', 'google task'],
      credentialContract: {
        provider: 'google',
        type: 'oauth',
        scopes: ['https://www.googleapis.com/auth/tasks', 'https://www.googleapis.com/auth/tasks.readonly'],
        vaultKey: 'google',
        displayName: 'Google OAuth (Tasks)',
        required: true,
      },
      nodeTypes: ['google_tasks'],
      description: 'Read/write Google Tasks via OAuth',
    });

    // ============================================
    // GOOGLE BIGQUERY CONNECTOR
    // ============================================
    this.register({
      id: 'google_bigquery',
      provider: 'google',
      service: 'bigquery',
      capabilities: [
        'database.query',
        'bigquery.query',
        'google.bigquery',
      ],
      keywords: ['google bigquery', 'bigquery', 'big query', 'google bq'],
      credentialContract: {
        provider: 'google',
        type: 'oauth',
        scopes: ['https://www.googleapis.com/auth/bigquery', 'https://www.googleapis.com/auth/bigquery.readonly'],
        vaultKey: 'google',
        displayName: 'Google OAuth (BigQuery)',
        required: true,
      },
      nodeTypes: ['google_bigquery'],
      description: 'Query Google BigQuery via OAuth',
    });

    // ============================================
    // POSTGRESQL CONNECTOR
    // ============================================
    this.register({
      id: 'postgresql',
      provider: 'postgresql',
      service: 'database',
      capabilities: [
        'database.read',
        'database.write',
        'database.query',
        'postgresql.query',
      ],
      keywords: ['postgresql', 'postgres', 'pg'],
      credentialContract: {
        provider: 'postgresql',
        type: 'runtime',
        vaultKey: 'postgresql',
        displayName: 'PostgreSQL Connection String',
        required: true,
        credentialFieldName: 'connectionString',
      },
      nodeTypes: ['postgresql'],
      description: 'Connect to PostgreSQL database via connection string',
    });

    // ============================================
    // MYSQL CONNECTOR
    // ============================================
    this.register({
      id: 'mysql',
      provider: 'mysql',
      service: 'database',
      capabilities: [
        'database.read',
        'database.write',
        'database.query',
        'mysql.query',
      ],
      keywords: ['mysql', 'my sql'],
      credentialContract: {
        provider: 'mysql',
        type: 'runtime',
        vaultKey: 'mysql',
        displayName: 'MySQL Connection String',
        required: true,
        credentialFieldName: 'connectionString',
      },
      nodeTypes: ['mysql'],
      description: 'Connect to MySQL database via connection string',
    });

    // ============================================
    // MONGODB CONNECTOR
    // ============================================
    this.register({
      id: 'mongodb',
      provider: 'mongodb',
      service: 'database',
      capabilities: [
        'database.read',
        'database.write',
        'database.query',
        'mongodb.query',
      ],
      keywords: ['mongodb', 'mongo', 'mongo db'],
      credentialContract: {
        provider: 'mongodb',
        type: 'runtime',
        vaultKey: 'mongodb',
        displayName: 'MongoDB Connection String',
        required: true,
        credentialFieldName: 'connectionString',
      },
      nodeTypes: ['mongodb'],
      description: 'Connect to MongoDB database via connection string',
    });

    // ============================================
    // REDIS CONNECTOR
    // ============================================
    this.register({
      id: 'redis',
      provider: 'redis',
      service: 'cache',
      capabilities: [
        'cache.read',
        'cache.write',
        'redis.get',
        'redis.set',
      ],
      keywords: ['redis', 'cache'],
      credentialContract: {
        provider: 'redis',
        type: 'runtime',
        vaultKey: 'redis',
        displayName: 'Redis Connection String',
        required: true,
        credentialFieldName: 'connectionString',
      },
      nodeTypes: ['redis'],
      description: 'Connect to Redis cache via connection string',
    });

    // ============================================
    // SUPABASE CONNECTOR
    // ============================================
    this.register({
      id: 'db',
      provider: 'db',
      service: 'database',
      capabilities: [
        'database.read',
        'database.write',
        'database.query',
        'db.query',
      ],
      keywords: ['db', 'supa base'],
      credentialContract: {
        provider: 'db',
        type: 'api_key',
        vaultKey: 'db',
        displayName: 'Supabase API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['db'],
      description: 'Connect to Supabase database via API key',
    });

    // ============================================
    // STRIPE CONNECTOR
    // ============================================
    this.register({
      id: 'stripe',
      provider: 'stripe',
      service: 'payment',
      capabilities: [
        'payment.process',
        'stripe.charge',
        'stripe.subscription',
        'stripe.receive',
        'trigger.webhook',
      ],
      keywords: ['stripe', 'payment', 'credit card', 'charge'],
      credentialContract: {
        provider: 'stripe',
        type: 'api_key',
        vaultKey: 'stripe',
        displayName: 'Stripe API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['stripe', 'stripe_trigger'],
      description: 'Process payments via Stripe API',
    });

    // ============================================
    // SHOPIFY CONNECTOR
    // ============================================
    this.register({
      id: 'shopify',
      provider: 'shopify',
      service: 'ecommerce',
      capabilities: [
        'ecommerce.read',
        'ecommerce.write',
        'shopify.order',
        'shopify.product',
        'shopify.receive',
        'trigger.webhook',
      ],
      keywords: ['shopify', 'shop ify', 'ecommerce'],
      credentialContract: {
        provider: 'shopify',
        type: 'api_key',
        vaultKey: 'shopify',
        displayName: 'Shopify API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['shopify', 'shopify_trigger'],
      description: 'Interact with Shopify store via API key',
    });

    // ============================================
    // WOOCOMMERCE CONNECTOR
    // ============================================
    this.register({
      id: 'woocommerce',
      provider: 'woocommerce',
      service: 'ecommerce',
      capabilities: [
        'ecommerce.read',
        'ecommerce.write',
        'woocommerce.order',
        'woocommerce.product',
      ],
      keywords: ['woocommerce', 'woo commerce', 'woocom'],
      credentialContract: {
        provider: 'woocommerce',
        type: 'api_key',
        vaultKey: 'woocommerce',
        displayName: 'WooCommerce API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['woocommerce'],
      description: 'Interact with WooCommerce store via API key',
    });

    // ============================================
    // PAYPAL CONNECTOR
    // ============================================
    this.register({
      id: 'paypal',
      provider: 'paypal',
      service: 'payment',
      capabilities: [
        'payment.process',
        'paypal.payment',
      ],
      keywords: ['paypal', 'pay pal'],
      credentialContract: {
        provider: 'paypal',
        type: 'oauth',
        scopes: ['https://uri.paypal.com/services/payments'],
        vaultKey: 'paypal',
        displayName: 'PayPal OAuth',
        required: true,
      },
      nodeTypes: ['paypal'],
      description: 'Process payments via PayPal OAuth',
    });

    // ============================================
    // TWILIO CONNECTOR
    // ============================================
    this.register({
      id: 'twilio',
      provider: 'twilio',
      service: 'sms',
      capabilities: [
        'sms.send',
        'twilio.sms',
        'message.send',
      ],
      keywords: ['twilio', 'sms', 'text message'],
      credentialContract: {
        provider: 'twilio',
        type: 'api_key',
        vaultKey: 'twilio',
        displayName: 'Twilio API Key',
        required: true,
        credentialFieldName: 'accountSid',
      },
      nodeTypes: ['twilio'],
      description: 'Send SMS messages via Twilio API',
    });

    // ============================================
    // MICROSOFT TEAMS CONNECTOR
    // ============================================
    this.register({
      id: 'microsoft_teams',
      provider: 'microsoft',
      service: 'teams',
      capabilities: [
        'notification.send',
        'teams.send',
        'message.send',
      ],
      keywords: ['microsoft teams', 'teams', 'ms teams'],
      credentialContract: {
        provider: 'microsoft',
        type: 'webhook',
        vaultKey: 'microsoft_teams',
        displayName: 'Microsoft Teams Webhook URL',
        required: true,
        credentialFieldName: 'webhookUrl',
      },
      nodeTypes: ['microsoft_teams'],
      description: 'Send messages to Microsoft Teams via webhook',
    });
    this.register({
      id: 'microsoft_teams_bot',
      provider: 'microsoft_teams',
      service: 'teams',
      capabilities: [
        'teams.receive',
        'teams.send',
        'teams.reply',
        'message.receive',
        'message.send',
        'trigger.webhook',
      ],
      keywords: ['microsoft teams trigger', 'teams trigger', 'teams bot', 'teams message received', 'teams personal message'],
      credentialContract: {
        provider: 'microsoft_teams',
        type: 'api_key',
        vaultKey: 'microsoft_teams_bot',
        displayName: 'Microsoft Teams Bot',
        required: true,
        credentialFieldName: 'appId',
      },
      // ✅ FIX: 'microsoft_teams' removed — it belongs to the microsoft_teams connector above;
      // listing it here only worked because that connector happens to register first.
      nodeTypes: ['microsoft_teams_trigger'],
      description: 'Receive Microsoft Teams Bot Framework activities and reply to Teams conversations',
    });

    // ============================================
    // GITLAB CONNECTOR
    // ============================================
    this.register({
      id: 'gitlab',
      provider: 'gitlab',
      service: 'git',
      capabilities: [
        'git.manage',
        'gitlab.repo',
        'gitlab.issues',
        'trigger.webhook',
        'gitlab.receive',
      ],
      keywords: ['gitlab', 'git lab'],
      credentialContract: {
        provider: 'gitlab',
        type: 'oauth',
        scopes: ['api', 'read_repository', 'write_repository'],
        vaultKey: 'gitlab',
        displayName: 'GitLab OAuth',
        required: true,
      },
      nodeTypes: ['gitlab', 'gitlab_trigger'],
      description: 'GitLab repository operations via OAuth, plus real-time push/issue/merge request/comment/pipeline/release triggers via project webhooks',
    });

    // ============================================
    // BITBUCKET CONNECTOR
    // ============================================
    this.register({
      id: 'bitbucket',
      provider: 'bitbucket',
      service: 'git',
      capabilities: [
        'git.manage',
        'bitbucket.repo',
        'bitbucket.issues',
      ],
      keywords: ['bitbucket', 'bit bucket'],
      credentialContract: {
        provider: 'bitbucket',
        type: 'oauth',
        scopes: ['repository:write', 'repository:read'],
        vaultKey: 'bitbucket',
        displayName: 'Bitbucket OAuth',
        required: true,
      },
      nodeTypes: ['bitbucket'],
      description: 'Bitbucket repository operations via OAuth',
    });

    // ============================================
    // JIRA CONNECTOR
    // ============================================
    this.register({
      id: 'jira',
      provider: 'jira',
      service: 'project',
      capabilities: [
        'project.manage',
        'jira.issue',
        'jira.project',
        'trigger.webhook',
        'jira.receive',
      ],
      keywords: ['jira'],
      credentialContract: {
        provider: 'jira',
        type: 'api_key',
        vaultKey: 'jira',
        displayName: 'Jira API Token',
        required: true,
        credentialFieldName: 'apiToken',
      },
      nodeTypes: ['jira', 'jira_trigger'],
      description: 'Interact with Jira via API token, and trigger workflows on Jira issue/comment webhook events (manual webhook setup — see Jira Trigger docs)',
    });

    // ============================================
    // JENKINS CONNECTOR
    // ============================================
    this.register({
      id: 'jenkins',
      provider: 'jenkins',
      service: 'ci_cd',
      capabilities: [
        'ci_cd.trigger',
        'jenkins.build',
      ],
      keywords: ['jenkins'],
      credentialContract: {
        provider: 'jenkins',
        type: 'api_key',
        vaultKey: 'jenkins',
        displayName: 'Jenkins API Token',
        required: true,
        credentialFieldName: 'apiToken',
      },
      nodeTypes: ['jenkins'],
      description: 'Trigger Jenkins builds via API token',
    });

    // ============================================
    // AWS S3 CONNECTOR
    // ============================================
    this.register({
      id: 'aws_s3',
      provider: 'aws',
      service: 's3',
      capabilities: [
        'file.read',
        'file.write',
        's3.upload',
        's3.download',
      ],
      keywords: ['aws s3', 's3', 'amazon s3', 'aws storage'],
      credentialContract: {
        provider: 'aws',
        type: 'api_key',
        vaultKey: 'aws',
        displayName: 'AWS Access Key',
        required: true,
        credentialFieldName: 'accessKeyId',
      },
      nodeTypes: ['aws_s3'],
      description: 'Read/write files to AWS S3 via access key',
    });

    // ============================================
    // DROPBOX CONNECTOR
    // ============================================
    this.register({
      id: 'dropbox',
      provider: 'dropbox',
      service: 'storage',
      capabilities: [
        'file.read',
        'file.write',
        'dropbox.upload',
        'dropbox.download',
      ],
      keywords: ['dropbox', 'drop box'],
      credentialContract: {
        provider: 'dropbox',
        type: 'oauth',
        scopes: ['files.content.read', 'files.content.write'],
        vaultKey: 'dropbox',
        displayName: 'Dropbox OAuth',
        required: true,
      },
      nodeTypes: ['dropbox'],
      description: 'Read/write files to Dropbox via OAuth',
    });

    // ============================================
    // ONEDRIVE CONNECTOR
    // ============================================
    this.register({
      id: 'onedrive',
      provider: 'microsoft',
      service: 'onedrive',
      capabilities: [
        'file.read',
        'file.write',
        'onedrive.upload',
        'onedrive.download',
      ],
      keywords: ['onedrive', 'one drive', 'microsoft onedrive'],
      credentialContract: {
        provider: 'microsoft',
        type: 'oauth',
        scopes: ['Files.ReadWrite', 'Files.ReadWrite.All'],
        vaultKey: 'microsoft',
        displayName: 'Microsoft OAuth (OneDrive)',
        required: true,
      },
      nodeTypes: ['onedrive'],
      description: 'Read/write files to OneDrive via OAuth',
    });

    // ============================================
    // FRESHDESK CONNECTOR
    // ============================================
    this.register({
      id: 'freshdesk',
      provider: 'freshdesk',
      service: 'support',
      capabilities: [
        'support.ticket',
        'freshdesk.ticket',
        'customer.support',
      ],
      keywords: ['freshdesk', 'fresh desk', 'support ticket'],
      credentialContract: {
        provider: 'freshdesk',
        type: 'api_key',
        vaultKey: 'freshdesk',
        displayName: 'Freshdesk API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['freshdesk'],
      description: 'Interact with Freshdesk support tickets via API key',
    });

    // ============================================
    // INTERCOM CONNECTOR
    // ============================================
    this.register({
      id: 'intercom',
      provider: 'intercom',
      service: 'support',
      capabilities: [
        'support.message',
        'intercom.message',
        'customer.message',
      ],
      keywords: ['intercom', 'inter com'],
      credentialContract: {
        provider: 'intercom',
        type: 'oauth',
        scopes: ['read', 'write'],
        vaultKey: 'intercom',
        displayName: 'Intercom OAuth',
        required: true,
      },
      nodeTypes: ['intercom'],
      description: 'Send messages via Intercom OAuth',
    });

    // ============================================
    // MAILCHIMP CONNECTOR
    // ============================================
    this.register({
      id: 'mailchimp',
      provider: 'mailchimp',
      service: 'email_marketing',
      capabilities: [
        'email.campaign',
        'mailchimp.campaign',
        'email.marketing',
      ],
      keywords: ['mailchimp', 'mail chimp', 'email marketing'],
      credentialContract: {
        provider: 'mailchimp',
        type: 'api_key',
        vaultKey: 'mailchimp',
        displayName: 'Mailchimp API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['mailchimp'],
      description: 'Manage Mailchimp email campaigns via API key',
    });

    // ============================================
    // ACTIVECAMPAIGN CONNECTOR
    // ============================================
    this.register({
      id: 'activecampaign',
      provider: 'activecampaign',
      service: 'email_marketing',
      capabilities: [
        'activecampaign.contact',
      ],
      keywords: ['activecampaign', 'active campaign'],
      credentialContract: {
        provider: 'activecampaign',
        type: 'api_key',
        vaultKey: 'activecampaign',
        displayName: 'ActiveCampaign API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['activecampaign'],
      description: 'Add, update, or delete ActiveCampaign contacts via API key',
    });

    // ============================================
    // OPENAI GPT CONNECTOR
    // ============================================
    this.register({
      id: 'openai_gpt',
      provider: 'openai',
      service: 'ai',
      capabilities: [
        'ai.chat',
        'openai.chat',
        'gpt.chat',
      ],
      keywords: ['openai', 'gpt', 'chatgpt', 'open ai'],
      credentialContract: {
        provider: 'openai',
        type: 'api_key',
        vaultKey: 'openai',
        displayName: 'OpenAI API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['openai_gpt'],
      description: 'Use OpenAI GPT models via API key',
    });

    // ============================================
    // ANTHROPIC CLAUDE CONNECTOR
    // ============================================
    this.register({
      id: 'anthropic_claude',
      provider: 'anthropic',
      service: 'ai',
      capabilities: [
        'ai.chat',
        'claude.chat',
        'anthropic.chat',
      ],
      keywords: ['anthropic', 'claude', 'anthropic claude'],
      credentialContract: {
        provider: 'anthropic',
        type: 'api_key',
        vaultKey: 'anthropic',
        displayName: 'Anthropic API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['anthropic_claude'],
      description: 'Use Anthropic Claude models via API key',
    });

    // ============================================
    // OLLAMA CONNECTOR
    // ============================================
    this.register({
      id: 'ollama',
      provider: 'ollama',
      service: 'ai',
      capabilities: [
        'ai.chat',
        'ollama.chat',
        'local.ai',
      ],
      keywords: ['ollama', 'local ai', 'ollama ai'],
      credentialContract: {
        provider: 'ollama',
        type: 'runtime',
        vaultKey: 'ollama',
        displayName: 'Ollama Base URL',
        required: false, // Ollama can run locally without credentials
      },
      nodeTypes: ['ollama'],
      description: 'Use Ollama local AI models (no credentials required for local)',
    });

    // ============================================
    // FTP CONNECTOR
    // ============================================
    this.register({
      id: 'ftp',
      provider: 'ftp',
      service: 'file_transfer',
      capabilities: [
        'file.upload',
        'file.download',
        'ftp.transfer',
      ],
      keywords: ['ftp', 'file transfer protocol'],
      credentialContract: {
        provider: 'ftp',
        type: 'basic_auth',
        vaultKey: 'ftp',
        displayName: 'FTP Credentials',
        required: true,
      },
      nodeTypes: ['ftp'],
      description: 'Transfer files via FTP using basic authentication',
    });

    // ============================================
    // SFTP CONNECTOR
    // ============================================
    this.register({
      id: 'sftp',
      provider: 'sftp',
      service: 'file_transfer',
      capabilities: [
        'file.upload',
        'file.download',
        'sftp.transfer',
      ],
      keywords: ['sftp', 'secure ftp', 'ssh ftp'],
      credentialContract: {
        provider: 'sftp',
        type: 'basic_auth',
        vaultKey: 'sftp',
        displayName: 'SFTP Credentials',
        required: true,
      },
      nodeTypes: ['sftp'],
      description: 'Transfer files via SFTP using SSH authentication',
    });

    // ============================================
    // SCHEDULEWISE CONNECTOR
    // ============================================
    this.register({
      id: 'schedulewise',
      provider: 'schedulewise',
      service: 'scheduling',
      capabilities: [
        'scheduling.read',
        'scheduling.write',
        'schedulewise.appointments',
      ],
      keywords: ['schedulewise', 'appointment', 'scheduling', 'booking'],
      credentialContract: {
        provider: 'schedulewise',
        type: 'api_key',
        vaultKey: 'schedulewise',
        displayName: 'ScheduleWise API Key',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['schedulewise'],
      description: 'Read and manage appointments/schedules via the ScheduleWise API',
    });

    // ============================================
    // WORKDAY CONNECTOR
    // ============================================
    this.register({
      id: 'workday',
      provider: 'workday',
      service: 'erp',
      capabilities: ['erp.read', 'erp.write', 'workday.hr'],
      keywords: ['workday', 'hr', 'workers', 'employees', 'hcm', 'human resources'],
      credentialContract: {
        provider: 'workday',
        type: 'token',
        vaultKey: 'workday',
        displayName: 'Workday Connection',
        required: true,
        credentialFieldName: 'accessToken',
      },
      nodeTypes: ['workday'],
      description: 'Read and manage Workday HR, staffing, and organizational data',
    });

    // ============================================
    // SAP CONNECTOR
    // ============================================
    this.register({
      id: 'sap',
      provider: 'sap',
      service: 'erp',
      capabilities: ['erp.read', 'erp.write', 'sap.odata', 'sap.rest'],
      keywords: ['sap', 'sap erp', 's4hana', 'sap hana', 'sap odata', 'sap business one'],
      credentialContract: {
        provider: 'sap',
        type: 'token',
        vaultKey: 'sap',
        displayName: 'SAP Connection',
        required: true,
        credentialFieldName: 'accessToken',
      },
      nodeTypes: ['sap'],
      description: 'Read and write SAP business objects via OData/REST APIs',
    });

    // ============================================
    // CHARGEBEE CONNECTOR
    // ============================================
    this.register({
      id: 'chargebee',
      provider: 'chargebee',
      service: 'billing',
      capabilities: ['billing.read', 'billing.write', 'chargebee.subscriptions'],
      keywords: ['chargebee', 'subscription', 'billing', 'recurring'],
      credentialContract: {
        provider: 'chargebee',
        type: 'api_key',
        vaultKey: 'chargebee',
        displayName: 'Chargebee Connection',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['chargebee'],
      description: 'Create customers, manage subscriptions, and automate billing with Chargebee',
    });

    // ============================================
    // GOOGLE CLOUD STORAGE CONNECTOR
    // ============================================
    this.register({
      id: 'google_cloud_storage',
      provider: 'google_cloud_storage',
      service: 'storage',
      capabilities: ['storage.read', 'storage.write', 'gcs.objects'],
      keywords: ['google cloud storage', 'gcs', 'cloud storage', 'object storage'],
      credentialContract: {
        provider: 'google_cloud_storage',
        type: 'api_key',
        vaultKey: 'google_cloud_storage',
        displayName: 'Google Cloud Storage Connection',
        required: true,
        credentialFieldName: 'privateKey',
      },
      nodeTypes: ['google_cloud_storage'],
      description: 'Upload, download, delete, and list files in Google Cloud Storage buckets',
    });

    // ============================================
    // NETLIFY CONNECTOR
    // ============================================
    this.register({
      id: 'netlify',
      provider: 'netlify',
      service: 'devops',
      capabilities: ['devops.deploy', 'netlify.sites'],
      keywords: ['netlify', 'deploy', 'sites', 'hosting'],
      credentialContract: {
        provider: 'netlify',
        type: 'token',
        vaultKey: 'netlify',
        displayName: 'Netlify Connection',
        required: true,
        credentialFieldName: 'accessToken',
      },
      nodeTypes: ['netlify'],
      description: 'Deploy sites and manage builds via the Netlify REST API',
    });

    // ============================================
    // SQL SERVER CONNECTOR
    // ============================================
    this.register({
      id: 'sql_server',
      provider: 'sql_server',
      service: 'database',
      capabilities: ['database.read', 'database.write', 'sql_server.query'],
      keywords: ['sql server', 'mssql', 'microsoft sql', 't-sql'],
      credentialContract: {
        provider: 'sql_server',
        type: 'basic_auth',
        vaultKey: 'sql_server',
        displayName: 'SQL Server Connection',
        required: true,
        credentialFieldName: 'password',
      },
      nodeTypes: ['sql_server'],
      description: 'Connect to and query Microsoft SQL Server databases',
    });

    // ============================================
    // TIMESCALEDB CONNECTOR
    // ============================================
    this.register({
      id: 'timescaledb',
      provider: 'timescaledb',
      service: 'database',
      capabilities: ['database.read', 'database.write', 'timescaledb.query'],
      keywords: ['timescaledb', 'timescale', 'time-series', 'iot'],
      credentialContract: {
        provider: 'timescaledb',
        type: 'basic_auth',
        vaultKey: 'timescaledb',
        displayName: 'TimescaleDB Connection',
        required: true,
        credentialFieldName: 'password',
      },
      nodeTypes: ['timescaledb'],
      description: 'Connect to and query TimescaleDB time-series databases',
    });

    // ============================================
    // ORACLE DATABASE CONNECTOR
    // ============================================
    this.register({
      id: 'oracle_database',
      provider: 'oracle_database',
      service: 'database',
      capabilities: ['database.read', 'database.write', 'oracle.query'],
      keywords: ['oracle', 'oracle database', 'oracledb', 'plsql'],
      credentialContract: {
        provider: 'oracle_database',
        type: 'basic_auth',
        vaultKey: 'oracle_database',
        displayName: 'Oracle Connection',
        required: true,
        credentialFieldName: 'password',
      },
      nodeTypes: ['oracle_database'],
      description: 'Connect to and query Oracle databases',
    });

    // ============================================
    // INTUIT SME CONNECTOR (mock/demo — executor returns simulated data, see intuitSmesNode.ts)
    // ============================================
    this.register({
      id: 'intuit',
      provider: 'intuit',
      service: 'crm',
      capabilities: ['crm.read', 'crm.write', 'intuit.customer', 'intuit.invoice'],
      keywords: ['intuit', 'quickbooks', 'sme', 'customer', 'invoice'],
      credentialContract: {
        provider: 'intuit',
        type: 'api_key',
        vaultKey: 'intuit',
        displayName: 'Intuit / QuickBooks',
        required: true,
        credentialFieldName: 'apiKey',
      },
      nodeTypes: ['intuit_smes'],
      description: 'Manage SME customer and invoice data via Intuit (mock/demo — does not call the real Intuit API)',
    });
  }

  /**
   * Register a connector
   */
  private register(connector: Connector): void {
    // Validate connector
    if (!connector.id || !connector.provider || !connector.service) {
      throw new Error(`Invalid connector: ${JSON.stringify(connector)}`);
    }

    // Ensure no duplicate IDs
    if (this.connectors.has(connector.id)) {
      throw new Error(`Connector ${connector.id} is already registered`);
    }

    this.connectors.set(connector.id, connector);
  }

  /**
   * Guard against the class of bug where two connectors both claim the same
   * node type: getConnectorByNodeType() resolves by Map insertion order, so an
   * overlap silently makes the earlier-registered connector shadow the other
   * one for every runtime lookup (credential resolution, injection, gating)
   * instead of surfacing as an error. Fail fast at startup instead.
   */
  private validateNoNodeTypeCollisions(): void {
    const owner = new Map<string, string>(); // nodeType -> connector id
    const collisions: string[] = [];

    for (const connector of this.connectors.values()) {
      for (const nodeType of connector.nodeTypes) {
        const existingOwnerId = owner.get(nodeType);
        if (existingOwnerId && existingOwnerId !== connector.id) {
          collisions.push(`'${nodeType}' claimed by both '${existingOwnerId}' and '${connector.id}'`);
        } else {
          owner.set(nodeType, connector.id);
        }
      }
    }

    if (collisions.length > 0) {
      throw new Error(
        `ConnectorRegistry: ambiguous nodeType ownership detected — each node type must map to exactly one connector. ${collisions.join('; ')}`
      );
    }
  }

  /**
   * Get connector by ID
   */
  getConnector(connectorId: string): Connector | undefined {
    return this.connectors.get(connectorId);
  }

  /**
   * Get connector by node type
   */
  getConnectorByNodeType(nodeType: string): Connector | undefined {
    for (const connector of this.connectors.values()) {
      if (connector.nodeTypes.includes(nodeType)) {
        return connector;
      }
    }
    return undefined;
  }

  /**
   * Get all connectors
   */
  getAllConnectors(): Connector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Get connectors by capability
   */
  getConnectorsByCapability(capability: string): Connector[] {
    return Array.from(this.connectors.values()).filter(
      connector => connector.capabilities.includes(capability)
    );
  }

  /**
   * Get connectors by provider
   */
  getConnectorsByProvider(provider: string): Connector[] {
    return Array.from(this.connectors.values()).filter(
      connector => connector.provider === provider
    );
  }

  /**
   * Find connectors matching keywords
   */
  findConnectorsByKeywords(keywords: string[]): Connector[] {
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
    return Array.from(this.connectors.values()).filter(connector => {
      return connector.keywords.some(keyword => 
        keywordSet.has(keyword.toLowerCase())
      );
    });
  }

  /**
   * Validate that no two connectors share credentials
   * This ensures strict isolation
   */
  validateIsolation(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const credentialMap = new Map<string, string[]>(); // credential key -> connector IDs

    for (const connector of this.connectors.values()) {
      const key = `${connector.credentialContract.provider}_${connector.credentialContract.type}`;
      
      if (!credentialMap.has(key)) {
        credentialMap.set(key, []);
      }
      
      credentialMap.get(key)!.push(connector.id);
    }

    // Check for shared credentials (this is allowed for same provider, but not across different providers)
    for (const [key, connectorIds] of credentialMap.entries()) {
      if (connectorIds.length > 1) {
        // Check if they're from the same provider
        const connectors = connectorIds.map(id => this.getConnector(id)!);
        const providers = new Set(connectors.map(c => c.provider));
        
        if (providers.size > 1) {
          errors.push(
            `Credential ${key} is shared across different providers: ${connectorIds.join(', ')}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
export const connectorRegistry = new ConnectorRegistry();

// Validate on load
const validation = connectorRegistry.validateIsolation();
if (!validation.valid) {
  console.error('[ConnectorRegistry] Validation failed:', validation.errors);
  throw new Error(`Connector registry validation failed: ${validation.errors.join('; ')}`);
}
