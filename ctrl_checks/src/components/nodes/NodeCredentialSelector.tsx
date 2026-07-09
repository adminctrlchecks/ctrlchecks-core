import { useState } from 'react';
import { Plus, ExternalLink, ChevronDown, HelpCircle } from 'lucide-react';
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
}

function SelectedItem({ connection, logoProvider }: { connection: ConnectionRecord; logoProvider?: string }) {
  return (
    <div className="flex flex-1 items-center gap-2 min-w-0">
      <ProviderLogo provider={logoProvider || connection.provider} size={20} className="shrink-0" />
      <span className="flex-1 truncate text-sm font-medium min-w-0">{connection.name}</span>
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
}: Props) {
  const { data: allConnections = [] } = useConnections();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTypeId, setModalTypeId] = useState<string | undefined>();

  const acceptedTypeIds = new Set(credentialTypeIds);
  const acceptedProviders = new Set(providers);
  const compatible = allConnections.filter((c) => {
    if (acceptedTypeIds.size > 0) return acceptedTypeIds.has(c.credentialTypeId);
    return acceptedProviders.has(c.provider) || acceptedProviders.has(c.credentialTypeId);
  });
  const selected = compatible.find((c) => c.id === value);
  const preferredTypeId = credentialTypeIds[0] || compatible[0]?.credentialTypeId;
  const displayProvider = logoProvider || providers[0];

  function openAddModal(typeId?: string) {
    setModalTypeId(typeId);
    setModalOpen(true);
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>

      {compatible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">No connections yet</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openAddModal(preferredTypeId)}
              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-primary"
            >
              <HelpCircle className="mr-1 h-3 w-3" />
              Guide
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAddModal(preferredTypeId)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
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
                <span className="text-muted-foreground">Select a connection…</span>
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
                </div>
                <ConnectionStatusBadge status={conn.status} />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => openAddModal(preferredTypeId)}
              className="flex items-center gap-2 cursor-pointer text-primary"
            >
              <Plus className="h-4 w-4" />
              Add new connection
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
            onClick={() => openAddModal(preferredTypeId)}
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
        preselectedCredentialTypeId={modalTypeId}
      />
    </div>
  );
}
