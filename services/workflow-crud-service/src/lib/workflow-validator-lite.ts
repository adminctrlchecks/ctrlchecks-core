/**
 * Lite workflow validator for workflow-crud-service.
 *
 * Performs structural-only checks (no node registry required). The worker runs
 * the full registry-aware validateWorkflowForSave before delegating, so this
 * is a backstop that protects against direct calls that bypass the canary.
 *
 * Ported from worker/src/core/validation/workflow-save-validator.ts.
 */

export interface WorkflowNode {
  id: string;
  type?: string;
  data?: {
    label?: string;
    type?: string;
    category?: string;
    config?: Record<string, unknown>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface LiteValidationResult {
  valid: boolean;
  canSave: boolean;
  errors: string[];
  warnings: string[];
}

export interface NormalizeResult {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  migrationsApplied: string[];
}

// ── Trigger detection (mirrors worker isTriggerNode, no registry) ─────────────

export function isTriggerNodeLite(node: WorkflowNode): boolean {
  const nodeType = String(node.data?.type || node.type || '');
  const category = String(node.data?.category || '');

  if (category.toLowerCase() === 'triggers' || category.toLowerCase() === 'trigger') return true;
  if (nodeType.includes('trigger')) return true;

  const knownTriggers = [
    'manual_trigger', 'webhook', 'schedule', 'chat_trigger',
    'form_trigger', 'form', 'workflow_trigger', 'error_trigger',
    'interval', 'gmail_trigger', 'slack_trigger', 'discord_trigger',
    'microsoft_teams_trigger', 'outlook_trigger', 'google_calendar_trigger', 'google_sheets_trigger', 'google_drive_trigger', 'typeform_trigger', 'tally_trigger', 'github_trigger', 'gitlab_trigger', 'jira_trigger', 'linear_trigger', 'trello_trigger', 'stripe_trigger', 'shopify_trigger',
  ];
  return knownTriggers.includes(nodeType);
}

// ── Cycle detection (DFS) ──────────────────────────────────────────────────────

function hasDirectedCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const adjacency = new Map<string, string[]>();
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const id of nodeIds) adjacency.set(id, []);
  for (const e of edges) {
    if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
      adjacency.get(e.source)!.push(e.target);
    }
  }

  const UNVISITED = 0, VISITING = 1, VISITED = 2;
  const state = new Map<string, number>();
  for (const id of nodeIds) state.set(id, UNVISITED);

  const dfs = (id: string): boolean => {
    state.set(id, VISITING);
    for (const next of adjacency.get(id) || []) {
      const s = state.get(next) ?? UNVISITED;
      if (s === VISITING) return true;
      if (s === UNVISITED && dfs(next)) return true;
    }
    state.set(id, VISITED);
    return false;
  };

  for (const id of nodeIds) {
    if ((state.get(id) ?? UNVISITED) === UNVISITED && dfs(id)) return true;
  }
  return false;
}

// ── Lite normalizer — structural dedup only (no registry) ─────────────────────

export function normalizeWorkflowForSaveLite(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): NormalizeResult {
  const migrationsApplied: string[] = [];

  // Dedup nodes by ID (keep first)
  const nodeMap = new Map<string, WorkflowNode>();
  const dupNodeIds: string[] = [];
  for (const n of nodes) {
    if (nodeMap.has(n.id)) dupNodeIds.push(n.id);
    else nodeMap.set(n.id, n);
  }
  if (dupNodeIds.length > 0) {
    migrationsApplied.push(`Removed ${dupNodeIds.length} duplicate node(s): ${dupNodeIds.join(', ')}`);
  }
  let normalizedNodes = Array.from(nodeMap.values());

  // Dedup trigger nodes (keep first)
  const triggers = normalizedNodes.filter(isTriggerNodeLite);
  let workingEdges = [...edges];
  if (triggers.length > 1) {
    const keepId = triggers[0].id;
    const removeIds = new Set(triggers.slice(1).map((t) => t.id));
    normalizedNodes = normalizedNodes.filter((n) => !isTriggerNodeLite(n) || n.id === keepId);
    workingEdges = workingEdges.filter((e) => !removeIds.has(e.source) && !removeIds.has(e.target));
    migrationsApplied.push(`Removed ${removeIds.size} duplicate trigger node(s)`);
  }

  // Remove edges with dangling references, then dedup
  const validIds = new Set(normalizedNodes.map((n) => n.id));
  const edgeMap = new Map<string, WorkflowEdge>();
  const removedEdges: string[] = [];
  for (const e of workingEdges) {
    if (!validIds.has(e.source) || !validIds.has(e.target)) {
      removedEdges.push(e.id || `${e.source}->${e.target}`);
      continue;
    }
    const key = `${e.source}::${e.target}::${e.sourceHandle ?? 'default'}::${e.targetHandle ?? 'default'}`;
    if (!edgeMap.has(key)) edgeMap.set(key, e);
  }
  const normalizedEdges = Array.from(edgeMap.values());

  if (removedEdges.length > 0) {
    migrationsApplied.push(`Removed ${removedEdges.length} invalid edge(s)`);
  }
  const dupEdges = workingEdges.length - removedEdges.length - normalizedEdges.length;
  if (dupEdges > 0) {
    migrationsApplied.push(`Deduplicated ${dupEdges} duplicate edge(s)`);
  }

  return { nodes: normalizedNodes, edges: normalizedEdges, migrationsApplied };
}

// ── Lite validator — structural only (no registry) ────────────────────────────

export function validateWorkflowForSaveLite(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): LiteValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(nodes) || nodes.length === 0) {
    errors.push('Workflow must have at least one node');
  }
  if (!Array.isArray(edges)) {
    errors.push('Edges must be an array');
  }

  const triggers = (nodes || []).filter(isTriggerNodeLite);
  if (triggers.length === 0) {
    errors.push('Workflow must have exactly one trigger node');
  } else if (triggers.length > 1) {
    errors.push(`Workflow has ${triggers.length} trigger nodes but must have exactly one`);
  }

  const nodeIds = new Set((nodes || []).map((n) => n.id));
  const danglingEdges = (edges || []).filter((e) => !nodeIds.has(e.source) || !nodeIds.has(e.target));
  if (danglingEdges.length > 0) {
    errors.push(`Found ${danglingEdges.length} edge(s) referencing non-existent nodes`);
  }

  const isolated = (nodes || []).filter((n) => {
    const hasIn = (edges || []).some((e) => e.target === n.id);
    const hasOut = (edges || []).some((e) => e.source === n.id);
    return !hasIn && !hasOut && !isTriggerNodeLite(n);
  });
  if (isolated.length > 0) {
    warnings.push(`Found ${isolated.length} isolated node(s) not connected to the workflow`);
  }

  if ((nodes || []).length > 0 && (edges || []).length > 0 && hasDirectedCycle(nodes, edges)) {
    errors.push('Workflow graph contains a cycle — keep DAG structure');
  }

  return { valid: errors.length === 0, canSave: errors.length === 0, errors, warnings };
}
