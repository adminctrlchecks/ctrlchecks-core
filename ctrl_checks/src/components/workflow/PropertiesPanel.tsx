import { useWorkflowStore } from '@/stores/workflowStore';
import { useState, useCallback, useEffect, useRef, useMemo, Suspense, lazy, type ReactNode } from 'react';
import type { DebugNodeError } from '@/stores/debugStore';
import { useQueryClient } from '@tanstack/react-query';
import { getNodeDefinition, ConfigField } from './nodeTypes';
import { NODE_USAGE_GUIDES } from './nodeUsageGuides';
import { nodeSchemaService, NodeDefinition } from '@/services/nodeSchemaService';
import { convertNodeDefinitionToConfigFields, validateNodeInputsAgainstSchema } from '@/lib/schemaConverter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import NodeUsageCard from './NodeUsageCard';
import FormNodeSettings from './FormNodeSettings';
import ScheduleTrigger from './ScheduleTrigger';
import ScheduleWiseSettings from './ScheduleWiseSettings';
import FacebookConnectionStatus from '@/components/FacebookConnectionStatus';
import MysqlQueryEditor from './MysqlQueryEditor';
import MongoCollectionSelect from './MongoCollectionSelect';
import FirebaseCollectionSelect from './FirebaseCollectionSelect';
import FirebaseDocumentSelect from './FirebaseDocumentSelect';
import SupabaseTableSelect from './SupabaseTableSelect';
import PostgresQueryEditor from './PostgresQueryEditor';
import { awsClient } from '@/integrations/aws/client';
import { ENDPOINTS } from '@/config/endpoints';
import {
  Copy, ExternalLink, Bot, Send, Loader2, Sparkles,
  Trash2, X, Play, Webhook, Clock, Globe, Brain, Gem, Link,
  GitBranch, GitMerge, Repeat, Timer, ShieldAlert, Code, Braces, Table,
  Type, Combine, Mail, MessageSquare, Database, Box, FileText, Heart,
  Filter, Variable, Hash, MessageCircle, DatabaseZap, FileOutput, HelpCircle,
  XCircle, Layers, Edit, Edit3, Tag, Code2, ListChecks, ArrowUpDown, List, Terminal,
  Calculator, Lock, Rss, Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { validateAndFixWorkflow } from '@/lib/workflowValidation';
import {
  extractNodeConfigForAttachInputs,
  markAttachInputsPayloadPersisted,
  stableStringifyForAttachInputs,
  wasAttachInputsPayloadRecentlyPersisted,
} from '@/lib/attach-inputs-payload';
import { GuidedStatusCard } from '@/components/ui/guided-status-card';
import { mapWorkflowIssueToGuidance, type GuidedStatusContent } from '@/lib/workflow-guidance';
import { NodeHelpButton } from '@/components/docs/NodeHelpButton';

import { buildFormPublicUrl } from '@/lib/formPublicUrl';
import { useRole } from '@/hooks/useRole';
import { mergeCapabilityHints } from '@/lib/aiEditorPermissions';
import type {
  AiEditorCapabilitiesResponse,
  AiEditorChatMode,
  AiEditorMutationOperation,
  WorkflowDiffSummary,
} from '@/types/aiEditor';
import {
  enforceFrontendRenderContract,
  normalizeBackendWorkflow,
  validateNodeTypesRegistered,
} from '@/lib/node-type-normalizer';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDroppable } from '@dnd-kit/core';
import { useExpressionDropStore } from '@/stores/expressionDropStore';
import { resolveExpression, detectExpressionType } from '@/lib/expressionResolver';
import { InputGuideLink } from './InputGuideLink';
import type { ConditionRule } from './ConditionBuilder';
const ConditionBuilder = lazy(() => import('./ConditionBuilder'));
import KeyValueEditor from './editors/KeyValueEditor';
import HubSpotRecordEditor from './editors/HubSpotRecordEditor';
import VariableListEditor from './editors/VariableListEditor';
import CaseListEditor from './editors/CaseListEditor';
import { workflowScheduler } from '@/lib/workflowScheduler';
import { resolveEffectiveFieldFillMode, supportsRuntimeAI, type FieldFillMode } from '@/lib/fillMode';
import { collectUpstreamFieldHints } from '@/lib/upstreamFieldHints';
import { normalizeIfElseConfig, normalizeIfElseConditions } from '@/lib/ifElseConditions';
const FieldOwnershipToggle = lazy(() =>
  import('@/components/FieldOwnershipToggle').then(m => ({ default: m.FieldOwnershipToggle }))
);
import { invalidateAfterConnectionChange } from '@/lib/queryInvalidation';
import { shouldShowFieldForContext } from '@/lib/contextualFieldGuides';
import { NodeCredentialSelector } from '@/components/nodes/NodeCredentialSelector';
import { resolveFieldHelp } from '@/lib/resolve-field-help-content';

// Droppable field wrapper component - MUST be outside PropertiesPanel to avoid hook violations
interface DroppableFieldWrapperProps {
  fieldKey: string;
  children: React.ReactNode;
  className?: string;
  debugMode: boolean;
}

const DroppableFieldWrapper = ({ fieldKey, children, className, debugMode }: DroppableFieldWrapperProps) => {
  // Hook MUST be called unconditionally - use disabled prop instead of conditional call
  const { setNodeRef, isOver } = useDroppable({
    id: `field-${fieldKey}`,
    disabled: !debugMode,
  });

  if (!debugMode) {
    return <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      className={cn("relative", className, isOver && "ring-2 ring-primary/50 rounded-md")}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 bg-primary/10 rounded-md pointer-events-none z-10" />
      )}
    </div>
  );
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Play, Webhook, Clock, Globe, Brain, Sparkles, Gem, Link, GitBranch,
  GitMerge, Repeat, Timer, ShieldAlert, Code, Braces, Table, Type,
  Combine, Send, Mail, MessageSquare, Database, Box, FileText, Heart,
  Filter, Variable, Hash, MessageCircle, DatabaseZap, FileOutput,
  XCircle, Layers, Edit, Edit3, Tag, Code2, ListChecks, ArrowUpDown, List, Terminal,
  Calculator, Lock, Rss, Target
};

interface PropertiesPanelProps {
  onClose?: () => void;
  debugMode?: boolean;
  debugInputData?: unknown;
  debugError?: DebugNodeError;
  lastResolvedInputs?: Record<
    string,
    Record<string, { value: unknown; source?: 'static_config' | 'template' | 'deterministic_runtime' | 'runtime_ai'; executionId: string; startedAt: string }>
  >;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type ViewMode = 'properties' | 'ai-editor';

const PROPERTIES_PANEL_WIDTH = 360;

function toDebugRecord(error: DebugNodeError | undefined): Record<string, unknown> | null {
  return error && typeof error === 'object' && !Array.isArray(error)
    ? error as Record<string, unknown>
    : null;
}

function normalizeFieldMatchValue(value: unknown): string {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/[^a-z0-9]+/g, '').trim()
    : '';
}

function getDebugString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function resolveMissingFieldKey(
  missingField: Record<string, unknown>,
  inputSchema: Record<string, any>
): string | null {
  const schemaKeys = Object.keys(inputSchema);
  const fieldName = getDebugString(missingField.fieldName);
  if (fieldName && Object.prototype.hasOwnProperty.call(inputSchema, fieldName)) {
    return fieldName;
  }

  const candidates = [
    missingField.fieldName,
    missingField.friendlyLabel,
    missingField.description,
  ].map(normalizeFieldMatchValue).filter(Boolean);

  let bestMatch: { key: string; score: number } | null = null;
  for (const key of schemaKeys) {
    const normalizedKey = normalizeFieldMatchValue(key);
    const normalizedDescription = normalizeFieldMatchValue(inputSchema[key]?.description);
    const score = candidates.reduce((currentScore, candidate) => {
      if (candidate === normalizedKey) return Math.max(currentScore, 4);
      if (normalizedDescription && candidate === normalizedDescription) return Math.max(currentScore, 3);
      if (normalizedKey && (candidate.includes(normalizedKey) || normalizedKey.includes(candidate))) {
        return Math.max(currentScore, 2);
      }
      if (
        normalizedDescription &&
        (candidate.includes(normalizedDescription) || normalizedDescription.includes(candidate))
      ) {
        return Math.max(currentScore, 1);
      }
      return currentScore;
    }, 0);

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { key, score };
    }
  }

  return bestMatch?.key ?? null;
}

function buildDebugValidationErrors(
  debugError: DebugNodeError | undefined,
  selectedNodeId: string | undefined,
  backendSchema: NodeDefinition | null
): Record<string, string> {
  const errorRecord = toDebugRecord(debugError);
  const details = errorRecord?.details;
  if (!details || typeof details !== 'object' || Array.isArray(details) || !backendSchema) return {};

  const inputSchema = (backendSchema.inputSchema || {}) as Record<string, any>;
  const issues = Array.isArray((details as Record<string, unknown>).issues)
    ? (details as Record<string, unknown>).issues as unknown[]
    : [];

  const errors: Record<string, string> = {};
  for (const issue of issues) {
    if (!issue || typeof issue !== 'object' || Array.isArray(issue)) continue;
    const issueRecord = issue as Record<string, unknown>;
    const issueNodeId = getDebugString(issueRecord.nodeId);
    if (selectedNodeId && issueNodeId && issueNodeId !== selectedNodeId) continue;

    const missingFields = Array.isArray(issueRecord.missingFields) ? issueRecord.missingFields : [];
    for (const missingField of missingFields) {
      if (!missingField || typeof missingField !== 'object' || Array.isArray(missingField)) continue;
      const fieldRecord = missingField as Record<string, unknown>;
      const fieldKey = resolveMissingFieldKey(fieldRecord, inputSchema);
      if (!fieldKey) continue;

      const friendlyLabel = getDebugString(fieldRecord.friendlyLabel) || fieldKey;
      const description = getDebugString(fieldRecord.description);
      errors[fieldKey] = description || `${friendlyLabel} is required`;
    }
  }

  return errors;
}

