import { useNavigate } from 'react-router-dom';
import { Link2, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import type { WorkflowMissingConnection } from '@/hooks/useWorkflowConnectionStatus';

interface Props {
  missingConnections: WorkflowMissingConnection[];
  workflowId: string;
  workflowName?: string;
  isLoading: boolean;
  onDismiss: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  missing: 'Not connected',
  missing_scope: 'Missing permission',
  expired: 'Needs reconnect',
  error: 'Check failed',
};

export function WorkflowConnectionGate({ missingConnections, workflowId, workflowName, isLoading, onDismiss }: Props) {
  const navigate = useNavigate();

  const handleSetUp = () => {
    const params = new URLSearchParams({ returnTo: `/workflow/${workflowId}` });
    if (workflowName) params.set('workflowName', workflowName);
    navigate(`/connections?${params.toString()}`);
  };

  return (
    /* Full-screen backdrop with blur */
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/60">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">

        {/* ── Loading state ───────────────────────────────────────────── */}
        {isLoading ? (
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Analyzing workflow connections</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scanning nodes for required account connections…
                </p>
              </div>
            </div>

            {/* Animated scan rows */}
            <div className="space-y-2.5">
              {[90, 70, 55].map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-lg bg-muted animate-pulse shrink-0"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                  <div
                    className="h-3 rounded-full bg-muted animate-pulse"
                    style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-center text-muted-foreground">This takes just a moment…</p>
          </div>

        ) : (
        /* ── Missing connections state ──────────────────────────────── */
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">Account connections required</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect the accounts below before this workflow can run.
                </p>
              </div>
            </div>

            {/* Connection list */}
            <div className="space-y-2">
              {missingConnections.map((conn) => (
                <div
                  key={conn.provider}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-3"
                >
                  <ProviderLogo provider={conn.provider} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{conn.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {conn.reason || `Needed by ${conn.nodes.length} node${conn.nodes.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {STATUS_LABELS[conn.status ?? 'missing'] ?? 'Not connected'}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={handleSetUp}
                className="w-full gradient-primary text-primary-foreground font-semibold"
                size="default"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Set Up Connections
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Dismiss — I'll do this later
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              The Run button will unlock automatically once all accounts are connected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
