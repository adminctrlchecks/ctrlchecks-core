import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { awsClient } from '@/integrations/aws/client';
import { ENDPOINTS } from '@/config/endpoints';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/useRole';
import { cn } from '@/lib/utils';
import { mergeCapabilityHints } from '@/lib/aiEditorPermissions';
import { normalizeIfElseConfig } from '@/lib/ifElseConditions';
import { validateAndFixWorkflow } from '@/lib/workflowValidation';
import {
  enforceFrontendRenderContract,
  normalizeBackendWorkflow,
  validateNodeTypesRegistered,
} from '@/lib/node-type-normalizer';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useAiEditorStore, type AiEditorMessage as Message } from '@/stores/aiEditorStore';
import type {
  AiEditorCapabilitiesResponse,
  AiEditorMutationOperation,
  AiEditorNodeCandidateOption,
  AnalyzerChatMessage,
  AnalyzerRemediationCandidate,
  UnifiedAiEditorChatResult,
  WorkflowDiffSummary,
} from '@/types/aiEditor';

type AnalyzerStructuredContent = {
  summary?: string;
  dataNarration?: string;
  evidence?: string[];
  remediationCandidates?: AnalyzerRemediationCandidate[];
};

function parseAnalyzerStructuredContent(content: string): AnalyzerStructuredContent | null {
  const trimmed = content.trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('```'))) {
    return null;
  }

  const jsonText = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const hasAnalyzerShape =
      typeof parsed.summary === 'string' ||
      typeof parsed.dataNarration === 'string' ||
      Array.isArray(parsed.evidence) ||
      Array.isArray(parsed.remediationCandidates);

    if (!hasAnalyzerShape) return null;

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
      dataNarration: typeof parsed.dataNarration === 'string' ? parsed.dataNarration : undefined,
      evidence: Array.isArray(parsed.evidence)
        ? parsed.evidence.filter((item): item is string => typeof item === 'string')
        : undefined,
      remediationCandidates: Array.isArray(parsed.remediationCandidates)
        ? parsed.remediationCandidates.filter((item): item is AnalyzerRemediationCandidate => {
            return item && typeof item === 'object' && typeof (item as AnalyzerRemediationCandidate).userFacingSummary === 'string';
          })
        : undefined,
    };
  } catch {
    return null;
  }
}

interface AIEditorPanelProps {
  /**
   * False while the panel is mounted but not visible (Expert mode, Properties tab selected).
   * Gates the network hydration and auto-scroll exactly as the old `viewMode === 'ai-editor'`
   * checks did, so nothing is fetched until the panel is actually opened.
   */
  isActive?: boolean;
  className?: string;
}

/**
 * The single implementation of the AI Editor. Rendered as the "AI Editor" tab body inside
 * PropertiesPanel in Expert mode, and standalone in the right column in Prompt mode.
 * Conversation state lives in `useAiEditorStore` so it survives moving between those hosts.
 */
