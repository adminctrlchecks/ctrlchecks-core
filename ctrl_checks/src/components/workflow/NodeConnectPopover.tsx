import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Loader2, WifiOff } from 'lucide-react';
import { OAuthConnectButton } from '@/components/connections/OAuthConnectButton';
import { CredentialFormRenderer } from '@/components/connections/CredentialFormRenderer';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { createConnection } from '@/lib/api/connections';
import { invalidateAfterConnectionChange } from '@/lib/queryInvalidation';

/**
 * Inline connect affordance for a node that is missing its credential.
 *
 * Composes `components/connections/*` **without modifying them** (plan §2.5): those
 * components also serve the /connections page, the canvas connection gate, and the
 * per-node selector in the properties panel, and this project must not disturb any
 * of those paths.
 *
 * OAuth here is popup-based (`useOAuthFlow` → `window.open` + BroadcastChannel), so the
 * host page never navigates away. That is why no selection-state snapshot or redirect
 * return handler is needed: whatever screen mounts this component stays mounted, with
 * its state intact, for the whole OAuth round trip.
 *
 * Mounted in two places, one component (§2.4): the candidate row on node selection, and
 * a field-ownership card for pipeline-injected nodes.
 */

export interface NodeConnectPopoverProps {
  /** Provider key, e.g. "google" or "slack". */
  provider: string;
  /** Human-readable service name for the button copy, e.g. "Google Sheets". */
  serviceLabel: string;
  /** Preferred credential type id when the caller knows it (from readiness). */
  credentialTypeId?: string;
  onConnected?: () => void;
  /** Renders the trigger inline rather than as a badge-styled button. */
  className?: string;
}

export function NodeConnectPopover({
  provider,
  serviceLabel,
  credentialTypeId,
  onConnected,
  className,
}: NodeConnectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { data: credentialTypes = [], isLoading } = useCredentialTypes();
  const queryClient = useQueryClient();

  const credentialType =
    (credentialTypeId && credentialTypes.find((t) => t.id === credentialTypeId)) ||
    credentialTypes.find((t) => t.provider === provider) ||
    credentialTypes.find((t) => t.provider?.toLowerCase() === provider?.toLowerCase());

  function handleConnected() {
    invalidateAfterConnectionChange(queryClient);
    setOpen(false);
    onConnected?.();
  }

  async function handleApiKeySubmit(values: Record<string, string>) {
    if (!credentialType) return;
    setSubmitting(true);
    setApiError(null);
    try {
      await createConnection({
        name: `${credentialType.displayName} — ${serviceLabel}`,
        credentialTypeId: credentialType.id,
        provider: credentialType.provider,
        authType: credentialType.authType,
        credentials: values,
      });
      handleConnected();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not save this connection.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          // Stop the click reaching the candidate row, which would toggle selection.
          onClick={(event) => event.stopPropagation()}
          className={
            className ??
            'inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors'
          }
        >
          <WifiOff className="h-3 w-3" aria-hidden />
          {serviceLabel} — connect
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] max-h-[70vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ProviderLogo provider={provider} size={24} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{serviceLabel}</p>
              <p className="text-xs text-muted-foreground">
                Connect once — it stays available for every workflow.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading connection options…
            </div>
          ) : !credentialType ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                This service can&apos;t be connected from here yet.
              </p>
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href="/connections" target="_blank" rel="noreferrer">
                  Open Connections
                </a>
              </Button>
            </div>
          ) : credentialType.authType === 'oauth2' ? (
            <OAuthConnectButton credentialType={credentialType} onSuccess={handleConnected} />
          ) : (
            <CredentialFormRenderer
              credentialType={credentialType}
              onSubmit={handleApiKeySubmit}
              isSubmitting={submitting}
              apiError={apiError}
              submitLabel={`Connect ${credentialType.displayName}`}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
