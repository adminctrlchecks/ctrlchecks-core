import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { awsClient } from '@/integrations/aws/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AppChromeHeader } from '@/components/layout/AppChromeHeader';
import { WorkflowAuthGate } from '@/components/WorkflowAuthGate';
import { ConnectionCard } from '@/components/connections/ConnectionCard';
import { NewConnectionModal } from '@/components/connections/NewConnectionModal';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import { isComingSoonProvider } from '@/components/connections/connectionAvailability';
import { useConnections } from '@/hooks/useConnections';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { invalidateAfterConnectionChange } from '@/lib/queryInvalidation';
import { QUERY_KEYS } from '@/lib/queryKeys';
import type { ConnectionRecord, CredentialTypeDefinition } from '@/lib/api/connections';

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
                      disabled={comingSoon || alreadyConnected}
                      title={
                        comingSoon
                          ? `${providerName} is coming soon`
                          : alreadyConnected
                            ? `${providerName} is already connected`
                            : `Connect ${providerName}`
                      }
                      onClick={() => {
                        if (!comingSoon && !alreadyConnected) onSelect(t);
                      }}
                      className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all group ${
                        comingSoon || alreadyConnected
                          ? 'cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground opacity-75'
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
export default function Connections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: connections = [], isLoading, refetch, isFetching } = useConnections();
  const { data: credentialTypes = [], isLoading: credentialTypesLoading } = useCredentialTypes();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connSearch, setConnSearch] = useState('');
  const [authFilter, setAuthFilter] = useState<'all' | 'oauth' | 'api_key'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPreset, setModalPreset] = useState<string | undefined>();
  const [editingConnection, setEditingConnection] = useState<ConnectionRecord | null>(null);

  const returnTo = searchParams.get('returnTo');
  const workflowName = searchParams.get('workflowName');
  const requestedService = searchParams.get('service') || searchParams.get('credentialType');
  const returnToWorkflowId = returnTo?.match(/^\/workflow\/([^/?#]+)/)?.[1];

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

  const visibleConnections = connections;
  const connectedTypeIds = new Set(visibleConnections.map((connection) => connection.credentialTypeId));

  const filteredConns = visibleConnections.filter((c) => {
    if (connSearch.trim()) {
      const q = connSearch.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.provider.toLowerCase().includes(q)) return false;
    }
    if (authFilter === 'oauth') return c.authType === 'oauth2';
    if (authFilter === 'api_key') return c.authType !== 'oauth2';
    return true;
  });

  const grouped = groupByCategory(filteredConns);
  const orderedCategories = CATEGORY_ORDER.filter((cat) => grouped[cat]?.length);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppChromeHeader />

      {returnTo && (
        <div className="border-b border-border bg-muted/40">
          <div className="container mx-auto px-4 max-w-5xl">
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

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <WorkflowAuthGate>

          {/* ── Saved connections section ── */}
          <section className="mb-10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Encrypted credentials reused across all your workflows.
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {visibleConnections.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative max-w-sm flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search saved connections…"
                    className="pl-9"
                    value={connSearch}
                    onChange={(e) => setConnSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {(['all', 'oauth', 'api_key'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAuthFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        authFilter === f
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'oauth' ? 'OAuth' : 'API Key'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            )}

            {!isLoading && visibleConnections.length === 0 && (
              <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 px-6 py-5 text-sm text-muted-foreground">
                No saved connections yet — connect a service below to get started.
              </div>
            )}

            {!isLoading && visibleConnections.length > 0 && (
              <div className="space-y-8">
                {orderedCategories.map((cat) => (
                  <section key={cat} className="space-y-2">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {cat} <span className="font-normal">({grouped[cat].length})</span>
                    </h2>
                    <div className="space-y-2">
                      {grouped[cat].map((conn) => (
                        <ConnectionCard key={conn.id} connection={conn} onEdit={setEditingConnection} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>

          {/* ── Service catalog ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Add a Connection</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Choose a service to connect. Supports {/* count shown below */}40+ providers.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setModalPreset(undefined); setModalOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Custom
              </Button>
            </div>

            <ServiceCatalog onSelect={openModalForType} connectedTypeIds={connectedTypeIds} />
          </section>

        </WorkflowAuthGate>
      </main>

      {/* Modal: new connection (from catalog click — preset type) */}
      <NewConnectionModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        preselectedCredentialTypeId={modalPreset}
        onSaved={handleSaved}
      />

      {/* Modal: edit existing connection */}
      {editingConnection && (
        <NewConnectionModal
          open
          onOpenChange={(v) => {
            if (!v) {
              setEditingConnection(null);
              refetch();
            }
          }}
          preselectedCredentialTypeId={editingConnection.credentialTypeId}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
