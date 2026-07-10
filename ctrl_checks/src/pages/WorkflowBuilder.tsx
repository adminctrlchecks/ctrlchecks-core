import { useEffect, useCallback, useState, useRef, Suspense, lazy } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useWorkflowStore } from '@/stores/workflowStore';
import { awsClient } from '@/integrations/aws/client';
import { ENDPOINTS } from '@/config/endpoints';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, ChevronRight, ChevronLeft, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeTypeDefinition } from '@/components/workflow/nodeTypes';
import WorkflowHeader from '@/components/workflow/WorkflowHeader';
import { useWorkflowConnectionStatus } from '@/hooks/useWorkflowConnectionStatus';
import { WorkflowConnectionGate } from '@/components/workflow/WorkflowConnectionGate';
import { useDebugStore } from '@/stores/debugStore';
import { Edge } from '@xyflow/react';
import { Json } from '@/integrations/aws/types';
import { validateAndFixWorkflow } from '@/lib/workflowValidation';
import {
  extractNodeConfigForAttachInputs,
  markAttachInputsPayloadPersisted,
  wasAttachInputsPayloadRecentlyPersisted,
} from '@/lib/attach-inputs-payload';
import { buildFormPublicUrl } from '@/lib/formPublicUrl';
import { enforceFrontendRenderContract, normalizeBackendWorkflow, validateNodeTypesRegistered } from '@/lib/node-type-normalizer';
import { GuidedStatusCard } from '@/components/ui/guided-status-card';
import { mapWorkflowIssueToGuidance, type GuidedStatusContent } from '@/lib/workflow-guidance';
import { getAIGuidance } from '@/lib/ai-error-guidance';
import { useExecutionNotifications } from '../hooks/useExecutionNotifications';
import { ExecutionResultNotification } from '../components/workflow/ExecutionResultNotification';
import type { ExecutionResult } from '../lib/executionNotifications';

const NodeLibrary = lazy(() => import('@/components/workflow/NodeLibrary'));
const WorkflowCanvas = lazy(() => import('@/components/workflow/WorkflowCanvas'));
const PropertiesPanel = lazy(() => import('@/components/workflow/PropertiesPanel'));
const ExecutionConsole = lazy(() => import('@/components/workflow/ExecutionConsole'));
const DebugPanel = lazy(() => import('@/components/workflow/debug/DebugPanel'));
const WorkflowVersionPanel = lazy(() => import('@/components/workflow/WorkflowVersionPanel'));

type LastResolvedInputsMap = Record<
  string,
  Record<string, { value: unknown; source?: 'static_config' | 'template' | 'deterministic_runtime' | 'runtime_ai'; executionId: string; startedAt: string }>
>;

type ReliabilityUiState = {
  traceId?: string;
  rateLimited?: boolean;
  circuitOpen?: boolean;
  dlqRoutingEnabled?: boolean;
  selfCorrectionTriggered?: boolean;
  lastErrorCode?: string;
};