export default function AIEditorPanel({ isActive = true, className }: AIEditorPanelProps) {
  const {
    selectedNode,
    workflowId,
    nodes,
    edges,
    setNodes,
    setEdges,
    setIsDirty,
    setAiEditedNodeIds,
    clearAiEditedNodeHighlight,
  } = useWorkflowStore();
  const { role: appRole } = useRole();
  const { toast } = useToast();

  const {
    aiMessages, setAiMessages,
    aiInput, setAiInput,
    isAiLoading, setIsAiLoading,
    aiCapabilities, setAiCapabilities,
    pendingAiOperations, setPendingAiOperations,
    pendingAiDiff, setPendingAiDiff,
    setPendingAiPrompt,
    pendingAiPrompt,
    pendingPreviewValid, setPendingPreviewValid,
    showAiDiffDetails, setShowAiDiffDetails,
    isAiApplyLoading, setIsAiApplyLoading,
    analyzerExecutions, setAnalyzerExecutions,
    selectedExecutionId, setSelectedExecutionId,
    isLoadingExecutions, setIsLoadingExecutions,
    hydratedWorkflowId, setHydratedWorkflowId,
    remediationCandidates, setRemediationCandidates,
    isPreviewingFixIndex, setIsPreviewingFixIndex,
    nodeCandidateOptions, setNodeCandidateOptions,
    lastAiUserPrompt, setLastAiUserPrompt,
  } = useAiEditorStore();

  const aiScrollAreaRef = useRef<HTMLDivElement>(null);
  const aiHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll AI messages — the ref is the scrollable div itself
  useEffect(() => {
    if (aiScrollAreaRef.current && isActive) {
      aiScrollAreaRef.current.scrollTop = aiScrollAreaRef.current.scrollHeight;
    }
  }, [aiMessages, isActive]);

  // AI editor: server-side capability matrix (authoritative for apply gates)
  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive, workflowId, setAiCapabilities]);

  // AI editor analyzer: hydrate persisted per-workflow chat memory + recent execution list.
  // Runs once per workflow when the AI Editor panel is first opened.
  useEffect(() => {
    if (!isActive || !workflowId) return;
    if (hydratedWorkflowId === workflowId) return;
    setHydratedWorkflowId(workflowId);
    let cancelled = false;
    setIsLoadingExecutions(true);
    (async () => {
      try {
        const { data: sessionData } = await awsClient.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;

        const [sessionRes, executionsRes] = await Promise.all([
          fetch(`${ENDPOINTS.itemBackend}/api/ai/editor/analyze/session/${encodeURIComponent(workflowId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${ENDPOINTS.itemBackend}/api/ai/editor/executions/${encodeURIComponent(workflowId)}?limit=20`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (sessionRes.ok) {
          const sessionJson = await sessionRes.json().catch(() => null);
          const persisted = (sessionJson?.messages || []) as AnalyzerChatMessage[];
          if (!cancelled && persisted.length > 0) {
            setAiMessages(
              persisted
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((m) => ({
                  id: m.id,
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                  timestamp: new Date(m.createdAt),
                }))
            );
          }
        }

        if (executionsRes.ok) {
          const executionsJson = await executionsRes.json().catch(() => null);
          if (!cancelled && Array.isArray(executionsJson?.executions)) {
            setAnalyzerExecutions(executionsJson.executions);
          }
        }
      } catch {
        // Non-fatal: analyzer memory/execution history is a progressive enhancement.
      } finally {
        if (!cancelled) setIsLoadingExecutions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isActive,
    workflowId,
    hydratedWorkflowId,
    setHydratedWorkflowId,
    setIsLoadingExecutions,
    setAiMessages,
    setAnalyzerExecutions,
  ]);

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
    setNodeCandidateOptions([]);
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
    const isBlankWorkflow = !Array.isArray(currentWorkflow.nodes) || currentWorkflow.nodes.length === 0;
    const isBlankBootstrapPreview =
      isBlankWorkflow && pendingAiOperations.every((operation) => operation.kind === 'add_node');
    if (isBlankWorkflow && !isBlankBootstrapPreview) {
      toast({
        title: 'Nothing to apply',
        description: 'This preview does not create starter nodes for the blank workflow.',
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

  // AI Editor send handler: one unified assistant turn (analysis, clarification, or edit preview).
  const handleAiSend = async (options?: { promptOverride?: string; selectedCandidateNodeType?: string; visibleUserMessage?: string }) => {
    const rawPrompt = (options?.promptOverride ?? aiInput).trim();
    if (!rawPrompt || isAiLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: options?.visibleUserMessage || rawPrompt,
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
    const outgoingPrompt = rawPrompt;
    if (!options?.promptOverride) {
      setLastAiUserPrompt(outgoingPrompt);
      setAiInput('');
    }
    if (!options?.selectedCandidateNodeType) {
      setNodeCandidateOptions([]);
    }
    setIsAiLoading(true);

    try {
      const currentWorkflow = buildAiEditorWorkflowPayload();

      const { data: sessionData } = await awsClient.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('Sign in is required for the AI editor.');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      let response: Response;
      try {
        response = await fetch(`${ENDPOINTS.itemBackend}/api/ai/editor/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            workflowId: workflowId || undefined,
            workflow: currentWorkflow,
            selectedExecutionId: selectedExecutionId || undefined,
            nodeId: selectedNode?.id,
            prompt: outgoingPrompt,
            conversationHistory,
            selectedCandidateNodeType: options?.selectedCandidateNodeType,
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
      const result = (data.result || {}) as UnifiedAiEditorChatResult;
      const assistantText: string =
        result.message || 'I reviewed the workflow context.';
      const ops = (result.operations || []) as AiEditorMutationOperation[];
      const diff = (result.diff || null) as WorkflowDiffSummary | null;

      setPendingAiOperations(ops);
      setPendingAiDiff(diff);
      setPendingAiPrompt(ops.length > 0 ? outgoingPrompt : '');
      const pe = Array.isArray(data.previewErrors) ? data.previewErrors : [];
      setPendingPreviewValid(data.previewValid !== false && pe.length === 0);
      setRemediationCandidates(Array.isArray(result.remediationCandidates) ? result.remediationCandidates : []);
      setNodeCandidateOptions(Array.isArray(result.candidateOptions) ? result.candidateOptions : []);

      let extra = '';
      if (pe.length) {
        extra += `\n\nDry-run issues:\n- ${pe.slice(0, 5).join('\n- ')}`;
      }
      if (!result.needsClarification && (result.requiresApply || result.intent === 'propose_change' || result.intent === 'mixed') && ops.length === 0) {
        extra += '\n\n(No structured operations returned. Try naming the exact node or field you want changed.)';
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

  const handleSelectNodeCandidate = (candidate: AiEditorNodeCandidateOption) => {
    const basePrompt = lastAiUserPrompt || aiInput.trim();
    if (!basePrompt) return;
    void handleAiSend({
      promptOverride: `${basePrompt}\n\nSelected implementation: ${candidate.label} (${candidate.nodeType}).`,
      selectedCandidateNodeType: candidate.nodeType,
      visibleUserMessage: `Use ${candidate.label}`,
    });
  };

  const handleDismissRemediation = (index: number) => {
    setRemediationCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  // "Preview fix": turns an Analyze-detected remediation candidate into a real Suggest-edits
  // preview. This never mutates the workflow directly — it calls the same /editor/suggest
  // pipeline used by the Suggest tab, so the result goes through full sanitization + dry-run
  // validation and lands in the existing pendingAiOperations/pendingAiDiff Apply flow.
  const handlePreviewFix = async (candidate: AnalyzerRemediationCandidate, index: number) => {
    if (isPreviewingFixIndex !== null || isAiLoading) return;

    const perm = mergeCapabilityHints(aiCapabilities, appRole);
    if (!perm.canSuggest) {
      toast({
        title: 'Cannot preview fix',
        description: 'Suggesting edits requires moderator or admin.',
        variant: 'destructive',
      });
      return;
    }

    setIsPreviewingFixIndex(index);
    const derivedPrompt = [
      'Prepare a preview for this fix found during analysis of a past run.',
      '',
      `Issue summary: ${candidate.userFacingSummary}`,
      `Risk: ${candidate.risk}`,
      typeof candidate.confidence === 'number' ? `Confidence: ${Math.round(candidate.confidence * 100)}%` : '',
      '',
      'The analyzer proposed these operations from execution evidence. Prefer these exact operations when they are valid for the current workflow; if one is invalid, translate it into the closest valid AI Editor operation. Do not invent unrelated edits.',
      JSON.stringify(candidate.proposedOperations || [], null, 2),
    ].filter(Boolean).join('\n');

    try {
      const currentWorkflow = buildAiEditorWorkflowPayload();
      if (!Array.isArray(currentWorkflow.nodes) || currentWorkflow.nodes.length === 0) {
        throw new Error('Preview fixes require an existing workflow with run context. Ask the AI editor to create starter nodes first.');
      }

      const { data: sessionData } = await awsClient.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('Sign in is required for the AI editor.');
      }

      const conversationHistory = aiMessages
        .filter((m) => m.id !== 'welcome')
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-24)
        .map((m) => ({
          role: m.role,
          content: m.content.length > 14000 ? `${m.content.slice(0, 14000)}…` : m.content,
        }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      let response: Response;
      try {
        response = await fetch(`${ENDPOINTS.itemBackend}/api/ai/editor/suggest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            workflowId: workflowId || undefined,
            workflow: currentWorkflow,
            nodeId: selectedNode?.id,
            prompt: derivedPrompt,
            conversationHistory,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Try again.');
        }
        throw fetchError;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'AI request failed' }));
        throw new Error(error.error || error.message || 'AI request failed');
      }

      const data = await response.json();
      const result = data.result || {};
      const assistantText: string =
        result.message || 'Here is a preview of the fix. Review and click Apply to commit.';
      const ops = (result.operations || []) as AiEditorMutationOperation[];
      const diff = (result.diff || null) as WorkflowDiffSummary | null;

      setPendingAiOperations(ops);
      setPendingAiDiff(diff);
      setPendingAiPrompt(derivedPrompt);
      const pe = Array.isArray(data.previewErrors) ? data.previewErrors : [];
      setPendingPreviewValid(data.previewValid !== false && pe.length === 0);

      let extra = '';
      if (data.previewErrors?.length) {
        extra += `\n\nDry-run issues:\n- ${data.previewErrors.slice(0, 5).join('\n- ')}`;
      }
      if (ops.length === 0) {
        extra += '\n\n(No structured operations returned — try rephrasing or dismiss this suggestion.)';
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
      handleDismissRemediation(index);
    } catch (error: any) {
      const errorMessage = error?.message || 'Could not prepare a preview for this fix.';
      toast({
        title: 'Preview fix failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsPreviewingFixIndex(null);
    }
  };

  const perm = mergeCapabilityHints(aiCapabilities, appRole);
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
      <ul className="min-w-0 max-w-full text-[11px] text-muted-foreground space-y-1 list-disc pl-4 mt-2">
        {bullets}
      </ul>
    ) : null;
  };

  const renderAiMessageContent = (msg: Message): ReactNode => {
    if (msg.role === 'user') {
      return <span className="whitespace-pre-wrap">{msg.content}</span>;
    }

    const structured = parseAnalyzerStructuredContent(msg.content);
    if (!structured) {
      return <span className="whitespace-pre-wrap">{msg.content}</span>;
    }

    const fixes = structured.remediationCandidates || [];

    return (
      <div className="min-w-0 max-w-full space-y-2 overflow-hidden">
        {structured.summary && (
          <p className="text-xs leading-relaxed text-foreground break-words">
            {structured.summary}
          </p>
        )}

        {structured.dataNarration && (
          <div className="min-w-0 max-w-full overflow-hidden rounded-sm border border-border/50 bg-background/50 px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">
              What happened
            </p>
            <p className="text-[11px] leading-relaxed text-foreground/85 break-words">
              {structured.dataNarration}
            </p>
          </div>
        )}

        {structured.evidence && structured.evidence.length > 0 && (
          <div className="min-w-0 max-w-full overflow-hidden rounded-sm border border-border/50 bg-background/50 px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">
              Evidence
            </p>
            <ul className="min-w-0 max-w-full space-y-1">
              {structured.evidence.slice(0, 4).map((item, index) => (
                <li key={`${msg.id}-evidence-${index}`} className="text-[11px] leading-relaxed text-foreground/80 break-words">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {fixes.length > 0 && (
          <div className="min-w-0 max-w-full overflow-hidden rounded-sm border border-amber-500/35 bg-amber-500/5 px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase text-amber-700 dark:text-amber-300 mb-1">
              Possible fix
            </p>
            <div className="min-w-0 max-w-full space-y-1.5">
              {fixes.slice(0, 2).map((candidate, index) => (
                <div key={`${msg.id}-fix-${index}`} className="min-w-0 max-w-full space-y-0.5 overflow-hidden">
                  <p className="text-[11px] leading-relaxed text-foreground/85 break-words">
                    {candidate.userFacingSummary}
                  </p>
                  <p className="text-[10px] text-muted-foreground break-words">
                    Risk: {candidate.risk}
                    {typeof candidate.confidence === 'number' ? ` - confidence ${Math.round(candidate.confidence * 100)}%` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex-1 min-h-0 min-w-0 max-w-full flex flex-col overflow-hidden', className)}>
      <div className="min-w-0 max-w-full overflow-hidden px-4 pt-3 pb-2 border-b border-border/40 space-y-2 shrink-0">
        <div className="flex min-w-0 max-w-full items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">Workflow assistant</p>
          </div>
          {pendingAiOperations.length > 0 && (
            <span className="shrink-0 rounded-sm border border-violet-500/30 bg-violet-500/5 px-2 py-1 text-[10px] text-violet-700 dark:text-violet-300">
              Preview ready
            </span>
          )}
        </div>
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
        {workflowId && isLoadingExecutions && analyzerExecutions.length === 0 && (
          <p className="text-[10px] text-muted-foreground leading-snug">Loading run history…</p>
        )}
        {workflowId && analyzerExecutions.length > 0 && (
          <div className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden">
            <Select
              value={selectedExecutionId || '__none__'}
              onValueChange={(v) => setSelectedExecutionId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className="h-7 min-w-0 flex-1 text-[11px]">
                <SelectValue placeholder="Discuss the workflow (no run selected)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-[11px]">
                  No run selected — discuss workflow/history
                </SelectItem>
                {analyzerExecutions.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id} className="text-[11px]">
                    {ex.status === 'failed' ? '⚠ ' : ex.status === 'completed' || ex.status === 'success' ? '✓ ' : '… '}
                    {ex.startedAt ? new Date(ex.startedAt).toLocaleString() : ex.id.slice(0, 8)}
                    {ex.failedSteps > 0 ? ` (${ex.failedSteps} node failure${ex.failedSteps > 1 ? 's' : ''})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {selectedExecutionId && (
          <p className="text-[10px] text-violet-600 dark:text-violet-400 leading-snug">
            Discussing a specific past run — questions and answers below reference its actual node inputs/outputs.
          </p>
        )}
      </div>

      {/* Plain overflow div (see properties body): Radix ScrollArea's table viewport breaks width containment */}
      <div className="flex-1 min-h-0 min-w-0 max-w-full overflow-y-auto overflow-x-hidden px-4 py-3" ref={aiScrollAreaRef}>
        <div className="min-w-0 max-w-full space-y-3 overflow-hidden">
          {aiMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex min-w-0 max-w-full flex-col gap-1 overflow-hidden',
                msg.role === 'user' ? 'ml-auto w-fit items-end' : 'mr-auto w-full items-start'
              )}
            >
              <div
                className={cn(
                  'min-w-0 max-w-full overflow-hidden px-3 py-2 rounded-sm text-xs leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground break-words'
                    : 'w-full bg-muted/60 text-foreground/90 border border-border/40'
                )}
              >
                {renderAiMessageContent(msg)}
              </div>
              <span className="text-[10px] text-muted-foreground/60">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {nodeCandidateOptions.length > 0 && (
            <div className="mr-auto min-w-0 max-w-full overflow-hidden rounded-sm border border-sky-500/35 bg-sky-500/5 px-3 py-2 space-y-2">
              <p className="text-xs font-medium text-foreground">Choose an implementation</p>
              <div className="min-w-0 max-w-full space-y-2">
                {nodeCandidateOptions.slice(0, 4).map((candidate) => (
                  <div
                    key={candidate.nodeType}
                    className="min-w-0 max-w-full overflow-hidden rounded-sm border border-border/50 bg-background/70 px-2.5 py-2"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-foreground">
                          {candidate.label}
                        </p>
                        <p className="break-words text-[10px] text-muted-foreground">
                          {candidate.nodeType}
                          {candidate.category ? ` - ${candidate.category}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {Math.round(candidate.confidence * 100)}%
                      </span>
                    </div>
                    <p className="mt-1 break-words text-[11px] leading-snug text-foreground/80">
                      {candidate.description || candidate.reason}
                    </p>
                    {candidate.requiredFields.length > 0 && (
                      <p className="mt-1 break-words text-[10px] text-muted-foreground">
                        Required: {candidate.requiredFields.slice(0, 5).join(', ')}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-6 px-2 text-[11px]"
                      disabled={isAiLoading}
                      onClick={() => handleSelectNodeCandidate(candidate)}
                    >
                      Use this
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {remediationCandidates.map((candidate, index) => (
              <div
                key={`remediation-${index}`}
                className="mr-auto min-w-0 max-w-full overflow-hidden rounded-sm border border-amber-500/40 bg-amber-500/5 px-3 py-2 space-y-1.5"
              >
                <p className="text-xs font-medium text-foreground">AI found a possible fix</p>
                <p className="text-[11px] text-foreground/80 leading-snug break-words">{candidate.userFacingSummary}</p>
                <p className="text-[10px] text-muted-foreground break-words">
                  Risk:{' '}
                  <span
                    className={cn(
                      'font-medium',
                      candidate.risk === 'high'
                        ? 'text-destructive'
                        : candidate.risk === 'medium'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {candidate.risk}
                  </span>
                  {typeof candidate.confidence === 'number' ? ` · confidence ${Math.round(candidate.confidence * 100)}%` : ''}
                </p>
                <div className="flex min-w-0 flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px] px-2"
                    disabled={isPreviewingFixIndex !== null || isAiLoading}
                    onClick={() => void handlePreviewFix(candidate, index)}
                  >
                    {isPreviewingFixIndex === index ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    Preview fix
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-2"
                    disabled={isPreviewingFixIndex !== null}
                    onClick={() => handleDismissRemediation(index)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          {pendingAiOperations.length > 0 && (
            <div className="mr-auto min-w-0 max-w-full overflow-hidden rounded-sm border border-violet-500/35 bg-violet-500/5 px-3 py-2">
              <p className="text-xs font-medium text-foreground">Pending AI changes</p>
              {!pendingPreviewValid && (
                <p className="text-[10px] text-destructive mt-1 break-words">
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
                <pre className="mt-2 max-h-40 max-w-full overflow-auto rounded border border-border/40 bg-muted/40 p-2 text-[10px] whitespace-pre">
                  {JSON.stringify(pendingAiOperations, null, 2)}
                </pre>
              )}
            </div>
          )}
          {isAiLoading && (
            <div className="mr-auto flex min-w-0 max-w-full flex-col items-start gap-1">
              <div className="flex min-w-0 max-w-full items-center gap-2 rounded-sm border border-border/40 bg-muted/60 px-3 py-2 text-foreground/70">
                <Loader2 className="h-3 w-3 text-muted-foreground/60 animate-spin" />
                <span className="text-xs">Processing...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {pendingAiOperations.length > 0 && (
        <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-border/40 bg-muted/20 px-4 py-2 shrink-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
          </div>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {pendingAiOperations.length} op(s)
          </span>
        </div>
      )}

      <div className="min-w-0 max-w-full px-4 py-3 border-t border-border/40 bg-background shrink-0">
        <div className="flex min-w-0 max-w-full gap-2">
          <Input
            placeholder="Ask about a run, output, failure, or workflow change..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                void handleAiSend();
              }
            }}
            disabled={isAiLoading}
            className="min-w-0 flex-1 h-8 text-xs border-border/60 focus-visible:ring-1 focus-visible:ring-ring/50"
          />
          <Button
            size="icon"
            onClick={() => void handleAiSend()}
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
}
