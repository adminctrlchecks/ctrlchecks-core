import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Cable,
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { awsClient } from '@/integrations/aws/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AppChromeHeader } from '@/components/layout/AppChromeHeader';
import { WorkflowAuthGate } from '@/components/WorkflowAuthGate';
import { NewConnectionModal } from '@/components/connections/NewConnectionModal';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import { ConnectionStatusBadge } from '@/components/connections/ConnectionStatusBadge';
import { isComingSoonProvider } from '@/components/connections/connectionAvailability';
import {
  useConnections,
  useDeleteConnection,
  useTestConnection,
  useUpdateConnection,
} from '@/hooks/useConnections';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { useOAuthFlow } from '@/hooks/useOAuthFlow';
import { useToast } from '@/hooks/use-toast';
import {
  fetchWorkflowSetupStatus,
  groupWorkflowConnectionIssues,
  type WorkflowMissingConnection,
  type WorkflowConnectionGroup,
} from '@/hooks/useWorkflowConnectionStatus';
import { invalidateAfterConnectionChange } from '@/lib/queryInvalidation';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import type { ConnectionRecord, CredentialTypeDefinition } from '@/lib/api/connections';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Provider categories ──────────────────────────────────────────────────────
const PROVIDER_CATEGORIES: Record<string, string[]> = {
  'Google Suite':        ['google', 'youtube'],
  'Microsoft Suite':     ['microsoft'],
  'Social Media':        ['twitter', 'facebook', 'instagram', 'linkedin'],
  'Project Management':  ['notion', 'asana', 'jira', 'clickup', 'monday', 'linear', 'trello'],
  'CRM & Sales':         ['hubspot', 'salesforce', 'pipedrive', 'zoho', 'airtable', 'freshdesk', 'intercom', 'zendesk', 'activecampaign'],
  'Communication':       ['slack', 'discord', 'telegram', 'whatsapp', 'twilio', 'sendgrid', 'mailchimp', 'mailgun', 'calendly'],
  'Cloud & DevOps':      ['aws', 'github', 'gitlab', 'bitbucket', 'cloudflare', 'dropbox', 'awsClient', 'mongodb'],
  'Databases':           ['postgresql', 'mysql', 'firebase', 'redis'],
  'File Transfer':       ['ftp', 'sftp'],
  'AI & Data':           ['openai', 'anthropic', 'pinecone', 'qdrant', 'cohere', 'huggingface', 'mistral'],
  'Content & CMS':       ['contentful', 'wordpress'],
  'Payments & Business': ['stripe', 'paypal', 'quickbooks', 'xero', 'shopify', 'woocommerce', 'typeform'],
};

const CATEGORY_ORDER = [
  'Google Suite', 'Microsoft Suite', 'Social Media', 'Project Management', 'CRM & Sales',
  'Communication', 'Cloud & DevOps', 'Databases', 'File Transfer', 'AI & Data', 'Content & CMS',
  'Payments & Business', 'Other',
];

const EMPTY_WORKFLOW_ISSUES: WorkflowMissingConnection[] = [];

function categoryFor(provider: string): string {
  for (const [cat, providers] of Object.entries(PROVIDER_CATEGORIES)) {
    if (providers.includes(provider)) return cat;
  }
  return 'Other';
}

function groupByCategory<T extends { provider: string }>(items: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const cat = categoryFor(item.provider);
    (groups[cat] ??= []).push(item);
  }
  return groups;
}

