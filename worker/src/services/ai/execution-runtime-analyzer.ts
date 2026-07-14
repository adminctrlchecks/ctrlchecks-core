// Execution Runtime Analyzer
// Execution-aware analysis for the AI Editor "Analyze" tab: lists past executions,
// builds deterministic runtime profiles (no LLM), narrates data/failures in plain
// English, detects recurring runtime patterns, and persists workflow-scoped chat memory.
//
// Deliberately separate from `./workflow-analyzer.ts` (WorkflowAnalyzer / workflowAnalyzer),
// which is an unrelated, pre-existing service used by the AI *generation* pipeline for
// intent-analysis question generation. This service is the only place that reads real
// `executions` / `execution_steps` runtime data for the AI Editor.

import { getDbClient } from '../../core/database/aws-db-client';
import { unifiedNodeRegistry } from '../../core/registry/unified-node-registry';
import { geminiOrchestrator } from './gemini-orchestrator';
import { createObjectStorageService } from '../workflow-executor/object-storage-service';
import { AI_EDITOR_MUTATION_OPERATION_KINDS, type AiEditorMutationOperation } from '../../core/types/ai-editor-contracts';
import { logger } from '../../core/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExecutionSummary {
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

export interface ExecutionStepDetail {
  id: string;
  nodeId: string;
  nodeName?: string;
  nodeType: string;
  status: string;
  sequence: number;
  inputJson?: unknown;
  outputJson?: unknown;
  inputRefs?: unknown;
  outputRefs?: unknown;
  resultData?: unknown;
  stateSnapshot?: unknown;
  checkpointData?: unknown;
  retryCount?: number;
  maxRetries?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionEventDetail {
  eventType: string;
  eventData: unknown;
  nodeId?: string;
  nodeName?: string;
  sequence?: number;
  createdAt: string;
}

export interface ExecutionApprovalDetail {
  nodeId: string;
  status: string;
  preview?: unknown;
  requestedAt: string;
  resolvedAt?: string;
}

export interface ExecutionDetail {
  execution: {
    id: string;
    workflowId: string;
    status: string;
    startedAt?: string;
    finishedAt?: string;
    durationMs?: number;
    error?: string;
    logs?: unknown[];
  };
  steps: ExecutionStepDetail[];
  events: ExecutionEventDetail[];
  approvals: ExecutionApprovalDetail[];
}

export type DataProfileKind = 'null' | 'scalar' | 'object' | 'array' | 'storage_ref' | 'unavailable';

export interface DataProfile {
  kind: DataProfileKind;
  bytesApprox: number;
  itemCount?: number;
  topLevelKeys?: string[];
  sample?: unknown;
  truncated: boolean;
  notes?: string[];
}

export interface AnalyzerNodeRun {
  nodeId: string;
  nodeName?: string;
  nodeType: string;
  sequence: number;
  status: string;
  rawConfig?: Record<string, unknown>;
  resolvedInputs?: Record<string, unknown>;
  resolvedInputSources?: Record<string, string>;
  outputFieldDescriptions?: Record<string, string>;
  upstreamInputProfile: DataProfile;
  outputProfile: DataProfile;
  error?: string;
  retries?: { retryCount?: number; maxRetries?: number };
  timings?: { startedAt?: string; completedAt?: string };
}

export interface AnalyzerRunProfile {
  executionId: string;
  workflowId: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  error?: string;
  nodeRuns: AnalyzerNodeRun[];
}

export interface RuntimePattern {
  nodeId: string;
  nodeType?: string;
  pattern: 'recurring_failure' | 'empty_output' | 'high_retry';
  count: number;
  window: string;
  message: string;
  sampleExecutionIds: string[];
}

export interface RemediationCandidate {
  confidence: number;
  userFacingSummary: string;
  risk: 'low' | 'medium' | 'high';
  proposedOperations: AiEditorMutationOperation[];
}

export interface StructuredRunExplanation {
  summary: string;
  dataNarration?: string;
  rootCause?: string;
  evidence?: string[];
  risks?: string[];
  suggestedQuestions?: string[];
  remediationCandidates?: RemediationCandidate[];
}

export interface AnalyzerChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  messageKind: string;
  referencedExecutionId?: string;
  referencedNodeId?: string;
  runtimeContext?: unknown;
  createdAt: string;
}

