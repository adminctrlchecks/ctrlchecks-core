import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, Play } from 'lucide-react';
import { badgeForNode, type RunNodeResult } from '@/lib/api/workflowBuildRunNode';

/**
 * Per-node Test action and its result (plan §2.1, §2.2).
 *
 * ⚠️ For a `write` or `destructive` node this really sends the email or posts the
 * message. The server refuses the first attempt and returns copy naming the effect;
 * only after the user agrees does a second call carry `consented: true`.
 *
 * Failures render as guidance — what happened → why → what to do next — with raw
 * provider text behind a collapsed disclosure. No red alerts, no toasts, no stack traces.
 */

export interface NodeTestActionProps {
  nodeType: string;
  running: boolean;
  result?: RunNodeResult;
  onRun: (consented: boolean) => void;
}

export function NodeTestAction({ nodeType, running, result, onRun }: NodeTestActionProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const awaitingConsent = result?.status === 'awaiting_consent';
  const badge = result ? badgeForNode(nodeType, result.status) : '';

  return (
    <div className="space-y-2">
        <div className="flex items-center justify-end gap-2">
            {result?.status === 'passed' && badge && (
                <span
                    className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300"
                    data-testid="run-badge"
                >
                    <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
                    {badge}
                    {result.executionMs !== undefined ? ` · ${(result.executionMs / 1000).toFixed(1)}s` : ''}
                </span>
            )}
            {result?.status === 'needs_attention' && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                    <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                    Needs attention
                </span>
            )}
            <Button
                type="button"
                size="sm"
                variant={awaitingConsent ? 'default' : 'outline'}
                disabled={running}
                // Disabled while running is the client half of G3's double-click guard;
                // the server half is the idempotency key.
                onClick={() => onRun(awaitingConsent)}
                data-testid="test-step-button"
            >
                {running ? (
                    <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Running…
                    </>
                ) : awaitingConsent ? (
                    'Yes, run it for real'
                ) : (
                    <>
                        <Play className="h-3.5 w-3.5 mr-1" /> Test this step
                    </>
                )}
            </Button>
        </div>

        {/* Consent copy — states the effect BEFORE it happens (§2.1) */}
        {awaitingConsent && result?.consentPrompt && (
            <div
                className={`rounded border p-2 text-[11px] ${
                    result.requiresStrongConfirmation
                        ? 'border-red-500/40 bg-red-500/5 text-red-200'
                        : 'border-amber-500/30 bg-amber-500/5 text-amber-200'
                }`}
                data-testid="consent-prompt"
            >
                {result.consentPrompt}
            </div>
        )}

        {result?.samplingNote && (
            <p className="text-[11px] text-muted-foreground" data-testid="sampling-note">
                {result.samplingNote}
            </p>
        )}

        {/* Guidance replaces the actionable area in place — never a toast (§4.3) */}
        {result?.status === 'needs_attention' && result.guidance && (
            <div
                className="rounded border border-amber-500/25 bg-amber-500/5 p-3 space-y-2"
                data-testid="run-guidance"
            >
                <p className="text-xs font-medium text-foreground/90">{result.guidance.headline}</p>
                <p className="text-[11px] text-muted-foreground">{result.guidance.why}</p>
                <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                    {result.guidance.nextSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                    ))}
                </ul>
                {result.guidance.technicalDetail && (
                    <div>
                        <button
                            type="button"
                            className="flex items-center gap-1 text-[10px] text-muted-foreground/70 hover:text-foreground/80"
                            onClick={() => setShowTechnical((v) => !v)}
                            aria-expanded={showTechnical}
                        >
                            <ChevronDown
                                className={`h-3 w-3 transition-transform ${showTechnical ? '' : '-rotate-90'}`}
                                aria-hidden
                            />
                            Technical detail
                        </button>
                        {showTechnical && (
                            <pre className="mt-1 text-[10px] whitespace-pre-wrap break-words max-h-32 overflow-auto font-mono text-muted-foreground/70">
                                {result.guidance.technicalDetail}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        )}
    </div>
  );
}
