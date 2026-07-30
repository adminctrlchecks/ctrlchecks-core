/**
 * Connection chip for a candidate node on the node-selection screen.
 *
 * Replaces the previous Wi-Fi "Connected" badge, which rendered a single green pill for two
 * different things: a service the user had genuinely connected, and a node that needs no
 * credential at all. Manual Trigger and a connected Slack looked identical, so the screen
 * claimed account links that did not exist.
 *
 * The four states are mutually exclusive and cover every node:
 *
 *   not-required     nothing to connect            inert, muted
 *   connected        verified against the vault    inert, green
 *   needs-connection a credential is missing       actionable, amber
 *   checking         readiness in flight           inert, skeleton
 *
 * All four render at the same height and identical horizontal padding so a row never
 * reflows when the authoritative readiness answer lands and swaps one state for another.
 */

import { Check, Loader2, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import { iconForNodeType } from './node-icon';

export type NodeConnectionStatus =
  | 'not-required'
  | 'connected'
  | 'needs-connection'
  | 'connecting'
  | 'checking';

export interface NodeConnectionChipProps {
  status: NodeConnectionStatus;
  /** Node type, used for the icon when no provider logo applies. */
  nodeType: string;
  /** Service name shown on the actionable state, e.g. "Google Sheets". */
  serviceLabel: string;
  /** Provider key, when one resolved — drives the branded logo. */
  provider?: string;
  /** Required for `needs-connection`; ignored otherwise. */
  onConnect?: () => void;
  className?: string;
}

/** Shared geometry — identical across states so the row never reflows on status change. */
const CHIP_BASE =
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ' +
  'leading-none whitespace-nowrap transition-colors';

const ICON_SIZE = 16;

/**
 * Branded provider logo when a provider resolved, otherwise the node's own icon.
 * `ProviderLogo` already degrades to coloured initials for unknown providers, so this
 * cannot render blank.
 */
function ChipIcon({
  provider,
  nodeType,
  className,
}: {
  provider?: string;
  nodeType: string;
  className?: string;
}) {
  if (provider) {
    return <ProviderLogo provider={provider} size={ICON_SIZE} className="shrink-0 border-0" />;
  }
  const NodeIcon = iconForNodeType(nodeType);
  return <NodeIcon className={cn('h-4 w-4 shrink-0', className)} />;
}

export function NodeConnectionChip({
  status,
  nodeType,
  serviceLabel,
  provider,
  onConnect,
  className,
}: NodeConnectionChipProps) {
  if (status === 'checking') {
    return (
      <span
        className={cn(
          CHIP_BASE,
          'border-border/60 bg-muted/40 text-muted-foreground',
          className,
        )}
        data-testid="node-connection-chip"
        data-status="checking"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        Checking…
      </span>
    );
  }

  if (status === 'connecting') {
    return (
      <span
        className={cn(
          CHIP_BASE,
          'border-amber-300 bg-amber-50 text-amber-900',
          'dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
          className,
        )}
        data-testid="node-connection-chip"
        data-status="connecting"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        Connecting…
      </span>
    );
  }

  if (status === 'not-required') {
    return (
      <span
        className={cn(
          CHIP_BASE,
          'border-border/60 bg-muted/40 text-muted-foreground',
          className,
        )}
        data-testid="node-connection-chip"
        data-status="not-required"
      >
        <ChipIcon nodeType={nodeType} className="text-muted-foreground" />
        No setup needed
      </span>
    );
  }

  if (status === 'connected') {
    return (
      <span
        className={cn(
          CHIP_BASE,
          'border-green-200 bg-green-50 text-green-800',
          'dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300',
          className,
        )}
        data-testid="node-connection-chip"
        data-status="connected"
      >
        <ChipIcon provider={provider} nodeType={nodeType} />
        Connected
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </span>
    );
  }

  // needs-connection — the only interactive state.
  return (
    <button
      type="button"
      // Stop the click reaching the candidate row, which would toggle selection.
      onClick={(event) => {
        event.stopPropagation();
        onConnect?.();
      }}
      className={cn(
        CHIP_BASE,
        'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
        'dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        className,
      )}
      data-testid="node-connection-chip"
      data-status="needs-connection"
      aria-label={`Connect ${serviceLabel}`}
    >
      <ChipIcon provider={provider} nodeType={nodeType} />
      Connect {serviceLabel}
      <Plug className="h-3.5 w-3.5 shrink-0" aria-hidden />
    </button>
  );
}
