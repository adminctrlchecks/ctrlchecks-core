import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WifiOff } from 'lucide-react';
import { NodeConnectPanelBody } from './NodeConnectPanelBody';

/**
 * Inline connect affordance for a node that is missing its credential, presented as a popover.
 *
 * The connect UI itself lives in `NodeConnectPanelBody` — this component is only the popover
 * presentation around it.
 *
 * Mounted from `NodeOwnershipCard` (field ownership) and `AutonomousAgentWizard`. Its public
 * props are deliberately unchanged from before the body was extracted, so both keep working
 * untouched.
 *
 * The node-selection screen deliberately does NOT use this: there, OAuth starts on the chip
 * click itself via `useNodeConnect`, and only API-key providers open anything
 * (`NodeConnectFormDialog`). A panel whose entire content is one OAuth button is a step with
 * nothing in it.
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

  function handleConnected() {
    setOpen(false);
    onConnected?.();
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
        <NodeConnectPanelBody
          provider={provider}
          serviceLabel={serviceLabel}
          credentialTypeId={credentialTypeId}
          onConnected={handleConnected}
        />
      </PopoverContent>
    </Popover>
  );
}
