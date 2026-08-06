import { Loader2, CheckCircle2, XCircle, Clock, WifiOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorkflowStore, type ActiveExecution, type ExecutionStatus } from '@/stores/workflowStore';
import ExecutionProgressBar from './ExecutionProgressBar';
import { ENDPOINTS } from '@/config/endpoints';
import { awsClient } from '@/integrations/aws/client';
import { toast } from '@/hooks/use-toast';
import { isAttentionOutcome, outcomeLabel } from '@/lib/executionOutcome';

interface ExecutionStatusBannerProps {
  execution: ActiveExecution;
  reconnecting?: boolean;
  onRetry?: () => void;
}

const statusConfig: Record<ExecutionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  idle: { label: 'Idle', color: 'bg-muted text-muted-foreground', icon: null },
  queued: { label: 'Queued', color: 'bg-secondary text-secondary-foreground', icon: <Clock className="h-3.5 w-3.5" /> },
  running: { label: 'Running', color: 'bg-primary/10 text-primary border-primary/20', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  success: { label: 'Success', color: 'bg-success/10 text-success border-success/20', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  failed: { label: 'Failed', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: <XCircle className="h-3.5 w-3.5" /> },
  stopped_expected: { label: 'Stopped', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  needs_connection: { label: 'Needs connection', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  needs_configuration: { label: 'Needs configuration', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  provider_unavailable: { label: 'Provider unavailable', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

export default function ExecutionStatusBanner({ execution, reconnecting, onRetry }: ExecutionStatusBannerProps) {
  const { clearActiveExecution } = useWorkflowStore();
  const outcome = execution.outcome;
  const attentionCfg =
    outcome?.kind === 'needs_connection' ? statusConfig.needs_connection :
    outcome?.kind === 'needs_configuration' ? statusConfig.needs_configuration :
    outcome?.kind === 'provider_unavailable' ? statusConfig.provider_unavailable :
    statusConfig.stopped_expected;
  const cfg = isAttentionOutcome(outcome)
    ? { ...attentionCfg, label: outcomeLabel(outcome!) }
    : statusConfig[execution.status] ?? statusConfig.idle;
  const isActive = execution.status === 'queued' || execution.status === 'running';

  const handleCancel = async () => {
    try {
      const { data: sessionData } = await awsClient.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${ENDPOINTS.itemBackend}/api/executions/${execution.executionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        clearActiveExecution();
        toast({ title: 'Execution cancelled' });
      } else {
        toast({ title: 'Cancel failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Cancel failed', variant: 'destructive' });
    }
  };

  return (
    <div className={cn(
      'flex flex-col gap-2 rounded-md border px-3 py-2 text-sm',
      cfg.color,
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {cfg.icon}
          <Badge variant="outline" className={cn('text-xs', cfg.color)}>
            {cfg.label}
          </Badge>
          <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
            {execution.executionId.slice(0, 8)}…
          </span>
          {reconnecting && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <WifiOff className="h-3 w-3" />
              Reconnecting…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isActive && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          {execution.status === 'failed' && onRetry && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </div>

      {execution.status === 'running' && (
        <ExecutionProgressBar progress={execution.progress} currentStep={execution.currentStep} />
      )}

      {isAttentionOutcome(outcome) && (
        <p className="text-xs text-muted-foreground">{outcome!.userMessage}</p>
      )}

      {execution.errorMessage && execution.status === 'failed' && !isAttentionOutcome(outcome) && (
        <p className="text-xs text-destructive/80 truncate">{execution.errorMessage}</p>
      )}
    </div>
  );
}