export interface AnalyzerChatArgs {
  workflowId: string;
  userId: string;
  prompt: string;
  executionId?: string;
  nodeId?: string;
  /** Optional current canvas snapshot, used only when no executionId is supplied (mirrors /editor/analyze). */
  workflow?: { nodes: any[]; edges: any[] };
}

export interface AnalyzerChatResponse {
  message: string;
  references: Array<{ executionId?: string; nodeId?: string; kind: string }>;
  patterns?: RuntimePattern[];
  remediationCandidates?: RemediationCandidate[];
}

const MAX_SAMPLE_ITEMS = 3;
const MAX_SAMPLE_STRING_LEN = 400;
const MAX_TOPLEVEL_KEYS = 20;

// ─── Deterministic data profiling (no LLM, no unbounded payloads) ──────────

function isStorageRef(value: unknown): value is { _storage: string; _key?: string; _url?: string; _data?: unknown } {
  return !!value && typeof value === 'object' && '_storage' in (value as Record<string, unknown>);
}

function truncateSample(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > MAX_SAMPLE_STRING_LEN ? `${value.slice(0, MAX_SAMPLE_STRING_LEN)}…[truncated]` : value;
  }
  if (typeof value !== 'object') return value;
  if (depth >= 2) return Array.isArray(value) ? '[…nested array truncated]' : '{…nested object truncated}';
  if (Array.isArray(value)) {
    return value.slice(0, MAX_SAMPLE_ITEMS).map((v) => truncateSample(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  const keys = Object.keys(value as Record<string, unknown>).slice(0, MAX_TOPLEVEL_KEYS);
  for (const k of keys) {
    out[k] = truncateSample((value as Record<string, unknown>)[k], depth + 1);
  }
  return out;
}

function safeByteLength(value: unknown): number {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return 0;
  }
}

/** Build a deterministic, cheap profile of a value without ever forwarding the raw payload wholesale. */
export function buildDataProfile(value: unknown): DataProfile {
  if (value === null || value === undefined) {
    return { kind: 'null', bytesApprox: 0, truncated: false };
  }
  if (isStorageRef(value)) {
    const ref = value as { _storage: string; _key?: string };
    return {
      kind: 'storage_ref',
      bytesApprox: 0,
      truncated: true,
      notes: [`Value is stored externally (${ref._storage}${ref._key ? `: ${ref._key}` : ''}); not loaded by default.`],
    };
  }
  if (Array.isArray(value)) {
    return {
      kind: 'array',
      bytesApprox: safeByteLength(value),
      itemCount: value.length,
      topLevelKeys: value.length && value[0] && typeof value[0] === 'object'
        ? Object.keys(value[0] as Record<string, unknown>).slice(0, MAX_TOPLEVEL_KEYS)
        : undefined,
      sample: truncateSample(value),
      truncated: value.length > MAX_SAMPLE_ITEMS,
    };
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return {
      kind: 'object',
      bytesApprox: safeByteLength(value),
      topLevelKeys: keys.slice(0, MAX_TOPLEVEL_KEYS),
      sample: truncateSample(value),
      truncated: keys.length > MAX_TOPLEVEL_KEYS,
    };
  }
  return { kind: 'scalar', bytesApprox: safeByteLength(value), sample: value, truncated: false };
}

/** Resolve a single storage ref through the object storage service, staying within the profiler's budget. */
async function resolveStorageRefProfile(value: unknown): Promise<DataProfile> {
  if (!isStorageRef(value)) return buildDataProfile(value);
  const ref = value as { _storage: string; _key?: string; _url?: string; _data?: unknown };
  if (ref._storage === 'db' && '_data' in ref) {
    return buildDataProfile(ref._data);
  }
  if (ref._storage === 's3' && ref._key) {
    try {
      const svc = createObjectStorageService();
      if (!svc) {
        return { kind: 'storage_ref', bytesApprox: 0, truncated: true, notes: ['Object storage not configured; cannot resolve.'] };
      }
      const loaded = await svc.load({ _storage: 's3', _key: ref._key, _url: ref._url || '' });
      return buildDataProfile(loaded);
    } catch (e: any) {
      return { kind: 'unavailable', bytesApprox: 0, truncated: true, notes: [`Failed to load stored value: ${e?.message || String(e)}`] };
    }
  }
  return buildDataProfile(value);
}

// ─── DB access helpers ──────────────────────────────────────────────────────

function toIso(v: unknown): string | undefined {
  if (!v) return undefined;
  try {
    return new Date(v as string).toISOString();
  } catch {
    return undefined;
  }
}

function durationOf(startedAt?: string, finishedAt?: string): number | undefined {
  if (!startedAt || !finishedAt) return undefined;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : undefined;
}

export class ExecutionRuntimeAnalyzer {
  /** List recent executions for a workflow, newest first, with cheap step-count aggregates. */
  async listExecutions(workflowId: string, limit = 20): Promise<ExecutionSummary[]> {
    const db = getDbClient();
    const { data: executions, error } = await db
      .from('executions')
      .select('id, workflow_id, status, started_at, finished_at, error, duration_ms')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error || !Array.isArray(executions) || executions.length === 0) {
      if (error) logger.warn('[ExecutionRuntimeAnalyzer] listExecutions query failed:', error);
      return [];
    }

    const ids = executions.map((e: any) => e.id);
    const { data: steps } = await db
      .from('execution_steps')
      .select('execution_id, status')
      .in('execution_id', ids);

    const countsByExecution = new Map<string, { total: number; failed: number; completed: number }>();
    for (const s of steps || []) {
      const key = (s as any).execution_id;
      const bucket = countsByExecution.get(key) || { total: 0, failed: 0, completed: 0 };
      bucket.total += 1;
      if ((s as any).status === 'failed') bucket.failed += 1;
      if ((s as any).status === 'completed' || (s as any).status === 'success') bucket.completed += 1;
      countsByExecution.set(key, bucket);
    }

    return executions.map((e: any) => {
      const counts = countsByExecution.get(e.id) || { total: 0, failed: 0, completed: 0 };
      const startedAt = toIso(e.started_at);
      const finishedAt = toIso(e.finished_at);
      return {
        id: e.id,
        workflowId: e.workflow_id,
        status: e.status,
        startedAt,
        finishedAt,
        durationMs: e.duration_ms ?? durationOf(startedAt, finishedAt),
        error: e.error || undefined,
        totalSteps: counts.total,
        failedSteps: counts.failed,
        completedSteps: counts.completed,
      };
    });
  }

  /**
   * Shared execution-detail helper: joins executions + execution_steps + workflow_execution_events
   * + execution_node_approvals for one run. Enforces that the execution belongs to workflowId.
   * Independent from (does not modify) the existing GET /api/execution-status/:executionId handler.
   */
  async getExecutionDetail(executionId: string, workflowId: string): Promise<ExecutionDetail | null> {
    const db = getDbClient();

    const { data: execution, error: execError } = await db
      .from('executions')
      .select('*')
      .eq('id', executionId)
      .maybeSingle();

    if (execError || !execution || execution.workflow_id !== workflowId) {
      return null;
    }

    const [{ data: steps }, { data: events }, { data: approvals }] = await Promise.all([
      db.from('execution_steps').select('*').eq('execution_id', executionId).order('sequence', { ascending: true }),
      db.from('workflow_execution_events').select('*').eq('execution_id', executionId).order('sequence', { ascending: true }),
      db.from('execution_node_approvals').select('*').eq('execution_id', executionId),
    ]);

    const startedAt = toIso(execution.started_at);
    const finishedAt = toIso(execution.finished_at ?? execution.completed_at);

    return {
      execution: {
        id: execution.id,
        workflowId: execution.workflow_id,
        status: execution.status,
        startedAt,
        finishedAt,
        durationMs: execution.duration_ms ?? durationOf(startedAt, finishedAt),
        error: execution.error ?? execution.error_message ?? undefined,
        logs: Array.isArray(execution.logs) ? execution.logs : [],
      },
      steps: (steps || []).map((s: any) => ({
        id: s.id,
        nodeId: s.node_id,
        nodeName: s.node_name,
        nodeType: s.node_type,
        status: s.status,
        sequence: s.sequence,
        inputJson: s.input_json,
        outputJson: s.output_json,
        inputRefs: s.input_refs,
        outputRefs: s.output_refs,
        resultData: s.result_data,
        stateSnapshot: s.state_snapshot,
        checkpointData: s.checkpoint_data,
        retryCount: s.retry_count,
        maxRetries: s.max_retries,
        error: s.error,
        startedAt: toIso(s.started_at),
        completedAt: toIso(s.completed_at),
      })),
      events: (events || []).map((e: any) => ({
        eventType: e.event_type,
        eventData: e.event_data,
        nodeId: e.node_id,
        nodeName: e.node_name,
        sequence: e.sequence,
        createdAt: toIso(e.created_at) || e.created_at,
      })),
      approvals: (approvals || []).map((a: any) => ({
        nodeId: a.node_id,
        status: a.status,
        preview: a.preview,
        requestedAt: toIso(a.requested_at) || a.requested_at,
        resolvedAt: toIso(a.resolved_at),
      })),
    };
  }

  /** Build a deterministic per-node runtime profile for one execution. No LLM calls here. */
  async buildRunProfile(executionId: string, workflowId: string, options?: { resolveStorageRefs?: boolean }): Promise<AnalyzerRunProfile | null> {
    const detail = await this.getExecutionDetail(executionId, workflowId);
    if (!detail) return null;

    const resolvedInputsByNode = new Map<string, { fields?: Record<string, unknown>; sources?: Record<string, string> }>();
    for (const log of detail.execution.logs || []) {
      const l = log as Record<string, unknown>;
      const nodeId = l.nodeId as string | undefined;
      if (nodeId && (l.resolvedInputs || l.resolvedInputSources)) {
        resolvedInputsByNode.set(nodeId, {
          fields: (l.resolvedInputs as Record<string, unknown>) || undefined,
          sources: (l.resolvedInputSources as Record<string, string>) || undefined,
        });
      }
    }

    const nodeRuns: AnalyzerNodeRun[] = [];
    for (const step of detail.steps) {
      const registryDef = unifiedNodeRegistry.get(step.nodeType);
      const outputFieldDescriptions: Record<string, string> = {};
      const props = registryDef?.outputSchema?.default?.schema?.properties as Record<string, any> | undefined;
      if (props) {
        for (const [field, def] of Object.entries(props)) {
          if (def?.description) outputFieldDescriptions[field] = def.description;
        }
      }

      const resolved = resolvedInputsByNode.get(step.nodeId);
      const rawConfig = (step.stateSnapshot as Record<string, unknown> | undefined)?.config as Record<string, unknown> | undefined;

      const upstreamInputProfile = options?.resolveStorageRefs && isStorageRef(step.inputJson)
        ? await resolveStorageRefProfile(step.inputJson)
        : buildDataProfile(step.inputJson);
      const outputProfile = options?.resolveStorageRefs && isStorageRef(step.outputJson)
        ? await resolveStorageRefProfile(step.outputJson)
        : buildDataProfile(step.outputJson);

      nodeRuns.push({
        nodeId: step.nodeId,
        nodeName: step.nodeName,
        nodeType: step.nodeType,
        sequence: step.sequence,
        status: step.status,
        rawConfig,
        resolvedInputs: resolved?.fields,
        resolvedInputSources: resolved?.sources,
        outputFieldDescriptions: Object.keys(outputFieldDescriptions).length ? outputFieldDescriptions : undefined,
        upstreamInputProfile,
        outputProfile,
        error: step.error,
        retries: (step.retryCount || step.maxRetries) ? { retryCount: step.retryCount, maxRetries: step.maxRetries } : undefined,
        timings: { startedAt: step.startedAt, completedAt: step.completedAt },
      });
    }

    return {
      executionId,
      workflowId,
      status: detail.execution.status,
      startedAt: detail.execution.startedAt,
      finishedAt: detail.execution.finishedAt,
      durationMs: detail.execution.durationMs,
      error: detail.execution.error,
      nodeRuns,
    };
  }

  /**
   * Deterministic recurring-pattern detector across recent runs. No LLM calls — pure
   * aggregation over execution_steps for the workflow's last `limit` executions.
   */
  async detectPatterns(workflowId: string, limit = 20): Promise<RuntimePattern[]> {
    const db = getDbClient();
    const executions = await this.listExecutions(workflowId, limit);
    if (executions.length === 0) return [];

    const executionIds = executions.map((e) => e.id);
    const { data: steps } = await db
      .from('execution_steps')
      .select('execution_id, node_id, node_type, status, error, output_json, retry_count')
      .in('execution_id', executionIds);

    if (!Array.isArray(steps) || steps.length === 0) return [];

    const failuresByNode = new Map<string, { count: number; nodeType?: string; executionIds: Set<string>; lastError?: string }>();
    const emptyOutputByNode = new Map<string, { count: number; nodeType?: string; executionIds: Set<string> }>();
    const retriesByNode = new Map<string, { count: number; nodeType?: string; executionIds: Set<string> }>();

    for (const s of steps as any[]) {
      if (s.status === 'failed') {
        const bucket = failuresByNode.get(s.node_id) || { count: 0, nodeType: s.node_type, executionIds: new Set<string>(), lastError: undefined as string | undefined };
        bucket.count += 1;
        bucket.executionIds.add(s.execution_id);
        bucket.lastError = s.error || bucket.lastError;
        failuresByNode.set(s.node_id, bucket);
      }
      const out = s.output_json;
      const isEmpty = (Array.isArray(out) && out.length === 0) || (out && typeof out === 'object' && !Array.isArray(out) && Object.keys(out).length === 0);
      if (isEmpty) {
        const bucket = emptyOutputByNode.get(s.node_id) || { count: 0, nodeType: s.node_type, executionIds: new Set<string>() };
        bucket.count += 1;
        bucket.executionIds.add(s.execution_id);
        emptyOutputByNode.set(s.node_id, bucket);
      }
      if ((s.retry_count || 0) > 0) {
        const bucket = retriesByNode.get(s.node_id) || { count: 0, nodeType: s.node_type, executionIds: new Set<string>() };
        bucket.count += 1;
        bucket.executionIds.add(s.execution_id);
        retriesByNode.set(s.node_id, bucket);
      }
    }

    const window = `last_${executions.length}_runs`;
    const patterns: RuntimePattern[] = [];

    for (const [nodeId, bucket] of failuresByNode) {
      if (bucket.count < 2) continue;
      patterns.push({
        nodeId,
        nodeType: bucket.nodeType,
        pattern: 'recurring_failure',
        count: bucket.count,
        window,
        message: `Node "${nodeId}" failed in ${bucket.count} of ${executions.length} recent runs${bucket.lastError ? `: ${bucket.lastError}` : '.'}`,
        sampleExecutionIds: Array.from(bucket.executionIds).slice(0, 5),
      });
    }
    for (const [nodeId, bucket] of emptyOutputByNode) {
      if (bucket.count < 2) continue;
      patterns.push({
        nodeId,
        nodeType: bucket.nodeType,
        pattern: 'empty_output',
        count: bucket.count,
        window,
        message: `Node "${nodeId}" produced an empty array/object output in ${bucket.count} of ${executions.length} recent runs.`,
        sampleExecutionIds: Array.from(bucket.executionIds).slice(0, 5),
      });
    }
    for (const [nodeId, bucket] of retriesByNode) {
      if (bucket.count < 2) continue;
      patterns.push({
        nodeId,
        nodeType: bucket.nodeType,
        pattern: 'high_retry',
        count: bucket.count,
        window,
        message: `Node "${nodeId}" needed retries in ${bucket.count} of ${executions.length} recent runs.`,
        sampleExecutionIds: Array.from(bucket.executionIds).slice(0, 5),
      });
    }

    return patterns;
  }

  /** Compact, prompt-ready text block for /editor/suggest — never raw execution payloads. */
  async buildRuntimeSuggestionContext(workflowId: string, limit = 20): Promise<string> {
    const patterns = await this.detectPatterns(workflowId, limit);
    if (patterns.length === 0) return '';
    return patterns
      .slice(0, 10)
      .map((p) => `- [${p.pattern}] ${p.message} (nodeType: ${p.nodeType || 'unknown'}, occurrences: ${p.count}/${limit})`)
      .join('\n');
  }

  /** Structured, execution-aware explanation for the Analyze tab. One LLM call per request. */
  async explainExecution(args: { executionId: string; workflowId: string; nodeId?: string; prompt?: string }): Promise<StructuredRunExplanation> {
    const profile = await this.buildRunProfile(args.executionId, args.workflowId);
    if (!profile) {
      return { summary: 'Could not find that execution for this workflow.' };
    }

    const patterns = await this.detectPatterns(args.workflowId, 20);
    const focusNode = args.nodeId ? profile.nodeRuns.find((n) => n.nodeId === args.nodeId) : undefined;

    const compactNodeRuns = profile.nodeRuns.map((n) => ({
      nodeId: n.nodeId,
      nodeType: n.nodeType,
      sequence: n.sequence,
      status: n.status,
      error: n.error,
      resolvedInputs: n.resolvedInputs,
      outputFieldDescriptions: n.outputFieldDescriptions,
      upstreamInputProfile: n.upstreamInputProfile,
      outputProfile: n.outputProfile,
      retries: n.retries,
    }));

    const schema = {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        dataNarration: { type: 'string' },
        rootCause: { type: 'string' },
        evidence: { type: 'array', items: { type: 'string' } },
        risks: { type: 'array', items: { type: 'string' } },
        suggestedQuestions: { type: 'array', items: { type: 'string' } },
        remediationCandidates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              confidence: { type: 'number' },
              userFacingSummary: { type: 'string' },
              risk: { type: 'string' },
              proposedOperations: { type: 'array', items: { type: 'object' } },
            },
            required: ['confidence', 'userFacingSummary', 'risk', 'proposedOperations'],
          },
        },
      },
      required: ['summary'],
    };

    const remediationHelp = [
      'Only include remediationCandidates when the profile above gives clear, direct evidence of a',
      'fixable problem (e.g. a node failed with a specific error, a node repeatedly received empty',
      'upstream input, or a KNOWN RECURRING PATTERN names this node). Do not speculate — if nothing',
      'in the data points to a concrete fix, return an empty remediationCandidates array. Never propose',
      'a fix that only exists because the user asked a question; the evidence must come from the run.',
      '',
      'Each remediationCandidate must have:',
      '- confidence: 0..1, how sure you are this addresses the observed problem',
      '- userFacingSummary: one short sentence a non-technical user can read, e.g. "Add a check before',
      '  the Slack node so it skips sending when the previous step returns no data."',
      '- risk: "low" | "medium" | "high" — how disruptive the change is to existing behavior',
      '- proposedOperations: 1-3 operations using ONLY these kinds (never raw edges, never anything else):',
      '  - { "kind":"add_node", "nodeType": string, "label"?: string, "configOverrides"?: object, "positionHint"?: { "relation":"before"|"after"|"replace", "referenceNodeId": string } }',
      '  - { "kind":"remove_node", "nodeId": string }',
      '  - { "kind":"replace_node", "targetNodeId": string, "newNodeType": string, "configStrategy"?: "preserve_compatible"|"use_defaults"|"merge", "configOverrides"?: object }',
      '  - { "kind":"update_node_config", "nodeId": string, "path": string (JSON pointer, e.g. /prompt), "newValue": any }',
      '  - { "kind":"insert_safety_node", "nodeType": string, "position": { "relation":"before"|"after", "referenceNodeId": string }, "configOverrides"?: object }',
      '  - { "kind":"refactor_linearize", "focusNodeIds"?: string[] }',
      '  Reference only node ids that appear in the NODE-BY-NODE RUNTIME PROFILE above.',
    ].join('\n');

    const llmInput = [
      'You are a workflow runtime analyst. You are given a deterministic, already-sanitized',
      'profile of one real workflow execution (node sequence, status, resolved inputs,',
      'output shape/sample, errors). You do NOT have raw credentials or full payloads —',
      'only profiles and samples. Explain what happened in plain English.',
      'Clearly separate verified facts (from the data below) from inferences.',
      'If the user asked a specific question, answer it directly first.',
      'You do NOT have the authority to change the workflow yourself — you may only propose',
      'candidate fixes for the user to review; a separate step will preview and apply them.',
      '',
      '=== EXECUTION SUMMARY ===',
      JSON.stringify({ executionId: profile.executionId, status: profile.status, error: profile.error, durationMs: profile.durationMs }, null, 2),
      '',
      '=== NODE-BY-NODE RUNTIME PROFILE (ordered by sequence) ===',
      JSON.stringify(compactNodeRuns, null, 2),
      focusNode ? `\n=== USER IS FOCUSED ON NODE ===\n${JSON.stringify({ nodeId: focusNode.nodeId, nodeType: focusNode.nodeType }, null, 2)}` : '',
      patterns.length ? `\n=== KNOWN RECURRING PATTERNS ACROSS RECENT RUNS ===\n${JSON.stringify(patterns.slice(0, 10), null, 2)}` : '',
      args.prompt ? `\n=== USER QUESTION ===\n${args.prompt}` : '\n=== USER QUESTION ===\nExplain what happened in this run.',
      '',
      '=== REMEDIATION CANDIDATES (optional) ===',
      remediationHelp,
      '',
      'Respond with ONLY a JSON object matching this shape (no markdown fences): { summary, dataNarration,',
      'rootCause, evidence: string[], risks: string[], suggestedQuestions: string[], remediationCandidates: [] }.',
    ].filter(Boolean).join('\n');

    try {
      const raw = await geminiOrchestrator.processRequest('workflow-analysis', llmInput, {
        model: 'gemini-3.5-flash',
        temperature: 0.3,
        structuredOutput: { mimeType: 'application/json', schema },
      });
      const parsed = typeof raw === 'string' ? this.tryParseJson(raw) : raw;
      if (parsed && typeof parsed === 'object') {
        return parsed as StructuredRunExplanation;
      }
      return { summary: typeof raw === 'string' ? raw : 'Analysis produced no structured output.' };
    } catch (e: any) {
      logger.error('[ExecutionRuntimeAnalyzer] explainExecution failed:', e);
      return { summary: `Could not analyze this execution: ${e?.message || String(e)}` };
    }
  }

  /** Focused explanation of a single node's output, resolving storage refs within budget. */
  async explainNodeOutput(args: { executionId: string; workflowId: string; nodeId: string }): Promise<{ summary: string; profile: DataProfile }> {
    const profile = await this.buildRunProfile(args.executionId, args.workflowId, { resolveStorageRefs: true });
    const nodeRun = profile?.nodeRuns.find((n) => n.nodeId === args.nodeId);
    if (!nodeRun) {
      return { summary: 'That node was not part of this execution.', profile: { kind: 'unavailable', bytesApprox: 0, truncated: false } };
    }

    const llmInput = [
      'Explain, in plain English, what this node produced as output. Use the field descriptions',
      'if present to explain what each field means in the context of this workflow.',
      '',
      JSON.stringify({ nodeType: nodeRun.nodeType, outputFieldDescriptions: nodeRun.outputFieldDescriptions, outputProfile: nodeRun.outputProfile }, null, 2),
    ].join('\n');

    try {
      const raw = await geminiOrchestrator.processRequest('summarization', llmInput, { model: 'gemini-3.1-flash-lite', temperature: 0.3 });
      const summary = typeof raw === 'string' ? raw : (raw as any)?.content || JSON.stringify(raw);
      return { summary, profile: nodeRun.outputProfile };
    } catch (e: any) {
      return { summary: `Could not summarize this node's output: ${e?.message || String(e)}`, profile: nodeRun.outputProfile };
    }
  }

  // ─── Persisted analyzer chat session ────────────────────────────────────

  async getOrCreateSession(workflowId: string, userId: string): Promise<{ id: string } | null> {
    const db = getDbClient();
    const { data: existing } = await db
      .from('ai_analyzer_sessions')
      .select('id')
      .eq('workflow_id', workflowId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing?.id) return existing;

    const { data: created, error } = await db
      .from('ai_analyzer_sessions')
      .upsert({ workflow_id: workflowId, user_id: userId }, { onConflict: 'workflow_id,user_id' })
      .select('id')
      .maybeSingle();
    if (error) {
      logger.error('[ExecutionRuntimeAnalyzer] getOrCreateSession failed:', error);
      return null;
    }
    return created;
  }

  async listSessionMessages(workflowId: string, userId: string, limit = 50): Promise<AnalyzerChatMessage[]> {
    const session = await this.getOrCreateSession(workflowId, userId);
    if (!session) return [];
    const db = getDbClient();
    const { data } = await db
      .from('ai_analyzer_messages')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(limit);
    return (data || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      messageKind: m.message_kind,
      referencedExecutionId: m.referenced_execution_id || undefined,
      referencedNodeId: m.referenced_node_id || undefined,
      runtimeContext: m.runtime_context,
      createdAt: toIso(m.created_at) || m.created_at,
    }));
  }

  private async appendMessage(sessionId: string, message: {
    role: 'user' | 'assistant';
    content: string;
    referencedExecutionId?: string;
    referencedNodeId?: string;
    runtimeContext?: unknown;
  }): Promise<void> {
    const db = getDbClient();
    const { error } = await db.from('ai_analyzer_messages').insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      message_kind: 'chat',
      referenced_execution_id: message.referencedExecutionId || null,
      referenced_node_id: message.referencedNodeId || null,
      runtime_context: message.runtimeContext || {},
    });
    if (error) {
      logger.error('[ExecutionRuntimeAnalyzer] appendMessage failed:', error);
    }
    await db.from('ai_analyzer_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
  }

  private sanitizeRemediationCandidates(raw: unknown): RemediationCandidate[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const allowedKinds = new Set<string>(AI_EDITOR_MUTATION_OPERATION_KINDS);
    const out: RemediationCandidate[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const cand = item as Record<string, unknown>;
      const ops = Array.isArray(cand.proposedOperations)
        ? (cand.proposedOperations as unknown[]).filter(
            (op) => op && typeof op === 'object' && allowedKinds.has((op as Record<string, unknown>).kind as string)
          )
        : [];
      if (ops.length === 0) continue;
      out.push({
        confidence: typeof cand.confidence === 'number' ? cand.confidence : 0.5,
        userFacingSummary: typeof cand.userFacingSummary === 'string' ? cand.userFacingSummary : 'Suggested fix based on run history.',
        risk: cand.risk === 'low' || cand.risk === 'high' ? cand.risk : 'medium',
        proposedOperations: ops as AiEditorMutationOperation[],
      });
    }
    return out.length ? out : undefined;
  }

  private tryParseJson(text: string): unknown {
    const trimmed = text.trim();
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fence ? fence[1].trim() : trimmed;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  /**
   * Persisted analyzer chat turn. Branches on whether an executionId is present:
   * - executionId given: execution-aware explanation via explainExecution.
   * - no executionId, workflow snapshot given: static workflow-structure chat (parity with /editor/analyze).
   * - neither: pattern-only chat (works even for unsaved/no-canvas context, e.g. "what fails most?").
   */
  async chat(args: AnalyzerChatArgs): Promise<AnalyzerChatResponse> {
    const session = await this.getOrCreateSession(args.workflowId, args.userId);
    if (!session) {
      return { message: 'Could not open an analyzer session. Please try again.', references: [] };
    }

    await this.appendMessage(session.id, {
      role: 'user',
      content: args.prompt,
      referencedExecutionId: args.executionId,
      referencedNodeId: args.nodeId,
    });

    const history = await this.listSessionMessages(args.workflowId, args.userId, 24);
    const historyForPrompt = history
      .slice(0, -1) // exclude the message we just appended; it's the "latest turn"
      .slice(-16)
      .map((m) => ({ role: m.role, content: m.content.length > 6000 ? `${m.content.slice(0, 6000)}…` : m.content }));

    let response: AnalyzerChatResponse;

    if (args.executionId) {
      const explanation = await this.explainExecution({
        executionId: args.executionId,
        workflowId: args.workflowId,
        nodeId: args.nodeId,
        prompt: args.prompt,
      });
      const remediationCandidates = this.sanitizeRemediationCandidates(explanation.remediationCandidates);
      const messageParts = [explanation.summary];
      if (explanation.dataNarration) messageParts.push(explanation.dataNarration);
      if (explanation.rootCause) messageParts.push(`Root cause: ${explanation.rootCause}`);
      response = {
        message: messageParts.filter(Boolean).join('\n\n'),
        references: [{ executionId: args.executionId, nodeId: args.nodeId, kind: 'execution_profile' }],
        remediationCandidates,
      };
    } else {
      const patterns = await this.detectPatterns(args.workflowId, 20);
      const llmInput = [
        'You are a workflow analyzer assistant discussing a workflow with the user.',
        args.workflow
          ? `The user's current workflow has ${args.workflow.nodes?.length ?? 0} node(s).`
          : 'No live canvas snapshot was provided for this turn — answer from execution history and conversation only.',
        patterns.length
          ? `Known recurring runtime patterns from recent executions:\n${JSON.stringify(patterns.slice(0, 10), null, 2)}`
          : 'No recurring runtime patterns detected in recent executions.',
        historyForPrompt.length ? `Recent conversation:\n${JSON.stringify(historyForPrompt, null, 2)}` : '',
        `User: ${args.prompt}`,
      ].filter(Boolean).join('\n\n');

      try {
        const raw = await geminiOrchestrator.processRequest('chat-generation', llmInput, { model: 'gemini-3.5-flash', temperature: 0.4 });
        const message = typeof raw === 'string' ? raw : (raw as any)?.content || JSON.stringify(raw);
        response = { message, references: [], patterns: patterns.length ? patterns : undefined };
      } catch (e: any) {
        response = { message: `Could not answer that: ${e?.message || String(e)}`, references: [] };
      }
    }

    await this.appendMessage(session.id, {
      role: 'assistant',
      content: response.message,
      referencedExecutionId: args.executionId,
      referencedNodeId: args.nodeId,
      runtimeContext: { references: response.references, patterns: response.patterns, remediationCandidates: response.remediationCandidates },
    });

    return response;
  }
}

export const executionRuntimeAnalyzer = new ExecutionRuntimeAnalyzer();
