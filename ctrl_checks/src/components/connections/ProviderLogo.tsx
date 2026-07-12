import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getIntegrationLogo } from '@/lib/integrationLogos';

const PROVIDER_COLORS: Record<string, string> = {
  google:      'bg-red-100 text-red-600',
  microsoft:   'bg-blue-100 text-blue-600',
  slack:       'bg-purple-100 text-purple-600',
  zoom:        'bg-blue-100 text-blue-600',
  github:      'bg-gray-100 text-gray-800',
  gitlab:      'bg-orange-100 text-orange-600',
  notion:      'bg-gray-100 text-gray-800',
  asana:       'bg-pink-100 text-pink-600',
  jira:        'bg-blue-100 text-blue-700',
  clickup:     'bg-violet-100 text-violet-600',
  monday:      'bg-red-100 text-red-500',
  linear:      'bg-indigo-100 text-indigo-600',
  trello:      'bg-sky-100 text-sky-600',
  hubspot:     'bg-orange-100 text-orange-600',
  salesforce:  'bg-sky-100 text-sky-600',
  pipedrive:   'bg-green-100 text-green-600',
  zoho:        'bg-red-100 text-red-600',
  airtable:    'bg-yellow-100 text-yellow-600',
  freshdesk:   'bg-green-100 text-green-600',
  intercom:    'bg-blue-100 text-blue-600',
  discord:     'bg-indigo-100 text-indigo-600',
  discord_webhook: 'bg-indigo-100 text-indigo-600',
  telegram:    'bg-sky-100 text-sky-500',
  whatsapp:    'bg-green-100 text-green-600',
  twilio:      'bg-red-100 text-red-600',
  sendgrid:    'bg-blue-100 text-blue-600',
  mailchimp:   'bg-yellow-100 text-yellow-600',
  aws:         'bg-orange-100 text-orange-600',
  cloudflare:  'bg-orange-100 text-orange-500',
  dropbox:     'bg-blue-100 text-blue-600',
  supabase:    'bg-green-100 text-green-600',
  mongodb:     'bg-green-100 text-green-700',
  openai:      'bg-green-100 text-green-700',
  anthropic:   'bg-orange-100 text-orange-600',
  pinecone:    'bg-green-100 text-green-600',
  qdrant:      'bg-red-100 text-red-500',
  cohere:      'bg-blue-100 text-blue-600',
  huggingface: 'bg-yellow-100 text-yellow-600',
  mistral:     'bg-orange-100 text-orange-500',
  stripe:      'bg-purple-100 text-purple-600',
  paypal:      'bg-blue-100 text-blue-700',
  quickbooks:  'bg-green-100 text-green-600',
  xero:        'bg-blue-100 text-blue-600',
  shopify:     'bg-green-100 text-green-600',
  woocommerce: 'bg-purple-100 text-purple-600',
  typeform:       'bg-gray-100 text-gray-800',
  generic:        'bg-gray-100 text-gray-600',
  twitter:        'bg-sky-100 text-sky-500',
  facebook:       'bg-blue-100 text-blue-700',
  instagram:      'bg-pink-100 text-pink-600',
  linkedin:       'bg-blue-100 text-blue-700',
  youtube:        'bg-red-100 text-red-600',
  postgresql:     'bg-sky-100 text-sky-700',
  mysql:          'bg-orange-100 text-orange-600',
  firebase:       'bg-yellow-100 text-yellow-600',
  redis:          'bg-red-100 text-red-600',
  activecampaign: 'bg-blue-100 text-blue-600',
  zendesk:        'bg-green-100 text-green-600',
  calendly:       'bg-blue-100 text-blue-500',
  mailgun:        'bg-red-100 text-red-600',
  bitbucket:      'bg-blue-100 text-blue-700',
  ftp:            'bg-gray-100 text-gray-600',
  sftp:           'bg-gray-100 text-gray-700',
  gemini:         'bg-blue-100 text-blue-600',
  vercel:         'bg-gray-100 text-gray-900',
  jenkins:        'bg-red-100 text-red-600',
  odoo:           'bg-purple-100 text-purple-600',
  contentful:     'bg-orange-100 text-orange-600',
  wordpress:      'bg-sky-100 text-sky-700',
  sap:            'bg-blue-100 text-blue-700',
  workday:        'bg-orange-100 text-orange-600',
  oracle_database: 'bg-red-100 text-red-700',
  netlify:        'bg-teal-100 text-teal-600',
  chargebee:      'bg-orange-100 text-orange-500',
  google_cloud_storage: 'bg-blue-100 text-blue-600',
  sql_server:     'bg-red-100 text-red-600',
  timescaledb:    'bg-yellow-100 text-yellow-700',
  schedulewise:   'bg-teal-100 text-teal-600',
  smtp:           'bg-slate-100 text-slate-600',
};

