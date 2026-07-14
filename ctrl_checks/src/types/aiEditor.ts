/**
 * Frontend mirror of AI editor contracts (narrow subset for the workbench UI).
 * Structural edits are expressed as node-centric operations; edges are never sent from the client.
 */

export interface AiEditorMutationOperationBase {
  kind: string;
}

export interface AddNodeOperation extends AiEditorMutationOperationBase {
  kind: 'add_node';
  nodeType: string;
  label?: string;
  configOverrides?: Record<string, unknown>;
  positionHint?: {
    relation: 'before' | 'after' | 'replace';
    referenceNodeId: string;
  };
}

export interface RemoveNodeOperation extends AiEditorMutationOperationBase {
  kind: 'remove_node';
  nodeId: string;
}

export interface ReplaceNodeOperation extends AiEditorMutationOperationBase {
  kind: 'replace_node';
  targetNodeId: string;
  newNodeType: string;
  configStrategy?: 'preserve_compatible' | 'use_defaults' | 'merge';
  configOverrides?: Record<string, unknown>;
}

export interface UpdateNodeConfigOperation extends AiEditorMutationOperationBase {
  kind: 'update_node_config';
  nodeId: string;
  path: string;
  newValue: unknown;
}

export interface InsertSafetyNodeOperation extends AiEditorMutationOperationBase {
  kind: 'insert_safety_node';
  nodeType: string;
  position: {
    relation: 'before' | 'after';
    referenceNodeId: string;
  };
  configOverrides?: Record<string, unknown>;
}

export interface RefactorLinearizeOperation extends AiEditorMutationOperationBase {
  kind: 'refactor_linearize';
  focusNodeIds?: string[];
}

export type AiEditorMutationOperation =
  | AddNodeOperation
  | RemoveNodeOperation
  | ReplaceNodeOperation
  | UpdateNodeConfigOperation
  | InsertSafetyNodeOperation
  | RefactorLinearizeOperation;

export interface WorkflowDiffNodeEntry {
  nodeId: string;
  before?: { data?: { label?: string; type?: string } };
  after?: { data?: { label?: string; type?: string } };
}

export interface WorkflowDiffEdgeEntry {
  edgeId: string;
  before?: unknown;
  after?: unknown;
}

export interface WorkflowDiffSummary {
  nodes?: WorkflowDiffNodeEntry[];
  edges?: WorkflowDiffEdgeEntry[];
}

export interface AiEditorCapabilitiesResponse {
  success: boolean;
  role: 'admin' | 'moderator' | 'user';
  capabilities: string[];
  lifecyclePhase?: 'draft' | 'active';
  canApply?: boolean;
  applyBlockedReason?: string;
  error?: string;
}

/** Execution-aware analyzer: run history + persisted chat memory (AI Editor "Analyze" tab). */
export interface AnalyzerExecutionSummary {
  id: string;
  workflowId: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  error?: string;
  totalSteps: number;
  failedSteps: number;
  completedSteps: number;
}

export interface AnalyzerRuntimePattern {
  nodeId: string;
  nodeType?: string;
  pattern: 'recurring_failure' | 'empty_output' | 'high_retry';
  count: number;
  window: string;
  message: string;
  sampleExecutionIds: string[];
}

export interface AnalyzerRemediationCandidate {
  confidence: number;
  userFacingSummary: string;
  risk: 'low' | 'medium' | 'high';
  proposedOperations: AiEditorMutationOperation[];
}

export interface AnalyzerChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  messageKind: string;
  referencedExecutionId?: string;
  referencedNodeId?: string;
  createdAt: string;
}

export interface AnalyzerChatResult {
  message: string;
  references: Array<{ executionId?: string; nodeId?: string; kind: string }>;
  patterns?: AnalyzerRuntimePattern[];
  remediationCandidates?: AnalyzerRemediationCandidate[];
}

export type UnifiedAiEditorIntent = 'explain_run' | 'explain_workflow' | 'propose_change' | 'mixed';

export interface AiEditorNodeCandidateOption {
  id: string;
  nodeType: string;
  label: string;
  category?: string;
  description?: string;
  reason: string;
  confidence: number;
  requiredFields: string[];
  configurableFields: string[];
}

export interface UnifiedAiEditorChatResult extends AnalyzerChatResult {
  intent: UnifiedAiEditorIntent;
  operations?: AiEditorMutationOperation[];
  diff?: WorkflowDiffSummary | null;
  updatedWorkflow?: unknown;
  requiresApply?: boolean;
  needsClarification?: boolean;
  candidateOptions?: AiEditorNodeCandidateOption[];
}
