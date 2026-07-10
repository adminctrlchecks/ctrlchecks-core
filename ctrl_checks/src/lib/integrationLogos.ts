/**
 * Maps node types and integration names to their logo paths in /integrations-logos/.
 * All filenames use hyphens (no spaces).
 */
export const INTEGRATION_LOGO_MAP: Record<string, string> = {
  // Auth / Social
  google:           '/integrations-logos/Google.svg',
  google_gmail:     '/integrations-logos/Gmail.svg',
  gmail:            '/integrations-logos/Gmail.svg',
  github:           '/integrations-logos/Github.svg',
  gitlab:           '/integrations-logos/Gitlab.svg',
  bitbucket:        '/integrations-logos/bitbucket.svg',
  facebook:         '/integrations-logos/facebook.svg',
  instagram:        '/integrations-logos/Instagram.svg',
  linkedin:         '/integrations-logos/linkedin.svg',
  twitter:          '/integrations-logos/Twitter.svg',
  youtube:          '/integrations-logos/Youtube.svg',
  discord:          '/integrations-logos/Discord.svg',
  telegram:         '/integrations-logos/Telegram.svg',
  whatsapp:         '/integrations-logos/Whatsapp-Cloude.svg',
  whatsapp_cloud:   '/integrations-logos/Whatsapp-Cloude.svg',

  // AI
  openai:           '/integrations-logos/OpenAI-GPT.svg',
  openai_gpt:       '/integrations-logos/OpenAI-GPT.svg',
  anthropic:        '/integrations-logos/Anthropic.svg',
  claude:           '/integrations-logos/Claude.svg',
  cohere:           '/integrations-logos/Cohere.svg',
  google_gemini:    '/integrations-logos/Google-Gemini.svg',
  ollama:           '/integrations-logos/Ollama.svg',
  pinecone:         '/integrations-logos/Pinecone.svg',

  // Google Suite
  google_sheets:    '/integrations-logos/Google-Sheets.svg',
  google_drive:     '/integrations-logos/Google-Drive.svg',
  google_docs:      '/integrations-logos/Google-Docs.svg',
  google_calendar:  '/integrations-logos/Google-Calender.svg',
  google_contacts:  '/integrations-logos/Google-Contacts.svg',
  google_bigquery:  '/integrations-logos/Google-Bigquery.svg',

  // Databases
  mongodb:          '/integrations-logos/MongoDB.svg',
  mysql:            '/integrations-logos/MySQL.svg',
  postgresql:       '/integrations-logos/Postgre-Sql.svg',
  postgres:         '/integrations-logos/Postgre-Sql.svg',
  firebase:         '/integrations-logos/Firebase.svg',
  redis:            '/integrations-logos/Redis.svg',
  supabase:         '/integrations-logos/Supabase.svg',

  // Storage
  dropbox:          '/integrations-logos/Dropbox.svg',
  cloudflare:       '/integrations-logos/Cloudflare.svg',
  onedrive:         '/integrations-logos/OneDrive.svg',
  aws_s3:           '/integrations-logos/AWS-S3.svg',
  ftp:              '/integrations-logos/FTP.svg',
  sftp:             '/integrations-logos/SFTP.svg',

  // CRM & Marketing
  hubspot:          '/integrations-logos/Hubspot.svg',
  salesforce:       '/integrations-logos/Salesforce.svg',
  pipedrive:        '/integrations-logos/Pipedrive.svg',
  freshdesk:        '/integrations-logos/Freshdesk.svg',
  intercom:         '/integrations-logos/Intercom.svg',
  mailchimp:        '/integrations-logos/Mailchimp.svg',
  activecampaign:   '/integrations-logos/ActiveCampaign.svg',
  zoho:             '/integrations-logos/Zoho.svg',
  zoho_crm:         '/integrations-logos/Zoho-CRM.svg',

  // Productivity
  notion:           '/integrations-logos/Notion.svg',
  airtable:         '/integrations-logos/Airtable.svg',
  clickup:          '/integrations-logos/ClickUp.svg',
  jira:             '/integrations-logos/Jira.svg',
  monday:           '/integrations-logos/monday.svg',
  outlook:          '/integrations-logos/Outlook.svg',
  microsoft:        '/integrations-logos/Microsoft.svg.svg',
  microsoft_teams:  '/integrations-logos/Microsoft-Teams.svg',

  // DevOps
  jenkins:          '/integrations-logos/Jenkins.svg',

  // Payment
  stripe:           '/integrations-logos/Stripe.svg',
  paypal:           '/integrations-logos/PayPal.svg',

  // E-commerce
  shopify:          '/integrations-logos/Shopify.svg',
  woocommerce:      '/integrations-logos/WooCommerce.svg',

  // Communication
  slack:            '/integrations-logos/Slack.svg',
  twilio:           '/integrations-logos/Twilio.svg',
  sendgrid:         '/integrations-logos/Sendgrid.svg',
  amazon_ses:       '/integrations-logos/Amazon-SES.svg',

  // Misc
  contentful:       '/integrations-logos/Contentful.svg',
  wordpress:        '/integrations-logos/WordPress.svg',
};

/** Returns the logo path for a given node type, or undefined if none exists. */
export function getIntegrationLogo(nodeType: string): string | undefined {
  const key = nodeType.toLowerCase().replace(/[-\s]+/g, '_');
  return INTEGRATION_LOGO_MAP[key];
}