const PROVIDER_INITIALS: Record<string, string> = {
  google: 'G', microsoft: 'M', slack: 'S', github: 'GH', gitlab: 'GL',
  notion: 'N', asana: 'A', jira: 'J', clickup: 'CU', monday: 'Mo',
  linear: 'L', trello: 'Tr', hubspot: 'Hs', salesforce: 'SF', pipedrive: 'PD',
  zoho: 'Z', airtable: 'At', freshdesk: 'Fd', intercom: 'In', discord: 'Di', discord_webhook: 'Di',
  telegram: 'Tg', whatsapp: 'WA', twilio: 'Tw', sendgrid: 'SG', mailchimp: 'Mc',
  aws: 'AWS', cloudflare: 'CF', dropbox: 'Db', supabase: 'Sb', mongodb: 'Mg',
  openai: 'AI', anthropic: 'An', pinecone: 'Pc', qdrant: 'Qd', cohere: 'Co',
  huggingface: 'HF', mistral: 'Mi', stripe: 'St', paypal: 'PP', quickbooks: 'QB',
  xero: 'Xe', shopify: 'Sh', woocommerce: 'WC', typeform: 'Tf', generic: '?',
  twitter: 'Tw', facebook: 'Fb', instagram: 'Ig', linkedin: 'Li', youtube: 'YT', zoom: 'Zm',
  postgresql: 'PG', mysql: 'My', firebase: 'Fb', redis: 'Rd',
  activecampaign: 'AC', zendesk: 'Zd', calendly: 'Ca', mailgun: 'Mg',
  bitbucket: 'Bb', ftp: 'FTP', sftp: 'SFTP',
  gemini: 'Gm', vercel: 'Vc', jenkins: 'Jk', odoo: 'Od',
  contentful: 'Cf',
  wordpress: 'WP',
  sap: 'SAP',
  workday: 'Wd',
  oracle_database: 'Or',
  netlify: 'Nf',
  chargebee: 'Cb',
  google_cloud_storage: 'GCS',
  sql_server: 'SQL',
  timescaledb: 'Ts',
  schedulewise: 'Sw',
  smtp: '@',
};

const PROVIDER_LOGO_ALIASES: Record<string, string> = {
  aws: 'aws_s3',
  google: 'google',
  youtube: 'youtube',
  cloudflare: 'cloudflare',
  dropbox: 'dropbox',
  mongodb: 'mongodb',
  zoho: 'zoho',
  activecampaign: 'activecampaign',
  discord_webhook: 'discord',
  gemini: 'google_gemini',
  jenkins: 'jenkins',
  slack_webhook: 'slack',
};

const SIMPLE_ICON_SLUGS: Record<string, string> = {
  asana: 'asana',
  monday: 'mondaydotcom',
  linear: 'linear',
  trello: 'trello',
  microsoft: 'microsoft',
  sendgrid: 'sendgrid',
  calendly: 'calendly',
  mailgun: 'mailgun',
  cloudflare: 'cloudflare',
  quickbooks: 'quickbooks',
  xero: 'xero',
  typeform: 'typeform',
  qdrant: 'qdrant',
  huggingface: 'huggingface',
  mistral: 'mistralai',
  vercel: 'vercel',
  odoo: 'odoo',
  zendesk: 'zendesk',
  sap: 'sap',
  workday: 'workday',
  oracle_database: 'oracle',
  netlify: 'netlify',
  chargebee: 'chargebee',
  google_cloud_storage: 'googlecloud',
  sql_server: 'microsoftsqlserver',
  timescaledb: 'timescale',
};

interface Props {
  provider: string;
  size?: number;
  className?: string;
}

export function ProviderLogo({ provider, size = 32, className }: Props) {
  const normalizedProvider = provider.toLowerCase();
  const [imageFailed, setImageFailed] = useState(false);
  const logoKey = PROVIDER_LOGO_ALIASES[normalizedProvider] ?? normalizedProvider;
  const localLogoSrc = getIntegrationLogo(logoKey);
  const simpleIconSlug = SIMPLE_ICON_SLUGS[normalizedProvider];
  const logoSrc = localLogoSrc || (simpleIconSlug ? `https://cdn.simpleicons.org/${simpleIconSlug}` : undefined);
  const color = PROVIDER_COLORS[normalizedProvider] ?? PROVIDER_COLORS.generic;
  const initials = PROVIDER_INITIALS[normalizedProvider] ?? provider.slice(0, 2).toUpperCase();

  if (logoSrc && !imageFailed) {
    return (
      <div
        className={cn(
          'rounded-lg flex items-center justify-center shrink-0 bg-background border border-border/50 overflow-hidden',
          className,
        )}
        style={{ width: size, height: size }}
      >
        <img
          src={logoSrc}
          alt={`${provider} logo`}
          className="h-[70%] w-[70%] object-contain"
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-lg flex items-center justify-center font-bold shrink-0', color, className)}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}