export default function WorkflowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [executionGuidance, setExecutionGuidance] = useState<GuidedStatusContent | null>(null);
  const [executionNotificationResult, setExecutionNotificationResult] = useState<ExecutionResult | null>(null);
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const [nodeLibraryOpen, setNodeLibraryOpen] = useState(true);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);
  const [lastResolvedInputs, setLastResolvedInputs] = useState<LastResolvedInputsMap>({});
  const [reliabilityStatus, setReliabilityStatus] = useState<ReliabilityUiState | null>(null);
  const [gateDismissed, setGateDismissed] = useState(false);

  const { missingConnections, isLoading: isCheckingConnections } = useWorkflowConnectionStatus(
    id && id !== 'new' ? id : null
  );

  const { debugNodeId } = useDebugStore();
  const hasAutoRun = useRef(false); // Track if we've already auto-run for this workflow load
  const isSavingRef = useRef(false); // Ref-based lock to prevent concurrent handleSave calls
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    setWorkflowId,
    setWorkflowPhase,
    setWorkflowName,
    setIsDirty,
    resetWorkflow,
    resetAllNodeStatuses,
    setActiveExecution,
    clearActiveExecution,
  } = useWorkflowStore();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let cancelled = false;
    const fetchReliabilityDiagnostics = async () => {
      try {
        const response = await fetch(`${ENDPOINTS.itemBackend}/health`);
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled) return;
        const reliability = payload?.reliability || {};
        setReliabilityStatus((prev) => ({
          ...prev,
          circuitOpen: Number(reliability?.circuitBreakers?.open || 0) > 0,
          dlqRoutingEnabled: Boolean(reliability?.dlqMandatoryRouting),
        }));
      } catch {
        // best-effort diagnostics
      }
    };
    void fetchReliabilityDiagnostics();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadWorkflow = useCallback(async (workflowId: string) => {
    setIsLoading(true);
    try {
      // CRITICAL: Reset state first to prevent stale data
      resetWorkflow();
      // Reset auto-run flag when loading a new workflow
      hasAutoRun.current = false;
      
      const { data, error } = await awsClient
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error) throw error;

      if (data) {
        if ((data as any).setup_completed === false) {
          navigate('/workflows', { replace: true });
          return;
        }

        setWorkflowId(data.id);
        setWorkflowPhase((data as any).phase ?? null);
        setWorkflowName(data.name);

        // Step 1: Normalize backend format to frontend format (handle schema differences)
        // ✅ CRITICAL: Check both data.nodes/edges and data.graph.nodes/edges
        // The workflow might be stored in either location depending on when it was saved
        const graphData = typeof data.graph === 'string' ? JSON.parse(data.graph) : data.graph;
        const backendWorkflow = {
          nodes: data.nodes || graphData?.nodes || [],
          edges: data.edges || graphData?.edges || [],
        };

        if (import.meta.env.DEV && backendWorkflow.nodes.length > 0) {
          const sample = backendWorkflow.nodes.slice(0, 5);
          console.log(
            '[WorkflowBuilder][DEV] Raw DB row — position field types (first nodes, before normalize):',
            sample.map((n: any) => ({
              id: n?.id,
              hasPosition: !!n?.position,
              xType: typeof n?.position?.x,
              yType: typeof n?.position?.y,
            }))
          );
        }
        
        // ✅ DEBUG: Log node configs to verify they're present
        console.log('[WorkflowBuilder] Loading workflow with', backendWorkflow.nodes.length, 'nodes');
        backendWorkflow.nodes.forEach((node: any) => {
          const config = node.data?.config || node.config || {};
          const configKeys = Object.keys(config).filter(k => config[k] !== undefined && config[k] !== '');
          if (configKeys.length > 0) {
            console.log(`[WorkflowBuilder] Node ${node.id} (${node.data?.type || node.type}) has config:`, configKeys.join(', '));
          }
        });
        
        // ✅ WORLD-CLASS FIX: Validate node count matches between frontend and backend
        const expectedNodeCount = backendWorkflow.nodes.length;
        if (expectedNodeCount === 0) {
          console.warn('[WorkflowBuilder] ⚠️  Backend workflow has 0 nodes - this may indicate a data loading issue');
        }
        
        const normalizedBackend = normalizeBackendWorkflow(backendWorkflow);
        
        // Step 2: Validate and fix workflow (regenerate IDs, validate types, etc.)
        const normalized = validateAndFixWorkflow({
          nodes: normalizedBackend.nodes,
          edges: normalizedBackend.edges,
        });
        
        // ✅ WORLD-CLASS FIX: Verify node count after normalization
        if (normalized.nodes.length !== expectedNodeCount && expectedNodeCount > 0) {
          console.warn(
            `[WorkflowBuilder] ⚠️  Node count mismatch after normalization: ` +
            `expected ${expectedNodeCount}, got ${normalized.nodes.length}. ` +
            `This may indicate a data integrity issue.`
          );
        }
        
        // Step 3: Enforce render contract to avoid runtime type/handle drift
        const contracted = enforceFrontendRenderContract({
          nodes: normalized.nodes as any[],
          edges: normalized.edges as any[],
        });

        // Step 4: Validate all node types are registered in React Flow
        const typeValidation = validateNodeTypesRegistered(contracted.nodes);
        if (!typeValidation.valid) {
          console.warn('[WorkflowBuilder] ⚠️  Some node types are not registered:', typeValidation.missingTypes);
          console.warn('[WorkflowBuilder]   These nodes may not render correctly. Please register them in WorkflowCanvas.tsx');
        }
        if (typeValidation.warnings.length > 0) {
          console.warn('[WorkflowBuilder] ⚠️  Node type warnings:', typeValidation.warnings);
        }

        // CRITICAL: Validate edges before setting
        const validEdges = contracted.edges.filter(edge => {
          const sourceExists = contracted.nodes.some(n => n.id === edge.source);
          const targetExists = contracted.nodes.some(n => n.id === edge.target);
          
          if (!sourceExists || !targetExists) {
            console.warn(`[EdgeValidation] Removing invalid edge on load: ${edge.source}->${edge.target}`);
            return false;
          }
          return true;
        });

        console.log(`[EdgeDebug] Loaded ${validEdges.length} valid edges from ${contracted.edges.length} total edges`);
        console.log(`[EdgeDebug] Loaded ${contracted.nodes.length} nodes`);

        // CRITICAL: Set nodes and edges atomically to prevent partial state
        setNodes(contracted.nodes);
        setEdges(validEdges);
        setIsDirty(false);
        
        toast({
          title: 'Workflow loaded',
          description: `Successfully loaded "${data.name}"`,
        });
        
        return true; // Return success indicator
      }
      return false;
    } catch (error) {
      console.error('Error loading workflow:', error);
      const loadMsg =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : 'Failed to load workflow';
      getAIGuidance({ code: 'LOAD_FAILED', message: loadMsg }).then(setExecutionGuidance);
      // Reset on error to prevent corrupted state
      resetWorkflow();
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setWorkflowId, setWorkflowPhase, setWorkflowName, setNodes, setEdges, setIsDirty, resetWorkflow]);

  const loadLastResolvedInputs = useCallback(async (workflowId: string) => {
    try {
      const { data: sessionData } = await awsClient.auth.getSession();
      const response = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${workflowId}/last-resolved-inputs`, {
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData?.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      setLastResolvedInputs(data?.values || {});
    } catch (error) {
      console.warn('[WorkflowBuilder] Failed to load last resolved inputs:', error);
    }
  }, []);

  // Load workflow if editing - only reset for new workflows
  // CRITICAL: This effect must run whenever the route ID changes
  useEffect(() => {
    if (!user) return; // Wait for auth
    
    // Reset auto-run flag and execution error state when workflow ID changes
    hasAutoRun.current = false;
    setReliabilityStatus(null);
    setExecutionGuidance(null);
    setGateDismissed(false);

    if (id && id !== 'new') {
      // Check if we're already loading this workflow to prevent duplicate loads
      const currentWorkflowId = useWorkflowStore.getState().workflowId;
      if (currentWorkflowId !== id) {
        loadWorkflow(id);
      }
      loadLastResolvedInputs(id);
    } else if (id === 'new') {
      resetWorkflow();
      setLastResolvedInputs({});
    }
  }, [id, user, loadWorkflow, resetWorkflow, loadLastResolvedInputs]);

  // Sync missing connections count to global store so AppSidebar can show a badge
  useEffect(() => {
    useWorkflowStore.getState().setWorkflowConnectionAlertCount(missingConnections.length);
    if (missingConnections.length > 0) setGateDismissed(false);
    return () => { useWorkflowStore.getState().setWorkflowConnectionAlertCount(0); };
  }, [missingConnections.length]);

  // Auto-run workflow if autoRun parameter is present (for AI-generated workflows)
  // Note: This useEffect is moved after handleRun definition to avoid initialization order issues

  const handleSave = useCallback(async () => {
    if (!user) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    setIsSaving(true);
    let saveSucceeded = false;
    try {
      // Validate edges before saving
      const validEdges = edges.filter(edge => {
        const sourceExists = nodes.some(n => n.id === edge.source);
        const targetExists = nodes.some(n => n.id === edge.target);
        
        if (!sourceExists || !targetExists) {
          console.warn(`[EdgeValidation] Removing invalid edge on save: ${edge.source}->${edge.target}`);
          return false;
        }
        return true;
      });

      console.log(`[EdgeDebug] Saving ${validEdges.length} valid edges (from ${edges.length} total)`);

      // ✅ CRITICAL: Normalize graph before saving
      // - Deduplicate edges
      // - Normalize node configs (e.g., If/Else condition -> conditions)
      // - Remove invalid edges
      const { normalizeWorkflowGraph } = await import('@/lib/graphNormalizer');
      const normalized = normalizeWorkflowGraph(nodes, validEdges);
      
      if (normalized.warnings.length > 0) {
        console.warn('[WorkflowBuilder] Graph normalization warnings:', normalized.warnings);
      }
      if (normalized.errors.length > 0) {
        console.error('[WorkflowBuilder] Graph normalization errors:', normalized.errors);
        throw new Error(`Graph validation failed: ${normalized.errors.join(', ')}`);
      }

      // ✅ CRITICAL: Validate workflow topology before saving
      const { validateWorkflowGraph } = await import('@/lib/workflowGraphValidator');
      const validation = validateWorkflowGraph(normalized.nodes, normalized.edges);
      
      if (!validation.valid) {
        const errorMessages = validation.errors.map(e => e.message).join('; ');
        console.error('[WorkflowBuilder] Workflow validation failed:', validation.errors);
        getAIGuidance({ code: 'WORKFLOW_VALIDATION_FAILED', message: errorMessages }).then(setExecutionGuidance);
        throw new Error(`Workflow validation failed: ${errorMessages}`);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('[WorkflowBuilder] Workflow validation warnings:', validation.warnings);
      }

      const workflowData = {
        name: useWorkflowStore.getState().workflowName,
        nodes: normalized.nodes as unknown as Json,
        edges: normalized.edges as unknown as Json, // Normalized edges (deduplicated, validated)
        graph: { nodes: normalized.nodes, edges: normalized.edges } as unknown as Json,
        settings: {} as unknown as Json,
        schema_version: 2,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      const workflowId = useWorkflowStore.getState().workflowId;

      let savedWorkflowId = workflowId;
      
      // ✅ CRITICAL: If workflow has nodes and edges, set status to 'active'
      // Don't set phase here - let attach-inputs endpoint handle phase transitions
      // This prevents phase conflicts when attach-inputs is called after save
      const hasNodes = nodes.length > 0;
      const hasEdges = validEdges.length > 0;
      const isReady = hasNodes && (hasEdges || nodes.length === 1); // Single node workflows don't need edges
      
      if (isReady) {
        // Set status to 'active' (valid enum value) - phase will be set by attach-inputs
        (workflowData as any).status = 'active';
        // Don't set phase - let attach-inputs handle it based on workflow state
      }
      
      if (savedWorkflowId) {
        const { error } = await awsClient
          .from('workflows')
          .update(workflowData)
          .eq('id', savedWorkflowId);

        if (error) throw error;
      } else {
        const { data, error } = await awsClient
          .from('workflows')
          .insert(workflowData)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          savedWorkflowId = data.id;
          setWorkflowId(data.id);
          navigate(`/workflow/${data.id}`, { replace: true });
        }
      }

      // ✅ CRITICAL: After saving, automatically attach inputs and set status to ready_for_execution
      if (savedWorkflowId) {
        try {
          // Yield so React/Zustand can flush saved graph state before attach-inputs (avoids racing a thin snapshot).
          await new Promise((r) => setTimeout(r, 80));

          const { data: currentSessionData } = await awsClient.auth.getSession();
          
          // Extract inputs from current nodes
          const inputsToAttach: Record<string, Record<string, any>> = {};
          
          nodes.forEach((node: any) => {
            const nodeConfig = node.data?.config || {};
            const nodeInputs = extractNodeConfigForAttachInputs(nodeConfig as Record<string, unknown>) as Record<
              string,
              any
            >;

            if (Object.keys(nodeInputs).length > 0) {
              inputsToAttach[node.id] = nodeInputs;
            }
          });
          
          // Attach inputs if any exist
          if (Object.keys(inputsToAttach).length > 0) {
            const attachRecentlyPersisted = wasAttachInputsPayloadRecentlyPersisted(savedWorkflowId, inputsToAttach);
            if (attachRecentlyPersisted) {
              console.log('[handleSave] Attach inputs payload already persisted recently, skipping duplicate call');
            } else {
              console.log('[handleSave] Auto-attaching inputs after save:', inputsToAttach);
              
              const attachInputsResponse = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${savedWorkflowId}/attach-inputs`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(currentSessionData?.session?.access_token
                    ? { Authorization: `Bearer ${currentSessionData.session.access_token}` }
                    : {}),
                },
                body: JSON.stringify({
                  inputs: inputsToAttach,
                }),
              });
              
              if (attachInputsResponse.ok) {
                console.log('[handleSave] ✅ Inputs attached successfully');
                markAttachInputsPayloadPersisted(savedWorkflowId, inputsToAttach);
                await attachInputsResponse.json();
              } else {
                const attachError = await attachInputsResponse.json().catch(() => ({ error: 'Failed to attach inputs' }));

                // PHASE_LOCKED / INVALID_PHASE means the workflow is already configured — silent, non-fatal.
                if (attachError.code === 'PHASE_LOCKED' ||
                    attachError.code === 'INVALID_PHASE' ||
                    (attachError.currentPhase && ['ready_for_execution', 'executing'].includes(attachError.currentPhase))) {
                  console.log('[handleSave] Workflow already configured, skipping input attachment');
                } else {
                  // Any other attach-inputs failure is surfaced to the user.
                  console.warn('[handleSave] Failed to auto-attach inputs:', attachError);
                  getAIGuidance({ code: 'ATTACH_INPUTS_FAILED', message: 'Workflow inputs could not be updated', operation: 'save' } as any).then(setExecutionGuidance);
                }
              }
            }
          } else {
            // No inputs to attach, but we can still set status to ready_for_execution if no credentials needed
            console.log('[handleSave] No inputs to attach, checking if workflow can be set to ready');
            
            // Try to set status directly to ready_for_execution
            const { data: currentSessionDataForCheck } = await awsClient.auth.getSession();
            const checkCredsResponse = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${savedWorkflowId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(currentSessionDataForCheck?.session?.access_token
                  ? { Authorization: `Bearer ${currentSessionDataForCheck.session.access_token}` }
                  : {}),
              },
            });
            
            if (checkCredsResponse.ok) {
              await checkCredsResponse.json();
              // If workflow has no credential requirements, we could set it to ready_for_execution
              // But for now, let execute-workflow handle the status update
            }
          }
        } catch (attachError) {
          console.warn('[handleSave] Error auto-attaching inputs (non-fatal):', attachError);
          // Continue - workflow is saved, inputs can be attached later
        }
      }

      saveSucceeded = true;
      toast({
        title: 'Saved',
        description: 'Workflow saved and configured successfully',
      });
    } catch (error) {
      console.error('Error saving workflow:', error);
      const saveMsg =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : 'Failed to save workflow';
      getAIGuidance({ code: 'SAVE_FAILED', message: saveMsg, operation: 'save' } as any).then(setExecutionGuidance);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
      if (saveSucceeded) setIsDirty(false);
    }
  }, [nodes, edges, user, navigate, setWorkflowId, setIsDirty]);

  const handleImportWorkflow = useCallback((workflowData: { name?: string; nodes?: unknown[]; edges?: unknown[] }) => {
    try {
      // Validate workflow structure
      if (!workflowData.nodes || !workflowData.edges) {
        throw new Error('Invalid workflow format: missing nodes or edges');
      }

      // CRITICAL: Reset state first to prevent stale data
      resetWorkflow();

      // Set workflow name
      if (workflowData.name) {
        setWorkflowName(workflowData.name);
      }

      // CRITICAL: Normalize and regenerate IDs to ensure uniqueness
      // This prevents duplicate ID collisions when importing workflows
      const normalized = validateAndFixWorkflow({
        nodes: workflowData.nodes || [],
        edges: workflowData.edges || []
      });
      const contracted = enforceFrontendRenderContract({
        nodes: normalized.nodes,
        edges: normalized.edges,
      });

      // Set nodes and edges atomically
      setNodes(contracted.nodes);
      setEdges(contracted.edges);
      setIsDirty(true);

      toast({
        title: 'Success',
        description: 'Workflow imported successfully',
      });
    } catch (error) {
      console.error('Error importing workflow:', error);
      getAIGuidance({ code: 'IMPORT_FAILED', message: error instanceof Error ? error.message : 'Failed to import workflow' }).then(setExecutionGuidance);
      // Reset on error to prevent corrupted state
      resetWorkflow();
    }
  }, [setWorkflowName, setNodes, setEdges, setIsDirty, resetWorkflow]);

  // ---------------------------------------------------------------------------
  // Execution notification helpers
  // ---------------------------------------------------------------------------

  /** Maps the raw API response + current node statuses into the ExecutionResult shape. */
  const buildExecutionNotificationResult = useCallback(
    (data: any, currentNodes: typeof nodes): ExecutionResult => {
      const uiNodeStatuses: Record<string, string> = {};
      currentNodes.forEach((n: any) => {
        const status = n.data?.status;
        if (status) uiNodeStatuses[n.id] = status;
      });
      return {
        id: data.executionId ?? data.id ?? `exec-${Date.now()}`,
        status: data.status ?? 'failed',
        logs: data.logs ?? data.nodeLogs ?? null,
        error: data.error ?? null,
        uiNodeStatuses,
      };
    },
    [],
  );

  /** Reloads execution console data; fires stuck notification if refresh takes > 5 s. */
  const handleRefresh = useCallback(() => {
    const timeoutId = setTimeout(() => {
      setExecutionNotificationResult({
        id: `stuck-${Date.now()}`,
        status: 'success',
        logs: null,
        uiNodeStatuses: { _stuck: 'running' },
      });
    }, 5000);

    // Signal the console to reload
    window.dispatchEvent(new CustomEvent('workflow-execution-refresh'));

    // Resolve the timeout when the console confirms it has refreshed
    const onRefreshed = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('workflow-execution-refreshed', onRefreshed);
    };
    window.addEventListener('workflow-execution-refreshed', onRefreshed);
  }, []);

  // Listen for terminal execution events dispatched by ExecutionConsole
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const execution = customEvent.detail?.execution;
      if (!execution) return;
      setExecutionNotificationResult({
        id: execution.id ?? `exec-${Date.now()}`,
        status: execution.status ?? 'failed',
        logs: execution.logs ?? execution.node_logs ?? null,
        error: execution.error ?? null,
      });
      setIsRunning(false);
      setActiveExecutionId(null);
      clearActiveExecution();
    };
    window.addEventListener('workflow-execution-terminal', handler);
    return () => window.removeEventListener('workflow-execution-terminal', handler);
  }, []);

  /** Dismiss a notification by clearing the result (the hook will return []). */
  const handleDismiss = useCallback((_notificationId: string) => {
    setExecutionNotificationResult(null);
  }, []);

  const notificationConfigs = useExecutionNotifications(executionNotificationResult, {
    onViewLogs: (nodeId?: string) => {
      setConsoleExpanded(true);
      if (nodeId) {
        // Scroll the console to the specific node log
        window.dispatchEvent(new CustomEvent('workflow-console-scroll-to-node', { detail: { nodeId } }));
      }
    },
    onReconnect: (service: string) => {
      navigate(`/connections?service=${encodeURIComponent(service)}`);
    },
    onRefresh: handleRefresh,
    onDismiss: handleDismiss,
  });
  const shouldShowReliabilityStatus = Boolean(
    reliabilityStatus &&
      (reliabilityStatus.traceId ||
        reliabilityStatus.rateLimited ||
        reliabilityStatus.circuitOpen ||
        reliabilityStatus.dlqRoutingEnabled === false ||
        reliabilityStatus.selfCorrectionTriggered ||
        reliabilityStatus.lastErrorCode)
  );

  const handleRun = useCallback(async (autoSave = false) => {
    setExecutionGuidance(null);
    // Show loading immediately on click — before any async work — so the user
    // gets feedback within a frame rather than waiting 1-2 s for validation.
    setIsRunning(true);
    const workflowId = useWorkflowStore.getState().workflowId;

    if (nodes.length === 0) {
      getAIGuidance({ code: 'EMPTY_WORKFLOW', message: 'No nodes in workflow' }).then(setExecutionGuidance);
      setIsRunning(false);
      return;
    }

    // Auto-save if needed and requested
    if (autoSave && (!workflowId || useWorkflowStore.getState().isDirty)) {
      if (!user) { setIsRunning(false); return; }
      
      try {
        setIsSaving(true);
        
        // ✅ CRITICAL: Use /api/save-workflow endpoint instead of a direct DB update
        // This ensures cache invalidation and graph hash logging happen
        const { normalizeWorkflowGraph } = await import('@/lib/graphNormalizer');
        const normalized = normalizeWorkflowGraph(nodes, edges);
        
        const { data: sessionData } = await awsClient.auth.getSession();
        const saveResponse = await fetch(`${ENDPOINTS.itemBackend}/api/save-workflow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionData?.session?.access_token
              ? { Authorization: `Bearer ${sessionData.session.access_token}` }
              : {}),
          },
          body: JSON.stringify({
            workflowId: workflowId || undefined,
            name: useWorkflowStore.getState().workflowName,
            nodes: normalized.nodes,
            edges: normalized.edges,
            user_id: user.id,
          }),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({ error: 'Save failed' }));
          // errorData.message carries the specific validation reasons (e.g. "Cannot save
          // workflow: operation is required"); errorData.error is just the generic label
          // ("Workflow validation failed") and was masking the useful part.
          throw new Error(errorData.message || errorData.error || 'Failed to save workflow');
        }

        const saveResult = await saveResponse.json();
        const savedWorkflowId = saveResult.workflowId || workflowId;

        if (!savedWorkflowId) {
          throw new Error('Failed to get workflow ID after save');
        }

        // Update workflow ID in store if it's a new workflow
        if (!workflowId && savedWorkflowId) {
          setWorkflowId(savedWorkflowId);
          navigate(`/workflow/${savedWorkflowId}`, { replace: true });
        }

        setIsDirty(false);
        console.log(`[handleRun] ✅ Auto-saved workflow via /api/save-workflow - ID: ${savedWorkflowId}`);
      } catch (error) {
        console.error('Error auto-saving workflow:', error);
        getAIGuidance({ code: 'SAVE_FAILED', message: 'Workflow could not be saved', operation: 'save' } as any).then(setExecutionGuidance);
        setIsSaving(false);
        setIsRunning(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    const finalWorkflowId = useWorkflowStore.getState().workflowId;
    if (!finalWorkflowId) {
      getAIGuidance({ code: 'SAVE_REQUIRED', message: 'Workflow must be saved before running', operation: 'save' } as any).then(setExecutionGuidance);
      setIsRunning(false);
      return;
    }

    let workflowCheckForRun: { id: string; name?: string | null; status?: string | null; phase?: string | null } | null = null;
    // Verify workflow exists in database before execution
    try {
      const { data: workflowCheck, error: checkError } = await awsClient
        .from('workflows')
        .select('id, name, status, phase')
        .eq('id', finalWorkflowId)
        .single();

      if (checkError || !workflowCheck) {
        console.error('[execute-workflow] Workflow not found in database:', checkError);
        getAIGuidance({ code: 'WORKFLOW_NOT_FOUND', message: 'The workflow may not be saved yet', operation: 'save' } as any).then(setExecutionGuidance);
        return;
      }

      workflowCheckForRun = workflowCheck;
      console.log('[execute-workflow] Workflow verified in database:', { id: workflowCheck.id, name: workflowCheck.name });
    } catch (verifyError) {
      console.error('[execute-workflow] Error verifying workflow:', verifyError);
      getAIGuidance({ code: 'VERIFICATION_ERROR', message: 'Could not verify workflow', operation: 'save' } as any).then(setExecutionGuidance);
      return;
    }

    // CRITICAL: Prevent manual execution when schedule is active
    const { workflowScheduler } = await import('@/lib/workflowScheduler');
    if (workflowScheduler.isScheduled(finalWorkflowId)) {
      toast({
        title: 'Schedule is active',
        description: 'Manual Run is disabled when a schedule is active. The workflow is running automatically.',
        variant: 'default',
      });
      setIsRunning(false);
      return;
    }

    // ✅ CRITICAL: Validate workflow before running
    // This provides immediate feedback and prevents invalid workflows from being sent to backend
    try {
      const { normalizeWorkflowGraph } = await import('@/lib/graphNormalizer');
      const { validateWorkflowGraph } = await import('@/lib/workflowGraphValidator');
      
      const normalized = normalizeWorkflowGraph(nodes, edges);
      if (normalized.errors.length > 0) {
        getAIGuidance({ code: 'GRAPH_VALIDATION_FAILED', message: normalized.errors.join(', ') }).then(setExecutionGuidance);
        return;
      }

      const validation = validateWorkflowGraph(normalized.nodes, normalized.edges);
      if (!validation.valid) {
        const errorMessages = validation.errors.map(e => e.message).join('; ');
        getAIGuidance({ code: 'WORKFLOW_VALIDATION_FAILED', message: errorMessages }).then(setExecutionGuidance);
        setIsRunning(false);
        return;
      }
    } catch (validationError: any) {
      console.error('[WorkflowBuilder] Validation error:', validationError);
      getAIGuidance({ code: 'VALIDATION_ERROR', message: validationError?.message || 'Failed to validate workflow' }).then(setExecutionGuidance);
      setIsRunning(false);
      return;
    }

    // Check if workflow has a form trigger node
    const formNode = nodes.find((node: any) => node.data?.type === 'form');
    const testInput: any = {};

    if (formNode) {
      // For Form Trigger nodes, check if workflow is active
      try {
        const { data: workflowData, error: workflowError } = await awsClient
          .from('workflows')
          .select('status')
          .eq('id', finalWorkflowId)
          .single();

        if (workflowError) {
          console.error('Error checking workflow status:', workflowError);
          getAIGuidance({ code: 'STATUS_CHECK_ERROR', message: 'Failed to check workflow status' }).then(setExecutionGuidance);
          return;
        }

        if (!workflowData) {
          console.error('Workflow data not found');
          getAIGuidance({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found', operation: 'save' } as any).then(setExecutionGuidance);
          return;
        }

        const isActive = workflowData.status === 'active';
        console.log('Workflow status check:', { workflowId: finalWorkflowId, status: workflowData.status, isActive });
        const formUrl =
          buildFormPublicUrl(finalWorkflowId, nodes) ??
          `${window.location.origin}/form/${finalWorkflowId}/${formNode.id}`;

        if (!isActive) {
          // Workflow is not active - show activation message
          toast({
            title: 'Form Trigger Detected',
            description: `Form Trigger is a blocking trigger. Activate the workflow to start waiting for form submissions. Form URL: ${formUrl}`,
            duration: 10000,
          });

          // Expand console to show form URL
          if (!consoleExpanded) {
            setConsoleExpanded(true);
          }

          // Don't execute workflow manually - Form Trigger must wait for submission
          // User should activate workflow instead, which will put execution in WAITING state
          return;
        } else {
          // Workflow is active - create a waiting execution
          toast({
            title: 'Form Trigger Active',
            description: 'Workflow is active and waiting for form submissions. Creating waiting execution...',
          });

          // Expand console to show the waiting execution
          if (!consoleExpanded) {
            setConsoleExpanded(true);
          }

          // For active form triggers, call execute-workflow which will handle creating the waiting execution
          // The execute-workflow function detects form triggers and sets status to 'waiting'
          setIsRunning(true);
          try {
            const { data: sessionData } = await awsClient.auth.getSession();
            const response = await fetch(`${ENDPOINTS.itemBackend}/api/execute-workflow`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(sessionData?.session?.access_token
                  ? { Authorization: `Bearer ${sessionData.session.access_token}` }
                  : {}),
              },
              body: JSON.stringify({
                workflowId: finalWorkflowId,
                input: {},
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Failed to start workflow' }));
              const errorMessage = errorData.error || errorData.message || 'Failed to start workflow';
              const errorCode = errorData.code || 'UNKNOWN_ERROR';
              const errorDetails = errorData.details ? JSON.stringify(errorData.details, null, 2) : '';
              const errorHint = errorData.hint || '';
              setReliabilityStatus((prev) => ({
                ...prev,
                traceId: response.headers.get('x-trace-id') || undefined,
                rateLimited: response.status === 429,
                lastErrorCode: errorCode,
              }));
              
              // ✅ CRITICAL: Log full error details for debugging
              console.error('[execute-workflow] ❌ Error response:', {
                status: response.status,
                code: errorCode,
                error: errorMessage,
                message: errorData.message,
                phase: errorData.phase,
                persistedStatus: errorData.persistedStatus,
                details: errorData.details,
                hint: errorHint,
                fullError: errorData
              });
              
              getAIGuidance(
                { code: errorCode, message: errorMessage, hint: errorHint, details: errorData.details },
                { phase: errorData.phase }
              ).then(setExecutionGuidance);
              return;
            }

            setReliabilityStatus((prev) => ({
              ...prev,
              traceId: response.headers.get('x-trace-id') || undefined,
              rateLimited: false,
              lastErrorCode: undefined,
            }));

            toast({
              title: 'Waiting for Form Submission',
              description: `Workflow is now active and waiting for form submissions. Form URL: ${formUrl}`,
              duration: 8000,
            });
          } catch (error) {
            console.error('Error invoking execute-workflow:', error);
            getAIGuidance({ code: 'EXECUTION_START_FAILED', message: error instanceof Error ? error.message : 'Failed to start workflow' }).then(setExecutionGuidance);
          } finally {
            setIsRunning(false);
          }

          return;
        }
      } catch (error) {
        console.error('Error checking workflow status:', error);
        getAIGuidance({ code: 'STATUS_CHECK_ERROR', message: 'Failed to check workflow status' }).then(setExecutionGuidance);
        return;
      }
    }

    // ✅ CRITICAL: Auto-attach inputs from current workflow state before executing
    // This ensures workflow status moves from "draft" to "ready_for_execution"
    // NOTE: This operates on a CLONE of the graph - does not mutate React state
    // ✅ RUNTIME SAFETY: Auto-attach never mutates the original graph
    try {
      const { data: sessionData } = await awsClient.auth.getSession();
      
      // ✅ CRITICAL: Deep clone graph before any operations
      // This ensures auto-attach never mutates the original React state
      const clonedNodes = JSON.parse(JSON.stringify(nodes));
      const clonedEdges = JSON.parse(JSON.stringify(edges));
      
      // ✅ CRITICAL: Normalize graph before extracting inputs (ensures consistent format)
      const { normalizeWorkflowGraph } = await import('@/lib/graphNormalizer');
      const normalized = normalizeWorkflowGraph(clonedNodes, clonedEdges);
      
      // Extract inputs from normalized nodes (clone, not original)
      const inputsToAttach: Record<string, Record<string, any>> = {};
      
      normalized.nodes.forEach((node: any) => {
        const nodeConfig = node.data?.config || {};
        const nodeInputs: Record<string, any> = {};
        
        // ✅ CRITICAL: Handle If/Else conditions array format
        if (node.data?.type === 'if_else' && nodeConfig.conditions) {
          // If/Else: save conditions array as-is (already normalized)
          if (Array.isArray(nodeConfig.conditions) && nodeConfig.conditions.length > 0) {
            nodeInputs.conditions = nodeConfig.conditions;
          }
        } else {
          const extracted = extractNodeConfigForAttachInputs(nodeConfig as Record<string, unknown>);
          Object.keys(extracted).forEach((key) => {
            const value = extracted[key];
            if (value === undefined || value === null || value === '') return;
            if (key.startsWith('_')) {
              nodeInputs[key] = value;
              return;
            }
            if (key.includes('credential') || key.includes('oauth')) return;
            nodeInputs[key] = value;
          });
        }
        
        // Only add node if it has inputs
        if (Object.keys(nodeInputs).length > 0) {
          inputsToAttach[node.id] = nodeInputs;
        }
      });
      
      console.log('[execute-workflow] ✅ Auto-attach operating on cloned graph (immutable)');
      
      const workflowReadyForExecution = ['ready_for_execution', 'active', 'ready'].includes(
        String(workflowCheckForRun?.phase || workflowCheckForRun?.status || '').toLowerCase()
      );
      const shouldAttachBeforeRun =
        Object.keys(inputsToAttach).length > 0 &&
        (useWorkflowStore.getState().isDirty || !workflowReadyForExecution);

      // Attach inputs only when local config changed or the persisted workflow is not ready yet.
      if (shouldAttachBeforeRun) {
        if (wasAttachInputsPayloadRecentlyPersisted(finalWorkflowId, inputsToAttach)) {
          console.log('[execute-workflow] Attach inputs payload already persisted recently, skipping duplicate call');
        } else {
        console.log('[execute-workflow] Auto-attaching inputs before execution:', inputsToAttach);
        
        const attachInputsResponse = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${finalWorkflowId}/attach-inputs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionData?.session?.access_token
              ? { Authorization: `Bearer ${sessionData.session.access_token}` }
              : {}),
          },
          body: JSON.stringify({
            inputs: inputsToAttach,
          }),
        });
        
        if (!attachInputsResponse.ok) {
          const attachError = await attachInputsResponse.json().catch(() => ({ error: 'Failed to attach inputs' }));
          
          // ✅ CRITICAL: Check if error is due to phase locking (workflow already configured)
          // If workflow is already in ready_for_execution, skip attach and proceed to execution
          if (attachError.code === 'PHASE_LOCKED' || 
              attachError.code === 'INVALID_PHASE' ||
              (attachError.currentPhase && ['ready_for_execution', 'executing'].includes(attachError.currentPhase))) {
            console.log('[execute-workflow] Workflow already configured, skipping input attachment:', attachError.currentPhase);
            // Continue to execution - workflow is already ready
          } else {
            console.warn('[execute-workflow] Failed to auto-attach inputs:', attachError);
            // Continue anyway - execution endpoint will show the actual error
          }
        } else {
          console.log('[execute-workflow] ✅ Inputs attached successfully');
          markAttachInputsPayloadPersisted(finalWorkflowId, inputsToAttach);
        }
        }
      } else {
        console.log('[execute-workflow] Skipping attach-inputs before run (unchanged payload or workflow already ready)');
      }
    } catch (attachError) {
      console.warn('[execute-workflow] Error auto-attaching inputs (non-fatal):', attachError);
      // Continue anyway - execution endpoint will show the actual error
    }

    // Reset all node statuses to 'idle' before starting new execution
    resetAllNodeStatuses();

    // Expand console to show logs
    if (!consoleExpanded) {
      setConsoleExpanded(true);
    }

    toast({
      title: 'Running workflow',
      description: 'Execution started...',
    });

    try {
      const { data: sessionData } = await awsClient.auth.getSession();
      const response = await fetch(`${ENDPOINTS.itemBackend}/api/distributed-execute-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData?.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          workflowId: finalWorkflowId,
          useQueue: true,
          input: {
            ...testInput,
            _trigger: 'manual',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Execution failed' }));
        const errorMessage = errorData.error || errorData.message || 'Execution failed';
        const errorCode = errorData.code || 'UNKNOWN_ERROR';
        const errorDetails = errorData.details ? JSON.stringify(errorData.details, null, 2) : '';
        const errorHint = errorData.hint || '';
        setReliabilityStatus((prev) => ({
          ...prev,
          traceId: response.headers.get('x-trace-id') || undefined,
          rateLimited: response.status === 429,
          selfCorrectionTriggered:
            typeof errorMessage === 'string' &&
            (errorMessage.includes('self-repair') || errorMessage.includes('OUTPUT_VALIDATION_FAILED')),
          lastErrorCode: errorCode,
        }));
        
        // ✅ CRITICAL: Log full error details for debugging
        console.error('[execute-workflow] ❌ Error response:', {
          status: response.status,
          code: errorCode,
          error: errorMessage,
          message: errorData.message,
          phase: errorData.phase,
          persistedStatus: errorData.persistedStatus,
          details: errorData.details,
          hint: errorHint,
          fullError: errorData
        });
        
        getAIGuidance(
          { code: errorCode, message: errorMessage, hint: errorHint, details: errorData.details },
          { phase: errorData.phase }
        ).then(setExecutionGuidance);
        setIsRunning(false);
        return;
      }

      const data = await response.json();
      setReliabilityStatus((prev) => ({
        ...prev,
        traceId: response.headers.get('x-trace-id') || undefined,
        rateLimited: false,
        selfCorrectionTriggered: JSON.stringify(data || {}).includes('_selfValidation'),
        lastErrorCode: undefined,
      }));

      const executionId = data.executionId || data.execution_id;
      if (executionId) {
        setActiveExecutionId(executionId);
        const isQueued = response.status === 202 || data.status === 'queued';
        setActiveExecution({
          executionId,
          workflowId: finalWorkflowId,
          status: isQueued ? 'queued' : data.status === 'success' ? 'success' : 'running',
          progress: 0,
          currentStep: null,
          errorMessage: null,
        });
      }

      window.dispatchEvent(new CustomEvent('workflow-execution-started', {
        detail: { executionId, workflowId: finalWorkflowId }
      }));

      toast({
        title: data.status === 'queued' ? 'Execution started' : data.status === 'success' ? 'Execution complete' : data.status === 'waiting' ? 'Waiting for form submission' : 'Execution started',
        description: data.status === 'queued'
          ? 'Workflow is running in the background. The execution console will update live.'
          : data.status === 'success'
          ? `Completed in ${data.durationMs}ms`
          : data.status === 'waiting'
          ? `Workflow paused at form node. Form URL: ${data.formUrl || 'N/A'}`
          : data.error || 'Execution started',
        variant: 'default',
        duration: data.status === 'waiting' ? 10000 : 5000,
      });

      if (data.status && !['queued', 'success', 'waiting', 'started'].includes(data.status)) {
        getAIGuidance({
          code: data.code,
          message: data.error || 'Execution could not be completed.',
          details: data.details,
        }).then(setExecutionGuidance);
      } else {
        setExecutionGuidance(null);
      }

      // Don't navigate away - logs will show in console
      // The ExecutionConsole component will auto-update via realtime subscription
    } catch (error) {
      console.error('Execution error:', error);
      const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to execute workflow';
      getAIGuidance({ code: 'EXECUTION_ERROR', message: errorMessage }).then(setExecutionGuidance);
    } finally {
      // Async execution stays "running" until ExecutionConsole emits a terminal event.
    }
  }, [nodes, consoleExpanded, resetAllNodeStatuses]);

  const handleCancel = useCallback(async () => {
    if (!activeExecutionId) return;
    // Optimistic update — reflect cancelled state immediately before the network call
    const cancelledExecutionId = activeExecutionId;
    setIsRunning(false);
    setActiveExecutionId(null);
    try {
      const { data: sessionData } = await awsClient.auth.getSession();
      const res = await fetch(`${ENDPOINTS.itemBackend}/api/executions/${cancelledExecutionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData?.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
      });
      if (res.ok) {
        toast({ title: 'Execution cancelled' });
      } else {
        // Rollback optimistic update on failure
        setIsRunning(true);
        setActiveExecutionId(cancelledExecutionId);
        const err = await res.json().catch(() => ({}));
        getAIGuidance({ code: 'CANCEL_FAILED', message: err.error || 'Could not cancel the execution' }).then(setExecutionGuidance);
      }
    } catch {
      // Rollback optimistic update on network error
      setIsRunning(true);
      setActiveExecutionId(cancelledExecutionId);
      getAIGuidance({ code: 'CANCEL_FAILED', message: 'Network error cancelling execution' }).then(setExecutionGuidance);
    }
  }, [activeExecutionId]);

  // Auto-run workflow if autoRun parameter is present (for AI-generated workflows)
  // Moved here after handleRun is defined to avoid initialization order issues
  useEffect(() => {
    // Only run if:
    // 1. User is authenticated
    // 2. Workflow is loaded (not loading, has nodes)
    // 3. autoRun parameter is present
    // 4. We haven't already auto-run for this workflow
    if (!user || isLoading || nodes.length === 0) return;
    
    const autoRunParam = searchParams.get('autoRun');
    const currentWorkflowId = useWorkflowStore.getState().workflowId;
    
    if (autoRunParam === 'true' && currentWorkflowId === id && !hasAutoRun.current) {
      hasAutoRun.current = true;
      // Remove the autoRun parameter from URL to prevent re-running on refresh
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('autoRun');
      setSearchParams(newSearchParams, { replace: true });
      
      // Small delay to ensure workflow state is fully set
      setTimeout(() => {
        handleRun(false);
      }, 100);
    }
  }, [user, isLoading, nodes.length, searchParams, setSearchParams, id, handleRun]);

  const onDragStart = useCallback((event: React.DragEvent, nodeType: NodeTypeDefinition) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <WorkflowHeader
        onSave={handleSave}
        onRun={handleRun}
        isSaving={isSaving}
        isRunning={isRunning}
        onImport={handleImportWorkflow}
        onCancel={activeExecutionId ? handleCancel : undefined}
        missingConnectionsCount={missingConnections.length}
        missingConnections={missingConnections.map(c => ({ provider: c.provider, displayName: c.displayName }))}
      />
      {!gateDismissed && id && id !== 'new' && (missingConnections.length > 0 || isCheckingConnections) && (
        <WorkflowConnectionGate
          missingConnections={missingConnections}
          workflowId={id}
          workflowName={useWorkflowStore.getState().workflowName}
          isLoading={isCheckingConnections && missingConnections.length === 0}
          onDismiss={() => setGateDismissed(true)}
        />
      )}
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-muted-foreground">Loading workflow editor...</p>
            </div>
          </div>
        }
      >
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden relative">
          {!debugNodeId && shouldShowReliabilityStatus && reliabilityStatus && (
            <div className="absolute left-1/2 top-4 z-[70] w-[min(520px,calc(100%-2rem))] -translate-x-1/2">
              <div className="rounded-md border border-border bg-background/95 p-3 text-xs text-muted-foreground shadow-sm backdrop-blur">
                <div className="mb-1 font-medium text-foreground">Reliability status</div>
                {reliabilityStatus.traceId && <div>Trace ID: {reliabilityStatus.traceId}</div>}
                {reliabilityStatus.rateLimited && <div>Rate limit: throttled</div>}
                {reliabilityStatus.circuitOpen && <div>Circuit breakers: open circuit detected</div>}
                {reliabilityStatus.dlqRoutingEnabled === false && <div>DLQ routing: disabled</div>}
                {reliabilityStatus.selfCorrectionTriggered && <div>Self-correction: triggered</div>}
                {reliabilityStatus.lastErrorCode && <div>Last error code: {reliabilityStatus.lastErrorCode}</div>}
              </div>
            </div>
          )}
          {!debugNodeId && (executionGuidance || notificationConfigs.length > 0) && (
            <div className="absolute right-4 top-4 z-[70] w-[min(520px,calc(100%-2rem))] flex flex-col gap-3">
              {executionGuidance && (
                <GuidedStatusCard
                  title={executionGuidance.title}
                  description={executionGuidance.description}
                  resolution={executionGuidance.resolution}
                  details={executionGuidance.details}
                  missingItems={executionGuidance.missingItems}
                  nextSteps={executionGuidance.nextSteps}
                  tone={executionGuidance.tone}
                  onDismiss={() => setExecutionGuidance(null)}
                />
              )}
              <ExecutionResultNotification configs={notificationConfigs} onDismiss={handleDismiss} />
            </div>
          )}
          <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
            {/* Left Panel - Node Library */}
            {nodeLibraryOpen ? (
              <div className="relative w-[360px] shrink-0 overflow-hidden border-r border-border/60">
                <NodeLibrary
                  onDragStart={onDragStart}
                  onClose={() => setNodeLibraryOpen(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setNodeLibraryOpen(true)}
                className={cn(
                  "w-8 flex items-center justify-center border-r border-border/60",
                  "hover:bg-muted/30 transition-colors duration-150",
                  "group"
                )}
                title="Open Node Library"
                aria-label="Open Node Library"
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground/60 transition-colors duration-150" />
              </button>
            )}

            {/* Central Canvas Area */}
            <div className="relative h-full min-h-0 min-w-0 flex-[1_1_0%] overflow-hidden">
              <WorkflowCanvas />
              {/* Version History toggle button */}
              {id && id !== 'new' && (
                <button
                  type="button"
                  onClick={() => setShowVersionHistory((v) => !v)}
                  className={cn(
                    'absolute bottom-4 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-colors',
                    showVersionHistory
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/40',
                  )}
                  title="Version history"
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </button>
              )}
              {/* Version History panel */}
              {showVersionHistory && id && id !== 'new' && (
                <WorkflowVersionPanel
                  workflowId={id}
                  onRestore={(restoredNodes, restoredEdges) => {
                    const store = useWorkflowStore.getState();
                    store.setNodes(restoredNodes);
                    store.setEdges(restoredEdges);
                  }}
                  onClose={() => setShowVersionHistory(false)}
                />
              )}
            </div>

            {/* Right Panel - Properties */}
            {propertiesPanelOpen ? (
              <div className="relative w-[360px] shrink-0 overflow-hidden border-l border-border/60">
                <PropertiesPanel
                  onClose={() => setPropertiesPanelOpen(false)}
                  lastResolvedInputs={lastResolvedInputs}
                />
              </div>
            ) : (
              <button
                onClick={() => setPropertiesPanelOpen(true)}
                className={cn(
                  "w-8 flex items-center justify-center border-l border-border/60",
                  "hover:bg-muted/30 transition-colors duration-150",
                  "group"
                )}
                title="Open Properties Panel"
                aria-label="Open Properties Panel"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground/60 transition-colors duration-150" />
              </button>
            )}
          </div>
          <ExecutionConsole
            isExpanded={consoleExpanded}
            onToggle={() => setConsoleExpanded(!consoleExpanded)}
          />
        </div>

        {/* Debug Panel Overlay */}
        {debugNodeId && <DebugPanel />}
      </Suspense>
    </div>
  );
}
