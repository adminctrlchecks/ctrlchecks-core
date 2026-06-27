import { ENDPOINTS } from '@/config/endpoints';
import { AppBrand } from '@/components/brand/AppBrand';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    ArrowRight, AlertCircle,
    Settings2, CheckCircle2, Play, RefreshCw, Layers, Sparkles, Loader2, Check, Sun, Moon, Brain, ChevronDown,
    User, Lock, KeyRound,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { awsClient } from '@/integrations/aws/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowStore } from '@/stores/workflowStore';
import { motion, AnimatePresence } from 'framer-motion';
import { validateAndFixWorkflow, type ValidateAndFixWorkflowOptions } from '@/lib/workflowValidation';
import { computeExecutionOrderRank } from '@/lib/workflowGraphValidator';
import { useTheme } from '@/hooks/useTheme';
import { InputGuideLink } from './InputGuideLink';
import { GlassBlurLoader } from '@/components/ui/glass-blur-loader';
import { ThemedBorderGlow } from '@/components/ui/themed-border-glow';
import { WorkflowConfirmationStep } from './WorkflowConfirmationStep';
import { CredentialStatusPanel } from './CredentialStatusPanel';
import { fetchRuntimeCredentialStatus } from '@/lib/api/credentialStatus';
import { CapabilityStage } from './CapabilityStage';
import { CapabilityReviewStep } from './CapabilityReviewStep';
import type { CapabilitySelectionValidationResult } from '@/lib/capability-selection-validation';
import type { CapabilityContainer, NodeSelectionMap } from '../../types/capability-selection';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { generateFieldGuide } from './guideGenerator';
import { resolveFieldHelpContent } from '@/lib/resolve-field-help-content';
import { FieldOwnershipHelpPanel } from './FieldOwnershipHelpPanel';
import {
    resolveEffectiveFieldFillMode,
    resolveWizardFieldFillMode,
    resolveWizardEffectiveFieldFillMode,
    shouldAskWizardManualQuestion,
    wizardBulkAIModeForQuestion,
} from '@/lib/fillMode';
import { snapshotConfigFieldToString } from '@/lib/wizard-config-snapshot';
import { nodeSchemaService, type NodeDefinition } from '@/services/nodeSchemaService';
import { normalizeSelectValue } from '@/lib/wizard-field-utils';
import { resolveConfigureFieldType } from '@/lib/configure-field-control';
import {
    filterCredentialQuestionsForStep,
    applyCredentialStepIncludeOverrides,
    credentialPlaneKeyFromQuestion,
    credentialRowMustStayVisible,
    shouldShowCredentialRowOnCredentialsStep,
} from '@/lib/filter-credential-questions';
import {
    buildFieldPlaneRows,
    explainWizardOwnershipRow,
    findPlaneRow,
    selectOwnershipQuestionsFromPlane,
    selectVaultCredentialQuestionsFromPlane,
} from '@/lib/wizard-field-plane';
import {
    filterStillBlockingOAuth,
    oauthRequirementCandidates,
    oauthRowNeedsGoogleConnect,
} from '@/lib/wizard-oauth-credentials';
import {
    buildCredentialWizardView,
    groupCredentialWizardRows,
    sanitizeCredentialStatusesForWizardView,
} from '@/lib/wizard-credential-view';
import { 
    WorkflowGenerationStateManager, 
    WorkflowGenerationState,
    deriveMonotonicProgress,
    mapBackendPhaseToProgress,
    mapWizardStepToState,
    mapStateToWizardStep 
} from '@/lib/workflow-generation-state';
import {
    normalizeGenerateWorkflowUiError,
    buildGenerateWorkflowUiErrorMessage,
} from '@/lib/generate-workflow-error';
import { shouldRunAttachCredentialsAfterAttachInputs } from '@/lib/workflow-phase-contract';
import { getPromptInputLayoutState } from '@/lib/prompt-input-layout';
import { getCurrentPathWithQuery } from '@/lib/oauth-return';
import { startGoogleConnectorOAuth } from '@/lib/google-connector-oauth';
import FieldOwnershipGuidePanel from './FieldOwnershipGuidePanel';
import { buildFieldOwnershipGuideContext } from '@/lib/field-ownership-guide-context';
import {
    markAttachInputsPayloadPersisted,
    wasAttachInputsPayloadRecentlyPersisted,
} from '@/lib/attach-inputs-payload';
import { GuidedStatusCard } from '@/components/ui/guided-status-card';
import { mapWorkflowIssueToGuidance, type GuidedStatusContent } from '@/lib/workflow-guidance';
import { prepareActionableFieldExample } from '@/lib/actionable-field-example';
import {
    partitionValidatedDiscoveredCredentials,
    partitionValidatedRequiredCredentialStrings,
} from '@/lib/wizard-credential-validation';
import {
    buildFieldOwnershipCopy,
    humanizeFieldName,
    findFieldDocForQuestion,
    type FieldDesc,
} from '@/lib/wizard-field-ownership';
import { buildGenerateWorkflowCreateBody, type WizardSelectedVariationMeta } from '@/lib/wizard-generate-body';
import {
    applyFieldOwnershipPoliciesToQuestions,
    synthesizeFieldOwnershipQuestions,
    type FieldOwnershipPolicyMap,
} from '@/lib/field-ownership-policy';

/**
 * Ensures proper state transitions before setting workflow blueprint.
 * 
 * This function enforces the FSM transition rules:
 * - STATE_2_CLARIFICATION_ACTIVE ? STATE_3_UNDERSTANDING_CONFIRMED ? (STATE_4_CREDENTIAL_COLLECTION if needed) ? STATE_5_WORKFLOW_BUILDING
 * 
 * @param stateManager - The state manager instance
 * @param finalUnderstanding - The final understanding/prompt (for confirming understanding)
 * @param requiredCredentials - Array of required credential names (to check if we need STATE_4)
 */
const ensureStateForBlueprint = (
    stateManager: WorkflowGenerationStateManager, 
    finalUnderstanding?: string,
    requiredCredentials?: string[]
) => {
    const currentState = stateManager.getCurrentState();
    const executionState = stateManager.getExecutionState();
    
    // STATE_2_CLARIFICATION_ACTIVE ? STATE_3_UNDERSTANDING_CONFIRMED
    if (currentState === WorkflowGenerationState.STATE_2_CLARIFICATION_ACTIVE) {
        // First confirm understanding if not already done
        if (!executionState.final_understanding && finalUnderstanding) {
            const confirmResult = stateManager.confirmUnderstanding(finalUnderstanding);
            if (!confirmResult.success) {
                console.warn('[StateManager] Failed to confirm understanding:', confirmResult.error);
                return; // Cannot proceed without understanding confirmation
            }
        }
        // After confirmation, we'll be in STATE_3_UNDERSTANDING_CONFIRMED, so continue below
    }
    
    // STATE_3_UNDERSTANDING_CONFIRMED ? STATE_5_WORKFLOW_BUILDING
    if (currentState === WorkflowGenerationState.STATE_3_UNDERSTANDING_CONFIRMED) {
        const buildResult = stateManager.startBuilding();
        if (!buildResult.success) {
            console.error('[StateManager] Failed to start building:', buildResult.error);
            throw new Error(buildResult.error || 'Failed to start building workflow');
        }
    }
    
    // STATE_4_CREDENTIAL_COLLECTION ? STATE_5_WORKFLOW_BUILDING
    if (currentState === WorkflowGenerationState.STATE_4_CREDENTIAL_COLLECTION) {
        const buildResult = stateManager.startBuilding();
        if (!buildResult.success) {
            console.error('[StateManager] Failed to start building:', buildResult.error);
            throw new Error(buildResult.error || 'Failed to start building workflow');
        }
    }
    
    // If we're already in STATE_5_WORKFLOW_BUILDING or later, we're good
    // No action needed
};

/** True when backend pipeline contract is satisfied: safe to persist and open builder. */
function isPipelineContractReady(data: { phase?: string; success?: boolean } | null | undefined): boolean {
    // Accept both 'ready' (legacy create pipeline) and 'complete' (AI-first pipeline)
    return (data?.phase === 'ready' || data?.phase === 'complete') && data?.success !== false;
}

function groupQuestionsByNode(questions: any[]) {
    const grouped = new Map<string, { nodeLabel: string; nodeType: string; fields: any[] }>();
    questions.forEach((q: any) => {
        const key = q.nodeId || `${q.nodeLabel}:${q.nodeType}`;
        if (!grouped.has(key)) {
            grouped.set(key, {
                nodeLabel: q.nodeLabel || q.nodeType || 'Node',
                nodeType: q.nodeType || 'node',
                fields: [],
            });
        }
        grouped.get(key)!.fields.push(q);
    });
    return Array.from(grouped.entries()).map(([nodeId, value]) => ({ nodeId, ...value }));
}

type FieldDescMap = Record<string, FieldDesc>;

function mergeBuildAiUsageSnapshot(existing: any, delta: any) {
    if (!delta || typeof delta !== 'object' || !delta.totals || Number(delta.totals.callCount || 0) <= 0) {
        return existing || null;
    }
    const base = existing && typeof existing === 'object' ? existing : {};
    const baseTotals = base.totals || {};
    const nextTotals = {
        promptTokens: Number(baseTotals.promptTokens || 0) + Number(delta.totals.promptTokens || 0),
        completionTokens: Number(baseTotals.completionTokens || 0) + Number(delta.totals.completionTokens || 0),
        totalTokens: Number(baseTotals.totalTokens || 0) + Number(delta.totals.totalTokens || 0),
        callCount: Number(baseTotals.callCount || 0) + Number(delta.totals.callCount || 0),
    };
    const byStage: Record<string, any> = { ...(base.byStage || {}) };
    Object.entries(delta.byStage || {}).forEach(([stage, value]: [string, any]) => {
        const prev = byStage[stage] || {};
        byStage[stage] = {
            promptTokens: Number(prev.promptTokens || 0) + Number(value?.promptTokens || 0),
            completionTokens: Number(prev.completionTokens || 0) + Number(value?.completionTokens || 0),
            totalTokens: Number(prev.totalTokens || 0) + Number(value?.totalTokens || 0),
            callCount: Number(prev.callCount || 0) + Number(value?.callCount || 0),
        };
    });
    return {
        calls: [...(Array.isArray(base.calls) ? base.calls : []), ...(Array.isArray(delta.calls) ? delta.calls : [])],
        totals: nextTotals,
        byStage,
        lastUpdatedAt: new Date().toISOString(),
    };
}

function credentialWizardFriendlyStatus(status: string): string {
    switch (status) {
        case 'required_missing':
            return 'Needs your secret';
        case 'resolved_connected':
            return 'Connected';
        case 'not_required':
            return 'Not required';
        default:
            return status;
    }
}

type WizardStep = 'idle' | 'analyzing' | 'summarize' | 'questioning' | 'capability-selection' | 'refining' | 'confirmation' | 'workflow-confirmation' | 'field-ownership' | 'credentials' | 'configure' | 'configuration' | 'building' | 'executing' | 'complete'
    // New capability-node-selection-flow steps (tasks 10.1, 10.2)
    | 'capability-node-selection'   // CapabilityStage: user selects one node per container
    | 'capability-review';          // CapabilityReviewStep: user reviews structural prompt before Backend_Generation

interface AgentQuestion {
    id: string;
    text: string;
    options: string[];
}

interface AnalysisResult {
    summary: string;
    questions: AgentQuestion[];
    clarifiedPromptPreview: string;
    predictedStepCount: number;
}

interface RefinementResult {
    refinedPrompt: string;
    systemPrompt?: string;
    enhancedPrompt?: string;
    questions?: Array<{
        id?: string;
        text?: string;
        label?: string;
        question?: string;
        fieldName?: string;
        name?: string;
        type?: string;
        placeholder?: string;
        helpText?: string;
        required?: boolean;
        nodeId?: string;
        nodeLabel?: string;
        category?: string;
    }>;
    workflow?: {
        nodes: any[];
        edges: any[];
    };
    nodesNeedingConfig?: Array<{ nodeId: string; nodeType: string; properties: string[] }>;
    requirements?: {
        urls?: string[];
        apis?: string[];
        credentials?: string[];
        schedules?: string[];
        platforms?: string[];
    } | Array<{
        key: string;
        label: string;
        type: string;
        description: string;
    }>;
    stageTrace?: Array<{
        stage: string;
        durationMs: number;
        outputSummary: string;
        error?: string;
    }>;
    validationIssues?: Array<{ severity: string; description: string }>;
    fieldOwnershipMap?: Record<string, Record<string, string>>;
    fieldOwnershipPolicyMap?: FieldOwnershipPolicyMap;
}

interface CapabilityOptionStep {
    stepId: string;
    stepText: string;
    intentClass: 'trigger' | 'data_source' | 'communication' | 'logic' | 'transformation' | 'generic_action';
    candidateNodeTypes: string[];
    defaultSuggestedNodeType: string | null;
    selectionPolicy: {
        multiSelectAllowed: boolean;
        required: boolean;
    };
    confidence?: number;
    ambiguous?: boolean;
    reason?: string;
}

type SummaryV2 = {
    graphOverview: {
        triggerNodeIds: string[];
        terminalNodeIds: string[];
        totalNodes: number;
        totalEdges: number;
        hasBranching: boolean;
    };
    executionBackbone: Array<{ order: number; nodeId: string; nodeType: string; label: string; responsibility: string }>;
    branches: Array<{
        branchNodeId: string;
        branchNodeType: string;
        cases: Array<{ caseKey: string; targetNodeId: string; targetNodeType: string; terminalBehavior: string }>;
    }>;
    nodes: Array<{ nodeId: string; nodeType: string; label: string; purpose: string; inputEffect: string; outputEffect: string }>;
    pathOutcomes: Array<{ pathId: string; condition: string; nodePath: string[]; terminalNodeId: string; outcome: string }>;
    validationFindings: Array<{ code: string; severity: 'error' | 'warning'; message: string }>;
} | null;

/**
 * Parse a structuredSummary string into its display sections.
 * Strips the configuration contract boilerplate ? only Goal, Intent alignment,
 * Execution steps, and Terminals are shown to the user.
 */
function parseStructuredSummary(raw: string): {
    goal: string;
    intentAlignment: string;
    executionSteps: string[];
    terminals: string;
} {
    const goal = raw.match(/^Goal:\s*([\s\S]*?)(?=\n\n(?:Intent alignment:|Execution:|Terminals:|##|$))/m)?.[1]?.trim() ?? '';
    const intentAlignment = raw.match(/Intent alignment:\s*([\s\S]*?)(?=\n\n(?:Execution:|Terminals:|##|$))/m)?.[1]?.trim() ?? '';
    const executionBlock = raw.match(/Execution:\s*([\s\S]*?)(?=\n\n(?:Terminals:|##|$))/m)?.[1]?.trim() ?? '';
    const terminals = raw.match(/Terminals?:\s*([^\n]+)/m)?.[1]?.trim() ?? '';
    const executionSteps = executionBlock
        .split('\n')
        .map(l => l.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);
    return { goal, intentAlignment, executionSteps, terminals };
}

/** Clean structured display of the workflow plan ? no boilerplate, no config contract. */
function StructuredPlanDisplay({ summary, compact = false }: { summary: string; compact?: boolean }) {
    const { goal, intentAlignment, executionSteps, terminals } = parseStructuredSummary(summary);
    if (!goal && executionSteps.length === 0) {
        return <p className={compact ? 'text-xs text-slate-300/90' : 'text-sm text-foreground'}>{summary}</p>;
    }
    if (compact) {
        return (
            <div className="space-y-1.5 text-xs text-slate-300/90">
                {goal && <p className="font-medium text-slate-200 leading-snug">{goal}</p>}
                {executionSteps.length > 0 && (
                    <ol className="space-y-0.5 pl-3 list-decimal list-outside">
                        {executionSteps.map((s, i) => <li key={i} className="leading-snug">{s}</li>)}
                    </ol>
                )}
                {terminals && <p className="text-slate-400 italic">{terminals}</p>}
            </div>
        );
    }
    return (
        <div className="space-y-3 text-sm">
            {goal && (
                <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Goal</span>
                    <p className="mt-0.5 text-foreground leading-relaxed">{goal}</p>
                </div>
            )}
            {intentAlignment && (
                <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Intent alignment</span>
                    <p className="mt-0.5 text-foreground/80 leading-relaxed">{intentAlignment}</p>
                </div>
            )}
            {executionSteps.length > 0 && (
                <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Execution</span>
                    <ol className="mt-1 space-y-1 pl-4 list-decimal list-outside">
                        {executionSteps.map((s, i) => (
                            <li key={i} className="text-foreground/90 leading-relaxed">{s}</li>
                        ))}
                    </ol>
                </div>
            )}
            {terminals && (
                <p className="text-xs text-muted-foreground italic border-t border-border/40 pt-2">{terminals}</p>
            )}
        </div>
    );
}

function SummaryV2Display({ summaryV2, compact = false }: { summaryV2: SummaryV2; compact?: boolean }) {
    if (!summaryV2) return null;
    const overview = summaryV2.graphOverview;
    return (
        <div className={compact ? 'space-y-1 text-xs text-slate-300/90' : 'space-y-3 text-sm'}>
            <p className={compact ? 'font-medium text-slate-200' : 'font-medium text-foreground'}>
                Graph: {overview.totalNodes} nodes, {overview.totalEdges} edges, {overview.hasBranching ? 'branching flow' : 'linear flow'}
            </p>
            {summaryV2.executionBackbone.length > 0 && (
                <ol className={compact ? 'pl-3 list-decimal space-y-0.5' : 'pl-4 list-decimal space-y-1'}>
                    {summaryV2.executionBackbone.slice(0, compact ? 3 : 8).map((step) => (
                        <li key={`${step.nodeId}-${step.order}`}>
                            <span className="font-medium">{step.label}</span>
                            {!compact && <span className="text-muted-foreground"> — {step.responsibility}</span>}
                        </li>
                    ))}
                </ol>
            )}
            {summaryV2.branches.length > 0 && !compact && (
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Branches</span>
                    {summaryV2.branches.map((branch) => (
                        <div key={branch.branchNodeId} className="text-foreground/90">
                            {branch.branchNodeType}: {branch.cases.map((c) => `${c.caseKey} -> ${c.targetNodeType}`).join(', ')}
                        </div>
                    ))}
                </div>
            )}
            {!compact && summaryV2.pathOutcomes.length > 0 && (
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Path outcomes</span>
                    {summaryV2.pathOutcomes.slice(0, 6).map((path) => (
                        <div key={path.pathId} className="text-foreground/80">
                            {path.pathId}: {path.outcome}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Visual pipeline stage trace ? shows each AI stage result as a node card. */
function PipelineStageTrace({ stageTrace }: { stageTrace: Array<{ stage: string; durationMs: number; outputSummary: string; error?: string }> }) {
    if (!stageTrace || stageTrace.length === 0) return null;

    const stageIcons: Record<string, string> = {
        intent: '??',
        capability_selection: '??',
        structural_prompt: '???',
        node_selection: '??',
        edge_reasoning: '??',
        validation: '?',
        credential_discovery: '??',
        field_ownership: '??',
    };

    const stageLabels: Record<string, string> = {
        intent: 'Intent Extraction',
        capability_selection: 'Capability Selection',
        structural_prompt: 'Structural Blueprint',
        node_selection: 'Node Selection',
        edge_reasoning: 'Edge Reasoning',
        validation: 'Validation',
        credential_discovery: 'Credential Discovery',
        field_ownership: 'Field Ownership',
    };

    return (
        <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pipeline Stages</p>
            <div className="grid grid-cols-1 gap-2">
                {stageTrace.map((s, i) => (
                    <div
                        key={i}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                            s.error
                                ? 'border-destructive/40 bg-destructive/5'
                                : 'border-border/50 bg-muted/30'
                        }`}
                    >
                        <span className="text-base mt-0.5 shrink-0">{stageIcons[s.stage] ?? '??'}</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-foreground/90">
                                    {stageLabels[s.stage] ?? s.stage.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs text-muted-foreground shrink-0">{s.durationMs}ms</span>
                            </div>
                            {s.error ? (
                                <p className="text-xs text-destructive mt-0.5">{s.error}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.outputSummary}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function initializeCapabilitySelections(steps: CapabilityOptionStep[]): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    steps.forEach((step) => {
        // Pre-select trigger default only; all other required steps must be user-reviewed.
        if (step.intentClass === 'trigger' && step.defaultSuggestedNodeType) {
            out[step.stepId] = [step.defaultSuggestedNodeType];
        } else {
            out[step.stepId] = [];
        }
    });
    return out;
}

type CapabilitySelectionResolution = {
    byStep: Record<string, string[]>;
};

function resolveCapabilitySelections(
    steps: CapabilityOptionStep[],
    selectionsByStep: Record<string, string[]>,
): CapabilitySelectionResolution {
    const byStep: Record<string, string[]> = {};

    for (const step of steps) {
        const allowed = new Set(step.candidateNodeTypes);
        const raw = Array.isArray(selectionsByStep[step.stepId]) ? selectionsByStep[step.stepId] : [];
        byStep[step.stepId] = [...new Set(raw.filter((x) => allowed.has(x)))];
    }

    return { byStep };
}

/**
 * Applies wizard fillModeValues (keys: `mode_<nodeId>_<fieldName>`) to each node's
 * `node.data.config._fillMode` map. This ensures PropertiesPanel reads the correct
 * fill mode and shows the AI runtime banner for fields the wizard set to `runtime_ai`.
 */
function applyFillModesToNodes(
    nodes: any[],
    fillModeValues: Record<string, string>
): any[] {
    return nodes.map((node: any) => {
        const fillModeMap: Record<string, string> = {};
        const prefix = `mode_${node.id}_`;
        Object.entries(fillModeValues).forEach(([key, mode]) => {
            if (key.startsWith(prefix)) {
                fillModeMap[key.slice(prefix.length)] = mode;
            }
        });
        if (Object.keys(fillModeMap).length === 0) return node;
        return {
            ...node,
            data: {
                ...node.data,
                config: {
                    ...(node.data?.config || {}),
                    _fillMode: {
                        ...(node.data?.config?._fillMode || {}),
                        ...fillModeMap,
                    },
                },
            },
        };
    });
}

export function AutonomousAgentWizard() {
    type LastResolvedInputsMap = Record<
        string,
        Record<string, { value: unknown; source?: 'static_config' | 'template' | 'deterministic_runtime' | 'runtime_ai'; executionId: string; startedAt: string }>
    >;
    const [step, setStep] = useState<WizardStep>('idle');
    const [prompt, setPrompt] = useState('');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [refinement, setRefinement] = useState<RefinementResult | null>(null);
    const [requirementsMode, setRequirementsMode] = useState<'ai' | 'manual'>('ai');
    const [requirementValues, setRequirementValues] = useState<Record<string, string>>({});
    const [requiredCredentials, setRequiredCredentials] = useState<string[]>([]);
    const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
    /** Live check: Gmail/Drive/Sheets nodes accept user google_oauth_tokens even if statuses lag. */
    const [googleOAuthConnectedLive, setGoogleOAuthConnectedLive] = useState(false);
    const [inputValues, setInputValues] = useState<Record<string, string>>({});
    // Per-field fill mode selections: mode_<nodeId>_<fieldName> -> 'manual_static' | 'runtime_ai' | 'buildtime_ai_once'
    const [fillModeValues, setFillModeValues] = useState<Record<string, string>>({});
    // Per-field on/off toggle: fieldEnabled_<nodeId>_<fieldName> -> true | false
    // Default is false (off). Auto-enabled when AI has pre-filled a value.
    const [fieldEnabledOverrides, setFieldEnabledOverrides] = useState<Record<string, boolean>>({});
    const [showCredentialStep, setShowCredentialStep] = useState(false);
    // Configure step state
    const [missingItems, setMissingItems] = useState<{
        credentials: Array<{
            provider: string;
            type: string;
            nodes: string[];
            displayName: string;
            satisfied?: boolean;
            inputType?: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'password' | 'date' | 'json';
            options?: Array<{ label: string; value: string }>;
            placeholder?: string;
            uiWidget?: 'text' | 'textarea' | 'json' | 'multi_email' | 'date';
        }>;
        inputs: Array<{
            nodeId: string;
            nodeType: string;
            nodeLabel: string;
            fieldName: string;
            description: string;
            fieldType: string;
            inputType?: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'password' | 'date' | 'json';
            options?: Array<{ label: string; value: string }>;
            placeholder?: string;
            uiWidget?: 'text' | 'textarea' | 'json' | 'multi_email' | 'date';
            required: boolean;
            examples?: any[];
        }>;
    } | null>(null);
    const [configureCredentials, setConfigureCredentials] = useState<Record<string, Record<string, any>>>({});
    const [configureInputs, setConfigureInputs] = useState<Array<{ nodeId: string; fieldName: string; value: any }>>([]);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [configureGuidance, setConfigureGuidance] = useState<GuidedStatusContent | null>(null);
    const [workflowReady, setWorkflowReady] = useState(false);
    // ? STEP-BY-STEP: Track current question index for wizard flow
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [credentialQuestionIndex, setCredentialQuestionIndex] = useState(0);
    const [allQuestions, setAllQuestions] = useState<any[]>([]);
    const [nodeDefinitionsByType, setNodeDefinitionsByType] = useState<Record<string, NodeDefinition>>({});
    const [buildingLogs, setBuildingLogs] = useState<string[]>([]);
    const [generatedWorkflowId, setGeneratedWorkflowId] = useState<string | null>(null);
    const [lastResolvedInputs, setLastResolvedInputs] = useState<LastResolvedInputsMap>({});
    // Per-node AI descriptions in the field-ownership panel: "desc_<sectionKey>_<nodeId>"
    const [nodeDescriptions, setNodeDescriptions] = useState<
        Record<string, { loading: boolean; text: string | null; open: boolean }>
    >({});
    // Per-field AI descriptions: key = nodeId, value = map of fieldName ? description object
    const [fieldDescriptions, setFieldDescriptions] = useState<
        Record<string, { loading: boolean; data: FieldDescMap | null }>
    >({});
    const [fieldGuidanceBuildAiUsage, setFieldGuidanceBuildAiUsage] = useState<any | null>(null);
    const [appliedFieldGuidanceExamples, setAppliedFieldGuidanceExamples] = useState<
        Record<string, { nodeId: string; fieldName: string; mode: 'buildtime_ai_once'; source: string }>
    >({});
    const [appliedExampleKeys, setAppliedExampleKeys] = useState<Record<string, boolean>>({});
    const [fieldHelpExpanded, setFieldHelpExpanded] = useState<Record<string, boolean>>({});
    // Global walk-through: sequential field-by-field AI explanations across the entire ownership stage
    const [globalWalkActive, setGlobalWalkActive] = useState<{
        currentNodeLabel: string;
        currentFieldLabel: string;
        currentFieldIdx: number;
        totalFields: number;
    } | null>(null);
    const globalWalkAbortRef = useRef<boolean>(false);
    const [progress, setProgress] = useState(0);
    const [currentPhase, setCurrentPhase] = useState<string>('');
    const [isComplete, setIsComplete] = useState(false);
    const [buildStartTime, setBuildStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [cognitiveTextIndex, setCognitiveTextIndex] = useState(0);
    const [originalPrompt, setOriginalPrompt] = useState<string>('');
    const [intentSnapshot, setIntentSnapshot] = useState<any | null>(null);
    const [isSummarizeLayerProcessing, setIsSummarizeLayerProcessing] = useState<boolean>(false);
    const [circleTextIndex, setCircleTextIndex] = useState(0);
    // Bug A fix: gate "Refining" overlay behind questions completion
    const [pipelineReady, setPipelineReady] = useState(false);
    const [questionsAnswered, setQuestionsAnswered] = useState(false);
    const [workflowUnderstandingConfirmed, setWorkflowUnderstandingConfirmed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [confirmationData, setConfirmationData] = useState<{
        workflowId: string;
        workflowExplanation?: string;
        /** New: typed structural prompt from WorkflowGenerationPipeline — renders non-repetitive numbered steps. */
        structuralPrompt?: {
            text: string;
            steps: Array<{ stepNumber: number; nodeType: string; displayName: string; description: string }>;
            conditions: Array<{ branchNodeType: string; trueOutcome: string; falseOutcome: string }>;
            triggerDescription: string;
            terminalAction: string;
        };
        summaryV2?: SummaryV2;
        confidenceScore?: number;
        workflow: { nodes: any[]; edges: any[] };
    } | null>(null);
    const [pendingWorkflowData, setPendingWorkflowData] = useState<{ 
        nodes: any[], 
        edges: any[], 
        update: any,
        discoveredInputs?: any[],
        discoveredCredentials?: any[],
        comprehensiveQuestions?: any[],
        unifiedReadiness?: any,
        /** Per-node credential resolution rows from generate-workflow (required_missing / resolved_connected / not_required). */
        credentialStatuses?: any[],
        /** Node-grouped credential rows for the Credentials step (from worker mapper or client fallback). */
        credentialWizardView?: { rows: any[]; groups: any[] },
        /** Field ownership map from pipeline response: nodeId ? fieldName ? FieldFillMode. */
        fieldOwnershipMap?: Record<string, Record<string, string>>,
        fieldOwnershipPolicyMap?: FieldOwnershipPolicyMap,
    } | null>(null);
    // Credential status panel ? shown after save when credentials are missing (friendly, not error)
    type CredentialEntry = { vaultKey: string; displayName: string; nodeId: string; satisfied: boolean; required: boolean };
    type CredentialPanelData = { workflowId: string; satisfied: CredentialEntry[]; missing: CredentialEntry[] };
    const [credentialPanelData, setCredentialPanelData] = useState<CredentialPanelData | null>(null);

    // Auto-execution state
    const [executionId, setExecutionId] = useState<string | null>(null);
    // Track selected variation metadata so we can send it to the backend
    const [selectedVariationMeta, setSelectedVariationMeta] = useState<{
        id: string;
        prompt: string;
        keywords?: string[];
        matchedKeywords?: string[];
        // Structured metadata coming from summarize layer / Gemini contract
        title?: string;
        strategy?: 'registry_minimal' | 'registry_extended' | 'keyword_minimal' | 'keyword_extended';
        nodes?: string[];
        requiredNodeTypes?: string[];
    } | null>(null);
    /** Single structured plan (replaces multi-variant selection) */
    const [hasWorkflowPlan, setHasWorkflowPlan] = useState(false);
    const [planSummary, setPlanSummary] = useState('');
    const [planSummaryV2, setPlanSummaryV2] = useState<SummaryV2>(null);
    const [isDegradedPlan, setIsDegradedPlan] = useState(false);
    const [planNodeHints, setPlanNodeHints] = useState<string[]>([]);
    const [planNodeReasons, setPlanNodeReasons] = useState<Record<string, string>>({});
    const [planOrderingConfidence, setPlanOrderingConfidence] = useState<number | null>(null);
    const [planOrderingHopRationales, setPlanOrderingHopRationales] = useState<string[]>([]);
    const [planRankedSelectionSummary, setPlanRankedSelectionSummary] = useState<string[]>([]);
    const [planRepairActions, setPlanRepairActions] = useState<string[]>([]);
    const [planSemanticWarnings, setPlanSemanticWarnings] = useState<string[]>([]);
    const [planBranchingOverview, setPlanBranchingOverview] = useState('');
    const [planMandatoryNodeTypes, setPlanMandatoryNodeTypes] = useState<string[]>([]);
    const [planRegistryTags, setPlanRegistryTags] = useState<string[]>([]);
    const [capabilityOptions, setCapabilityOptions] = useState<CapabilityOptionStep[]>([]);
    const [capabilitySelectionsByStep, setCapabilitySelectionsByStep] = useState<Record<string, string[]>>({});
    const [capabilitySelectionsApplied, setCapabilitySelectionsApplied] = useState(false);
    const [capabilityDefaultConfirmStepIds, setCapabilityDefaultConfirmStepIds] = useState<string[]>([]);
    const [planDiagnosticsOpen, setPlanDiagnosticsOpen] = useState(false);

    // -- Capability-Node-Selection-Flow state (tasks 10.1, 10.2) --------------
    /** Containers returned by Phase 1 (/api/capability-selection/analyze) */
    const [capNodeContainers, setCapNodeContainers] = useState<CapabilityContainer[]>([]);
    /** correlationId returned by Phase 1, threaded through Phase 2 and Phase 3 */
    const [capNodeCorrelationId, setCapNodeCorrelationId] = useState<string>('');
    /** Selections made by the user in CapabilityStage (containerId ? nodeType) */
    const [capNodeSelections, setCapNodeSelections] = useState<NodeSelectionMap>({});
    /** Structural prompt returned by Phase 2 (/api/capability-selection/generate) */
    const [capNodeStructuralPrompt, setCapNodeStructuralPrompt] = useState<string>('');
    /** Workflow returned by Phase 2 */
    const [capNodeWorkflow, setCapNodeWorkflow] = useState<any>(null);
    /** Backend validation details for the capability-node-selection UI */
    const [capNodeSelectionIssue, setCapNodeSelectionIssue] = useState<CapabilitySelectionValidationResult | null>(null);
    // -------------------------------------------------------------------------

    /** User toggles for unlockable credential fields (`unlock_<nodeId>_<field>` on attach-inputs). */
    const [credentialUnlockOverrides, setCredentialUnlockOverrides] = useState<Record<string, boolean>>({});
    /** Which credential help rows are expanded (key = `credhelp_<nodeId>_<fieldName>`). */
    const [credHelpExpanded, setCredHelpExpanded] = useState<Record<string, boolean>>({});
    /** View mode per credential help row: 'simple' | 'technical' */
    const [credHelpViewMode, setCredHelpViewMode] = useState<Record<string, 'simple' | 'technical'>>({});
    /** Per plane key: force-include optional vault row on Credentials; false = hide when allowed. */
    const [credentialStepIncludeOverrides, setCredentialStepIncludeOverrides] = useState<Record<string, boolean>>({});
    const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [executionRequestId, setExecutionRequestId] = useState<string | null>(null);
    const [executionProgress, setExecutionProgress] = useState(0);
    const [guideSelectedField, setGuideSelectedField] = useState<{ nodeId: string; fieldName: string } | null>(null);
    const { toast } = useToast();
    const { setNodes, setEdges, workflowId: activeWorkflowId, fieldOwnershipOverrides, setFieldOwnershipOverride, resetFieldOwnershipOverrides } = useWorkflowStore();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const fieldOwnershipGuideEnabled = import.meta.env.VITE_ENABLE_FIELD_OWNERSHIP_GUIDE !== 'false';
    
    // Execution Flow Architecture (STEP-2): State Manager
    const stateManagerRef = useRef<WorkflowGenerationStateManager | null>(null);
    if (!stateManagerRef.current) {
        // Initialize state manager with debug mode (can be controlled via env)
        const debugMode = import.meta.env.DEV || import.meta.env.VITE_DEBUG_STATE_MANAGER === 'true';
        stateManagerRef.current = new WorkflowGenerationStateManager(debugMode);
    }
    const stateManager = stateManagerRef.current;
    
    // Refs for auto-scrolling
    const step1Ref = useRef<HTMLDivElement>(null);
    const step2Ref = useRef<HTMLDivElement>(null);
    const step3Ref = useRef<HTMLDivElement>(null);
    const step4Ref = useRef<HTMLDivElement>(null);
    // Track which nodeIds have had field descriptions requested (to avoid re-fetching on re-renders)
    const fieldDescFetchedRef = useRef<Set<string>>(new Set());

    // Fetch missing items when entering Configure step
    useEffect(() => {
        if (step === 'configure' && generatedWorkflowId && !missingItems) {
            const fetchMissingItems = async () => {
                try {
                    console.log(`[Configure] Fetching missing items for workflow ${generatedWorkflowId}`);
                    const response = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${generatedWorkflowId}/missing-items`, {
                        headers: {
                            'Authorization': `Bearer ${(await awsClient.auth.getSession()).data.session?.access_token || ''}`,
                        },
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch missing items');
                    }
                    
                    const data = await response.json();
                    setMissingItems(data);
                    console.log(`[Configure] Found ${data.credentials?.length || 0} missing credential(s) and ${data.inputs?.length || 0} missing input(s)`);
                } catch (error: any) {
                    console.error('[Configure] Error fetching missing items:', error);
                    toast({
                        title: 'Error',
                        description: 'Failed to load configuration requirements: ' + (error.message || 'Unknown error'),
                        variant: 'destructive',
                    });
                }
            };
            
            fetchMissingItems();
        }
    }, [step, generatedWorkflowId, missingItems]);

    useEffect(() => {
        if (step !== 'configure') {
            setConfigureGuidance(null);
        }
    }, [step]);

    // Load last runtime-resolved inputs for preview in configuration questions
    useEffect(() => {
        const loadLastResolvedInputs = async () => {
            if (!generatedWorkflowId) return;
            try {
                const { data: sessionData } = await awsClient.auth.getSession();
                const response = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${generatedWorkflowId}/last-resolved-inputs`, {
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
                console.warn('[Wizard] Failed to load last resolved inputs:', error);
            }
        };
        loadLastResolvedInputs();
    }, [generatedWorkflowId]);

    // ? Handle OAuth callback return - restore workflow state after OAuth connection
    useEffect(() => {
        const checkOAuthReturn = async () => {
            // Check if we're returning from OAuth callback
            const urlParams = new URLSearchParams(window.location.search);
            const returnTo = urlParams.get('returnTo');
            const oauthState = sessionStorage.getItem('pendingWorkflowAfterOAuth');
            
            if (oauthState && returnTo) {
                try {
                    const state = JSON.parse(oauthState);
                    
                    // Check if Google OAuth is now connected
                    const { data: { user } } = await awsClient.auth.getUser();
                    if (user) {
                        const credentialStatus = await fetchRuntimeCredentialStatus('google');

                        if (credentialStatus.connected) {
                            // OAuth connected successfully - refresh credential check
                            toast({
                                title: 'Google Connected',
                                description: 'Google account connected successfully! Refreshing credentials...',
                            });
                            
                            // Remove returnTo from URL
                            window.history.replaceState({}, '', window.location.pathname);
                            
                            // If we have pending workflow data, refresh credentials
                            if (state.pendingWorkflowData && state.pendingWorkflowData.discoveredCredentials) {
                                // Filter out Google OAuth from discovered credentials (now connected)
                                const updatedCredentials = state.pendingWorkflowData.discoveredCredentials.filter(
                                    (cred: any) => !(cred.provider === 'google' && cred.type === 'oauth')
                                );
                                
                                // Update pending workflow data
                                setPendingWorkflowData({
                                    ...state.pendingWorkflowData,
                                    discoveredCredentials: updatedCredentials,
                                });
                                
                                // Update required credentials list
                                setRequiredCredentials(
                                    updatedCredentials.map((c: any) => c.vaultKey || c.credentialId)
                                );
                                
                                // If no more credentials needed, allow proceeding
                                if (updatedCredentials.length === 0) {
                                    toast({
                                        title: 'All Credentials Connected',
                                        description: 'You can now continue building your workflow.',
                                    });
                                }
                            }
                            
                            // Clear OAuth state
                            sessionStorage.removeItem('pendingWorkflowAfterOAuth');
                        }
                    }
                } catch (error) {
                    console.error('Error handling OAuth return:', error);
                }
            }
        };
        
        checkOAuthReturn();
    }, []);

    // Immediate scroll function for instant scrolling on submit
    const scrollImmediately = (stepRef: React.RefObject<HTMLDivElement>, fallbackScroll: number = 500) => {
        // Try to scroll to ref first, but also scroll by amount as immediate action
        // This ensures scrolling happens even if ref isn't ready
        window.scrollBy({ top: fallbackScroll, behavior: 'smooth' });
        
        // Also try to scroll to ref if available (for more precise positioning)
        requestAnimationFrame(() => {
            if (stepRef.current) {
                stepRef.current.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start', 
                    inline: 'nearest' 
                });
            }
        });
    };

    // Auto-scroll functionality with improved reliability (for delayed scrolling)
    const scrollToStep = (stepRef: React.RefObject<HTMLDivElement>, delay: number = 500) => {
        setTimeout(() => {
            if (stepRef.current) {
                // Use requestAnimationFrame for smoother scrolling
                requestAnimationFrame(() => {
                    stepRef.current?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start', 
                        inline: 'nearest' 
                    });
                });
            }
        }, delay);
    };

    // Auto-scroll to step 2 after analysis completes (Step 1 -> Step 2)
    useEffect(() => {
        if (step === 'questioning' && analysis) {
            // Wait for content to render, then scroll
            scrollToStep(step2Ref, 800);
        }
    }, [step, analysis]);

    // Auto-scroll to step 3 when refinement completes with systemPrompt (Step 2 -> Step 3)
    useEffect(() => {
        if (step === 'confirmation' && refinement?.systemPrompt) {
            // If requirements are not yet ready, scroll to step 3
            if (!refinement.requirements) {
                scrollToStep(step3Ref, 600);
            }
        }
    }, [step, refinement?.systemPrompt, refinement?.requirements]);

    // Auto-scroll to step 4 when requirements are ready (Step 3 -> Step 4)
    useEffect(() => {
        if (step === 'confirmation' && refinement?.requirements) {
            scrollToStep(step4Ref, 800);
        }
    }, [step, refinement?.requirements]);

    // ? Auto-scroll to current question when question index changes
    useEffect(() => {
        if (allQuestions.length > 0 && currentQuestionIndex < allQuestions.length) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                const questionElement = document.getElementById(`question-container-${currentQuestionIndex}`);
                if (questionElement) {
                    questionElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest' 
                    });
                }
            }, 150);
        }
    }, [currentQuestionIndex, allQuestions.length]);

    /** Single derived field plane: one row per question + live node config snapshot. */
    const fieldPlaneRows = useMemo(
        () => buildFieldPlaneRows(allQuestions, pendingWorkflowData?.nodes),
        [allQuestions, pendingWorkflowData?.nodes]
    );
    const credentialQuestions = useMemo(
        () => selectVaultCredentialQuestionsFromPlane(fieldPlaneRows),
        [fieldPlaneRows]
    );
    /** Field ownership UI only: vault secrets use the Credentials step, not User/AI rows. */
    const ownershipQuestions = useMemo(
        () => selectOwnershipQuestionsFromPlane(fieldPlaneRows),
        [fieldPlaneRows]
    );

    const workflowNodeIdsKey = useMemo(
        () =>
            [...(pendingWorkflowData?.nodes || []).map((n: any) => String(n?.id || ''))]
                .filter(Boolean)
                .sort()
                .join(','),
        [pendingWorkflowData?.nodes]
    );

    useEffect(() => {
        setCredentialUnlockOverrides({});
        setCredentialStepIncludeOverrides({});
    }, [workflowNodeIdsKey]);

    const serverCredentialUnlocks = useMemo(() => {
        const m: Record<string, boolean> = {};
        const nodes = pendingWorkflowData?.nodes;
        if (!Array.isArray(nodes)) return m;
        for (const node of nodes) {
            const u = node?.data?.config?._ownershipUnlock;
            if (!u || typeof u !== 'object') continue;
            for (const [field, v] of Object.entries(u)) {
                if (v === true) {
                    m[`unlock_${node.id}_${field}`] = true;
                }
            }
        }
        return m;
    }, [pendingWorkflowData?.nodes]);

    const isCredentialUnlocked = useCallback((q: any) => {
        const k = `unlock_${q.nodeId}_${q.fieldName}`;
        if (Object.prototype.hasOwnProperty.call(credentialUnlockOverrides, k)) {
            return credentialUnlockOverrides[k];
        }
        return !!serverCredentialUnlocks[k];
    }, [credentialUnlockOverrides, serverCredentialUnlocks]);

    const ownershipEffectiveModes = useMemo(() => {
        const byModeKey: Record<string, 'manual_static' | 'runtime_ai' | 'buildtime_ai_once'> = {};
        const coerced: Array<{ modeKey: string; nodeId: string; fieldName: string }> = [];
        const rowLocked = (q: any) =>
            q.ownershipUiMode === 'locked' && !(q.isUnlockableCredential && isCredentialUnlocked(q));
        ownershipQuestions.forEach((q: any) => {
            if (rowLocked(q)) return;
            const modeKey = `mode_${q.nodeId}_${q.fieldName}`;
            const resolved = resolveWizardEffectiveFieldFillMode(
                fillModeValues[modeKey],
                q.fillModeDefault as 'manual_static' | 'runtime_ai' | 'buildtime_ai_once' | undefined,
                q.supportsRuntimeAI,
                q.supportsBuildtimeAI
            );
            byModeKey[modeKey] = resolved.mode;
            if (resolved.coerced) {
                coerced.push({ modeKey, nodeId: String(q.nodeId || ''), fieldName: String(q.fieldName || '') });
            }
        });
        return { byModeKey, coerced };
    }, [ownershipQuestions, fillModeValues, isCredentialUnlocked]);
    const isCredQuestionConfigEmpty = useCallback(
        (q: Record<string, unknown>) => {
            const row = findPlaneRow(
                fieldPlaneRows,
                String(q.nodeId || ''),
                String(q.fieldName || '')
            );
            return row ? row.isEmpty : true;
        },
        [fieldPlaneRows]
    );

    const getCredentialQuestionEffectiveFillMode = useCallback(
        (q: Record<string, unknown>) => {
            const modeKey = `mode_${String(q.nodeId || '')}_${String(q.fieldName || '')}`;
            const resolved = resolveWizardEffectiveFieldFillMode(
                fillModeValues[modeKey] as
                    | 'manual_static'
                    | 'runtime_ai'
                    | 'buildtime_ai_once'
                    | undefined,
                q.fillModeDefault as 'manual_static' | 'runtime_ai' | 'buildtime_ai_once' | undefined,
                (q as { supportsRuntimeAI?: boolean }).supportsRuntimeAI,
                (q as { supportsBuildtimeAI?: boolean }).supportsBuildtimeAI
            );
            return ownershipEffectiveModes.byModeKey[modeKey] ?? resolved.mode;
        },
        [ownershipEffectiveModes.byModeKey, fillModeValues]
    );

    const getCredentialQuestionFieldPlaneRow = useCallback(
        (q: Record<string, unknown>) => {
            const row = findPlaneRow(
                fieldPlaneRows,
                String(q.nodeId || ''),
                String(q.fieldName || '')
            );
            return row ? { isEmpty: row.isEmpty } : null;
        },
        [fieldPlaneRows]
    );

    const questionByNodeFieldKey = useMemo(() => {
        const m = new Map<string, Record<string, unknown>>();
        for (const aq of allQuestions) {
            const k = `${String((aq as { nodeId?: string }).nodeId || '').trim()}::${String((aq as { fieldName?: string }).fieldName || '').trim()}`;
            if (k.endsWith('::') || k === '::') continue;
            if (!m.has(k)) m.set(k, aq as Record<string, unknown>);
        }
        return m;
    }, [allQuestions]);

    /** Strict Credentials list before per-user include/hide overrides. */
    const credentialQuestionsStrictForStep = useMemo(() => {
        const filtered = filterCredentialQuestionsForStep({
            questions: credentialQuestions as Record<string, unknown>[],
            credentialStatuses: pendingWorkflowData?.credentialStatuses ?? null,
            unifiedCredentialsMissing:
                (pendingWorkflowData?.unifiedReadiness?.credentials?.missing as
                    | Record<string, unknown>[]
                    | undefined) ?? null,
            discoveredCredentials: pendingWorkflowData?.discoveredCredentials ?? null,
        }) as any[];

        const merged = filtered.filter((q: any) => {
            const modeKey = `mode_${q.nodeId}_${q.fieldName}`;
            const resolved = resolveWizardEffectiveFieldFillMode(
                fillModeValues[modeKey] as
                    | 'manual_static'
                    | 'runtime_ai'
                    | 'buildtime_ai_once'
                    | undefined,
                q.fillModeDefault as 'manual_static' | 'runtime_ai' | 'buildtime_ai_once' | undefined,
                q.supportsRuntimeAI,
                q.supportsBuildtimeAI
            );
            const effectiveMode = ownershipEffectiveModes.byModeKey[modeKey] ?? resolved.mode;
            const planeRow = findPlaneRow(
                fieldPlaneRows,
                String(q.nodeId || ''),
                String(q.fieldName || '')
            );
            return shouldShowCredentialRowOnCredentialsStep({
                question: q,
                effectiveMode,
                fieldPlaneRow: planeRow ? { isEmpty: planeRow.isEmpty } : null,
            });
        });

        const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();
        const compositeForQ = (q: any) =>
            `${String(q.nodeId || '').trim()}::${norm(
                q.credential?.vaultKey || q.credential?.credentialId || q.fieldName
            )}`;

        const covered = new Set(merged.map(compositeForQ));
        const extras: any[] = [];
        const discovered = pendingWorkflowData?.discoveredCredentials;
        if (Array.isArray(discovered)) {
            for (const cred of discovered) {
                if (cred?.satisfied === true) continue;
                const t = String(cred?.type || '').toLowerCase();
                if (t === 'oauth') continue;
                const vkRaw = String(cred.vaultKey || cred.credentialId || '').trim();
                if (!vkRaw) continue;
                const vk = vkRaw.toLowerCase();
                const nodeIds = Array.isArray(cred.nodeIds) ? cred.nodeIds : [];
                const primaryField =
                    typeof cred.primaryFieldName === 'string' && cred.primaryFieldName.trim()
                        ? cred.primaryFieldName.trim()
                        : vk === 'slack'
                          ? 'webhookUrl'
                          : vkRaw;
                for (const rawNid of nodeIds) {
                    const nodeId = String(rawNid || '').trim();
                    if (!nodeId) continue;
                    const ck = `${nodeId}::${vk}`;
                    if (covered.has(ck)) continue;
                    covered.add(ck);
                    const nk = `${nodeId}::${primaryField}`;
                    const synthBase = questionByNodeFieldKey.get(nk);
                    const synthRow: any = {
                        questionType: 'credential',
                        id: `cred_synth_${nodeId}_${vkRaw.replace(/\W/g, '_')}`,
                        nodeId,
                        nodeType: cred.nodeTypes?.[0] || '',
                        nodeLabel: cred.displayName || cred.provider || vkRaw,
                        fieldName: primaryField,
                        label: cred.displayName || `Connect ${vkRaw}`,
                        type: vk === 'slack' ? 'password' : 'text',
                        category: 'credential',
                        ownershipClass: 'credential',
                        required: cred.required !== false,
                        askOrder: 0,
                        placeholder: `Enter ${cred.displayName || vkRaw}`,
                        description: `Credential required for ${cred.provider || cred.displayName || 'this node'}`,
                        credential: {
                            vaultKey: vkRaw,
                            credentialId: cred.credentialId || vkRaw,
                        },
                        isVaultCredential: true,
                        fillModeDefault: synthBase?.fillModeDefault,
                        supportsRuntimeAI: synthBase?.supportsRuntimeAI,
                        supportsBuildtimeAI: synthBase?.supportsBuildtimeAI,
                        aiFilledAtBuildTime: synthBase?.aiFilledAtBuildTime,
                        aiUsesRuntime: synthBase?.aiUsesRuntime,
                        aiBuildTimePending: synthBase?.aiBuildTimePending,
                    };
                    const modeKey = `mode_${nodeId}_${primaryField}`;
                    const resolved = resolveWizardEffectiveFieldFillMode(
                        fillModeValues[modeKey] as
                            | 'manual_static'
                            | 'runtime_ai'
                            | 'buildtime_ai_once'
                            | undefined,
                        synthRow.fillModeDefault as
                            | 'manual_static'
                            | 'runtime_ai'
                            | 'buildtime_ai_once'
                            | undefined,
                        synthRow.supportsRuntimeAI,
                        synthRow.supportsBuildtimeAI
                    );
                    const effectiveMode = ownershipEffectiveModes.byModeKey[modeKey] ?? resolved.mode;
                    const planeRow = findPlaneRow(fieldPlaneRows, nodeId, primaryField);
                    const questionForPolicy = synthBase ? { ...synthRow, ...synthBase } : synthRow;
                    if (
                        !shouldShowCredentialRowOnCredentialsStep({
                            question: questionForPolicy,
                            effectiveMode,
                            fieldPlaneRow: planeRow ? { isEmpty: planeRow.isEmpty } : null,
                        })
                    ) {
                        continue;
                    }
                    extras.push(synthRow);
                }
            }
        }

        const all = [...merged, ...extras];
        const dedupe = new Map<string, any>();
        for (const q of all) {
            const c = q.credential || {};
            const k = `cred:${String(q.nodeId || '')}:${norm(c.vaultKey ?? c.credentialId ?? q.fieldName)}`;
            if (!dedupe.has(k)) dedupe.set(k, q);
        }
        return [...dedupe.values()];
    }, [
        credentialQuestions,
        pendingWorkflowData,
        ownershipEffectiveModes,
        fillModeValues,
        fieldPlaneRows,
        questionByNodeFieldKey,
    ]);

    /** Credentials step after optional include/hide overrides (required+empty vault rows cannot be hidden). */
    const credentialQuestionsForStep = useMemo(
        () =>
            applyCredentialStepIncludeOverrides({
                strictFiltered: credentialQuestionsStrictForStep as Record<string, unknown>[],
                allVaultCredentialQuestions: credentialQuestions as Record<string, unknown>[],
                overrides: credentialStepIncludeOverrides,
                isQuestionCredentialEmpty: isCredQuestionConfigEmpty,
                getEffectiveFillMode: getCredentialQuestionEffectiveFillMode,
                getFieldPlaneRow: getCredentialQuestionFieldPlaneRow,
            }) as any[],
        [
            credentialQuestionsStrictForStep,
            credentialQuestions,
            credentialStepIncludeOverrides,
            isCredQuestionConfigEmpty,
            getCredentialQuestionEffectiveFillMode,
            getCredentialQuestionFieldPlaneRow,
        ]
    );

    const credentialStrictPlaneKeys = useMemo(
        () => new Set(credentialQuestionsStrictForStep.map((q: any) => credentialPlaneKeyFromQuestion(q))),
        [credentialQuestionsStrictForStep]
    );

    /** Optional vault questions not in the strict Credentials list ? user can force-include. */
    const credentialOptionalIncludeCandidates = useMemo(
        () =>
            credentialQuestions.filter((q: any) => {
                if (q.required !== false) return false;
                if (credentialStrictPlaneKeys.has(credentialPlaneKeyFromQuestion(q))) return false;
                return shouldShowCredentialRowOnCredentialsStep({
                    question: q,
                    effectiveMode: getCredentialQuestionEffectiveFillMode(q),
                    fieldPlaneRow: getCredentialQuestionFieldPlaneRow(q),
                });
            }),
        [
            credentialQuestions,
            credentialStrictPlaneKeys,
            getCredentialQuestionEffectiveFillMode,
            getCredentialQuestionFieldPlaneRow,
        ]
    );

    const oauthRequirementCandidatesList = useMemo(
        () =>
            oauthRequirementCandidates(
                pendingWorkflowData?.discoveredCredentials,
                pendingWorkflowData?.credentialStatuses
            ),
        [pendingWorkflowData?.discoveredCredentials, pendingWorkflowData?.credentialStatuses]
    );

    const blockingOAuthCredentials = useMemo(
        () =>
            filterStillBlockingOAuth(
                oauthRequirementCandidatesList,
                pendingWorkflowData?.credentialStatuses,
                googleOAuthConnectedLive
            ),
        [
            oauthRequirementCandidatesList,
            pendingWorkflowData?.credentialStatuses,
            googleOAuthConnectedLive,
        ]
    );

    useEffect(() => {
        let cancelled = false;
        const needsGoogle = oauthRequirementCandidatesList.some((r) => oauthRowNeedsGoogleConnect(r));
        if (!needsGoogle) {
            setGoogleOAuthConnectedLive(false);
            return;
        }
        (async () => {
            try {
                const {
                    data: { user },
                } = await awsClient.auth.getUser();
                if (!user || cancelled) {
                    if (!cancelled) setGoogleOAuthConnectedLive(false);
                    return;
                }
                const credentialStatus = await fetchRuntimeCredentialStatus('google');
                if (!cancelled) setGoogleOAuthConnectedLive(Boolean(credentialStatus.connected));
            } catch {
                if (!cancelled) setGoogleOAuthConnectedLive(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [oauthRequirementCandidatesList, step, workflowNodeIdsKey]);

    /** Resolve credential answer for wizard + attach-credentials mapping. */
    const getCredentialAnswerForQuestion = useCallback((q: any): string => {
        const qid = String(q?.id || '').trim();
        if (!qid) return '';
        const raw =
            credentialValues[qid] ??
            credentialValues[String(q?.fieldName || '').trim()] ??
            credentialValues[String(q?.credential?.vaultKey || '').trim()] ??
            credentialValues[String(q?.credential?.credentialId || '').trim()];
        return raw === undefined || raw === null ? '' : String(raw).trim();
    }, [credentialValues]);

    /** Canonical key for missing-item credentials (prefer vault key over provider labels). */
    const getMissingItemCredentialKey = useCallback((cred: any): string => {
        const key =
            String(cred?.vaultKey || '').trim() ||
            String(cred?.credentialId || '').trim() ||
            String(cred?.provider || '').trim();
        return key;
    }, []);

    /** Vault secrets filled + OAuth accounts connected (statuses or live Google token). */
    const credentialSecretsReady = useMemo(() => {
        const vaultOk =
            credentialQuestionsForStep.length === 0 ||
            credentialQuestionsForStep.every((q: any) => {
                if (q?.credential?.satisfied === true) return true;
                if (q?.required === false && !getCredentialAnswerForQuestion(q)) return true;
                return getCredentialAnswerForQuestion(q).length > 0;
            });
        if (!vaultOk) return false;
        return blockingOAuthCredentials.length === 0;
    }, [credentialQuestionsForStep, getCredentialAnswerForQuestion, blockingOAuthCredentials]);

    /** Manual config questions (excluding pure credential vault rows ? those use credentials step). */
    /** Execution-order rank: recomputes only when graph topology changes, not on every input change. */
    const executionOrderRank = useMemo(() => {
        const nodes = pendingWorkflowData?.nodes;
        const edges = pendingWorkflowData?.edges;
        return Array.isArray(nodes) && nodes.length > 0
            ? computeExecutionOrderRank(nodes as any[], Array.isArray(edges) ? edges : [])
            : new Map<string, number>();
    }, [pendingWorkflowData?.nodes, pendingWorkflowData?.edges]);

    const manualConfigurationQuestions = useMemo(() => {
        const orderRank = executionOrderRank;

        return ownershipQuestions
            .filter((q: any) => {
                const modeKey = `mode_${q.nodeId}_${q.fieldName}`;
                const fieldEnabledKey = `fieldEnabled_${q.nodeId}_${q.fieldName}`;
                const hasAiPrefilledValue = !!(q.aiFilledAtBuildTime || q.aiUsesRuntime);
                const fieldEnabled: boolean =
                    fieldEnabledOverrides[fieldEnabledKey] !== undefined
                        ? fieldEnabledOverrides[fieldEnabledKey]
                        : hasAiPrefilledValue;

                if (!fieldEnabled) return false;

                const effective =
                    ownershipEffectiveModes.byModeKey[modeKey] ||
                    resolveWizardFieldFillMode(
                        fillModeValues[modeKey],
                        q.fillModeDefault as 'manual_static' | 'runtime_ai' | 'buildtime_ai_once' | undefined
                    );

                if (effective !== 'manual_static') return false;

                const rowLocked =
                    q.ownershipUiMode === 'locked' && !(q.isUnlockableCredential && isCredentialUnlocked(q));
                const ownershipModeForAsk = rowLocked ? 'locked' : q.ownershipUiMode || 'selectable';
                return shouldAskWizardManualQuestion(effective, ownershipModeForAsk);
            })
            .sort((a: any, b: any) => {
                const ra = orderRank.get(String(a.nodeId)) ?? 9999;
                const rb = orderRank.get(String(b.nodeId)) ?? 9999;
                if (ra !== rb) return ra - rb;
                const aStructural = a.ownershipClass === 'structural' ? 0 : 1;
                const bStructural = b.ownershipClass === 'structural' ? 0 : 1;
                if (aStructural !== bStructural) return aStructural - bStructural;
                const aOrder = a.askOrder ?? 999;
                const bOrder = b.askOrder ?? 999;
                if (aOrder !== bOrder) return aOrder - bOrder;
                return String(a.label || a.fieldName || '').localeCompare(
                    String(b.label || b.fieldName || '')
                );
            });
    }, [
        ownershipQuestions,
        fillModeValues,
        ownershipEffectiveModes,
        isCredentialUnlocked,
        fieldEnabledOverrides,
        executionOrderRank,
    ]);

    const manualConfigurationQuestionIdsKey = useMemo(
        () => manualConfigurationQuestions.map((q: any) => String(q.id ?? '')).join('|'),
        [manualConfigurationQuestions]
    );

    useEffect(() => {
        setCurrentQuestionIndex((i) => {
            const n = manualConfigurationQuestions.length;
            if (n === 0) return 0;
            return Math.min(Math.max(0, i), n - 1);
        });
    }, [manualConfigurationQuestionIdsKey, manualConfigurationQuestions.length]);

    // Always allow proceeding — workbench opens regardless of credential/input state.
    // Missing credentials are shown as a friendly panel inside the workbench.
    const configurationGateReady = true;

    const ownershipStructuralByNode = useMemo(
        () => groupQuestionsByNode(ownershipQuestions.filter((q: any) => q.ownershipClass === 'structural')),
        [ownershipQuestions]
    );

    const ownershipSecretsByNode = useMemo(
        () => groupQuestionsByNode(ownershipQuestions.filter((q: any) => q.ownershipClass !== 'structural')),
        [ownershipQuestions]
    );

    const credentialWizardDisplay = useMemo(() => {
        const raw = pendingWorkflowData?.credentialWizardView as
            | { rows?: any[]; groups?: any[] }
            | undefined;
        if (raw?.groups && Array.isArray(raw.groups) && raw.groups.length > 0) {
            return { rows: raw.rows ?? [], groups: raw.groups };
        }
        if (raw?.rows && Array.isArray(raw.rows) && raw.rows.length > 0) {
            return { rows: raw.rows, groups: groupCredentialWizardRows(raw.rows as any) };
        }
        const qs = pendingWorkflowData?.comprehensiveQuestions;
        const st = pendingWorkflowData?.credentialStatuses;
        if (Array.isArray(qs) && Array.isArray(st) && qs.length > 0) {
            const statuses = sanitizeCredentialStatusesForWizardView(st);
            const questionsSafe = (qs as any[])
                .filter((q) => q && typeof q === 'object')
                .map((q) => {
                    const fieldName = String(q.fieldName ?? '').trim();
                    const nodeId = String(q.nodeId ?? '').trim();
                    const id = String(q.id ?? '').trim() || `${nodeId}::${fieldName}`;
                    return {
                        ...q,
                        fieldName,
                        nodeId,
                        nodeType: String(q.nodeType ?? '').trim() || 'node',
                        nodeLabel: String(q.nodeLabel ?? '').trim() || 'Node',
                        id,
                    };
                })
                .filter((q) => q.fieldName.length > 0 && q.nodeId.length > 0);
            if (questionsSafe.length === 0) {
                return { rows: [] as any[], groups: [] as any[] };
            }
            try {
                return buildCredentialWizardView(questionsSafe as any, statuses);
            } catch (e) {
                console.error('[AutonomousAgentWizard] buildCredentialWizardView failed:', e);
                return { rows: [] as any[], groups: [] as any[] };
            }
        }
        return { rows: [] as any[], groups: [] as any[] };
    }, [pendingWorkflowData]);

    /** Table rows aligned with `credentialQuestionsForStep` (same visibility as inputs / attach-credentials). */
    const credentialWizardDisplayForStep = useMemo(() => {
        const d = credentialWizardDisplay;
        const baseRows =
            Array.isArray(d.rows) && d.rows.length > 0
                ? d.rows
                : (d.groups || []).flatMap((g: any) => g.rows || []);
        const allowedIds = new Set(
            credentialQuestionsForStep.map((q: any) => String(q.id ?? ''))
        );
        const allowedPlane = new Set(
            credentialQuestionsForStep.map((q: any) => credentialPlaneKeyFromQuestion(q))
        );
        const filtered = baseRows.filter((row: any) => {
            if (allowedIds.has(String(row.questionId ?? ''))) return true;
            return allowedPlane.has(
                credentialPlaneKeyFromQuestion({
                    nodeId: row.nodeId,
                    fieldName: row.fieldName,
                })
            );
        });
        return { rows: filtered, groups: groupCredentialWizardRows(filtered as any) };
    }, [credentialWizardDisplay, credentialQuestionsForStep]);

    const selectedGuideQuestion = useMemo(() => {
        if (!guideSelectedField) return null;
        return ownershipQuestions.find(
            (q: any) =>
                String(q.nodeId || '') === guideSelectedField.nodeId &&
                String(q.fieldName || '') === guideSelectedField.fieldName
        ) || null;
    }, [guideSelectedField, ownershipQuestions]);

    const fieldOwnershipGuideContext = useMemo(() => {
        return buildFieldOwnershipGuideContext({
            prompt: (originalPrompt || prompt || '').trim(),
            workflowId: confirmationData?.workflowId || activeWorkflowId || null,
            nodes: (pendingWorkflowData?.nodes || []) as any[],
            edges: (pendingWorkflowData?.edges || []) as any[],
            ownershipQuestions: ownershipQuestions as any[],
            fillModeValues,
            effectiveModes: ownershipEffectiveModes.byModeKey,
            credentialStatuses: pendingWorkflowData?.credentialStatuses || [],
            credentialWizardRows: credentialWizardDisplayForStep.rows || [],
            selectedField: guideSelectedField,
        });
    }, [
        originalPrompt,
        prompt,
        confirmationData?.workflowId,
        activeWorkflowId,
        pendingWorkflowData?.nodes,
        pendingWorkflowData?.edges,
        pendingWorkflowData?.credentialStatuses,
        ownershipQuestions,
        fillModeValues,
        ownershipEffectiveModes.byModeKey,
        credentialWizardDisplayForStep.rows,
        guideSelectedField,
    ]);

    const configSeedKey = useMemo(() => {
        if (!pendingWorkflowData?.nodes?.length) return '';
        return (pendingWorkflowData.nodes as any[])
            .map((n) => `${n.id}:${JSON.stringify(n.data?.config || {})}`)
            .join('|');
    }, [pendingWorkflowData?.nodes]);

    const questionSeedSignature = useMemo(
        () => allQuestions.map((q: any) => `${q.id}:${q.nodeId}:${q.fieldName}`).join('|'),
        [allQuestions]
    );

    /** Seed fill modes and input text from graph + question.defaultValue so User can edit AI-generated config. */
    useEffect(() => {
        if (!pendingWorkflowData?.nodes?.length) return;
        const nodes = pendingWorkflowData.nodes as any[];

        setFillModeValues((prev) => {
            const next = { ...prev };
            let changed = false;
            // Index questions by nodeId+fieldName for O(1) policy lookup in Loop 1.
            const questionIndex = new Map<string, any>();
            for (const q of allQuestions) {
                const nid = (q as any)?.nodeId;
                const fn = (q as any)?.fieldName;
                if (nid && fn) questionIndex.set(`${nid}__${fn}`, q);
            }
            for (const n of nodes) {
                const cfg = (n.data?.config || {}) as Record<string, any>;
                const fm = cfg._fillMode;
                if (fm && typeof fm === 'object') {
                    for (const [field, mode] of Object.entries(fm)) {
                        if (field === '_fillMode') continue;
                        const key = `mode_${n.id}_${field}`;
                        if (next[key] === undefined && typeof mode === 'string' && mode.trim()) {
                            // Layer B: coerce runtime_ai when registry policy disallows it.
                            // attach-inputs coerces on the backend too, but doing it here prevents
                            // the wizard from displaying a runtime badge for structural fields.
                            let effectiveMode = mode;
                            if (mode === 'runtime_ai') {
                                const matchQ = questionIndex.get(`${n.id}__${field}`);
                                if (matchQ && (matchQ as any).supportsRuntimeAI === false) {
                                    effectiveMode = 'buildtime_ai_once';
                                }
                            }
                            next[key] = effectiveMode;
                            changed = true;
                        }
                    }
                }
            }
            // Intent-aware pre-selection: for fields not yet in _fillMode, infer the
            // correct button from the question metadata set by the backend generator.
            // - aiFilledAtBuildTime=true  → AI already generated a value → pre-select buildtime_ai_once
            // - aiUsesRuntime=true        → value intentionally empty, resolved at run time → pre-select runtime_ai
            //                               (coerced to buildtime_ai_once when supportsRuntimeAI===false)
            // - otherwise                 → user must provide → pre-select manual_static (schema default)
            for (const q of allQuestions) {
                const nodeId = (q as any)?.nodeId;
                const fieldName = (q as any)?.fieldName;
                if (!nodeId || !fieldName) continue;
                const key = `mode_${nodeId}_${fieldName}`;
                if (next[key] !== undefined) continue; // already set by _fillMode or user
                const aiFilledAtBuildTime = (q as any)?.aiFilledAtBuildTime;
                const aiUsesRuntime = (q as any)?.aiUsesRuntime;
                const fillModeDefault = (q as any)?.fillModeDefault as string | undefined;
                const supportsRuntime = (q as any)?.supportsRuntimeAI !== false;
                if (aiFilledAtBuildTime) {
                    next[key] = 'buildtime_ai_once';
                    changed = true;
                } else if (aiUsesRuntime) {
                    // Layer B: respect registry policy — if runtime_ai is not supported, use buildtime.
                    next[key] = supportsRuntime ? 'runtime_ai' : 'buildtime_ai_once';
                    changed = true;
                } else if (fillModeDefault === 'buildtime_ai_once') {
                    next[key] = 'buildtime_ai_once';
                    changed = true;
                } else if (fillModeDefault === 'runtime_ai' && supportsRuntime) {
                    // Only honour runtime_ai schema default when the registry actually allows it.
                    next[key] = 'runtime_ai';
                    changed = true;
                }
                // manual_static fields: leave undefined so the UI shows "You" as default
            }
            return changed ? next : prev;
        });

        setInputValues((prev) => {
            const next = { ...prev };
            let changed = false;
            for (const q of allQuestions) {
                const id = (q as any)?.id;
                if (!id) continue;
                if (next[id] !== undefined && String(next[id]).trim() !== '') continue;
                let str = typeof (q as any)?.defaultValue === 'string' ? (q as any).defaultValue : '';
                if (!str.trim()) {
                    const node = nodes.find((x: any) => x.id === (q as any).nodeId);
                    const raw = node?.data?.config?.[(q as any).fieldName];
                    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
                        str = snapshotConfigFieldToString(raw) ?? '';
                    }
                }
                if (str && str.trim()) {
                    next[id] = str;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [configSeedKey, questionSeedSignature, pendingWorkflowData?.nodes?.length]);

    /** Allow configuration step while workflow is still being finalized (not only phase === ready). */
    const configurationPhaseUnlocked = useMemo(() => {
        const u = pendingWorkflowData?.update;
        if (!u) return true;
        const p = String(u.phase || '').toLowerCase();
        const s = String(u.status || '').toLowerCase();
        if (p === 'ready' || s === 'ready') return true;
        return ['configuring_inputs', 'configuring_credentials', 'ready_for_execution', 'draft'].includes(p);
    }, [pendingWorkflowData?.update]);

    // Timer for building step
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (step === 'building' && buildStartTime) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - buildStartTime) / 1000));
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [step, buildStartTime]);

    // Cognitive progress text rotation (every 1.5s)
    const cognitiveTexts = [
        'Initializing cognitive engine?',
        'Mapping workflow paths?',
        'Optimizing decision nodes?',
        'Finalizing intelligence layer?',
        'Synthesizing requirements?',
        'Building node connections?',
        'Validating workflow structure?',
    ];

    useEffect(() => {
        if (step === 'building' && !isComplete) {
            const interval = setInterval(() => {
                setCognitiveTextIndex((prev) => (prev + 1) % cognitiveTexts.length);
            }, 1500);
            return () => clearInterval(interval);
        }
    }, [step, isComplete]);

    useEffect(() => {
        const loadNodeDefinitions = async () => {
            try {
                const defs = await nodeSchemaService.fetchAllSchemas();
                const byType = defs.reduce((acc: Record<string, NodeDefinition>, def: NodeDefinition) => {
                    acc[def.type] = def;
                    return acc;
                }, {});
                setNodeDefinitionsByType(byType);
            } catch (err) {
                console.warn('[Wizard] Failed to load node definitions for ownership grid:', err);
            }
        };
        loadNodeDefinitions();
    }, []);

    // Circle loader text rotation (every 1.2s)
    const circleTexts = ['Thinking', 'Analyzing', 'Building', 'Optimizing'];
    
    useEffect(() => {
        if (step === 'building' && !isComplete) {
            const interval = setInterval(() => {
                setCircleTextIndex((prev) => (prev + 1) % circleTexts.length);
            }, 1200);
            return () => clearInterval(interval);
        }
    }, [step, isComplete]);

    // Map phases to user-friendly descriptions
    const getPhaseDescription = (phase: string): string => {
        const descriptions: Record<string, string> = {
            'understand':   'Analyzing prompt and extracting intent',
            'capability_selection': 'Preparing capability node options',
            'planning':     'Designing node graph and connections',
            'construction': 'Building nodes, edges and config',
            'validation':   'Validating graph structure and edges',
            'verification': 'Verifying credentials and schemas',
            'credential_discovery': 'Discovering and validating credentials',
            'healing':      'Resolving structural issues',
            'learning':     'Finalizing and saving workflow',
            'completed':    'Workflow build complete',
        };
        return descriptions[phase] || 'Processing...';
    };

    const handleAnalyze = async () => {
        if (!prompt.trim()) return;

        // Always use the new 3-phase capability-node-selection flow.
        await handleCapabilityNodeSelectionAnalyze();
        return;
        
        // Execution Flow Architecture (STEP-2): Validate state transition
        const currentState = mapWizardStepToState(step);
        if (currentState !== WorkflowGenerationState.STATE_0_IDLE) {
            toast({
                title: 'Invalid State',
                description: 'Cannot analyze: Not in idle state',
                variant: 'destructive',
            });
            return;
        }
        
        // Set user prompt in state manager
        stateManager.setUserPrompt(prompt);
        
        // Scroll immediately BEFORE state change - no waiting
        scrollImmediately(step2Ref);
        setStep('analyzing');
        setIsSummarizeLayerProcessing(true); // Track that we're processing summarize layer
        setHasWorkflowPlan(false);

        try {
            console.log('Submitting workflow prompt:', prompt);
            console.log('Mode:', 'analyze');
            const response = await fetch(`${ENDPOINTS.itemBackend}/api/generate-workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, mode: 'analyze' })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Analysis failed' }));
                const errorMessage = error.error || error.message || error.details || 'Analysis failed';
                console.error('[Analysis Error]', error);
                throw new Error(errorMessage);
            }

            const data = await response.json();

            /** Build node chip list from clarification payload when summarize phase is missing (legacy / errors). */
            const extractNodeHintsFromAnalyzePayload = (payload: any): string[] => {
                const detected = payload?.nodeOptionsDetected;
                if (!Array.isArray(detected)) return [];
                const hints = new Set<string>();
                for (const group of detected) {
                    for (const opt of group?.options || []) {
                        if (opt?.nodeType) hints.add(opt.nodeType);
                    }
                }
                return Array.from(hints);
            };

            const orderPlanHints = (hints: string[]): string[] => {
                const rest = hints.filter((n) => n !== 'manual_trigger' && n !== 'log_output');
                return ['manual_trigger', ...rest, 'log_output'].filter((n, i, a) => a.indexOf(n) === i);
            };
            
            // Single structured plan from summarize layer
            if (data.phase === 'summarize' && data.workflowIntentPlan) {
                const p = data.workflowIntentPlan;
                const capabilitySteps = Array.isArray(data.capabilityOptions) ? (data.capabilityOptions as CapabilityOptionStep[]) : [];
                console.log('[Frontend] Summarize layer - received workflowIntentPlan');
                setIsDegradedPlan(Boolean(data.degradedPlan || data.requiresConfirmation || data.planQuality === 'degraded' || p?.requires_confirmation));
                setPlanSummary(p.structuredSummary || '');
                setPlanSummaryV2((p.summaryV2 ?? null) as SummaryV2);
                setPlanNodeHints(Array.isArray(p.proposedNodeChain) ? p.proposedNodeChain : []);
                setPlanNodeReasons(
                    p.nodeInclusionReasons && typeof p.nodeInclusionReasons === 'object'
                        ? (p.nodeInclusionReasons as Record<string, string>)
                        : {}
                );
                setPlanOrderingConfidence(
                    typeof p?.orderingDiagnostics?.confidence === 'number'
                        ? p.orderingDiagnostics.confidence
                        : null
                );
                setPlanOrderingHopRationales(
                    Array.isArray(p?.orderingDiagnostics?.hopRationales)
                        ? p.orderingDiagnostics.hopRationales
                        : []
                );
                setPlanRankedSelectionSummary(
                    Array.isArray(p?.rankedSelectionDiagnostics?.kept)
                        ? p.rankedSelectionDiagnostics.kept
                              .slice(0, 8)
                              .map((k: any) => `${k.nodeType} (${Math.round((k.score || 0) * 100)}%): ${k.reason || 'selected'}`)
                        : []
                );
                setPlanRepairActions([]);
                setPlanSemanticWarnings([]);
                setPlanBranchingOverview(typeof p.branchingOverview === 'string' ? p.branchingOverview : '');
                setPlanMandatoryNodeTypes(
                    Array.isArray(data.mandatoryNodeTypes) && data.mandatoryNodeTypes.length > 0
                        ? data.mandatoryNodeTypes
                        : (p.mandatoryNodeTypes || [])
                );
                setPlanRegistryTags(
                    Array.isArray(data.registryTags) && data.registryTags.length > 0
                        ? data.registryTags
                        : (p.registryTags || [])
                );
                setCapabilityOptions(capabilitySteps);
                setCapabilitySelectionsByStep(initializeCapabilitySelections(capabilitySteps));
                setCapabilitySelectionsApplied(false);
                setCapabilityDefaultConfirmStepIds([]);
                setOriginalPrompt(data.originalPrompt || prompt);
                setIntentSnapshot(data.intentSnapshot ?? null);
                setHasWorkflowPlan(true);
                setSelectedVariationMeta({
                    id: 'structured-plan',
                    prompt: p.structuredSummary || '',
                    keywords: p.proposedNodeChain,
                    matchedKeywords: data.matchedKeywords,
                    nodes: p.proposedNodeChain,
                    requiredNodeTypes: data.mandatoryNodeTypes || p.mandatoryNodeTypes,
                });
                setIsSummarizeLayerProcessing(false);
                setStep(capabilitySteps.length > 0 ? 'capability-selection' : 'questioning');
                scrollToStep(step2Ref, 300);
                return;
            }

            // Clarification-only fallback (no workflowIntentPlan): show the same structured plan card, not legacy "Summary"
            const clarQuestions = Array.isArray(data.questions) ? data.questions : [];
            if (
                clarQuestions.length === 0 &&
                !data.workflowIntentPlan &&
                (data.phase === 'clarification' || data.summary != null || data.analysis != null)
            ) {
                const summaryText =
                    (typeof data.summary === 'string' && data.summary.trim()) ||
                    (data.analysis?.detectedWorkflowType != null
                        ? String(data.analysis.detectedWorkflowType)
                        : '') ||
                    prompt;
                const rawHints = extractNodeHintsFromAnalyzePayload(data);
                const hints = rawHints.length ? orderPlanHints(rawHints) : ['manual_trigger', 'log_output'];
                setPlanSummary(summaryText);
                setPlanSummaryV2(null);
                setPlanNodeHints(hints);
                setPlanNodeReasons({});
                setPlanOrderingConfidence(null);
                setPlanOrderingHopRationales([]);
                setPlanRankedSelectionSummary([]);
                setPlanRepairActions([]);
                setPlanSemanticWarnings([]);
                setPlanBranchingOverview('');
                setPlanMandatoryNodeTypes(Array.isArray(data.mandatoryNodeTypes) ? data.mandatoryNodeTypes : hints);
                setPlanRegistryTags(Array.isArray(data.registryTags) ? data.registryTags : []);
                setCapabilityOptions([]);
                setCapabilitySelectionsByStep({});
                setCapabilitySelectionsApplied(false);
                setCapabilityDefaultConfirmStepIds([]);
                setOriginalPrompt(prompt);
                setIntentSnapshot(null);
                setHasWorkflowPlan(true);
                setSelectedVariationMeta({
                    id: 'structured-plan-fallback',
                    prompt: summaryText,
                    keywords: hints,
                    matchedKeywords: data.matchedKeywords,
                    nodes: hints,
                    requiredNodeTypes: data.mandatoryNodeTypes || hints,
                });
                setAnalysis({
                    summary: summaryText,
                    questions: [],
                    clarifiedPromptPreview: data.enhancedPrompt || summaryText,
                    predictedStepCount: data.analysis?.estimatedNodeCount ?? hints.length,
                } as AnalysisResult);
                setIsSummarizeLayerProcessing(false);
                setStep('questioning');
                scrollToStep(step2Ref, 300);
                return;
            }

            // Normal analysis response - summarize layer was skipped or completed
            setIsSummarizeLayerProcessing(false);
            
            // Normal analysis response
            setAnalysis(data);
            const initialAnswers: Record<string, string> = {};
            data.questions?.forEach((q: AgentQuestion) => {
                if (q.options && q.options.length > 0) initialAnswers[q.id] = q.options[0];
            });
            setAnswers(initialAnswers);
            
            // Execution Flow Architecture (STEP-2): Update state manager
            stateManager.setClarifyingQuestions(data.questions || []);
            stateManager.setClarifyingAnswers(initialAnswers);
            
            // Always show summary container - user will click "Continue Building" button
            // Don't auto-continue - let user see summary first
            setStep('questioning');
            scrollToStep(step2Ref, 300);
        } catch (err: any) {
            console.error(err);
            setIsSummarizeLayerProcessing(false); // Reset flag on error
            toast({ title: 'Analysis Failed', description: err.message, variant: 'destructive' });
            setStep('idle');
        }
    };

    /** Re-run single-plan summarize from the current edited plan text (or original prompt). */
    const handleRegeneratePlan = async () => {
        const text = (planSummary.trim() || prompt.trim());
        const baseOriginalPrompt = (originalPrompt || prompt || '').trim();
        const analyzePrompt = baseOriginalPrompt || text;
        if (!analyzePrompt) return;
        setStep('analyzing');
        setIsSummarizeLayerProcessing(true);
        try {
            const response = await fetch(`${ENDPOINTS.itemBackend}/api/generate-workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: analyzePrompt,
                    mode: 'analyze',
                    originalPrompt: analyzePrompt,
                }),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Regenerate failed' }));
                throw new Error(error.error || error.message || 'Regenerate failed');
            }
            const data = await response.json();
            if (data.phase === 'summarize' && data.workflowIntentPlan) {
                const p = data.workflowIntentPlan;
                const capabilitySteps = Array.isArray(data.capabilityOptions) ? (data.capabilityOptions as CapabilityOptionStep[]) : [];
                setIsDegradedPlan(Boolean(data.degradedPlan || data.requiresConfirmation || data.planQuality === 'degraded' || p?.requires_confirmation));
                setPlanSummary(p.structuredSummary || '');
                setPlanSummaryV2((p.summaryV2 ?? null) as SummaryV2);
                setPlanNodeHints(Array.isArray(p.proposedNodeChain) ? p.proposedNodeChain : []);
                setPlanNodeReasons(
                    p.nodeInclusionReasons && typeof p.nodeInclusionReasons === 'object'
                        ? (p.nodeInclusionReasons as Record<string, string>)
                        : {}
                );
                setPlanOrderingConfidence(
                    typeof p?.orderingDiagnostics?.confidence === 'number'
                        ? p.orderingDiagnostics.confidence
                        : null
                );
                setPlanOrderingHopRationales(
                    Array.isArray(p?.orderingDiagnostics?.hopRationales)
                        ? p.orderingDiagnostics.hopRationales
                        : []
                );
                setPlanRankedSelectionSummary(
                    Array.isArray(p?.rankedSelectionDiagnostics?.kept)
                        ? p.rankedSelectionDiagnostics.kept
                              .slice(0, 8)
                              .map((k: any) => `${k.nodeType} (${Math.round((k.score || 0) * 100)}%): ${k.reason || 'selected'}`)
                        : []
                );
                setPlanRepairActions([]);
                setPlanSemanticWarnings([]);
                setPlanBranchingOverview(typeof p.branchingOverview === 'string' ? p.branchingOverview : '');
                setPlanMandatoryNodeTypes(
                    Array.isArray(data.mandatoryNodeTypes) && data.mandatoryNodeTypes.length > 0
                        ? data.mandatoryNodeTypes
                        : (p.mandatoryNodeTypes || [])
                );
                setPlanRegistryTags(
                    Array.isArray(data.registryTags) && data.registryTags.length > 0
                        ? data.registryTags
                        : (p.registryTags || [])
                );
                setCapabilityOptions(capabilitySteps);
                setCapabilitySelectionsByStep(initializeCapabilitySelections(capabilitySteps));
                setCapabilitySelectionsApplied(false);
                setCapabilityDefaultConfirmStepIds([]);
                setOriginalPrompt(data.originalPrompt || analyzePrompt);
                setIntentSnapshot(data.intentSnapshot ?? null);
                setHasWorkflowPlan(true);
                setSelectedVariationMeta({
                    id: 'structured-plan',
                    prompt: p.structuredSummary || '',
                    keywords: p.proposedNodeChain,
                    matchedKeywords: data.matchedKeywords,
                    nodes: p.proposedNodeChain,
                    requiredNodeTypes: data.mandatoryNodeTypes || p.mandatoryNodeTypes,
                });
                setStep(capabilitySteps.length > 0 ? 'capability-selection' : 'questioning');
            } else {
                setStep('questioning');
            }
            toast({ title: 'Plan updated', description: 'Structured workflow plan was regenerated.' });
        } catch (e: any) {
            toast({ title: 'Regenerate failed', description: e?.message || 'Unknown error', variant: 'destructive' });
            setStep('questioning');
        } finally {
            setIsSummarizeLayerProcessing(false);
        }
    };

    /**
     * Structured plan is the single source of truth: confirm it in the FSM and start generation (no analyze?refine loop).
     */
    const handleConfirmPlanAndAnalyze = async () => {
        if (!planSummary.trim()) {
            toast({ title: 'Empty plan', description: 'Add a structured plan or regenerate.', variant: 'destructive' });
            return;
        }
        if (capabilityOptions.length > 0 && !capabilitySelectionsApplied) {
            toast({
                title: 'Apply capability selection first',
                description: 'Select capability nodes and generate a structural prompt before continuing to workflow setup.',
                variant: 'destructive',
            });
            setStep('capability-selection');
            return;
        }
        if (isDegradedPlan) {
            toast({
                title: 'Plan quality degraded',
                description: 'Regenerate analysis from original prompt before continuing to workflow setup.',
                variant: 'destructive',
            });
            return;
        }
        if (capabilityOptions.length > 0) {
            const currentResolution = resolveCapabilitySelections(
                capabilityOptions,
                capabilitySelectionsByStep,
            );
            setCapabilitySelectionsByStep(currentResolution.byStep);
            setCapabilityDefaultConfirmStepIds([]);
        } else {
            setCapabilityDefaultConfirmStepIds([]);
        }
        const mainPrompt = planSummary.trim();
        setPrompt(mainPrompt);
        // Go directly to building screen ? no need to re-show the analyze loader
        setStep('building');
        setProgress(5);
        setIsComplete(false);
        setCurrentPhase('preflight');
        setBuildStartTime(Date.now());
        setElapsedTime(0);
        setBuildingLogs(['Validating workflow plan...']);
        setIsSummarizeLayerProcessing(false);

        const confirmStructuredPlanForBuild = (): boolean => {
            let cs = stateManager.getCurrentState();
            if (cs === WorkflowGenerationState.STATE_1_USER_PROMPT_RECEIVED) {
                stateManager.setClarifyingQuestions([]);
            }
            cs = stateManager.getCurrentState();
            if (cs === WorkflowGenerationState.STATE_2_CLARIFICATION_ACTIVE) {
                return stateManager.confirmUnderstanding(mainPrompt).success;
            }
            if (
                cs === WorkflowGenerationState.STATE_3_UNDERSTANDING_CONFIRMED ||
                cs === WorkflowGenerationState.STATE_4_CREDENTIAL_COLLECTION
            ) {
                return stateManager.updateConfirmedUnderstanding(mainPrompt).success;
            }
            return false;
        };

        try {
            if (!confirmStructuredPlanForBuild()) {
                toast({
                    title: 'Could not confirm plan',
                    description: 'Try ?Start over? and run Analyze again, then continue.',
                    variant: 'destructive',
                });
                setHasWorkflowPlan(true);
                setStep('questioning');
                return;
            }

            setRefinement({
                refinedPrompt: mainPrompt,
                systemPrompt: mainPrompt,
                requirements: {},
            });
            setWorkflowUnderstandingConfirmed(true);
            setAnalysis({
                summary: mainPrompt,
                questions: [],
                clarifiedPromptPreview: mainPrompt,
                predictedStepCount: planNodeHints.length || 3,
            } as AnalysisResult);
            setHasWorkflowPlan(true);

            const { data: { session } } = await awsClient.auth.getSession();
            const chain = planNodeHints.filter((x) => typeof x === 'string' && x.trim().length > 0);
            if (chain.length === 0) {
                toast({
                    title: 'No node chain',
                    description: 'Regenerate the plan to get a proposed node chain, then continue.',
                    variant: 'destructive',
                });
                setStep('questioning');
                return;
            }

            const preflightRes = await fetch(`${ENDPOINTS.itemBackend}/api/generate-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({
                    prompt: mainPrompt,
                    mode: 'plan_credentials',
                    planProposedNodeChain: chain,
                    // Use the original user prompt as context for credential/semantic checks,
                    // NOT the full structured summary which contains registry contract text
                    // that causes false node detection (http_request, postgresql, etc.)
                    confirmedStructuredPrompt: originalPrompt || mainPrompt,
                }),
            });

            const preflightJson = await preflightRes.json().catch(() => ({}));
            if (!preflightRes.ok || !preflightJson.success) {
                const canonicalizationIssues = Array.isArray(preflightJson?.diagnostics?.canonicalization)
                    ? preflightJson.diagnostics.canonicalization.filter((c: any) => c?.status === 'rejected')
                    : [];
                const canonicalizationHint =
                    canonicalizationIssues.length > 0
                        ? canonicalizationIssues
                              .slice(0, 3)
                              .map((c: any) => `${c.input}${c.normalized ? `?${c.normalized}` : ''}`)
                              .join(', ')
                        : '';
                const msg =
                    canonicalizationHint
                        ? `Non-canonical node types in plan: ${canonicalizationHint}`
                        : (
                    preflightJson.message ||
                    preflightJson.errors?.join?.('; ') ||
                    preflightJson.error ||
                    'Credential preflight failed'
                        );
                const hasStructuralValidationDiagnostics =
                    Array.isArray(preflightJson?.diagnostics?.validationErrors) &&
                    preflightJson.diagnostics.validationErrors.length > 0;
                const hasStructuralIssueCode =
                    Array.isArray(preflightJson?.errors) &&
                    preflightJson.errors.some((e: any) => {
                        if (!e || typeof e !== 'object') return false;
                        const code = String(e.code || e.errorType || '').toUpperCase();
                        return code.includes('STRUCTURAL');
                    });
                const isStructuralFailure =
                    preflightJson?.errorType === 'STRUCTURAL_HEALING_FAILED' ||
                    hasStructuralValidationDiagnostics ||
                    hasStructuralIssueCode;
                toast({
                    title: isStructuralFailure ? 'Plan structural validation failed' : 'Plan credential check failed',
                    description:
                        typeof msg === 'string'
                            ? msg
                            : isStructuralFailure
                                ? 'Could not validate workflow structure for this plan.'
                                : 'Could not analyze credentials for this plan.',
                    variant: 'destructive',
                });
                const semanticIssues = Array.isArray(preflightJson?.canonicalizationIssues)
                    ? preflightJson.canonicalizationIssues
                          .map((i: any) => String(i?.reason || ''))
                          .filter((x: string) => x.startsWith('semantic_order_violation'))
                    : [];
                setPlanSemanticWarnings(semanticIssues);
                setPlanRepairActions(
                    Array.isArray(preflightJson?.semanticRepairActions) ? preflightJson.semanticRepairActions : []
                );
                setStep('questioning');
                return;
            }
            setPlanRepairActions(
                Array.isArray(preflightJson?.semanticRepairActions) ? preflightJson.semanticRepairActions : []
            );

            const missing: Array<{ vaultKey?: string; displayName?: string; type?: string }> =
                Array.isArray(preflightJson.missingCredentials) ? preflightJson.missingCredentials : [];

            // Preflight only informs FSM; credential UI is post-build (credentials + configuration steps).
            if (missing.length === 0) {
                stateManager.setRequiredCredentials([]);
            } else {
                const ids = missing.map((c, i) => {
                    const id = String(c.vaultKey || c.displayName || '').trim();
                    return id || `plan_cred_${i}`;
                });
                stateManager.setRequiredCredentials(ids);
            }
            await handleRefine(mainPrompt);
        } catch (e: any) {
            toast({
                title: 'Could not start workflow',
                description: e?.message || 'Unknown error',
                variant: 'destructive',
            });
            setHasWorkflowPlan(true);
            setStep('questioning');
        } finally {
            setIsSummarizeLayerProcessing(false);
        }
    };

    const handleApplyCapabilitySelections = async () => {
        const analyzePrompt = (originalPrompt || prompt || planSummary || '').trim();
        if (!analyzePrompt) {
            toast({ title: 'Missing prompt', description: 'Please analyze the workflow prompt again.', variant: 'destructive' });
            return;
        }

        const sanitizedSelections = resolveCapabilitySelections(capabilityOptions, capabilitySelectionsByStep).byStep;
        const missingRequiredStep = capabilityOptions.find((capStep) =>
            capStep.selectionPolicy?.required !== false &&
            !(sanitizedSelections[capStep.stepId]?.length > 0)
        );
        if (missingRequiredStep) {
            toast({
                title: 'Select a registry node',
                description: `Choose at least one node for "${missingRequiredStep.stepText}" before continuing.`,
                variant: 'destructive',
            });
            setStep('capability-selection');
            return;
        }
        setCapabilitySelectionsByStep(sanitizedSelections);
        setStep('analyzing');
        setIsSummarizeLayerProcessing(true);

        try {
            const response = await fetch(`${ENDPOINTS.itemBackend}/api/generate-workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: analyzePrompt,
                    mode: 'analyze',
                    originalPrompt: analyzePrompt,
                    capabilitySelectionsByStep: sanitizedSelections,
                    intentSnapshot: intentSnapshot ?? undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to apply capability selections' }));
                throw new Error(error.error || error.message || 'Failed to apply capability selections');
            }

            const data = await response.json();
            if (data.phase === 'summarize' && data.workflowIntentPlan) {
                const p = data.workflowIntentPlan;
                const capabilitySteps = Array.isArray(data.capabilityOptions) ? (data.capabilityOptions as CapabilityOptionStep[]) : [];

                setIsDegradedPlan(Boolean(data.degradedPlan || data.requiresConfirmation || data.planQuality === 'degraded' || p?.requires_confirmation));
                setPlanSummary(p.structuredSummary || '');
                setPlanSummaryV2((p.summaryV2 ?? null) as SummaryV2);
                setPlanNodeHints(Array.isArray(p.proposedNodeChain) ? p.proposedNodeChain : []);
                setPlanNodeReasons(
                    p.nodeInclusionReasons && typeof p.nodeInclusionReasons === 'object'
                        ? (p.nodeInclusionReasons as Record<string, string>)
                        : {}
                );
                setPlanMandatoryNodeTypes(
                    Array.isArray(data.mandatoryNodeTypes) && data.mandatoryNodeTypes.length > 0
                        ? data.mandatoryNodeTypes
                        : (p.mandatoryNodeTypes || [])
                );
                setPlanRegistryTags(
                    Array.isArray(data.registryTags) && data.registryTags.length > 0
                        ? data.registryTags
                        : (p.registryTags || [])
                );
                setCapabilityOptions(capabilitySteps);
                setCapabilitySelectionsByStep(resolveCapabilitySelections(capabilitySteps, sanitizedSelections).byStep);
                setCapabilitySelectionsApplied(true);
                setCapabilityDefaultConfirmStepIds([]);
                setOriginalPrompt(data.originalPrompt || analyzePrompt);
                setIntentSnapshot(data.intentSnapshot ?? intentSnapshot ?? null);
                setHasWorkflowPlan(true);
                setSelectedVariationMeta({
                    id: 'structured-plan',
                    prompt: p.structuredSummary || '',
                    keywords: p.proposedNodeChain,
                    matchedKeywords: data.matchedKeywords,
                    nodes: p.proposedNodeChain,
                    requiredNodeTypes: data.mandatoryNodeTypes || p.mandatoryNodeTypes,
                });
                setStep('questioning');
                scrollToStep(step2Ref, 300);
                return;
            }

            throw new Error('Could not generate structural prompt from selected capability nodes');
        } catch (e: any) {
            toast({ title: 'Capability selection failed', description: e?.message || 'Unknown error', variant: 'destructive' });
            setStep('capability-selection');
        } finally {
            setIsSummarizeLayerProcessing(false);
        }
    };

    // Normalize credential names to avoid duplicates (e.g., SLACK_TOKEN vs SLACK_BOT_TOKEN)
    const normalizeCredentialName = (name: string): string => {
        const upper = name.toUpperCase();
        // Normalize Slack token variations to SLACK_BOT_TOKEN
        if (upper.includes('SLACK') && upper.includes('TOKEN') && !upper.includes('WEBHOOK')) {
            return 'SLACK_BOT_TOKEN';
        }
        // Normalize Slack webhook variations
        if (upper.includes('SLACK') && upper.includes('WEBHOOK')) {
            return 'SLACK_WEBHOOK_URL';
        }
        return upper;
    };
    
    const handleRefine = async (explicitPrompt?: string, analysisSnapshot?: AnalysisResult | null) => {
        const effectiveAnalysis = analysisSnapshot ?? analysis;
        // Execution Flow Architecture (STEP-2): Validate state transition
        // Allow transition if questions are empty (auto-continue scenario) or if in correct state
        // Also allow if coming from summarize layer (step is 'refining' or 'questioning' with no questions)
        // When analysisSnapshot is passed (structured plan ? proceed), skip this gate ? user already confirmed intent
        if (!analysisSnapshot) {
            const currentState = mapWizardStepToState(step);
            const hasQuestions = effectiveAnalysis?.questions && effectiveAnalysis.questions.length > 0;
            const isFromSummarizeLayer =
                (step === 'refining' || step === 'questioning') && (!hasQuestions || hasWorkflowPlan);

            if (hasQuestions && currentState !== WorkflowGenerationState.STATE_2_CLARIFICATION_ACTIVE && !isFromSummarizeLayer) {
                toast({
                    title: 'Invalid State',
                    description: 'Cannot refine: Must complete clarification first',
                    variant: 'destructive',
                });
                return;
            }
        }

        // ? CRITICAL: Use explicit prompt if provided (from selected variation), otherwise use state prompt
        const promptToUse = explicitPrompt || prompt;

        console.log('[Frontend] Using prompt for refinement:', promptToUse);
        console.log('[Frontend] Prompt source:', explicitPrompt ? 'selected variation (explicit)' : 'state (prompt)');

        // Update answers in state manager
        stateManager.setClarifyingAnswers(answers);

        // Bug A fix: reset pipeline flags for this new pipeline run
        setPipelineReady(false);
        setQuestionsAnswered(false);

        // Keep the step as 'building' (already set by handleConfirmPlanAndAnalyze) while
        // the backend pipeline runs. Do NOT advance to 'refining' here ? the overlay must
        // only appear after the user has submitted answers (questionsAnswered === true).
        // If there are no questions the pipeline will advance to 'refining' after the
        // backend responds (pipelineReady = true, questionsAnswered implicitly true).
        scrollImmediately(step3Ref);
        const fa = effectiveAnalysis?.questions?.map(q => ({
            question: q.text,
            answer: answers[q.id],
        })) || [];

        try {
            console.log('Submitting workflow prompt:', promptToUse);
            console.log('Mode:', 'refine');
            console.log('Answers:', fa);
            // Keep UI responsive while waiting for first backend stage events.
            let refineFallbackInterval: ReturnType<typeof setInterval> | null = null;
            const startFallbackProgress = () => {
                if (refineFallbackInterval) return;
                refineFallbackInterval = setInterval(() => {
                    setProgress(prev => deriveMonotonicProgress(prev, prev < 12 ? prev + 1 : prev));
                }, 2500);
            };
            const stopFallbackProgress = () => {
                if (refineFallbackInterval) {
                    clearInterval(refineFallbackInterval);
                    refineFallbackInterval = null;
                }
            };
            // Get the current user's ID so the backend can check vault tables for connected accounts.
            // Without userId the backend defaults to 'anonymous' and all vault checks return false,
            // causing connected OAuth accounts (LinkedIn, Notion, etc.) to show "Action required".
            const { data: { session: refineSession } } = await awsClient.auth.getSession();
            const refineUserId = refineSession?.user?.id;
            const response = await fetch(`${ENDPOINTS.itemBackend}/api/generate-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-stream-progress': 'true',
                    ...(refineSession?.access_token ? { Authorization: `Bearer ${refineSession.access_token}` } : {}),
                },
                body: JSON.stringify({ prompt: promptToUse, mode: 'refine', answers: fa, ...(refineUserId ? { userId: refineUserId } : {}) })
            });

            if (!response.ok) {
                stopFallbackProgress();
                const error = await response.json().catch(() => ({ error: 'Refinement failed' }));
                const errorMessage = error.error || error.message || error.details || 'Refinement failed';
                console.error('[Refinement Error]', error);
                throw new Error(errorMessage);
            }

            // Read NDJSON stream — collect stage progress events and extract terminal payload as `data`
            let data: any = null;
            {
                startFallbackProgress();
                const contentType = String(response.headers.get('content-type') || '').toLowerCase();
                const refineReader = response.body?.getReader();
                const refineDecoder = new TextDecoder();
                let refineBuffer = '';
                const handleUpdate = async (update: any) => {
                    // Stage progress event
                    if (update.current_phase && !update.success && !update.workflow) {
                        stopFallbackProgress();
                        setCurrentPhase(update.current_phase);
                        const pct = typeof update.progress_percentage === 'number'
                            ? Math.min(99, Math.max(0, update.progress_percentage))
                            : Math.min(99, mapBackendPhaseToProgress(update.current_phase));
                        setProgress(prev => deriveMonotonicProgress(prev, pct));
                        const label = update.log ?? getPhaseDescription(update.current_phase);
                        setBuildingLogs(prev => prev.includes(label) ? prev : [...prev, label]);
                        // Yield to browser event loop so React flushes this render
                        // before processing the next stage event
                        await new Promise(resolve => setTimeout(resolve, 0));
                        return;
                    }

                    // Error event
                    if (update.status === 'error') {
                        stopFallbackProgress();
                        throw new Error(typeof update.error === 'string' ? update.error : 'Workflow generation failed');
                    }

                    // Terminal payload (has success:true or workflow)
                    if (update.success || update.workflow || update.phase) {
                        stopFallbackProgress();
                        data = update;
                    }
                };

                // Some paths can still respond with application/json (non-streaming fallback).
                if (!refineReader || contentType.includes('application/json')) {
                    const jsonPayload = await response.json().catch(() => null);
                    if (jsonPayload) {
                        await handleUpdate(jsonPayload);
                        if (!data) data = jsonPayload;
                    }
                } else {
                    while (true) {
                        const { done, value } = await refineReader.read();
                        if (done) break;
                        refineBuffer += refineDecoder.decode(value, { stream: true });
                        const lines = refineBuffer.split('\n');
                        refineBuffer = lines.pop() || '';
                        for (const line of lines) {
                            if (!line.trim()) continue;
                            let update: any;
                            try { update = JSON.parse(line); } catch { continue; }
                            await handleUpdate(update);
                        }
                    }

                    // Parse any final line without trailing newline.
                    if (!data && refineBuffer.trim()) {
                        const trailingUpdate = JSON.parse(refineBuffer.trim());
                        await handleUpdate(trailingUpdate);
                    }
                }
                stopFallbackProgress();
                if (!data) throw new Error('No workflow data received from backend');
            }
            setRefinement(data);
            
            // Optional validation pass: drop bad backend rows/strings (no throw — wizard keeps going).
            const rawDiscovered = data.discoveredCredentials;
            const hadDiscoveredPayload = Array.isArray(rawDiscovered) && rawDiscovered.length > 0;
            const { validRows: discoveredSanitized, invalidCount: invalidDiscoveredRows } = hadDiscoveredPayload
                ? partitionValidatedDiscoveredCredentials(rawDiscovered)
                : { validRows: [] as any[], invalidCount: 0 };
            const { strings: legacyCredsSanitized, invalidCount: invalidLegacyStrings } =
                partitionValidatedRequiredCredentialStrings(data.requiredCredentials);

            const droppedCredentialEntries = invalidDiscoveredRows + invalidLegacyStrings;
            if (droppedCredentialEntries > 0) {
                console.warn('[Frontend] Skipped invalid backend credential entries:', {
                    invalidDiscoveredRows,
                    invalidLegacyStrings,
                });
                toast({
                    title: 'Credential data adjusted',
                    description: `${droppedCredentialEntries} incomplete or invalid credential ${droppedCredentialEntries === 1 ? 'entry was' : 'entries were'} skipped so the wizard can continue.`,
                });
            }

            // ?? STRUCTURAL FIX: Handle discovered credentials from credential discovery phase
            if (discoveredSanitized.length > 0) {
                console.log('?? [Frontend] Discovered credentials from backend (validated):', discoveredSanitized);
                
                const discoveredCredNames = discoveredSanitized
                    .filter((cred: any) => cred.required)
                    .map((cred: any) => cred.vaultKey || cred.displayName)
                    .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0);
                
                const allCreds = Array.from(new Set([...discoveredCredNames, ...legacyCredsSanitized]));
                
                setRequiredCredentials(allCreds);
                stateManager.setRequiredCredentials(allCreds);
                
                console.log('? [Frontend] Set required credentials from discovery:', allCreds);

                const missingNow = discoveredSanitized.filter((c: any) => !c.satisfied);
                const satisfiedNow = discoveredSanitized.filter((c: any) => c.satisfied);
                setBuildingLogs(prev => {
                    const lines: string[] = [];
                    if (satisfiedNow.length > 0) lines.push(`? ${satisfiedNow.length} credential(s) connected`);
                    if (missingNow.length > 0) lines.push(`?? ${missingNow.length} credential(s) required: ${missingNow.map((c: any) => c.displayName || c.vaultKey).join(', ')}`);
                    const newLines = lines.filter(l => !prev.includes(l));
                    return newLines.length > 0 ? [...prev, ...newLines] : prev;
                });
            } else if (legacyCredsSanitized.length > 0) {
                setRequiredCredentials(legacyCredsSanitized);
                stateManager.setRequiredCredentials(legacyCredsSanitized);
            }
            
            // CRITICAL FIX: Handle preview phase - show final prompt and allow node configuration
            if (data.phase === 'preview' && data.workflow) {
                console.log('? Backend returned preview phase - showing final prompt and node configuration');
                
                // Store the enhanced prompt for display
                if (data.enhancedPrompt) {
                    console.log('?? Enhanced prompt from backend:', data.enhancedPrompt);
                    // Update the refinement with enhanced prompt
                    setRefinement({
                        ...data,
                        systemPrompt: data.enhancedPrompt,
                        enhancedPrompt: data.enhancedPrompt,
                    });
                }
                
                // Ensure we're in the right state before confirming understanding
                const currentWizardState = mapWizardStepToState(step);
                if (currentWizardState !== WorkflowGenerationState.STATE_2_CLARIFICATION_ACTIVE) {
                    // Force transition to clarification active state first
                    console.log('?? Not in CLARIFICATION_ACTIVE state, attempting to fix state...');
                    // Try to set clarifying answers to get into the right state
                    stateManager.setClarifyingAnswers(answers);
                }
                
                // Note: Auto-confirm understanding disabled - user must explicitly confirm
                // Show confirmation step with preview workflow
                setStep('confirmation');
                scrollToStep(step3Ref, 300);
                toast({
                    title: 'Workflow Preview Ready',
                    description: 'Review the final prompt and configure node properties if needed',
                });
                return; // Exit - user will configure and then build
            }
            
            // CRITICAL FIX: Check if backend already returned complete workflow (phase: 'complete')
            // If so, use it directly instead of making another request
            if (data.phase === 'complete' && data.workflow) {
                console.log('? Backend returned complete workflow in refine response - using it directly');
                
                // Extract workflow data
                const workflowNodes = data.workflow.nodes || [];
                const workflowEdges = data.workflow.edges || [];
                
                if (workflowNodes.length > 0 && workflowEdges.length > 0) {
                    // Workflow is complete - save it directly
                    try {
                        const { data: { user } } = await awsClient.auth.getUser();
                        // Step 1: Normalize backend format to frontend format
                        const { normalizeBackendWorkflow } = await import('@/lib/node-type-normalizer');
                        const normalizedBackend = normalizeBackendWorkflow({ nodes: workflowNodes, edges: workflowEdges });
                        // Step 2: Validate and fix workflow (up to 10 passes until graph stabilises)
                        const normalized = revalidateWorkflowGraph(normalizedBackend.nodes, normalizedBackend.edges, 10);

                        const metaRefine1: Record<string, unknown> = {};
                        const p1 = (originalPrompt && originalPrompt.trim()) || (typeof prompt === 'string' && prompt.trim()) || '';
                        if (p1) metaRefine1.originalUserPrompt = p1;
                        if (data.buildAiUsage && typeof data.buildAiUsage === 'object') metaRefine1.buildAiUsage = data.buildAiUsage;
                        const workflowData: Record<string, unknown> = {
                            name: (analysis?.summary && typeof analysis.summary === 'string') 
                                ? analysis.summary.substring(0, 50) 
                                : 'AI Generated Workflow',
                            nodes: normalized.nodes,
                            edges: normalized.edges,
                            user_id: user?.id,
                            updated_at: new Date().toISOString(),
                        };
                        if (Object.keys(metaRefine1).length > 0) {
                            workflowData.metadata = metaRefine1;
                            workflowData.graph = { nodes: normalized.nodes, edges: normalized.edges, metadata: { ...metaRefine1 } };
                        }

                        const { data: savedWorkflow, error: saveError } = await awsClient
                            .from('workflows')
                            .insert(markWorkflowDataAsPendingSetup(workflowData) as any)
                            .select()
                            .single();

                        if (saveError) {
                            console.error('Error saving workflow:', saveError);
                            throw saveError;
                        }

                        if (savedWorkflow?.id) {
                            setGeneratedWorkflowId(savedWorkflow.id);
                            setNodes(normalized.nodes);
                            setEdges(normalized.edges);
                            setProgress(100);
                            setIsComplete(true);
                            setStep('complete');
                            console.log('? Workflow saved successfully with ID:', savedWorkflow.id);
                            return; // Exit early - workflow is complete
                        }
                    } catch (saveErr: any) {
                        console.error('Error saving workflow:', saveErr);
                        toast({
                            title: 'Warning',
                            description: 'Workflow generated but failed to save. Error: ' + (saveErr.message || 'Unknown error'),
                            variant: 'destructive',
                        });
                    }
                }
            }
            
            // ? PRODUCTION: Only handle phase === 'ready' - all configuration/credentials after generation
            // Removed: phase === 'configuration' and phase === 'credentials' handling
            // Backend now always returns phase === 'ready' with discoveredInputs and discoveredCredentials

            // Handle ready phase ? AI-first pipeline: save workflow then show field-ownership wizard
            if (data.phase === 'ready' && data.workflow) {
                console.log('? [Frontend] Ready phase - saving workflow and opening field-ownership wizard');

                const workflowNodes = data.workflow.nodes || [];
                const workflowEdges = data.workflow.edges || [];

                if (workflowNodes.length > 0) {
                    try {
                        const { data: { user } } = await awsClient.auth.getUser();
                        const { normalizeBackendWorkflow } = await import('@/lib/node-type-normalizer');
                        const normalizedBackend = normalizeBackendWorkflow({ nodes: workflowNodes, edges: workflowEdges });
                        const normalized = revalidateWorkflowGraph(normalizedBackend.nodes, normalizedBackend.edges, 10);

                        const workflowData: Record<string, unknown> = {
                            name: (analysis?.summary && typeof analysis.summary === 'string')
                                ? analysis.summary.substring(0, 50)
                                : 'AI Generated Workflow',
                            nodes: normalized.nodes,
                            edges: normalized.edges,
                            user_id: user?.id,
                            updated_at: new Date().toISOString(),
                        };

                        const { data: savedWorkflow, error: saveError } = await awsClient
                            .from('workflows')
                            .insert(markWorkflowDataAsPendingSetup(workflowData) as any)
                            .select()
                            .single();

                        if (saveError) throw saveError;

                        if (savedWorkflow?.id) {
                            setGeneratedWorkflowId(savedWorkflow.id);
                            setNodes(applyFillModesToNodes(normalized.nodes as any[], fillModeValues));
                            setEdges(normalized.edges as any[]);
                            setProgress(100);
                            setIsComplete(true);
                            console.log('? Workflow saved with ID:', savedWorkflow.id);

                            // Wire into the existing field-ownership wizard
                            const comprehensiveQuestions = data.comprehensiveQuestions || [];
                            const discoveredCreds = data.discoveredCredentials || [];
                            setPendingWorkflowData({
                                nodes: normalized.nodes,
                                edges: normalized.edges,
                                update: data,
                                discoveredInputs: data.discoveredInputs || [],
                                discoveredCredentials: discoveredCreds,
                                comprehensiveQuestions,
                                unifiedReadiness: data.unifiedReadiness || null,
                                credentialStatuses: data.credentialStatuses,
                                credentialWizardView: data.credentialWizardView,
                                fieldOwnershipMap: data.fieldOwnershipMap || undefined,
                                fieldOwnershipPolicyMap: data.fieldOwnershipPolicyMap || undefined,
                            });

                            // Bug A fix: pipeline backend has completed ? set pipelineReady flag.
                            // Only advance to 'field-ownership' (questions UI) or 'complete' here.
                            // The 'refining' overlay must NOT appear until questionsAnswered === true.
                            setPipelineReady(true);
                            if (comprehensiveQuestions.length > 0 || discoveredCreds.length > 0) {
                                // Questions exist ? show questions UI and wait for user to submit answers.
                                // The 'refining' overlay is skipped; user goes directly to field-ownership.
                                const baseQuestions = comprehensiveQuestions.map((q: any) => {
                                    const fieldName = String(q.fieldName || '').trim() || 'credential';
                                    const isCredentialQ = q.category === 'credential' || q.ownershipClass === 'credential';
                                    return {
                                        ...q,
                                        questionType: isCredentialQ ? 'credential' : (q.category || 'input'),
                                        id: q.id || `${q.nodeId}_${fieldName}`,
                                        fieldName,
                                        label: q.text || q.label || `${q.nodeLabel} - ${fieldName}`,
                                        isVaultCredential: isCredentialQ,
                                    };
                                });
                                setAllQuestions(applyFieldOwnershipPoliciesToQuestions(
                                    baseQuestions,
                                    data.fieldOwnershipMap,
                                    data.fieldOwnershipPolicyMap,
                                ));
                                setStep('field-ownership');
                            } else {
                                const synthesized = synthesizeFieldOwnershipQuestions(
                                    normalized.nodes,
                                    data.fieldOwnershipMap,
                                    data.fieldOwnershipPolicyMap,
                                );
                                if (synthesized.length > 0) {
                                    setAllQuestions(synthesized);
                                    setStep('field-ownership');
                                } else {
                                    setQuestionsAnswered(true);
                                    setStep('complete');
                                }
                            }
                            return;
                        }
                    } catch (saveErr: any) {
                        console.error('Error saving workflow:', saveErr);
                        toast({
                            title: 'Warning',
                            description: 'Workflow generated but failed to save: ' + (saveErr.message || 'Unknown error'),
                            variant: 'destructive',
                        });
                    }
                }
            }

            // Handle complete phase - workflow is fully built and ready
            if (data.phase === 'complete') {
                console.log('? [Frontend] Complete phase - workflow fully built');
                
                // Extract credentials if provided (same validation as refine branch — no throw)
                const { strings: detectedCredentials } = partitionValidatedRequiredCredentialStrings(
                    data.requiredCredentials
                );
                setRequiredCredentials(detectedCredentials);
                stateManager.setRequiredCredentials(detectedCredentials);
                
                // If workflow is provided, save it
                if (data.workflow) {
                    const workflowNodes = data.workflow.nodes || [];
                    const workflowEdges = data.workflow.edges || [];
                    
                    if (workflowNodes.length > 0 && workflowEdges.length > 0) {
                        try {
                            const { data: { user } } = await awsClient.auth.getUser();
                            const normalized = revalidateWorkflowGraph(workflowNodes, workflowEdges, 10);

                            const metaRefine2: Record<string, unknown> = {};
                            const p2 = (originalPrompt && originalPrompt.trim()) || (typeof prompt === 'string' && prompt.trim()) || '';
                            if (p2) metaRefine2.originalUserPrompt = p2;
                            if (data.buildAiUsage && typeof data.buildAiUsage === 'object') metaRefine2.buildAiUsage = data.buildAiUsage;
                            const workflowData: Record<string, unknown> = {
                                name: (analysis?.summary && typeof analysis.summary === 'string') 
                                    ? analysis.summary.substring(0, 50) 
                                    : 'AI Generated Workflow',
                                nodes: normalized.nodes,
                                edges: normalized.edges,
                                user_id: user?.id,
                                updated_at: new Date().toISOString(),
                            };
                            if (Object.keys(metaRefine2).length > 0) {
                                workflowData.metadata = metaRefine2;
                                workflowData.graph = { nodes: normalized.nodes, edges: normalized.edges, metadata: { ...metaRefine2 } };
                            }

                            const { data: savedWorkflow, error: saveError } = await awsClient
                                .from('workflows')
                                .insert(markWorkflowDataAsPendingSetup(workflowData) as any)
                                .select()
                                .single();

                            if (saveError) {
                                console.error('Error saving workflow:', saveError);
                                throw saveError;
                            }

                            if (savedWorkflow?.id) {
                                setGeneratedWorkflowId(savedWorkflow.id);
                                setNodes(applyFillModesToNodes(normalized.nodes as any[], fillModeValues));
                                setEdges(normalized.edges as any[]);
                                setProgress(100);
                                console.log('? Workflow saved successfully with ID:', savedWorkflow.id);
                                
                                // Go to Configure step to collect missing credentials and inputs
                                setStep('configure');
                                return;
                            }
                        } catch (saveErr: any) {
                            console.error('Error saving workflow:', saveErr);
                            toast({
                                title: 'Warning',
                                description: 'Workflow generated but failed to save. Error: ' + (saveErr.message || 'Unknown error'),
                                variant: 'destructive',
                            });
                        }
                    }
                }
                
                // Always show confirmation step - auto-skip disabled
                // User must explicitly confirm workflow regardless of credentials
                console.log('? Showing confirmation step - user must explicitly approve');
                setStep('confirmation');
                scrollToStep(step3Ref, 300);
                return;
            }
            
            // LEGACY: Handle old refine response format (no phase field)
            // This is for backward compatibility
            console.log('?? [Frontend] Legacy refine response format detected (no phase field)');
            setWorkflowUnderstandingConfirmed(false);
            
            // Identify required credentials from requirements and answers
            // PRIORITY: Trust backend credential analysis (it analyzes actual workflow structure)
            let detectedCredentials: string[] = [];
            
            if (data.requiredCredentials !== undefined && Array.isArray(data.requiredCredentials)) {
                // Backend has provided credential analysis - trust it completely (even if empty array)
                const { strings: validatedStrings } = partitionValidatedRequiredCredentialStrings(data.requiredCredentials);
                detectedCredentials = validatedStrings.map((cred) => normalizeCredentialName(cred));
                if (detectedCredentials.length > 0) {
                    console.log('?? Backend identified required credentials:', detectedCredentials);
                } else {
                    console.log('? Backend confirmed: No credentials required for this workflow');
                }
            } else if (data?.requirements) {
                console.warn(
                    '[Frontend] Backend did not provide requiredCredentials. Skipping client-side credential inference and relying on backend discovery/missing-items readiness.'
                );
            } else {
                console.log('?? No credentials required');
            }
            
            // Final deduplication with normalization
            const normalizedCreds = new Map<string, string>();
            detectedCredentials.forEach((cred: string) => {
                const normalized = normalizeCredentialName(cred);
                if (!normalizedCreds.has(normalized)) {
                    normalizedCreds.set(normalized, normalized); // Use normalized name
                }
            });
            
            const uniqueCredentials = Array.from(normalizedCreds.values());
            setRequiredCredentials(uniqueCredentials);
            stateManager.setRequiredCredentials(uniqueCredentials);
            console.log('? Set requiredCredentials to (deduplicated & normalized):', uniqueCredentials);
            
            // CRITICAL FIX: Only transition to confirmation if workflow is already built
            // Check if workflow exists in response (legacy format may include it)
            const hasWorkflow = data.workflow || data.partialWorkflow;
            
            if (hasWorkflow) {
                console.log('? [Frontend] Workflow exists in response - showing confirmation step');
                // Always show confirmation step - auto-skip disabled
                // User must explicitly confirm workflow regardless of credentials
                setStep('confirmation');
                scrollToStep(step3Ref, 300);
            } else {
                // No workflow yet - automatically generate workflow using mode: 'create'
                console.log('? [Frontend] Refinement complete - automatically generating workflow...');
                console.log('?? [Frontend] Proceeding to workflow generation (mode: create)');
                
                // ? CRITICAL: Use refined prompt from backend, or fallback to current prompt state
                // The refined prompt should be the selected variation prompt that was sent
                const selectedPromptForBuild = data.refinedPrompt || prompt;
                console.log('[Frontend] Using prompt for workflow generation:', selectedPromptForBuild);
                
                // Update prompt state with refined prompt if available
                if (data.refinedPrompt) {
                    setPrompt(data.refinedPrompt);
                }
                
                // Ensure refinement data is set (handleBuild needs it)
                setRefinement(data);
                
                // Set step to 'building' so handleBuild knows we're ready
                // handleBuild will use mode: 'create' to generate the workflow
                // The prompt is already set in state, so handleBuild will use it
                setTimeout(() => {
                    handleBuild();
                }, 0); // state is already set synchronously
            }
        } catch (err: any) {
            console.error(err);
            toast({ title: 'Refinement Failed', description: err.message, variant: 'destructive' });
            setHasWorkflowPlan(true);
            setStep('questioning');
        }
    };

    /**
     * Run up to maxPasses rounds of graph validation+fixing until the graph stabilises.
     * Returns the stabilised { nodes, edges }.
     */
    const revalidateWorkflowGraph = (
        initialNodes: any[],
        initialEdges: any[],
        maxPasses = 10,
        options?: ValidateAndFixWorkflowOptions,
    ): { nodes: any[]; edges: any[]; passes: number } => {
        let current = { nodes: initialNodes, edges: initialEdges };
        for (let pass = 1; pass <= maxPasses; pass++) {
            const before = JSON.stringify({ nodes: current.nodes, edges: current.edges });
            const fixed = validateAndFixWorkflow(
                { nodes: current.nodes, edges: current.edges },
                options
            );
            const after = JSON.stringify({ nodes: fixed.nodes, edges: fixed.edges });
            current = fixed;
            if (before === after) {
                return { ...current, passes: pass };
            }
        }
        return { ...current, passes: maxPasses };
    };

    /**
     * Auto-execute workflow after it's saved
     */
    const autoExecuteWorkflow = async (workflowId: string) => {
        try {
            console.log('?? Auto-executing workflow:', workflowId);
            setExecutionStatus('running');
            setExecutionProgress(0);
            setExecutionError(null);
            setExecutionRequestId(null);
            setStep('executing');

            // Get auth token
            const { data: { session } } = await awsClient.auth.getSession();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            // Pre-execution readiness check: re-read server-side missing items so vault
            // credentials, user-provided static fields, and runtime_ai deferrals are evaluated
            // against the workflow that will actually run.
            const localMissingCredentialLabels = credentialQuestionsForStep
                .filter((q: any) => {
                    if (q?.required === false) return false;
                    if (q?.credential?.satisfied === true) return false;
                    return getCredentialAnswerForQuestion(q).length === 0;
                })
                .map((q: any) => q.label || q.credential?.displayName || q.fieldName || 'credential');
            const localMissingOAuthLabels = blockingOAuthCredentials.map(
                (c: any) => c.displayName || c.vaultKey || c.provider || 'connected account'
            );
            const localMissingLabels = [...localMissingCredentialLabels, ...localMissingOAuthLabels];
            if (localMissingLabels.length > 0) {
                setExecutionError(`Missing credentials before execution: ${localMissingLabels.join(', ')}.`);
                setExecutionStatus('failed');
                setStep('credentials');
                return;
            }

            const readinessResponse = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${workflowId}/missing-items`, {
                headers,
            });
            if (!readinessResponse.ok) {
                const error = await readinessResponse.json().catch(() => ({ error: 'Pre-execution readiness check failed' }));
                throw new Error(error.message || error.error || 'Could not verify workflow readiness before execution');
            }
            const readiness = await readinessResponse.json();
            const missingCredentialLabels = (Array.isArray(readiness.credentials) ? readiness.credentials : [])
                .filter((c: any) => c?.satisfied !== true)
                .map((c: any) => c.displayName || c.vaultKey || c.provider || 'credential');
            const missingInputLabels = (Array.isArray(readiness.inputs) ? readiness.inputs : [])
                .filter((i: any) => i?.required !== false)
                .map((i: any) => `${i.nodeLabel || i.nodeId || 'Node'} - ${i.fieldName || 'input'}`);
            if (missingCredentialLabels.length > 0 || missingInputLabels.length > 0) {
                const parts = [
                    missingCredentialLabels.length > 0 ? `credentials: ${missingCredentialLabels.join(', ')}` : '',
                    missingInputLabels.length > 0 ? `inputs: ${missingInputLabels.join(', ')}` : '',
                ].filter(Boolean);
                setExecutionError(`Workflow is not ready for execution. Missing ${parts.join('; ')}.`);
                setExecutionStatus('failed');
                setStep(missingCredentialLabels.length > 0 ? 'credentials' : 'configuration');
                return;
            }
            
            // Start execution using distributed workflow engine
            const response = await fetch(`${ENDPOINTS.itemBackend}/api/distributed-execute-workflow`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    workflowId,
                    input: {} // Initial input - can be customized later
                })
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to start execution' }));
                throw new Error(error.error || 'Failed to start workflow execution');
            }
            
            const data = await response.json();
            const execId = data.execution_id;
            
            if (!execId) {
                throw new Error('No execution ID returned');
            }
            
            setExecutionId(execId);
            setExecutionProgress(10);
            
            // Poll for execution status with exponential backoff (2s ? 4s ? 8s ? max 30s)
            let pollDelay = 2000;
            const MAX_POLL_DELAY = 30000;
            let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;
            let pollCancelled = false;

            const pollStatus = async () => {
                if (pollCancelled) return;
                try {
                    const statusResponse = await fetch(`${ENDPOINTS.itemBackend}/api/execution-status/${execId}`, {
                        headers: session?.access_token ? {
                            'Authorization': `Bearer ${session.access_token}`
                        } : {}
                    });

                    if (!statusResponse.ok) {
                        throw new Error('Failed to get execution status');
                    }

                    const statusData = await statusResponse.json();
                    const status = statusData.status;

                    // Update progress based on completed steps
                    if (statusData.steps && Array.isArray(statusData.steps)) {
                        const completedSteps = statusData.steps.filter((s: any) => s.status === 'completed').length;
                        const totalSteps = statusData.steps.length;
                        if (totalSteps > 0) {
                            setExecutionProgress(10 + (completedSteps / totalSteps) * 80);
                        }
                    }

                    if (status === 'completed') {
                        pollCancelled = true;
                        setExecutionStatus('completed');
                        setExecutionProgress(100);
                        setExecutionResult(statusData);
                        setStep('complete');
                        toast({
                            title: 'Workflow Executed Successfully',
                            description: 'Your workflow has completed execution!',
                        });
                    } else if (status === 'failed' || status === 'error') {
                        pollCancelled = true;
                        setExecutionStatus('failed');
                        setExecutionError(statusData.error || 'Workflow execution failed');
                        setStep('complete');
                        toast({
                            title: 'Execution Failed',
                            description: statusData.error || 'Workflow execution encountered an error',
                            variant: 'destructive',
                        });
                    } else {
                        pollDelay = Math.min(pollDelay * 1.5, MAX_POLL_DELAY);
                        pollTimeoutId = setTimeout(pollStatus, pollDelay);
                    }
                } catch (pollError: any) {
                    console.error('Error polling execution status:', pollError);
                    if (!pollCancelled) {
                        pollTimeoutId = setTimeout(pollStatus, pollDelay);
                    }
                }
            };
            pollTimeoutId = setTimeout(pollStatus, pollDelay);

            // Timeout after 5 minutes
            setTimeout(() => {
                if (!pollCancelled) {
                    pollCancelled = true;
                    if (pollTimeoutId) clearTimeout(pollTimeoutId);
                    setExecutionStatus('failed');
                    setExecutionError('Execution timeout - workflow took too long to complete');
                    setStep('complete');
                    toast({
                        title: 'Execution Timeout',
                        description: 'Workflow execution is taking longer than expected. Check execution status manually.',
                        variant: 'destructive',
                    });
                }
            }, 5 * 60 * 1000);
            
        } catch (err: any) {
            console.error('Error auto-executing workflow:', err);
            setExecutionStatus('failed');
            setExecutionError(err.message || 'Failed to execute workflow');
            if (err.requestId) setExecutionRequestId(err.requestId);
            setStep('complete');
            toast({
                title: 'Execution Failed',
                description: err.message || 'Failed to start workflow execution',
                variant: 'destructive',
            });
        }
    };

    const markWorkflowDataAsPendingSetup = useCallback((workflowData: Record<string, unknown>) => {
        const metadata =
            workflowData.metadata && typeof workflowData.metadata === 'object' && !Array.isArray(workflowData.metadata)
                ? { ...(workflowData.metadata as Record<string, unknown>) }
                : {};
        const aiSetup =
            metadata.aiSetup && typeof metadata.aiSetup === 'object' && !Array.isArray(metadata.aiSetup)
                ? { ...(metadata.aiSetup as Record<string, unknown>) }
                : {};
        const pendingMetadata = {
            ...metadata,
            aiSetup: {
                ...aiSetup,
                pending: true,
                stage: 'ai_setup_pending',
                updatedAt: new Date().toISOString(),
            },
        };

        workflowData.metadata = pendingMetadata;
        if (workflowData.nodes && workflowData.edges) {
            workflowData.graph = {
                nodes: workflowData.nodes,
                edges: workflowData.edges,
                metadata: pendingMetadata,
            };
        }
        workflowData.setup_completed = false;
        workflowData.setup_stage = 'ai_setup_pending';
        workflowData.setup_completed_at = null;
        workflowData.status = 'draft';
        workflowData.phase = 'draft';
        workflowData.confirmed = false;
        return workflowData;
    }, []);

    const commitSetupWorkflow = useCallback(async (workflowId: string) => {
        const { data: { session } } = await awsClient.auth.getSession();
        const response = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${workflowId}/commit-setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || ''}`,
            },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            const detailErrors: string[] = result?.details?.errors ?? [];
            const topMessage = result?.message || result?.error || 'Workflow setup is incomplete';
            const fullMessage = detailErrors.length > 0
                ? `${topMessage}\n\n${detailErrors.join('\n')}`
                : topMessage;
            throw new Error(fullMessage);
        }
        return result;
    }, []);

    const handleWizardClose = useCallback(async () => {
        if (!generatedWorkflowId) {
            navigate('/workflows');
            return;
        }
        const confirmed = window.confirm(
            'Exit the workflow wizard? Your in-progress workflow will be discarded.'
        );
        if (!confirmed) return;
        // Best-effort delete — only removes uncommitted drafts (setup_completed = false)
        await awsClient
            .from('workflows')
            .delete()
            .eq('id', generatedWorkflowId)
            .eq('setup_completed', false)
            .catch(() => null);
        navigate('/workflows');
    }, [generatedWorkflowId, navigate, awsClient]);

    // Warn the user before closing the tab/browser while a workflow draft is in progress
    useEffect(() => {
        if (!generatedWorkflowId || step === 'idle') return;
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [generatedWorkflowId, step]);

    const handleConnectGoogleOAuth = useCallback(async () => {
        try {
            const {
                data: { user },
                error: userError,
            } = await awsClient.auth.getUser();
            if (userError || !user) {
                toast({
                    title: 'Authentication required',
                    description: 'Please sign in first to connect Google.',
                    variant: 'destructive',
                });
                return;
            }
            if (pendingWorkflowData) {
                sessionStorage.setItem(
                    'pendingWorkflowAfterOAuth',
                    JSON.stringify({
                        workflowId: generatedWorkflowId,
                        step,
                        pendingWorkflowData,
                    })
                );
            }
            const { data: { session } } = await awsClient.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) throw new Error('Please sign in first to connect Google.');
            const returnTo = getCurrentPathWithQuery();
            toast({
                title: 'Redirecting to Google?',
                description: 'Authorize access; you will return here afterward.',
            });
            startGoogleConnectorOAuth(userId, returnTo);
        } catch (e: unknown) {
            toast({
                title: 'Google sign-in failed',
                description: e instanceof Error ? e.message : 'Could not start OAuth',
                variant: 'destructive',
            });
        }
    }, [pendingWorkflowData, generatedWorkflowId, step, toast]);

    const handleBuild = async (explicitPrompt?: string) => {
        // ? PRODUCTION FLOW: Unified configuration submission (inputs + credentials)
        if (pendingWorkflowData && step === 'configuration') {
            console.log('? Submitting unified configuration (inputs + credentials)');
            let savedWorkflow: any = null; // Declare outside try block for catch access
            try {
                const { data: { user } } = await awsClient.auth.getUser();

                /** Canonical user text for intent authority (form field allowlist). Not the augmented planner blob. */
                const canonicalUserIntentForMetadata =
                    (originalPrompt && originalPrompt.trim()) ||
                    (typeof prompt === 'string' && prompt.trim()) ||
                    '';

                // ? KEY FIX: If the workflow was already saved at pipeline-ready time (generatedWorkflowId exists),
                // reuse that record instead of inserting a new one. This prevents regenerating the workflow
                // from scratch when the user clicks "Continue Workflow" after the field-ownership step.
                if (generatedWorkflowId) {
                    console.log('? Reusing existing workflow:', generatedWorkflowId);
                    savedWorkflow = { id: generatedWorkflowId };
                } else {
                // First, save the workflow without inputs/credentials
                const buildAiFromGen = (pendingWorkflowData as any)?.update?.buildAiUsage;
                const workflowMetadataCfg: Record<string, unknown> = {};
                if (canonicalUserIntentForMetadata) {
                    workflowMetadataCfg.originalUserPrompt = canonicalUserIntentForMetadata;
                }
                if (buildAiFromGen && typeof buildAiFromGen === 'object') {
                    workflowMetadataCfg.buildAiUsage = fieldGuidanceBuildAiUsage
                        ? mergeBuildAiUsageSnapshot(buildAiFromGen, fieldGuidanceBuildAiUsage)
                        : buildAiFromGen;
                } else if (fieldGuidanceBuildAiUsage) {
                    workflowMetadataCfg.buildAiUsage = fieldGuidanceBuildAiUsage;
                }
                const appliedGuidanceListForMetadata = Object.values(appliedFieldGuidanceExamples);
                if (appliedGuidanceListForMetadata.length > 0) {
                    workflowMetadataCfg.fieldGuidanceAppliedCount = appliedGuidanceListForMetadata.length;
                    workflowMetadataCfg.fieldGuidanceAppliedFields = appliedGuidanceListForMetadata;
                }
                const pendingNormalized = revalidateWorkflowGraph(
                    pendingWorkflowData.nodes,
                    pendingWorkflowData.edges,
                    10,
                    { preserveTopology: true }
                );
                const workflowData = {
                    name: (analysis?.summary && typeof analysis.summary === 'string') 
                        ? analysis.summary.substring(0, 50) 
                        : 'AI Generated Workflow',
                    nodes: pendingNormalized.nodes,
                    edges: pendingNormalized.edges,
                    user_id: user?.id,
                    updated_at: new Date().toISOString(),
                    ...(Object.keys(workflowMetadataCfg).length > 0
                        ? {
                              metadata: workflowMetadataCfg,
                              graph: {
                                  nodes: pendingNormalized.nodes,
                                  edges: pendingNormalized.edges,
                                  metadata: { ...workflowMetadataCfg },
                              },
                          }
                        : {}),
                };
                
                const { data: workflowResult, error: saveError } = await awsClient
                    .from('workflows')
                    .insert(markWorkflowDataAsPendingSetup(workflowData) as any)
                    .select()
                    .single();
                
                if (saveError) {
                    throw saveError;
                }
                
                savedWorkflow = workflowResult; // Store for catch block access
                } // end else (no generatedWorkflowId)

                if (savedWorkflow?.id) {
                    const { data: { session } } = await awsClient.auth.getSession();
                    
                    // ? STEP 1: Attach inputs first (if any)
                    let inputsResult: any = null;
                    const sanitizedModeInputs = Object.fromEntries(
                        Object.entries(ownershipEffectiveModes.byModeKey).filter(([k, v]) => {
                            if (!k.startsWith('mode_')) return false;
                            return v === 'manual_static' || v === 'runtime_ai' || v === 'buildtime_ai_once';
                        })
                    ) as Record<string, string>;
                    const unlockPayload: Record<string, string> = {};
                    credentialQuestions.forEach((q: any) => {
                        if (!q.isUnlockableCredential) return;
                        const uk = `unlock_${q.nodeId}_${q.fieldName}`;
                        unlockPayload[uk] = isCredentialUnlocked(q) ? 'true' : 'false';
                    });
                    const combinedInputs: Record<string, string> = {
                        ...inputValues,
                        ...sanitizedModeInputs,
                        ...unlockPayload,
                    };
                    // Attach only when there is a real payload and it was not just persisted.
                    if (
                        Object.keys(combinedInputs).length > 0 &&
                        !wasAttachInputsPayloadRecentlyPersisted(savedWorkflow.id, combinedInputs)
                    ) {
                        console.log('?? Attaching node inputs...');
                        console.log('?? Input values:', combinedInputs);
                        
                        const inputsResponse = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${savedWorkflow.id}/attach-inputs`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session?.access_token || ''}`,
                            },
                            body: JSON.stringify({
                                // ? COMPREHENSIVE: Send answers using question IDs (cred_*, op_*, config_*, resource_*)
                                // inputValues already uses question IDs (input.id) as keys when available
                                inputs: combinedInputs, // Format: { "cred_nodeId_fieldName": "value", "op_nodeId_fieldName": "value", "mode_nodeId_fieldName": "fillMode", etc. }
                                ...(canonicalUserIntentForMetadata
                                    ? { originalUserPrompt: canonicalUserIntentForMetadata }
                                    : {}),
                                // Include user-initiated field ownership overrides so backend can persist them
                                ...(Object.keys(fieldOwnershipOverrides).length > 0
                                    ? { fieldOwnershipOverrides }
                                    : {}),
                                ...(Object.keys(appliedFieldGuidanceExamples).length > 0
                                    ? { fieldGuidanceApplied: Object.values(appliedFieldGuidanceExamples) }
                                    : {}),
                                ...(fieldGuidanceBuildAiUsage
                                    ? { fieldGuidanceBuildAiUsage }
                                    : {}),
                            }),
                        });
                        
                        if (!inputsResponse.ok) {
                            const errorData = (await inputsResponse.json().catch(() => ({}))) as Record<string, unknown>;
                            const code = typeof errorData.code === 'string' ? errorData.code : '';
                            const message =
                                typeof errorData.message === 'string'
                                    ? errorData.message
                                    : typeof errorData.error === 'string'
                                      ? errorData.error
                                      : `HTTP ${inputsResponse.status}`;
                            console.warn('[AttachInputs] Request failed:', inputsResponse.status, {
                                code: code || undefined,
                                message,
                                details: errorData.details,
                            });

                            // Non-recoverable failures (400/500): stop here — do NOT commit the workflow.
                            // The workflow stays hidden (setup_completed=false) so it won't appear in the
                            // UI in a broken state. The user can retry from the wizard.
                            if (inputsResponse.status === 400 || inputsResponse.status === 500) {
                                toast({
                                    title: 'Could not save workflow configuration',
                                    description: [code && `Code: ${code}`, message].filter(Boolean).join(' — ').slice(0, 500) ||
                                        'Please try again. Your workflow draft is preserved.',
                                    variant: 'destructive',
                                });
                                return; // isNavigating stays false — button re-enabled for retry
                            }

                            // Recoverable failures (409 executing, network errors): show warning, continue.
                            toast({
                                title: 'Warning: some settings may not be saved',
                                description: 'You can adjust field settings in the editor.',
                                variant: 'destructive',
                            });
                            // Continue to commitSetupWorkflow below
                        } else {
                            inputsResult = await inputsResponse.json();
                            markAttachInputsPayloadPersisted(savedWorkflow.id, combinedInputs);
                            console.log('? Inputs attached successfully:', inputsResult);
                            const effectiveModesFromBackend = inputsResult?.diagnostics?.effectiveFillModes as
                                | Record<string, string>
                                | undefined;
                            if (effectiveModesFromBackend && Object.keys(effectiveModesFromBackend).length > 0) {
                                setFillModeValues((prev) => ({ ...prev, ...effectiveModesFromBackend }));
                            }
                            // Block navigation when the backend reports unresolved field/ownership
                            // issues (e.g. a structural field coerced away from runtime_ai still has
                            // no value) instead of silently committing a workflow that will fail to save.
                            const iv = inputsResult?.validation;
                            if (iv && iv.valid === false && Array.isArray(iv.errors) && iv.errors.length > 0) {
                                console.warn('?? Attach inputs validation failed:', iv.errors);
                                toast({
                                    title: 'Workflow needs attention before it can be opened',
                                    description: iv.errors.slice(0, 3).join(' • ').slice(0, 500),
                                    variant: 'destructive',
                                });
                                return; // isNavigating stays false — button re-enabled for retry after fixing ownership modes
                            }
                        }
                    } else {
                        console.log('?? No inputs to attach');
                    }
                    
                    // ? STEP 2: Attach credentials in same continuation cycle (blocking on validation errors)
                    let credentialsResult: any = null;
                    const inputPhase = String(inputsResult?.phase || '').toLowerCase();
                    const shouldAttachCredentialsNow =
                        shouldRunAttachCredentialsAfterAttachInputs(inputsResult?.phase);
                    // Send credentials object (possibly empty) so backend can revalidate readiness deterministically.
                    const credentialsToSend: Record<string, any> = {};
                    if (credentialValues && typeof credentialValues === 'object') {
                        // Canonical path: map question-id keyed values to vault keys expected by backend.
                        credentialQuestionsForStep.forEach((q: any) => {
                            const qid = String(q?.id || '').trim();
                            if (!qid) return;
                            const raw =
                                credentialValues[qid] ??
                                credentialValues[String(q?.fieldName || '').trim()] ??
                                credentialValues[String(q?.credential?.vaultKey || '').trim()] ??
                                credentialValues[String(q?.credential?.credentialId || '').trim()];
                            if (raw === undefined || raw === null || String(raw).trim() === '') return;
                            const key =
                                String(q?.credential?.vaultKey || '').trim() ||
                                String(q?.credential?.credentialId || '').trim() ||
                                String(q?.fieldName || '').trim();
                            if (!key) return;
                            credentialsToSend[key] = raw;
                        });
                        // Backward-compatible fallback: include direct credential keys if user/config populated them.
                        Object.entries(credentialValues).forEach(([key, value]) => {
                            const k = String(key || '').trim();
                            if (!k || k.startsWith('config_') || k.startsWith('mode_')) return;
                            if (value === undefined || value === null || String(value).trim() === '') return;
                            // Include cred_<nodeId>_<field> so attach-credentials can inject per-node (vault-key map may omit these).
                            if (!(k in credentialsToSend)) credentialsToSend[k] = value;
                        });
                    }
                    
                    if (!shouldAttachCredentialsNow) {
                        console.log(`?? Skipping credential attachment for phase "${inputPhase}" (inputs still pending)`);
                    } else {
                        // ? FIX: Derive satisfied/missing from discoveredCredentials (already populated during generation)
                        // Do NOT call attach-credentials when credentials are missing ? show friendly panel instead
                        const discoveredCreds: CredentialEntry[] = Array.isArray(pendingWorkflowData?.discoveredCredentials)
                            ? (pendingWorkflowData.discoveredCredentials as CredentialEntry[])
                            : [];
                        const missingCreds = discoveredCreds.filter((c) => !c.satisfied && c.required !== false);
                        const satisfiedCreds = discoveredCreds.filter((c) => c.satisfied);

                        if (missingCreds.length > 0) {
                            // Non-blocking: credentials can be connected from the workflow editor via Connections page
                            console.log('ℹ️ Some credentials not yet connected — opening workflow editor for user to complete:', missingCreds.map((c) => c.vaultKey || c.displayName));
                            toast({
                                title: 'Some credentials needed',
                                description: 'Your workflow is saved. Connect missing credentials from the Connections page inside the workflow editor.',
                            });
                            // Skip attach-credentials and fall through to navigate
                        } else {
                        console.log('?? Attaching credentials...');
                        const credentialsResponse = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${savedWorkflow.id}/attach-credentials`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session?.access_token || ''}`,
                            },
                            body: JSON.stringify({
                                credentials: credentialsToSend,
                            }),
                        });

                        if (!credentialsResponse.ok) {
                            const error = await credentialsResponse.json().catch(() => ({ error: 'Unknown error' }));
                            const rejected = Array.isArray(error?.details?.rejectedKeys) ? error.details.rejectedKeys.join(', ') : '';
                            const allowed = Array.isArray(error?.details?.allowedCredentialKeys) ? error.details.allowedCredentialKeys.join(', ') : '';
                            const base = error?.message || error?.error || error?.code || 'Credential attachment failed';
                            const errText = rejected
                                ? `${base}${rejected ? ` Rejected keys: ${rejected}.` : ''}${allowed ? ` Allowed keys: ${allowed}.` : ''}`
                                : base;
                            // Non-blocking: log warning and continue to workflow editor
                            console.warn('[AttachCredentials] Failed (non-blocking, user can connect from editor):', errText);
                            toast({
                                title: 'Some credentials not yet connected',
                                description: 'Your workflow is saved. Connect missing credentials from the Connections page.',
                            });
                        } else {
                        credentialsResult = await credentialsResponse.json();
                        console.log('? Credentials attached successfully');
                        }
                        }
                    }
                    
                    // ? CRITICAL: Always redirect even when no inputs or credentials are required
                    // Backend will handle auto-run when workflow reaches ready_for_execution status
                    
                    // ? STEP 4: Fetch final workflow from DB (not API endpoint)
                    // Get the latest workflow state (after inputs and credentials)
                    console.log('?? Fetching final workflow state...');
                    let finalWorkflow: any = null;
                    
                    try {
                        // ? CRITICAL: Query DB directly since there's no GET /api/workflows/:id endpoint
                        const { data: fetchedWorkflow, error: fetchError } = await awsClient
                            .from('workflows')
                            .select('*')
                            .eq('id', savedWorkflow.id)
                            .single();
                        
                        if (!fetchError && fetchedWorkflow) {
                            finalWorkflow = fetchedWorkflow;
                            console.log('? Final workflow fetched from DB:', finalWorkflow.id);
                        } else {
                            console.warn('?? Could not fetch final workflow from DB:', fetchError?.message);
                            // Fallback to credentials result or inputs result
                            if (credentialsResult?.workflow) {
                                finalWorkflow = credentialsResult.workflow;
                            } else if (inputsResult?.workflow) {
                                finalWorkflow = inputsResult.workflow;
                            } else {
                                // Use saved workflow as fallback
                                finalWorkflow = savedWorkflow;
                            }
                        }
                    } catch (fetchErr: any) {
                        console.warn('?? Error fetching final workflow:', fetchErr?.message);
                        // Fallback to saved workflow
                        finalWorkflow = savedWorkflow;
                    }
                    
                    // ? CRITICAL: Parse and normalize workflow graph before state update
                    const workflowGraph = typeof finalWorkflow.graph === 'string' 
                        ? JSON.parse(finalWorkflow.graph) 
                        : finalWorkflow.graph || finalWorkflow;
                    
                    // Backend attach-* preserves topology; avoid frontend linearization here.
                    const normalized = revalidateWorkflowGraph(
                        workflowGraph?.nodes || finalWorkflow.nodes || [],
                        workflowGraph?.edges || finalWorkflow.edges || [],
                        10,
                        { preserveTopology: true }
                    );
                    
                    // ? CRITICAL: Check if workflow is already ready before setting blueprint
                    // If already ready, skip blueprint setting (it's already set from initial generation)
                    const currentState = stateManager.getCurrentState();
                    const isAlreadyReady = currentState === WorkflowGenerationState.STATE_7_WORKFLOW_READY;
                    
                    if (!isAlreadyReady) {
                        // Fix state transitions only if not already ready
                    ensureStateForBlueprint(
                        stateManager, 
                        refinement?.refinedPrompt || refinement?.systemPrompt || prompt,
                        requiredCredentials
                    );
                    
                    stateManager.setWorkflowBlueprint({ nodes: normalized.nodes, edges: normalized.edges });
                    
                    const readyResult = stateManager.markWorkflowReady();
                    if (!readyResult.success) {
                        console.warn('[StateManager] Warning:', readyResult.error);
                        }
                    } else {
                        // Workflow is already ready - just update nodes/edges without state transition
                        console.log('[StateManager] Workflow already ready - skipping blueprint setting');
                    }
                    
                    const finalPhase = (finalWorkflow?.phase || '').toString();
                    const readyForExecution = finalPhase === 'ready_for_execution';
                    toast({
                        title: readyForExecution ? 'Workflow Ready' : 'Workflow Created',
                        description: !readyForExecution
                            ? 'Workflow saved. Some credentials are still required before run.'
                            : 'Your workflow has been created and configured!',
                    });

                    // ? CRITICAL: Always redirect to workflow view after successful configuration
                    console.log('?? Redirecting to workflow view...');
                    // setIsNavigating disables the button and shows a spinner — prevents re-clicks
                    // and avoids any state-driven re-render before the await completes.
                    // State setters are intentionally placed AFTER navigate so they never
                    // trigger a visible re-render (the component unmounts on navigation).
                    setIsNavigating(true);
                    await commitSetupWorkflow(savedWorkflow.id);
                    navigate(`/workflow/${savedWorkflow.id}`, { replace: true });
                    // No-ops from here — component is unmounting
                    setGeneratedWorkflowId(savedWorkflow.id);
                    setNodes(normalized.nodes as any[]);
                    setEdges(normalized.edges as any[]);
                    setPendingWorkflowData(null);
                    setProgress(100);
                    setIsComplete(true);
                    return;
                }
            } catch (err: any) {
                console.error('Error saving workflow with configuration:', err);
                setIsNavigating(false);
                toast({
                    title: 'Error',
                    description: 'Failed to save workflow: ' + (err.message || 'Unknown error'),
                    variant: 'destructive',
                });
                return;
            }
        }
        
        // ? FIXED: Require confirmed understanding before building
        // Get final understanding from refinement or prompt
        const finalUnderstanding = refinement?.refinedPrompt || refinement?.systemPrompt || prompt;
        const executionState = stateManager.getExecutionState();
        
        // ? FIXED: Check if understanding needs to be confirmed
        if (!executionState.final_understanding || executionState.final_understanding.trim() === '') {
            // Understanding not confirmed - must confirm before building
            if (finalUnderstanding) {
                // Try to confirm understanding if we have the prompt
                const currentState = stateManager.getCurrentState();
                const validStatesForConfirmation = [
                    WorkflowGenerationState.STATE_1_USER_PROMPT_RECEIVED,
                    WorkflowGenerationState.STATE_2_CLARIFICATION_ACTIVE,
                ];
                
                if (validStatesForConfirmation.includes(currentState)) {
                    const confirmResult = stateManager.confirmUnderstanding(finalUnderstanding);
                    if (!confirmResult.success) {
                        toast({
                            title: 'Confirmation Required',
                            description: confirmResult.error || 'Please confirm your understanding before building the workflow.',
                            variant: 'destructive',
                        });
                        // Stay on confirmation step
                        return;
                    }
                } else {
                    // Not in a valid state for confirmation - show error
                    toast({
                        title: 'Confirmation Required',
                        description: 'Please confirm your understanding of the workflow before building. Click "Yes, this is correct" first.',
                        variant: 'destructive',
                    });
                    // Stay on confirmation step
                    return;
                }
            } else {
                // No understanding available - block build
                toast({
                    title: 'Confirmation Required',
                    description: 'Understanding must be confirmed before building workflow. Please go through the confirmation step and click "Yes, this is correct".',
                    variant: 'destructive',
                });
                // Stay on confirmation step
                return;
            }
        }
        
        // Set provided credentials in state manager
        try {
            stateManager.setProvidedCredentials(credentialValues);
        } catch (err) {
            console.warn('State manager credential update failed (non-blocking):', err);
        }
        
        // ? FIXED: Start building with proper error handling (blocking)
        const buildResult = stateManager.startBuilding();
        if (!buildResult.success) {
            // Build blocked - show error and stay on current step
            toast({
                title: 'Cannot Build Workflow',
                description: buildResult.error || 'Cannot start building workflow.',
                variant: 'destructive',
            });
            
            // If requires confirmation, ensure we're on confirmation step
            if (buildResult.requiresConfirmation) {
                setStep('confirmation');
                return;
            }
            
            // Other errors - stay on current step
            return;
        }
        
        // Scroll to top before transitioning to building page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Only reset step/progress if not already on building screen
        // (handleConfirmPlan pre-sets these to avoid a flash back to 0)
        if (step !== 'building') {
            setStep('building');
            setProgress(0);
            setCurrentPhase('');
            setBuildStartTime(Date.now());
            setElapsedTime(0);
        }
        setIsComplete(false);
        setBuildingLogs(['Initializing Autonomous Agent...', 'Loading Node Library...', 'Synthesizing Requirements...']);

        // Conservative fallback progress until backend phase events arrive.
        // Keeps UI responsive without racing ahead of real backend milestones.
        let fallbackProgressInterval: NodeJS.Timeout | null = null;

        const startFallbackProgress = () => {
            fallbackProgressInterval = setInterval(() => {
                setProgress(prev => (prev < 10 ? prev + 1 : prev));
            }, 2500);
        }

        const stopFallbackProgress = () => {
            if (fallbackProgressInterval) {
                clearInterval(fallbackProgressInterval);
                fallbackProgressInterval = null;
            }
        };

        try {
            // Normalize credential values to ensure uppercase keys are included
            const normalizedCredentials: Record<string, string> = {};
            Object.entries(credentialValues).forEach(([key, value]) => {
                // Keep original key
                normalizedCredentials[key] = value;
                // Also add uppercase version if it's a credential key
                if (requiredCredentials.some(cred => cred != null && (cred === key || key.toLowerCase() === String(cred).toLowerCase()))) {
                    const upperKey = key.toUpperCase();
                    if (!normalizedCredentials[upperKey]) {
                        normalizedCredentials[upperKey] = value;
                    }
                }
            });
            
            // Build config with requirement values, credentials, and requirements metadata for AI auto-fill
            const config = {
                ...requirementValues,
                ...normalizedCredentials, // Include collected credentials with normalized keys
                ollamaBaseUrl: ENDPOINTS.itemBackend,
                // Pass requirements metadata so backend can intelligently fill fields
                requirements: refinement?.requirements || {},
                requirementsMode: 'manual', // Always manual - user provides credentials directly
                // Include all requirement values (with null safety)
                urls: (refinement?.requirements && !Array.isArray(refinement.requirements) && refinement.requirements.urls) ? refinement.requirements.urls : [],
                apis: (refinement?.requirements && !Array.isArray(refinement.requirements) && refinement.requirements.apis) ? refinement.requirements.apis : [],
                credentials: (refinement?.requirements && !Array.isArray(refinement.requirements) && refinement.requirements.credentials) ? refinement.requirements.credentials : [],
                schedules: (refinement?.requirements && !Array.isArray(refinement.requirements) && refinement.requirements.schedules) ? refinement.requirements.schedules : [],
                platforms: (refinement?.requirements && !Array.isArray(refinement.requirements) && refinement.requirements.platforms) ? refinement.requirements.platforms : [],
            };

            // Get DB session token
            const { data: { session } } = await awsClient.auth.getSession();
            
            // ? CRITICAL: Determine the prompt to use - prioritize explicit prompt, then refinement, then state prompt
            // explicitPrompt is passed directly from handleProceedWithSelectedPrompt to avoid async state issues
            const finalPrompt = explicitPrompt || refinement?.refinedPrompt || prompt;
            
            console.log('[Frontend] handleBuild - Final prompt for workflow generation:', finalPrompt);
            console.log('[Frontend] Prompt source:', explicitPrompt ? 'explicitPrompt (selected variation - direct)' : refinement?.refinedPrompt ? 'refinement.refinedPrompt (selected variation)' : 'state.prompt (fallback)');
            console.log('[Frontend] Explicit prompt value:', explicitPrompt);
            console.log('[Frontend] State prompt value:', prompt);
            console.log('[Frontend] Refinement refinedPrompt value:', refinement?.refinedPrompt);
            
            // ? CRITICAL: Verify we're using the selected variation, not the original prompt
            if (!explicitPrompt && !refinement?.refinedPrompt) {
                console.warn('[Frontend] ?? WARNING: No explicit prompt or refinement.refinedPrompt - using state.prompt. Selected variation may not be set correctly.');
            }
            
            if (!finalPrompt || !finalPrompt.trim()) {
                throw new Error('Prompt is required. Please provide a workflow description.');
            }

            if (hasWorkflowPlan) {
                const chainForPlan = planNodeHints.filter((x) => typeof x === 'string' && x.trim().length > 0);
                if (chainForPlan.length === 0) {
                    throw new Error(
                        'Structured workflow plan has no proposed node chain. Regenerate the plan or fix the node list before building.'
                    );
                }
            }

            // When pendingWorkflowData exists, the AI already built the workflow.
            // Pass it as existingWorkflow so the backend merges field values instead
            // of regenerating from scratch (fixes credential continuation regression).
            const existingWorkflowForContinuation = pendingWorkflowData
                ? { nodes: pendingWorkflowData.nodes, edges: pendingWorkflowData.edges }
                : null;

            const createWorkflowBody = buildGenerateWorkflowCreateBody({
                finalPrompt,
                originalPrompt: originalPrompt || finalPrompt,
                config,
                planRegistryTags,
                planMandatoryNodeTypes,
                planNodeHints,
                selectedVariationMeta,
                capabilitySelectionsByStep,
                capabilityDefaultConfirmStepIds,
                existingWorkflow: existingWorkflowForContinuation,
            });

            // Use streaming mode to get real-time progress
            const response = await fetch(`${ENDPOINTS.itemBackend}/api/generate-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`,
                    'x-stream-progress': 'true',
                },
                body: JSON.stringify(createWorkflowBody),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                const parsedError = normalizeGenerateWorkflowUiError(
                    error,
                    'Failed to generate workflow'
                );
                throw Object.assign(new Error(buildGenerateWorkflowUiErrorMessage(parsedError)), {
                    pipelineError: parsedError,
                });
            }

            const responseContentType = (response.headers.get('content-type') || '').toLowerCase();
            const isNdjsonStream = responseContentType.includes('application/x-ndjson');
            const reader = isNdjsonStream ? response.body?.getReader() : null;
            const decoder = new TextDecoder();
            let buffer = '';
            let finalData: any = null;
            let workflowSaved = false; // Track if workflow has been saved

            // Production fallback: some proxies may collapse streaming responses into one JSON payload.
            // Handle that shape directly instead of waiting for NDJSON events.
            if (!isNdjsonStream) {
                console.warn('[Frontend] generate-workflow did not return NDJSON stream; falling back to JSON payload mode.', {
                    contentType: responseContentType,
                });
                finalData = await response.json();
                if (finalData?.workflow && !finalData?.nodes) {
                    finalData.nodes = finalData.workflow.nodes;
                    finalData.edges = finalData.workflow.edges;
                }
                stopFallbackProgress();
            }

            /** Opens field-ownership / credential wizard when backend returns ready or configuring_inputs with questions. */
            const applyUnifiedWizardFromGenerateUpdate = (update: any): boolean => {
                const n = update.nodes || update.workflow?.nodes;
                const e = update.edges || update.workflow?.edges;
                const phaseStr = String(update.phase || update.status || '');
                const unifiedReadiness = update.unifiedReadiness || null;
                const discoveredInputs = update.discoveredInputs || [];
                const discoveredCreds = update.discoveredCredentials || [];
                const comprehensiveQuestions = update.comprehensiveQuestions || [];
                const structuralBlueprint = update.structuralBlueprint || null;
                const blueprintOverview = String(structuralBlueprint?.overviewText || '').trim();
                const requiredCreds = discoveredCreds;
                const readinessBlocking = Array.isArray(unifiedReadiness?.blockingReasons)
                    ? unifiedReadiness.blockingReasons
                    : [];
                const needsUnifiedWizard =
                    ((discoveredInputs.length > 0 ||
                        comprehensiveQuestions.length > 0 ||
                        requiredCreds.length > 0 ||
                        readinessBlocking.length > 0 ||
                        (update.fieldOwnershipMap && typeof update.fieldOwnershipMap === 'object' && Object.keys(update.fieldOwnershipMap).length > 0)) &&
                    (n?.length > 0 || e?.length > 0));

                if (
                    !needsUnifiedWizard ||
                    (phaseStr !== 'ready' && phaseStr !== 'configuring_inputs')
                ) {
                    return false;
                }

                if (phaseStr === 'configuring_inputs') {
                    const errs = update.structuralDiagnostics?.errors || [];
                    if (errs.length) {
                        toast({
                            title: 'Structural setup required',
                            description: errs.slice(0, 4).join('; '),
                            variant: 'destructive',
                        });
                    }
                    setProgress(88);
                    setIsComplete(false);
                    setBuildingLogs((prev) => [
                        ...prev,
                        blueprintOverview ? `Blueprint: ${blueprintOverview}` : '',
                        'Complete required fields and credentials before opening the workflow.',
                    ].filter(Boolean));
                } else {
                    setProgress(100);
                    setIsComplete(true);
                    setBuildingLogs((prev) => [
                        ...prev,
                        'Workflow Generated Successfully!',
                        blueprintOverview ? `Blueprint: ${blueprintOverview}` : '',
                    ].filter(Boolean));
                }

                const workflowNodes = n || [];
                const workflowEdges = e || [];
                if (workflowNodes.length > 0 || workflowEdges.length > 0) {
                    const revalidated = revalidateWorkflowGraph(workflowNodes, workflowEdges, 10);
                    setPendingWorkflowData({
                        nodes: revalidated.nodes,
                        edges: revalidated.edges,
                        update,
                        discoveredInputs,
                        discoveredCredentials: discoveredCreds,
                        comprehensiveQuestions,
                        unifiedReadiness,
                        credentialStatuses: update.credentialStatuses,
                        credentialWizardView: update.credentialWizardView,
                        fieldOwnershipMap: update.fieldOwnershipMap || undefined,
                        fieldOwnershipPolicyMap: update.fieldOwnershipPolicyMap || undefined,
                    });

                    let combinedQuestions: any[] = [];
                    const nonOAuthDiscoveredCreds = Array.isArray(discoveredCreds)
                        ? discoveredCreds.filter((cred: any) => {
                            const isOAuth = cred.type === 'oauth';
                            const isGoogleOAuth =
                                (cred.provider?.toLowerCase() === 'google' && cred.type === 'oauth') ||
                                (cred.vaultKey?.toLowerCase() === 'google' && cred.type === 'oauth');
                            return !isOAuth && !isGoogleOAuth;
                        })
                        : [];
                    const discoveredCredByNodeId = new Map<string, any>();
                    nonOAuthDiscoveredCreds.forEach((cred: any) => {
                        const nodeIds = Array.isArray(cred.nodeIds) ? cred.nodeIds : [];
                        nodeIds.forEach((nid: string) => {
                            if (nid && !discoveredCredByNodeId.has(nid)) discoveredCredByNodeId.set(nid, cred);
                        });
                    });

                    if (
                        comprehensiveQuestions &&
                        Array.isArray(comprehensiveQuestions) &&
                        comprehensiveQuestions.length > 0
                    ) {
                        console.log(
                            `[Frontend] Using ${comprehensiveQuestions.length} comprehensive questions from backend`
                        );
                        const baseQuestions = comprehensiveQuestions.map((q: any) => {
                            const isCredentialQ = q.category === 'credential' || q.ownershipClass === 'credential';
                            const matchedCred = isCredentialQ ? discoveredCredByNodeId.get(q.nodeId) : undefined;
                            // Keep registry field names (e.g. webhookUrl) for unlock_/mode_/cred_ attach-inputs keys.
                            // Vault matching uses q.credential.vaultKey ? do not replace fieldName with vaultKey.
                            const fieldName = String(q.fieldName || '').trim() || 'credential';
                            const credMeta =
                                q.credential?.vaultKey
                                    ? q.credential
                                    : matchedCred
                                      ? {
                                            vaultKey: matchedCred.vaultKey || matchedCred.credentialId,
                                            credentialId:
                                                matchedCred.credentialId || matchedCred.vaultKey,
                                            ...matchedCred,
                                        }
                                      : q.credential;
                            return {
                                ...q,
                                questionType: isCredentialQ ? 'credential' : (q.category || 'input'),
                                id: q.id || `${q.nodeId}_${fieldName}`,
                                fieldName,
                                label: q.text || q.label || `${q.nodeLabel} - ${fieldName}`,
                                credential: isCredentialQ ? credMeta : q.credential,
                                isVaultCredential: isCredentialQ,
                            };
                        });
                        combinedQuestions = applyFieldOwnershipPoliciesToQuestions(
                            baseQuestions,
                            update.fieldOwnershipMap,
                            update.fieldOwnershipPolicyMap,
                        );

                        if (nonOAuthDiscoveredCreds.length > 0) {
                            nonOAuthDiscoveredCreds.forEach((cred: any, idx: number) => {
                                    combinedQuestions.push({
                                        questionType: 'credential',
                                        id: `cred_${cred.vaultKey || cred.credentialId || idx}`,
                                        nodeId: cred.nodeIds?.[0] || '',
                                        nodeType: cred.nodeTypes?.[0] || '',
                                        nodeLabel:
                                            cred.provider || cred.displayName || 'Credential',
                                        fieldName:
                                            cred.vaultKey || cred.credentialId || 'credential',
                                        label:
                                            cred.displayName ||
                                            cred.vaultKey
                                                ?.replace(/_/g, ' ')
                                                .replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
                                            'Credential',
                                        type: 'text',
                                        category: 'credential',
                                        required: cred.required !== false,
                                        askOrder: 0,
                                        placeholder: `Enter ${cred.displayName || cred.vaultKey || 'credential'}`,
                                        description: `Credential required for ${cred.provider || 'service'}`,
                                        credential: cred,
                                        isVaultCredential: true,
                                    });
                                });
                        }
                    } else {
                        console.log(
                            `[Frontend] Comprehensive questions not available, combining discoveredInputs + discoveredCredentials`
                        );
                        if (discoveredInputs && Array.isArray(discoveredInputs)) {
                            discoveredInputs.forEach((input: any) => {
                                combinedQuestions.push({
                                    ...input,
                                    questionType: 'input',
                                    id: input.id || `${input.nodeId}_${input.fieldName}`,
                                    isVaultCredential: false,
                                });
                            });
                        }
                        if (combinedQuestions.length === 0) {
                            combinedQuestions.push(...synthesizeFieldOwnershipQuestions(
                                workflowNodes,
                                update.fieldOwnershipMap,
                                update.fieldOwnershipPolicyMap,
                            ));
                        }
                        if (nonOAuthDiscoveredCreds.length > 0) {
                            nonOAuthDiscoveredCreds.forEach((cred: any, idx: number) => {
                                    combinedQuestions.push({
                                        questionType: 'credential',
                                        id: `cred_${cred.vaultKey || cred.credentialId || idx}`,
                                        nodeId: cred.nodeIds?.[0] || '',
                                        nodeType: cred.nodeTypes?.[0] || '',
                                        nodeLabel:
                                            cred.provider || cred.displayName || 'Credential',
                                        fieldName:
                                            cred.vaultKey || cred.credentialId || 'credential',
                                        label:
                                            cred.displayName ||
                                            cred.vaultKey
                                                ?.replace(/_/g, ' ')
                                                .replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
                                            'Credential',
                                        type: 'text',
                                        category: 'credential',
                                        required: cred.required !== false,
                                        askOrder: 0,
                                        placeholder: `Enter ${cred.displayName || cred.vaultKey || 'credential'}`,
                                        description: `Credential required for ${cred.provider || 'service'}`,
                                        credential: cred,
                                        isVaultCredential: true,
                                    });
                                });
                        }
                        combinedQuestions.sort((a, b) => {
                            const orderA = a.askOrder ?? 999;
                            const orderB = b.askOrder ?? 999;
                            if (orderA !== orderB) return orderA - orderB;
                            const categoryOrder: Record<string, number> = {
                                credential: 0,
                                resource: 1,
                                operation: 2,
                                configuration: 3,
                            };
                            const catA = categoryOrder[a.category] ?? 999;
                            const catB = categoryOrder[b.category] ?? 999;
                            return catA - catB;
                        });
                    }

                    // Deduplicate to prevent duplicate credential prompts from mixed sources.
                    const dedupe = new Map<string, any>();
                    combinedQuestions.forEach((q: any) => {
                        const isCredentialQ = q.questionType === 'credential' || q.category === 'credential' || q.isVaultCredential;
                        const key = isCredentialQ
                            ? `cred:${q.nodeId || 'global'}:${String(q.credential?.vaultKey || q.credential?.credentialId || q.fieldName || '').toLowerCase()}`
                            : `field:${q.nodeId || 'global'}:${String(q.fieldName || '').toLowerCase()}`;
                        const existing = dedupe.get(key);
                        if (!existing) {
                            dedupe.set(key, q);
                            return;
                        }
                        const scoreQuestion = (candidate: any): number => {
                            let score = 0;
                            if (candidate?.credential?.vaultKey) score += 100;
                            if (candidate?.type === 'select' || (Array.isArray(candidate?.options) && candidate.options.length > 0)) score += 10;
                            if (candidate?.type === 'textarea' || candidate?.type === 'number' || candidate?.type === 'password') score += 5;
                            if (typeof candidate?.description === 'string' && !candidate.description.startsWith('Input field ')) score += 2;
                            return score;
                        };
                        // Prefer richer schema-driven questions over generic ownership fallback rows.
                        const existingScore = scoreQuestion(existing);
                        const nextScore = scoreQuestion(q);
                        if (nextScore > existingScore) {
                            dedupe.set(key, q);
                        }
                    });
                    combinedQuestions = Array.from(dedupe.values());

                    console.log(
                        `[Frontend] Combined ${combinedQuestions.length} questions for step-by-step wizard`
                    );
                    if (combinedQuestions.length === 0) {
                        const diag = update?.diagnostics || {};
                        const runtimeOwnedCount = Array.isArray(diag.runtimeOwnedFields)
                            ? diag.runtimeOwnedFields.length
                            : 0;
                        const canonicalIssueCount = Array.isArray(diag.canonicalizationIssues)
                            ? diag.canonicalizationIssues.length
                            : 0;
                        if (runtimeOwnedCount > 0 || canonicalIssueCount > 0) {
                            toast({
                                title: 'No manual questions required',
                                description: `Runtime-owned fields: ${runtimeOwnedCount}. Canonicalization issues: ${canonicalIssueCount}.`,
                            });
                        } else if (readinessBlocking.length > 0) {
                            toast({
                                title: 'Workflow requires setup',
                                description: readinessBlocking.map((b: any) => b?.message || b?.code).join('; '),
                                variant: 'destructive',
                            });
                        }
                        markAttachInputsPayloadPersisted(savedWorkflow.id, combinedInputs);
                    } else {
                        console.log('[Wizard] Skipping duplicate or empty attach-inputs payload');
                    }
                    setAllQuestions(combinedQuestions);
                    setCurrentQuestionIndex(0);
                    setCredentialQuestionIndex(0);
                }

                setRequiredCredentials(
                    requiredCreds.map((c: any) => c.vaultKey || c.credentialId)
                );
                setShowCredentialStep(true);
                setStep('field-ownership');
                setBuildingLogs((prev) =>
                    [
                        ...prev,
                        discoveredInputs.length > 0
                            ? `?? ${discoveredInputs.length} input(s) required`
                            : '',
                        requiredCreds.length > 0
                            ? `?? ${requiredCreds.length} credential(s) required`
                            : '',
                    ].filter(Boolean)
                );
                return true;
            };

            // Start fallback progress if streaming doesn't provide updates
            startFallbackProgress();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.trim()) continue;

                        let update: any;
                        try {
                            update = JSON.parse(line);
                        } catch {
                            console.warn('Failed to parse progress update:', line);
                            continue;
                        }

                        console.log('Received update:', update);

                        if (typeof update.progress_percentage === 'number') {
                            const next = Math.min(100, Math.max(0, Number(update.progress_percentage)));
                            setProgress(prev => deriveMonotonicProgress(prev, next));
                        }

                        if (update.status === 'error') {
                            const streamError = normalizeGenerateWorkflowUiError(
                                update,
                                'Workflow generation failed'
                            );
                            throw Object.assign(new Error(buildGenerateWorkflowUiErrorMessage(streamError)), {
                                pipelineError: streamError,
                            });
                        }

                            // Log structure for debugging
                            if (update.success || update.workflow) {
                                console.log('Completion detected - Structure:', {
                                    hasDirectNodes: !!update.nodes,
                                    hasDirectEdges: !!update.edges,
                                    hasWorkflowNodes: !!update.workflow?.nodes,
                                    hasWorkflowEdges: !!update.workflow?.edges,
                                    success: update.success,
                                    status: update.status
                                });
                            }

                            // ? REMOVED: Configuration phase handling in streaming
                            // Backend no longer returns phase === 'configuration' before generation completes

                            // Handle progress updates
                            if (update.current_phase) {
                                // Stop fallback progress when we get real updates
                                stopFallbackProgress();

                                setCurrentPhase(update.current_phase);

                                // Use backend progress_percentage if available, otherwise calculate from phase
                                let actualProgress = 0;
                                if (update.progress_percentage !== undefined) {
                                    actualProgress = Math.min(99, Math.max(0, update.progress_percentage));
                                } else {
                                    actualProgress = Math.min(99, mapBackendPhaseToProgress(update.current_phase));
                                }

                                setProgress(prev => deriveMonotonicProgress(prev, actualProgress));

                                const phaseDesc = update.log ?? getPhaseDescription(update.current_phase);
                                setBuildingLogs(prev => {
                                    if (prev.includes(phaseDesc)) return prev;
                                    return [...prev, phaseDesc];
                                });

                                // ? FIX: Surface credential discovery immediately when the backend
                                // reports it ? don't wait for the full pipeline to finish.
                                if (update.current_phase === 'credential_discovery' && Array.isArray(update.discoveredCredentials) && update.discoveredCredentials.length > 0) {
                                    const missing = update.discoveredCredentials.filter((c: any) => !c.satisfied);
                                    const satisfied = update.discoveredCredentials.filter((c: any) => c.satisfied);
                                    setBuildingLogs(prev => {
                                        const credLines: string[] = [];
                                        if (satisfied.length > 0) credLines.push(`? ${satisfied.length} credential(s) connected`);
                                        if (missing.length > 0) credLines.push(`?? ${missing.length} credential(s) required: ${missing.map((c: any) => c.displayName || c.vaultKey).join(', ')}`);
                                        const newLines = credLines.filter(l => !prev.includes(l));
                                        return newLines.length > 0 ? [...prev, ...newLines] : prev;
                                    });
                                }
                            }

                            // ? REMOVED: Configuration phase handling in streaming
                            // Backend no longer returns phase === 'configuration' before generation completes

                            // Handle completion - check multiple possible completion indicators
                            // Support both direct structure (update.nodes) and nested structure (update.workflow.nodes)
                            const nodes = update.nodes || update.workflow?.nodes;
                            const edges = update.edges || update.workflow?.edges;
                            const hasNodes = nodes && Array.isArray(nodes) && nodes.length > 0;
                            const hasEdges = edges && Array.isArray(edges);
                            /** Terminal payload from stream: generation finished (ready OR configuring_inputs / structural gate). */
                            const isStreamTerminal =
                                hasNodes &&
                                (update.status === 'completed' ||
                                    update.status === 'success');

                            if (isStreamTerminal) {
                                // Stop fallback progress
                                stopFallbackProgress();

                                // Store the full update, but extract nodes/edges for processing
                                finalData = update;
                                // Ensure nodes/edges are at top level for consistency
                                if (update.workflow && !update.nodes) {
                                    finalData.nodes = update.workflow.nodes;
                                    finalData.edges = update.workflow.edges;
                                }

                                // ? CHECK FOR CONFIRMATION REQUIREMENT
                                if (update.waitingForConfirmation && update.workflowId) {
                                    console.log('[AutonomousAgentWizard] Workflow requires confirmation');
                                    setConfirmationData({
                                        workflowId: update.workflowId,
                                        workflowExplanation: update.workflowExplanation || update.confirmationRequest?.workflowExplanation,
                                        structuralPrompt: update.structuralPrompt || update.pipelineContext?.structuralPrompt || undefined,
                                        summaryV2: (update.summaryV2 || update.confirmationRequest?.summaryV2 || null) as SummaryV2,
                                        confidenceScore: update.pipelineContext?.confidence_score || update.confirmationRequest?.confidenceScore,
                                        workflow: {
                                            nodes: nodes || update.workflow?.nodes || [],
                                            edges: edges || update.workflow?.edges || [],
                                        },
                                    });
                                    setStep('workflow-confirmation');
                                    return;
                                }

                                const contractReady = isPipelineContractReady(update);

                                // ? KEY FIX: Save workflow to DB before showing field-ownership wizard.
                                // This ensures generatedWorkflowId is set so "Continue Workflow" reuses
                                // the existing record instead of inserting a new one from scratch.
                                if (!workflowSaved && (update.nodes || update.workflow?.nodes)) {
                                    try {
                                        const wNodes = update.nodes || update.workflow?.nodes || [];
                                        const wEdges = update.edges || update.workflow?.edges || [];
                                        if (wNodes.length > 0) {
                                            const { data: { user: wUser } } = await awsClient.auth.getUser();
                                            const preSaveGraph = revalidateWorkflowGraph(wNodes, wEdges, 10);
                                            const { data: preSaved, error: preSaveErr } = await awsClient
                                                .from('workflows')
                                                .insert(markWorkflowDataAsPendingSetup({
                                                    name: (analysis?.summary && typeof analysis.summary === 'string')
                                                        ? analysis.summary.substring(0, 50)
                                                        : 'AI Generated Workflow',
                                                    nodes: preSaveGraph.nodes,
                                                    edges: preSaveGraph.edges,
                                                    user_id: wUser?.id,
                                                    updated_at: new Date().toISOString(),
                                                }) as any)
                                                .select()
                                                .single();
                                            if (!preSaveErr && preSaved?.id) {
                                                setGeneratedWorkflowId(preSaved.id);
                                                workflowSaved = true;
                                                console.log('? Pre-saved workflow before field-ownership wizard:', preSaved.id);
                                            }
                                        }
                                    } catch (preSaveError: any) {
                                        console.warn('[PreSave] Non-blocking pre-save failed:', preSaveError?.message);
                                    }
                                }

                                if (applyUnifiedWizardFromGenerateUpdate(update)) {
                                    return;
                                }

                                if (!contractReady) {
                                    const errs = update.structuralDiagnostics?.errors || [];
                                    toast({
                                        title: 'Workflow incomplete',
                                        description:
                                            errs[0] ||
                                            'Structural validation did not pass. Edit the plan or retry generation.',
                                        variant: 'destructive',
                                    });
                                    setProgress(88);
                                    setIsComplete(false);
                                    setStep('building');
                                    return;
                                }

                                // contractReady (phase ready, success) and no unified wizard questions ? save
                                setProgress(100);
                                setIsComplete(true);
                                setBuildingLogs((prev) => [...prev, 'Workflow Generated Successfully!']);

                                // No credentials needed - save workflow immediately
                                try {
                                    const { data: { user } } = await awsClient.auth.getUser();
                                    const workflowNodes = nodes || [];
                                    const workflowEdges = edges || [];
                                    
                                    // No credentials to inject (none required)
                                    const nodesWithCredentials = workflowNodes;
                                    
                                    const normalized = revalidateWorkflowGraph(nodesWithCredentials, workflowEdges, 10);
                                    
                                    // ? CRITICAL: Check if workflow is already ready before setting blueprint
                                    const currentState = stateManager.getCurrentState();
                                    const isAlreadyReady = currentState === WorkflowGenerationState.STATE_7_WORKFLOW_READY;
                                    
                                    if (!isAlreadyReady) {
                                    // Fix state transitions: Ensure we're in the correct state before setting blueprint
                                    ensureStateForBlueprint(
                                        stateManager, 
                                        refinement?.refinedPrompt || refinement?.systemPrompt || prompt,
                                        requiredCredentials
                                    );
                                    
                                    // Execution Flow Architecture (STEP-2): Set workflow blueprint
                                    stateManager.setWorkflowBlueprint({ nodes: normalized.nodes, edges: normalized.edges });
                                    } else {
                                        // Workflow is already ready - skip blueprint setting
                                        console.log('[StateManager] Workflow already ready - skipping blueprint setting');
                                    }
                                    
                                    // Execution Flow Architecture (STEP-2): Check for validation errors
                                    // If validation fixes were applied, we might have had errors
                                    const hadErrors = JSON.stringify(normalized.nodes) !== JSON.stringify(workflowNodes) ||
                                                     JSON.stringify(normalized.edges) !== JSON.stringify(workflowEdges);
                                    
                                    if (hadErrors) {
                                        // Add validation error but continue (auto-fix was applied)
                                        stateManager.addValidationError({
                                            type: 'auto_fixed',
                                            message: 'Workflow had issues that were automatically fixed',
                                        });
                                    }

                                    const canonicalPromptStream =
                                        (originalPrompt && originalPrompt.trim()) ||
                                        (typeof prompt === 'string' && prompt.trim()) ||
                                        '';
                                    const workflowMetaStream: Record<string, unknown> = {};
                                    if (canonicalPromptStream) {
                                        workflowMetaStream.originalUserPrompt = canonicalPromptStream;
                                    }
                                    if (update.buildAiUsage && typeof update.buildAiUsage === 'object') {
                                        workflowMetaStream.buildAiUsage = update.buildAiUsage;
                                    }
                                    const workflowData: Record<string, unknown> = {
                                        name: (analysis?.summary && typeof analysis.summary === 'string') 
                                            ? analysis.summary.substring(0, 50) 
                                            : 'AI Generated Workflow',
                                        nodes: normalized.nodes,
                                        edges: normalized.edges,
                                        user_id: user?.id,
                                        updated_at: new Date().toISOString(),
                                    };
                                    if (Object.keys(workflowMetaStream).length > 0) {
                                        workflowData.metadata = workflowMetaStream;
                                        workflowData.graph = {
                                            nodes: normalized.nodes,
                                            edges: normalized.edges,
                                            metadata: { ...workflowMetaStream },
                                        };
                                    }

                                    const { data: savedWorkflow, error: saveError } = await awsClient
                                        .from('workflows')
                                        .insert(markWorkflowDataAsPendingSetup(workflowData) as any)
                                        .select()
                                        .single();

                                    if (saveError) {
                                        console.error('Error saving workflow in streaming:', saveError);
                                        throw saveError;
                                    }

                                    if (savedWorkflow?.id) {
                                        // Execution Flow Architecture (STEP-2): Mark workflow as ready
                                        const readyResult = stateManager.markWorkflowReady();
                                        if (!readyResult.success) {
                                            console.warn('[StateManager] Warning:', readyResult.error);
                                            // Still proceed but log the warning
                                        }
                                        
                                        setGeneratedWorkflowId(savedWorkflow.id);
                                        setNodes(normalized.nodes as any[]);
                                        setEdges(normalized.edges as any[]);
                                        workflowSaved = true;
                                        console.log('Workflow saved successfully with ID:', savedWorkflow.id);
                                        
                                        // ? ENHANCED: Check for missing items before redirecting
                                        try {
                                            const { data: { session: currentSession } } = await awsClient.auth.getSession();
                                            const missingItemsResponse = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/${savedWorkflow.id}/missing-items`, {
                                                headers: {
                                                    'Authorization': `Bearer ${currentSession?.access_token || ''}`,
                                                },
                                            });
                                            
                                            if (missingItemsResponse.ok) {
                                                const missingItemsData = await missingItemsResponse.json();
                                                const hasMissingCredentials = missingItemsData.credentials && 
                                                    missingItemsData.credentials.filter((c: any) => !c.satisfied).length > 0;
                                                const hasMissingInputs = missingItemsData.inputs && missingItemsData.inputs.length > 0;
                                                
                                                if (hasMissingCredentials || hasMissingInputs) {
                                                    console.log(`[Configure] Found missing items - ${missingItemsData.credentials?.filter((c: any) => !c.satisfied).length || 0} credential(s), ${missingItemsData.inputs?.length || 0} input(s)`);
                                                    setMissingItems(missingItemsData);
                                                    setStep('configure');
                                                    toast({
                                                        title: 'Configuration Required',
                                                        description: 'Please provide missing credentials and inputs to complete workflow setup.',
                                                    });
                                                    return; // Don't redirect, show configure step
                                                }
                                            }
                                        } catch (missingItemsError: any) {
                                            console.warn('[Configure] Failed to fetch missing items (non-blocking):', missingItemsError.message);
                                            // Continue to redirect even if missing items check fails
                                        }
                                        
                                        // No missing items - redirect directly to the workflow page
                                        toast({
                                            title: 'Workflow Created',
                                            description: 'Your workflow has been created successfully!',
                                        });
                                        await commitSetupWorkflow(savedWorkflow.id);
                                        navigate(`/workflow/${savedWorkflow.id}`, { replace: true });
                                    } else {
                                        console.error('Workflow saved but no ID returned');
                                        throw new Error('Failed to get workflow ID after save');
                                    }
                                } catch (saveErr: any) {
                                    console.error('Error saving workflow in streaming completion:', saveErr);
                                    toast({
                                        title: 'Warning',
                                        description: 'Workflow generated but failed to save. Error: ' + (saveErr.message || 'Unknown error'),
                                        variant: 'destructive',
                                    });
                                    // Don't return early if save failed - let it try again in the fallback section
                                    // But still show completion
                                }

                                // Redirect to workflow instead of showing completion/executing
                                // If workflow wasn't saved, show completion
                                if (!workflowSaved) {
                                    setStep('complete');
                                }
                                return;
                            }
                    }
                }

                // Process trailing chunk if stream ended without a final newline.
                if (!finalData && buffer.trim()) {
                    try {
                        const trailingUpdate = JSON.parse(buffer.trim());
                        if (trailingUpdate?.workflow && !trailingUpdate?.nodes) {
                            trailingUpdate.nodes = trailingUpdate.workflow.nodes;
                            trailingUpdate.edges = trailingUpdate.workflow.edges;
                        }
                        finalData = trailingUpdate;
                    } catch {
                        console.warn('[Frontend] Unable to parse trailing generate-workflow stream chunk');
                    }
                }
            }

            // If we didn't get completion via stream, check if we have final data
            // (Backend might send final workflow data without explicit completion status)
            if (!finalData) {
                // Fallback: non-streaming create must use the same body as streaming (plan-driven fields included)
                const generateResponse = await fetch(`${ENDPOINTS.itemBackend}/api/generate-workflow`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || ''}`,
                    },
                    body: JSON.stringify(createWorkflowBody),
                });

                if (!generateResponse.ok) {
                    const error = await generateResponse.json().catch(() => ({ error: 'Failed to generate workflow' }));
                    throw new Error(error.error || error.message || 'Failed to generate workflow');
                }

                finalData = await generateResponse.json();

                if (finalData.workflow && !finalData.nodes) {
                    finalData.nodes = finalData.workflow.nodes;
                    finalData.edges = finalData.workflow.edges;
                }

                stopFallbackProgress();

                // ? KEY FIX: Save workflow to DB before showing field-ownership wizard (non-streaming path).
                if (!workflowSaved && (finalData.nodes || finalData.workflow?.nodes)) {
                    try {
                        const wNodes = finalData.nodes || finalData.workflow?.nodes || [];
                        const wEdges = finalData.edges || finalData.workflow?.edges || [];
                        if (wNodes.length > 0) {
                            const { data: { user: wUser } } = await awsClient.auth.getUser();
                            const preSaveGraph = revalidateWorkflowGraph(wNodes, wEdges, 10);
                            const { data: preSaved, error: preSaveErr } = await awsClient
                                .from('workflows')
                                .insert(markWorkflowDataAsPendingSetup({
                                    name: (analysis?.summary && typeof analysis.summary === 'string')
                                        ? analysis.summary.substring(0, 50)
                                        : 'AI Generated Workflow',
                                    nodes: preSaveGraph.nodes,
                                    edges: preSaveGraph.edges,
                                    user_id: wUser?.id,
                                    updated_at: new Date().toISOString(),
                                }) as any)
                                .select()
                                .single();
                            if (!preSaveErr && preSaved?.id) {
                                setGeneratedWorkflowId(preSaved.id);
                                workflowSaved = true;
                                console.log('? Pre-saved workflow (non-streaming) before field-ownership wizard:', preSaved.id);
                            }
                        }
                    } catch (preSaveError: any) {
                        console.warn('[PreSave] Non-blocking pre-save failed (non-streaming):', preSaveError?.message);
                    }
                }

                if (applyUnifiedWizardFromGenerateUpdate(finalData)) {
                    return;
                }

                if (!isPipelineContractReady(finalData)) {
                    const errs = finalData.structuralDiagnostics?.errors || [];
                    toast({
                        title: 'Workflow incomplete',
                        description:
                            errs[0] ||
                            'Structural validation did not pass. Edit the plan or retry generation.',
                        variant: 'destructive',
                    });
                    setProgress(88);
                    setIsComplete(false);
                    setStep('building');
                    return;
                }

                setProgress(100);
                setIsComplete(true);
                setBuildingLogs((prev) => [...prev, 'Workflow Generated Successfully!']);
            }

            // Save workflow to database (if not already saved in streaming completion)
            // Support both direct structure (finalData.nodes) and nested structure (finalData.workflow.nodes)
            const workflowNodes = finalData?.nodes || finalData?.workflow?.nodes;
            const workflowEdges = finalData?.edges || finalData?.workflow?.edges;
            
            if (
                finalData &&
                workflowNodes &&
                workflowEdges &&
                !workflowSaved &&
                isPipelineContractReady(finalData)
            ) {
                try {
                    const { data: { user } } = await awsClient.auth.getUser();
                    const normalized = revalidateWorkflowGraph(workflowNodes, workflowEdges, 10);

                    const metaFallback: Record<string, unknown> = {};
                    const pfb = (originalPrompt && originalPrompt.trim()) || (typeof prompt === 'string' && prompt.trim()) || '';
                    if (pfb) metaFallback.originalUserPrompt = pfb;
                    if (finalData?.buildAiUsage && typeof finalData.buildAiUsage === 'object') {
                        metaFallback.buildAiUsage = finalData.buildAiUsage;
                    }
                    const workflowData: Record<string, unknown> = {
                        name: (analysis?.summary && typeof analysis.summary === 'string') 
                            ? analysis.summary.substring(0, 50) 
                            : 'AI Generated Workflow',
                        nodes: normalized.nodes,
                        edges: normalized.edges,
                        user_id: user?.id,
                        updated_at: new Date().toISOString(),
                    };
                    if (Object.keys(metaFallback).length > 0) {
                        workflowData.metadata = metaFallback;
                        workflowData.graph = { nodes: normalized.nodes, edges: normalized.edges, metadata: { ...metaFallback } };
                    }

                    const { data: savedWorkflow, error: saveError } = await awsClient
                        .from('workflows')
                        .insert(markWorkflowDataAsPendingSetup(workflowData) as any)
                        .select()
                        .single();

                    if (saveError) {
                        console.error('Error saving workflow:', saveError);
                        throw saveError;
                    }

                                    if (savedWorkflow?.id) {
                                        setGeneratedWorkflowId(savedWorkflow.id);
                                        setNodes(normalized.nodes as any[]);
                                        setEdges(normalized.edges as any[]);
                                        workflowSaved = true;
                                        console.log('Workflow saved successfully in fallback with ID:', savedWorkflow.id);
                                    } else {
                                        console.error('Workflow saved but no ID returned');
                                        throw new Error('Failed to get workflow ID after save');
                                    }
                } catch (saveErr: any) {
                    console.error('Error in workflow save:', saveErr);
                    toast({
                        title: 'Warning',
                        description: 'Workflow generated but failed to save. Error: ' + (saveErr.message || 'Unknown error'),
                        variant: 'destructive',
                    });
                }
            } else if (!workflowSaved && !generatedWorkflowId) {
                // If we have finalData but no nodes/edges, log it for debugging
                console.warn('Workflow completed but missing nodes/edges:', finalData);
                console.warn('Available keys:', Object.keys(finalData || {}));
                if (finalData?.workflow) {
                    console.warn('Workflow object keys:', Object.keys(finalData.workflow));
                }
                toast({
                    title: 'Warning',
                    description: 'Workflow generation completed but data structure is incomplete. Check console for details.',
                    variant: 'destructive',
                });
            }

            // Stop fallback progress; only mark 100% when contract is satisfied or workflow already saved
            stopFallbackProgress();
            if (workflowSaved) {
                setProgress(100);
                setIsComplete(true);
            } else if (finalData && isPipelineContractReady(finalData)) {
                setProgress(100);
                setIsComplete(true);
            } else if (finalData) {
                setProgress(88);
                setIsComplete(false);
            }
            
            // Only set to complete if we have a saved workflow, otherwise stay in building
            if (workflowSaved && generatedWorkflowId) {
                setStep('complete');
            } else if (finalData && (finalData.nodes || finalData.workflow?.nodes)) {
                // We have workflow data, try to save it one more time
                const retryWorkflowNodes = finalData.nodes || finalData.workflow?.nodes;
                const retryWorkflowEdges = finalData.edges || finalData.workflow?.edges;
                
                if (
                    retryWorkflowNodes &&
                    retryWorkflowEdges &&
                    !workflowSaved &&
                    isPipelineContractReady(finalData)
                ) {
                    try {
                        const { data: { user } } = await awsClient.auth.getUser();
                        const normalized = revalidateWorkflowGraph(retryWorkflowNodes, retryWorkflowEdges, 10);

                        const metaRetry: Record<string, unknown> = {};
                        const pr = (originalPrompt && originalPrompt.trim()) || (typeof prompt === 'string' && prompt.trim()) || '';
                        if (pr) metaRetry.originalUserPrompt = pr;
                        if (finalData?.buildAiUsage && typeof finalData.buildAiUsage === 'object') {
                            metaRetry.buildAiUsage = finalData.buildAiUsage;
                        }
                        const workflowData: Record<string, unknown> = {
                            name: (analysis?.summary && typeof analysis.summary === 'string') 
                                ? analysis.summary.substring(0, 50) 
                                : 'AI Generated Workflow',
                            nodes: normalized.nodes,
                            edges: normalized.edges,
                            user_id: user?.id,
                            updated_at: new Date().toISOString(),
                        };
                        if (Object.keys(metaRetry).length > 0) {
                            workflowData.metadata = metaRetry;
                            workflowData.graph = { nodes: normalized.nodes, edges: normalized.edges, metadata: { ...metaRetry } };
                        }

                        const { data: savedWorkflow, error: saveError } = await awsClient
                            .from('workflows')
                            .insert(markWorkflowDataAsPendingSetup(workflowData) as any)
                            .select()
                            .single();

                        if (!saveError && savedWorkflow?.id) {
                            setGeneratedWorkflowId(savedWorkflow.id);
                            setNodes(normalized.nodes);
                            setEdges(normalized.edges);
                            setStep('complete');
                        } else {
                            console.error('Final save attempt failed:', saveError);
                            setStep('complete'); // Still show completion even if save failed
                        }
                    } catch (finalSaveErr) {
                        console.error('Final save error:', finalSaveErr);
                        setStep('complete'); // Still show completion
                    }
                } else {
                    setStep('complete');
                }
            } else {
                // No workflow data, something went wrong
                console.error('No workflow data available for completion');
                setStep('complete'); // Still show completion screen
            }

        } catch (err: any) {
            // Clean up fallback progress on error
            stopFallbackProgress();

            console.error(err);
            const parsedPipelineError = normalizeGenerateWorkflowUiError(
                err?.pipelineError || err,
                err?.message || 'Failed to generate workflow. Please try again.'
            );
            const uiErrorMessage = buildGenerateWorkflowUiErrorMessage(parsedPipelineError);
            let errorToastShown = false;
            
            // Execution Flow Architecture (STEP-2): Handle error with retry logic
            const currentState = stateManager.getCurrentState();
            if (currentState === WorkflowGenerationState.STATE_5_WORKFLOW_BUILDING || 
                currentState === WorkflowGenerationState.STATE_6_WORKFLOW_VALIDATION) {
                // Try to retry if we haven't exceeded retry count
                // ? FIXED: retryBuilding() no longer performs state transition
                const retryResult = stateManager.retryBuilding();
                if (retryResult.success) {
                    toast({ 
                        title: 'Retrying...', 
                        description: `Attempt ${stateManager.getExecutionState().retry_count}/3`,
                    });
                    // Could trigger rebuild here if needed
                    // State remains in STATE_5_WORKFLOW_BUILDING
                } else {
                    // Max retries reached or invalid state - transition to ERROR
                    if (retryResult.shouldTransitionToError) {
                        // Transition to ERROR state (allowed: STATE_5 ? STATE_ERROR_HANDLING)
                        stateManager.transitionToError(uiErrorMessage || 'Build failed after retries');
                    } else {
                        // Invalid state for retry - use handleError
                        stateManager.handleError(uiErrorMessage || 'Build failed after retries');
                    }
                    toast({ 
                        title: 'Build Failed', 
                        description: retryResult.error || uiErrorMessage || 'Maximum retries reached',
                        variant: 'destructive' 
                    });
                    errorToastShown = true;
                }
            } else {
                stateManager.handleError(uiErrorMessage || 'Build failed');
            }
            
            // Don't go back to confirmation if we're already past that step
            // Instead, show error but stay on current step or go to a safe state
            if (!errorToastShown && (step === 'building' || step === 'credentials')) {
                toast({ 
                    title: 'Build Failed', 
                    description: uiErrorMessage || 'Failed to generate workflow. Please try again.', 
                    variant: 'destructive' 
                });
                setStep(hasWorkflowPlan ? 'questioning' : 'confirmation');
            } else if (!errorToastShown) {
                toast({ 
                    title: 'Error', 
                    description: uiErrorMessage || 'An error occurred. Please try again.', 
                    variant: 'destructive' 
                });
                setStep(hasWorkflowPlan ? 'questioning' : 'confirmation');
            } else {
                setStep(hasWorkflowPlan ? 'questioning' : 'confirmation');
            }
        }
    };

    /** Per-node bulk fill mode (secrets section): same rules as Convert All, scoped to one node. */
    const applyOwnershipForNode = (nodeId: string, mode: 'manual_static' | 'runtime_ai') => {
        const updates: Record<string, string> = {};
        ownershipQuestions.forEach((q: any) => {
            if (String(q.nodeId || '') !== String(nodeId)) return;
            const rowLocked =
                q.ownershipUiMode === 'locked' && !(q.isUnlockableCredential && isCredentialUnlocked(q));
            if (rowLocked) return;
            if (mode === 'runtime_ai') {
                const target = wizardBulkAIModeForQuestion(q.supportsRuntimeAI, q.supportsBuildtimeAI);
                updates[`mode_${q.nodeId}_${q.fieldName}`] = target;
            } else {
                updates[`mode_${q.nodeId}_${q.fieldName}`] = mode;
            }
        });
        setFillModeValues((prev) => ({ ...prev, ...updates }));
    };

    const readBackendErrorMessage = useCallback(async (response: Response, fallback: string) => {
        let message = fallback;
        try {
            const data = await response.json();
            if (typeof data?.error === 'string' && data.error.trim()) {
                message = data.error.trim();
            } else if (typeof data?.message === 'string' && data.message.trim()) {
                message = data.message.trim();
            }
        } catch {
            // Keep fallback when body is not JSON.
        }
        return message;
    }, []);

    const fetchNodeDescription = useCallback(
        async (descKey: string, nodeType: string, nodeLabel: string, nodeId: string) => {
            // Toggle close if already open
            if (nodeDescriptions[descKey]?.open) {
                setNodeDescriptions((prev) => ({ ...prev, [descKey]: { ...prev[descKey], open: false } }));
                return;
            }
            // Show cached text without a second API call
            if (nodeDescriptions[descKey]?.text) {
                setNodeDescriptions((prev) => ({ ...prev, [descKey]: { ...prev[descKey], open: true } }));
                return;
            }
            setNodeDescriptions((prev) => ({ ...prev, [descKey]: { loading: true, text: null, open: false } }));
            try {
                const session = (await awsClient.auth.getSession()).data.session;
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

                const blueprint = (pendingWorkflowData as any)?.update?.structuralBlueprint;
                const nodeNarrative = (blueprint?.nodeNarratives as any[] | undefined)
                    ?.find((n: any) => n.nodeId === nodeId)?.text;
                const workflowOverview = blueprint?.overviewText;

                const response = await fetch(`${ENDPOINTS.itemBackend}/api/ai/node-description`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ nodeType, nodeLabel, nodeNarrative, workflowOverview, userPrompt: prompt }),
                });
                if (!response.ok) {
                    throw new Error(await readBackendErrorMessage(response, 'Could not load node description.'));
                }
                const data = await response.json();
                if (data?.success === false) {
                    throw new Error(data?.error || 'Could not load node description.');
                }
                setNodeDescriptions((prev) => ({
                    ...prev,
                    [descKey]: { loading: false, text: data.description || 'No description available.', open: true },
                }));
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Could not load description. Please try again.';
                setNodeDescriptions((prev) => ({
                    ...prev,
                    [descKey]: { loading: false, text: message, open: true },
                }));
            }
        },
        [nodeDescriptions, pendingWorkflowData, prompt, readBackendErrorMessage]
    );

    const fetchFieldDescriptions = useCallback(
        async (nodeId: string, nodeType: string, nodeLabel: string, fields: any[], requestKey?: string) => {
            const requiredFieldNames = fields
                .map((field: any) => String(field.fieldName || '').trim())
                .filter(Boolean);
            const existingNodeDescriptions = fieldDescriptions[nodeId];
            const hasAllRequestedFields = requiredFieldNames.every((fieldName) =>
                Boolean(existingNodeDescriptions?.data?.[fieldName])
            );
            if (existingNodeDescriptions?.loading || hasAllRequestedFields) return;
            setFieldDescriptions((prev) => ({
                ...prev,
                [nodeId]: { loading: true, data: prev[nodeId]?.data || null },
            }));
            try {
                const session = (await awsClient.auth.getSession()).data.session;
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

                const blueprint = (pendingWorkflowData as any)?.update?.structuralBlueprint;
                const nodeNarrative = (blueprint?.nodeNarratives as any[] | undefined)
                    ?.find((n: any) => n.nodeId === nodeId)?.text;
                const workflowOverview = blueprint?.overviewText;

                const fieldPayload = fields.map((q: any) => ({
                    fieldName: String(q.fieldName || ''),
                    label: String(q.text || q.label || q.fieldName || ''),
                    fieldType: String(q.type || 'string'),
                    description: String(
                        findFieldDocForQuestion(q)?.description ||
                        q.helpText ||
                        q.description ||
                        ''
                    ),
                    options: Array.isArray(q.options)
                        ? q.options.map((option: any) => (
                            typeof option === 'string'
                                ? { label: option, value: option }
                                : { label: String(option?.label ?? option?.value ?? ''), value: String(option?.value ?? option?.label ?? '') }
                        )).filter((option: any) => option.value)
                        : [],
                    example: String(
                        q.exampleValue ||
                        q.example ||
                        findFieldDocForQuestion(q)?.example ||
                        ''
                    ),
                    required: q.required !== false,
                    selectedMode: String(q.selectedMode || ''),
                    fieldEnabled: q.fieldEnabled === true,
                    supportsRuntimeAI: q.supportsRuntimeAI !== false,
                    supportsBuildtimeAI: q.supportsBuildtimeAI !== false,
                    fillModeDefault: String(q.fillModeDefault || 'manual_static'),
                    ownership: String(q.ownershipClass || ''),
                    currentValue: q.currentValue ?? q.defaultValue ?? null,
                    operation: String(q.operation || q.operationValue || ''),
                }));

                const response = await fetch(`${ENDPOINTS.itemBackend}/api/ai/field-descriptions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ nodeType, nodeLabel, nodeNarrative, workflowOverview, userPrompt: prompt, fields: fieldPayload }),
                });
                if (!response.ok) {
                    throw new Error(await readBackendErrorMessage(response, 'Could not load field guidance.'));
                }
                const data = await response.json();
                if (data?.success === false) {
                    throw new Error(data?.error || 'Could not load field guidance.');
                }
                if (data?.buildAiUsage) {
                    setFieldGuidanceBuildAiUsage((prev) => mergeBuildAiUsageSnapshot(prev, data.buildAiUsage));
                }
                setFieldDescriptions((prev) => ({
                    ...prev,
                    [nodeId]: {
                        loading: false,
                        data: {
                            ...(prev[nodeId]?.data || {}),
                            ...(data.descriptions || {}),
                        },
                    },
                }));
            } catch (error) {
                if (requestKey) fieldDescFetchedRef.current.delete(requestKey);
                toast({
                    title: 'Field guidance unavailable',
                    description: error instanceof Error ? error.message : 'Could not load field guidance.',
                    variant: 'destructive',
                });
                setFieldDescriptions((prev) => ({
                    ...prev,
                    [nodeId]: { loading: false, data: prev[nodeId]?.data || null },
                }));
            }
        },
        [fieldDescriptions, pendingWorkflowData, prompt, readBackendErrorMessage, toast]
    );

    useEffect(() => {
        if (step !== 'configuration') return;
        const question = manualConfigurationQuestions[currentQuestionIndex];
        if (!question) return;
        const nodeId = String(question.nodeId || '').trim();
        const fieldName = String(question.fieldName || '').trim();
        if (!nodeId || !fieldName) return;
        const existing = fieldDescriptions[nodeId];
        if (existing?.loading || existing?.data?.[fieldName]) return;
        const requestKey = `${nodeId}:${fieldName}`;
        if (fieldDescFetchedRef.current.has(requestKey)) return;
        fieldDescFetchedRef.current.add(requestKey);
        fetchFieldDescriptions(
            nodeId,
            String(question.nodeType || ''),
            String(question.nodeLabel || question.nodeType || 'Node'),
            [{
                ...question,
                selectedMode:
                    ownershipEffectiveModes.byModeKey[`mode_${question.nodeId}_${question.fieldName}`] ||
                    resolveWizardFieldFillMode(
                        fillModeValues[`mode_${question.nodeId}_${question.fieldName}`],
                        question.fillModeDefault as 'manual_static' | 'runtime_ai' | 'buildtime_ai_once' | undefined
                    ),
                fieldEnabled: true,
                currentValue: question.defaultValue || null,
            }],
            requestKey
        );
    }, [
        step,
        manualConfigurationQuestions,
        currentQuestionIndex,
        fieldDescriptions,
        fetchFieldDescriptions,
        ownershipEffectiveModes.byModeKey,
        fillModeValues,
    ]);

    /**
     * Walks through every field across ALL nodes in the entire Field Ownership stage,
     * expanding each field panel and fetching a per-field AI explanation one at a time.
     * Results are DB-cached (field_walk_cache) so repeat visits are instant.
     */
    const startGlobalWalkThrough = useCallback(
        async (
            structuralGroups: Array<{ nodeId: string; nodeType: string; nodeLabel: string; fields: any[] }>,
            secretGroups: Array<{ nodeId: string; nodeType: string; nodeLabel: string; fields: any[] }>
        ) => {
            if (globalWalkActive) {
                globalWalkAbortRef.current = true;
                setGlobalWalkActive(null);
                return;
            }

            // Flatten: all fields from all node groups, in display order
            type FlatField = { nodeId: string; nodeType: string; nodeLabel: string; question: any };
            const allFields: FlatField[] = [];
            for (const group of [...structuralGroups, ...secretGroups]) {
                for (const question of group.fields) {
                    if (String(question.fieldName || '').trim()) {
                        allFields.push({ nodeId: group.nodeId, nodeType: group.nodeType, nodeLabel: group.nodeLabel, question });
                    }
                }
            }
            if (allFields.length === 0) return;

            globalWalkAbortRef.current = false;
            const total = allFields.length;

            const session = (await awsClient.auth.getSession()).data.session;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

            const blueprint = (pendingWorkflowData as any)?.update?.structuralBlueprint;
            const workflowOverview = blueprint?.overviewText;

            for (let i = 0; i < total; i++) {
                if (globalWalkAbortRef.current) break;

                const { nodeId, nodeType, nodeLabel, question } = allFields[i];
                const fieldName = String(question.fieldName || '').trim();
                const fieldLabel = String(question.text || question.label || fieldName);

                setGlobalWalkActive({ currentNodeLabel: nodeLabel, currentFieldLabel: fieldLabel, currentFieldIdx: i, totalFields: total });

                // Expand this field's help panel
                setFieldHelpExpanded((prev) => ({ ...prev, [`fieldhelp_${nodeId}_${fieldName}`]: true }));

                const alreadyHasData = !!(fieldDescriptions[nodeId]?.data?.[fieldName]);
                if (!alreadyHasData) {
                    setFieldDescriptions((prev) => ({
                        ...prev,
                        [nodeId]: { loading: true, data: prev[nodeId]?.data || null },
                    }));

                    try {
                        const nodeNarrative = (blueprint?.nodeNarratives as any[])?.find((n: any) => n.nodeId === nodeId)?.text;
                        const resp = await fetch(`${ENDPOINTS.itemBackend}/api/ai/field-walk-step`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                workflowId: generatedWorkflowId,
                                nodeId,
                                nodeType,
                                nodeLabel,
                                nodeNarrative,
                                workflowOverview,
                                userPrompt: prompt,
                                field: {
                                    fieldName,
                                    label: fieldLabel,
                                    fieldType: String(question.type || 'string'),
                                    description: String(question.description || question.helpText || ''),
                                    example: String(question.exampleValue || question.example || ''),
                                    options: Array.isArray(question.options)
                                        ? question.options.map((option: any) => (
                                            typeof option === 'string'
                                                ? { label: option, value: option }
                                                : { label: String(option?.label ?? option?.value ?? ''), value: String(option?.value ?? option?.label ?? '') }
                                        )).filter((option: any) => option.value)
                                        : [],
                                    required: question.required !== false,
                                    selectedMode: String(question.selectedMode || ''),
                                    fieldEnabled: question.fieldEnabled === true,
                                    supportsRuntimeAI: question.supportsRuntimeAI !== false,
                                    supportsBuildtimeAI: question.supportsBuildtimeAI !== false,
                                    fillModeDefault: String(question.fillModeDefault || 'manual_static'),
                                    ownership: String(question.ownershipClass || ''),
                                    currentValue: question.defaultValue || null,
                                    operation: String(question.operation || question.operationValue || ''),
                                },
                            }),
                        });
                        if (!resp.ok) {
                            throw new Error(await readBackendErrorMessage(resp, 'Could not load field walkthrough guidance.'));
                        }
                        const data = await resp.json();
                        if (data?.success === false) {
                            throw new Error(data?.error || 'Could not load field walkthrough guidance.');
                        }
                        if (data?.buildAiUsage) {
                            setFieldGuidanceBuildAiUsage((prev) => mergeBuildAiUsageSnapshot(prev, data.buildAiUsage));
                        }
                        setFieldDescriptions((prev) => ({
                            ...prev,
                            [nodeId]: {
                                loading: false,
                                data: data.description
                                    ? { ...(prev[nodeId]?.data || {}), [fieldName]: data.description }
                                    : (prev[nodeId]?.data || null),
                            },
                        }));
                    } catch (error) {
                        toast({
                            title: 'Field walkthrough failed',
                            description: error instanceof Error ? error.message : 'Could not load field walkthrough guidance.',
                            variant: 'destructive',
                        });
                        setFieldDescriptions((prev) => ({
                            ...prev,
                            [nodeId]: { loading: false, data: prev[nodeId]?.data || null },
                        }));
                    }
                }

                if (i < total - 1 && !globalWalkAbortRef.current) {
                    await new Promise<void>((resolve) => setTimeout(resolve, 400));
                }
            }

            setGlobalWalkActive(null);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [globalWalkActive, fieldDescriptions, pendingWorkflowData, prompt, generatedWorkflowId, readBackendErrorMessage, toast]
    );

    const proceedFromOwnershipStage = () => {
        if (ownershipEffectiveModes.coerced.length > 0) {
            toast({
                title: 'Some ownership selections were adjusted',
                description:
                    'A few fields do not support the chosen AI mode and were switched to the nearest supported option before continuing.',
            });
            const updates: Record<string, string> = {};
            ownershipEffectiveModes.coerced.forEach((c) => {
                const mode = ownershipEffectiveModes.byModeKey[c.modeKey];
                if (mode) updates[c.modeKey] = mode;
            });
            if (Object.keys(updates).length > 0) {
                setFillModeValues((prev) => ({ ...prev, ...updates }));
            }
        }
        if (blockingOAuthCredentials.length > 0) {
            toast({
                title: 'Credentials not yet connected',
                description: 'Some required credentials are still missing. You can connect them on the next step.',
            });
        }

        // Bug A fix: user has submitted answers ? set questionsAnswered = true.
        // Now that pipelineReady is also true, it is safe to advance past the questions gate.
        setQuestionsAnswered(true);
        // Credentials are collected inline during the field-ownership step.
        // Skip the redundant 'credentials' step and go directly to 'configuration'.
        setCurrentQuestionIndex(0);
        setStep('configuration');
    };

    // -- Capability-Node-Selection-Flow handlers (tasks 10.1, 10.2, 10.3) -----

    /**
     * Phase 1: Call /api/capability-selection/analyze after prompt submission.
     * Returns CapabilityContainer[] and a correlationId.
     * Req 3.7, 7.1, 7.3
     */
    const handleCapabilityNodeSelectionAnalyze = async () => {
        if (!prompt.trim()) return;

        const { data: sessionData } = await awsClient.auth.getSession();
        const userId = sessionData?.session?.user?.id ?? '';

        setStep('analyzing');
        setIsSummarizeLayerProcessing(true);

        try {
            const response = await fetch(`${ENDPOINTS.itemBackend}/api/capability-selection/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionData?.session?.access_token
                        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
                        : {}),
                },
                body: JSON.stringify({ prompt, userId }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Analysis failed' }));
                throw new Error(err.message || err.error || 'Capability analysis failed');
            }

            const data = await response.json();
            const containers: CapabilityContainer[] = Array.isArray(data.containers) ? data.containers : [];

            setCapNodeContainers(containers);
            setCapNodeCorrelationId(data.correlationId ?? '');
            setCapNodeSelections({});
            setCapNodeSelectionIssue(null);
            setOriginalPrompt(prompt);

            // Req 7.1, 7.3: do NOT call legacy structural prompt generation here
            setStep('capability-node-selection');
        } catch (err: any) {
            toast({ title: 'Analysis Failed', description: err.message, variant: 'destructive' });
            setStep('idle');
        } finally {
            setIsSummarizeLayerProcessing(false);
        }
    };

    /**
     * Phase 2: Called when user clicks Continue on CapabilityStage.
     * Calls /api/capability-selection/generate with the user's selections.
     * Req 4.1, 7.1
     */
    const handleCapabilityNodeSelectionGenerate = async (selections: NodeSelectionMap) => {
        setCapNodeSelections(selections);
        setCapNodeSelectionIssue(null);
        setStep('analyzing');
        setIsSummarizeLayerProcessing(true);

        try {
            const { data: sessionData } = await awsClient.auth.getSession();
            const response = await fetch(`${ENDPOINTS.itemBackend}/api/capability-selection/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionData?.session?.access_token
                        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
                        : {}),
                },
                body: JSON.stringify({
                    correlationId: capNodeCorrelationId,
                    userPrompt: originalPrompt || prompt,
                    selections,
                    containers: capNodeContainers,
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Generation failed' }));
                if (err.code === 'MISSING_TRIGGER_SELECTION' || err.code === 'MULTIPLE_TRIGGER_SELECTION') {
                    setCapNodeSelectionIssue({
                        valid: false,
                        code: err.code,
                        title: err.code === 'MULTIPLE_TRIGGER_SELECTION' ? 'Choose one trigger' : 'Workflow needs a trigger',
                        message: err.message || 'Select one trigger before continuing. Every workflow needs a starting point.',
                        selectedCount: Object.keys(selections).length,
                        requiredCount: capNodeContainers.length,
                        triggerContainers: err.triggerContainers ?? [],
                        selectedTriggerContainers: err.selectedTriggerContainers ?? [],
                        invalidSelections: [],
                        missingIntentSteps: err.missingContainers ?? [],
                    });
                    setStep('capability-node-selection');
                    return;
                }
                throw new Error(err.message || err.error || 'Structural prompt generation failed');
            }

            const data = await response.json();
            setCapNodeStructuralPrompt(data.structuralPrompt ?? '');
            setCapNodeWorkflow(data.workflow ?? null);

            // Req 5.3: show review step — Continue is the sole gate for Backend_Generation
            setStep('capability-review');
        } catch (err: any) {
            toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
            // Return to selection step with selections preserved (Req 6.6)
            setStep('capability-node-selection');
        } finally {
            setIsSummarizeLayerProcessing(false);
        }
    };

    /**
     * Phase 3: Called when user clicks Continue on CapabilityReviewStep.
     * Calls /api/capability-selection/confirm to begin Backend_Generation.
     * Req 6.1, 5.3, 5.4
     */
    const handleCapabilityNodeSelectionConfirm = async () => {
        setStep('building');
        setProgress(5);
        setIsComplete(false);
        setCurrentPhase('preflight');
        setBuildStartTime(Date.now());
        setElapsedTime(0);
        setBuildingLogs(['Starting backend generation...']);

        try {
            const { data: sessionData } = await awsClient.auth.getSession();
            const userId = sessionData?.session?.user?.id ?? '';

            const response = await fetch(`${ENDPOINTS.itemBackend}/api/capability-selection/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionData?.session?.access_token
                        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
                        : {}),
                },
                body: JSON.stringify({
                    correlationId: capNodeCorrelationId,
                    workflow: capNodeWorkflow,
                    userPrompt: originalPrompt || prompt,
                    structuralPrompt: capNodeStructuralPrompt || originalPrompt || prompt,
                    userId,
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Confirmation failed' }));
                throw new Error(err.message || err.error || 'Backend generation failed');
            }

            const data = await response.json();

            // data.workflow contains the AI-populated, credential-discovered, field-ownership-mapped workflow.
            // We must save it to DB, then wire it into the field-ownership wizard
            // (same path as the legacy handleRefine phase:'ready' handler).
            const workflowNodes = data.workflow?.nodes ?? capNodeWorkflow?.nodes ?? [];
            const workflowEdges = data.workflow?.edges ?? capNodeWorkflow?.edges ?? [];

            if (workflowNodes.length === 0) {
                throw new Error('Backend returned an empty workflow — no nodes to save.');
            }

            setProgress(80);
            setBuildingLogs((prev) => [...prev, 'Saving workflow...']);

            // -- Save to DB ----------------------------------------------
            const { normalizeBackendWorkflow } = await import('@/lib/node-type-normalizer');
            const normalizedBackend = normalizeBackendWorkflow({ nodes: workflowNodes, edges: workflowEdges });
            // ? Use preserveTopology=true: the backend already built the correct branching graph.
            // Without this, validateAndFixWorkflow re-runs linearization which adds spurious
            // log_output fan-in edges from all branch terminals.
            const normalized = revalidateWorkflowGraph(
                normalizedBackend.nodes,
                normalizedBackend.edges,
                10,
                { preserveTopology: true }
            );

            const { data: savedWorkflow, error: saveError } = await awsClient
                .from('workflows')
                .insert(markWorkflowDataAsPendingSetup({
                    name: (prompt || originalPrompt || 'AI Generated Workflow').substring(0, 50),
                    nodes: normalized.nodes,
                    edges: normalized.edges,
                    user_id: userId,
                    updated_at: new Date().toISOString(),
                }) as any)
                .select()
                .single();

            if (saveError) throw saveError;
            if (!savedWorkflow?.id) throw new Error('Workflow saved but no ID returned');

            setGeneratedWorkflowId(savedWorkflow.id);
            setNodes(applyFillModesToNodes(normalized.nodes as any[], fillModeValues));
            setEdges(normalized.edges as any[]);
            setProgress(100);
            setIsComplete(true);

            // -- Wire field-ownership wizard (same as legacy phase:'ready' path) --
            const comprehensiveQuestions: any[] = data.comprehensiveQuestions ?? [];
            const discoveredCreds: any[] = data.discoveredCredentials ?? [];

            setPendingWorkflowData({
                nodes: normalized.nodes,
                edges: normalized.edges,
                update: { ...data, phase: 'ready', success: true },
                discoveredInputs: data.discoveredInputs ?? [],
                discoveredCredentials: discoveredCreds,
                comprehensiveQuestions,
                unifiedReadiness: data.unifiedReadiness ?? null,
                credentialStatuses: data.credentialStatuses,
                credentialWizardView: data.credentialWizardView,
                fieldOwnershipMap: data.fieldOwnershipMap ?? undefined,
                fieldOwnershipPolicyMap: data.fieldOwnershipPolicyMap ?? undefined,
            });

            setBuildingLogs((prev) => [...prev, 'Workflow generated successfully!']);

            if (comprehensiveQuestions.length > 0 || discoveredCreds.length > 0) {
                // Wire questions into the field-ownership step
                const baseQuestions = comprehensiveQuestions.map((q: any) => {
                    const fieldName = String(q.fieldName || '').trim() || 'credential';
                    const isCredentialQ = q.category === 'credential' || q.ownershipClass === 'credential';
                    return {
                        ...q,
                        questionType: isCredentialQ ? 'credential' : (q.category || 'input'),
                        id: q.id || `${q.nodeId}_${fieldName}`,
                        fieldName,
                        label: q.text || q.label || `${q.nodeLabel} - ${fieldName}`,
                        isVaultCredential: isCredentialQ,
                    };
                });
                setAllQuestions(applyFieldOwnershipPoliciesToQuestions(
                    baseQuestions,
                    data.fieldOwnershipMap,
                    data.fieldOwnershipPolicyMap,
                ));
                setStep('field-ownership');
            } else {
                const synthesized = synthesizeFieldOwnershipQuestions(
                    normalized.nodes,
                    data.fieldOwnershipMap,
                    data.fieldOwnershipPolicyMap,
                );
                if (synthesized.length > 0) {
                    setAllQuestions(synthesized);
                    setStep('field-ownership');
                } else {
                    setQuestionsAnswered(true);
                    setStep('complete');
                }
            }
        } catch (err: any) {
            toast({ title: 'Backend Generation Failed', description: err.message, variant: 'destructive' });
            setStep('capability-review');
            setProgress(0);
            setIsComplete(false);
        }
    };

    // -------------------------------------------------------------------------

    const reset = () => {
        // Execution Flow Architecture (STEP-2): Reset state manager
        stateManager.reset();
        
        setStep('idle');
        setPrompt('');
        setAnalysis(null);
        setRefinement(null);
        setAnswers({});
        setBuildingLogs([]);
        setGeneratedWorkflowId(null);
        setProgress(0);
        setCurrentPhase('');
        setIsComplete(false);
        setBuildStartTime(null);
        setElapsedTime(0);
        setWorkflowUnderstandingConfirmed(false);
        // Bug A fix: reset pipeline gate flags
        setPipelineReady(false);
        setQuestionsAnswered(false);
        // Capability-Node-Selection-Flow state reset (task 10.1)
        setCapNodeContainers([]);
        setCapNodeCorrelationId('');
        setCapNodeSelections({});
        setCapNodeStructuralPrompt('');
        setCapNodeWorkflow(null);
        // Scroll back to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const promptLayout = getPromptInputLayoutState(prompt, step);
    const hasPostAnalysisContext = Boolean(
        (originalPrompt && String(originalPrompt).trim()) ||
            (planSummary && String(planSummary).trim()) ||
            (analysis?.summary && String(analysis.summary).trim()) ||
            (refinement?.systemPrompt && String(refinement.systemPrompt).trim()) ||
            intentSnapshot
    );
    const showPromptComposer = step === 'idle' || step === 'analyzing';
    const showIntentContextCard =
        !showPromptComposer &&
        step !== 'building' &&
        step !== 'complete' &&
        hasPostAnalysisContext;
    const intentContextSummary =
        (planSummary && String(planSummary).trim()) ||
        (refinement?.systemPrompt && String(refinement.systemPrompt).trim()) ||
        (analysis?.summary && String(analysis.summary).trim()) ||
        (prompt && String(prompt).trim()) ||
        '';
    const requiredSectionStyles = {
        fieldOwnership: {
            cardClass: 'border-blue-500/30 shadow-lg',
            titleClass: 'text-blue-400 flex items-center gap-2',
        },
        configuration: {
            cardClass: 'border-red-500/30 shadow-lg',
            titleClass: 'text-red-400 flex items-center gap-2',
            requiredIndicatorClass: 'text-red-500 ml-1',
        },
    } as const;

    return (
        <div className="fixed inset-0 z-50 bg-background text-foreground font-sans flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border bg-card flex justify-between items-center shrink-0">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                    <AppBrand context="app" size="sm" className="shrink-0" />
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="rounded-full"
                        title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                    >
                        {theme === "light" ? (
                            <Moon className="h-5 w-5" />
                        ) : (
                            <Sun className="h-5 w-5" />
                        )}
                    </Button>
                    <Badge variant="outline" className="h-8 px-3">
                        {step === 'idle' ? 'Ready' : step === 'complete' ? 'Completed' : 'Processing'}
                    </Badge>
                    <Button variant="ghost" onClick={handleWizardClose}>Close</Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-background/50">
                {/* Steps 1-4: Single page view */}
                {step !== 'building' && step !== 'complete' && (
                <div className="max-w-5xl mx-auto space-y-8 pb-20">
                    {showPromptComposer && (
                        <div ref={step1Ref} className="scroll-mt-6">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-6"
                            >
                                <div className="text-center space-y-2">
                                    <h3 className="text-3xl font-bold bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">What would you like to automate?</h3>
                                    <p className="text-muted-foreground text-lg">Describe your task in natural language. The agents will handle the rest.</p>
                                </div>
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                    <Textarea
                                        placeholder="e.g. Post to Instagram every morning at 9 AM with a tech tip..."
                                        className="relative min-h-[150px] bg-card border-border resize-none p-6 text-lg focus-visible:ring-indigo-500 rounded-lg shadow-xl"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && prompt.trim()) {
                                                e.preventDefault();
                                                handleAnalyze();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    {promptLayout.showShortcutHint ? (
                                        <p className="text-xs text-muted-foreground">
                                            Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border border-border rounded">Ctrl/Cmd + Enter</kbd> to analyze
                                        </p>
                                    ) : <span />}
                                    <Button
                                        className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                                        onClick={handleAnalyze}
                                        disabled={promptLayout.disableAnalyzeButton}
                                    >
                                        {step === 'analyzing' ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                Analyze Prompts <ArrowRight className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>

                            </motion.div>
                        </div>
                    )}

                    {showIntentContextCard && (
                        <div className="scroll-mt-6">
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className="border-indigo-500/25 bg-indigo-500/5">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm text-indigo-300">Intent Context</CardTitle>
                                        <CardDescription>
                                            Workflow intent is locked in. Continue with ownership and configuration.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {originalPrompt && (
                                            <p className="text-xs text-muted-foreground">
                                                <span className="font-semibold text-foreground/80">Original prompt:</span> {originalPrompt}
                                            </p>
                                        )}
                                        {intentContextSummary ? (
                                            <StructuredPlanDisplay summary={intentContextSummary} compact />
                                        ) : null}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setStep('idle');
                                                    setPrompt((prev) => {
                                                        if (prev && String(prev).trim().length > 0) return prev;
                                                        if (originalPrompt && String(originalPrompt).trim().length > 0) {
                                                            return originalPrompt;
                                                        }
                                                        return intentContextSummary;
                                                    });
                                                }}
                                            >
                                                Edit intent
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={reset}
                                            >
                                                Restart
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {/* Loading state: initial prompt analysis only */}
                    {step === 'analyzing' && (
                        <GlassBlurLoader 
                            text="Analyzing Your Prompt..."
                            description="Decomposing your request into logical steps and identifying necessary integrations."
                        />
                    )}

                    {/* STEP 2: Plan review / clarifying questions only ? hide once we move to refine+ (linear flow, no overlap) */}
                    {step === 'questioning' && (hasWorkflowPlan || analysis) && (
                        <div ref={step2Ref} className="scroll-mt-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-6"
                            >
                            <ThemedBorderGlow
                                className="w-full shadow-xl"
                                animated={hasWorkflowPlan && step === 'questioning'}
                                borderRadius={12}
                                glowRadius={40}
                            >
                                <div className="overflow-hidden">
                                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-indigo-400">
                                        <Layers className="h-5 w-5" /> 
                                        {hasWorkflowPlan ? 'Structured workflow plan' : 'Summary'}
                                    </CardTitle>
                                    {hasWorkflowPlan && (
                                        <CardDescription className="text-muted-foreground">
                                            Edit the execution plan, then continue or regenerate. Extra detail is under Diagnostics.
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {hasWorkflowPlan ? (
                                        <>
                                            {originalPrompt && (
                                                <Collapsible className="group mb-2">
                                                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/60">
                                                        <span>Original prompt</span>
                                                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="px-1 pt-2">
                                                        <p className="text-sm text-foreground whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3">
                                                            {originalPrompt}
                                                        </p>
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            )}
                                            <Label className="text-sm font-medium">Execution plan (editable)</Label>
                                            <Textarea
                                                className="min-h-[180px] text-sm leading-relaxed font-mono"
                                                value={planSummary}
                                                onChange={(e) => setPlanSummary(e.target.value)}
                                                spellCheck={false}
                                            />
                                            {(planNodeHints.length > 0 ||
                                                Object.keys(planNodeReasons).length > 0 ||
                                                planOrderingConfidence !== null ||
                                                planOrderingHopRationales.length > 0 ||
                                                planRankedSelectionSummary.length > 0 ||
                                                (planBranchingOverview && planBranchingOverview.trim().length > 0)) && (
                                                <Collapsible open={planDiagnosticsOpen} onOpenChange={setPlanDiagnosticsOpen} className="rounded-lg border border-border bg-muted/15">
                                                    <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted/30">
                                                        <span>Diagnostics</span>
                                                        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${planDiagnosticsOpen ? 'rotate-180' : ''}`} />
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="space-y-3 border-t border-border px-3 py-3 text-sm">
                                                        {planNodeHints.length > 0 && (
                                                            <div className="space-y-1.5">
                                                                <span className="text-xs font-semibold text-muted-foreground">Nodes</span>
                                                                {planNodeHints.map((n) => (
                                                                    <div key={n} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                                                                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                                                                            {n}
                                                                        </Badge>
                                                                        <span className="text-muted-foreground">
                                                                            {planNodeReasons[n] || 'canonical chain policy'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {planOrderingConfidence !== null && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Ordering confidence:{' '}
                                                                <span className="font-medium text-foreground">
                                                                    {Math.round(planOrderingConfidence * 100)}%
                                                                </span>
                                                            </p>
                                                        )}
                                                        {planOrderingHopRationales.length > 0 && (
                                                            <div className="space-y-1">
                                                                <span className="text-xs font-semibold text-muted-foreground">
                                                                    Edges (matches Execution plan above)
                                                                </span>
                                                                {planOrderingHopRationales.map((r, idx) => (
                                                                    <p key={`hop_${idx}`} className="text-xs font-mono text-muted-foreground">
                                                                        {r}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {planRankedSelectionSummary.length > 0 && (
                                                            <div className="space-y-1">
                                                                <span className="text-xs font-semibold text-muted-foreground">Ranking (from prompt)</span>
                                                                {planRankedSelectionSummary.map((r, idx) => (
                                                                    <p key={`rank_${idx}`} className="text-xs text-muted-foreground">
                                                                        {r}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {planBranchingOverview && planBranchingOverview.trim().length > 0 ? (
                                                            <p className="text-xs text-muted-foreground">
                                                                <span className="font-semibold">Branching note: </span>
                                                                {planBranchingOverview}
                                                            </p>
                                                        ) : null}
                                                    {capabilitySelectionsApplied && (
                                                        <p className="text-xs text-muted-foreground">
                                                            <span className="font-semibold">Generated from selected nodes: </span>
                                                            {[
                                                                ...new Set(
                                                                    Object.values(capabilitySelectionsByStep)
                                                                        .flat()
                                                                        .filter((x) => typeof x === 'string' && x.trim().length > 0)
                                                                ),
                                                            ].join(', ') || 'none'}
                                                        </p>
                                                    )}
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            )}
                                            {planRepairActions.length > 0 && (
                                                <div className="p-3 rounded-lg border border-border bg-muted/20 text-sm whitespace-pre-wrap">
                                                    <span className="font-medium text-muted-foreground">Repair actions applied</span>
                                                    <div className="mt-1 space-y-1">
                                                        {planRepairActions.map((a, idx) => (
                                                            <p key={`repair_${idx}`} className="text-xs">{a}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {planSemanticWarnings.length > 0 && (
                                                <div className="p-3 rounded-lg border border-amber-400/40 bg-amber-500/10 text-sm whitespace-pre-wrap">
                                                    <span className="font-medium text-amber-300">Semantic order warnings</span>
                                                    <div className="mt-1 space-y-1">
                                                        {planSemanticWarnings.map((w, idx) => (
                                                            <p key={`warn_${idx}`} className="text-xs text-amber-200">{w}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                                                <Button type="button" variant="outline" onClick={handleRegeneratePlan} disabled={isSummarizeLayerProcessing}>
                                                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate plan
                                                </Button>
                                                <Button
                                                    type="button"
                                                    className="bg-indigo-600 hover:bg-indigo-500"
                                                    onClick={() => {
                                                        if (capabilityOptions.length > 0 && !capabilitySelectionsApplied) {
                                                            setStep('capability-selection');
                                                        } else {
                                                            void handleConfirmPlanAndAnalyze();
                                                        }
                                                    }}
                                                >
                                                    {capabilityOptions.length > 0 && !capabilitySelectionsApplied ? 'Continue to capability selection' : 'Continue to workflow setup'} <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setHasWorkflowPlan(false);
                                                        setPlanSummary('');
                                                        setPlanSummaryV2(null);
                                                        setPlanNodeHints([]);
                                                        setPlanNodeReasons({});
                                                        setPlanOrderingConfidence(null);
                                                        setPlanOrderingHopRationales([]);
                                                        setPlanRankedSelectionSummary([]);
                                                        setPlanRepairActions([]);
                                                        setPlanSemanticWarnings([]);
                                                        setPlanDiagnosticsOpen(false);
                                                        setCapabilityOptions([]);
                                                        setCapabilitySelectionsByStep({});
                                                        setCapabilitySelectionsApplied(false);
                                                        setCapabilityDefaultConfirmStepIds([]);
                                                        setIntentSnapshot(null);
                                                        setPrompt('');
                                                        setStep('idle');
                                                    }}
                                                >
                                                    Start over
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-foreground leading-relaxed text-lg">{analysis?.summary}</p>
                                            {/* Auto-continue if no questions */}
                                            {analysis && (!analysis.questions || analysis.questions.length === 0) && (
                                                <div className="pt-4 border-t border-border">
                                                    <Button
                                                        onClick={() => handleRefine()}
                                                        className="w-full bg-indigo-600 hover:bg-indigo-500"
                                                        size="lg"
                                                    >
                                                        Continue Building <ArrowRight className="ml-2 h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                                </div>
                            </ThemedBorderGlow>
                        </motion.div>
                    </div>
                    )}

                    {step === 'capability-selection' && capabilityOptions.length > 0 && (
                        <div className="scroll-mt-6">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className="border-indigo-500/30 shadow-lg">
                                    <CardHeader>
                                        <CardTitle className="text-indigo-400 flex items-center gap-2">
                                            <Layers className="h-5 w-5" /> Select Capability Nodes
                                        </CardTitle>
                                        <CardDescription>
                                            Choose one or more nodes for each step. Only registry nodes are shown, and your selections will be enforced in structural + workflow generation.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        {capabilityOptions.map((capStep) => {
                                            const selected = capabilitySelectionsByStep[capStep.stepId] || [];
                                            return (
                                                <div key={capStep.stepId} className="rounded-lg border border-border/60 p-4 space-y-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-semibold text-foreground">{capStep.stepText}</p>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                                {capStep.intentClass}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {capStep.candidateNodeTypes.map((nodeType) => {
                                                            const isSelected = selected.includes(nodeType);
                                                            return (
                                                                <Button
                                                                    key={`${capStep.stepId}_${nodeType}`}
                                                                    type="button"
                                                                    size="sm"
                                                                    variant={isSelected ? 'default' : 'outline'}
                                                                    onClick={() => {
                                                                        setCapabilitySelectionsApplied(false);
                                                                        setCapabilitySelectionsByStep((prev) => {
                                                                            const current = prev[capStep.stepId] || [];
                                                                            const exists = current.includes(nodeType);
                                                                            let next: string[];
                                                                            if (!capStep.selectionPolicy.multiSelectAllowed) {
                                                                                next = exists ? [] : [nodeType];
                                                                            } else if (exists) {
                                                                                next = current.filter((x) => x !== nodeType);
                                                                            } else {
                                                                                next = [...current, nodeType];
                                                                            }
                                                                            return { ...prev, [capStep.stepId]: next };
                                                                        });
                                                                    }}
                                                                    className="font-mono text-xs"
                                                                >
                                                                    {nodeType}
                                                                </Button>
                                                            );
                                                        })}
                                                    </div>
                                                    {capStep.defaultSuggestedNodeType && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Suggested default: <span className="font-mono">{capStep.defaultSuggestedNodeType}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                                            <Button type="button" variant="outline" onClick={() => setStep('questioning')}>
                                                Back to plan
                                            </Button>
                                            <Button
                                                type="button"
                                                className="bg-indigo-600 hover:bg-indigo-500"
                                                onClick={() => {
                                                    void handleApplyCapabilitySelections();
                                                }}
                                            >
                                                Generate structural prompt with selected nodes <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {/* -- Capability-Node-Selection-Flow: CapabilityStage (task 10.1) -- */}
                    {/* Req 3.1–3.8, 7.1, 7.3: shown after Phase 1 analyze; legacy structural prompt NOT called here */}
                    {step === 'capability-node-selection' && capNodeContainers.length > 0 && (
                        <div className="scroll-mt-6 py-4">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <CapabilityStage
                                    containers={capNodeContainers}
                                    validationIssue={capNodeSelectionIssue}
                                    initialSelections={capNodeSelections}
                                    onComplete={(selections) => {
                                        void handleCapabilityNodeSelectionGenerate(selections);
                                    }}
                                    onBack={() => {
                                        // Req 3.8: Go Back returns to prompt step with no state change
                                        setStep('idle');
                                    }}
                                />
                            </motion.div>
                        </div>
                    )}

                    {/* -- Capability-Node-Selection-Flow: CapabilityReviewStep (task 10.2) -- */}
                    {/* Req 5.1–5.6, 6.1: shown after Phase 2 generate; Continue is sole gate for Backend_Generation */}
                    {step === 'capability-review' && capNodeStructuralPrompt && capNodeWorkflow && (
                        <div className="scroll-mt-6 py-4">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <CapabilityReviewStep
                                    structuralPrompt={capNodeStructuralPrompt}
                                    workflow={capNodeWorkflow}
                                    selections={capNodeSelections}
                                    onConfirm={() => {
                                        // Req 5.3, 5.4, 6.1: sole gate for Backend_Generation
                                        void handleCapabilityNodeSelectionConfirm();
                                    }}
                                    onBack={() => {
                                        // Req 5.5: Go Back returns to CapabilityStage with selections preserved
                                        setStep('capability-node-selection');
                                    }}
                                />
                            </motion.div>
                        </div>
                    )}

                    {/* Loading state for refining (configuration questions are now derived from the finalized graph) */}
                    {step === 'refining' && (
                        <GlassBlurLoader 
                            text="Refining Workflow Plan..."
                            description="Processing your answers and generating the final workflow structure."
                        />
                    )}

                    {/* STEP 3: Show Final Understood System Prompt - Confirmation Required */}
                    {step !== 'idle' && step !== 'analyzing' && refinement && refinement.systemPrompt && (
                        <div ref={step3Ref} className="scroll-mt-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="border-green-500/30 shadow-lg">
                                    <CardHeader>
                                        <CardTitle className="text-green-400 flex items-center gap-2">
                                            <Sparkles className="h-5 w-5" /> Here is my understanding of your workflow
                                        </CardTitle>
                                        <CardDescription>Please review and confirm before we proceed</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Structured Summary */}
                                        <div className="bg-green-500/10 p-6 rounded-md border border-green-500/20 space-y-4">
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="font-semibold text-green-400">? Trigger:</span>
                                                    <p className="text-foreground mt-1 ml-4">
                                                        {(() => {
                                                            const trigger = refinement.systemPrompt?.toLowerCase().match(/(?:trigger|when|on|schedule|form|webhook|manual)[^.]*/i)?.[0] ||
                                                                          'User-initiated workflow';
                                                            return trigger.charAt(0).toUpperCase() + trigger.slice(1);
                                                        })()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-green-400">? Actions:</span>
                                                    <p className="text-foreground mt-1 ml-4">
                                                        {(() => {
                                                            const actions = refinement.systemPrompt || analysis?.summary || 'Process and execute workflow steps';
                                                            // Extract key actions from system prompt
                                                            const actionMatch = actions.match(/(?:will|should|to)\s+([^.]{10,100})/i);
                                                            return actionMatch ? actionMatch[1] : actions.substring(0, 100);
                                                        })()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-green-400">? Logic:</span>
                                                    <p className="text-foreground mt-1 ml-4">
                                                        {(() => {
                                                            const hasConditions = answers && Object.values(answers).some(a => 
                                                                typeof a === 'string' && (a.toLowerCase().includes('if') || a.toLowerCase().includes('condition') || a.toLowerCase().includes('when'))
                                                            );
                                                            return hasConditions ? 'Conditional logic based on user inputs' : 'Linear workflow execution';
                                                        })()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-green-400">? Output:</span>
                                                    <p className="text-foreground mt-1 ml-4">
                                                        {(() => {
                                                            const outputDest = answers && Object.values(answers).find(a => 
                                                                typeof a === 'string' && (a.toLowerCase().includes('slack') || a.toLowerCase().includes('email') || a.toLowerCase().includes('discord') || a.toLowerCase().includes('webhook'))
                                                            );
                                                            return outputDest || 'Workflow result output';
                                                        })()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-green-400">? Error handling:</span>
                                                    <p className="text-foreground mt-1 ml-4">
                                                        Automatic error detection and recovery with validation
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* System Prompt Preview - Show analyzed prompt (3-5 sentences) */}
                                        <div className="bg-gradient-to-br from-muted/80 to-muted/40 p-5 rounded-lg border border-border/50 shadow-sm">
                                            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                                <Sparkles className="h-4 w-4" />
                                                Final Analyzed Prompt:
                                            </p>
                                            {planSummaryV2 ? (
                                                <SummaryV2Display summaryV2={planSummaryV2} />
                                            ) : (
                                                <StructuredPlanDisplay
                                                    summary={planSummary || refinement.enhancedPrompt || refinement.systemPrompt || refinement.refinedPrompt || ''}
                                                />
                                            )}
                                        </div>

                                        {/* Pipeline Stage Trace ? shows each AI stage result */}
                                        {refinement.stageTrace && refinement.stageTrace.length > 0 && (
                                            <div className="bg-muted/20 p-4 rounded-lg border border-border/40">
                                                <PipelineStageTrace stageTrace={refinement.stageTrace} />
                                            </div>
                                        )}

                                        {/* Confirmation Buttons ? only in FSM states that allow confirmUnderstanding (STATE_1 / STATE_2).
                                            After STATE_3+ or building, the same card can stay visible when scrolling; hide buttons to avoid duplicate confirm + toast error. */}
                                        {(() => {
                                            const fsm = stateManager.getCurrentState();
                                            const canConfirmHere =
                                                fsm === WorkflowGenerationState.STATE_1_USER_PROMPT_RECEIVED ||
                                                fsm === WorkflowGenerationState.STATE_2_CLARIFICATION_ACTIVE;
                                            if (!canConfirmHere) {
                                                return (
                                                    <p className="text-sm text-muted-foreground pt-2 border-t border-border/60 mt-2">
                                                        This plan was already confirmed or building has started. Use the steps below
                                                        (field ownership, credentials, configuration) ? you do not need to confirm
                                                        again.
                                                    </p>
                                                );
                                            }
                                            return (
                                                <div className="flex gap-3 pt-2">
                                                    <Button
                                                        onClick={() => {
                                                            const finalUnderstanding =
                                                                refinement?.refinedPrompt ||
                                                                refinement?.systemPrompt ||
                                                                prompt;

                                                            if (!finalUnderstanding || finalUnderstanding.trim() === '') {
                                                                toast({
                                                                    title: 'Error',
                                                                    description:
                                                                        'Cannot confirm: No understanding text available.',
                                                                    variant: 'destructive',
                                                                });
                                                                return;
                                                            }

                                                            const confirmResult =
                                                                stateManager.confirmUnderstanding(finalUnderstanding);

                                                            if (!confirmResult.success) {
                                                                toast({
                                                                    title: 'Confirmation Failed',
                                                                    description:
                                                                        confirmResult.error ||
                                                                        'Failed to confirm understanding.',
                                                                    variant: 'destructive',
                                                                });
                                                                return;
                                                            }

                                                            setWorkflowUnderstandingConfirmed(true);

                                                            toast({
                                                                title: 'Understanding Confirmed',
                                                                description:
                                                                    'You can now proceed to build the workflow.',
                                                            });

                                                            if (requiredCredentials.length > 0) {
                                                                setTimeout(() => scrollToStep(step4Ref, 300), 200);
                                                            }
                                                        }}
                                                        className="flex-1 bg-green-600 hover:bg-green-500"
                                                        size="lg"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                                        Yes, this is correct
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            setStep('questioning');
                                                            setWorkflowUnderstandingConfirmed(false);
                                                            scrollToStep(step2Ref, 300);
                                                        }}
                                                        variant="outline"
                                                        size="lg"
                                                    >
                                                        <Settings2 className="h-4 w-4 mr-2" />
                                                        Edit / Go Back
                                                    </Button>
                                                </div>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {/* STEP 4: Required Credentials - Only show if workflow understanding is confirmed */}
                    {step === 'confirmation' && refinement && workflowUnderstandingConfirmed && requiredCredentials.length > 0 && (
                        <div ref={step4Ref} className="scroll-mt-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="border-amber-500/30 shadow-lg">
                                    <CardHeader>
                                        <CardTitle className="text-amber-400 flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5" /> Required Credentials
                                        </CardTitle>
                                        <CardDescription>
                                            The workflow requires these credentials to be configured. Please provide them to continue building your workflow.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            {[...new Set(requiredCredentials.filter((c): c is string => typeof c === 'string' && c.trim().length > 0))].map((cred, i) => {
                                                const credKey = cred.toLowerCase().replace(/_/g, '_');
                                                const credLabel = cred.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                                const credLower = cred.toLowerCase();
                                                const isPassword = credLower.includes('key') ||
                                                                 credLower.includes('token') ||
                                                                 credLower.includes('password') ||
                                                                 credLower.includes('secret');
                                                
                                                // Determine field type for guide
                                                let fieldType = 'credential';
                                                if (credLower.includes('webhook') && credLower.includes('url')) {
                                                    fieldType = 'webhook_url';
                                                } else if (credLower.includes('url')) {
                                                    fieldType = 'url';
                                                } else if (credLower.includes('oauth') || credLower.includes('client')) {
                                                    fieldType = 'oauth';
                                                } else if (credLower.includes('smtp')) {
                                                    fieldType = 'smtp';
                                                }
                                                
                                                const guide = generateFieldGuide(
                                                    'credentials',
                                                    credKey,
                                                    credLabel,
                                                    isPassword ? 'password' : 'text',
                                                    credLabel
                                                );

                                                return (
                                                    <div key={i} className="space-y-2 w-full">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <Label htmlFor={`required-cred-${i}`} className="text-sm font-medium block">
                                                                {credLabel}
                                                                <span className="text-red-400 ml-1">*</span>
                                                            </Label>
                                                            <HelpTooltip
                                                                helpText={{
                                                                    title: guide.title,
                                                                    description: guide.steps.filter(Boolean).join('\n'),
                                                                    example: guide.example,
                                                                }}
                                                                ariaLabel={`Help for ${credLabel}`}
                                                                side="top"
                                                            />
                                                        </div>
                                                        <Input
                                                            id={`required-cred-${i}`}
                                                            type={isPassword ? 'password' : 'text'}
                                                            placeholder={`Enter ${credLabel}`}
                                                            className="w-full"
                                                            value={credentialValues[credKey] || credentialValues[cred] || ''}
                                                            onChange={(e) => setCredentialValues({
                                                                ...credentialValues,
                                                                [credKey]: e.target.value,
                                                                [cred]: e.target.value, // Also set with original key
                                                            })}
                                                        />
                                                        <div className="flex justify-end">
                                                            <InputGuideLink
                                                                fieldKey={credKey}
                                                                fieldLabel={credLabel}
                                                                fieldType={fieldType}
                                                                placeholder={credLabel}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        
                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                onClick={async () => {
                                                    // Validate all credentials are filled
                                                    const allFilled = requiredCredentials
                                                        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
                                                        .every(cred => {
                                                            const credKey = cred.toLowerCase().replace(/_/g, '_');
                                                            return credentialValues[credKey] || credentialValues[cred];
                                                        });
                                                    
                                                    if (!allFilled) {
                                                        toast({
                                                            title: 'Missing Credentials',
                                                            description: 'Please fill in all required credentials.',
                                                            variant: 'destructive',
                                                        });
                                                        return;
                                                    }
                                                    
                                                    // Start building workflow
                                                    await handleBuild();
                                                }}
                                                className="flex-1"
                                            >
                                                <Check className="h-4 w-4 mr-2" />
                                                Start Building Workflow
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={async () => {
                                                    // Skip credentials, use environment variables
                                                    await handleBuild();
                                                }}
                                            >
                                                Use Environment Variables
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {step === 'field-ownership' && pendingWorkflowData && (
                        <div className="scroll-mt-6">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className={requiredSectionStyles.fieldOwnership.cardClass}>
                                    <CardHeader>
                                        <CardTitle className={requiredSectionStyles.fieldOwnership.titleClass}>
                                            <AlertCircle className="h-5 w-5" /> Field Ownership Required
                                        </CardTitle>
                                        <CardDescription>
                                            Two areas: workflow structure (forms, logic), then secrets and fill mode. Locked rows use OAuth, vault, or AI-filled values?finish accounts on the Credentials step.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {(() => {
                                            const update = (pendingWorkflowData as any)?.update;
                                            const blueprint = update?.structuralBlueprint;
                                            const structuralDiagnostics = update?.structuralDiagnostics;
                                            if (!blueprint && !structuralDiagnostics) return null;
                                            const nodeNarratives = Array.isArray(blueprint?.nodeNarratives)
                                                ? blueprint.nodeNarratives
                                                : [];
                                            const branchNarratives = Array.isArray(blueprint?.branchNarratives)
                                                ? blueprint.branchNarratives
                                                : [];
                                            const terminalObservability = Array.isArray(
                                                blueprint?.terminalObservability
                                            )
                                                ? blueprint.terminalObservability
                                                : [];
                                            const structuralErrors =
                                                Array.isArray(structuralDiagnostics?.errors) && structuralDiagnostics.errors.length > 0
                                                    ? structuralDiagnostics.errors
                                                    : [];
                                            const structuralWarnings =
                                                Array.isArray(structuralDiagnostics?.warnings) && structuralDiagnostics.warnings.length > 0
                                                    ? structuralDiagnostics.warnings
                                                    : [];
                                            return (
                                                <div className="rounded border border-indigo-400/30 bg-indigo-500/5 p-4 space-y-3">
                                                    <p className="text-sm font-semibold text-indigo-300">
                                                        Workflow Blueprint
                                                    </p>
                                                    {blueprint?.overviewText ? (
                                                        <p className="text-sm text-muted-foreground">
                                                            {blueprint.overviewText}
                                                        </p>
                                                    ) : null}
                                                    {structuralErrors.length > 0 || structuralWarnings.length > 0 ? (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-semibold text-red-300">
                                                                Structural issues
                                                            </p>
                                                            {structuralErrors.map((msg: string, idx: number) => (
                                                                <p key={`struct_err_${idx}`} className="text-xs text-red-200">
                                                                    - {msg}
                                                                </p>
                                                            ))}
                                                            {structuralWarnings.map((msg: string, idx: number) => (
                                                                <p key={`struct_warn_${idx}`} className="text-xs text-amber-200">
                                                                    - {msg}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    {nodeNarratives.length > 0 ? (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-semibold text-muted-foreground">
                                                                Node-by-node behavior
                                                            </p>
                                                            {nodeNarratives.map((n: any, idx: number) => (
                                                                <p key={`${n.nodeId || idx}`} className="text-xs">
                                                                    - {n.text}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    {branchNarratives.length > 0 ? (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-semibold text-muted-foreground">
                                                                Branch behavior
                                                            </p>
                                                            {branchNarratives.map((text: string, idx: number) => (
                                                                <p key={`branch_${idx}`} className="text-xs">
                                                                    - {text}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                    {terminalObservability.length > 0 ? (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-semibold text-muted-foreground">
                                                                Output observability
                                                            </p>
                                                            {terminalObservability.map((text: string, idx: number) => (
                                                                <p key={`terminal_${idx}`} className="text-xs">
                                                                    - {text}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })()}
                                        {/* Walk Me Through All Fields — single button for the entire ownership stage */}
                                        <div className="flex items-center gap-3 py-1">
                                            <button
                                                type="button"
                                                onClick={() => startGlobalWalkThrough(ownershipStructuralByNode as any, ownershipSecretsByNode as any)}
                                                className="flex items-center gap-1.5 text-[12px] text-violet-400 hover:text-violet-300 transition-colors px-0 bg-transparent border-0 cursor-pointer font-medium"
                                            >
                                                {globalWalkActive ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                )}
                                                {globalWalkActive
                                                    ? `${globalWalkActive.currentNodeLabel} · ${globalWalkActive.currentFieldLabel} (${globalWalkActive.currentFieldIdx + 1}/${globalWalkActive.totalFields}) — click to stop`
                                                    : 'Walk me through all fields'}
                                            </button>
                                            {globalWalkActive && (
                                                <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-violet-500/60 transition-all duration-500"
                                                        style={{ width: `${Math.round(((globalWalkActive.currentFieldIdx + 1) / globalWalkActive.totalFields) * 100)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-8">
                                            {(
                                                [
                                                    {
                                                        key: 'structural',
                                                        title: 'Workflow structure',
                                                        description:
                                                            'Forms, conditions, and branching. Choose You for static values, AI (build) for one-time generation at build, or AI (runtime) when the field supports it.',
                                                        groups: ownershipStructuralByNode,
                                                    },
                                                    {
                                                        key: 'secrets',
                                                        title: 'Secrets & fill mode',
                                                        description:
                                                            'API keys, webhooks, and other values: You, AI (build), or AI (runtime) where supported. Vault and OAuth are completed on Credentials.',
                                                        groups: ownershipSecretsByNode,
                                                    },
                                                ] as const
                                            ).map((section) => (
                                                <div key={section.key} className="space-y-3">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                                                        <p className="text-xs text-muted-foreground">{section.description}</p>
                                                    </div>
                                                    {section.groups.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground rounded border border-dashed border-border/60 px-3 py-2">
                                                            No fields in this category for this workflow.
                                                        </p>
                                                    ) : (
                                                        section.groups.map((group) => {
                                                            const totals = group.fields.reduce(
                                                                (acc, question: any) => {
                                                                    const rowLocked =
                                                                        question.ownershipUiMode === 'locked' &&
                                                                        !(
                                                                            question.isUnlockableCredential &&
                                                                            isCredentialUnlocked(question)
                                                                        );
                                                                    if (rowLocked) {
                                                                        acc.locked += 1;
                                                                        return acc;
                                                                    }
                                                                    const modeKey = `mode_${question.nodeId}_${question.fieldName}`;
                                                                    const selectedMode =
                                                                        ownershipEffectiveModes.byModeKey[modeKey] ||
                                                                        resolveWizardFieldFillMode(
                                                                            fillModeValues[modeKey],
                                                                            question.fillModeDefault as
                                                                                | 'manual_static'
                                                                                | 'runtime_ai'
                                                                                | 'buildtime_ai_once'
                                                                                | undefined
                                                                        );
                                                                    if (selectedMode === 'runtime_ai') acc.aiRun += 1;
                                                                    else if (selectedMode === 'buildtime_ai_once')
                                                                        acc.aiBuild += 1;
                                                                    else acc.you += 1;
                                                                    return acc;
                                                                },
                                                                { you: 0, aiBuild: 0, aiRun: 0, locked: 0 }
                                                            );
                                                            return (
                                                                <div
                                                                    key={`${section.key}_${group.nodeId}`}
                                                                    className="rounded border border-border/60 p-3 space-y-3"
                                                                >
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div>
                                                                            <p className="text-sm font-semibold">{group.nodeLabel}</p>
                                                                            <p className="text-xs text-muted-foreground">{group.nodeType}</p>
                                                                        </div>
                                                                    </div>
                                                                    {/* On-demand AI node description */}
                                                                    {(() => {
                                                                        const descKey = `desc_${section.key}_${group.nodeId}`;
                                                                        const descState = nodeDescriptions[descKey];
                                                                        return (
                                                                            <div className="space-y-2">
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={descState?.loading}
                                                                                    onClick={() =>
                                                                                        fetchNodeDescription(
                                                                                            descKey,
                                                                                            group.nodeType,
                                                                                            group.nodeLabel,
                                                                                            group.nodeId
                                                                                        )
                                                                                    }
                                                                                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors px-0 bg-transparent border-0 cursor-pointer"
                                                                                >
                                                                                    <Sparkles className="h-3 w-3" />
                                                                                    {descState?.loading
                                                                                        ? 'Analyzing…'
                                                                                        : descState?.open
                                                                                        ? 'Hide description'
                                                                                        : 'What does this node do?'}
                                                                                </button>
                                                                                {descState?.open && descState?.text && (
                                                                                    <div className="rounded border border-indigo-400/20 bg-indigo-500/5 px-3 py-2">
                                                                                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                                                                                            {descState.text}
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        {group.fields.map((question: any, idx: number) => {
                                                                            const modeKey = `mode_${question.nodeId}_${question.fieldName}`;
                                                                            const selectedMode =
                                                                                ownershipEffectiveModes.byModeKey[modeKey] ||
                                                                                resolveWizardFieldFillMode(
                                                                                    fillModeValues[modeKey],
                                                                                    question.fillModeDefault as
                                                                                        | 'manual_static'
                                                                                        | 'runtime_ai'
                                                                                        | 'buildtime_ai_once'
                                                                                        | undefined
                                                                                );
                                                                            const locked =
                                                                                question.ownershipUiMode === 'locked' &&
                                                                                !(
                                                                                    question.isUnlockableCredential &&
                                                                                    isCredentialUnlocked(question)
                                                                                );
                                                                            const showBuildButton = question.supportsBuildtimeAI !== false;
                                                                            const showRuntimeButton = question.supportsRuntimeAI !== false;
                                                                            // -- Per-field on/off toggle --
                                                                            const fieldEnabledKey = `fieldEnabled_${question.nodeId}_${question.fieldName}`;
                                                                            const hasAiPrefilledValue = !!(question.aiFilledAtBuildTime || question.aiUsesRuntime);
                                                                            const fieldEnabled: boolean =
                                                                                fieldEnabledOverrides[fieldEnabledKey] !== undefined
                                                                                    ? fieldEnabledOverrides[fieldEnabledKey]
                                                                                    : hasAiPrefilledValue;
                                                                            const rowExplanation = explainWizardOwnershipRow(
                                                                                question,
                                                                                { locked, aiDisabled: false }
                                                                            );
                                                                            const unlockKey = `unlock_${question.nodeId}_${question.fieldName}`;
                                                                            const primaryLabel =
                                                                                question.text ||
                                                                                question.label ||
                                                                                question.fieldName;
                                                                            const nodeFieldDescState = fieldDescriptions[String(question.nodeId || '')];
                                                                            const aiFieldDesc: FieldDesc | null = nodeFieldDescState?.data?.[String(question.fieldName || '')] ?? null;
                                                                            const fieldHelpKey = `fieldhelp_${question.nodeId}_${question.fieldName}`;
                                                                            const fieldHelpOpen = !!fieldHelpExpanded[fieldHelpKey];
                                                                            const fieldOwnershipCopy = buildFieldOwnershipCopy(question, aiFieldDesc, {
                                                                                selectedMode,
                                                                                fieldEnabled,
                                                                                locked,
                                                                            });
                                                                            const preparedOwnershipExample = prepareActionableFieldExample(question, aiFieldDesc?.actionableExample || null);
                                                                            const appliedKey = `${question.nodeId}_${question.fieldName}`;
                                                                            const exampleApplied = appliedExampleKeys[appliedKey] === true;
                                                                            const applyOwnershipExample = () => {
                                                                                if (!preparedOwnershipExample?.canApply) return;
                                                                                const questionKey = String(question.id || '');
                                                                                if (!questionKey) return;
                                                                                if (question.category === 'credential' && question.isVaultCredential) {
                                                                                    setCredentialValues((prev) => ({
                                                                                        ...prev,
                                                                                        [questionKey]: preparedOwnershipExample.valueForInput,
                                                                                    }));
                                                                                } else {
                                                                                    setInputValues((prev) => ({
                                                                                        ...prev,
                                                                                        [questionKey]: preparedOwnershipExample.valueForInput,
                                                                                    }));
                                                                                }
                                                                                setFillModeValues((prev) => ({
                                                                                    ...prev,
                                                                                    [modeKey]: 'buildtime_ai_once',
                                                                                }));
                                                                                setFieldEnabledOverrides((prev) => ({
                                                                                    ...prev,
                                                                                    [fieldEnabledKey]: true,
                                                                                }));
                                                                                setAppliedExampleKeys((prev) => ({
                                                                                    ...prev,
                                                                                    [appliedKey]: true,
                                                                                }));
                                                                                setAppliedFieldGuidanceExamples((prev) => ({
                                                                                    ...prev,
                                                                                    [appliedKey]: {
                                                                                        nodeId: String(question.nodeId || ''),
                                                                                        fieldName: String(question.fieldName || ''),
                                                                                        mode: 'buildtime_ai_once',
                                                                                        source: preparedOwnershipExample.source || 'ai_field_guidance',
                                                                                    },
                                                                                }));
                                                                            };
                                                                            const ownershipFooterText =
                                                                                rowExplanation ||
                                                                                (String(question.ownershipClass || '') !==
                                                                                'structural'
                                                                                    ? 'Select ownership for this field'
                                                                                    : null);
                                                                            const planeRowForPreview = findPlaneRow(
                                                                                fieldPlaneRows,
                                                                                String(question.nodeId || ''),
                                                                                String(question.fieldName || '')
                                                                            );
                                                                            const fromNodeSnapshot = snapshotConfigFieldToString(
                                                                                planeRowForPreview?.valueSnapshot
                                                                            );
                                                                            const fromQuestionDefaultPreview =
                                                                                question.defaultValue !== undefined &&
                                                                                question.defaultValue !== null
                                                                                    ? snapshotConfigFieldToString(
                                                                                          question.defaultValue
                                                                                      )
                                                                                    : '';
                                                                            const workflowPreviewText =
                                                                                fromNodeSnapshot &&
                                                                                String(fromNodeSnapshot).trim() !== ''
                                                                                    ? fromNodeSnapshot
                                                                                    : fromQuestionDefaultPreview &&
                                                                                        String(fromQuestionDefaultPreview).trim() !==
                                                                                            ''
                                                                                      ? fromQuestionDefaultPreview
                                                                                      : '';
                                                                            return (
                                                                                <div
                                                                                    key={`${section.key}_${question.id || idx}`}
                                                                                    className="rounded border border-border/40 overflow-hidden"
                                                                                    onClick={() =>
                                                                                        setGuideSelectedField({
                                                                                            nodeId: String(question.nodeId || ''),
                                                                                            fieldName: String(question.fieldName || ''),
                                                                                        })
                                                                                    }
                                                                                >
                                                                                    {/* -- Header row: label + on/off toggle -- */}
                                                                                    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/10">
                                                                                        <div className="min-w-0 flex-1">
                                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                                <p className="text-sm font-medium">{primaryLabel}</p>
                                                                                                {question.aiFilledAtBuildTime ? (
                                                                                                    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-200" title="Filled by AI when the workflow was generated">
                                                                                                        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                                                                                                        AI prefilled
                                                                                                    </span>
                                                                                                ) : null}
                                                                                                {question.aiUsesRuntime && !question.aiFilledAtBuildTime ? (
                                                                                                    <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200" title="AI fills this at runtime">
                                                                                                        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                                                                                                        AI at runtime
                                                                                                    </span>
                                                                                                ) : null}
                                                                                                {question.aiBuildTimePending && !question.aiFilledAtBuildTime ? (
                                                                                                    <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-200">
                                                                                                        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                                                                                                        AI build ? empty
                                                                                                    </span>
                                                                                                ) : null}
                                                                                            </div>
                                                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                                                <span className="font-medium text-foreground/80">{group.nodeLabel}</span>
                                                                                                <span className="mx-1 opacity-40">?</span>
                                                                                                <span className="font-mono text-[11px] opacity-75">{question.fieldName}</span>
                                                                                            </p>
                                                                                            <button
                                                                                                type="button"
                                                                                                disabled={nodeFieldDescState?.loading}
                                                                                                onClick={(event) => {
                                                                                                    event.stopPropagation();
                                                                                                    const willOpen = !fieldHelpOpen;
                                                                                                    setFieldHelpExpanded((prev) => ({
                                                                                                        ...prev,
                                                                                                        [fieldHelpKey]: willOpen,
                                                                                                    }));
                                                                                                    const nodeId = String(group.nodeId || '');
                                                                                                    const fieldName = String(question.fieldName || '').trim();
                                                                                                    const requestKey = `${nodeId}:${fieldName}`;
                                                                                                    if (
                                                                                                        willOpen &&
                                                                                                        nodeId &&
                                                                                                        fieldName &&
                                                                                                        !nodeFieldDescState?.data?.[String(question.fieldName || '')] &&
                                                                                                        !nodeFieldDescState?.loading &&
                                                                                                        !fieldDescFetchedRef.current.has(requestKey)
                                                                                                    ) {
                                                                                                        fieldDescFetchedRef.current.add(requestKey);
                                                                                                        fetchFieldDescriptions(
                                                                                                            nodeId,
                                                                                                            String(group.nodeType || ''),
                                                                                                            String(group.nodeLabel || ''),
                                                                                                            [{
                                                                                                                ...question,
                                                                                                                selectedMode,
                                                                                                                fieldEnabled,
                                                                                                                currentValue: question.defaultValue || null,
                                                                                                            }],
                                                                                                            requestKey
                                                                                                        );
                                                                                                    }
                                                                                                }}
                                                                                                className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors px-0 bg-transparent border-0 cursor-pointer"
                                                                                            >
                                                                                                <Sparkles className="h-3 w-3" />
                                                                                                {nodeFieldDescState?.loading
                                                                                                    ? 'Analyzing this field...'
                                                                                                    : fieldHelpOpen
                                                                                                      ? 'Hide input field help'
                                                                                                      : 'What does this input field do?'}
                                                                                            </button>
                                                                                        </div>
                                                                                        <Switch
                                                                                            checked={fieldEnabled}
                                                                                            onCheckedChange={(v) =>
                                                                                                setFieldEnabledOverrides((prev) => ({
                                                                                                    ...prev,
                                                                                                    [fieldEnabledKey]: v,
                                                                                                }))
                                                                                            }
                                                                                            aria-label={`Enable ${primaryLabel}`}
                                                                                        />
                                                                                    </div>

                                                                                    {/* -- OFF: collapsed preview -- */}
                                                                                    {!fieldEnabled && !fieldHelpOpen && (
                                                                                        <div className="px-3 py-2 border-t border-border/20 space-y-1">
                                                                                            <p className="text-[11px] text-muted-foreground/55 italic leading-snug">
                                                                                                {fieldOwnershipCopy.offBehavior}
                                                                                            </p>
                                                                                            {workflowPreviewText ? (
                                                                                                <p className="text-[10px] text-muted-foreground/40 font-mono truncate">Current value: {workflowPreviewText.slice(0, 100)}</p>
                                                                                            ) : null}
                                                                                        </div>
                                                                                    )}

                                                                                    {/* -- ON: compact ownership hint when help panel is closed -- */}
                                                                                    {fieldEnabled && !fieldHelpOpen && !locked && (
                                                                                        <div className="px-3 py-1.5 border-t border-border/20 flex items-center justify-between gap-2">
                                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                                Owner:{' '}
                                                                                                <span className="font-medium text-foreground/80">
                                                                                                    {selectedMode === 'manual_static' ? 'You'
                                                                                                        : selectedMode === 'buildtime_ai_once' ? 'AI Build'
                                                                                                        : 'AI Runtime'}
                                                                                                </span>
                                                                                            </p>
                                                                                            <button
                                                                                                type="button"
                                                                                                className="text-[10px] text-muted-foreground/70 hover:text-foreground/90 underline"
                                                                                                onClick={() =>
                                                                                                    setFieldHelpExpanded((prev) => ({
                                                                                                        ...prev,
                                                                                                        [fieldHelpKey]: true,
                                                                                                    }))
                                                                                                }
                                                                                            >
                                                                                                Change ownership
                                                                                            </button>
                                                                                        </div>
                                                                                    )}

                                                                                    <FieldOwnershipHelpPanel
                                                                                        fieldHelpOpen={fieldHelpOpen}
                                                                                        isLoading={!!nodeFieldDescState?.loading}
                                                                                        hasAiData={!!aiFieldDesc}
                                                                                        fieldEnabled={fieldEnabled}
                                                                                        locked={locked}
                                                                                        selectedMode={selectedMode}
                                                                                        showBuildButton={showBuildButton}
                                                                                        showRuntimeButton={showRuntimeButton}
                                                                                        ownershipFooterText={ownershipFooterText}
                                                                                        fieldOwnershipCopy={fieldOwnershipCopy}
                                                                                        actionableExample={preparedOwnershipExample}
                                                                                        exampleApplied={exampleApplied}
                                                                                        onModeChange={(mode) =>
                                                                                            setFillModeValues((prev) => ({
                                                                                                ...prev,
                                                                                                [modeKey]: mode,
                                                                                            }))
                                                                                        }
                                                                                        onApplyExample={applyOwnershipExample}
                                                                                    />

                                                                                    {/* -- ON: full controls -- */}
                                                                                    {fieldEnabled && (
                                                                                    <div className="px-3 pb-3 pt-2 border-t border-border/20 space-y-2">
                                                                                    {question.isUnlockableCredential &&
                                                                                    question.ownershipUiMode === 'locked' ? (
                                                                                        <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 px-2 py-1.5">
                                                                                            <Label
                                                                                                htmlFor={unlockKey}
                                                                                                className="text-xs font-medium text-muted-foreground cursor-pointer"
                                                                                            >
                                                                                                Unlock ownership (User vs AI)
                                                                                            </Label>
                                                                                            <Switch
                                                                                                id={unlockKey}
                                                                                                checked={isCredentialUnlocked(question)}
                                                                                                onCheckedChange={(v) =>
                                                                                                    setCredentialUnlockOverrides((prev) => ({
                                                                                                        ...prev,
                                                                                                        [unlockKey]: v,
                                                                                                    }))
                                                                                                }
                                                                                            />
                                                                                        </div>
                                                                                    ) : null}
                                                                                    {locked && question.aiFilledAtBuildTime ? (
                                                                                        <div className="mt-2 rounded border border-muted p-2 space-y-1">
                                                                                            <p className="text-[11px] text-muted-foreground">Value was set at generation; this row stays locked for this field type.</p>
                                                                                            {workflowPreviewText ? (
                                                                                                <pre className="text-[11px] whitespace-pre-wrap break-words max-h-28 overflow-auto font-mono text-left text-foreground/90">{workflowPreviewText}</pre>
                                                                                            ) : null}
                                                                                        </div>
                                                                                    ) : null}
                                                                                    {!locked && workflowPreviewText ? (
                                                                                        <div className="mt-2 rounded border border-emerald-500/25 bg-emerald-500/5 p-2">
                                                                                            <p className="text-[11px] text-muted-foreground mb-1">Current value in workflow (edit on Configuration step)</p>
                                                                                            <pre className="text-[11px] whitespace-pre-wrap break-words max-h-40 overflow-auto font-mono text-left">{workflowPreviewText}</pre>
                                                                                        </div>
                                                                                    ) : null}
                                                                                    {!locked && !workflowPreviewText && question.aiFilledAtBuildTime && (
                                                                                        <div className="mt-2 rounded border border-emerald-500/20 bg-emerald-500/5 p-2">
                                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                                AI prefilled this field, but the value is not shown here (e.g. complex JSON). Open the{' '}
                                                                                                <span className="font-medium text-foreground/80">Configuration</span>{' '}
                                                                                                step to view or edit it.
                                                                                            </p>
                                                                                        </div>
                                                                                    )}
                                                                                    {(question.ownershipClass === 'credential' || question.isVaultCredential) && (() => {
                                                                                        const helpKey = `credhelp_${question.nodeId}_${question.fieldName}`;
                                                                                        const isExpanded = !!credHelpExpanded[helpKey];
                                                                                        const viewMode = credHelpViewMode[helpKey] ?? 'simple';
                                                                                        const nodeLabel = String(question.nodeLabel || question.nodeType || 'this node');
                                                                                        // Look up AI-generated guidance from discoveredCredentials (matched by nodeId + vaultKey)
                                                                                        const discoveredCreds: any[] = pendingWorkflowData?.discoveredCredentials || [];
                                                                                        const matchedCred = discoveredCreds.find((c: any) =>
                                                                                            (question.credential?.vaultKey && c.vaultKey === question.credential.vaultKey) ||
                                                                                            (Array.isArray(c.nodeIds) && c.nodeIds.includes(question.nodeId))
                                                                                        );
                                                                                        const simpleText = matchedCred?.simpleDescription || `This credential authorizes ${nodeLabel} to act on your behalf. Find it in the service's settings, API, or developer console.`;
                                                                                        const technicalText = matchedCred?.technicalDescription || `Credential for ${nodeLabel}. Injected at execution time from the secure vault. Not logged. Reference as {{$credentials.<fieldName>}} in custom expressions if needed.`;
                                                                                        const howToObtain = matchedCred?.howToObtain || '';
                                                                                        return (
                                                                                            <div className="mt-2 border border-border/40 rounded-md overflow-hidden">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/30 transition-colors text-left"
                                                                                                    onClick={() => setCredHelpExpanded(prev => ({ ...prev, [helpKey]: !isExpanded }))}
                                                                                                >
                                                                                                    <span>Why do I need this? How do I get it?</span>
                                                                                                    <span className="ml-2 opacity-60">{isExpanded ? '?' : '?'}</span>
                                                                                                </button>
                                                                                                {isExpanded && (
                                                                                                    <div className="px-2 pb-2 pt-1 bg-muted/10 space-y-2">
                                                                                                        <div className="flex gap-1">
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${viewMode === 'simple' ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 text-muted-foreground hover:bg-muted/30'}`}
                                                                                                                onClick={() => setCredHelpViewMode(prev => ({ ...prev, [helpKey]: 'simple' }))}
                                                                                                            >
                                                                                                                Simple
                                                                                                            </button>
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${viewMode === 'technical' ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 text-muted-foreground hover:bg-muted/30'}`}
                                                                                                                onClick={() => setCredHelpViewMode(prev => ({ ...prev, [helpKey]: 'technical' }))}
                                                                                                            >
                                                                                                                Technical
                                                                                                            </button>
                                                                                                        </div>
                                                                                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                                                                            {viewMode === 'simple' ? simpleText : technicalText}
                                                                                                        </p>
                                                                                                        {howToObtain && (
                                                                                                            <div className="mt-1 pt-1 border-t border-border/30">
                                                                                                                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">How to get it:</p>
                                                                                                                <p className="text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed">{howToObtain}</p>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                    </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <Button type="button" className="w-full" onClick={proceedFromOwnershipStage}>
                                            Proceed To Credentials
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {/* Unified configuration: show during setup phases (e.g. configuring_inputs) and when ready */}
                    {step === 'configuration' && 
                     pendingWorkflowData && 
                     pendingWorkflowData.nodes?.length > 0 &&
                     configurationPhaseUnlocked && (
                        <div className="scroll-mt-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className={requiredSectionStyles.configuration.cardClass}>
                                    <CardHeader>
                                        <CardTitle className={requiredSectionStyles.configuration.titleClass}>
                                            <AlertCircle className="h-5 w-5" /> Configuration Details Required
                                        </CardTitle>
                                        <CardDescription>
                                            Please provide the following configuration values to complete the workflow setup.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* ? STEP-BY-STEP: Show one question at a time */}
                                        {manualConfigurationQuestions.length > 0 && currentQuestionIndex < manualConfigurationQuestions.length ? (
                                            <div className="space-y-4" id={`question-container-${currentQuestionIndex}`}>
                                                {/* Progress indicator */}
                                                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                                    <span>Question {currentQuestionIndex + 1} of {manualConfigurationQuestions.length}</span>
                                                    <div className="flex gap-1">
                                                        {manualConfigurationQuestions.map((_, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`h-2 w-2 rounded-full ${
                                                                    idx === currentQuestionIndex
                                                                        ? 'bg-amber-400'
                                                                        : idx < currentQuestionIndex
                                                                        ? 'bg-green-500'
                                                                        : 'bg-gray-600'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                {/* Current Question */}
                                                {(() => {
                                                    const question = manualConfigurationQuestions[currentQuestionIndex];
                                                    const questionKey = question.id;
                                                    const questionLabel = question.label || `${question.nodeLabel} - ${question.fieldName}`;
                                                    const isInputDisabled = false;
                                                    const isManualRequired = question.required;
                                                    const runtimeValueMeta = lastResolvedInputs?.[question.nodeId]?.[question.fieldName];
                                                    const isCredVaultQ =
                                                        question.category === 'credential' && (question as any).isVaultCredential;
                                                    const rawSelectAnswer = isCredVaultQ ? credentialValues[questionKey] : inputValues[questionKey];
                                                    const selectControlledValue =
                                                        question.options && question.options.length > 0
                                                            ? normalizeSelectValue(
                                                                  rawSelectAnswer,
                                                                  question.defaultValue,
                                                                  question.options
                                                              )
                                                            : (() => {
                                                                  if (rawSelectAnswer !== undefined && rawSelectAnswer !== null && String(rawSelectAnswer) !== '') {
                                                                      return String(rawSelectAnswer);
                                                                  }
                                                                  if (
                                                                      question.defaultValue !== undefined &&
                                                                      question.defaultValue !== null &&
                                                                      String(question.defaultValue) !== ''
                                                                  ) {
                                                                      return String(question.defaultValue);
                                                                  }
                                                                  return '';
                                                              })();
                                                    const rawTextAnswer = isCredVaultQ
                                                        ? credentialValues[questionKey]
                                                        : inputValues[questionKey];
                                                    const textControlledValue =
                                                        rawTextAnswer !== undefined && rawTextAnswer !== null
                                                            ? String(rawTextAnswer)
                                                            : question.defaultValue !== undefined && question.defaultValue !== null
                                                              ? String(question.defaultValue)
                                                              : '';
                                                    const configFieldDesc = fieldDescriptions[String(question.nodeId || '')]?.data?.[String(question.fieldName || '')] ?? null;
                                                    const preparedExample = prepareActionableFieldExample(question, configFieldDesc?.actionableExample || null);
                                                    const appliedKey = `${question.nodeId}_${question.fieldName}`;
                                                    const modeKey = `mode_${question.nodeId}_${question.fieldName}`;
                                                    const fieldEnabledKey = `fieldEnabled_${question.nodeId}_${question.fieldName}`;
                                                    const exampleApplied = appliedExampleKeys[appliedKey] === true;
                                                    const applyPreparedExample = () => {
                                                        if (!preparedExample?.canApply) return;
                                                        if (isCredVaultQ) {
                                                            setCredentialValues({
                                                                ...credentialValues,
                                                                [questionKey]: preparedExample.valueForInput,
                                                            });
                                                        } else {
                                                            setInputValues({
                                                                ...inputValues,
                                                                [questionKey]: preparedExample.valueForInput,
                                                            });
                                                        }
                                                        setFillModeValues((prev) => ({
                                                            ...prev,
                                                            [modeKey]: 'buildtime_ai_once',
                                                        }));
                                                        setFieldEnabledOverrides((prev) => ({
                                                            ...prev,
                                                            [fieldEnabledKey]: true,
                                                        }));
                                                        setAppliedExampleKeys((prev) => ({
                                                            ...prev,
                                                            [appliedKey]: true,
                                                        }));
                                                        setAppliedFieldGuidanceExamples((prev) => ({
                                                            ...prev,
                                                            [appliedKey]: {
                                                                nodeId: String(question.nodeId || ''),
                                                                fieldName: String(question.fieldName || ''),
                                                                mode: 'buildtime_ai_once',
                                                                source: preparedExample.source || 'ai_field_guidance',
                                                            },
                                                        }));
                                                    };
                                                    return (
                                                        <div className="space-y-4">
                                                            <div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <Label htmlFor={`question-${currentQuestionIndex}`} className="text-base font-semibold">
                                                                        {questionLabel}
                                                                        {question.required && <span className={requiredSectionStyles.configuration.requiredIndicatorClass}>*</span>}
                                                                    </Label>
                                                                    {(() => {
                                                                        const fieldHelp = resolveFieldHelpContent({
                                                                            nodeType: String(question.nodeType || ''),
                                                                            fieldName: String(question.fieldName || ''),
                                                                            fieldLabel: questionLabel,
                                                                            fieldType: String(question.type || 'text'),
                                                                            placeholder: question.placeholder ? String(question.placeholder) : undefined,
                                                                            description: question.description ? String(question.description) : undefined,
                                                                            helpText: (question as any).helpText ? String((question as any).helpText) : undefined,
                                                                            helpCategory: (question as any).helpCategory ? String((question as any).helpCategory) : undefined,
                                                                            docsUrl: (question as any).docsUrl ? String((question as any).docsUrl) : undefined,
                                                                            exampleValue: (question as any).exampleValue ? String((question as any).exampleValue) : undefined,
                                                                            example: question.example,
                                                                            options: question.options,
                                                                            nodeLabel: question.nodeLabel ? String(question.nodeLabel) : undefined,
                                                                            config: (question as any).config || (question as any).nodeConfig || {
                                                                                operation: (question as any).operation || (question as any).action || (question as any).operationValue,
                                                                                resource: (question as any).resource,
                                                                            },
                                                                            operation: (question as any).operation || (question as any).action || (question as any).operationValue,
                                                                            resource: (question as any).resource,
                                                                        });
                                                                        return fieldHelp ? (
                                                                            <HelpTooltip
                                                                                helpText={fieldHelp}
                                                                                ariaLabel={`Help for ${questionLabel}`}
                                                                                side="top"
                                                                            />
                                                                        ) : null;
                                                                    })()}
                                                                </div>
                                                                {question.description && (
                                                                    <p className="text-sm text-muted-foreground mt-1">{question.description}</p>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Render input based on type */}
                                                            {question.type === 'select' || (question.options && question.options.length > 0) ? (
                                                                <Select
                                                                    value={selectControlledValue}
                                                                    onValueChange={(value) => {
                                                                        if (isInputDisabled) {
                                                                            return;
                                                                        }
                                                                        if (isCredVaultQ) {
                                                                            setCredentialValues({
                                                                                ...credentialValues,
                                                                                [questionKey]: value,
                                                                            });
                                                                        } else {
                                                                        setInputValues({
                                                                            ...inputValues,
                                                                            [questionKey]: value,
                                                                        });
                                                                        }
                                                                        console.log(`[Frontend] Selected ${question.fieldName} = ${value} (key: ${questionKey}, category: ${question.category})`);
                                                                    }}
                                                                >
                                                                    <SelectTrigger id={`question-${currentQuestionIndex}`} className="w-full">
                                                                        <SelectValue placeholder={question.placeholder || `Select ${question.fieldName}`} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {question.options && question.options.length > 0 ? (
                                                                            question.options.map((option: any, optIdx: number) => {
                                                                                const optionValue = typeof option === 'string' ? option : option.value;
                                                                                const optionLabel = typeof option === 'string' ? option : (option.label || option.value);
                                                                                // ? Radix Select forbids empty-string item values
                                                                                if (String(optionValue ?? '').trim().length === 0) {
                                                                                    return null;
                                                                                }
                                                                                return (
                                                                                    <SelectItem key={optIdx} value={String(optionValue)}>
                                                                                        {optionLabel}
                                                                                    </SelectItem>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <div className="px-2 py-1 text-sm text-muted-foreground">
                                                                                No options available
                                                                            </div>
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : question.type === 'textarea' || question.fieldType === 'textarea' || question.type === 'json' ? (
                                                                <Textarea
                                                                    id={`question-${currentQuestionIndex}`}
                                                                    placeholder={
                                                                        isInputDisabled
                                                                            ? 'This value will be filled automatically at runtime by AI.'
                                                                            : (question.description || question.placeholder || `Enter ${question.fieldName}`)
                                                                    }
                                                                    className="w-full font-mono text-sm min-h-[120px]"
                                                                    value={textControlledValue}
                                                                    onChange={(e) => {
                                                                        if (isInputDisabled) {
                                                                            return;
                                                                        }
                                                                        if (isCredVaultQ) {
                                                                            setCredentialValues({
                                                                                ...credentialValues,
                                                                                [questionKey]: e.target.value,
                                                                            });
                                                                        } else {
                                                                            setInputValues({
                                                                        ...inputValues,
                                                                        [questionKey]: e.target.value,
                                                                            });
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Input
                                                                    id={`question-${currentQuestionIndex}`}
                                                                    type={question.type === 'number' ? 'number' : (question.type === 'password' ? 'password' : 'text')}
                                                                    placeholder={
                                                                        isInputDisabled
                                                                            ? 'This value will be filled automatically at runtime by AI.'
                                                                            : (question.description || question.placeholder || `Enter ${question.fieldName}`)
                                                                    }
                                                                    className="w-full"
                                                                    value={textControlledValue}
                                                                    onChange={(e) => {
                                                                        if (isInputDisabled) {
                                                                            return;
                                                                        }
                                                                        if (isCredVaultQ) {
                                                                            setCredentialValues({
                                                                                ...credentialValues,
                                                                                [questionKey]: e.target.value,
                                                                            });
                                                                        } else {
                                                                            setInputValues({
                                                                        ...inputValues,
                                                                        [questionKey]: e.target.value,
                                                                            });
                                                                        }
                                                                    }}
                                                                />
                                                            )}

                                                            {preparedExample && preparedExample.displayValue && (
                                                                <div className="rounded border border-sky-500/25 bg-sky-500/5 p-3">
                                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-xs font-medium text-foreground/85">AI suggested example</p>
                                                                            <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground">
                                                                                {preparedExample.displayValue}
                                                                            </pre>
                                                                            {!preparedExample.canApply && preparedExample.reason ? (
                                                                                <p className="mt-1 text-[10px] text-muted-foreground/70">{preparedExample.reason}</p>
                                                                            ) : null}
                                                                            {exampleApplied && (
                                                                                <p className="mt-1 text-[10px] font-medium text-sky-600 dark:text-sky-300">
                                                                                    Applied as AI Build
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        {preparedExample.canApply && (
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant={exampleApplied ? 'secondary' : 'outline'}
                                                                                className="shrink-0"
                                                                                onClick={applyPreparedExample}
                                                                            >
                                                                                {exampleApplied ? 'Use again' : 'Use this example'}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {runtimeValueMeta && (
                                                                <div className="rounded border border-border/60 bg-muted/30 p-2">
                                                                    <p className="text-xs font-medium text-foreground/80">Last runtime value (read-only)</p>
                                                                    <pre className="mt-1 max-h-24 overflow-auto text-[10px] font-mono whitespace-pre-wrap break-words">
                                                                        {typeof runtimeValueMeta.value === 'string'
                                                                            ? runtimeValueMeta.value
                                                                            : JSON.stringify(runtimeValueMeta.value, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}

                                                            {question.example && (
                                                                <p className="text-xs text-muted-foreground italic">
                                                                    Example: {typeof question.example === 'string' ? question.example : JSON.stringify(question.example)}
                                                                </p>
                                                            )}
                                                            
                                                            {/* Navigation Buttons */}
                                                            <div className="flex justify-between gap-2 pt-4">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        if (currentQuestionIndex > 0) {
                                                                            const prevIndex = currentQuestionIndex - 1;
                                                                            setCurrentQuestionIndex(prevIndex);
                                                                            // Smooth scroll to previous question
                                                                            setTimeout(() => {
                                                                                const questionElement = document.getElementById(`question-container-${prevIndex}`);
                                                                                if (questionElement) {
                                                                                    questionElement.scrollIntoView({ 
                                                                                        behavior: 'smooth', 
                                                                                        block: 'center',
                                                                                        inline: 'nearest' 
                                                                                    });
                                                                                } else {
                                                                                    // Fallback: scroll up a bit
                                                                                    window.scrollBy({ top: -200, behavior: 'smooth' });
                                                                                }
                                                                            }, 100);
                                                                        }
                                                                    }}
                                                                    disabled={currentQuestionIndex === 0}
                                                                >
                                                                    Previous
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        // Validate required field (only when manual input is required)
                                                                        const currentValue = (question.category === 'credential' && (question as any).isVaultCredential
                                                                            ? credentialValues[questionKey]
                                                                            : inputValues[questionKey]
                                                                        ) || '';
                                                                        if (isManualRequired && !String(currentValue).trim()) {
                                                                            toast({
                                                                                title: 'Required Field',
                                                                                description: `Please provide a value for ${questionLabel}`,
                                                                                variant: 'destructive',
                                                                            });
                                                                            return;
                                                                        }
                                                                        
                                                                        // Move to next question with smooth scroll
                                                                        if (currentQuestionIndex < manualConfigurationQuestions.length - 1) {
                                                                            const nextIndex = currentQuestionIndex + 1;
                                                                            setCurrentQuestionIndex(nextIndex);
                                                                            // Smooth scroll to next question
                                                                            setTimeout(() => {
                                                                                const questionElement = document.getElementById(`question-container-${nextIndex}`);
                                                                                if (questionElement) {
                                                                                    questionElement.scrollIntoView({ 
                                                                                        behavior: 'smooth', 
                                                                                        block: 'center',
                                                                                        inline: 'nearest' 
                                                                                    });
                                                                                } else {
                                                                                    // Fallback: scroll down a bit
                                                                                    window.scrollBy({ top: 200, behavior: 'smooth' });
                                                                                }
                                                                            }, 100);
                                                                        } else {
                                                                            // Last question - move to completion screen
                                                                            setCurrentQuestionIndex(manualConfigurationQuestions.length);
                                                                            // Scroll to completion screen
                                                                            setTimeout(() => {
                                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                            }, 100);
                                                                        }
                                                                    }}
                                                                    disabled={(() => {
                                                                        if (!isManualRequired) return false;
                                                                        const currentValue = (question.category === 'credential' && (question as any).isVaultCredential
                                                                            ? credentialValues[questionKey]
                                                                            : inputValues[questionKey]
                                                                        ) || '';
                                                                        return !String(currentValue).trim();
                                                                    })()}
                                                                >
                                                                    {currentQuestionIndex < manualConfigurationQuestions.length - 1 ? 'Next' : 'Continue Building'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : manualConfigurationQuestions.length > 0 && currentQuestionIndex >= manualConfigurationQuestions.length ? (
                                            /* Always ready ? workbench opens at any cost */
                                            <div className="space-y-4 text-center">
                                                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                                                <h3 className="text-lg font-semibold">Ready to open workflow</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Your workflow is saved and ready to open. Any missing credentials can be connected from the Connections page inside the workflow editor.
                                                </p>
                                            </div>
                                        ) : (
                                            /* Fallback: Show all questions at once if allQuestions is empty */
                                            <>
                                                {/* Node Inputs Section */}
                                                {pendingWorkflowData.discoveredInputs && pendingWorkflowData.discoveredInputs.length > 0 && (
                                                    <div className="space-y-4">
                                                        <h3 className="text-sm font-semibold text-foreground">Node Configuration</h3>
                                                        {pendingWorkflowData.discoveredInputs.map((input: any, i: number) => {
                                                    // ? COMPREHENSIVE: Use question ID if available (cred_*, op_*, config_*, resource_*), otherwise fall back to nodeId_fieldName
                                                    const inputKey = input.id || `${input.nodeId}_${input.fieldName}`;
                                                    const inputLabel = input.label || `${input.nodeLabel} - ${input.fieldName}`;
                                                    const isJsonOption = (opt: any) => {
                                                        const v = typeof opt === 'string' ? opt : opt?.value;
                                                        return typeof v === 'string' && v.includes('{{$json.');
                                                    };
                                                    // ? CORE ARCH REFACTOR:
                                                    // Filter out JSON/template options ({{$json.*}}) from dropdowns.
                                                    // AI Input Resolver will handle JSON-based mapping at runtime.
                                                    const nonJsonOptions = Array.isArray(input.options)
                                                        ? input.options.filter((opt: any) => !isJsonOption(opt))
                                                        : [];
                                                    const hasNonJsonOptions = nonJsonOptions.length > 0;
                                                    const isAIManagedField =
                                                        !hasNonJsonOptions &&
                                                        (input.type === 'select' ||
                                                            ['to', 'subject', 'body'].includes(
                                                                String(input.fieldName || '').toLowerCase()
                                                            ));
                                                    
                                                    return (
                                                        <div key={i} className="space-y-2">
                                                            <Label htmlFor={`input-${i}`} className="text-sm font-medium">
                                                                {inputLabel}
                                                                {input.required && <span className="text-red-400 ml-1">*</span>}
                                                            </Label>
                                                            {/* ? CORE ARCH REFACTOR:
                                                                 - If this field is AI-managed (only JSON/template options), do NOT show dropdown.
                                                                 - Show read-only message instead: AI will generate this dynamically.
                                                               */}
                                                            {isAIManagedField ? (
                                                                <div className="text-xs text-muted-foreground border border-dashed border-border/60 rounded px-3 py-2 bg-muted/40">
                                                                    <p className="font-medium text-foreground/80">
                                                                        Filled automatically by AI
                                                                    </p>
                                                                    <p className="mt-1">
                                                                        This field will be generated dynamically at runtime based on
                                                                        previous node output and your workflow intent. No manual
                                                                        selection is required.
                                                                    </p>
                                                                </div>
                                                            ) : (input.type === 'select' || (input.options && input.options.length > 0)) ? (
                                                                <Select
                                                                    value={
                                                                        nonJsonOptions.length > 0
                                                                            ? normalizeSelectValue(
                                                                                  inputValues[inputKey],
                                                                                  input.defaultValue,
                                                                                  nonJsonOptions
                                                                              )
                                                                            : String(inputValues[inputKey] ?? input.defaultValue ?? '')
                                                                    }
                                                                    onValueChange={(value) => {
                                                                        setInputValues({
                                                                            ...inputValues,
                                                                            [inputKey]: value,
                                                                        });
                                                                        console.log(`[Frontend] Selected ${input.fieldName} = ${value} for node ${input.nodeId} (key: ${inputKey})`);
                                                                    }}
                                                                    >
                                                                    <SelectTrigger id={`input-${i}`} className="w-full">
                                                                        <SelectValue placeholder={input.placeholder || `Select ${input.fieldName}`} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {nonJsonOptions.length > 0 ? (
                                                                            nonJsonOptions.map((option: any, optIdx: number) => {
                                                                                const optionValue = typeof option === 'string' ? option : option.value;
                                                                                const optionLabel = typeof option === 'string' ? option : (option.label || option.value);
                                                                                // ? Radix Select forbids empty-string item values
                                                                                if (String(optionValue ?? '').trim().length === 0) {
                                                                                    return null;
                                                                                }
                                                                                return (
                                                                                    <SelectItem key={optIdx} value={String(optionValue)}>
                                                                                        {optionLabel}
                                                                                    </SelectItem>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <div className="px-2 py-1 text-sm text-muted-foreground">
                                                                                No options available
                                                                            </div>
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : input.type === 'textarea' || input.fieldType === 'textarea' || input.type === 'json' ? (
                                                                <Textarea
                                                                    id={`input-${i}`}
                                                                    placeholder={input.description || input.placeholder || `Enter ${input.fieldName}`}
                                                                    className="w-full font-mono text-sm"
                                                                    value={inputValues[inputKey] || input.defaultValue || ''}
                                                                    onChange={(e) => setInputValues({
                                                                        ...inputValues,
                                                                        [inputKey]: e.target.value,
                                                                    })}
                                                                />
                                                            ) : (
                                                                <Input
                                                                    id={`input-${i}`}
                                                                    type={input.type === 'number' ? 'number' : 'text'}
                                                                    placeholder={input.description || input.placeholder || `Enter ${input.fieldName}`}
                                                                    className="w-full"
                                                                    value={inputValues[inputKey] || input.defaultValue || ''}
                                                                    onChange={(e) => setInputValues({
                                                                        ...inputValues,
                                                                        [inputKey]: e.target.value,
                                                                    })}
                                                                />
                                                            )}
                                                            {input.description && (
                                                                <p className="text-xs text-muted-foreground">{input.description}</p>
                                                            )}
                                                            {input.example && (
                                                                <p className="text-xs text-muted-foreground italic">
                                                                    Example: {typeof input.example === 'string' ? input.example : JSON.stringify(input.example)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        
                                        {/* Vault/OAuth: single path is the Credentials step (avoid duplicating discoveredCredentials here). */}
                                        {pendingWorkflowData.discoveredCredentials &&
                                            pendingWorkflowData.discoveredCredentials.length > 0 && (
                                                <div className="space-y-2 pt-4 border-t border-border/60">
                                                    <p className="text-sm text-muted-foreground">
                                                        Secrets and account connections are handled on the{' '}
                                                        <button
                                                            type="button"
                                                            className="text-primary underline underline-offset-2 hover:text-primary/90"
                                                            onClick={() => setStep('credentials')}
                                                        >
                                                            Credentials
                                                        </button>{' '}
                                                        step so you do not enter the same values twice.
                                                    </p>
                                                </div>
                                            )}

                                            </>
                                        )}

                                        {(manualConfigurationQuestions.length === 0 ||
                                            currentQuestionIndex >= manualConfigurationQuestions.length) && (
                                            <div className="flex gap-3 pt-4 border-t border-border/60">
                                                <Button
                                                    type="button"
                                                    onClick={() => { void handleBuild(); }}
                                                    className="w-full"
                                                    disabled={isNavigating}
                                                >
                                                    {isNavigating
                                                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        : <Check className="h-4 w-4 mr-2" />}
                                                    {isNavigating ? 'Opening workflow…' : 'Continue Building Workflow'}
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {/* Ready to Build Section - Only show when workflow confirmed and no credentials needed */}
                    {step === 'confirmation' && refinement && workflowUnderstandingConfirmed && requiredCredentials.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-center pt-8"
                        >
                            <div className="max-w-md w-full space-y-6">
                                <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20 backdrop-blur-sm">
                                    <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5" /> Ready to Build
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                                        The agent has all necessary information to build your workflow.
                                    </p>
                                </div>
                                <Button onClick={() => { void handleBuild(); }} className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02]">
                                    <Play className="mr-2 h-5 w-5 fill-current" /> Start Building Workflow
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </div>
                )}

                {/* Separate page for building and complete steps */}
                <AnimatePresence mode="wait">
                    {/* STEP 6: EXECUTING */}
                    {step === 'executing' && (
                        <motion.div
                            key="executing"
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] w-screen h-screen p-4 sm:p-6 md:p-8 overflow-hidden flex flex-col"
                            style={{ 
                                background: 'linear-gradient(180deg, #0B0F1A 0%, #111827 100%)',
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                            }}
                        >
                            <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 md:space-y-10 py-4 flex flex-col items-center justify-center flex-1 overflow-y-auto min-h-0">
                                <div className="text-center space-y-4 sm:space-y-5 md:space-y-6">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.5 }}
                                        className="relative inline-block mx-auto"
                                    >
                                        <motion.div
                                            className="absolute inset-0 rounded-full -z-10"
                                            style={{ 
                                                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
                                                filter: 'blur(40px)',
                                                width: '140px',
                                                height: '140px',
                                                left: '50%',
                                                top: '50%',
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                            animate={{ 
                                                scale: [1, 1.3, 1],
                                                opacity: [0.3, 0.6, 0.3]
                                            }}
                                            transition={{ 
                                                repeat: Infinity, 
                                                duration: 1.2,
                                                ease: "easeInOut"
                                            }}
                                        />
                                        <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 mx-auto">
                                            <motion.div
                                                className="absolute inset-0 rounded-full border-2"
                                                style={{ 
                                                    borderColor: 'rgba(34, 197, 94, 0.4)',
                                                    borderTopColor: 'rgba(34, 197, 94, 1)',
                                                }}
                                                animate={{ rotate: 360 }}
                                                transition={{ 
                                                    repeat: Infinity, 
                                                    duration: 2,
                                                    ease: "linear"
                                                }}
                                            />
                                            <Play className="h-12 w-12 sm:h-14 sm:w-14 text-green-500 relative z-10" />
                                        </div>
                                    </motion.div>
                                    
                                    <motion.h2 
                                        className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        Executing Workflow...
                                    </motion.h2>
                                    
                                    <motion.p 
                                        className="text-muted-foreground text-sm sm:text-base"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        Your workflow is running. This may take a few moments.
                                    </motion.p>
                                    
                                    <div className="w-full max-w-md mx-auto mt-6">
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-green-500 rounded-full"
                                                initial={{ width: '10%' }}
                                                animate={{ width: `${executionProgress}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2 text-center">
                                            {executionProgress.toFixed(0)}% Complete
                                        </p>
                                    </div>
                                    
                                    {executionId && (
                                        <motion.p 
                                            className="text-xs text-muted-foreground font-mono"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                        >
                                            Execution ID: {executionId.substring(0, 8)}...
                                        </motion.p>
                                    )}
                                    
                                    {executionError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
                                        >
                                            <p className="text-sm text-destructive">{executionError}</p>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 5+: BUILDING */}
                    {step === 'building' && (
                        <motion.div
                            key="building"
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] w-screen h-screen overflow-y-auto"
                            style={{ 
                                background: 'linear-gradient(180deg, #0B0F1A 0%, #111827 100%)',
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                            }}
                        >
                            {/* Scrollable inner — constrained width, natural height so nothing clips */}
                            <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 flex flex-col items-center">
                                {/* Status / Intelligence Area (Top) */}
                                <div className="text-center space-y-4 sm:space-y-5 md:space-y-6">
                                    {/* Circle Loader with Variable Speed */}
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.5 }}
                                        className="relative inline-block mx-auto"
                                    >
                                        {/* Outer Glow - Pulses every 1.2s */}
                                        <motion.div
                                            className="absolute inset-0 rounded-full -z-10"
                                            style={{ 
                                                background: 'radial-gradient(circle, rgba(124, 124, 255, 0.3) 0%, transparent 70%)',
                                                filter: 'blur(40px)',
                                                width: '140px',
                                                height: '140px',
                                                left: '50%',
                                                top: '50%',
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                            animate={{ 
                                                scale: [1, 1.3, 1],
                                                opacity: [0.3, 0.6, 0.3]
                                            }}
                                            transition={{ 
                                                repeat: Infinity, 
                                                duration: 1.2,
                                                ease: "easeInOut"
                                            }}
                                        />
                                        
                                        {/* Circle Loader Container */}
                                        <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 mx-auto">
                                            {/* Inner Ring - Slow, smooth rotation */}
                                            <motion.div
                                                className="absolute inset-0 rounded-full border-2"
                                                style={{ 
                                                    borderColor: 'rgba(124, 124, 255, 0.4)',
                                                    borderTopColor: 'rgba(124, 124, 255, 0.8)'
                                                }}
                                                animate={{ rotate: 360 }}
                                                transition={{ 
                                                    repeat: Infinity, 
                                                    duration: 8 + Math.random() * 2, // Variable speed (8-10s)
                                                    ease: "linear"
                                                }}
                                            />
                                            
                                            {/* Outer Ring - Faster, counter-rotation */}
                                            <motion.div
                                                className="absolute inset-2 rounded-full border-2"
                                                style={{ 
                                                    borderColor: 'rgba(34, 211, 238, 0.3)',
                                                    borderRightColor: 'rgba(34, 211, 238, 0.7)'
                                                }}
                                                animate={{ rotate: -360 }}
                                                transition={{ 
                                                    repeat: Infinity, 
                                                    duration: 5 + Math.random() * 1.5, // Variable speed (5-6.5s)
                                                    ease: "linear"
                                                }}
                                            />
                                            
                                            {/* Micro Text Inside Circle */}
                                            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                                                <motion.div
                                                    key={circleTextIndex}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="text-xs sm:text-sm font-medium mb-1"
                                                    style={{ color: '#7C7CFF' }}
                                                >
                                                    {circleTexts[circleTextIndex]}
                                                </motion.div>
                                                <motion.div
                                                    animate={{ 
                                                        scale: [1, 1.05, 1],
                                                        rotate: [0, 2, -2, 0]
                                                    }}
                                                    transition={{ 
                                                        repeat: Infinity, 
                                                        duration: 2.5,
                                                        ease: "easeInOut"
                                                    }}
                                                >
                                                    <Brain className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: '#7C7CFF' }} />
                                                </motion.div>
                                            </div>
                                        </div>
                                    </motion.div>
                                    
                                    {/* Title and Cognitive Progress Text */}
                                    <div className="space-y-2 sm:space-y-3">
                                        <h2 
                                            className="text-2xl sm:text-3xl md:text-4xl font-semibold"
                                            style={{ 
                                                color: '#E5E7EB',
                                                letterSpacing: '-0.02em'
                                            }}
                                        >
                                            Building Your Workflow
                                        </h2>
                                        
                                        {/* Cognitive Progress Loading Text */}
                                        <motion.div
                                            key={cognitiveTextIndex}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            transition={{ duration: 0.4 }}
                                            className="text-base sm:text-lg"
                                            style={{ color: '#9CA3AF' }}
                                        >
                                            {cognitiveTexts[cognitiveTextIndex]}
                                        </motion.div>
                                    </div>

                                    {/* Compact Final Prompt Summary so users see WHAT is being built */}
                                    {refinement && (refinement.enhancedPrompt || refinement.systemPrompt || refinement.refinedPrompt || planSummary) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.35 }}
                                            className="mt-4 max-w-xl mx-auto text-left"
                                        >
                                            <div className="rounded-lg border border-slate-600/40 bg-slate-900/60 px-4 py-3 shadow-lg">
                                                <p className="text-xs font-semibold text-slate-300 mb-2">
                                                    Final analyzed prompt
                                                </p>
                                                {planSummaryV2 ? (
                                                    <SummaryV2Display summaryV2={planSummaryV2} compact />
                                                ) : (
                                                    <StructuredPlanDisplay
                                                        summary={planSummary || refinement.enhancedPrompt || refinement.systemPrompt || refinement.refinedPrompt || ''}
                                                        compact
                                                    />
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Primary Action / Progress (Center) */}
                                <div className="w-full space-y-4 sm:space-y-5">
                                    <div className="flex justify-between items-center">
                                        <span 
                                            className="text-sm font-medium"
                                            style={{ color: '#E5E7EB' }}
                                        >
                                            Progress
                                        </span>
                                        <div className="flex items-center gap-4">
                                            {buildStartTime && (
                                                <div className="flex items-center gap-2">
                                                    <motion.div
                                                        animate={{ rotate: [0, 360] }}
                                                        transition={{ 
                                                            repeat: Infinity, 
                                                            duration: 2,
                                                            ease: "linear"
                                                        }}
                                                        style={{ color: '#EC4899' }}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </motion.div>
                                                    <span 
                                                        className="text-sm"
                                                        style={{ color: '#9CA3AF' }}
                                                    >
                                                        {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                                                    </span>
                                                </div>
                                            )}
                                            <span 
                                                className="text-xl font-semibold"
                                                style={{ color: '#7C7CFF' }}
                                            >
                                                {isComplete ? '100%' : `${Math.min(99, progress)}%`}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Momentum Bar - Flowing Gradient with Soft Glow Head */}
                                    <div 
                                        className="relative h-3 w-full rounded-full overflow-hidden"
                                        style={{ 
                                            backgroundColor: 'rgba(17, 24, 39, 0.8)',
                                            border: '1px solid rgba(107, 114, 128, 0.2)'
                                        }}
                                    >
                                        <motion.div
                                            className="h-full relative overflow-hidden"
                                            initial={{ width: "0%" }}
                                            animate={{ width: `${isComplete ? 100 : Math.min(99, progress)}%` }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            style={{
                                                background: 'linear-gradient(90deg, #7C7CFF 0%, #22D3EE 50%, #EC4899 100%)',
                                                backgroundSize: '200% 100%'
                                            }}
                                        >
                                            {/* Flowing gradient animation */}
                                            <motion.div
                                                className="absolute inset-0"
                                                style={{
                                                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                                                    backgroundSize: '200% 100%'
                                                }}
                                                animate={{ 
                                                    backgroundPosition: ['0% 0%', '200% 0%']
                                                }}
                                                transition={{ 
                                                    repeat: Infinity, 
                                                    duration: 2,
                                                    ease: "linear"
                                                }}
                                            />
                                            
                                            {/* Soft Glow Head (Energy Moving) */}
                                            <motion.div
                                                className="absolute right-0 top-0 bottom-0 w-8"
                                                style={{
                                                    background: 'radial-gradient(circle at right center, rgba(236, 72, 153, 0.6) 0%, transparent 70%)',
                                                    filter: 'blur(8px)'
                                                }}
                                                animate={{ 
                                                    opacity: [0.4, 0.8, 0.4],
                                                    scale: [1, 1.2, 1]
                                                }}
                                                transition={{ 
                                                    repeat: Infinity, 
                                                    duration: 1.5,
                                                    ease: "easeInOut"
                                                }}
                                            />
                                            
                                            {/* Micro Spark Particles */}
                                            {[...Array(3)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    className="absolute top-1/2 w-1.5 h-1.5 rounded-full"
                                                    style={{ 
                                                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                                        left: `${(progress / 100) * 100 - (i * 5)}%`,
                                                        filter: 'blur(2px)'
                                                    }}
                                                    animate={{ 
                                                        y: [-2, 2, -2],
                                                        opacity: [0, 1, 0],
                                                        scale: [0.5, 1, 0.5]
                                                    }}
                                                    transition={{ 
                                                        repeat: Infinity, 
                                                        duration: 1.5,
                                                        delay: i * 0.3,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            ))}
                                        </motion.div>
                                        
                                        {/* Progress Milestone Indicators */}
                                        {[25, 50, 75, 100].map((milestone) => (
                                            <div
                                                key={milestone}
                                                className="absolute top-0 bottom-0 w-px"
                                                style={{ 
                                                    left: `${milestone}%`,
                                                    backgroundColor: progress >= milestone ? 'rgba(124, 124, 255, 0.3)' : 'rgba(107, 114, 128, 0.1)'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    
                                    {/* Progress Copy */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center"
                                    >
                                        <span 
                                            className="text-2xl font-bold"
                                            style={{ color: '#7C7CFF' }}
                                        >
                                            {Math.min(99, progress)}% complete
                                        </span>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {/* WORKFLOW CONFIRMATION STEP */}
                    {step === 'workflow-confirmation' && confirmationData && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center w-screen h-screen p-4 sm:p-6 md:p-8 overflow-y-auto"
                        >
                            <WorkflowConfirmationStep
                                workflowId={confirmationData.workflowId}
                                structuralPrompt={confirmationData.structuralPrompt}
                                summaryV2={confirmationData.summaryV2}
                                workflowExplanation={confirmationData.workflowExplanation as any}
                                confidenceScore={confirmationData.confidenceScore}
                                workflow={confirmationData.workflow}
                                onConfirm={async () => {
                                    // Call backend confirmation API
                                    try {
                                        const { data: { session } } = await awsClient.auth.getSession();
                                        const response = await fetch(`${ENDPOINTS.itemBackend}/api/workflow/confirm`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${session?.access_token || ''}`,
                                            },
                                            body: JSON.stringify({
                                                workflowId: confirmationData.workflowId,
                                                approved: true,
                                            }),
                                        });

                                        if (!response.ok) {
                                            const error = await response.json();
                                            throw new Error(error.message || 'Confirmation failed');
                                        }

                                        const result = await response.json();
                                        
                                        if (result.success && result.workflow) {
                                            // Workflow confirmed and pipeline continued
                                            // Update workflow in store
                                            const normalized = revalidateWorkflowGraph(
                                                result.workflow.nodes || [],
                                                result.workflow.edges || [],
                                                10
                                            );
                                            
                                            setNodes(normalized.nodes);
                                            setEdges(normalized.edges);
                                            
                                            // Save as hidden setup draft; commit only when readiness passes.
                                            const { data: { user } } = await awsClient.auth.getUser();
                                            if (user && result.workflow) {
                                                const saveResponse = await fetch(`${ENDPOINTS.itemBackend}/api/workflows/setup-draft`, {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'Authorization': `Bearer ${session?.access_token || ''}`,
                                                    },
                                                    body: JSON.stringify({
                                                        workflowId: confirmationData.workflowId,
                                                        name: `Workflow ${confirmationData.workflowId.substring(0, 8)}`,
                                                        nodes: normalized.nodes,
                                                        edges: normalized.edges,
                                                        user_id: user.id,
                                                    }),
                                                });

                                                if (saveResponse.ok) {
                                                    setGeneratedWorkflowId(confirmationData.workflowId);
                                                    setStep('complete');
                                                    toast({
                                                        title: 'Workflow Confirmed',
                                                        description: 'Your workflow is ready. Set up credentials and click "View Workflow" to continue.',
                                                    });
                                                } else {
                                                    throw new Error('Failed to save workflow');
                                                }
                                            }
                                        } else {
                                            throw new Error(result.error || 'Confirmation failed');
                                        }
                                    } catch (error) {
                                        console.error('Confirmation error:', error);
                                        throw error;
                                    }
                                }}
                                onChangeTools={async () => {
                                    // Show tool substitution UI
                                    // For now, navigate to workflow builder with tool substitution mode
                                    toast({
                                        title: 'Change Tools',
                                        description: 'Tool substitution feature coming soon. You can modify tools in the workflow builder.',
                                    });
                                    // TODO: Implement tool substitution UI
                                }}
                                onRegenerate={async () => {
                                    // Regenerate workflow
                                    setStep('idle');
                                    setConfirmationData(null);
                                    setPrompt(''); // Clear prompt to allow new input
                                    toast({
                                        title: 'Regenerating',
                                        description: 'Please provide a new prompt to regenerate the workflow.',
                                    });
                                }}
                                isLoading={isLoading}
                            />
                        </motion.div>
                    )}

                    {/* CONFIGURE STEP: Collect Credentials & Sensitive Inputs */}
                    {step === 'configure' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-6"
                        >
                            <Card className="shadow-xl overflow-hidden">
                                <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-indigo-500" />
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-purple-400">
                                        <Settings2 className="h-5 w-5" /> Configure Workflow
                                    </CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Please provide the required credentials and sensitive inputs to complete your workflow setup.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {configureGuidance && (
                                        <GuidedStatusCard
                                            title={configureGuidance.title}
                                            description={configureGuidance.description}
                                            resolution={configureGuidance.resolution}
                                            details={configureGuidance.details}
                                            tone={configureGuidance.tone}
                                            onDismiss={() => setConfigureGuidance(null)}
                                        />
                                    )}
                                    {!missingItems ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                                            <span className="ml-2 text-muted-foreground">Loading configuration requirements...</span>
                                        </div>
                                    ) : (missingItems.credentials.filter(c => !c.satisfied).length === 0 && missingItems.inputs.length === 0) ? (
                                        <div className="text-center py-8">
                                            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                            <p className="text-lg font-semibold mb-2">All configuration complete!</p>
                                            <p className="text-muted-foreground mb-4">Your workflow is ready to run.</p>
                                            <Button
                                                onClick={() => {
                                                    setStep('complete');
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-500"
                                            >
                                                Continue <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Credentials Section */}
                                            {missingItems.credentials && missingItems.credentials.filter(c => !c.satisfied).length > 0 && (
                                                <div className="space-y-4">
                                                    <h3 className="text-lg font-semibold">Credentials</h3>
                                                    {missingItems.credentials
                                                        .filter(cred => !cred.satisfied)
                                                        .map((cred) => {
                                                            const controlType = resolveConfigureFieldType(cred);
                                                            const credKey = getMissingItemCredentialKey(cred);
                                                            return (
                                                            <div key={`${cred.nodeId || 'global'}_${credKey}`} className="p-4 border rounded-lg space-y-2">
                                                                <Label>{cred.displayName}</Label>
                                                                {controlType === 'select' && Array.isArray(cred.options) && cred.options.length > 0 ? (
                                                                    <Select
                                                                        value={configureCredentials[credKey]?.value || ''}
                                                                        onValueChange={(value) => {
                                                                            setConfigureCredentials({
                                                                                ...configureCredentials,
                                                                                [credKey]: {
                                                                                    value: normalizeSelectValue(
                                                                                        value,
                                                                                        undefined,
                                                                                        cred.options
                                                                                    ),
                                                                                },
                                                                            });
                                                                        }}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder={cred.placeholder || `Select ${cred.displayName}`} />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {cred.options.map((opt) => (
                                                                                <SelectItem key={`${cred.provider}_${opt.value}`} value={String(opt.value)}>
                                                                                    {opt.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : controlType === 'textarea' ? (
                                                                    <Textarea
                                                                        placeholder={cred.placeholder || `Enter ${cred.displayName} credentials`}
                                                                        value={configureCredentials[credKey]?.value || ''}
                                                                        onChange={(e) => {
                                                                            setConfigureCredentials({
                                                                                ...configureCredentials,
                                                                                [credKey]: { value: e.target.value },
                                                                            });
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Input
                                                                        type={controlType === 'password' ? 'password' : (controlType === 'number' ? 'number' : 'text')}
                                                                        placeholder={cred.placeholder || `Enter ${cred.displayName} credentials`}
                                                                        value={configureCredentials[credKey]?.value || ''}
                                                                        onChange={(e) => {
                                                                            setConfigureCredentials({
                                                                                ...configureCredentials,
                                                                                [credKey]: { value: e.target.value },
                                                                            });
                                                                        }}
                                                                    />
                                                                )}
                                                                <p className="text-xs text-muted-foreground">
                                                                    Required for: {cred.nodes.join(', ')}
                                                                </p>
                                                            </div>
                                                        )})}
                                                </div>
                                            )}

                                            {/* Sensitive Inputs Section */}
                                            {missingItems.inputs && missingItems.inputs.length > 0 && (
                                                <div className="space-y-4">
                                                    <h3 className="text-lg font-semibold">Sensitive Inputs</h3>
                                                    {missingItems.inputs.map((input) => {
                                                        const controlType = resolveConfigureFieldType(input);
                                                        return (
                                                        <div key={`${input.nodeId}_${input.fieldName}`} className="p-4 border rounded-lg space-y-2">
                                                            <Label>
                                                                {input.nodeLabel} - {input.fieldName}
                                                                {input.required && <span className="text-red-500 ml-1">*</span>}
                                                            </Label>
                                                            {controlType === 'select' && Array.isArray(input.options) && input.options.length > 0 ? (
                                                                <Select
                                                                    value={
                                                                        configureInputs.find(
                                                                            i => i.nodeId === input.nodeId && i.fieldName === input.fieldName
                                                                        )?.value || ''
                                                                    }
                                                                    onValueChange={(value) => {
                                                                        const selectedValue = normalizeSelectValue(
                                                                            value,
                                                                            undefined,
                                                                            input.options
                                                                        );
                                                                        const existingIndex = configureInputs.findIndex(
                                                                            i => i.nodeId === input.nodeId && i.fieldName === input.fieldName
                                                                        );
                                                                        if (existingIndex >= 0) {
                                                                            const updated = [...configureInputs];
                                                                            updated[existingIndex] = { ...updated[existingIndex], value: selectedValue };
                                                                            setConfigureInputs(updated);
                                                                        } else {
                                                                            setConfigureInputs([
                                                                                ...configureInputs,
                                                                                { nodeId: input.nodeId, fieldName: input.fieldName, value: selectedValue },
                                                                            ]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder={input.placeholder || `Select ${input.fieldName}`} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {input.options.map((opt) => (
                                                                            <SelectItem key={`${input.nodeId}_${input.fieldName}_${opt.value}`} value={String(opt.value)}>
                                                                                {opt.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : controlType === 'textarea' ? (
                                                                <Textarea
                                                                    placeholder={input.placeholder || input.description}
                                                                    value={
                                                                        configureInputs.find(
                                                                            i => i.nodeId === input.nodeId && i.fieldName === input.fieldName
                                                                        )?.value || ''
                                                                    }
                                                                    onChange={(e) => {
                                                                        const existingIndex = configureInputs.findIndex(
                                                                            i => i.nodeId === input.nodeId && i.fieldName === input.fieldName
                                                                        );
                                                                        if (existingIndex >= 0) {
                                                                            const updated = [...configureInputs];
                                                                            updated[existingIndex] = { ...updated[existingIndex], value: e.target.value };
                                                                            setConfigureInputs(updated);
                                                                        } else {
                                                                            setConfigureInputs([
                                                                                ...configureInputs,
                                                                                { nodeId: input.nodeId, fieldName: input.fieldName, value: e.target.value },
                                                                            ]);
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Input
                                                                    type={controlType === 'password' ? 'password' : ((controlType === 'number' || input.fieldType === 'number') ? 'number' : 'text')}
                                                                    placeholder={input.placeholder || input.description}
                                                                    value={
                                                                        configureInputs.find(
                                                                            i => i.nodeId === input.nodeId && i.fieldName === input.fieldName
                                                                        )?.value || ''
                                                                    }
                                                                    onChange={(e) => {
                                                                        const existingIndex = configureInputs.findIndex(
                                                                            i => i.nodeId === input.nodeId && i.fieldName === input.fieldName
                                                                        );
                                                                        if (existingIndex >= 0) {
                                                                            const updated = [...configureInputs];
                                                                            updated[existingIndex] = { ...updated[existingIndex], value: e.target.value };
                                                                            setConfigureInputs(updated);
                                                                        } else {
                                                                            setConfigureInputs([
                                                                                ...configureInputs,
                                                                                { nodeId: input.nodeId, fieldName: input.fieldName, value: e.target.value },
                                                                            ]);
                                                                        }
                                                                    }}
                                                                />
                                                            )}
                                                            {input.examples && input.examples.length > 0 && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Example: {JSON.stringify(input.examples[0])}
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-muted-foreground">{input.description}</p>
                                                        </div>
                                                    )})}
                                                </div>
                                            )}

                                            {missingItems.credentials.filter(c => !c.satisfied).length === 0 && 
                                             missingItems.inputs.length === 0 && (
                                                <div className="text-center py-8">
                                                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                                    <p className="text-muted-foreground">All required configuration is complete!</p>
                                                </div>
                                            )}

                                            {/* Submit Button */}
                                            <div className="flex gap-3 pt-4">
                                                <Button
                                                    onClick={async () => {
                                                        if (!generatedWorkflowId) return;
                                                        
                                                        setIsConfiguring(true);
                                                        try {
                                                            const credentialPayload = Object.entries(configureCredentials).reduce(
                                                                (acc, [key, value]) => {
                                                                    const normalizedKey = String(key || '').trim();
                                                                    if (!normalizedKey) return acc;
                                                                    const rawValue =
                                                                        value && typeof value === 'object' && 'value' in value
                                                                            ? (value as Record<string, unknown>).value
                                                                            : value;
                                                                    if (rawValue === undefined || rawValue === null) return acc;
                                                                    const text = String(rawValue).trim();
                                                                    if (!text) return acc;
                                                                    acc[normalizedKey] = text;
                                                                    return acc;
                                                                },
                                                                {} as Record<string, string>
                                                            );

                                                            const response = await fetch(
                                                                `${ENDPOINTS.itemBackend}/api/workflows/${generatedWorkflowId}/configure`,
                                                                {
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        'Authorization': `Bearer ${(await awsClient.auth.getSession()).data.session?.access_token || ''}`,
                                                                    },
                                                                    body: JSON.stringify({
                                                                        credentials: credentialPayload,
                                                                        inputs: configureInputs,
                                                                    }),
                                                                }
                                                            );

                                                            if (!response.ok) {
                                                                const error = await response.json().catch(() => ({}));
                                                                const guidance = mapWorkflowIssueToGuidance(error);
                                                                setConfigureGuidance(guidance);
                                                                toast({
                                                                    title: guidance.title,
                                                                    description: guidance.description,
                                                                });
                                                                return;
                                                            }

                                                            const result = await response.json();
                                                            const finalNodes = Array.isArray(result?.nodes)
                                                                ? result.nodes
                                                                : Array.isArray(result?.workflow?.nodes)
                                                                  ? result.workflow.nodes
                                                                  : [];
                                                            const finalEdges = Array.isArray(result?.edges)
                                                                ? result.edges
                                                                : Array.isArray(result?.workflow?.edges)
                                                                  ? result.workflow.edges
                                                                  : [];
                                                            if (finalNodes.length > 0) {
                                                                setNodes(finalNodes as any[]);
                                                                setEdges(finalEdges as any[]);
                                                            }
                                                            setWorkflowReady(true);
                                                            setConfigureGuidance(null);
                                                            toast({
                                                                title: 'Success',
                                                                description: 'Workflow configured successfully!',
                                                            });
                                                            await commitSetupWorkflow(generatedWorkflowId);
                                                            navigate(`/workflow/${generatedWorkflowId}`, { replace: true });
                                                        } catch (error: any) {
                                                            const guidance = mapWorkflowIssueToGuidance({
                                                                message: error?.message || 'Failed to configure workflow',
                                                            });
                                                            setConfigureGuidance(guidance);
                                                            toast({
                                                                title: guidance.title,
                                                                description: guidance.description,
                                                            });
                                                        } finally {
                                                            setIsConfiguring(false);
                                                        }
                                                    }}
                                                    disabled={isConfiguring || workflowReady}
                                                    className="bg-indigo-600 hover:bg-indigo-500"
                                                >
                                                    {isConfiguring ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Configuring...
                                                        </>
                                                    ) : workflowReady ? (
                                                        <>
                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                            Ready to Run
                                                        </>
                                                    ) : (
                                                        <>
                                                            Configure & Continue <ArrowRight className="ml-2 h-4 w-4" />
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* FINAL STEP: COMPLETE */}
                    {step === 'complete' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }} 
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center w-screen h-screen gap-8 text-center px-6 overflow-y-auto"
                        >
                            <div className="h-32 w-32 rounded-full bg-green-500/10 flex items-center justify-center mb-4 relative">
                                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                                <Check className="h-16 w-16 text-green-500 relative z-10" />
                            </div>
                            <div className="space-y-4">
                                <motion.h2 
                                    className="text-4xl font-bold text-foreground mb-2"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    ? Workflow Ready
                                </motion.h2>
                                <motion.p 
                                    className="text-muted-foreground max-w-md mx-auto text-lg"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Your autonomous agent has successfully generated your workflow. All steps are complete and your workflow is ready to use.
                                </motion.p>
                                {buildStartTime && (
                                    <motion.p
                                        className="text-sm text-muted-foreground"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        Completed in {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                                    </motion.p>
                                )}
                                {executionStatus === 'failed' && executionError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 max-w-md mx-auto text-left"
                                    >
                                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Test run failed</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{executionError}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Your workflow was saved — open it to review and retry.</p>
                                            {executionRequestId && (
                                                <p className="text-xs text-muted-foreground/60 mt-1 font-mono">Ref: {executionRequestId}</p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                                {executionStatus === 'completed' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg max-w-md mx-auto"
                                    >
                                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Test run completed successfully</p>
                                    </motion.div>
                                )}
                            </div>
                            <div className="flex gap-4 mt-4">
                                <Button
                                    onClick={reset}
                                    className="bg-card border-2 border-border text-foreground hover:bg-muted hover:border-border/80 h-12 px-6 font-semibold transition-all shadow-lg"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" /> Create Another
                                </Button>
                                <Button
                                    onClick={async () => {
                                        if (generatedWorkflowId) {
                                            console.log('Navigating to workflow:', generatedWorkflowId);
                                            // Use replace to prevent back button issues and ensure clean navigation
                                            // Add autoRun query parameter to automatically start the workflow
                                            try {
                                                await commitSetupWorkflow(generatedWorkflowId);
                                                navigate(`/workflow/${generatedWorkflowId}?autoRun=true`, { replace: false });
                                            } catch (error: any) {
                                                toast({
                                                    title: 'Workflow setup incomplete',
                                                    description: error?.message || 'Complete required setup before opening the workflow.',
                                                    variant: 'destructive',
                                                });
                                            }
                                        } else {
                                            console.error('Cannot navigate: generatedWorkflowId is null');
                                            toast({
                                                title: 'Error',
                                                description: 'Workflow ID not available. Please try creating the workflow again.',
                                                variant: 'destructive',
                                            });
                                        }
                                    }}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 font-semibold shadow-xl shadow-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!generatedWorkflowId}
                                >
                                    View Workflow <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>

                <FieldOwnershipGuidePanel
                    enabled={fieldOwnershipGuideEnabled}
                    isVisible={['field-ownership', 'credentials', 'configure'].includes(step)}
                    contextPayload={fieldOwnershipGuideContext as Record<string, unknown>}
                    selectedFieldLabel={
                        selectedGuideQuestion
                            ? String(
                                  selectedGuideQuestion.text ||
                                      selectedGuideQuestion.label ||
                                      selectedGuideQuestion.fieldName ||
                                      ''
                              )
                            : undefined
                    }
                    buildManifestSnapshot={
                        pendingWorkflowData?.fieldOwnershipMap as Record<string, Record<string, string>> | undefined
                    }
                    onOwnershipChange={(nodeId, fieldName, mode) => {
                        setFieldOwnershipOverride(nodeId, fieldName, mode);
                    }}
                    floating
                />
            </div>
        </div>
    );
}

export { AutonomousAgentWizard as default };
