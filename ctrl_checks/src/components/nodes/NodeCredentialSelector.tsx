import { useEffect, useRef, useState } from 'react';
import { Plus, ExternalLink, ChevronDown, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { ConnectionStatusBadge } from '@/components/connections/ConnectionStatusBadge';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import { NewConnectionModal } from '@/components/connections/NewConnectionModal';
import { useConnections } from '@/hooks/useConnections';
import type { ConnectionRecord } from '@/lib/api/connections';

interface Props {
  /** Credential type IDs this node accepts (e.g. ['google_oauth2']) */
  credentialTypeIds?: string[];
  /** Providers this node accepts when the backend contract exposes provider-level requirements */
  providers?: string[];
  /** Provider logo to show when a generic credential type is used for a specific integration */
  logoProvider?: string;
  /** Currently selected connection ID */
  value?: string;
  onChange: (connectionId: string) => void;
  label?: string;
  /** Automatically bind the only compatible saved connection so node execution is deterministic. */
  autoSelectSingle?: boolean;
}

function SelectedItem({ connection, logoProvider }: { connection: ConnectionRecord; logoProvider?: string }) {
  return (
    <div className="flex flex-1 items-center gap-2 min-w-0">
      <ProviderLogo provider={logoProvider || connection.provider} size={20} className="shrink-0" />
      <span className="flex-1 truncate text-sm font-medium min-w-0">{connection.name}</span>
      {connection.externalAccountEmail && (
        <span className="hidden max-w-[120px] truncate text-xs text-muted-foreground sm:inline">
          {connection.externalAccountEmail}
        </span>
      )}
      <ConnectionStatusBadge status={connection.status} className="shrink-0" />
    </div>
  );
}

export function NodeCredentialSelector({
  credentialTypeIds = [],
  providers = [],
  logoProvider,
  value,
  onChange,
  label = 'Connection',
  autoSelectSingle = true,
}: Props) {
  const { data: allConnections = [] } = useConnections();
  const [modalOpen, setModalOpen] = useState(false);

  const acceptedTypeIds = new Set(credentialTypeIds);
  // Match connections at the PROVIDER level, not a single credential type. A provider can have
  // more than one auth method (HubSpot: OAuth2 or Private App token), and execution resolves a
  // credential by provider — so any active connection for this node's provider is usable here.
  // credentialTypeIds becomes a preference (sorted first), never a hard filter that hides the
  // other method's connections.
  const acceptedProviders = new Set([...providers, ...(logoProvider ? [logoProvider] : [])]);
  const compatible = allConnections
    .filter((c) => (
      acceptedProviders.has(c.provider) ||
      acceptedProviders.has(c.credentialTypeId) ||
      acceptedTypeIds.has(c.credentialTypeId)
    ))
    .sort((a, b) => {
      const aPref = acceptedTypeIds.has(a.credentialTypeId) ? 0 : 1;
      const bPref = acceptedTypeIds.has(b.credentialTypeId) ? 0 : 1;
      return aPref - bPref;
    });
  const selected = compatible.find((c) => c.id === value) || (!value && compatible.length === 1 ? compatible[0] : undefined);
  const displayProvider = logoProvider || providers[0];

  const onlyCompatibleId = compatible.length === 1 ? compatible[0].id : undefined;
  const lastAutoSelectedId = useRef<string | undefined>();

  useEffect(() => {
    if (!autoSelectSingle || value || !onlyCompatibleId || lastAutoSelectedId.current === onlyCompatibleId) return;
    lastAutoSelectedId.current = onlyCompatibleId;
    onChange(onlyCompatibleId);
  }, [autoSelectSingle, onChange, onlyCompatibleId, value]);

  // Open the connect modal at the PROVIDER level so a multi-method provider (e.g. HubSpot)
  // shows the auth-method chooser; single-method providers jump straight to their form.
  function openAddModal() {
    setModalOpen(true);
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>

      {compatible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">No saved connections for this node yet</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openAddModal()}
              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-primary"
            >
              <HelpCircle className="mr-1 h-3 w-3" />
              Guide
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAddModal()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add connection
            </Button>
          </div>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent/50 transition-colors"
            >
              {selected ? (
                <SelectedItem connection={selected} logoProvider={displayProvider} />
              ) : (
                <span className="text-muted-foreground">Use existing connection…</span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {compatible.map((conn) => (
              <DropdownMenuItem
                key={conn.id}
                onSelect={() => onChange(conn.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <ProviderLogo provider={displayProvider || conn.provider} size={20} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conn.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {conn.externalAccountEmail || conn.credentialTypeId}
                  </p>
                </div>
                <ConnectionStatusBadge status={conn.status} />
                {conn.id === selected?.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => openAddModal()}
              className="flex items-center gap-2 cursor-pointer text-primary"
            >
              <Plus className="h-4 w-4" />
              Add another connection
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => window.open('/connections', '_blank')}
              className="flex items-center gap-2 cursor-pointer text-muted-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              Manage connections
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {compatible.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openAddModal()}
            className="h-auto px-1 py-0 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            <HelpCircle className="mr-1 h-3 w-3" />
            How to get this connection?
          </Button>
        </div>
      )}

      <NewConnectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        preselectedProvider={displayProvider}
      />
    </div>
  );
}
