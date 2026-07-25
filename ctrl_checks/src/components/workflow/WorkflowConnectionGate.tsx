import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Link2, ListChecks, Loader2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import {
  groupWorkflowConnectionIssues,
  type WorkflowMissingConnection,
  type WorkflowReadinessIssue,
  type WorkflowSetupStatus,
} from '@/hooks/useWorkflowConnectionStatus';

interface Props {
  missingConnections: WorkflowMissingConnection[];
  workflowId: string;
  workflowName?: string;
  isLoading: boolean;
  onDismiss: () => void;
  readiness?: WorkflowSetupStatus;
}

const STATUS_LABELS: Record<string, string> = {
  missing: 'Not connected',
  invalid_ref: 'Select connection',
  runtime_missing: 'Reconnect',
  missing_scope: 'Missing permission',
  expired: 'Needs reconnect',
  revoked: 'Revoked',
  error: 'Check failed',
};

const ACTION_LABELS: Record<string, string> = {
  connect: 'Connect account',
  select_connection: 'Select connection',
  reconnect: 'Reconnect account',
  repair: 'Repair connection',
  none: 'Ready',
};

function issueTitle(conn: WorkflowMissingConnection): string {
  const parts = [
    conn.nodeLabel || conn.nodes[0],
    conn.operationLabel || conn.operation,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' - ') : conn.displayName;
}

function compactRequirement(value: string): string {
  return value
    .replace(/^https:\/\/www\.googleapis\.com\/auth\//, '')
    .replace(/^https:\/\/graph\.microsoft\.com\//, '')
    .replace(/^https:\/\/www\.linkedin\.com\/oauth\/v2\//, '');
}

function inputIssueTitle(issue: WorkflowReadinessIssue): string {
  const field = issue.fieldLabel || issue.fieldName || issue.fieldKey || issue.label || 'Input';
  const node = issue.nodeLabel || issue.nodeId || 'Workflow node';
  const operation = issue.operationLabel || issue.operation;
  return [node, operation, field].filter(Boolean).join(' - ');
}

function issueReason(issue: WorkflowReadinessIssue): string {
  return String(issue.reason || issue.message || issue.description || 'Review this setup requirement before running.');
}

function nextAction(issue: WorkflowReadinessIssue, fallback: string): string {
  return String(issue.action || fallback);
}

export function WorkflowConnectionGate({
  missingConnections,
  workflowId,
  workflowName,
  isLoading,
  onDismiss,
  readiness,
}: Props) {
  const navigate = useNavigate();
  const groups = groupWorkflowConnectionIssues(missingConnections);
  const missingInputs = readiness?.missingInputs || [];
  const invalidInputs = readiness?.invalidInputs || [];
  const runtimeIssues = (readiness?.runtimeValidationIssues || []).filter(
    (issue) => issue.kind !== 'missing_input' && issue.kind !== 'invalid_input',
  );

  const handleSetUp = () => {
    const params = new URLSearchParams({ returnTo: `/workflow/${workflowId}` });
    if (workflowName) params.set('workflowName', workflowName);
    navigate(`/connections?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/60">
      <div className="relative w-full max-w-2xl mx-4 rounded-lg border border-border bg-card shadow-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Checking workflow setup</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reading the latest backend readiness for this workflow.
                </p>
              </div>
            </div>

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

            <p className="text-xs text-center text-muted-foreground">This takes just a moment...</p>
          </div>
        ) : (
          <div className="max-h-[min(760px,calc(100vh-2rem))] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">Workflow setup needs attention</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review the provider, account, and input requirements before this workflow can run.
                </p>
              </div>
            </div>

            {groups.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Link2 className="h-4 w-4 text-amber-500" />
                  Provider and account setup
                </div>
                {groups.map((group) => (
                  <div key={group.key} className="rounded-md border border-border bg-muted/25 px-3.5 py-3">
                    <div className="flex items-start gap-3">
                      <ProviderLogo provider={group.provider} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{group.displayName}</p>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            {ACTION_LABELS[group.action] || 'Review'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          One compatible saved connection can cover all listed nodes when it includes the required permissions and configuration.
                        </p>
                        {group.connectionName && (
                          <p className="mt-1 text-xs text-muted-foreground">Saved connection: {group.connectionName}</p>
                        )}
                        {group.candidateConnectionIds.length > 1 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Multiple saved accounts match. Select the intended connection for these nodes.
                          </p>
                        )}
                        {group.requiredScopes.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Required permissions: {group.requiredScopes.map(compactRequirement).join(', ')}
                          </p>
                        )}
                        <div className="mt-2 space-y-1.5">
                          {group.issues.map((conn, index) => (
                            <div
                              key={`${conn.nodeId || conn.provider}-${conn.operation || ''}-${index}`}
                              className="rounded border border-border/70 bg-background/70 px-2.5 py-2"
                            >
                              <p className="text-xs font-medium text-foreground">{issueTitle(conn)}</p>
                              <p className="text-xs text-muted-foreground">
                                {conn.reason || STATUS_LABELS[conn.status || 'missing'] || 'Review this requirement.'}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Next action: {ACTION_LABELS[conn.action || group.action] || 'Review'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {missingInputs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ListChecks className="h-4 w-4 text-amber-500" />
                  Missing inputs
                </div>
                {missingInputs.map((issue, index) => (
                  <div key={`${issue.nodeId || 'node'}-${issue.fieldKey || issue.fieldName || index}`} className="rounded-md border border-border bg-muted/25 px-3.5 py-3">
                    <p className="text-sm font-medium text-foreground">{inputIssueTitle(issue)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{issueReason(issue)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Next action: {nextAction(issue, 'Add the missing input')}</p>
                  </div>
                ))}
              </div>
            )}

            {invalidInputs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Settings2 className="h-4 w-4 text-amber-500" />
                  Invalid inputs
                </div>
                {invalidInputs.map((issue, index) => (
                  <div key={`${issue.nodeId || 'node'}-${issue.fieldKey || issue.fieldName || index}`} className="rounded-md border border-border bg-muted/25 px-3.5 py-3">
                    <p className="text-sm font-medium text-foreground">{inputIssueTitle(issue)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{issueReason(issue)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Next action: {nextAction(issue, 'Fix the input value')}</p>
                  </div>
                ))}
              </div>
            )}

            {runtimeIssues.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-amber-500" />
                  Runtime validation
                </div>
                {runtimeIssues.map((issue, index) => (
                  <div key={`${issue.nodeId || 'node'}-${index}`} className="rounded-md border border-border bg-muted/25 px-3.5 py-3">
                    <p className="text-sm font-medium text-foreground">{inputIssueTitle(issue)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{issueReason(issue)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Next action: {nextAction(issue, 'Review this requirement')}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {groups.length > 0 && (
                <Button
                  onClick={handleSetUp}
                  className="w-full gradient-primary text-primary-foreground font-semibold"
                  size="default"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Set Up Connections
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Dismiss - I'll do this later
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              The Run button unlocks after the latest setup check passes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
