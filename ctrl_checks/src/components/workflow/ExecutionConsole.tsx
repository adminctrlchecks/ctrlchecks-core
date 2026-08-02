import { useState, useEffect, useCallback, useRef } from 'react';
import { awsClient } from '@/integrations/aws/client';
import { useWorkflowStore } from '@/stores/workflowStore';
import {
  CheckCircle, XCircle, Loader2, Clock, ChevronDown, ChevronUp,
  Terminal, RefreshCw, Trash2, Copy, ExternalLink, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { buildFormPublicUrl } from '@/lib/formPublicUrl';
import { Json } from '@/integrations/aws/types';
import ExecutionLogBlock from './ExecutionLogBlock';
import { ENDPOINTS } from '@/config/endpoints';
import ExecutionStatusBanner from './ExecutionStatusBanner';
import { useExecutionStatus } from '@/hooks/useExecutionStatus';

interface Execution {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error: string | null;
  logs: Json | null;
  output: Json | null;
  input?: Json | null;
}

interface ExecutionStep {
  id?: string;
  node_id: string;
  node_name?: string | null;
  node_type?: string | null;
  input_json?: Json | null;
  output_json?: Json | null;
  status?: string | null;
  error?: string | null;
  sequence?: number | null;
  completed_at?: string | null;
  started_at?: string | null;
}

interface ExecutionConsoleProps {
  isExpanded: boolean;
  onToggle: () => void;
  /**
   * 'horizontal' (default) is the full-width bottom bar used by Expert mode.
   * 'vertical' is the tall, narrow right-hand column used by Prompt mode: the run list
   * moves above the detail pane instead of beside it.
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * False when the console is the body of a tab that already controls its visibility
   * (Prompt mode). The header keeps its run count and refresh button but loses the
   * expand/collapse affordance, and the body always fills the available space.
   */
  collapsible?: boolean;
  /**
   * Render each node's log entry collapsed to its summary row (name, status, timing, position),
   * so a run reads as a scannable list instead of a wall of JSON. Prompt mode turns this on;
   * Expert mode leaves it off and keeps today's fully-expanded payloads.
   */
  collapseLogsByDefault?: boolean;
}

type ResolvedInputSource = 'static_config' | 'template' | 'deterministic_runtime' | 'runtime_ai';

/** Returns true when the execution has reached a terminal state. */
function isTerminalStatus(status: string): boolean {
  return status === 'success' || status === 'failed' || status === 'completed' || status === 'error';
}

function normalizeLogStatus(status?: string | null): 'running' | 'success' | 'failed' | 'skipped' | 'pending' {
  switch (status) {
    case 'success':
    case 'completed':
      return 'success';
    case 'failed':
    case 'error':
      return 'failed';
    case 'running':
    case 'waiting':
      return 'running';
    case 'skipped':
      return 'skipped';
    default:
      return 'pending';
  }
}

function logsNeedStepHydration(execution: Execution, steps: ExecutionStep[]): boolean {
  if (steps.length === 0) return false;
  // If execution.logs is a non-empty array and the execution is terminal, trust the logs
  // column — it was written by execute-workflow.ts with full node names and data flow.
  // Only fall back to steps when logs is missing, empty, or has stale running/pending entries.
  if (isTerminalStatus(execution.status) && Array.isArray(execution.logs) && execution.logs.length > 0) {
    const hasStaleEntries = execution.logs.some((log: any) => log?.status === 'running' || log?.status === 'pending');
    if (!hasStaleEntries) return false; // logs are complete and final — use them
  }
  if (!Array.isArray(execution.logs) || execution.logs.length === 0) return true;
  // During a live run, hydrate from steps if steps have more entries (real-time progress)
  if (!isTerminalStatus(execution.status) && steps.length > execution.logs.length) return true;
  // Stale running/pending entries in a terminal execution — replace with steps
  if (isTerminalStatus(execution.status)) {
    return execution.logs.some((log: any) => log?.status === 'running' || log?.status === 'pending');
  }
  return false;
}

function buildLogsFromSteps(steps: ExecutionStep[]) {
  return steps
    .slice()
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((step, index) => ({
      id: step.id || `${step.node_id}-${step.sequence ?? index}`,
      nodeId: step.node_id,
      nodeName: step.node_name || step.node_id,
      nodeType: step.node_type || undefined,
      status: normalizeLogStatus(step.status),
      startedAt: step.started_at || step.completed_at || new Date().toISOString(),
      finishedAt: step.completed_at || undefined,
      input: step.input_json,
      output: step.output_json,
      error: step.error || undefined,
      sequence: step.sequence ?? index + 1,
    }));
}

export default function ExecutionConsole({
  isExpanded,
  onToggle,
  orientation = 'horizontal',
  collapsible = true,
  collapseLogsByDefault = false,
}: ExecutionConsoleProps) {
  const isVertical = orientation === 'vertical';
  /** Whether the body is showing. Identical to `isExpanded` in the default collapsible mode. */
  const isOpen = collapsible ? isExpanded : true;
  const { workflowId, updateNodeStatus, resetWorkflow, resetAllNodeStatuses, nodes, setNodeError, clearNodeErrors } = useWorkflowStore();
  const { activeExecution, reconnecting } = useExecutionStatus();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [liveUpdatesDegraded, setLiveUpdatesDegraded] = useState(false);
  const [stepsLoadError, setStepsLoadError] = useState<string | null>(null);
  // ✅ FIX: Track if user has manually selected an execution (don't auto-select if true)
  const [isManualSelection, setIsManualSelection] = useState(false);
  // Live execution ID drives the WebSocket connection for real-time node updates
  const [liveExecutionId, setLiveExecutionId] = useState<string | null>(null);

  // ✅ FIX: Use refs to track current values so callbacks always have latest state
  const selectedExecutionRef = useRef<Execution | null>(null);
  const isManualSelectionRef = useRef(false);

  useEffect(() => {
    selectedExecutionRef.current = selectedExecution;
  }, [selectedExecution]);

  useEffect(() => {
    isManualSelectionRef.current = isManualSelection;
  }, [isManualSelection]);

  // WebSocket for real-time node-by-node updates (supplements 1s polling)
  useEffect(() => {
    if (!liveExecutionId) {
      setLiveUpdatesDegraded(false);
      return;
    }

    const backendUrl = ENDPOINTS.itemBackend;
    let wsUrl: string;
    try {
      const url = new URL(backendUrl);
      const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${url.host}/ws/executions?executionId=${liveExecutionId}`;
    } catch {
      wsUrl = `ws://localhost:3001/ws/executions?executionId=${liveExecutionId}`;
    }

    let ws: WebSocket | null = null;
    let closedByCleanup = false;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        setLiveUpdatesDegraded(false);
        ws?.send(JSON.stringify({ type: 'SUBSCRIBE', executionId: liveExecutionId }));
      };
      ws.onmessage = (event) => {
        try {
          setLiveUpdatesDegraded(false);
          const msg = JSON.parse(event.data);
          const applyNodeState = (nodeId: string, status: string) => {
            const map: Record<string, 'idle' | 'running' | 'success' | 'error'> = {
              running: 'running', success: 'success', error: 'error', skipped: 'idle', pending: 'idle',
            };
            updateNodeStatus(nodeId, map[status] ?? 'idle');
          };
          if (msg.type === 'NODE_UPDATE' && msg.data?.nodeId) {
            applyNodeState(msg.data.nodeId, msg.data.status);
            if (msg.data.status === 'error' && msg.data.error) {
              setNodeError(msg.data.nodeId, String(msg.data.error));
            }
          } else if (msg.type === 'EXECUTION_SNAPSHOT' && Array.isArray(msg.data?.nodes)) {
            msg.data.nodes.forEach((n: any) => applyNodeState(n.nodeId, n.status));
          }
        } catch { /* ignore malformed messages */ }
      };
      ws.onerror = () => setLiveUpdatesDegraded(true);
      ws.onclose = () => {
        if (!closedByCleanup) setLiveUpdatesDegraded(true);
      };
    } catch {
      setLiveUpdatesDegraded(true);
    }

    return () => {
      closedByCleanup = true;
      ws?.close();
    };
  }, [liveExecutionId, updateNodeStatus]);

  const loadExecutionSteps = useCallback(async (executionId: string): Promise<ExecutionStep[]> => {
    const { data, error } = await (awsClient as any)
      .from('execution_steps')
      .select('id, node_id, node_name, node_type, input_json, output_json, status, error, sequence, completed_at, started_at')
      .eq('execution_id', executionId)
      .order('sequence', { ascending: true });

    if (error) {
      console.warn('Execution steps unavailable:', error);
      setStepsLoadError('Could not load execution steps. Check your connection and refresh.');
      return [];
    }

    setStepsLoadError(null);
    return (data || []) as ExecutionStep[];
  }, []);

  const hydrateExecution = useCallback(async (execution: Execution): Promise<Execution> => {
    const steps = await loadExecutionSteps(execution.id);
    if (!logsNeedStepHydration(execution, steps)) {
      return execution;
    }

    return {
      ...execution,
      logs: buildLogsFromSteps(steps) as unknown as Json,
      output: execution.output ?? (steps.length > 0 ? steps[steps.length - 1]?.output_json ?? null : null),
    };
  }, [loadExecutionSteps]);

  // Load a specific execution with full data
  const loadExecution = useCallback(async (executionId: string) => {
    if (!workflowId) return;

    try {
      const { data, error } = await awsClient
        .from('executions')
        .select('id, status, started_at, finished_at, duration_ms, error, logs, output, input')
        .eq('id', executionId)
        .eq('workflow_id', workflowId)
        .single();

      if (error) {
        console.error('Error loading execution:', error);
        return null;
      }

      return await hydrateExecution(data as Execution);
    } catch (error) {
      console.error('Error loading execution:', error);
      return null;
    }
  }, [workflowId, hydrateExecution]);

  const loadExecutions = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);
    try {
      const { data, error } = await awsClient
        .from('executions')
        .select('id, status, started_at, finished_at, duration_ms, error')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) {
        // Handle 406 errors gracefully (might be RLS or column issues)
        // 406 can occur when no rows exist and RLS prevents access
        const is406Error = error.code === 'PGRST116' ||
          error.message?.includes('406') ||
          (error as any).status === 406 ||
          (error as any).statusCode === 406;

        if (is406Error) {
          // Silently handle - this is expected when no executions exist yet
          setExecutions([]);
          return;
        }
        throw error;
      }
      // Deduplicate executions by ID
      const uniqueExecutions = (data || []).reduce((acc: Execution[], exec: Execution) => {
        if (!acc.find(e => e.id === exec.id)) {
          acc.push(exec);
        }
        return acc;
      }, []);
      setExecutions(uniqueExecutions);
      if (uniqueExecutions.length > 0) {
        // ✅ FIX: Use refs to get current values instead of stale closure values
        // This ensures manual selection is always respected, even when called from polling/intervals
        const currentIsManualSelection = isManualSelectionRef.current;
        const currentSelectedExecution = selectedExecutionRef.current;

        if (!currentIsManualSelection) {
          const mostRecent = uniqueExecutions[0];
          // Only update if it's different or if we don't have a selection
          if (!currentSelectedExecution || currentSelectedExecution.id !== mostRecent.id) {
            const fullExecution = await loadExecution(mostRecent.id);
            setSelectedExecution(fullExecution || mostRecent);
          } else if (!isTerminalStatus(mostRecent.status)) {
            setSelectedExecution({ ...currentSelectedExecution, ...mostRecent });
          } else {
            const fullExecution = await loadExecution(currentSelectedExecution.id);
            setSelectedExecution(fullExecution || mostRecent);
          }
        } else {
          // User has manually selected - update the selected execution data if it exists in the list
          if (currentSelectedExecution) {
            const updatedExecution = uniqueExecutions.find(e => e.id === currentSelectedExecution.id);
            if (updatedExecution) {
              if (isTerminalStatus(updatedExecution.status) || !currentSelectedExecution.logs) {
                const fullExecution = await loadExecution(updatedExecution.id);
                setSelectedExecution(fullExecution || updatedExecution);
              } else {
                setSelectedExecution({ ...currentSelectedExecution, ...updatedExecution });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading executions:', error);
      // Set empty array on error to prevent UI issues
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  }, [workflowId, loadExecution]);

  useEffect(() => {
    if (workflowId && isOpen) {
      // ✅ FIX: Reset manual selection flag when workflow changes or console is collapsed/expanded
      // This allows auto-selection to work again for new workflows
      setIsManualSelection(false);
      loadExecutions();
    }
  }, [workflowId, isOpen, loadExecutions]);

  // Listen for workflow execution started event to force refresh
  useEffect(() => {
    const handleExecutionStarted = (event: CustomEvent) => {
      const { executionId, workflowId: eventWorkflowId } = event.detail;
      if (eventWorkflowId === workflowId) {
        console.log('Workflow execution started, refreshing executions...', executionId);
        setLiveExecutionId(executionId);
        const startedSummary = {
          id: executionId,
          status: 'running',
          started_at: new Date().toISOString(),
          workflow_id: eventWorkflowId,
        } as Execution;
        setExecutions((prev) => [startedSummary, ...prev.filter((e) => e.id !== executionId)].slice(0, 10));
        if (!isManualSelectionRef.current) {
          setSelectedExecution(startedSummary);
        }

        // Lightweight status polling while active. Full rows/logs load only at terminal state.
        let pollStopped = false;
        let notFoundCount = 0;
        const ACTIVE_DELAY_MS = 1000;
        const MAX_DURATION_MS = 5 * 60_000; // give up after 5 minutes
        const startedAt = Date.now();

        const scheduleNext = () => {
          if (pollStopped) return;
          setTimeout(async () => {
            if (pollStopped) return;
            try {
              const statusResponse = await fetch(`${ENDPOINTS.itemBackend}/api/execution-status/${executionId}?lite=1`);
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                const liveSteps: ExecutionStep[] = Array.isArray(statusData.steps) ? statusData.steps : [];
                const nextSummary = {
                  id: executionId,
                  workflow_id: statusData.workflow_id || eventWorkflowId,
                  status: statusData.status,
                  started_at: statusData.started_at,
                  finished_at: statusData.completed_at,
                  error: statusData.error || null,
                  ...(liveSteps.length > 0 ? { logs: buildLogsFromSteps(liveSteps) as unknown as Json } : {}),
                } as Execution;
                setExecutions((prev) => [nextSummary, ...prev.filter((e) => e.id !== executionId)].slice(0, 10));
                if (!isManualSelectionRef.current || selectedExecutionRef.current?.id === executionId) {
                  setSelectedExecution((prev) => ({ ...(prev || nextSummary), ...nextSummary }));
                }

                if (isTerminalStatus(String(statusData.status))) {
                  const fullExecution = await loadExecution(executionId);
                  const terminalExecution = fullExecution || nextSummary;
                  setSelectedExecution(terminalExecution);
                  setExecutions((prev) => [terminalExecution, ...prev.filter((e) => e.id !== executionId)].slice(0, 10));
                  pollStopped = true;
                  setLiveExecutionId(null);
                  window.dispatchEvent(new CustomEvent('workflow-execution-terminal', {
                    detail: { execution: terminalExecution },
                  }));
                  return;
                }
              } else if (statusResponse.status === 404) {
                notFoundCount += 1;
                // Bug 3 fix: the original threshold of 3 was too aggressive.
                // The background execute-workflow.ts task starts ~100ms after the HTTP
                // response, and with the user_id fix the record becomes visible immediately.
                // Still, give the system at least 15 seconds AND 10 consecutive misses
                // before giving up, to handle any transient DB propagation delays.
                const elapsedMs = Date.now() - startedAt;
                if (notFoundCount >= 10 && elapsedMs >= 15_000) {
                  pollStopped = true;
                  await loadExecutions();
                  return;
                }
                await new Promise((r) => setTimeout(r, 1000));
              } else {
                await loadExecutions();
              }
            } catch {
              await loadExecutions();
            }

            if (Date.now() - startedAt >= MAX_DURATION_MS) {
              pollStopped = true;
              return;
            }
            scheduleNext();
          }, ACTIVE_DELAY_MS);
        };

        scheduleNext();
      }
    };

    window.addEventListener('workflow-execution-started', handleExecutionStarted as EventListener);
    return () => {
      window.removeEventListener('workflow-execution-started', handleExecutionStarted as EventListener);
    };
  }, [workflowId, loadExecutions]);

  // Auto-refresh executions periodically when console is expanded and there's a running execution
  useEffect(() => {
    if (!isOpen || !workflowId) return;
    
    const hasRunningExecution = executions.some(exec => 
      exec.status === 'running' || exec.status === 'waiting'
    );
    
    if (hasRunningExecution) {
      // Exponential-backoff background refresh: 2s → 4s → 8s → cap 15s
      let attempt = 0;
      let stopped = false;
      const MAX_BG_DELAY = 15_000;
      let timerId: ReturnType<typeof setTimeout>;

      const scheduleNext = () => {
        if (stopped) return;
        const delay = Math.min(2000 * Math.pow(2, attempt), MAX_BG_DELAY);
        attempt++;
        timerId = setTimeout(() => { loadExecutions(); scheduleNext(); }, delay);
      };

      scheduleNext();
      return () => { stopped = true; clearTimeout(timerId); };
    }
  }, [isOpen, workflowId, executions, loadExecutions]);

  // Real-time subscription for live updates
  useEffect(() => {
    if (!workflowId) return;

    const channel = awsClient
      .channel(`executions-${workflowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'executions',
          filter: `workflow_id=eq.${workflowId}`
        },
        (payload) => {
          console.log('Realtime execution update:', payload);

          if (payload.eventType === 'INSERT') {
            const newExecution = payload.new as Execution;
            setExecutions(prev => {
              // Deduplicate: check if execution already exists
              const exists = prev.some(exec => exec.id === newExecution.id);
              if (exists) {
                // If it exists, update it instead of adding
                return prev.map(exec => exec.id === newExecution.id ? newExecution : exec);
              }
              // Add new execution at the beginning, limit to 10
              return [newExecution, ...prev.filter(exec => exec.id !== newExecution.id)].slice(0, 10);
            });
            // Reset all node statuses and error messages when a new execution starts
            resetAllNodeStatuses();
            clearNodeErrors();
            // Reset execution ID tracking to trigger status reset
            setLastExecutionId(null);
            // ✅ FIX: Only auto-select new execution if user hasn't manually selected one
            // This prevents new executions from overriding user's manual selection
            // Use ref to get current value instead of stale closure value
            if (!isManualSelectionRef.current) {
              setSelectedExecution(newExecution);
            }
            // Force refresh to get latest logs
            setTimeout(() => loadExecutions(), 500);
            // Auto-expand console if collapsed (triggered from parent)
          } else if (payload.eventType === 'UPDATE') {
            const updatedExecution = payload.new as Execution;
            setExecutions(prev => {
              // Deduplicate: ensure we don't have duplicates
              const seen = new Set<string>();
              return prev
                .map(exec => exec.id === updatedExecution.id ? updatedExecution : exec)
                .filter(exec => {
                  if (seen.has(exec.id)) {
                    return false;
                  }
                  seen.add(exec.id);
                  return true;
                });
            });
            // Dispatch terminal event and stop subscription when execution reaches a terminal state
            if (isTerminalStatus(updatedExecution.status)) {
              try {
                window.dispatchEvent(new CustomEvent('workflow-execution-terminal', {
                  detail: { execution: updatedExecution },
                }));
              } catch {
                // Ensure we continue even if dispatch throws
              }
              // Unsubscribe from realtime updates for this execution
              awsClient.removeChannel(channel);
            }
            // Always update selected execution if it's the one being updated
            if (selectedExecutionRef.current?.id === updatedExecution.id) {
              setSelectedExecution(updatedExecution);
              // Force refresh to get latest logs when current execution is updated
              setTimeout(() => loadExecutions(), 300);
            } else if (!isManualSelectionRef.current && (!selectedExecutionRef.current || updatedExecution.started_at > selectedExecutionRef.current.started_at)) {
              // ✅ FIX: Only auto-select if user hasn't manually selected one
              // Auto-select if it's newer than current selection (only if no manual selection)
              // Use ref to get current value instead of stale closure value
              setSelectedExecution(updatedExecution);
            }
          }
        }
      )
      .subscribe();

    return () => {
      awsClient.removeChannel(channel);
    };
  }, [workflowId, resetAllNodeStatuses]);

  // Track the last execution ID to detect when we switch to a different execution
  const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);

  // Sync execution status with canvas nodes
  useEffect(() => {
    const executionId = selectedExecution?.id;

    // Reset all node statuses when switching to a different execution
    if (executionId && executionId !== lastExecutionId) {
      resetAllNodeStatuses();
      setLastExecutionId(executionId);
    }

    if (!selectedExecution?.logs || !Array.isArray(selectedExecution.logs)) {
      return;
    }

    const logs = selectedExecution.logs as any[];

    logs.forEach(log => {
      if (log.nodeId && log.status) {
        // Map log status to node status
        // Log statuses: 'running', 'success', 'failed', 'pending', 'skipped'
        // Node statuses: 'idle', 'running', 'success', 'error'
        let nodeStatus: 'idle' | 'running' | 'success' | 'error' = 'idle';

        switch (log.status) {
          case 'pending': nodeStatus = 'idle'; break; // Show as idle until running
          case 'running': nodeStatus = 'running'; break;
          case 'success': nodeStatus = 'success'; break;
          case 'failed': nodeStatus = 'error'; break;
          case 'skipped': nodeStatus = 'idle'; break; // Skipped nodes remain idle
          default: nodeStatus = 'idle'; break;
        }

        updateNodeStatus(log.nodeId, nodeStatus);
      }
    });
  }, [selectedExecution, updateNodeStatus, resetAllNodeStatuses, lastExecutionId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-3 w-3 text-success" />;
      case 'failed': return <XCircle className="h-3 w-3 text-destructive" />;
      case 'running': return <Loader2 className="h-3 w-3 text-primary animate-spin" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-success/10 text-success border-success/20';
      case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'running': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Render structured logs using block-wise UI
  const renderStructuredLogs = (logs: Json | null) => {
    if (!logs) {
      const isRunning = selectedExecution?.status === 'running' || selectedExecution?.status === 'waiting';
      return (
        <div className="text-sm text-muted-foreground p-4 text-center">
          {stepsLoadError ? (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{stepsLoadError}</span>
            </div>
          ) : isRunning ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Execution in progress... Logs will appear here as nodes execute.</span>
            </div>
          ) : (
            'No logs available'
          )}
        </div>
      );
    }

    if (Array.isArray(logs)) {
      const validLogs = logs.filter((log: any) => typeof log === 'object' && log !== null);
      
      if (validLogs.length === 0) {
        return (
          <div className="text-sm text-muted-foreground p-4 text-center">
            No valid execution logs found
          </div>
        );
      }

      return (
        <div className="space-y-0">
          {validLogs.map((log: any, i: number) => (
            <ExecutionLogBlock
              // Use a stable, per-log key to avoid React duplicate key warnings
              key={log.id || `${log.executionId || 'exec'}-${log.nodeId || 'node'}-${log.sequence ?? i}`}
              log={{
                nodeId: log.nodeId || `node-${i}`,
                nodeName: log.nodeName || log.nodeId || `Node ${i + 1}`,
                nodeType: log.nodeType,
                status: log.status || 'unknown',
                startedAt: log.startedAt || log.started_at || new Date().toISOString(),
                finishedAt: log.finishedAt || log.finished_at,
                input: log.input,
                output: log.output,
                error: log.error,
                resolvedInputs: log.resolvedInputs,
                resolvedInputSources: log.resolvedInputSources as Record<string, ResolvedInputSource> | undefined,
              }}
              index={i}
              totalNodes={validLogs.length}
              isLast={i === validLogs.length - 1}
              defaultCollapsed={collapseLogsByDefault}
            />
          ))}
        </div>
      );
    }

    // Fallback for non-array logs
    return (
      <pre className="p-3 rounded-md bg-muted/50 text-xs font-mono overflow-x-auto">
        {JSON.stringify(logs, null, 2)}
      </pre>
    );
  };

  return (
    <div className={cn(
      "border-border bg-card transition-all duration-300",
      // As a tab body the console sits directly under the toggle row, which already has a
      // bottom border — a top border here would double it up.
      collapsible && "border-t",
      isVertical
        ? cn("flex min-h-0 w-full flex-col overflow-hidden", isOpen ? "flex-1" : "h-10 shrink-0")
        : cn("flex-shrink-0", isOpen ? "h-[600px]" : "h-10")
    )}>
      {/* Console Header */}
      <div
        className={cn(
          "h-10 px-4 flex items-center justify-between",
          collapsible && "cursor-pointer hover:bg-muted/50",
          isVertical && "shrink-0 gap-2"
        )}
        onClick={collapsible ? onToggle : undefined}
      >
        <div className={cn("flex items-center gap-2", isVertical && "min-w-0")}>
          <Terminal className={cn("h-4 w-4 text-muted-foreground", isVertical && "shrink-0")} />
          <span className={cn("text-sm font-medium", isVertical && "truncate")}>Execution Console</span>
          {executions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {executions.length} runs
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={(e) => { e.stopPropagation(); loadExecutions(); }}
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </Button>
          )}
          {collapsible && (isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ))}
        </div>
      </div>

      {/* Console Content */}
      {isOpen && (
        <div className={cn(
          "flex flex-col",
          isVertical ? "min-h-0 flex-1 overflow-hidden" : "h-[calc(100%-40px)]"
        )}>
          {activeExecution && activeExecution.status !== 'idle' && (
            <div className="px-4 pt-3 pb-1 shrink-0">
              <ExecutionStatusBanner execution={activeExecution} reconnecting={reconnecting} />
            </div>
          )}
          {reconnecting && !activeExecution && (
            <div className="mx-4 mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              Reconnecting to live updates…
            </div>
          )}
          <div className={cn("flex flex-1 min-h-0", isVertical && "min-w-0")}>
          {/* Execution List — a fixed-width column beside the details in both orientations, so a
              growing run history scrolls inside its own column instead of eating the detail pane. */}
          <div className={cn(
            "border-r border-border",
            // Same side-by-side structure in both orientations; the column is just a little
            // narrower in the panel so the detail pane still has room at minimum width.
            isVertical ? "w-52 shrink-0" : "w-64"
          )}>
            <ScrollArea className="h-full">
              {!workflowId ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Save workflow to see executions
                </div>
              ) : executions.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No executions yet
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {executions.map((exec) => (
                    <div
                      key={exec.id}
                      className={cn(
                        "p-2 rounded-md cursor-pointer text-xs transition-colors",
                        selectedExecution?.id === exec.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted"
                      )}
                      onClick={async () => {
                        // ✅ FIX: Mark as manual selection and reload full execution data
                        setIsManualSelection(true); // Prevent auto-selection from overriding
                        const fullExecution = await loadExecution(exec.id);
                        if (fullExecution) {
                          setSelectedExecution(fullExecution);
                          // Also update it in the executions list
                          setExecutions(prev => prev.map(e => e.id === exec.id ? fullExecution : e));
                        } else {
                          // Fallback to cached execution if reload fails
                          setSelectedExecution(exec);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(exec.status)}
                        <span className="font-mono text-xs">{exec.id.slice(0, 8)}...</span>
                        <Badge variant="outline" className={cn("text-xs px-1 py-0", getStatusColor(exec.status))}>
                          {exec.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-muted-foreground text-xs">
                        <span>{new Date(exec.started_at).toLocaleTimeString()}</span>
                        <span>{formatDuration(exec.duration_ms)}</span>
                      </div>
                      {exec.status === 'pending' && (
                        <div className="text-xs text-muted-foreground mt-1 italic">
                          Waiting to start...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Execution Details */}
          <div className={cn(
            "flex-1 overflow-y-auto",
            // Narrow column: contain wide payloads so the page itself never scrolls sideways.
            isVertical && "min-h-0 min-w-0 overflow-x-hidden"
          )}>
            {liveUpdatesDegraded && (
              <div className="mx-4 mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Live updates unavailable — showing polled data</span>
              </div>
            )}
            {selectedExecution ? (
              <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getStatusColor(selectedExecution.status)}>
                      {selectedExecution.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(selectedExecution.started_at).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Duration: {formatDuration(selectedExecution.duration_ms)}
                    </span>
                  </div>

                  {/* Form URL Display - Show when workflow has form node */}
                  {(() => {
                    const formUrl = workflowId ? buildFormPublicUrl(workflowId, nodes) : null;
                    if (formUrl) {
                      return (
                        <div className="p-3 rounded-md bg-primary/10 border border-primary/20 mb-4">
                          <div className="text-xs font-medium text-primary mb-2">📋 Form URL (Readonly)</div>
                          <div className="flex gap-2 items-center">
                            <code className="text-xs font-mono break-all flex-1 bg-background p-2 rounded bg-muted/50">
                              {formUrl}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(formUrl);
                                toast({
                                  title: 'Form URL copied to clipboard',
                                });
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => window.open(formUrl, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Open
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Share this URL to collect form submissions. Form Trigger blocks workflow execution until submission. Submissions will appear in the execution console.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Chat URL Display - Show when workflow has chat trigger node (like webhook - always available) */}
                  {(() => {
                    const chatNode = nodes.find((node: any) => node.data?.type === 'chat_trigger');
                    if (chatNode && workflowId) {
                      const chatUrl = `${window.location.origin}/chat/${workflowId}/${chatNode.id}`;
                      return (
                        <div className="p-3 rounded-md bg-primary/10 border border-primary/20 mb-4">
                          <div className="text-xs font-medium text-primary mb-2">💬 Chat URL</div>
                          <div className="flex gap-2 items-center">
                            <code className="text-xs font-mono break-all flex-1 bg-background p-2 rounded bg-muted/50">
                              {chatUrl}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(chatUrl);
                                toast({
                                  title: 'Chat URL copied to clipboard',
                                });
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => window.open(chatUrl, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Open
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Share this URL to open the chat interface. Each message will trigger a new workflow execution (like webhook). Messages will appear in the execution console.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {selectedExecution.error && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <div className="text-xs font-medium text-destructive mb-1">Error</div>
                      <pre className="text-xs text-destructive/80 whitespace-pre-wrap">
                        {selectedExecution.error}
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Input</div>
                    <pre className="p-3 rounded-md bg-muted/50 text-xs font-mono whitespace-pre-wrap border border-border">
                      {selectedExecution.input ? JSON.stringify(selectedExecution.input, null, 2) : 'No input data'}
                    </pre>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Execution Logs (Node-by-Node)</div>
                    <div className="rounded-md border border-border bg-muted/30 p-4">
                      {renderStructuredLogs(selectedExecution.logs)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Final Output</div>
                    <pre className="p-3 rounded-md bg-muted/50 text-xs font-mono whitespace-pre-wrap border border-border">
                      {selectedExecution.output ? JSON.stringify(selectedExecution.output, null, 2) : 'null (no output generated)'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Select an execution to view details
                </div>
              )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
