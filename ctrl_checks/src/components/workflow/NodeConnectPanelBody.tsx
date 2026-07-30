/**
 * The actual connect UI for a node's missing credential — provider header, then either the
 * OAuth button or the API-key form.
 *
 * Extracted from `NodeConnectPopover` so the same body can be presented two ways without
 * duplicating the logic: inside the existing popover (three mount points depend on it) and
 * inside the node-selection Sheet. The popover keeps its exact public props, so nothing that
 * mounts it had to change.
 *
 * Composes `components/connections/*` **without modifying them**: those components also serve
 * the /connections page, the canvas connection gate, and the per-node selector in the
 * properties panel.
 *
 * OAuth here is popup-based (`useOAuthFlow` → `window.open` + BroadcastChannel), so the host
 * page never navigates away — whatever screen mounts this stays mounted, with its state
 * intact, for the whole OAuth round trip. That is what makes connecting from inside the
 * wizard safe: the wizard holds LLM-generated state that is not persisted anywhere.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { OAuthConnectButton } from '@/components/connections/OAuthConnectButton';
import { CredentialFormRenderer } from '@/components/connections/CredentialFormRenderer';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { createConnection } from '@/lib/api/connections';
import { invalidateAfterConnectionChange } from '@/lib/queryInvalidation';

export interface NodeConnectPanelBodyProps {
  /** Provider key, e.g. "google" or "slack". */
  provider: string;
  /** Human-readable service name, e.g. "Google Sheets". */
  serviceLabel: string;
  /** Preferred credential type id when the caller knows it (from readiness). */
  credentialTypeId?: string;
  /** Called after a connection is saved, once caches have been invalidated. */
  onConnected?: () => void;
}

export function NodeConnectPanelBody({
  provider,
  serviceLabel,
  credentialTypeId,
  onConnected,
}: NodeConnectPanelBodyProps) {
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
        // No credential type maps to this provider. Rather than a dead end, hand off to the
        // full Connections page, which can browse every service and returns here afterwards.
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            This service can&apos;t be connected from here yet. Open Connections to set it up —
            you&apos;ll come back to this step when you&apos;re done.
          </p>
          <Button variant="outline" size="sm" asChild className="w-full">
            <a
              href={`/connections?service=${encodeURIComponent(provider)}&returnTo=${encodeURIComponent(
                `${window.location.pathname}${window.location.search}`,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
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
  );
}
