import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ProviderLogo } from './ProviderLogo';
import { isComingSoonProvider } from './connectionAvailability';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import type { CredentialTypeDefinition } from '@/lib/api/connections';

const CATEGORIES: Record<string, string[]> = {
  'Google Suite':        ['google', 'youtube'],
  'Microsoft Suite':     ['microsoft'],
  'Social Media':        ['twitter', 'facebook', 'instagram', 'linkedin'],
  'Project Management':  ['notion', 'asana', 'jira', 'clickup', 'monday', 'linear', 'trello'],
  'CRM & Sales':         ['hubspot', 'salesforce', 'pipedrive', 'zoho', 'airtable', 'freshdesk', 'intercom', 'zendesk', 'activecampaign'],
  'Communication':       ['slack', 'discord', 'telegram', 'whatsapp', 'twilio', 'sendgrid', 'mailchimp', 'mailgun', 'calendly', 'zoom'],
  'Cloud & DevOps':      ['aws', 'github', 'gitlab', 'bitbucket', 'cloudflare', 'dropbox', 'supabase', 'mongodb'],
  'Databases':           ['postgresql', 'mysql', 'firebase', 'redis'],
  'File Transfer':       ['ftp', 'sftp'],
  'AI & Data':           ['openai', 'anthropic', 'pinecone', 'qdrant', 'cohere', 'huggingface', 'mistral'],
  'Content & CMS':       ['contentful', 'wordpress'],
  'Payments & Business': ['stripe', 'paypal', 'quickbooks', 'xero', 'shopify', 'woocommerce', 'typeform'],
};

function categoryFor(provider: string): string {
  for (const [cat, providers] of Object.entries(CATEGORIES)) {
    if (providers.includes(provider)) return cat;
  }
  return 'Other';
}

interface Props {
  onSelect: (type: CredentialTypeDefinition) => void;
  connectedTypeIds?: Set<string>;
}

export function ServicePickerGrid({ onSelect, connectedTypeIds = new Set() }: Props) {
  const { data: types = [], isLoading } = useCredentialTypes();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? types.filter(
        (t) =>
          t.displayName.toLowerCase().includes(search.toLowerCase()) ||
          t.provider.toLowerCase().includes(search.toLowerCase()),
      )
    : types;

  // Deduplicate by provider — show only first credential type per provider for picker
  const seen = new Set<string>();
  const unique = filtered.filter((t) => {
    if (seen.has(t.provider)) return false;
    seen.add(t.provider);
    return true;
  });

  // Group
  const grouped: Record<string, CredentialTypeDefinition[]> = {};
  for (const t of unique) {
    const cat = categoryFor(t.provider);
    (grouped[cat] ??= []).push(t);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Loading services…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="max-h-[420px] overflow-y-auto space-y-5 pr-1">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {cat}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((t) => {
                const comingSoon = isComingSoonProvider(t.provider);
                const alreadyConnected = connectedTypeIds.has(t.id);
                const providerName = t.provider.charAt(0).toUpperCase() + t.provider.slice(1);

                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={comingSoon}
                    title={
                      comingSoon
                        ? `${providerName} is coming soon`
                        : alreadyConnected
                          ? `Add another ${providerName} connection`
                          : `Connect ${providerName}`
                    }
                    onClick={() => {
                      if (!comingSoon) onSelect(t);
                    }}
                    className={`relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors group ${
                      comingSoon
                        ? 'cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground opacity-75'
                        : 'border-transparent hover:border-border hover:bg-muted/50'
                    }`}
                  >
                    {(comingSoon || alreadyConnected) && (
                      <span className="absolute right-1 top-1 rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                        {alreadyConnected ? 'Connected' : 'Coming soon'}
                      </span>
                    )}
                    <ProviderLogo provider={t.provider} size={36} />
                    <span
                      className={`text-xs text-center font-medium leading-tight ${
                        comingSoon ? 'text-muted-foreground' : 'group-hover:text-primary'
                      }`}
                    >
                      {providerName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {unique.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No services found for &ldquo;{search}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