export default function PropertiesPanel({
  onClose,
  debugMode = false,
  debugInputData,
  debugError,
  lastResolvedInputs = {},
}: PropertiesPanelProps) {
  const {
    selectedNode,
    selectNode,
    updateNodeConfig,
    deleteSelectedNode,
    workflowId,
    nodes,
    edges,
    setNodes,
    setEdges,
    setIsDirty,
    setAiEditedNodeIds,
    clearAiEditedNodeHighlight,
    workflowPhase,
  } = useWorkflowStore();
  const { role: appRole } = useRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { pendingExpression, clearPendingExpression } = useExpressionDropStore();
  const [guidedStatus, setGuidedStatus] = useState<GuidedStatusContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof awsClient.channel> | null = null;

    awsClient.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user?.id) return;

      channel = awsClient
        .channel(`properties-connections-${data.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connections',
            filter: `user_id=eq.${data.user.id}`,
          },
          () => {
            invalidateAfterConnectionChange(queryClient);
            window.dispatchEvent(new Event('connections-realtime-changed'));
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) awsClient.removeChannel(channel);
    };
  }, [queryClient]);

  /** Canonical form URL from graph (not selection) — matches persisted workflow node id */
  const formPublicUrl = useMemo(
    () => (workflowId ? buildFormPublicUrl(workflowId, nodes) : null),
    [workflowId, nodes]
  );

  // Stable string key for the selected node's config — prevents the auto-persist useEffect from
  // firing on every render when the parent recreates node objects (same data, new reference).
  const selectedNodeConfigKey = useMemo(
    () =>
      selectedNode
        ? stableStringifyForAttachInputs((selectedNode.data?.config ?? {}) as Record<string, unknown>)
        : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedNode?.id, selectedNode?.data?.config]
  );

  // View mode state - default to properties
  const [viewMode, setViewMode] = useState<ViewMode>('properties');

  // Test Node state (Type 1 nodes only)
  const [testNodeState, setTestNodeState] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');
  const [testNodeError, setTestNodeError] = useState<string>('');
  const [testNodeTimeMs, setTestNodeTimeMs] = useState<number>(0);

  // Resizable sidebar state

  // Help sidebar state
  const [selectedHelp, setSelectedHelp] = useState<{ title: string; steps: string[] } | null>(null);

  // Form workflow activation state
  const [isWorkflowActive, setIsWorkflowActive] = useState(false);
  const [isSavingActivation, setIsSavingActivation] = useState(false);

  // ✅ SCHEMA-DRIVEN UI: Backend schema state
  const [backendSchema, setBackendSchema] = useState<NodeDefinition | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const buildRuntimeAwareValidationErrors = useCallback(
    (schema: NodeDefinition, config: Record<string, unknown>) => {
      const validation = validateNodeInputsAgainstSchema(schema, config);
      if (validation.valid) return {};
      const backendInputSchema = (schema.inputSchema || {}) as Record<string, any>;
      const errorsMap: Record<string, string> = {};
      validation.errors.forEach((err) => {
        const effectiveMode = resolveEffectiveFieldFillMode(err.field, backendInputSchema, config);
        const runtimeSupported = supportsRuntimeAI(err.field, backendInputSchema);
        if (effectiveMode === 'runtime_ai' && runtimeSupported) return;
        errorsMap[err.field] = err.message;
      });
      return errorsMap;
    },
    []
  );

  const debugValidationErrors = useMemo(
    () => debugMode
      ? buildDebugValidationErrors(debugError, selectedNode?.id, backendSchema)
      : {},
    [debugMode, debugError, selectedNode?.id, backendSchema]
  );

  const effectiveValidationErrors = useMemo(
    () => ({ ...validationErrors, ...debugValidationErrors }),
    [validationErrors, debugValidationErrors]
  );

  // If/Else editor mode: allow either modern ConditionBuilder or raw JSON editing
  const [ifElseConditionsEditorMode, setIfElseConditionsEditorMode] = useState<'builder' | 'json'>('builder');
  const [ifElseConditionsJsonText, setIfElseConditionsJsonText] = useState<string>('');
  const [ifElseConditionsJsonError, setIfElseConditionsJsonError] = useState<string | null>(null);

  /** Switch-only: inline hint when cases/expression are incomplete */
  const [switchConfigHint, setSwitchConfigHint] = useState<string | null>(null);

  // AI Editor state
  const [aiMessages, setAiMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I can help you edit this workflow. Try saying "Add a Slack node after success" or "Change the trigger to a schedule".',
      timestamp: new Date(),
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiChatMode, setAiChatMode] = useState<AiEditorChatMode>('analyze');
  const [aiCapabilities, setAiCapabilities] = useState<AiEditorCapabilitiesResponse | null>(null);
  const [pendingAiOperations, setPendingAiOperations] = useState<AiEditorMutationOperation[]>([]);
  const [pendingAiDiff, setPendingAiDiff] = useState<WorkflowDiffSummary | null>(null);
  const [pendingAiPrompt, setPendingAiPrompt] = useState('');
  const [pendingPreviewValid, setPendingPreviewValid] = useState(true);
  const [showAiDiffDetails, setShowAiDiffDetails] = useState(false);
  const [isAiApplyLoading, setIsAiApplyLoading] = useState(false);
  const aiScrollAreaRef = useRef<HTMLDivElement>(null);
  const aiHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWorkflowStatus = useCallback(async () => {
    if (!workflowId) return;

    try {
      const { data, error } = await awsClient
        .from('workflows')
        .select('status')
        .eq('id', workflowId)
        .single();

      if (error) throw error;
      setIsWorkflowActive(data?.status === 'active');
    } catch (error) {
      console.error('Error loading workflow status:', error);
    }
  }, [workflowId]);

  // Load workflow status when form node is selected
  useEffect(() => {
    if (selectedNode?.data.type === 'form' && workflowId) {
      loadWorkflowStatus();
    }
  }, [selectedNode?.data.type, workflowId, loadWorkflowStatus]);

  // ✅ SCHEMA-DRIVEN UI: Fetch backend schema when node is selected
  useEffect(() => {
    if (!selectedNode) {
      setBackendSchema(null);
      setValidationErrors({});
      return;
    }

    const nodeType = selectedNode.data.type;
    setSchemaLoading(true);
    
    nodeSchemaService.fetchSchemaByType(nodeType)
      .then((schema) => {
        if (schema) {
          console.log(`[PropertiesPanel] ✅ Fetched backend schema for ${nodeType}:`, schema);
          setBackendSchema(schema);
          
          // Validate current inputs against schema
          const currentInputs = selectedNode.data.config || {};
          const errorsMap = buildRuntimeAwareValidationErrors(schema, currentInputs);
          if (Object.keys(errorsMap).length > 0) {
            setValidationErrors(errorsMap);
            console.log(`[PropertiesPanel] ⚠️ Validation errors for ${nodeType}:`, errorsMap);
          } else {
            setValidationErrors({});
            console.log(`[PropertiesPanel] ✅ Inputs valid for ${nodeType}`);
          }
        } else {
          console.log(`[PropertiesPanel] ℹ️ No backend schema for ${nodeType}, using legacy configFields`);
          setBackendSchema(null);
          setValidationErrors({});
        }
      })
      .catch((error) => {
        console.error(`[PropertiesPanel] ❌ Error fetching schema for ${nodeType}:`, error);
        setBackendSchema(null);
        setValidationErrors({});
      })
      .finally(() => {
        setSchemaLoading(false);
      });
  }, [selectedNode?.id, selectedNode?.data.type]);

  // ✅ SCHEMA-DRIVEN UI: Re-validate when config changes
  useEffect(() => {
    if (!selectedNode || !backendSchema) return;

    const currentInputs = selectedNode.data.config || {};
    const errorsMap = buildRuntimeAwareValidationErrors(backendSchema, currentInputs);
    if (Object.keys(errorsMap).length > 0) {
      setValidationErrors(errorsMap);
    } else {
      setValidationErrors({});
    }
  }, [selectedNode?.data.config, backendSchema, buildRuntimeAwareValidationErrors]);

  // Auto-scroll AI messages
  useEffect(() => {
    if (aiScrollAreaRef.current && viewMode === 'ai-editor') {
      const scrollContainer = aiScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [aiMessages, viewMode]);

  // AI editor: server-side capability matrix (authoritative for apply gates)
  useEffect(() => {
    if (viewMode !== 'ai-editor') return;
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await awsClient.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          if (!cancelled) setAiCapabilities(null);
          return;
        }
        const q = workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : '';
        const res = await fetch(`${ENDPOINTS.itemBackend}/api/ai/editor/capabilities${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json()) as AiEditorCapabilitiesResponse;
        if (!cancelled) setAiCapabilities(json.success ? json : null);
      } catch {
        if (!cancelled) setAiCapabilities(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewMode, workflowId]);

  const buildAiEditorWorkflowPayload = useCallback(() => {
    return {
      nodes: nodes.map((n) => {
        const baseType = n.data?.type || n.type;
        const canonicalConfig =
          baseType === 'if_else'
            ? normalizeIfElseConfig((n.data?.config || {}) as Record<string, unknown>)
            : (n.data?.config || {});

        return {
          id: n.id,
          type: baseType,
          position: n.position,
          data: {
            label: n.data?.label || baseType || 'Node',
            type: baseType,
            category: n.data?.category || 'utility',
            config: canonicalConfig,
          },
        };
      }),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
        type: e.type || 'main',
      })),
      metadata: workflowId ? { id: workflowId } : undefined,
    };
  }, [nodes, edges, workflowId]);

  const commitBackendWorkflowToCanvas = useCallback(
    (backendWorkflow: { nodes: unknown[]; edges: unknown[] }) => {
      const normalizedBackend = normalizeBackendWorkflow({
        nodes: backendWorkflow.nodes as any[],
        edges: backendWorkflow.edges as any[],
      });
      const normalized = validateAndFixWorkflow({
        nodes: normalizedBackend.nodes,
        edges: normalizedBackend.edges,
      });
      const contracted = enforceFrontendRenderContract({
        nodes: normalized.nodes as any[],
        edges: normalized.edges as any[],
      });
      const typeValidation = validateNodeTypesRegistered(contracted.nodes);
      if (!typeValidation.valid) {
        console.warn('[AI Editor] Some node types missing from registry:', typeValidation.missingTypes);
      }
      const validEdges = contracted.edges.filter((edge) => {
        const sourceExists = contracted.nodes.some((n) => n.id === edge.source);
        const targetExists = contracted.nodes.some((n) => n.id === edge.target);
        return sourceExists && targetExists;
      });
      setNodes(contracted.nodes as any);
      setEdges(validEdges);
      setIsDirty(true);
    },
    [setNodes, setEdges, setIsDirty]
  );

  const diffToHighlightIds = (diff: WorkflowDiffSummary | null): string[] => {
    if (!diff?.nodes?.length) return [];
    const ids: string[] = [];
    for (const d of diff.nodes) {
      if (d.after || (d.before && d.after)) ids.push(d.nodeId);
    }
    return [...new Set(ids)];
  };

  const handleDiscardPendingAi = () => {
    setPendingAiOperations([]);
    setPendingAiDiff(null);
    setPendingAiPrompt('');
    setPendingPreviewValid(true);
    setShowAiDiffDetails(false);
  };

  const handleApplyAiEdits = async () => {
    if (pendingAiOperations.length === 0 || isAiApplyLoading) return;
    if (!pendingPreviewValid) {
      toast({
        title: 'Cannot apply',
        description: 'Dry-run validation failed. Adjust the workflow or prompt before applying.',
        variant: 'destructive',
      });
      return;
    }

    const currentWorkflow = buildAiEditorWorkflowPayload();
    if (!Array.isArray(currentWorkflow.nodes) || currentWorkflow.nodes.length === 0) {
      toast({
        title: 'Nothing to apply',
        description: 'Add at least one node before applying AI edits.',
        variant: 'destructive',
      });
      return;
    }

    setIsAiApplyLoading(true);
    try {
      const { data: sessionData } = await awsClient.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('Sign in required to apply AI edits.');
      }

      const res = await fetch(`${ENDPOINTS.itemBackend}/api/ai/editor/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workflowId: workflowId || undefined,
          workflow: currentWorkflow,
          operations: pendingAiOperations,
          actor: sessionData.session?.user?.id,
          prompt: pendingAiPrompt,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || data.errors?.join?.(', ') || 'Apply failed';
        throw new Error(msg);
      }

      const wf = data.workflow;
      if (!wf?.nodes || !wf?.edges) {
        throw new Error('Invalid workflow in apply response');
      }

      commitBackendWorkflowToCanvas({ nodes: wf.nodes, edges: wf.edges });

      const highlightIds = diffToHighlightIds(data.diff || pendingAiDiff);
      setAiEditedNodeIds(highlightIds);
      if (aiHighlightTimerRef.current) clearTimeout(aiHighlightTimerRef.current);
      aiHighlightTimerRef.current = setTimeout(() => {
        clearAiEditedNodeHighlight();
        aiHighlightTimerRef.current = null;
      }, 12000);

      const versionNote = data.versionId ? ` Version: ${data.versionId}.` : '';
      setAiMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Applied ${pendingAiOperations.length} operation(s) to the workflow.${versionNote}`,
          timestamp: new Date(),
        },
      ]);

      handleDiscardPendingAi();
      toast({
        title: 'AI edits applied',
        description: 'Workflow updated on the canvas.',
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Apply failed';
      toast({
        title: 'Apply failed',
        description: JSON.stringify(errorMessage),
        variant: 'destructive',
      });
      setAiMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error applying edits: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsAiApplyLoading(false);
    }
  };

  // AI Editor send handler: analyze (read-only) or suggest (structured ops + preview)
  const handleAiSend = async () => {
    if (!aiInput.trim() || isAiLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: aiInput,
      timestamp: new Date(),
    };

    /** Include prior turns so follow-ups like "implement it" inherit intent from Analyze mode */
    const conversationHistory = [...aiMessages, userMessage]
      .filter((m) => m.id !== 'welcome')
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-24)
      .map((m) => ({
        role: m.role,
        content:
          m.content.length > 14000 ? `${m.content.slice(0, 14000)}…` : m.content,
      }));

    setAiMessages((prev) => [...prev, userMessage]);
    const outgoingPrompt = userMessage.content.trim();
    setAiInput('');
    setIsAiLoading(true);

    try {
      const currentWorkflow = buildAiEditorWorkflowPayload();

      if (!Array.isArray(currentWorkflow.nodes) || currentWorkflow.nodes.length === 0) {
        throw new Error('Current workflow has no nodes. Please add at least one node before using the AI editor.');
      }

      const { data: sessionData } = await awsClient.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('Sign in is required for the AI editor.');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const endpoint =
        aiChatMode === 'suggest'
          ? `${ENDPOINTS.itemBackend}/api/ai/editor/suggest`
          : `${ENDPOINTS.itemBackend}/api/ai/editor/analyze`;

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            workflowId: workflowId || undefined,
            workflow: currentWorkflow,
            nodeId: selectedNode?.id,
            prompt: outgoingPrompt,
            conversationHistory,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error(
            'Request timed out. Try again with a shorter question.'
          );
        }
        throw fetchError;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'AI request failed' }));
        throw new Error(error.error || error.message || 'AI request failed');
      }

      const data = await response.json();

      if (aiChatMode === 'analyze') {
        const result = data.result || data;
        const assistantText: string =
          result.message ||
          result.explanation ||
          'I have analyzed the workflow based on your request.';

        setAiMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: assistantText,
            timestamp: new Date(),
          },
        ]);
      } else {
        const result = data.result || {};
        const assistantText: string =
          result.message || 'Here are suggested edits. Review and click Apply to commit.';
        const ops = (result.operations || []) as AiEditorMutationOperation[];
        const diff = (result.diff || null) as WorkflowDiffSummary | null;

        setPendingAiOperations(ops);
        setPendingAiDiff(diff);
        setPendingAiPrompt(outgoingPrompt);
        const pe = Array.isArray(data.previewErrors) ? data.previewErrors : [];
        setPendingPreviewValid(data.previewValid !== false && pe.length === 0);

        let extra = '';
        if (data.previewErrors?.length) {
          extra += `\n\nDry-run issues:\n- ${data.previewErrors.slice(0, 5).join('\n- ')}`;
        }
        if (ops.length === 0) {
          extra += '\n\n(No structured operations returned — try rephrasing your request.)';
        }

        setAiMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `${assistantText}${extra}`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error: any) {
      console.error('AI Editor Error:', error);
      const errorMessage =
        error?.message || error?.error || 'Sorry, the AI editor encountered an error.';

      setAiMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
      toast({
        title: 'AI Editor Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleToggleActivation = async (enabled: boolean) => {
    if (!workflowId) {
      toast({
        title: 'Error',
        description: 'Please save the workflow first',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingActivation(true);
    try {
      const { data, error } = await awsClient
        .from("workflows")
        .update({
          status: enabled ? "active" : "draft"
        })
        .eq("id", workflowId)
        .select("status")
        .single();

      if (error) throw error;

      if (data && data.status === (enabled ? "active" : "draft")) {
        setIsWorkflowActive(enabled);
        toast({
          title: 'Success',
          description: enabled ? "Workflow activated successfully" : "Workflow deactivated",
        });

        if (enabled) {
          toast({
            title: 'Info',
            description: "Form is now active and waiting for submissions",
          });
        }
      } else {
        await loadWorkflowStatus();
        toast({
          title: 'Warning',
          description: "Status update may not have been saved. Please check and try again.",
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Error updating workflow status:", error);
      toast({
        title: 'Error',
        description: "Failed to update workflow status",
        variant: 'destructive',
      });
      await loadWorkflowStatus();
    } finally {
      setIsSavingActivation(false);
    }
  };


  // Effect to handle pending expression injection from drag & drop
  // MUST be before any early returns to follow Rules of Hooks
  useEffect(() => {
    if (debugMode && pendingExpression && selectedNode) {
      const { fieldKey, expression } = pendingExpression;
      // Check if the field exists in the current node's config
      // ✅ SCHEMA-DRIVEN UI: Use backend schema if available
      const nodeDef = backendSchema 
        ? { configFields: convertNodeDefinitionToConfigFields(backendSchema) }
        : getNodeDefinition(selectedNode.data.type);
      const field = nodeDef?.configFields?.find(f => f.key === fieldKey);

      if (field) {
        updateNodeConfig(selectedNode.id, { [fieldKey]: expression });
        clearPendingExpression();
      }
    }
  }, [debugMode, pendingExpression, selectedNode, clearPendingExpression, updateNodeConfig]);

  // Render AI Editor view
  const renderAIEditor = () => {
    const perm = mergeCapabilityHints(aiCapabilities, appRole);
    const suggestBlocked = !perm.canSuggest;
    const applyDisabled =
      pendingAiOperations.length === 0 ||
      !perm.canApply ||
      !pendingPreviewValid ||
      isAiApplyLoading;

    const renderDiffBullets = () => {
      const bullets: ReactNode[] = [];
      for (const d of pendingAiDiff?.nodes || []) {
        const label =
          d.after?.data?.label || d.before?.data?.label || d.nodeId;
        if (!d.before && d.after) {
          bullets.push(
            <li key={`add-${d.nodeId}`}>
              Add node: <strong>{label}</strong>
            </li>
          );
        } else if (d.before && !d.after) {
          bullets.push(
            <li key={`rm-${d.nodeId}`}>
              Remove node: <strong>{label}</strong>
            </li>
          );
        } else if (d.before && d.after) {
          bullets.push(
            <li key={`chg-${d.nodeId}`}>
              Modify node: <strong>{label}</strong>
            </li>
          );
        }
      }
      if (bullets.length === 0 && pendingAiOperations.length) {
        pendingAiOperations.forEach((op, i) => {
          bullets.push(
            <li key={`op-${i}-${op.kind}`}>
              <code className="text-[10px]">{op.kind}</code>
            </li>
          );
        });
      }
      return bullets.length ? (
        <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4 mt-2">
          {bullets}
        </ul>
      ) : null;
    };

    return (
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="px-4 pt-3 pb-2 border-b border-border/40 space-y-2 shrink-0">
          <ToggleGroup
            type="single"
            value={aiChatMode}
            onValueChange={(v) => {
              if (v === 'analyze' || v === 'suggest') {
                setAiChatMode(v);
                handleDiscardPendingAi();
              }
            }}
            className="justify-start"
          >
            <ToggleGroupItem value="analyze" className="text-xs h-7 px-2">
              Analyze
            </ToggleGroupItem>
            <ToggleGroupItem
              value="suggest"
              disabled={suggestBlocked}
              className="text-xs h-7 px-2"
              title={
                suggestBlocked ? 'Suggest/apply requires moderator or admin (or active workflow blocks apply).' : ''
              }
            >
              Suggest edits
            </ToggleGroupItem>
          </ToggleGroup>
          {!perm.canSuggest && (
            <p className="text-[10px] text-muted-foreground leading-snug">
              Your role can analyze workflows. Suggesting and applying edits needs moderator or admin (see server
              capabilities).
            </p>
          )}
          {perm.canSuggest && !perm.canApply && !!perm.applyBlockedReason && (
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug">
              {perm.applyBlockedReason}
            </p>
          )}
        </div>

        <ScrollArea className="flex-1 px-4 py-3 min-h-0" ref={aiScrollAreaRef}>
          <div className="space-y-3">
            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col gap-1 max-w-[85%]',
                  msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                <div
                  className={cn(
                    'px-3 py-2 rounded-sm text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/60 text-foreground/90 border border-border/40'
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground/60">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {pendingAiOperations.length > 0 && (
              <div className="mr-auto max-w-[95%] rounded-sm border border-violet-500/35 bg-violet-500/5 px-3 py-2">
                <p className="text-xs font-medium text-foreground">Pending AI changes</p>
                {!pendingPreviewValid && (
                  <p className="text-[10px] text-destructive mt-1">
                    Dry-run reported validation errors — applying is disabled until the suggestion validates.
                  </p>
                )}
                {renderDiffBullets()}
                <button
                  type="button"
                  className="text-[10px] text-violet-600 dark:text-violet-400 mt-2 underline"
                  onClick={() => setShowAiDiffDetails((v) => !v)}
                >
                  {showAiDiffDetails ? 'Hide operation JSON' : 'View operation JSON'}
                </button>
                {showAiDiffDetails && (
                  <pre className="mt-2 max-h-40 overflow-auto text-[10px] bg-muted/40 p-2 rounded border border-border/40">
                    {JSON.stringify(pendingAiOperations, null, 2)}
                  </pre>
                )}
              </div>
            )}
            {isAiLoading && (
              <div className="flex flex-col gap-1 mr-auto items-start max-w-[85%]">
                <div className="bg-muted/60 text-foreground/70 px-3 py-2 rounded-sm border border-border/40 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 text-muted-foreground/60 animate-spin" />
                  <span className="text-xs">Processing...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {pendingAiOperations.length > 0 && (
          <div className="px-4 py-2 border-t border-border/40 bg-muted/20 flex flex-wrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={applyDisabled}
              onClick={() => void handleApplyAiEdits()}
            >
              {isAiApplyLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Apply to canvas
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={isAiApplyLoading}
              onClick={handleDiscardPendingAi}
            >
              Discard
            </Button>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {pendingAiOperations.length} op(s)
            </span>
          </div>
        )}

        <div className="px-4 py-3 border-t border-border/40 bg-background shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder={
                aiChatMode === 'analyze'
                  ? 'Ask about this workflow...'
                  : 'Describe edits (e.g. add a node, update config)...'
              }
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAiSend()}
              disabled={isAiLoading}
              className="flex-1 h-8 text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-ring/50"
            />
            <Button
              size="icon"
              onClick={handleAiSend}
              disabled={isAiLoading || !aiInput.trim()}
              className="h-8 w-8"
            >
              {isAiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Selected node ID (may be undefined when no node is selected)
  const selectedNodeId = selectedNode?.id;

  const getOperationOptionsForResource = useCallback(
    (resourceValue: unknown) => {
      if (!backendSchema?.operationContracts?.length) return [];
      const implementedContracts = backendSchema.operationContracts.filter(
        (contract) => contract.status === 'implemented' && contract.operation
      );
      const resourceSpecificContracts =
        resourceValue !== undefined && resourceValue !== null && String(resourceValue).trim()
          ? implementedContracts.filter((contract) => contract.resource === String(resourceValue))
          : [];
      const contracts = resourceSpecificContracts.length > 0 ? resourceSpecificContracts : implementedContracts;
      return Array.from(
        new Map(
          contracts.map((contract) => [
            contract.operation,
            {
              label: contract.label || contract.operation.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
              value: contract.operation,
            },
          ])
        ).values()
      );
    },
    [backendSchema]
  );

  const conditionMatches = useCallback((actual: unknown, expected: unknown) => {
    if (Array.isArray(expected)) {
      return expected.some((candidate) => actual === candidate);
    }
    return actual === expected;
  }, []);

  const conditionObjectMatches = useCallback((actual: unknown, condition?: { equals?: unknown; notEquals?: unknown }) => {
    if (!condition) return false;
    if ('equals' in condition) return conditionMatches(actual, condition.equals);
    if ('notEquals' in condition) return !conditionMatches(actual, condition.notEquals);
    return false;
  }, [conditionMatches]);

  // Config change handler – safe when no node is selected
  const handleConfigChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNodeId) return;
      const patch: Record<string, unknown> = { [key]: value };

      if (key === 'resource' && selectedNode) {
        const allowedOperations = getOperationOptionsForResource(value);
        const currentOperation = selectedNode.data.config?.operation;
        if (
          allowedOperations.length > 0 &&
          !allowedOperations.some((option) => option.value === currentOperation)
        ) {
          patch.operation = allowedOperations[0].value;
        }
      }

      updateNodeConfig(selectedNodeId, patch);
    },
    [getOperationOptionsForResource, selectedNode, selectedNodeId, updateNodeConfig]
  );

  const handleConnectionRefChange = useCallback(
    (credentialKey: string, connectionId: string, aliases: string[] = []) => {
      if (!selectedNodeId || !selectedNode) return;
      const currentRefs = (
        (selectedNode.data.connectionRefs as Record<string, string> | undefined) ||
        ((selectedNode.data.config || {}) as Record<string, any>).connectionRefs ||
        {}
      ) as Record<string, string>;
      const nextRefs = { ...currentRefs };
      for (const key of Array.from(new Set([credentialKey, ...aliases])).filter(Boolean)) {
        nextRefs[key] = connectionId;
      }
      const updatedNode = {
        ...selectedNode,
        data: {
          ...selectedNode.data,
          connectionRefs: nextRefs,
        },
      };
      setNodes(nodes.map((node) => (node.id === selectedNodeId ? updatedNode : node)));
      selectNode(updatedNode);
      setIsDirty(true);
    },
    [nodes, selectedNode, selectedNodeId, selectNode, setIsDirty, setNodes]
  );

  // Per-field enabled toggle — writes to config._fieldEnabled[fieldName]
  const handleFieldEnabledChange = useCallback(
    (fieldKey: string, enabled: boolean) => {
      if (!selectedNodeId || !selectedNode) return;
      const current = (selectedNode.data.config?._fieldEnabled as Record<string, boolean> | undefined) ?? {};
      updateNodeConfig(selectedNodeId, {
        _fieldEnabled: { ...current, [fieldKey]: enabled },
      });
    },
    [selectedNodeId, selectedNode, updateNodeConfig]
  );

  // Converts an interval trigger's (value, unit) into a cron expression and activates it
  // via the same workflows.cron_expression + workflowScheduler mechanism the schedule node uses.
  const activateIntervalTrigger = useCallback(
    async (value: number, unit: string) => {
      if (!workflowId || workflowId === 'new') return;

      const cron =
        unit === 'hours'
          ? `0 */${Math.min(Math.max(Math.round(value), 1), 23)} * * *`
          : `*/${Math.min(Math.max(Math.round(value), 1), 59)} * * * *`;

      try {
        const { error: updateError } = await awsClient
          .from('workflows')
          .update({ cron_expression: cron })
          .eq('id', workflowId);

        if (updateError) {
          console.error('[IntervalTrigger] Error saving cron to workflows table:', updateError);
          toast({
            title: 'Warning',
            description: 'Interval saved to node config but failed to save to workflow. Scheduler may not start.',
            variant: 'destructive',
          });
          return;
        }

        workflowScheduler.stop(workflowId);
        await new Promise((resolve) => setTimeout(resolve, 100));
        workflowScheduler.start(workflowId, cron);

        toast({
          title: 'Interval saved',
          description: `Workflow will run automatically every ${value} ${unit}.`,
          duration: 5000,
        });
        window.dispatchEvent(new Event('schedule-updated'));
      } catch (error) {
        console.error('[IntervalTrigger] Error starting scheduler:', error);
        toast({
          title: 'Error',
          description: 'Failed to start scheduler. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [workflowId, toast]
  );

  // Per-field fill mode — writes to config._fillMode[fieldName] and persists via attach-inputs
  const handleFillModeChange = useCallback(
    async (fieldKey: string, mode: 'manual_static' | 'buildtime_ai_once' | 'runtime_ai', restoredValue?: unknown) => {
      if (!selectedNodeId || !selectedNode) return;

      // Store previous mode for rollback on API error
      const previousFillMode = (selectedNode.data.config?._fillMode as Record<string, string> | undefined) ?? {};
      const previousMode = previousFillMode[fieldKey];

      // Optimistic UI update — always happens the moment the user clicks, regardless of workflowId
      const current = { ...previousFillMode };
      updateNodeConfig(selectedNodeId, {
        _fillMode: { ...current, [fieldKey]: mode },
      });

      // Persist to backend only when the workflow has been saved
      if (!workflowId) return;

      try {
        // Call attach-inputs endpoint with mode_<nodeId>_<fieldName> key
        const { data: sessionData } = await awsClient.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error('Authentication required');
        }

        const modeKey = `mode_${selectedNodeId}_${fieldKey}`;
        const inputs: Record<string, unknown> = {
          [modeKey]: mode,
        };

        // If restoring a value (switching back to AI-built), include the restored value
        if (restoredValue !== undefined && mode === 'buildtime_ai_once') {
          const inputKey = `input_${selectedNodeId}_${fieldKey}`;
          inputs[inputKey] = restoredValue;
          console.log(`[PropertiesPanel] Restoring AI-built value for ${fieldKey}:`, restoredValue);
        }

        const response = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${workflowId}/attach-inputs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            inputs,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `Failed to update mode: ${response.status}`);
        }

        // Success - mode persisted to backend
        console.log(`[PropertiesPanel] Mode updated for ${fieldKey}: ${mode}`);
      } catch (error: any) {
        // Revert optimistic update on API failure
        console.error('[PropertiesPanel] Failed to update fill mode:', error);
        updateNodeConfig(selectedNodeId, {
          _fillMode: { ...previousFillMode, [fieldKey]: previousMode },
        });

        toast({
          title: 'Failed to update mode',
          description: error?.message || 'Could not persist mode change to server',
          variant: 'destructive',
        });
      }
    },
    [selectedNodeId, selectedNode, workflowId, updateNodeConfig, toast]
  );

  // Per-field ownership unlock — writes to config._ownershipUnlock[fieldName] and persists via attach-inputs
  const handleFieldUnlock = useCallback(
    async (fieldKey: string) => {
      if (!selectedNodeId || !selectedNode || !workflowId) return;
      
      // Store previous unlock state for rollback on error
      const previousOwnershipUnlock = (selectedNode.data.config?._ownershipUnlock as Record<string, boolean> | undefined) ?? {};
      const previousUnlockState = previousOwnershipUnlock[fieldKey];
      
      // Optimistic UI update
      const current = { ...previousOwnershipUnlock };
      updateNodeConfig(selectedNodeId, {
        _ownershipUnlock: { ...current, [fieldKey]: true },
      });
      
      try {
        // Call attach-inputs endpoint with unlock_<nodeId>_<fieldName> key
        const { data: sessionData } = await awsClient.auth.getSession();
        const token = sessionData?.session?.access_token;
        
        if (!token) {
          throw new Error('Authentication required');
        }
        
        const unlockKey = `unlock_${selectedNodeId}_${fieldKey}`;
        const inputs: Record<string, unknown> = {
          [unlockKey]: true,
        };
        
        const response = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${workflowId}/attach-inputs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            inputs,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `Failed to unlock field: ${response.status}`);
        }
        
        // Success - unlock persisted to backend
        console.log(`[PropertiesPanel] Field unlocked: ${fieldKey}`);
        
        toast({
          title: 'Field unlocked',
          description: `You can now change the ownership mode for ${fieldKey}`,
        });
      } catch (error: any) {
        // Revert optimistic update on failure
        console.error('[PropertiesPanel] Failed to unlock field:', error);
        updateNodeConfig(selectedNodeId, {
          _ownershipUnlock: { ...previousOwnershipUnlock, [fieldKey]: previousUnlockState },
        });
        
        toast({
          title: 'Failed to unlock field',
          description: error?.message || 'Could not persist unlock to server',
          variant: 'destructive',
        });
      }
    },
    [selectedNodeId, selectedNode, workflowId, updateNodeConfig, toast]
  );

  // Auto-persist node config changes to backend.
  // Debounced so rapid typing doesn't flood the API — fires 1.5s after the last change.
  const autoPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Skip auto-persist briefly after workflow load / navigation so canvas state matches server. */
  const suppressAutoPersistUntilRef = useRef(0);
  /** Per-node hash of last successful attach-inputs payload (non-credential keys only). */
  const lastSuccessfulAttachInputsRef = useRef<Map<string, string>>(new Map());
  const executionActiveRef = useRef(false);
  const autoPersistInFlightRef = useRef(false);

  useEffect(() => {
    if (!workflowId) return;
    suppressAutoPersistUntilRef.current = Date.now() + 650;
    lastSuccessfulAttachInputsRef.current.clear();
    executionActiveRef.current = false;
  }, [workflowId]);

  useEffect(() => {
    const handleStarted = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (!workflowId || detail.workflowId === workflowId) {
        executionActiveRef.current = true;
      }
    };
    const handleTerminal = (event: Event) => {
      const execution = (event as CustomEvent).detail?.execution;
      if (!workflowId || !execution?.workflow_id || execution.workflow_id === workflowId) {
        executionActiveRef.current = false;
      }
    };
    window.addEventListener('workflow-execution-started', handleStarted as EventListener);
    window.addEventListener('workflow-execution-terminal', handleTerminal as EventListener);
    return () => {
      window.removeEventListener('workflow-execution-started', handleStarted as EventListener);
      window.removeEventListener('workflow-execution-terminal', handleTerminal as EventListener);
    };
  }, [workflowId]);

  useEffect(() => {
    setGuidedStatus(null);
  }, [selectedNode?.id, workflowId]);

  useEffect(() => {
    if (debugMode) return;
    if (!selectedNode || !workflowId) return;
    // Only auto-persist when the workflow is already saved (has an ID)
    if (autoPersistTimerRef.current) clearTimeout(autoPersistTimerRef.current);
    autoPersistTimerRef.current = setTimeout(async () => {
      try {
        if (Date.now() < suppressAutoPersistUntilRef.current) return;
        if (executionActiveRef.current) return;
        if (autoPersistInFlightRef.current) return;

        autoPersistInFlightRef.current = true;
        try {
        const { data: sessionData } = await awsClient.auth.getSession();
        if (!sessionData?.session?.access_token) return;

        const nodeConfig = selectedNode.data?.config || {};
        const nodeType = selectedNode.data?.type || selectedNode.type || '';

        // ✅ REGISTRY-DRIVEN: Get field ownership from the node schema (no hardcoding)
        // Fields with ownership='credential' go to attach-credentials
        // All other fields go to attach-inputs (including _fillMode / _ownershipUnlock via shared helper)
        const cachedSchemas = nodeSchemaService.getCachedSchemas();
        const nodeDef = cachedSchemas?.find((s) => s.type === nodeType);
        const inputSchema = nodeDef?.inputSchema ?? {};

        const isReadyForExecution = workflowPhase === 'ready_for_execution';

        const extracted = extractNodeConfigForAttachInputs(nodeConfig as Record<string, unknown>);
        const nodeInputs: Record<string, any> = {};
        const credentialInputs: Record<string, any> = {};

        Object.keys(extracted).forEach((key) => {
          const value = extracted[key];
          if (value === undefined || value === null) return;

          const fieldOwnership = (inputSchema[key] as any)?.ownership;

          if (fieldOwnership === 'credential') {
            if (value !== '') credentialInputs[key] = value;
          } else {
            nodeInputs[key] = value;
          }
        });

        // When the workflow is fully committed, only allow mode/unlock keys through — never
        // re-run structural normalization against already-settled field values.
        if (isReadyForExecution) {
          const allowed = Object.fromEntries(
            Object.entries(nodeInputs).filter(([k]) => k.startsWith('mode_') || k.startsWith('unlock_'))
          );
          Object.keys(nodeInputs).forEach((k) => delete nodeInputs[k]);
          Object.assign(nodeInputs, allowed);
        }

        const token = sessionData.session.access_token;
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

        // Send config inputs
        if (Object.keys(nodeInputs).length > 0) {
          const inputsKey = stableStringifyForAttachInputs(nodeInputs as Record<string, unknown>);
          const nestedInputs = { [selectedNode.id]: nodeInputs };
          if (
            lastSuccessfulAttachInputsRef.current.get(selectedNode.id) === inputsKey ||
            wasAttachInputsPayloadRecentlyPersisted(workflowId, nestedInputs)
          ) {
            return;
          }

          const attachRes = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${workflowId}/attach-inputs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ inputs: nestedInputs }),
          });
          if (!attachRes.ok) {
            const errJson = await attachRes.json().catch(() => ({}));
            const guidance = mapWorkflowIssueToGuidance({
              ...errJson,
              currentPhase: errJson?.details?.currentPhase || errJson?.currentPhase,
              message:
                typeof errJson?.message === 'string'
                  ? errJson.message
                  : typeof errJson?.error === 'string'
                    ? errJson.error
                    : `HTTP ${attachRes.status}`,
            });
            setGuidedStatus(guidance);
            toast({
              title: guidance.title,
              description: guidance.description,
            });
          } else {
            lastSuccessfulAttachInputsRef.current.set(selectedNode.id, inputsKey);
            markAttachInputsPayloadPersisted(workflowId, nestedInputs);
            setGuidedStatus(null);
            const body = await attachRes.json().catch(() => ({}));
            const invalid = body?.diagnostics?.invalidBareNodeIdInputKeys as string[] | undefined;
            if (Array.isArray(invalid) && invalid.length > 0) {
              console.warn('[PropertiesPanel] attach-inputs ignored invalid keys:', invalid);
            }
          }
        }

        // Send credential inputs with node-scoped keys accepted by backend.
        if (Object.keys(credentialInputs).length > 0) {
          const scopedCredentials = Object.entries(credentialInputs).reduce<Record<string, unknown>>((acc, [fieldName, value]) => {
            const scopedKey = `cred_${selectedNode.id}_${fieldName}`;
            acc[scopedKey] = value;
            return acc;
          }, {});
          const attachCredsRes = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${workflowId}/attach-credentials`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              credentials: scopedCredentials,
            }),
          });
          if (!attachCredsRes.ok) {
            const errJson = await attachCredsRes.json().catch(() => ({}));
            const guidance = mapWorkflowIssueToGuidance({
              ...errJson,
              currentPhase: errJson?.details?.currentPhase || errJson?.currentPhase,
            });
            setGuidedStatus(guidance);
            toast({
              title: guidance.title,
              description: guidance.description,
            });
          } else {
            setGuidedStatus(null);
          }
        }
        } finally {
          autoPersistInFlightRef.current = false;
        }
      } catch {
        autoPersistInFlightRef.current = false;
        // Non-fatal — user can still manually save
      }
    }, 1500);
    return () => {
      if (autoPersistTimerRef.current) clearTimeout(autoPersistTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugMode, selectedNodeConfigKey, selectedNode?.id, workflowId, workflowPhase]);

  // Memoize available fields for condition builder – safe when no node is selected
  const availableFieldsForConditions = useMemo(() => {
    if (!selectedNodeId) return [];

    const prevNodes = nodes.filter(n => {
      const nodeEdges = edges.filter(e => e.target === selectedNodeId);
      return nodeEdges.some(e => e.source === n.id);
    });

    return collectUpstreamFieldHints(prevNodes);
  }, [nodes, edges, selectedNodeId]);

  // Keep If/Else JSON editor in sync with selected node
  useEffect(() => {
    if (!selectedNode || selectedNode.data?.type !== 'if_else') return;
    const cfg = selectedNode.data?.config || {};
    const conditions = (cfg as any).conditions;
    const canonicalConditions = normalizeIfElseConditions(conditions);
    const text = JSON.stringify(canonicalConditions, null, 2);
    setIfElseConditionsJsonText(text);
    setIfElseConditionsJsonError(null);
  }, [selectedNode?.id, selectedNode?.data?.type]);

  useEffect(() => {
    if (!selectedNode || selectedNode.data?.type !== 'switch') {
      setSwitchConfigHint(null);
      return;
    }
    const cfg = selectedNode.data?.config || {};
    const cases = (cfg as { cases?: unknown }).cases;
    const arr = Array.isArray(cases) ? cases : [];
    const expr =
      typeof (cfg as { expression?: unknown }).expression === 'string'
        ? String((cfg as { expression: string }).expression).trim()
        : '';
    if (arr.length === 0) {
      setSwitchConfigHint(
        'Add at least one case. Each case value becomes a branch output; the expression must evaluate to exactly one case value.'
      );
    } else if (!expr) {
      setSwitchConfigHint(
        'Set an expression (e.g. {{$json.response}}) that resolves to one of the case values.'
      );
    } else {
      setSwitchConfigHint(null);
    }
  }, [selectedNode?.id, selectedNode?.data?.type, selectedNode?.data?.config]);

  // Stop event propagation to prevent ReactFlow from stealing focus
  const handleInputMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Test Node handler — calls backend /api/test-type1-node with a pre-defined fixture
  const handleTestNode = useCallback(async () => {
    if (!selectedNode) return;
    setTestNodeState('running');
    setTestNodeError('');
    const startMs = Date.now();
    try {
      const { data: sessionData } = await awsClient.auth.getSession();
      const token = sessionData?.session?.access_token ?? '';
      const res = await fetch(`${ENDPOINTS.itemBackend}/api/test-type1-node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nodeType: selectedNode.data.type }),
      });
      const data = await res.json();
      setTestNodeTimeMs(Date.now() - startMs);
      if (data.success) {
        setTestNodeState('passed');
      } else {
        setTestNodeState('failed');
        setTestNodeError(data.error?.message || data.message || 'Node test failed');
      }
    } catch (err) {
      setTestNodeTimeMs(Date.now() - startMs);
      setTestNodeState('failed');
      setTestNodeError(err instanceof Error ? err.message : 'Network error');
    }
    // Auto-clear result after 12 seconds
    setTimeout(() => setTestNodeState('idle'), 12_000);
  }, [selectedNode]);

  // Render empty state (no node selected) - show toggle buttons and appropriate view
  if (!selectedNode) {
    return (
      <div
        className={cn("relative bg-background h-full overflow-hidden flex flex-col", !debugMode && "border-l border-border/60")}
        style={{ width: debugMode ? '100%' : PROPERTIES_PANEL_WIDTH, flexShrink: 0, boxSizing: 'border-box' }}
      >

        {/* Header with Professional Segmented Toggle */}
        <div className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center justify-between gap-3">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as ViewMode)}
              className="justify-center flex-1"
            >
              <ToggleGroupItem
                value="properties"
                aria-label="Node Properties"
                className={cn(
                  "h-7 px-3 text-xs font-medium border-0",
                  "data-[state=on]:bg-muted/60 data-[state=on]:text-foreground",
                  "data-[state=off]:text-muted-foreground/70",
                  "hover:bg-muted/40 transition-colors duration-150",
                  "rounded-sm"
                )}
              >
                Properties
              </ToggleGroupItem>
              <ToggleGroupItem
                value="ai-editor"
                aria-label="AI Editor"
                className={cn(
                  "h-7 px-3 text-xs font-medium border-0",
                  "data-[state=on]:bg-muted/60 data-[state=on]:text-foreground",
                  "data-[state=off]:text-muted-foreground/70",
                  "hover:bg-muted/40 transition-colors duration-150",
                  "rounded-sm"
                )}
              >
                AI Editor
              </ToggleGroupItem>
            </ToggleGroup>
            {onClose && (
              <button
                onClick={onClose}
                className={cn(
                  "h-6 w-6 flex items-center justify-center rounded-sm flex-shrink-0",
                  "text-muted-foreground/60 hover:text-foreground/80",
                  "hover:bg-muted/40 transition-colors duration-150"
                )}
                title="Close panel"
                aria-label="Close panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {viewMode === 'properties' ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center text-muted-foreground/70">
              <HelpCircle className="h-7 w-7 mx-auto mb-3 opacity-40" />
              <p className="text-xs font-medium text-foreground/70">No node selected</p>
              <p className="text-xs mt-1.5 text-muted-foreground/60">
                Click on a node to view its properties
              </p>
            </div>
          </div>
        ) : (
          renderAIEditor()
        )}
      </div>
    );
  }

  // Safety check: ensure node has proper data structure
  if (!selectedNode.data || !selectedNode.data.type) {
    console.warn('[PropertiesPanel] Node missing data or type:', selectedNode);
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <HelpCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">Invalid Node</p>
          <p className="text-xs mt-1">This node has missing data. Please reload the workflow.</p>
        </div>
      </div>
    );
  }

  // ✅ SCHEMA-DRIVEN UI: Use backend schema if available, fallback to legacy
  const legacyNodeDefinition = getNodeDefinition(selectedNode.data.type);
  const IconComponent = iconMap[selectedNode.data.icon || 'Box'] || Box;

  // Convert backend schema to configFields if available
  const schemaConfigFields = backendSchema 
    ? convertNodeDefinitionToConfigFields(backendSchema)
    : null;

  // Use schema-based configFields if available, otherwise use legacy
  const nodeDefinitionRaw = backendSchema && schemaConfigFields
    ? {
        ...legacyNodeDefinition,
        configFields: schemaConfigFields,
        // Mark as schema-driven for logging
        _schemaDriven: true,
      }
    : legacyNodeDefinition;

  // Universal guard: never render two fields for the same config key. Duplicate keys
  // (e.g. one declaration per operation with different visibleIf) collapse to the first.
  const nodeDefinition = nodeDefinitionRaw?.configFields
    ? {
        ...nodeDefinitionRaw,
        configFields: nodeDefinitionRaw.configFields.filter(
          (field, idx, arr) => arr.findIndex((f) => f.key === field.key) === idx
        ),
      }
    : nodeDefinitionRaw;

  // Log schema-driven status
  if (backendSchema && schemaConfigFields) {
    console.log(`[PropertiesPanel] 🎯 Rendering ${selectedNode.data.type} from backend schema (${schemaConfigFields.length} fields)`);
  }

  /** Shown as "Type" — must match `data.type` (schema/fields), not `data.label` (planner display name can say "Email" while type is still ollama). */
  const canonicalTypeDisplayName =
    (backendSchema?.label && String(backendSchema.label).trim()) ||
    (legacyNodeDefinition?.label && String(legacyNodeDefinition.label).trim()) ||
    selectedNode.data.type;
  const canvasLabel = (selectedNode.data.label && String(selectedNode.data.label).trim()) || '';
  const canvasLabelDiffersFromImplementation =
    canvasLabel.length > 0 &&
    canvasLabel.toLowerCase() !== canonicalTypeDisplayName.toLowerCase() &&
    canvasLabel.toLowerCase() !== String(selectedNode.data.type || '').toLowerCase();

  // Get operation-specific helpText for Instagram node
  const getInstagramOperationHelpText = (operation: string): string => {
    const operationGuides: Record<string, string> = {
      'create_image_post': 'How to get Operation:\n1) Select "Create Image Post" from the dropdown menu\n2) This operation publishes a single image to your Instagram Business account feed\n3) Required fields: Access Token, Instagram Business Account ID, and Image URL\n4) Optional field: Caption (text with hashtags, mentions, and emojis - up to 2,200 characters)\n5) Image requirements: Must be HTTPS URL, JPG or PNG format, minimum 320px width, maximum 1080px width\n6) Upload your image to a public hosting service (AWS S3, Cloudinary, etc.) and copy the direct URL\n7) After successful posting, you will receive a Media ID in the response for tracking and management\n8) The post will be published to your connected Instagram Business account feed',
      
      'create_video_post': 'How to get Operation:\n1) Select "Create Video Post (Reels)" from the dropdown menu\n2) This operation publishes a video or Reel to your Instagram Business account\n3) Required fields: Access Token, Instagram Business Account ID, and Video URL\n4) Optional field: Caption (text with hashtags, mentions, and emojis - up to 2,200 characters)\n5) Video requirements: Must be HTTPS URL, MP4 format, maximum 100MB file size\n6) For Reels: Video must be 3-60 seconds in duration\n7) Upload your video to a public hosting service and copy the direct URL\n8) After successful posting, you will receive a Media ID in the response for tracking',
      
      'create_carousel_post': 'How to get Operation:\n1) Select "Create Carousel Post" from the dropdown menu\n2) This operation publishes multiple images in a swipeable carousel format\n3) Required fields: Access Token, Instagram Business Account ID, and Carousel Image URLs (JSON array)\n4) Optional field: Caption (text with hashtags, mentions, and emojis - up to 2,200 characters)\n5) Image requirements: 2-10 images, all must have the same aspect ratio, HTTPS URLs, JPG or PNG format\n6) Format: JSON array like ["https://example.com/img1.jpg", "https://example.com/img2.jpg"]\n7) Upload all images to public hosting and create a JSON array of the URLs\n8) After successful posting, you will receive a Media ID in the response for tracking',
      
      'get_media': 'How to get Operation:\n1) Select "Get Media" from the dropdown menu\n2) This operation retrieves a list of media posts from your Instagram Business account\n3) Required fields: Access Token and Instagram Business Account ID\n4) Optional field: Limit (maximum 100 items, default is 25)\n5) The operation returns an array of media objects with IDs, captions, timestamps, and permalinks\n6) Use this to list all your posts, get Media IDs for other operations, or track your content\n7) Each media object includes: id, caption, timestamp, permalink, media_type, and thumbnail_url\n8) Use the returned Media IDs for operations like Get Comments or Get Insights',
      
      'get_comments': 'How to get Operation:\n1) Select "Get Comments" from the dropdown menu\n2) This operation retrieves comments from a specific media post on your Instagram account\n3) Required fields: Access Token, Instagram Business Account ID, and Media ID\n4) Optional field: Limit (maximum 100 items, default is 25)\n5) Get the Media ID from a previous "Get Media" operation or from the API response when creating a post\n6) The operation returns an array of comment objects with IDs, text, timestamps, and user information\n7) Each comment includes: id, text, timestamp, username, and reply_count\n8) Use the returned Comment IDs for operations like Reply to Comment',
      
      'reply_comment': 'How to get Operation:\n1) Select "Reply to Comment" from the dropdown menu\n2) This operation replies to a specific comment on one of your media posts\n3) Required fields: Access Token, Instagram Business Account ID, Comment ID, and Comment Text\n4) Get the Comment ID from a previous "Get Comments" operation\n5) Comment Text: Write your reply message (supports text, hashtags, mentions, and emojis)\n6) The reply will appear as a response to the original comment on your Instagram post\n7) After successful reply, you will receive a reply comment ID in the response\n8) Use this to engage with your audience and respond to comments on your posts',
      
      'get_insights': 'How to get Operation:\n1) Select "Get Insights" from the dropdown menu\n2) This operation retrieves analytics data for a specific media post on your Instagram account\n3) Required fields: Access Token, Instagram Business Account ID, Media ID, and Insight Metric\n4) Get the Media ID from a previous "Get Media" operation or from the API response when creating a post\n5) Select Insight Metric: Reach (unique accounts reached), Impressions (total views), or Engagement (likes, comments, saves)\n6) The operation returns insight data with metrics, values, and breakdowns\n7) Use this to track performance, analyze engagement, and measure post success\n8) Insights help you understand how your content is performing and optimize your strategy'
    };
    
    return operationGuides[operation] || operationGuides['create_image_post'];
  };

  // Parse helpText to extract title and steps
  const parseHelpText = (helpText: string): { title: string; steps: string[] } | null => {
    if (!helpText || !helpText.startsWith('How to get')) {
      return null;
    }

    // Extract title (everything before the colon)
    const colonIndex = helpText.indexOf(':');
    if (colonIndex === -1) return null;

    const title = helpText.substring(0, colonIndex).trim();
    const content = helpText.substring(colonIndex + 1).trim();

    // Extract steps (numbered items like "1) ... 2) ...")
    const steps: string[] = [];

    // Split by numbered steps pattern: "1) ", "2) ", etc.
    const stepParts = content.split(/(?=\d+\)\s)/);

    for (const part of stepParts) {
      const stepMatch = part.match(/^\d+\)\s*(.+?)(?=\s*\d+\)|$)/s);
      if (stepMatch) {
        const stepText = stepMatch[1].trim();
        if (stepText.length > 0) {
          steps.push(stepText);
        }
      } else {
        // If no match, try to extract any remaining text
        const cleaned = part.replace(/^\d+\)\s*/, '').trim();
        if (cleaned.length > 0) {
          steps.push(cleaned);
        }
      }
    }

    // If still no steps found, try alternative parsing
    if (steps.length === 0) {
      // Try splitting by "Method 1", "Method 2", etc. or by periods
      const alternativeSteps = content
        .split(/(?=Method \d+:|Step \d+:|^\d+\.)/)
        .filter(s => s.trim().length > 0)
        .map(s => s.replace(/^(Method \d+:|Step \d+:|\d+\.)\s*/, '').trim())
        .filter(s => s.length > 0);

      if (alternativeSteps.length > 0) {
        steps.push(...alternativeSteps);
      } else {
        // Last resort: split by periods and filter
        const periodSteps = content
          .split(/\.(?=\s)/)
          .map(s => s.trim())
          .filter(s => s.length > 10); // Filter out very short fragments

        if (periodSteps.length > 0) {
          steps.push(...periodSteps);
        }
      }
    }

    return steps.length > 0 ? { title, steps } : null;
  };

  const buildReadableHelpSteps = (helpText: string, placeholder?: string): string[] => {
    const steps = helpText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (placeholder && !steps.some((step) => step.toLowerCase().startsWith('example'))) {
      steps.push(`Example: ${placeholder}`);
    }

    return steps.length > 0 ? steps : [helpText];
  };

  const renderField = (field: ConfigField) => {
    const value = (selectedNode.data.config || {})[field.key] ?? field.defaultValue ?? '';
    const runtimeValueMeta = lastResolvedInputs?.[selectedNode.id]?.[field.key];
    const config = (selectedNode.data.config || {}) as Record<string, unknown>;
    const backendInputSchema = (backendSchema?.inputSchema || {}) as Record<string, any>;
    const effectiveFillMode = resolveEffectiveFieldFillMode(field.key, backendInputSchema, config);
    const runtimeSupported = supportsRuntimeAI(field.key, backendInputSchema);

    // Registry-driven UI behavior: only runtime_ai fields with runtime support
    // should be shown as AI-managed in the properties panel.
    const isAIManagedField = effectiveFillMode === 'runtime_ai' && runtimeSupported;

    // Check if value is an expression and resolve it in debug mode
    const isExpression = typeof value === 'string' && value.startsWith('{{$json.');
    const resolvedValue = debugMode && isExpression && debugInputData
      ? resolveExpression(value as string, debugInputData)
      : value;
    const resolvedType = debugMode && isExpression && debugInputData
      ? detectExpressionType(value as string, debugInputData)
      : typeof value;

    // If this is an AI-managed field, show read-only message instead of editable control
    if (isAIManagedField) {
      const isEmptyConfig =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0);
      return (
        <div
          className="text-xs text-muted-foreground border border-dashed border-border/60 rounded px-3 py-2.5 bg-muted/40 overflow-hidden"
          role="status"
          aria-label="AI-managed field, empty until execution"
          data-testid="ai-managed-field"
        >
          <p className="font-medium text-foreground/80 leading-snug">
            Filled automatically by AI at runtime
          </p>
          <p className="mt-1 leading-relaxed break-words">
            This field will be generated dynamically from previous node output and your workflow
            intent. You don&apos;t need to configure it manually.
          </p>
          {isEmptyConfig && (
            <p className="mt-2 text-[10px] text-muted-foreground/90 italic">
              No value is stored in the workflow; it stays empty until execution.
            </p>
          )}
          {runtimeValueMeta && (
            <div className="mt-2 p-2.5 rounded border border-border/40 bg-background/60 space-y-1.5">
              <p className="text-[11px] text-foreground/80 font-medium leading-none">
                Last runtime value (read-only)
              </p>
              <p className="text-[10px] text-muted-foreground leading-snug">
                {new Date(runtimeValueMeta.startedAt).toLocaleString()} • {runtimeValueMeta.source === 'runtime_ai' ? 'AI runtime' : 'Static config'}
              </p>
              <pre className="max-h-28 overflow-auto rounded bg-muted/40 p-2 font-mono text-[10px] whitespace-pre-wrap break-all w-full">
                {typeof runtimeValueMeta.value === 'string'
                  ? runtimeValueMeta.value
                  : JSON.stringify(runtimeValueMeta.value, null, 2)}
              </pre>
            </div>
          )}
        </div>
      );
    }

    switch (field.type) {
      case 'text':
      case 'cron':
        return (
          <DroppableFieldWrapper fieldKey={field.key} debugMode={debugMode}>
            <div className="relative">
              <Input
                id={field.key}
                value={value as string}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-8 text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-ring/50"
                onMouseDown={handleInputMouseDown}
                onFocus={(e) => e.stopPropagation()}
              />
              {debugMode && isExpression && (
                <div className="absolute top-0 right-0 bottom-0 flex items-center pr-2 text-xs text-muted-foreground/70 bg-muted/20 rounded-r-md pointer-events-none">
                  <span className="font-mono text-[10px]">{String(resolvedValue)} ({resolvedType})</span>
                </div>
              )}
            </div>
          </DroppableFieldWrapper>
        );

      case 'time':
        return (
          <DroppableFieldWrapper fieldKey={field.key} debugMode={debugMode}>
            <Input
              id={field.key}
              type="time"
              value={value as string}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder || '09:00'}
              className="h-8 text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-ring/50"
              onMouseDown={handleInputMouseDown}
              onFocus={(e) => e.stopPropagation()}
            />
          </DroppableFieldWrapper>
        );

      case 'date': {
        if (typeof value === 'string' && value.includes('{{')) {
          return (
            <DroppableFieldWrapper fieldKey={field.key} debugMode={debugMode}>
              <Input
                id={field.key}
                value={value}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                placeholder={field.placeholder || 'YYYY-MM-DD'}
                className="h-8 text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-ring/50"
                onMouseDown={handleInputMouseDown}
                onFocus={(e) => e.stopPropagation()}
              />
            </DroppableFieldWrapper>
          );
        }
        const dateValue =
          typeof value === 'string'
            ? (value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '')
            : '';
        return (
          <DroppableFieldWrapper fieldKey={field.key} debugMode={debugMode}>
            <Input
              id={field.key}
              type="date"
              value={dateValue}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder || 'YYYY-MM-DD'}
              className="h-8 text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-ring/50"
              onMouseDown={handleInputMouseDown}
              onFocus={(e) => e.stopPropagation()}
            />
          </DroppableFieldWrapper>
        );
      }

      case 'textarea':
      case 'json':
        return (
          <DroppableFieldWrapper fieldKey={field.key} debugMode={debugMode}>
            <div className="relative">
              <Textarea
                id={field.key}
                value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                onChange={(e) => {
                  const textValue = e.target.value;
                  // ✅ UNIVERSAL FIX: Parse JSON strings for object/json fields
                  // Check if this field expects an object/json type from backend schema
                  if (backendSchema?.inputSchema?.[field.key]?.type === 'object' || 
                      backendSchema?.inputSchema?.[field.key]?.type === 'json') {
                    // Try to parse JSON string, but keep as string if invalid (user might be typing)
                    if (textValue.trim() === '' || textValue.trim() === '{}' || textValue.trim() === '[]') {
                      handleConfigChange(field.key, textValue.trim() === '' ? '' : textValue);
                    } else {
                      try {
                        const parsed = JSON.parse(textValue);
                        // Only save parsed object if it's actually an object (not array)
                        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                          handleConfigChange(field.key, parsed);
                        } else {
                          // Keep as string if parsed to array or other type
                          handleConfigChange(field.key, textValue);
                        }
                      } catch {
                        // Invalid JSON - keep as string (user might be typing)
                        handleConfigChange(field.key, textValue);
                      }
                    }
                  } else {
                    // Not an object/json field - save as string
                    handleConfigChange(field.key, textValue);
                  }
                }}
                placeholder={field.placeholder}
                className="min-h-[100px] font-mono text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-ring/50"
                onMouseDown={handleInputMouseDown}
                onFocus={(e) => e.stopPropagation()}
              />
              {debugMode && isExpression && (
                <div className="absolute top-2 right-2 text-xs text-muted-foreground/70 bg-muted/20 px-2 py-1 rounded pointer-events-none max-w-[200px]">
                  <div className="font-mono text-[10px] whitespace-pre-wrap break-words">
                    {String(resolvedValue)} ({resolvedType})
                  </div>
                </div>
              )}
            </div>
          </DroppableFieldWrapper>
        );

      case 'number':
        return (
          <DroppableFieldWrapper fieldKey={field.key} debugMode={debugMode}>
            <div className="relative">
              <Input
                id={field.key}
                type="number"
                value={value as number}
                onChange={(e) => handleConfigChange(field.key, parseFloat(e.target.value))}
                placeholder={field.placeholder}
                className="h-8 text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-ring/50"
                onMouseDown={handleInputMouseDown}
                onFocus={(e) => e.stopPropagation()}
              />
              {debugMode && isExpression && (
                <div className="absolute top-0 right-0 bottom-0 flex items-center pr-2 text-xs text-muted-foreground/70 bg-muted/20 rounded-r-md pointer-events-none">
                  <span className="font-mono text-[10px]">{String(resolvedValue)} ({resolvedType})</span>
                </div>
              )}
            </div>
          </DroppableFieldWrapper>
        );

      case 'select': {
        // ✅ CORE ARCH REFACTOR: Filter out JSON/template options from dropdowns
        // AI Input Resolver will handle JSON-based mapping at runtime.
        const isJsonOption = (opt: any) => {
          const val = opt.value || opt;
          return typeof val === 'string' && (val.includes('{{$json.') || val.includes('{{$node.'));
        };
        
        // Filter out JSON/template options
        const resourceFilteredOperationOptions =
          field.key === 'operation'
            ? getOperationOptionsForResource((selectedNode.data.config || {}).resource)
            : [];
        const sourceOptions =
          resourceFilteredOperationOptions.length > 0
            ? resourceFilteredOperationOptions
            : field.options || [];
        const nonJsonOptions = sourceOptions.filter((opt: any) => !isJsonOption(opt));
        const hasNonJsonOptions = nonJsonOptions.length > 0;
        
        // If this is an AI-managed field OR only JSON options exist, show AI message
        if (isAIManagedField || (!hasNonJsonOptions && sourceOptions.length > 0)) {
          return (
            <div className="text-xs text-muted-foreground border border-dashed border-border/60 rounded px-3 py-2 bg-muted/40">
              <p className="font-medium text-foreground/80">
                Filled automatically by AI at runtime
              </p>
              <p className="mt-1">
                This field will be generated dynamically from previous node output and your workflow
                intent. No manual selection is required.
              </p>
            </div>
          );
        }
        
        // Show dropdown only if non-JSON options exist
        const activeContextHints =
          field.contextHints?.filter((h) => String(value ?? '') === h.whenValue) ?? [];
        return (
          <div className="space-y-2">
            <Select
              value={value as string}
              onValueChange={(val) => handleConfigChange(field.key, val)}
            >
              <SelectTrigger
                id={field.key}
                className="h-8 text-xs border-border/60 focus:ring-1 focus:ring-ring/50"
              >
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {nonJsonOptions
                  // ✅ Radix Select forbids empty-string item values
                  .filter((option: any) => String(option.value ?? '').trim().length > 0)
                  .map((option: any) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label || option.value}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {activeContextHints.length > 0 && (
              <div className="space-y-1.5" role="note">
                {activeContextHints.map((h) => (
                  <p
                    key={h.whenValue}
                    className="text-xs text-muted-foreground/90 leading-relaxed border border-border/50 rounded-md px-2.5 py-2 bg-muted/30"
                  >
                    {h.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'mysqlQueryEditor': {
        const connectionRefs = (selectedNode.data as any)?.connectionRefs as Record<string, string> | undefined;
        return (
          <MysqlQueryEditor
            value={value as string}
            onChange={(val) => handleConfigChange(field.key, val)}
            connectionId={connectionRefs?.mysql_connection}
          />
        );
      }

      case 'postgresQueryEditor': {
        const connectionRefs = (selectedNode.data as any)?.connectionRefs as Record<string, string> | undefined;
        return (
          <PostgresQueryEditor
            value={value as string}
            onChange={(val) => handleConfigChange(field.key, val)}
            connectionId={connectionRefs?.postgresql_connection ?? connectionRefs?.postgresql}
          />
        );
      }

      case 'mongoCollectionSelect': {
        const connectionRefs = (selectedNode.data as any)?.connectionRefs as Record<string, string> | undefined;
        return (
          <MongoCollectionSelect
            value={value as string}
            onChange={(val) => handleConfigChange(field.key, val)}
            connectionId={connectionRefs?.mongodb_connection}
          />
        );
      }

      case 'firebaseCollectionSelect': {
        const connectionRefs = (selectedNode.data as any)?.connectionRefs as Record<string, string> | undefined;
        return (
          <FirebaseCollectionSelect
            value={value as string}
            onChange={(val) => handleConfigChange(field.key, val)}
            connectionId={connectionRefs?.firebase_credentials}
          />
        );
      }

      case 'firebaseDocumentSelect': {
        const connectionRefs = (selectedNode.data as any)?.connectionRefs as Record<string, string> | undefined;
        const collectionValue = (selectedNode.data.config || {})['collection'];
        return (
          <FirebaseDocumentSelect
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(val) => handleConfigChange(field.key, val)}
            connectionId={connectionRefs?.firebase_credentials}
            collection={typeof collectionValue === 'string' ? collectionValue : undefined}
            pickField={field.key === 'documentId' ? 'id' : 'data'}
            placeholder={field.placeholder}
          />
        );
      }

      case 'supabaseTableSelect': {
        const connectionRefs = (selectedNode.data as any)?.connectionRefs as Record<string, string> | undefined;
        return (
          <SupabaseTableSelect
            value={value as string}
            onChange={(val) => handleConfigChange(field.key, val)}
            connectionId={connectionRefs?.supabase_api_key ?? connectionRefs?.db}
          />
        );
      }

      case 'boolean':
        return (
          <Switch
            id={field.key}
            checked={value as boolean}
            onCheckedChange={(checked) => handleConfigChange(field.key, checked)}
          />
        );

      case 'keyValue':
        return (
          <KeyValueEditor
            value={typeof value === 'object' && !Array.isArray(value) && value !== null
              ? value as Record<string, string>
              : {}}
            onChange={(v) => handleConfigChange(field.key, v)}
            addButtonLabel={field.addButtonLabel ?? 'Add Entry'}
          />
        );

      case 'hubspotProperties':
        return (
          <HubSpotRecordEditor
            mode="single"
            resource={(selectedNode.data.config || {}).resource}
            value={typeof value === 'object' && !Array.isArray(value) && value !== null
              ? value as Record<string, unknown>
              : {}}
            onChange={(v) => handleConfigChange(field.key, v)}
          />
        );

      case 'hubspotRecords':
        return (
          <HubSpotRecordEditor
            mode="multiple"
            resource={(selectedNode.data.config || {}).resource}
            value={Array.isArray(value) ? value as Array<{ properties?: Record<string, unknown> }> : []}
            onChange={(v) => handleConfigChange(field.key, v)}
          />
        );

      case 'variableList':
        return (
          <VariableListEditor
            value={Array.isArray(value) ? value as Array<{ name: string; value: string }> : []}
            onChange={(v) => handleConfigChange(field.key, v)}
            addButtonLabel={field.addButtonLabel ?? 'Add Variable'}
          />
        );

      case 'caseList':
        return (
          <CaseListEditor
            value={Array.isArray(value) ? value as Array<{ value: string; label: string }> : []}
            onChange={(v) => handleConfigChange(field.key, v)}
            addButtonLabel={field.addButtonLabel ?? 'Add Case'}
          />
        );

      case 'conditionList':
        return (
          <Suspense fallback={null}>
            <ConditionBuilder
              value={Array.isArray(value) ? value as ConditionRule[] : []}
              onChange={(v) => handleConfigChange(field.key, v)}
            />
          </Suspense>
        );

      case 'formFieldList':
        return (
          <FormNodeSettings
            config={value ?? { formTitle: '', formDescription: '', fields: [], submitButtonText: 'Submit', successMessage: '', redirectUrl: '' }}
            onConfigChange={(v) => handleConfigChange(field.key, v)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn("relative bg-background h-full overflow-hidden flex flex-col", !debugMode && "border-l border-border/60")}
      style={{ width: debugMode ? '100%' : PROPERTIES_PANEL_WIDTH, flexShrink: 0, boxSizing: 'border-box' }}
    >

      {/* Header with Professional Segmented Toggle */}
      <div className="px-4 py-3 border-b border-border/40 flex min-w-0 items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as ViewMode)}
          className="justify-start flex-shrink-0"
        >
          <ToggleGroupItem
            value="properties"
            aria-label="Node Properties"
            className={cn(
              "h-7 px-3 text-xs font-medium border-0",
              "data-[state=on]:bg-muted/60 data-[state=on]:text-foreground",
              "data-[state=off]:text-muted-foreground/70",
              "hover:bg-muted/40 transition-colors duration-150",
              "rounded-sm"
            )}
          >
            Properties
          </ToggleGroupItem>
          <ToggleGroupItem
            value="ai-editor"
            aria-label="AI Editor"
            className={cn(
              "h-7 px-3 text-xs font-medium border-0",
              "data-[state=on]:bg-muted/60 data-[state=on]:text-foreground",
              "data-[state=off]:text-muted-foreground/70",
              "hover:bg-muted/40 transition-colors duration-150",
              "rounded-sm"
            )}
          >
            AI Editor
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex shrink-0 items-center gap-2">
          {/* Test Node button — visible only for Type 1 nodes that have fixtures */}
          {viewMode === 'properties' && !(backendSchema?.credentialSchema && Object.keys(backendSchema.credentialSchema).length > 0) && (
            <button
              onClick={handleTestNode}
              disabled={testNodeState === 'running'}
              title="Test this node with a synthetic fixture (no credentials needed)"
              aria-label="Test node"
              className={cn(
                'h-6 px-2 flex items-center gap-1 rounded-sm text-[10px] font-medium transition-colors duration-150',
                testNodeState === 'idle' && 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/40',
                testNodeState === 'running' && 'text-muted-foreground/50 cursor-not-allowed',
                testNodeState === 'passed' && 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
                testNodeState === 'failed' && 'text-destructive bg-destructive/10',
              )}
            >
              {testNodeState === 'idle' && <><Play className="h-3 w-3" />Test</>}
              {testNodeState === 'running' && <><Loader2 className="h-3 w-3 animate-spin" />Running</>}
              {testNodeState === 'passed' && <>✅ {testNodeTimeMs}ms</>}
              {testNodeState === 'failed' && <>❌ Failed</>}
            </button>
          )}
          {/* Facebook Connection Button - Show in header when Facebook node is selected */}
          {viewMode === 'properties' && selectedNode?.data.type === 'facebook' && (
            <FacebookConnectionStatus compact={false} />
          )}
          {viewMode === 'properties' && (
            <NodeHelpButton
              nodeSlug={selectedNode.data.type}
              nodeDisplayName={canonicalTypeDisplayName}
            />
          )}
          {viewMode === 'properties' && (
            <button
              onClick={() => selectNode(null)}
              className="h-6 w-6 flex items-center justify-center rounded-sm hover:bg-muted/50 transition-colors duration-150"
              title="Deselect node"
              aria-label="Deselect node"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground/70" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className={cn(
                "h-6 w-6 flex items-center justify-center rounded-sm flex-shrink-0",
                "text-muted-foreground/60 hover:text-foreground/80",
                "hover:bg-muted/40 transition-colors duration-150"
              )}
              title="Close panel"
              aria-label="Close panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {viewMode === 'properties' ? (
        <>
          <ScrollArea className="flex-1 min-w-0 overflow-x-hidden">
            <div className="min-w-0 max-w-full overflow-x-hidden px-4 py-4 space-y-4">
              {guidedStatus && (
                <GuidedStatusCard
                  title={guidedStatus.title}
                  description={guidedStatus.description}
                  resolution={guidedStatus.resolution}
                  details={guidedStatus.details}
                  missingItems={guidedStatus.missingItems}
                  nextSteps={guidedStatus.nextSteps}
                  tone={guidedStatus.tone}
                  onDismiss={() => setGuidedStatus(null)}
                />
              )}
              {/* Test Node error banner */}
              {testNodeState === 'failed' && testNodeError && (
                <div className="px-3 py-2 rounded-md bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-start gap-2">
                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="break-words">{testNodeError}</span>
                </div>
              )}
              {/* Usage Guide Card - For All Nodes */}
              {NODE_USAGE_GUIDES[selectedNode.data.type] && (
                <div className="mb-1">
                  <NodeUsageCard
                    guide={NODE_USAGE_GUIDES[selectedNode.data.type]}
                    nodeLabel={selectedNode.data.label}
                  />
                </div>
              )}

              {/* Node Info */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground/70">Type</Label>
                  <p className="text-xs font-medium text-foreground/90 mt-1">{canonicalTypeDisplayName}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">{selectedNode.data.type}</p>
                </div>
                {canvasLabelDiffersFromImplementation && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground/70">Canvas label</Label>
                    <p className="text-xs text-foreground/80 mt-1">{canvasLabel}</p>
                    <p className="text-[10px] text-amber-600/90 dark:text-amber-500/90 mt-1 leading-snug">
                      Label text can differ from the implementation type. Fields and overview below follow{' '}
                      <span className="font-mono">{selectedNode.data.type}</span>
                      {legacyNodeDefinition?.category === 'ai' &&
                      /\b(email|gmail|mail)\b/i.test(canvasLabel)
                        ? ' — this is an AI/LLM node, not an email sender; use a Gmail (google_gmail) node to send mail, or regenerate the step.'
                        : '.'}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground/70">Description</Label>
                  <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{nodeDefinition?.description || 'No description available'}</p>
                </div>
              </div>

              {/* Config Fields */}
              {nodeDefinition && (
                <>
                  {/* Form Settings for Form Nodes - Show prominently at the top */}
                  {selectedNode.data.type === 'form' && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-medium uppercase text-muted-foreground/70 tracking-wide">
                        Form Settings
                      </h3>

                      {/* Activation Toggle */}
                      <div className="flex items-center justify-between p-3 border border-border/40 rounded-sm bg-muted/20">
                        <div className="space-y-0.5 flex-1">
                          <Label htmlFor="form-activation" className="text-xs font-medium text-foreground/90">
                            Activate Workflow
                          </Label>
                          <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">
                            {isWorkflowActive
                              ? "Workflow is active and waiting for form submissions"
                              : "Activate to start accepting form submissions"}
                          </p>
                        </div>
                        <Switch
                          id="form-activation"
                          checked={isWorkflowActive}
                          onCheckedChange={handleToggleActivation}
                          disabled={isSavingActivation || !workflowId}
                          className="ml-3"
                        />
                      </div>

                      {/* Form URL Display */}
                      <div className="space-y-3 p-3 bg-muted/30 rounded-sm border border-border/40">
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium text-foreground/90">Form URL</Label>
                            {!workflowId && (
                              <span className="text-xs text-muted-foreground/70 font-medium">
                                (Save workflow first)
                              </span>
                            )}
                          </div>
                          {workflowId ? (
                            <>
                              <div className="flex gap-2 items-center">
                                <div className="flex-1 min-w-0 p-2 border border-border/40 rounded-sm bg-background">
                                  <code className="text-xs font-mono break-all whitespace-normal text-foreground/80">
                                    {formPublicUrl ?? '(No form trigger in graph — save a workflow with a form node)'}
                                  </code>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0 border-border/60 hover:bg-muted/60"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!formPublicUrl) return;
                                    navigator.clipboard.writeText(formPublicUrl);
                                    toast({
                                      title: 'Copied!',
                                      description: 'Form URL copied to clipboard',
                                    });
                                  }}
                                  disabled={!formPublicUrl}
                                  title="Copy form URL"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0 border-border/60 hover:bg-muted/60"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!formPublicUrl) return;
                                    window.open(formPublicUrl, '_blank');
                                  }}
                                  disabled={!formPublicUrl}
                                  title="Open form in new tab"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                                Share this URL with users to collect form submissions. Submissions will automatically trigger your workflow.
                              </p>
                              <div className="p-2.5 bg-muted/40 border border-border/40 rounded-sm">
                                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                                  <strong className="font-medium">Note:</strong> The workflow must be saved and active for the form to work. Users can access this URL directly in their browser to fill out and submit the form.
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="p-2.5 bg-muted/40 border border-border/40 rounded-sm text-xs text-muted-foreground/80">
                              <strong className="font-medium">Save Required:</strong> Please save the workflow first to generate the form link.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chat URL Display - Show when chat trigger node is selected */}
                  {selectedNode.data.type === 'chat_trigger' && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-medium uppercase text-muted-foreground/70 tracking-wide">
                        Chat Settings
                      </h3>
                      <div className="space-y-3 p-3 bg-muted/30 rounded-sm border border-border/40">
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium text-foreground/90">Chat URL</Label>
                            {!workflowId && (
                              <span className="text-xs text-muted-foreground/70 font-medium">
                                (Save workflow first)
                              </span>
                            )}
                          </div>
                          {workflowId ? (
                            <>
                              <div className="flex gap-2 items-center">
                                <div className="flex-1 min-w-0 p-2 border border-border/40 rounded-sm bg-background">
                                  <code className="text-xs font-mono break-all whitespace-normal text-foreground/80">
                                    {`${window.location.origin}/chat/${workflowId}/${selectedNode.id}`}
                                  </code>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0 border-border/60 hover:bg-muted/60"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = `${window.location.origin}/chat/${workflowId}/${selectedNode.id}`;
                                    navigator.clipboard.writeText(url);
                                    toast({
                                      title: 'Copied!',
                                      description: 'Chat URL copied to clipboard',
                                    });
                                  }}
                                  title="Copy chat URL"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0 border-border/60 hover:bg-muted/60"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = `${window.location.origin}/chat/${workflowId}/${selectedNode.id}`;
                                    window.open(url, '_blank');
                                  }}
                                  title="Open chat in new tab"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                                Share this URL to open the chat interface. Each message will trigger a new workflow execution (like webhook). Messages will appear in the execution console.
                              </p>
                              <div className="p-2.5 bg-muted/40 border border-border/40 rounded-sm">
                                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                                  <strong className="font-medium">Note:</strong> The workflow must be saved and active for the chat to work. Each message creates a new workflow execution from the start.
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="p-2.5 bg-muted/40 border border-border/40 rounded-sm text-xs text-muted-foreground/80">
                              <strong className="font-medium">Save Required:</strong> Please save the workflow first to generate the chat link.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Node Settings */}
                  {selectedNode.data.type === 'form' ? (
                    <div className="space-y-4">
                      <h3 className="text-xs font-medium uppercase text-muted-foreground/70 tracking-wide">
                        Form Configuration
                      </h3>
                      <FormNodeSettings
                        config={{
                          formTitle: (selectedNode.data.config?.formTitle as string) || 'Form Submission',
                          formDescription: (selectedNode.data.config?.formDescription as string) || '',
                          fields: (() => {
                            const raw = selectedNode.data.config?.fields;
                            if (Array.isArray(raw)) return raw as any[];
                            // Parse JSON string if the backend stored it as a string
                            if (typeof raw === 'string' && raw.trim().startsWith('[')) {
                              try { return JSON.parse(raw); } catch { /* fall through */ }
                            }
                            return [];
                          })(),
                          submitButtonText: (selectedNode.data.config?.submitButtonText as string) || 'Submit',
                          successMessage: (selectedNode.data.config?.successMessage as string) || 'Thank you for your submission!',
                          redirectUrl: (selectedNode.data.config?.redirectUrl as string) || '',
                        }}
                        onConfigChange={(newConfig) => {
                          updateNodeConfig(selectedNode.id, newConfig as any);
                        }}
                      />
                    </div>
                  ) : selectedNode.data.type !== 'form' && (
                    <>
                      {/* Schema-driven nodes use the universal field card renderer. */}
                      {selectedNode.data.type === 'schedule' ? (
                        <div className="space-y-4">
                          <h3 className="text-xs font-medium uppercase text-muted-foreground/70 tracking-wide">
                            Configuration
                          </h3>
                          <ScheduleTrigger
                            defaultCron={(selectedNode.data.config?.cron as string) || '0 9 * * *'}
                            defaultTimezone={(selectedNode.data.config?.timezone as string) || 'Asia/Kolkata'}
                            onChange={async (schedule) => {
                              // Update node config
                              updateNodeConfig(selectedNode.id, {
                                cron: schedule.cronExpression,
                                timezone: schedule.timezone,
                              });
                              
                              // Save to workflows table and start scheduler (if workflow is saved)
                              if (!workflowId || workflowId === 'new') {
                                toast({
                                  title: 'Save workflow first',
                                  description: 'Please save the workflow before activating the schedule. The schedule will be activated automatically after saving.',
                                  duration: 5000,
                                });
                                return;
                              }
                              
                              if (workflowId && workflowId !== 'new') {
                                try {
                                  // Save cron_expression to workflows table (required by scheduler)
                                  const { error: updateError } = await awsClient
                                    .from('workflows')
                                    .update({
                                      cron_expression: schedule.cronExpression,
                                    })
                                    .eq('id', workflowId);
                                  
                                  if (updateError) {
                                    console.error('[ScheduleTrigger] Error saving cron to workflows table:', updateError);
                                    toast({
                                      title: 'Warning',
                                      description: 'Schedule saved to node config but failed to save to workflow. Scheduler may not start.',
                                      variant: 'destructive',
                                    });
                                  } else {
                                    // Start/restart the scheduler with new cron expression
                                    workflowScheduler.stop(workflowId);
                                    // Small delay to ensure cleanup completes
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    workflowScheduler.start(workflowId, schedule.cronExpression);
                                    
                                    console.log(`[ScheduleTrigger] ✅ Started scheduler for workflow ${workflowId} with cron: ${schedule.cronExpression}`);
                                    
                                    // Calculate next scheduled time for user feedback
                                    const parts = schedule.cronExpression.trim().split(/\s+/);
                                    let nextRunInfo = '';
                                    if (parts.length === 5) {
                                      const [minute, hour] = parts;
                                      const hourMatch = hour.match(/^(\d+)$/);
                                      const minuteMatch = minute.match(/^(\d+)$/);
                                      if (hourMatch && minuteMatch) {
                                        const scheduledHour = parseInt(hourMatch[1], 10);
                                        const scheduledMinute = parseInt(minuteMatch[1], 10);
                                        const now = new Date();
                                        const scheduledTime = new Date();
                                        scheduledTime.setHours(scheduledHour, scheduledMinute, 0, 0);
                                        if (scheduledTime <= now) {
                                          scheduledTime.setDate(scheduledTime.getDate() + 1);
                                        }
                                        nextRunInfo = ` Next run: ${scheduledTime.toLocaleString()}`;
                                      }
                                    }
                                    
                                    toast({
                                      title: 'Schedule saved',
                                      description: `Workflow will run automatically according to the schedule (${schedule.cronExpression}).${nextRunInfo}`,
                                      duration: 7000,
                                    });
                                    
                                    // Trigger a page refresh to update schedule status in header
                                    // This will cause WorkflowHeader to re-check isScheduled
                                    window.dispatchEvent(new Event('schedule-updated'));
                                  }
                                } catch (error) {
                                  console.error('[ScheduleTrigger] Error starting scheduler:', error);
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to start scheduler. Please try again.',
                                    variant: 'destructive',
                                  });
                                }
                              }
                            }}
                          />
                        </div>
                      ) : selectedNode.data.type === 'interval' ? (
                        <div className="space-y-4">
                          <h3 className="text-xs font-medium uppercase text-muted-foreground/70 tracking-wide">
                            Configuration
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground">Interval</label>
                              <Input
                                type="number"
                                min={1}
                                value={(selectedNode.data.config?.interval as number) ?? 5}
                                onChange={(e) => {
                                  const raw = parseInt(e.target.value, 10);
                                  const value = Number.isFinite(raw) && raw > 0 ? raw : 1;
                                  const unit = (selectedNode.data.config?.unit as string) || 'minutes';
                                  updateNodeConfig(selectedNode.id, { interval: value, unit });
                                }}
                                onBlur={async (e) => {
                                  const raw = parseInt(e.target.value, 10);
                                  const value = Number.isFinite(raw) && raw > 0 ? raw : 1;
                                  const unit = (selectedNode.data.config?.unit as string) || 'minutes';
                                  await activateIntervalTrigger(value, unit);
                                }}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground">Unit</label>
                              <Select
                                value={(selectedNode.data.config?.unit as string) || 'minutes'}
                                onValueChange={async (unit) => {
                                  const value = (selectedNode.data.config?.interval as number) ?? 5;
                                  updateNodeConfig(selectedNode.id, { interval: value, unit });
                                  await activateIntervalTrigger(value, unit);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="minutes">Minutes (1-59)</SelectItem>
                                  <SelectItem value="hours">Hours (1-23)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {!workflowId || workflowId === 'new'
                              ? 'Save the workflow first — the interval will activate automatically after saving.'
                              : 'Runs automatically at this interval once the workflow is active.'}
                          </p>
                        </div>
                      ) : selectedNode.data.type === 'schedulewise' ? (
                        <div className="space-y-4">
                          <h3 className="text-xs font-medium uppercase text-muted-foreground/70 tracking-wide">
                            Configuration
                          </h3>
                          <ScheduleWiseSettings
                            config={(selectedNode.data.config || {}) as any}
                            onConfigChange={(newConfig) => {
                              updateNodeConfig(selectedNode.id, newConfig as any);
                            }}
                            nodeId={selectedNode.id}
                            workflowId={workflowId || ''}
                          />
                        </div>
                      ) : (nodeDefinition.configFields && nodeDefinition.configFields.length > 0) ? (
                        <div className="space-y-4">
                          <h3 className="text-xs font-medium uppercase text-muted-foreground/70 tracking-wide">
                            Configuration
                          </h3>
                          {backendSchema && (() => {
                            const requirements = (backendSchema.credentialSchema?.requirements || [])
                              .filter((requirement) => requirement?.provider || requirement?.credentialTypeId || requirement?.credentialTypeIds?.length)
                              // Dedup by credentialTypeId first, then by provider — prevents double picker when backend sends duplicate requirements
                              .filter((req, idx, arr) => {
                                const typeId = req.credentialTypeId || (req.credentialTypeIds || [])[0];
                                if (typeId) return arr.findIndex((r) => (r.credentialTypeId || (r.credentialTypeIds || [])[0]) === typeId) === idx;
                                return arr.findIndex((r) => r.provider === req.provider) === idx;
                              });
                            if (requirements.length === 0) return null;
                            const connectionRefs = (
                              (selectedNode.data.connectionRefs as Record<string, string> | undefined) ||
                              ((selectedNode.data.config || {}) as Record<string, any>).connectionRefs ||
                              {}
                            ) as Record<string, string>;
                            return (
                              <div className="space-y-3">
                                {requirements.map((requirement) => {
                                  const credentialTypeIds = Array.from(new Set([
                                    ...(requirement.credentialTypeIds || []),
                                    ...(requirement.credentialTypeId ? [requirement.credentialTypeId] : []),
                                  ].filter(Boolean)));
                                  const refKey = requirement.credentialTypeId || credentialTypeIds[0] || requirement.provider;
                                  const providers = credentialTypeIds.length > 0 ? [] : [requirement.provider].filter(Boolean);
                                  const value =
                                    connectionRefs[refKey] ||
                                    credentialTypeIds.map((typeId) => connectionRefs[typeId]).find(Boolean) ||
                                    connectionRefs[requirement.provider] ||
                                    connectionRefs[`${requirement.provider}_oauth2`] ||
                                    connectionRefs[`${requirement.provider}_api_key`];
                                  return (
                                    <NodeCredentialSelector
                                      key={`${refKey}-${requirement.category || 'credential'}`}
                                      credentialTypeIds={credentialTypeIds}
                                      providers={providers}
                                      logoProvider={requirement.provider}
                                      value={value}
                                      onChange={(connectionId) => handleConnectionRefChange(
                                        refKey,
                                        connectionId,
                                        [
                                          ...credentialTypeIds,
                                          requirement.provider,
                                          `${requirement.provider}_oauth2`,
                                          `${requirement.provider}_api_key`,
                                          `${requirement.provider}_token`,
                                        ].filter(Boolean)
                                      )}
                                      label={requirement.label || `${String(requirement.provider || refKey).replace(/_/g, ' ')} connection`}
                                    />
                                  );
                                })}
                              </div>
                            );
                          })()}
                          {/* Connected Account badge — shown for nodes with credential-owned fields */}
                          {backendSchema && (() => {
                            const providerRequirements = Array.from(new Set(
                              [
                                ...(backendSchema.credentialSchema?.requirements || []).map((requirement) => requirement.provider),
                                ...(backendSchema.operationContracts || [])
                                  .flatMap((contract) => contract.credentialProviders || []),
                              ].filter(Boolean)
                            ));
                            if (providerRequirements.length > 0) return null;
                            const credFields = Object.entries(backendSchema.inputSchema || {}).filter(
                              ([, f]) => (f as any).ownership === 'credential'
                            );
                            if (credFields.length === 0) return null;
                            const credentialId = (selectedNode.data.config || {} as any).credentialId;
                            const isConnected = !!credentialId;
                            // Derive a friendly provider name from credentialId or node type
                            const nodeType = selectedNode.data.type || '';
                            const providerLabel =
                              nodeType.includes('google') || (credentialId && String(credentialId).includes('google'))
                                ? 'Google Account'
                                : nodeType.includes('github')
                                ? 'GitHub Account'
                                : nodeType.includes('linkedin')
                                ? 'LinkedIn Account'
                                : 'Account';
                            return (
                              <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs border ${isConnected ? 'bg-green-500/5 border-green-500/30 text-green-700 dark:text-green-400' : 'bg-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-400'}`}>
                                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-amber-500'}`} />
                                {isConnected
                                  ? `${providerLabel} connected`
                                  : `No ${providerLabel} connected — connect via the Connections panel`}
                              </div>
                            );
                          })()}
                          {selectedNode.data.type === 'switch' && switchConfigHint && (
                            <div
                              role="status"
                              className="text-xs text-amber-700 dark:text-amber-300 border border-amber-500/40 rounded-md px-3 py-2 bg-amber-500/5"
                            >
                              {switchConfigHint}
                            </div>
                          )}
                          {nodeDefinition.configFields.map((field) => {
                            // Skip credential-ownership fields — managed via the connection picker, not raw inputs
                            const backendFieldDef = (backendSchema?.inputSchema as any)?.[field.key];
                            if (backendFieldDef?.ownership === 'credential') return null;
                            const contextualNodeConfig = (selectedNode.data.config || {}) as Record<string, unknown>;
                            if (!shouldShowFieldForContext(selectedNode.data.type, field.key, contextualNodeConfig)) return null;

                            // ✅ Systematic UI: visibleIf (optional), then requiredIf (hide + required when true)
                            // Evaluated for both schema-driven and legacy nodes so nodeTypes.ts
                            // conditions work even when the backend schema is unavailable.
                            let effectiveRequired = field.required;
                            // fieldConditionActive: true = condition met (field is active/required),
                            // false = condition not met (field shown but dimmed/optional)
                            let fieldConditionActive = true;
                            {
                              const ui = (backendSchema?.inputSchema as any)?.[field.key]?.ui;
                              const currentConfig = selectedNode.data.config || {};
                              const visibleIf =
                                (ui?.visibleIf as { field: string; equals: unknown } | undefined) ||
                                (field.visibleIf as { field: string; equals: unknown } | undefined);
                              if (visibleIf) {
                                const visOk = conditionMatches((currentConfig as any)?.[visibleIf.field], visibleIf.equals);
                                if (!visOk) return null;
                                fieldConditionActive = visOk;
                              }
                              const requiredIf =
                                (ui?.requiredIf as { field: string; equals?: any; notEquals?: any } | undefined) ||
                                (field.requiredIf as { field: string; equals?: any; notEquals?: any } | undefined);
                              if (requiredIf) {
                                const conditionMet = conditionObjectMatches((currentConfig as any)?.[requiredIf.field], requiredIf);
                                if (!conditionMet) return null;
                                fieldConditionActive = conditionMet;
                                effectiveRequired = conditionMet;
                              }
                            }

                            const backendFieldDescription = String((backendSchema?.inputSchema as Record<string, any> | undefined)?.[field.key]?.description || '');
                            const resolvedFieldHelp = resolveFieldHelp({
                              nodeType: selectedNode.data.type,
                              nodeLabel: canonicalTypeDisplayName,
                              fieldName: field.key,
                              fieldKey: field.key,
                              fieldLabel: field.label,
                              fieldType: field.type,
                              description: backendFieldDescription,
                              placeholder: field.placeholder,
                              options: field.options,
                              config: selectedNode.data.config || {},
                              helpText: field.helpText,
                              helpCategory: field.helpCategory,
                              docsUrl: field.docsUrl,
                              exampleValue: field.exampleValue,
                              operation: (selectedNode.data.config || {}).operation,
                              resource: (selectedNode.data.config || {}).resource,
                            });
                            const contextualHelpText = resolvedFieldHelp?.description || '';
                            const effectiveHelpText = contextualHelpText || field.helpText;
                            
                            const helpInfo = resolvedFieldHelp
                              ? {
                                  title: resolvedFieldHelp.title,
                                  steps: buildReadableHelpSteps(resolvedFieldHelp.description, field.placeholder),
                                }
                              : effectiveHelpText ? parseHelpText(effectiveHelpText) : null;
                            const hasHelpLink = helpInfo !== null;
                            const helpVerb = field.type === 'select' ? 'choose' : 'set';
                            const fieldHelpTitle = resolvedFieldHelp?.title || `How to ${helpVerb} ${field.label}?`;

                            // ✅ SCHEMA-DRIVEN UI: Get validation error for this field
                            const fieldError = effectiveValidationErrors[field.key];

                            // ── Per-field on/off toggle ──────────────────────────────────────────
                            const nodeConfig = (selectedNode.data.config || {}) as Record<string, unknown>;
                            const fieldEnabledMap = (nodeConfig._fieldEnabled as Record<string, boolean> | undefined) ?? {};
                            const fillModeMap = (nodeConfig._fillMode as Record<string, string> | undefined) ?? {};

                            // A field is auto-enabled when AI already gave it a non-empty value
                            const rawFieldValue = nodeConfig[field.key];
                            const hasAiValue =
                              rawFieldValue !== undefined &&
                              rawFieldValue !== null &&
                              rawFieldValue !== '' &&
                              !(typeof rawFieldValue === 'object' && !Array.isArray(rawFieldValue) && Object.keys(rawFieldValue as object).length === 0);

                            const currentFillMode: 'manual_static' | 'buildtime_ai_once' | 'runtime_ai' =
                              resolveEffectiveFieldFillMode(
                                field.key,
                                (backendSchema?.inputSchema || {}) as Record<string, any>,
                                nodeConfig,
                              );

                            // Explicit user toggle takes precedence; fall back to auto-enable when AI filled.
                            // Force-open when runtime_ai so the ownership toggle is always reachable.
                            const fieldEnabled: boolean =
                              currentFillMode === 'runtime_ai'
                                ? true
                                : fieldEnabledMap[field.key] !== undefined
                                  ? fieldEnabledMap[field.key]
                                  : hasAiValue;

                            return (
                              <div key={field.key} className={`min-w-0 max-w-full overflow-hidden rounded-md border border-border/40 bg-muted/10 transition-opacity ${fieldConditionActive ? 'opacity-100' : 'opacity-45'}`}>
                                {/* ── Field header row: label + toggle ── */}
                                <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 min-h-[36px]">
                                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                    {selectedNode.data.type === 'if_else' && field.key === 'conditions' ? (
                                      <Label className="text-xs font-medium text-foreground/90 flex items-center gap-1 min-w-0">
                                        <span className="truncate">{field.label}</span>
                                        {effectiveRequired && <span className="text-destructive/80 shrink-0">*</span>}
                                        {backendSchema && (
                                          <span className="text-[10px] text-muted-foreground/50 shrink-0" title="Rendered from backend schema">🎯</span>
                                        )}
                                      </Label>
                                    ) : (
                                      <Label htmlFor={field.key} className="text-xs font-medium text-foreground/90 flex items-center gap-1 min-w-0">
                                        <span className="truncate">{field.label}</span>
                                        {effectiveRequired && <span className="text-destructive/80 shrink-0">*</span>}
                                        {backendSchema && (
                                          <span className="text-[10px] text-muted-foreground/50 shrink-0" title="Rendered from backend schema">🎯</span>
                                        )}
                                      </Label>
                                    )}
                                    {effectiveHelpText && (
                                      <button
                                        type="button"
                                        title={effectiveHelpText}
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          setSelectedHelp({
                                            title: fieldHelpTitle,
                                            steps: buildReadableHelpSteps(effectiveHelpText, field.placeholder),
                                          });
                                        }}
                                        className="flex min-w-0 shrink-0 items-center gap-1 text-[10px] font-medium text-muted-foreground/70 transition-colors hover:text-primary"
                                      >
                                        <HelpCircle className="h-3 w-3" />
                                        <span className="max-w-[140px] truncate">{fieldHelpTitle}</span>
                                      </button>
                                    )}
                                    {hasAiValue && !fieldEnabled && (
                                      <span className="text-[10px] text-sky-500/80 font-medium shrink-0">AI prefilled</span>
                                    )}
                                  </div>
                                  {/* On/Off toggle */}
                                  <Switch
                                    checked={fieldEnabled}
                                    onCheckedChange={(checked) => handleFieldEnabledChange(field.key, checked)}
                                    className="ml-auto shrink-0"
                                    aria-label={`Enable ${field.label}`}
                                  />
                                </div>

                                {/* ── When OFF: collapsed preview ── */}
                                {!fieldEnabled && (
                                  <div className="px-3 pb-2">
                                    {hasAiValue ? (
                                      <p className="text-[11px] text-muted-foreground/60 italic truncate">
                                        {typeof rawFieldValue === 'object'
                                          ? JSON.stringify(rawFieldValue).slice(0, 80)
                                          : String(rawFieldValue).slice(0, 80)}
                                      </p>
                                    ) : (
                                      <p className="text-[11px] text-muted-foreground/50 italic">Not configured</p>
                                    )}
                                  </div>
                                )}

                                {/* ── When ON: mode selector + input ── */}
                                {fieldEnabled && (
                                  <div className="min-w-0 max-w-full overflow-hidden px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                                    {/* Field Ownership Toggle Component */}
                                    {(() => {
                                      // Get credential ownership information from backend schema
                                      const backendInputSchema = backendSchema?.inputSchema as Record<string, any> | undefined;
                                      const fieldDef = backendInputSchema?.[field.key];
                                      const fieldOwnership = fieldDef?.ownership;
                                      const credentialTogglePolicy = fieldDef?.credentialTogglePolicy;
                                      
                                      // Determine if field is credential-owned and locked/unlockable
                                      const isCredentialOwned = fieldOwnership === 'credential';
                                      const isLocked = isCredentialOwned && credentialTogglePolicy === 'locked';
                                      const isUnlockable = isCredentialOwned && credentialTogglePolicy === 'unlockable';
                                      
                                      // Get unlock state from config._ownershipUnlock
                                      const ownershipUnlockMap = (selectedNode.data.config?._ownershipUnlock as Record<string, boolean> | undefined) ?? {};
                                      const isUnlocked = ownershipUnlockMap[field.key] === true;
                                      
                                      return (
                                        <Suspense fallback={null}>
                                        <FieldOwnershipToggle
                                          fieldName={field.key}
                                          nodeId={selectedNode.id}
                                          currentMode={currentFillMode}
                                          onModeChange={(newMode, restoredValue) => {
                                            // When switching to AI-built mode with a restored value,
                                            // pass it to handleFillModeChange so it gets sent to attach-inputs
                                            handleFillModeChange(field.key, newMode, restoredValue);
                                          }}
                                          currentValue={rawFieldValue}
                                          onRestoreValue={(originalValue) => {
                                            // Restore the original AI-built value locally (for immediate UI update)
                                            handleConfigChange(field.key, originalValue);
                                          }}
                                          isLocked={isLocked}
                                          isUnlockable={isUnlockable}
                                          isUnlocked={isUnlocked}
                                          onUnlock={() => {
                                            // Call attach-inputs with unlock_<nodeId>_<fieldName> key
                                            handleFieldUnlock(field.key);
                                          }}
                                        />
                                        </Suspense>
                                      );
                                    })()}

                                    {/* ✅ SCHEMA-DRIVEN UI: Show validation error inline */}
                                    {fieldError && (
                                      <p className="text-xs text-destructive/80 flex items-center gap-1">
                                        <XCircle className="h-3 w-3" />
                                        {fieldError}
                                      </p>
                                    )}

                                    {/* Input area — banner when runtime_ai, editable control otherwise */}
                                    {currentFillMode === 'runtime_ai' ? (
                                      <div
                                        className="text-xs text-muted-foreground border border-dashed border-border/60 rounded px-3 py-2.5 bg-muted/40"
                                        data-testid="ai-managed-field"
                                      >
                                        <p className="font-medium text-foreground/80 leading-snug">Filled automatically by AI at runtime</p>
                                        <p className="mt-1 leading-relaxed break-words">
                                          Switch to <strong>You</strong> above to enter a custom static value instead.
                                        </p>
                                        {lastResolvedInputs?.[selectedNode.id]?.[field.key] && (
                                          <div className="mt-2 p-2.5 rounded border border-border/40 bg-background/60 space-y-1.5">
                                            <p className="text-[11px] text-foreground/80 font-medium leading-none">Last runtime value</p>
                                            <p className="text-[10px] text-muted-foreground leading-snug">
                                              {new Date(lastResolvedInputs[selectedNode.id][field.key].startedAt).toLocaleString()}
                                            </p>
                                            <pre className="max-h-28 overflow-auto rounded bg-muted/40 p-2 font-mono text-[10px] whitespace-pre-wrap break-all w-full">
                                              {typeof lastResolvedInputs[selectedNode.id][field.key].value === 'string'
                                                ? lastResolvedInputs[selectedNode.id][field.key].value as string
                                                : JSON.stringify(lastResolvedInputs[selectedNode.id][field.key].value, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="min-w-0 max-w-full space-y-1 overflow-hidden">
                                        {selectedNode.data.type === 'if_else' && field.key === 'conditions' ? (
                                          <div className="space-y-2">
                                            <ToggleGroup
                                              type="single"
                                              value={ifElseConditionsEditorMode}
                                              onValueChange={(v) => {
                                                if (v === 'builder' || v === 'json') setIfElseConditionsEditorMode(v);
                                              }}
                                              className="justify-start"
                                            >
                                              <ToggleGroupItem value="builder" className="text-xs px-2 py-1">Builder</ToggleGroupItem>
                                              <ToggleGroupItem value="json" className="text-xs px-2 py-1">JSON</ToggleGroupItem>
                                            </ToggleGroup>
                                            {ifElseConditionsEditorMode === 'builder' ? (
                                              <Suspense fallback={null}>
                                                <ConditionBuilder
                                                  key={`condition-builder-${selectedNode.id}-${field.key}`}
                                                  value={(selectedNode.data.config || {})[field.key] as ConditionRule[] | string | null | undefined}
                                                  onChange={(conditions: ConditionRule[]) => {
                                                    handleConfigChange(field.key, conditions);
                                                    setIfElseConditionsJsonError(null);
                                                  }}
                                                  availableFields={availableFieldsForConditions}
                                                />
                                              </Suspense>
                                            ) : (
                                              <div className="space-y-2">
                                                <Textarea
                                                  id={`${field.key}_json`}
                                                  value={ifElseConditionsJsonText}
                                                  onChange={(e) => {
                                                    const nextText = e.target.value;
                                                    setIfElseConditionsJsonText(nextText);
                                                    try {
                                                      const parsed = JSON.parse(nextText);
                                                      if (Array.isArray(parsed)) {
                                                        handleConfigChange(field.key, normalizeIfElseConditions(parsed));
                                                        setIfElseConditionsJsonError(null);
                                                      } else if (parsed && typeof parsed === 'object') {
                                                        handleConfigChange(field.key, normalizeIfElseConditions([parsed]));
                                                        setIfElseConditionsJsonError(null);
                                                      } else {
                                                        setIfElseConditionsJsonError('JSON must be an array of condition objects.');
                                                      }
                                                    } catch {
                                                      setIfElseConditionsJsonError('Invalid JSON (fix syntax to apply).');
                                                    }
                                                  }}
                                                  placeholder={`[\n  { "field": "$json.age", "operator": "greater_than", "value": 18 }\n]`}
                                                  className="min-h-[120px] font-mono text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-ring/50"
                                                  onMouseDown={handleInputMouseDown}
                                                  onFocus={(e) => e.stopPropagation()}
                                                />
                                                {ifElseConditionsJsonError && (
                                                  <p className="text-xs text-destructive/80 flex items-center gap-1">
                                                    <XCircle className="h-3 w-3" />
                                                    {ifElseConditionsJsonError}
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          renderField(field)
                                        )}
                                        {!effectiveHelpText && (['text', 'textarea', 'json', 'number', 'select', 'time', 'date', 'cron'].includes(field.type)) && (
                                          <div className="flex min-w-0 justify-end overflow-hidden">
                                            {hasHelpLink ? (
                                              <button
                                                type="button"
                                                onClick={() => setSelectedHelp(helpInfo)}
                                                className="flex min-w-0 max-w-full cursor-pointer items-center gap-1 overflow-hidden text-right text-xs text-muted-foreground/70 transition-colors duration-150 hover:text-foreground/80"
                                              >
                                                <HelpCircle className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{fieldHelpTitle}</span>
                                              </button>
                                            ) : (
                                              <InputGuideLink
                                                fieldKey={field.key}
                                                fieldLabel={field.label}
                                                fieldType={field.type}
                                                nodeType={selectedNode.data.type}
                                                placeholder={field.placeholder}
                                                helpText={effectiveHelpText}
                                                helpCategory={field.helpCategory}
                                                docsUrl={field.docsUrl}
                                                exampleValue={field.exampleValue}
                                                options={field.options}
                                                config={selectedNode.data.config || {}}
                                                resolvedHelpContent={resolvedFieldHelp}
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              )}

              <ApprovalGateSection
                config={(selectedNode.data.config as Record<string, unknown>) || {}}
                onChange={(patch) => updateNodeConfig(selectedNode.id, patch)}
              />
            </div>
          </ScrollArea>

          <div className="px-4 py-3 border-t border-border/40 space-y-2">
            <Button
              variant="destructive"
              size="sm"
              className="w-full h-8 text-xs font-medium flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                deleteSelectedNode();
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete Node
            </Button>
            <p className="text-xs text-center text-muted-foreground/75">
              Press <kbd className="px-1 py-0.5 text-xs font-medium text-muted-foreground bg-muted/60 rounded border border-border/40">Del</kbd> or <kbd className="px-1 py-0.5 text-xs font-medium text-muted-foreground bg-muted/60 rounded border border-border/40">Backspace</kbd> to delete
            </p>
          </div>
        </>
      ) : (
        renderAIEditor()
      )}

      {/* Help Sidebar */}
      <Sheet open={!!selectedHelp} onOpenChange={(open) => !open && setSelectedHelp(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedHelp?.title || 'Help'}</SheetTitle>
            <SheetDescription>
              Follow these steps to get the required information.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedHelp?.steps.map((step, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {index + 1}
                </div>
                <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface ApprovalGateConfig {
  enabled?: boolean;
  thresholdField?: string;
  thresholdOperator?: '>' | '>=' | '<' | '<=';
  thresholdValue?: number;
}

/**
 * Generic, node-type-agnostic "require human approval before this step runs" toggle.
 * Appears for every node regardless of type — opt-in, off by default, so it never
 * adds friction to a normal workflow. See worker/src/services/execution/node-approval-service.ts
 * for the matching execution-time gate.
 */
function ApprovalGateSection({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const gate: ApprovalGateConfig = (config.approvalGate as ApprovalGateConfig) || {};

  const update = (patch: Partial<ApprovalGateConfig>) => {
    onChange({ approvalGate: { ...gate, ...patch } });
  };

  return (
    <div className="mt-4 rounded-md border border-border/40 bg-muted/10 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-xs font-medium uppercase text-muted-foreground/70">Approval</h3>
          <p className="text-xs text-muted-foreground/70">Require a human to approve before this step runs</p>
        </div>
        <Switch
          checked={!!gate.enabled}
          onCheckedChange={(checked) => update({ enabled: checked })}
        />
      </div>

      {gate.enabled && (
        <div className="space-y-2 pt-1">
          <Label className="text-xs text-muted-foreground">
            Only require approval when (optional — leave blank to always require approval)
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="field, e.g. amount"
              value={gate.thresholdField || ''}
              onChange={(e) => update({ thresholdField: e.target.value })}
              className="h-8 text-xs"
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
            <Select
              value={gate.thresholdOperator || ''}
              onValueChange={(value) => update({ thresholdOperator: value as ApprovalGateConfig['thresholdOperator'] })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=">">greater than</SelectItem>
                <SelectItem value=">=">greater or equal</SelectItem>
                <SelectItem value="<">less than</SelectItem>
                <SelectItem value="<=">less or equal</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="value"
              value={gate.thresholdValue ?? ''}
              onChange={(e) => update({ thresholdValue: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="h-8 text-xs"
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