function compactScope(scope: string): string {
  return scope
    .replace(/^https:\/\/www\.googleapis\.com\/auth\//, '')
    .replace(/^https:\/\/graph\.microsoft\.com\//, '')
    .replace(/^https:\/\/www\.linkedin\.com\/oauth\/v2\//, '');
}

function titleCaseProvider(provider: string): string {
  const labels: Record<string, string> = {
    awsClient: 'AWS',
    discord_webhook: 'Discord Webhook',
    google: 'Google',
    google_gmail: 'Gmail',
    google_sheets: 'Google Sheets',
    mongodb: 'MongoDB',
    openai: 'OpenAI',
    postgresql: 'PostgreSQL',
  };
  return labels[provider] ?? provider
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function authLabel(authType: ConnectionRecord['authType']): string {
  if (authType === 'oauth2') return 'OAuth';
  if (authType === 'api_key') return 'API key';
  if (authType === 'bearer_token') return 'Bearer token';
  if (authType === 'basic_auth') return 'Basic auth';
  if (authType === 'custom_header') return 'Custom header';
  if (authType === 'query_auth') return 'Query auth';
  return authType;
}

function relativeDate(value?: string | null): string {
  if (!value) return 'Never';
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function repairVerb(group: WorkflowConnectionGroup): string {
  if (group.action === 'select_connection') {
    return 'Select connection';
  }
  if (group.connectionId || group.statuses.includes('expired') || group.statuses.includes('missing_scope') || group.statuses.includes('runtime_missing')) {
    return `Reconnect ${group.displayName}`;
  }
  return `Connect ${group.displayName}`;
}

// ─── Inline service catalog ───────────────────────────────────────────────────
function ServiceCatalog({
  onSelect,
  connectedTypeIds,
}: {
  onSelect: (t: CredentialTypeDefinition) => void;
  connectedTypeIds: Set<string>;
}) {
  const { data: types = [], isLoading } = useCredentialTypes();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? types.filter(
        (t) =>
          t.displayName.toLowerCase().includes(search.toLowerCase()) ||
          t.provider.toLowerCase().includes(search.toLowerCase()),
      )
    : types;

  // Show first cred type per provider
  const seen = new Set<string>();
  const unique = filtered.filter((t) => {
    if (seen.has(t.provider)) return false;
    seen.add(t.provider);
    return true;
  });

  const grouped = groupByCategory(unique);
  const orderedCats = CATEGORY_ORDER.filter((cat) => grouped[cat]?.length);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && unique.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {search ? `No services match "${search}"` : 'No services available'}
        </p>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {orderedCats.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {cat}
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {grouped[cat].map((t) => {
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
                      className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all group ${
                        comingSoon
                          ? 'cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground opacity-75'
                          : alreadyConnected
                            ? 'border-primary/20 bg-primary/5 hover:border-primary/40 hover:bg-primary/10'
                          : 'border-border/60 hover:border-primary/50 hover:bg-muted/60'
                      }`}
                    >
                      {(comingSoon || alreadyConnected) && (
                        <span className="absolute right-1 top-1 rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                          {alreadyConnected ? 'Connected' : 'Coming soon'}
                        </span>
                      )}
                      <ProviderLogo provider={t.provider} size={36} />
                      <span
                        className={`w-full truncate text-center text-[11px] font-medium leading-tight ${
                          comingSoon ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-foreground'
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
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
interface ProviderSummary {
  provider: string;
  label: string;
  category: string;
  credentialTypes: CredentialTypeDefinition[];
  connections: ConnectionRecord[];
  activeCount: number;
}

function buildProviderSummaries(
  credentialTypes: CredentialTypeDefinition[],
  connections: ConnectionRecord[],
): ProviderSummary[] {
  const byProvider = new Map<string, ProviderSummary>();

  function ensure(provider: string): ProviderSummary {
    const existing = byProvider.get(provider);
    if (existing) return existing;
    const summary: ProviderSummary = {
      provider,
      label: titleCaseProvider(provider),
      category: categoryFor(provider),
      credentialTypes: [],
      connections: [],
      activeCount: 0,
    };
    byProvider.set(provider, summary);
    return summary;
  }

  for (const type of credentialTypes) {
    const summary = ensure(type.provider);
    summary.credentialTypes.push(type);
    summary.label = titleCaseProvider(type.provider);
  }

  for (const connection of connections) {
    ensure(connection.provider).connections.push(connection);
  }

  for (const summary of byProvider.values()) {
    summary.connections.sort((a, b) => a.name.localeCompare(b.name));
    summary.credentialTypes.sort((a, b) => a.displayName.localeCompare(b.displayName));
    summary.activeCount = summary.connections.filter((connection) => connection.status === 'active').length;
  }

  return Array.from(byProvider.values()).sort((a, b) => {
    if (b.connections.length !== a.connections.length) return b.connections.length - a.connections.length;
    return a.label.localeCompare(b.label);
  });
}

function ProviderWorkspace({
  connections,
  credentialTypes,
  isLoading,
  isFetching,
  connSearch,
  authFilter,
  onSearchChange,
  onAuthFilterChange,
  onRefresh,
  onAddConnection,
}: {
  connections: ConnectionRecord[];
  credentialTypes: CredentialTypeDefinition[];
  isLoading: boolean;
  isFetching: boolean;
  connSearch: string;
  authFilter: 'all' | 'oauth' | 'api_key';
  onSearchChange: (value: string) => void;
  onAuthFilterChange: (value: 'all' | 'oauth' | 'api_key') => void;
  onRefresh: () => void;
  onAddConnection: (type: CredentialTypeDefinition) => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  const providerSummaries = useMemo(
    () => buildProviderSummaries(credentialTypes, connections),
    [credentialTypes, connections],
  );

  const filteredProviders = useMemo(() => {
    const query = connSearch.trim().toLowerCase();
    return providerSummaries.filter((summary) => {
      if (
        authFilter === 'oauth' &&
        !summary.credentialTypes.some((type) => type.authType === 'oauth2') &&
        !summary.connections.some((connection) => connection.authType === 'oauth2')
      ) {
        return false;
      }
      if (
        authFilter === 'api_key' &&
        !summary.credentialTypes.some((type) => type.authType !== 'oauth2') &&
        !summary.connections.some((connection) => connection.authType !== 'oauth2')
      ) {
        return false;
      }
      if (!query) return true;
      return (
        summary.label.toLowerCase().includes(query) ||
        summary.provider.toLowerCase().includes(query) ||
        summary.credentialTypes.some((type) => type.displayName.toLowerCase().includes(query)) ||
        summary.connections.some((connection) => connection.name.toLowerCase().includes(query))
      );
    });
  }, [authFilter, connSearch, providerSummaries]);

  useEffect(() => {
    if (filteredProviders.length === 0) {
      setSelectedProvider(null);
      setSelectedConnectionId(null);
      return;
    }
    if (!selectedProvider || !filteredProviders.some((summary) => summary.provider === selectedProvider)) {
      setSelectedProvider(filteredProviders[0].provider);
    }
  }, [filteredProviders, selectedProvider]);

  const selectedSummary = filteredProviders.find((summary) => summary.provider === selectedProvider) ?? filteredProviders[0];
  const selectedConnection = selectedSummary?.connections.find((connection) => connection.id === selectedConnectionId)
    ?? selectedSummary?.connections[0]
    ?? null;
  const primaryCredentialType = selectedSummary?.credentialTypes[0];

  useEffect(() => {
    if (!selectedSummary) return;
    if (selectedConnectionId && selectedSummary.connections.some((connection) => connection.id === selectedConnectionId)) return;
    setSelectedConnectionId(selectedSummary.connections[0]?.id ?? null);
  }, [selectedConnectionId, selectedSummary]);

  const totalActive = connections.filter((connection) => connection.status === 'active').length;
  const connectedProviderCount = providerSummaries.filter((summary) => summary.connections.length > 0).length;

  return (
    <section className="mb-10">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Encrypted credentials reused across all your workflows.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={isFetching} title="Refresh">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <Cable className="h-4 w-4" />
            Saved
          </div>
          <p className="mt-2 text-2xl font-semibold">{connections.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <Database className="h-4 w-4" />
            Providers
          </div>
          <p className="mt-2 text-2xl font-semibold">{connectedProviderCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Active
          </div>
          <p className="mt-2 text-2xl font-semibold">{totalActive}</p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search providers or saved connections..."
            className="pl-9"
            value={connSearch}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'oauth', 'api_key'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onAuthFilterChange(filter)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                authFilter === filter
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground',
              )}
            >
              {filter === 'all' ? 'All' : filter === 'oauth' ? 'OAuth' : 'API key'}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      )}

      {!isLoading && filteredProviders.length === 0 && (
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
          No providers match your filters.
        </div>
      )}

      {!isLoading && filteredProviders.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Provider Home</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{filteredProviders.length} services</p>
            </div>
            <div className="max-h-[640px] overflow-y-auto p-2">
              {filteredProviders.map((summary) => {
                const selected = summary.provider === selectedSummary?.provider;
                const comingSoon = isComingSoonProvider(summary.provider);
                return (
                  <button
                    key={summary.provider}
                    type="button"
                    onClick={() => setSelectedProvider(summary.provider)}
                    className={cn(
                      'mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/70',
                    )}
                  >
                    <ProviderLogo provider={summary.provider} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{summary.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{summary.category}</span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs',
                        summary.connections.length > 0
                          ? 'border-primary/20 bg-primary/10 text-primary'
                          : comingSoon
                            ? 'border-border bg-muted text-muted-foreground'
                            : 'border-border text-muted-foreground',
                      )}
                    >
                      {comingSoon ? 'Soon' : summary.connections.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-lg border border-border bg-card">
              {selectedSummary && (
                <>
                  <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <ProviderLogo provider={selectedSummary.provider} size={40} />
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold">{selectedSummary.label}</h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedSummary.connections.length} saved {selectedSummary.connections.length === 1 ? 'connection' : 'connections'}
                        </p>
                      </div>
                    </div>
                    {primaryCredentialType ? (
                      <Button
                        size="sm"
                        onClick={() => onAddConnection(primaryCredentialType)}
                        disabled={isComingSoonProvider(selectedSummary.provider)}
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add another
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-2 p-4">
                    {selectedSummary.connections.length === 0 && (
                      <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 px-6 py-8 text-center">
                        <div className="flex justify-center">
                          <ProviderLogo provider={selectedSummary.provider} size={44} />
                        </div>
                        <p className="mt-3 text-sm font-medium">No saved {selectedSummary.label} connection</p>
                        {primaryCredentialType && !isComingSoonProvider(selectedSummary.provider) && (
                          <Button className="mt-4" size="sm" onClick={() => onAddConnection(primaryCredentialType)}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            Connect {selectedSummary.label}
                          </Button>
                        )}
                      </div>
                    )}

                    {selectedSummary.connections.map((connection) => (
                      <ConnectionManagementRow
                        key={connection.id}
                        connection={connection}
                        credentialType={credentialTypes.find((type) => type.id === connection.credentialTypeId)}
                        selected={selectedConnection?.id === connection.id}
                        onSelect={() => setSelectedConnectionId(connection.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>

            <ConnectionDetailPanel
              connection={selectedConnection}
              credentialType={credentialTypes.find((type) => type.id === selectedConnection?.credentialTypeId)}
              providerLabel={selectedSummary?.label}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function ConnectionManagementRow({
  connection,
  credentialType,
  selected,
  onSelect,
}: {
  connection: ConnectionRecord;
  credentialType?: CredentialTypeDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  const { toast } = useToast();
  const updateMut = useUpdateConnection();
  const testMut = useTestConnection();
  const deleteMut = useDeleteConnection();
  const oauthFlow = useOAuthFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(connection.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraftName(connection.name);
  }, [connection.name]);

  async function saveName() {
    const nextName = draftName.trim();
    if (!nextName || nextName === connection.name) {
      setDraftName(connection.name);
      setIsEditing(false);
      return;
    }
    try {
      await updateMut.mutateAsync({ id: connection.id, patch: { name: nextName } });
      toast({ title: 'Connection renamed' });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Rename failed',
        description: error instanceof Error ? error.message : 'Could not rename this connection.',
        variant: 'destructive',
      });
    }
  }

  async function testConnectionHealth() {
    try {
      const result = await testMut.mutateAsync(connection.id);
      toast({
        title: result.ok ? 'Connection OK' : 'Connection needs attention',
        description: result.message || undefined,
        variant: result.ok ? undefined : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Test failed',
        description: error instanceof Error ? error.message : 'Could not test this connection.',
        variant: 'destructive',
      });
    }
  }

  async function reconnect() {
    try {
      await oauthFlow.reconnect(connection.id);
      toast({ title: 'Reconnect started' });
    } catch (error) {
      toast({
        title: 'Reconnect failed',
        description: error instanceof Error ? error.message : 'Could not reconnect this account.',
        variant: 'destructive',
      });
    }
  }

  async function removeConnection() {
    try {
      await deleteMut.mutateAsync(connection.id);
      toast({ title: 'Connection deleted' });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Could not delete this connection.',
        variant: 'destructive',
      });
    } finally {
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onSelect();
        }}
        className={cn(
          'flex items-center gap-3 rounded-lg border p-3 transition-colors',
          selected ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/25 hover:bg-muted/40',
        )}
      >
        <ProviderLogo provider={connection.provider} size={36} />
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex max-w-md items-center gap-2" onClick={(event) => event.stopPropagation()}>
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void saveName();
                  if (event.key === 'Escape') {
                    setDraftName(connection.name);
                    setIsEditing(false);
                  }
                }}
                className="h-8"
                autoFocus
              />
              <Button size="sm" onClick={saveName} disabled={updateMut.isPending}>
                {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-medium">{connection.name}</p>
              <ConnectionStatusBadge status={connection.status} />
            </div>
          )}
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {credentialType?.displayName ?? connection.credentialTypeId} · {authLabel(connection.authType)} · used {relativeDate(connection.lastUsedAt)}
          </p>
        </div>
        {connection.status !== 'active' && <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Connection actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void testConnectionHealth(); }} disabled={testMut.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Test connection
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(event) => { event.stopPropagation(); setIsEditing(true); }}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            {connection.authType === 'oauth2' && (
              <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void reconnect(); }} disabled={oauthFlow.isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reconnect
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(event) => { event.stopPropagation(); setConfirmDelete(true); }}
              disabled={deleteMut.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete connection?</AlertDialogTitle>
            <AlertDialogDescription>
              {connection.name} will be permanently deleted. Workflows using it will need another saved connection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeConnection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ConnectionDetailPanel({
  connection,
  credentialType,
  providerLabel,
}: {
  connection: ConnectionRecord | null;
  credentialType?: CredentialTypeDefinition;
  providerLabel?: string;
}) {
  if (!connection) {
    return (
      <aside className="rounded-lg border border-border bg-card p-5">
        <div className="flex h-full min-h-48 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 text-center text-sm text-muted-foreground">
          Select a saved connection
        </div>
      </aside>
    );
  }

  const details = [
    ['Provider', providerLabel ?? titleCaseProvider(connection.provider)],
    ['Type', credentialType?.displayName ?? connection.credentialTypeId],
    ['Auth', authLabel(connection.authType)],
    ['Last used', relativeDate(connection.lastUsedAt)],
    ['Last tested', relativeDate(connection.lastTestedAt)],
    ['Created', relativeDate(connection.createdAt)],
  ];

  return (
    <aside className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <ProviderLogo provider={connection.provider} size={36} />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{connection.name}</h3>
            <div className="mt-1">
              <ConnectionStatusBadge status={connection.status} />
            </div>
          </div>
        </div>
      </div>
      <dl className="space-y-3 p-5">
        {details.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="max-w-[170px] truncate text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          Updated {relativeDate(connection.updatedAt)}
        </div>
      </div>
    </aside>
  );
}

export default function Connections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: connections = [], isLoading, refetch, isFetching } = useConnections();
  const { data: credentialTypes = [], isLoading: credentialTypesLoading } = useCredentialTypes();
  const oauthFlow = useOAuthFlow();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connSearch, setConnSearch] = useState('');
  const [authFilter, setAuthFilter] = useState<'all' | 'oauth' | 'api_key'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPreset, setModalPreset] = useState<string | undefined>();
  const [repairError, setRepairError] = useState<string | null>(null);

  const returnTo = searchParams.get('returnTo');
  const workflowName = searchParams.get('workflowName');
  const requestedService = searchParams.get('service') || searchParams.get('credentialType');
  const returnToWorkflowId = returnTo?.match(/^\/workflow\/([^/?#]+)/)?.[1];
  const workflowReadinessQuery = useQuery({
    queryKey: QUERY_KEYS.workflowConnectionStatus(returnToWorkflowId ?? 'connections-none'),
    queryFn: () => fetchWorkflowSetupStatus(returnToWorkflowId!),
    enabled: !!returnToWorkflowId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const workflowIssues = workflowReadinessQuery.data?.missingConnections ?? EMPTY_WORKFLOW_ISSUES;
  const repairGroups = useMemo(() => groupWorkflowConnectionIssues(workflowIssues), [workflowIssues]);

  // Invalidate the workflow connection gate when leaving this page so that
  // returning to /workflow/:id always refetches readiness — the workflow page
  // may have been unmounted while the user was here, so its own
  // "came back from /connections" recheck cannot be relied on.
  useEffect(() => {
    return () => {
      if (returnToWorkflowId) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.workflowConnectionStatus(returnToWorkflowId) });
      } else {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.workflowConnectionStatusRoot });
      }
    };
  }, [returnToWorkflowId, qc]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = awsClient
      .channel(`connections-page-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          invalidateAfterConnectionChange(qc);
        },
      )
      .subscribe();

    return () => {
      awsClient.removeChannel(channel);
    };
  }, [qc, user?.id]);

  function openModalForType(t: CredentialTypeDefinition) {
    setModalPreset(t.id);
    setModalOpen(true);
  }

  function handleModalClose(v: boolean) {
    setModalOpen(v);
    if (!v) {
      setModalPreset(undefined);
      refetch();
    }
  }

  function handleSaved() {
    if (returnTo) {
      navigate(returnTo);
    }
  }

  async function handleRepairGroup(group: WorkflowConnectionGroup) {
    setRepairError(null);
    if (group.action === 'select_connection') {
      setConnSearch(group.displayName || group.provider);
      setRepairError('Multiple saved accounts can satisfy this requirement. Select the intended saved connection on the affected workflow nodes instead of creating a duplicate connection.');
      return;
    }
    // When the readiness check didn't pin down which credential type a node needs (e.g. a
    // stale/unresolvable connection ref), providers with more than one registered credential
    // type (Mailchimp has both mailchimp_api_key and mailchimp_oauth2) previously always fell
    // back to "the first OAuth option for this provider" — even when that OAuth app was never
    // configured (no CLIENT_ID/CLIENT_SECRET) and a working API-key type existed for the same
    // provider. Prefer the non-OAuth option when ambiguous: it only needs the user's own
    // credentials, not a CtrlChecks-side app registration, so it's far more likely to work.
    const candidatesForProvider = credentialTypes.filter((type) => type.provider === group.provider);
    const credentialType = group.credentialTypeId
      ? credentialTypes.find((type) => type.id === group.credentialTypeId)
      : candidatesForProvider.find((type) => type.authType !== 'oauth2') || candidatesForProvider[0];
    if (!credentialType) {
      setConnSearch(group.displayName || group.provider);
      setRepairError(`No connection type was found for ${group.displayName}.`);
      return;
    }

    // Non-OAuth providers (basic auth, API key, etc.) have no authorize/callback flow —
    // route them to the same manual credential-entry modal the "+ Add Connection" button uses.
    if (credentialType.authType !== 'oauth2') {
      openModalForType(credentialType);
      return;
    }

    const existingConnectionId = group.connectionId || connections.find((connection) => (
      connection.provider === group.provider &&
      connection.authType === 'oauth2' &&
      connection.credentialTypeId === credentialType.id
    ))?.id;
    const returnHere = `${window.location.origin}${window.location.pathname}${window.location.search}`;

    try {
      if (existingConnectionId) {
        await oauthFlow.reconnect(existingConnectionId, {
          scopes: group.requiredScopes,
          returnTo: returnHere,
        });
      } else {
        await oauthFlow.connect(credentialType.id, {
          scopes: group.requiredScopes,
          returnTo: returnHere,
        });
      }

      invalidateAfterConnectionChange(qc);
      await refetch();
      const latest = await workflowReadinessQuery.refetch();
      if (returnTo && (latest.data ?? []).length === 0) {
        navigate(returnTo);
      }
    } catch (error) {
      setRepairError(error instanceof Error ? error.message : 'Connection repair did not complete.');
    }
  }

  useEffect(() => {
    const service = requestedService?.trim().toLowerCase();
    if (!service || credentialTypesLoading) return;

    const matchingType = credentialTypes.find((t) => {
      const candidates = [t.id, t.provider, t.displayName].map((value) => value.toLowerCase());
      return candidates.some((value) => value === service || value.includes(service));
    });

    if (matchingType && !isComingSoonProvider(matchingType.provider)) {
      openModalForType(matchingType);
    } else {
      setConnSearch(service);
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('service');
    nextParams.delete('credentialType');
    setSearchParams(nextParams, { replace: true });
  }, [credentialTypes, credentialTypesLoading, requestedService, searchParams, setSearchParams]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppChromeHeader />

      {returnTo && (
        <div className="border-b border-border bg-muted/40">
          <div className="container mx-auto px-4 max-w-7xl">
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              className="flex items-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>
                Back to workflow
                {workflowName && (
                  <span className="ml-1 font-medium text-foreground">— {workflowName}</span>
                )}
              </span>
            </button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <WorkflowAuthGate>
          {returnToWorkflowId && (
            <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-amber-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Workflow connection repair</h2>
                  <p className="mt-1 text-sm text-amber-900/80">
                    {workflowReadinessQuery.isFetching && workflowIssues.length === 0
                      ? 'Checking the workflow connection requirements...'
                      : repairGroups.length > 0
                        ? 'Review the account requirements below. One compatible saved connection can cover all listed nodes for each provider when it includes the required permissions.'
                        : 'This workflow has no remaining connection blockers.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => workflowReadinessQuery.refetch()}
                  disabled={workflowReadinessQuery.isFetching}
                  className="border-amber-300 bg-white/70 text-amber-950 hover:bg-white"
                >
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${workflowReadinessQuery.isFetching ? 'animate-spin' : ''}`} />
                  Recheck
                </Button>
              </div>

              {repairError && (
                <div className="mt-3 rounded-md border border-amber-300 bg-white/70 px-3 py-2 text-sm text-amber-950">
                  {repairError}
                </div>
              )}

              {repairGroups.length > 0 && (
                <div className="mt-4 space-y-3">
                  {repairGroups.map((group) => (
                    <div
                      key={group.key}
                      className="rounded-md border border-amber-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ProviderLogo provider={group.provider} size={28} />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{group.displayName}</p>
                              {group.connectionName && (
                                <p className="text-xs text-muted-foreground">{group.connectionName}</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            {group.issues.map((issue) => (
                              <p key={`${issue.nodeId}-${issue.operation}-${issue.status}`} className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{issue.nodeLabel || issue.nodeId}</span>
                                {issue.operationLabel ? ` - ${issue.operationLabel}` : ''}
                                {issue.reason ? `: ${issue.reason}` : ''}
                              </p>
                            ))}
                          </div>
                          {group.requiredScopes.length > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Permissions: {group.requiredScopes.map(compactScope).join(', ')}
                            </p>
                          )}
                          {group.candidateConnectionIds.length > 1 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Multiple saved accounts match. Select the intended connection for the listed nodes.
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRepairGroup(group)}
                          disabled={oauthFlow.isLoading || credentialTypesLoading}
                          className="shrink-0"
                        >
                          {oauthFlow.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                          {repairVerb(group)}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Saved connections section ── */}
          <ProviderWorkspace
            connections={connections}
            credentialTypes={credentialTypes}
            isLoading={isLoading || credentialTypesLoading}
            isFetching={isFetching}
            connSearch={connSearch}
            authFilter={authFilter}
            onSearchChange={setConnSearch}
            onAuthFilterChange={setAuthFilter}
            onRefresh={() => refetch()}
            onAddConnection={openModalForType}
          />
        </WorkflowAuthGate>
      </main>

      {/* Modal: new connection (from catalog click — preset type) */}
      <NewConnectionModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        preselectedCredentialTypeId={modalPreset}
        onSaved={handleSaved}
      />

    </div>
  );
}
