/**
 * Compact credential form for API-key providers on the node-selection screen.
 *
 * OAuth providers never reach this — `useNodeConnect` starts their popup directly from the
 * chip click, with no intermediate panel. Only providers that genuinely need typed input
 * (API keys, hosts, account ids) open anything at all, and then only a small dialog rather
 * than a full-height Sheet.
 *
 * Composes `components/connections/CredentialFormRenderer` without modifying it — that
 * component also serves the /connections page and the properties panel.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CredentialFormRenderer } from '@/components/connections/CredentialFormRenderer';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import { createConnection, type CredentialTypeDefinition } from '@/lib/api/connections';
import { invalidateAfterConnectionChange } from '@/lib/queryInvalidation';

export interface NodeConnectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null while closed, or when the provider has no mapped credential type. */
  credentialType: CredentialTypeDefinition | null;
  serviceLabel: string;
  /** Provider key, used for the logo and the Connections fallback link. */
  provider: string;
  onConnected: () => void;
}

export function NodeConnectFormDialog({
  open,
  onOpenChange,
  credentialType,
  serviceLabel,
  provider,
  onConnected,
}: NodeConnectFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function handleSubmit(values: Record<string, string>) {
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
      invalidateAfterConnectionChange(queryClient);
      onOpenChange(false);
      onConnected();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not save this connection.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]" data-testid="node-connect-form">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ProviderLogo provider={provider} size={24} />
            <div className="min-w-0 text-left">
              <DialogTitle className="text-sm">Connect {serviceLabel}</DialogTitle>
              <DialogDescription className="text-xs">
                Connect once — it stays available for every workflow.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {credentialType ? (
          <CredentialFormRenderer
            credentialType={credentialType}
            onSubmit={handleSubmit}
            isSubmitting={submitting}
            apiError={apiError}
            submitLabel={`Connect ${credentialType.displayName}`}
          />
        ) : (
          // No credential type maps to this provider. Never a dead end: hand off to the
          // Connections page, which can browse every service and returns here afterwards.
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              This service can&apos;t be connected from here yet. Open Connections to set it
              up — you&apos;ll come back to this step when you&apos;re done.
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
        )}
      </DialogContent>
    </Dialog>
  );
}
