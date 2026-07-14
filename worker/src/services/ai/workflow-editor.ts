// AI Workflow Editor
// In-workflow intelligence with node suggestions and code assist

import { geminiOrchestrator } from './gemini-orchestrator';
import { unifiedNodeRegistry } from '../../core/registry/unified-node-registry';
import { unifiedNormalizeNodeType, unifiedNormalizeNodeTypeString } from '../../core/utils/unified-node-type-normalizer';
import { unifiedGraphOrchestrator } from '../../core/orchestration/unified-graph-orchestrator';
import type { Workflow, WorkflowNode, WorkflowEdge } from '../../core/types/ai-types';
import type { ExecutionOrder } from '../../core/orchestration/execution-order-manager';
import type {
  AiEditorOperation,
  AiEditorMutationOperation,
  AiEditorNodeSchemaSummary,
  AiEditorRegistryContext,
  AiEditorGraphNodeRef,
  AiEditorBranchPathStep,
  AiEditorBranchSummary,
  AiEditorBranchNodeSummary,
  AiEditorGraphRewriteContext,
  WorkflowDiff,
  WorkflowNodeDiff,
  WorkflowEdgeDiff,
} from '../../core/types/ai-editor-contracts';
import { AI_EDITOR_MUTATION_OPERATION_KINDS } from '../../core/types/ai-editor-contracts';

interface NodeSuggestion {
  type: string;
  reason: string;
  confidence: number;
  impact: string;
}

interface NodeImprovement {
  suggestions: NodeSuggestion[];
  alternatives: any[];
  optimizations: any[];
  warnings: string[];
}

export class AIWorkflowEditor {
  /**
   * Build a registry-driven summary of all node types that appear in the given workflow.
   * This is the canonical way for the AI editor to discover node schemas without ever
   * re-defining them outside of unified-node-registry.
   */
  buildRegistryContextForWorkflow(workflow: Workflow): AiEditorRegistryContext {
    const nodeSchemas = new Map<string, AiEditorNodeSchemaSummary>();

    for (const node of workflow.nodes || []) {
      const normalizedType =
        unifiedNormalizeNodeType(node as any) ||
        (node as any).data?.type ||
        node.type;

      if (!normalizedType || nodeSchemas.has(normalizedType)) {
        continue;
      }

      const def = unifiedNodeRegistry.get(normalizedType);
      if (!def) {
        continue;
      }

      const inputs: AiEditorNodeSchemaSummary['inputs'] = [];
      const inputSchema = def.inputSchema || {};
      const requiredInputs = new Set(def.requiredInputs || []);

      for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
        const fd: any = fieldDef;
        inputs.push({
          name: fieldName,
          type: String(fd.type || 'string'),
          required: requiredInputs.has(fieldName) || !!fd.required,
          description:
            typeof fd.description === 'string' ? fd.description : undefined,
        });
      }

      const outputs: AiEditorNodeSchemaSummary['outputs'] = [];
      const outputSchema = unifiedNodeRegistry.getOutputSchema(normalizedType);
      if (outputSchema) {
        for (const [portName, portDef] of Object.entries(outputSchema)) {
          const port: any = portDef;
          const schema = port.schema || {};
          const properties = schema.properties as
            | Record<string, { type?: string }>
            | undefined;
          const fields: Record<string, string> = {};

          if (properties && typeof properties === 'object') {
            for (const [propName, meta] of Object.entries(properties)) {
              const mt: any = meta;
              const t = typeof mt.type === 'string' ? mt.type : 'any';
              fields[propName] = t;
            }
          }

          outputs.push({
            port: portName,
            fields: Object.keys(fields).length ? fields : undefined,
          });
        }
      }

      const credentials =
        def.credentialSchema?.requirements?.map((req) => ({
          provider: req.provider,
          category: req.category || 'credential',
          required: !!req.required,
        })) || [];

      nodeSchemas.set(normalizedType, {
        type: normalizedType,
        label: def.label,
        category: def.category,
        description: def.description,
        inputs,
        outputs,
        credentials: credentials.length ? credentials : undefined,
      });
    }

    return {
      nodeSchemas: Object.fromEntries(nodeSchemas.entries()),
    };
  }

  /**
   * Apply a list of AI editor operations to a workflow using the unified graph orchestrator.
   * All structural changes are delegated to orchestrator; edges are never mutated directly.
   */
  async applyOperations(
    workflow: Workflow,
    operations: AiEditorOperation[]
  ): Promise<{
    workflow: Workflow;
    executionOrder?: ExecutionOrder;
    diff: WorkflowDiff;
    errors: string[];
    warnings: string[];
  }> {
    let currentWorkflow: Workflow = {
      nodes: [...workflow.nodes],
      edges: [...workflow.edges],
      metadata: workflow.metadata,
    };
    let executionOrder: ExecutionOrder | undefined;
    const errors: string[] = [];
    const warnings: string[] = [];

    const originalNodesById = new Map<string, WorkflowNode>();
    const originalEdgesById = new Map<string, WorkflowEdge>();
    for (const n of workflow.nodes) originalNodesById.set(n.id, n);
    for (const e of workflow.edges) originalEdgesById.set(e.id, e);

    const mutationOps = operations.filter(
      (op): op is AiEditorMutationOperation =>
        op.kind !== 'explain_workflow' && op.kind !== 'validate_workflow'
    );

    const applyJsonPointerUpdate = (obj: any, path: string, value: unknown) => {
      if (!path.startsWith('/')) {
        throw new Error(`Invalid JSON pointer path: ${path}`);
      }
      const segments = path
        .split('/')
        .slice(1)
        .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
      let target: any = obj;
      for (let i = 0; i < segments.length - 1; i++) {
        const key = segments[i];
        if (typeof target[key] !== 'object' || target[key] === null) {
          target[key] = {};
        }
        target = target[key];
      }
      target[segments[segments.length - 1]] = value;
    };

    for (const op of mutationOps) {
      try {
        if (op.kind === 'add_node' || op.kind === 'insert_safety_node') {
          const def = unifiedNodeRegistry.get(op.nodeType);
          if (!def) {
            errors.push(`Unknown node type: ${op.nodeType}`);
            continue;
          }
          const id = `${op.nodeType}_${Date.now().toString(36)}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;
          const baseConfig = def.defaultConfig();
          const config = {
            ...baseConfig,
            ...(op.configOverrides || {}),
          };
          const customLabel =
            op.kind === 'add_node' && typeof op.label === 'string' ? op.label : undefined;
          const newNode: WorkflowNode = {
            id,
            type: op.nodeType,
            position: { x: 0, y: 0 },
            data: {
              label: customLabel || def.label || op.nodeType,
              type: op.nodeType,
              category: def.category,
              config,
            },
          };

          const positionHint = op.kind === 'insert_safety_node' ? op.position : op.positionHint;
          const injectionPosition = positionHint?.relation || 'after';
          const referenceNodeId = positionHint?.referenceNodeId || currentWorkflow.nodes[0]?.id;

          if (!referenceNodeId) {
            errors.push('add_node: no referenceNodeId available to place the node');
            continue;
          }

          const injectionContext = {
            type: op.kind === 'insert_safety_node' ? 'safety' : 'user_requested',
            position: injectionPosition,
            referenceNodeId,
            reason: 'ai_editor',
          } as const;

          const result = await unifiedGraphOrchestrator.injectNode(
            currentWorkflow,
            newNode,
            injectionContext
          );
          currentWorkflow = result.workflow;
          executionOrder = result.executionOrder;
          if (result.errors.length) errors.push(...result.errors);
          if (result.warnings.length) warnings.push(...result.warnings);
        } else if (op.kind === 'remove_node') {
          const result = unifiedGraphOrchestrator.removeNode(currentWorkflow, op.nodeId);
          currentWorkflow = result.workflow;
          executionOrder = result.executionOrder;
          if (result.errors.length) errors.push(...result.errors);
          if (result.warnings.length) warnings.push(...result.warnings);
        } else if (op.kind === 'update_node_config') {
          const node = currentWorkflow.nodes.find((n) => n.id === op.nodeId);
          if (!node) {
            errors.push(`update_node_config: node ${op.nodeId} not found`);
            continue;
          }
          const clonedConfig = { ...(node.data.config || {}) };
          applyJsonPointerUpdate(clonedConfig, op.path, op.newValue);
          node.data = {
            ...node.data,
            config: clonedConfig,
          };
          const recon = unifiedGraphOrchestrator.reconcileWorkflow(currentWorkflow);
          currentWorkflow = recon.workflow;
          executionOrder = recon.executionOrder;
          if (recon.errors.length) errors.push(...recon.errors);
          if (recon.warnings.length) warnings.push(...recon.warnings);
        } else if (op.kind === 'replace_node') {
          const node = currentWorkflow.nodes.find((n) => n.id === op.targetNodeId);
          if (!node) {
            errors.push(`replace_node: node ${op.targetNodeId} not found`);
            continue;
          }
          const def = unifiedNodeRegistry.get(op.newNodeType);
          if (!def) {
            errors.push(`replace_node: unknown node type ${op.newNodeType}`);
            continue;
          }
          const baseConfig = def.defaultConfig();
          const existingConfig = (node.data.config || {}) as Record<string, unknown>;
          const inputSchema = def.inputSchema || {};

          const preservedConfig: Record<string, unknown> = {};
          if (op.configStrategy === 'preserve_compatible' || op.configStrategy === 'merge') {
            for (const key of Object.keys(inputSchema)) {
              if (key in existingConfig) {
                preservedConfig[key] = existingConfig[key];
              }
            }
          }

          const mergedConfig: Record<string, unknown> =
            op.configStrategy === 'use_defaults'
              ? { ...baseConfig }
              : {
                  ...baseConfig,
                  ...preservedConfig,
                };

          if (op.configOverrides) {
            Object.assign(mergedConfig, op.configOverrides);
          }

          node.type = op.newNodeType;
          node.data = {
            ...node.data,
            type: op.newNodeType,
            label: def.label || node.data.label || op.newNodeType,
            category: def.category,
            config: mergedConfig,
          };

          const recon = unifiedGraphOrchestrator.reconcileWorkflow(currentWorkflow);
          currentWorkflow = recon.workflow;
          executionOrder = recon.executionOrder;
          if (recon.errors.length) errors.push(...recon.errors);
          if (recon.warnings.length) warnings.push(...recon.warnings);
        } else if (op.kind === 'refactor_linearize') {
          // Phase 1: no-op with explicit warning; structural refactors require dedicated design.
          warnings.push(
            'refactor_linearize: operation acknowledged but no structural changes were applied in this phase.'
          );
        }
      } catch (err: any) {
        errors.push(
          `Failed to apply operation ${op.kind}: ${err?.message || String(err)}`
        );
      }
    }

    const validation = unifiedGraphOrchestrator.validateWorkflow(
      currentWorkflow,
      executionOrder
    );
    if (!validation.valid) {
      errors.push(...validation.errors);
    }
    if (validation.warnings.length) {
      warnings.push(...validation.warnings);
    }

    const nodeDiffs: WorkflowNodeDiff[] = [];
    const edgeDiffs: WorkflowEdgeDiff[] = [];

    const finalNodesById = new Map<string, WorkflowNode>();
    const finalEdgesById = new Map<string, WorkflowEdge>();
    for (const n of currentWorkflow.nodes) finalNodesById.set(n.id, n);
    for (const e of currentWorkflow.edges) finalEdgesById.set(e.id, e);

    const allNodeIds = new Set<string>([
      ...Array.from(originalNodesById.keys()),
      ...Array.from(finalNodesById.keys()),
    ]);
    for (const id of allNodeIds) {
      const before = originalNodesById.get(id);
      const after = finalNodesById.get(id);
      if (!before && after) {
        nodeDiffs.push({ nodeId: id, before: undefined, after });
      } else if (before && !after) {
        nodeDiffs.push({ nodeId: id, before, after: undefined });
      } else if (before && after) {
        const beforeJson = JSON.stringify(before);
        const afterJson = JSON.stringify(after);
        if (beforeJson !== afterJson) {
          nodeDiffs.push({ nodeId: id, before, after });
        }
      }
    }

    const allEdgeIds = new Set<string>([
      ...Array.from(originalEdgesById.keys()),
      ...Array.from(finalEdgesById.keys()),
    ]);
    for (const id of allEdgeIds) {
      const before = originalEdgesById.get(id);
      const after = finalEdgesById.get(id);
      if (!before && after) {
        edgeDiffs.push({ edgeId: id, before: undefined, after });
      } else if (before && !after) {
        edgeDiffs.push({ edgeId: id, before, after: undefined });
      } else if (before && after) {
        const beforeJson = JSON.stringify(before);
        const afterJson = JSON.stringify(after);
        if (beforeJson !== afterJson) {
          edgeDiffs.push({ edgeId: id, before, after });
        }
      }
    }

    const diff: WorkflowDiff = {
      nodes: nodeDiffs.length ? nodeDiffs : undefined,
      edges: edgeDiffs.length ? edgeDiffs : undefined,
      metadata:
        JSON.stringify(workflow.metadata || {}) !==
        JSON.stringify(currentWorkflow.metadata || {})
          ? {
              before: workflow.metadata,
              after: currentWorkflow.metadata,
            }
          : undefined,
    };

    return {
      workflow: currentWorkflow,
      executionOrder,
      diff,
      errors,
      warnings,
    };
  }

  private summarizeValueForAiEditor(value: unknown, depth = 0): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      return value.length > 500 ? `${value.slice(0, 500)}...[truncated]` : value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      return value.slice(0, 8).map((item) => this.summarizeValueForAiEditor(item, depth + 1));
    }
    if (typeof value === 'object') {
      if (depth >= 3) return '[object]';
      const out: Record<string, unknown> = {};
      for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
        if (/credential|secret|token|password|api[_-]?key|access[_-]?key|private[_-]?key/i.test(key)) {
          out[key] = '[redacted]';
        } else {
          out[key] = this.summarizeValueForAiEditor(nestedValue, depth + 1);
        }
      }
      return out;
    }
    return String(value);
  }

  private buildWorkflowNodePromptSummary(workflow: Workflow): Array<Record<string, unknown>> {
    return workflow.nodes.map((node) => {
      const data = (node.data || {}) as any;
      const config = data.config && typeof data.config === 'object' ? data.config : {};
      return {
        id: node.id,
        type: data.type || node.type,
        label: data.label,
        position: node.position,
        configKeys: Object.keys(config),
        config: this.summarizeValueForAiEditor(config),
      };
    });
  }

  private buildWorkflowEdgePromptSummary(workflow: Workflow): Array<Record<string, unknown>> {
    return workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: (edge as any).sourceHandle,
      target: edge.target,
      targetHandle: (edge as any).targetHandle,
      type: edge.type,
    }));
  }

  /**
   * Build deterministic branch/path facts about the current graph so the LLM can map
   * natural-language branch references ("when status is pending", "condition is false")
   * to concrete existing node ids. Purely structural — works for any node types.
   */
  buildGraphRewriteContext(workflow: Workflow): AiEditorGraphRewriteContext {
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    const nodesById = new Map<string, WorkflowNode>();
    for (const node of nodes) nodesById.set(node.id, node);

    const toRef = (node: WorkflowNode): AiEditorGraphNodeRef => {
      const data = (node.data || {}) as any;
      return {
        id: node.id,
        type: String(data.type || node.type || 'unknown'),
        label: typeof data.label === 'string' ? data.label : undefined,
      };
    };

    const outgoingBySource = new Map<string, WorkflowEdge[]>();
    const incomingByTarget = new Map<string, WorkflowEdge[]>();
    for (const edge of edges) {
      const out = outgoingBySource.get(edge.source) || [];
      out.push(edge);
      outgoingBySource.set(edge.source, out);
      const inc = incomingByTarget.get(edge.target) || [];
      inc.push(edge);
      incomingByTarget.set(edge.target, inc);
    }

    const edgeHandle = (edge: WorkflowEdge): string => {
      const handle = (edge as any).sourceHandle;
      return typeof handle === 'string' && handle.trim() ? handle.trim() : 'default';
    };

    const isBranchNode = (node: WorkflowNode): boolean => {
      const outEdges = outgoingBySource.get(node.id) || [];
      const handles = new Set(outEdges.map(edgeHandle));
      if (handles.size >= 2) return true;
      // A single wired branch still counts when its handle is an explicit branch name.
      if (outEdges.length > 0 && !handles.has('default')) return true;
      const outputSchema = unifiedNodeRegistry.getOutputSchema(toRef(node).type);
      return !!outputSchema && Object.keys(outputSchema).length >= 2;
    };

    const branchNodeIds = new Set(nodes.filter(isBranchNode).map((node) => node.id));

    // Branch paths: for every node, the sequence(s) of branch decisions that lead to it.
    const branchPathsByNode = new Map<string, AiEditorBranchPathStep[][]>();
    const roots = nodes.filter((node) => !(incomingByTarget.get(node.id) || []).length);
    const traversalQueue: Array<{ nodeId: string; path: AiEditorBranchPathStep[] }> = roots.map(
      (node) => ({ nodeId: node.id, path: [] })
    );
    const visited = new Set<string>();
    let traversalSteps = 0;
    while (traversalQueue.length && traversalSteps < 5000) {
      traversalSteps += 1;
      const { nodeId, path } = traversalQueue.shift()!;
      const visitKey = `${nodeId}|${path.map((s) => `${s.branchNodeId}:${s.sourceHandle}`).join('>')}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);

      if (path.length) {
        const existing = branchPathsByNode.get(nodeId) || [];
        if (existing.length < 3) {
          existing.push(path);
          branchPathsByNode.set(nodeId, existing);
        }
      }

      const node = nodesById.get(nodeId);
      if (!node) continue;
      const nodeIsBranch = branchNodeIds.has(nodeId);
      for (const edge of outgoingBySource.get(nodeId) || []) {
        const nextPath =
          nodeIsBranch && path.length < 6
            ? [
                ...path,
                {
                  branchNodeId: nodeId,
                  branchNodeType: toRef(node).type,
                  branchNodeLabel: toRef(node).label,
                  sourceHandle: edgeHandle(edge),
                },
              ]
            : path;
        traversalQueue.push({ nodeId: edge.target, path: nextPath });
      }
    }

    const collectDownstream = (startIds: string[]): AiEditorGraphNodeRef[] => {
      const seen = new Set<string>(startIds);
      const queue = [...startIds];
      const refs: AiEditorGraphNodeRef[] = [];
      while (queue.length && refs.length < 20) {
        const id = queue.shift()!;
        const node = nodesById.get(id);
        if (node) refs.push(toRef(node));
        for (const edge of outgoingBySource.get(id) || []) {
          if (!seen.has(edge.target)) {
            seen.add(edge.target);
            queue.push(edge.target);
          }
        }
      }
      return refs;
    };

    const branchNodes: AiEditorBranchNodeSummary[] = [];
    for (const node of nodes) {
      if (!branchNodeIds.has(node.id)) continue;
      const edgesByHandle = new Map<string, WorkflowEdge[]>();
      for (const edge of outgoingBySource.get(node.id) || []) {
        const handle = edgeHandle(edge);
        const group = edgesByHandle.get(handle) || [];
        group.push(edge);
        edgesByHandle.set(handle, group);
      }
      const outgoingBranches: AiEditorBranchSummary[] = [];
      for (const [sourceHandle, handleEdges] of edgesByHandle.entries()) {
        const directTargetIds = handleEdges.map((edge) => edge.target);
        outgoingBranches.push({
          sourceHandle,
          directTargets: directTargetIds
            .map((id) => nodesById.get(id))
            .filter((n): n is WorkflowNode => !!n)
            .map(toRef),
          downstreamNodes: collectDownstream(directTargetIds),
        });
      }
      const data = (node.data || {}) as any;
      branchNodes.push({
        ...toRef(node),
        configSummary:
          data.config && typeof data.config === 'object'
            ? this.summarizeValueForAiEditor(data.config)
            : undefined,
        outgoingBranches,
      });
    }

    return {
      nodes: nodes.map((node) => {
        const paths = branchPathsByNode.get(node.id);
        return { ...toRef(node), ...(paths?.length ? { branchPaths: paths } : {}) };
      }),
      branchNodes,
    };
  }

  private formatBranchPathForUser(path: AiEditorBranchPathStep[]): string {
    return path
      .map((step) => `${step.branchNodeLabel || step.branchNodeType} → "${step.sourceHandle}" branch`)
      .join(' → ');
  }

  /**
   * When edit generation fails validation, produce a precise graph-aware clarification
   * instead of a generic refusal: enumerate the existing nodes that the request seems
   * to reference, each with the branch path that leads to it.
   */
  private buildGraphAwareClarification(
    rawRequest: string,
    context: AiEditorGraphRewriteContext
  ): string {
    const normalizedRequest = ` ${rawRequest
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/[^a-z0-9\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()} `;
    const genericTokens = new Set(['node', 'nodes', 'trigger', 'workflow', 'the', 'and', 'with', 'new']);

    const matches: Array<{ ref: AiEditorGraphRewriteContext['nodes'][number] }> = [];
    for (const nodeRef of context.nodes) {
      const tokens = new Set<string>();
      for (const source of [nodeRef.type, nodeRef.label]) {
        for (const token of String(source || '').toLowerCase().split(/[^a-z0-9]+/)) {
          if (token.length >= 3 && !genericTokens.has(token)) tokens.add(token);
        }
      }
      const matched = Array.from(tokens).some(
        (token) => normalizedRequest.includes(` ${token} `) || normalizedRequest.includes(` ${token}s `)
      );
      if (matched) matches.push({ ref: nodeRef });
    }

    if (matches.length) {
      const lines = matches.slice(0, 6).map(({ ref }, index) => {
        const location = ref.branchPaths?.length
          ? ` — reached via ${this.formatBranchPathForUser(ref.branchPaths[0])}`
          : ' — on the main path';
        return `${index + 1}. ${ref.label || ref.type} (${ref.type}, id: ${ref.id})${location}`;
      });
      return [
        'I could not safely turn that request into a validated edit yet. Here are the existing nodes that seem to match it:',
        '',
        ...lines,
        '',
        'Tell me exactly which of these to change — for example "replace #1 with <service>" or "remove #2" — or send one change at a time.',
      ].join('\n');
    }

    if (context.branchNodes.length) {
      const lines = context.branchNodes.slice(0, 4).map((branchNode) => {
        const handles = branchNode.outgoingBranches.map((b) => `"${b.sourceHandle}"`).join(', ');
        return `- ${branchNode.label || branchNode.type} (${branchNode.type}) with branches: ${handles || 'none wired'}`;
      });
      return [
        'I could not safely map that request to exact workflow changes. This workflow branches at:',
        '',
        ...lines,
        '',
        'Please name the branch and the node you want changed (for example "the node on the false branch"), or send one change at a time.',
      ].join('\n');
    }

    return [
      'I could not safely convert that request into a validated workflow edit.',
      'Please name the exact node you want changed, or split the request into one replacement/removal at a time.',
    ].join(' ');
  }

  /**
   * Structured output schema for edit suggestions.
   *
   * Deliberately FLAT with all core fields required and enum-constrained:
   * Gemini's constrained JSON mode only guarantees fields listed in `required`,
   * so a kind-specific schema with optional fields let the model legally emit
   * truncated operations like { "kind": "replace_node", "targetNodeId": "..." }
   * with no newNodeType — the exact failure seen in production. With required
   * enums the model cannot omit fields or invent node ids/types. The flat
   * interpretation is converted to whitelisted operations in
   * convertInterpretedOperations().
   */
  private getSuggestStructuredOutputSchema(workflow: Workflow): Record<string, unknown> {
    const nodeIds = (workflow.nodes || []).map((node) => node.id);
    return {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description:
            'Plain-English explanation of the proposed workflow edit. For multi-part requests, enumerate each planned change as a numbered list. Do not include raw JSON here.',
        },
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: AI_EDITOR_MUTATION_OPERATION_KINDS,
                description: 'The edit action to perform.',
              },
              targetNodeId: {
                type: 'string',
                enum: [...nodeIds, 'none'],
                description:
                  'The existing workflow node this action applies to: the node to replace/remove/reconfigure, or the reference node for add_node/insert_safety_node placement. Use "none" only for refactor_linearize.',
              },
              newNodeType: {
                type: 'string',
                description:
                  'For replace_node: the canonical replacement node type (e.g. "slack_message", "google_gmail"). For add_node/insert_safety_node: the node type to create. Must be a canonical node type — prefer types listed in the REGISTRY SUMMARY or MATCHED NODE CANDIDATES sections of the prompt. Use "none" for remove_node, update_node_config, and refactor_linearize.',
              },
              relation: {
                type: 'string',
                enum: ['before', 'after', 'none'],
                description:
                  'For add_node/insert_safety_node: where to place the new node relative to targetNodeId. Use "none" for all other actions.',
              },
              configPath: {
                type: 'string',
                description:
                  'For update_node_config only: JSON pointer to the config field, e.g. "/subject". Empty string for all other actions.',
              },
              configValueJson: {
                type: 'string',
                description:
                  'For update_node_config only: the new value encoded as JSON (e.g. "\\"hello\\"" or "42"). Empty string for all other actions.',
              },
              configOverridesJson: {
                type: 'string',
                description:
                  'Optional JSON object (encoded as a string) with config overrides for the new/replacement node, using only fields from that node type\'s schema. Empty string if none.',
              },
              label: {
                type: 'string',
                description: 'Optional label for add_node. Empty string if none.',
              },
            },
            required: ['action', 'targetNodeId', 'newNodeType'],
          },
        },
      },
      required: ['message', 'operations'],
    };
  }

  private parseJsonStringSafely(value: unknown): unknown {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Convert flat interpreted operations (from the structured output schema) into
   * whitelisted AiEditorMutationOperation shapes. Deterministic — no LLM involved.
   * Items already in operation shape (with "kind") pass through untouched, so the
   * downstream validator remains the single safety net for both formats.
   */
  private convertInterpretedOperations(raw: unknown[], workflow: Workflow): unknown[] {
    const nodeIds = new Set((workflow.nodes || []).map((node) => node.id));
    const out: unknown[] = [];

    for (const item of raw) {
      if (!item || typeof item !== 'object') {
        out.push(item);
        continue;
      }
      const op = item as Record<string, any>;
      if (typeof op.kind === 'string' && typeof op.action !== 'string') {
        out.push(item);
        continue;
      }
      const action = String(op.action || '');
      const targetNodeId =
        typeof op.targetNodeId === 'string' && op.targetNodeId !== 'none' && op.targetNodeId.trim()
          ? op.targetNodeId.trim()
          : undefined;
      const rawNewNodeType =
        typeof op.newNodeType === 'string' && op.newNodeType !== 'none' && op.newNodeType.trim()
          ? op.newNodeType.trim()
          : undefined;
      const newNodeType = rawNewNodeType
        ? unifiedNormalizeNodeTypeString(rawNewNodeType) || rawNewNodeType
        : undefined;
      const relation = op.relation === 'before' ? 'before' : 'after';
      const configOverrides = this.parseJsonStringSafely(op.configOverridesJson);
      const overridesObject =
        configOverrides && typeof configOverrides === 'object' && !Array.isArray(configOverrides)
          ? (configOverrides as Record<string, unknown>)
          : undefined;

      if (action === 'replace_node') {
        out.push({
          kind: 'replace_node',
          targetNodeId,
          newNodeType,
          configStrategy: 'merge',
          ...(overridesObject ? { configOverrides: overridesObject } : {}),
        });
      } else if (action === 'remove_node') {
        out.push({ kind: 'remove_node', nodeId: targetNodeId });
      } else if (action === 'update_node_config') {
        const rawPath = typeof op.configPath === 'string' ? op.configPath.trim() : '';
        const path = rawPath && !rawPath.startsWith('/') ? `/${rawPath}` : rawPath;
        const newValue = this.parseJsonStringSafely(op.configValueJson);
        out.push({
          kind: 'update_node_config',
          nodeId: targetNodeId,
          path,
          // Omit newValue when the model gave no value so the validator rejects and retries.
          ...(newValue !== undefined ? { newValue } : {}),
        });
      } else if (action === 'add_node') {
        out.push({
          kind: 'add_node',
          nodeType: newNodeType,
          ...(typeof op.label === 'string' && op.label.trim() ? { label: op.label.trim() } : {}),
          ...(overridesObject ? { configOverrides: overridesObject } : {}),
          ...(targetNodeId && nodeIds.has(targetNodeId)
            ? { positionHint: { relation, referenceNodeId: targetNodeId } }
            : {}),
        });
      } else if (action === 'insert_safety_node') {
        out.push({
          kind: 'insert_safety_node',
          nodeType: newNodeType,
          position: { relation, referenceNodeId: targetNodeId },
          ...(overridesObject ? { configOverrides: overridesObject } : {}),
        });
      } else if (action === 'refactor_linearize') {
        out.push({ kind: 'refactor_linearize' });
      } else {
        out.push(item);
      }
    }

    return out;
  }

  /**
   * LLM-backed structured edit suggestions with orchestrator dry-run for diff preview (no persistence).
   */
  async suggestWorkflowEdits(
    workflow: Workflow,
    prompt: string,
    options?: {
      focusedNodeId?: string;
      /** Prior AI Editor chat turns so follow-ups ("implement it") stay aligned with discussed intent */
      conversationHistory?: Array<{ role: string; content: string }>;
      /**
       * Optional compact, pre-summarized text block describing recurring failure/anomaly
       * patterns observed in recent real executions of this workflow (from
       * WorkflowAnalyzer.detectPatterns). Purely additive context — never raw execution
       * payloads — so the LLM can propose operations informed by what actually happened
       * at runtime, not just the static graph shape.
       */
      runtimePatternContext?: string;
      /**
       * The user's own latest message, unwrapped. `prompt` may be a composed suggestion
       * prompt containing candidate JSON and analyzer text; graph-aware clarification
       * matching must only look at what the user actually typed.
       */
      rawUserRequest?: string;
    }
  ): Promise<{
    message: string;
    operations: AiEditorMutationOperation[];
    dryRun: Awaited<ReturnType<AIWorkflowEditor['applyOperations']>>;
    /** True when no operations were produced and the message is a clarification question. */
    needsClarification: boolean;
  }> {
    const registryContext = this.buildRegistryContextForWorkflow(workflow);
    const validation = unifiedGraphOrchestrator.validateWorkflow(workflow);
    const focusedNodeId = options?.focusedNodeId;
    const focusedNode = focusedNodeId
      ? workflow.nodes.find((n) => n.id === focusedNodeId)
      : undefined;
    const nodePromptSummary = this.buildWorkflowNodePromptSummary(workflow);
    const edgePromptSummary = this.buildWorkflowEdgePromptSummary(workflow);
    const graphRewriteContext = this.buildGraphRewriteContext(workflow);

    const opHelp = [
      'Every operation object MUST contain these three fields: "action", "targetNodeId", "newNodeType".',
      'Optional fields: "relation", "configPath", "configValueJson", "configOverridesJson", "label".',
      'How to express each edit:',
      '- Replace an existing node: { "action":"replace_node", "targetNodeId":"<existing node id>", "newNodeType":"<replacement type>" }',
      '- Remove an existing node: { "action":"remove_node", "targetNodeId":"<existing node id>", "newNodeType":"none" }',
      '- Change one config value: { "action":"update_node_config", "targetNodeId":"<existing node id>", "newNodeType":"none", "configPath":"/field", "configValueJson":"<JSON-encoded value>" }',
      '- Add a new node: { "action":"add_node", "targetNodeId":"<reference node id>", "newNodeType":"<type to create>", "relation":"before"|"after" }',
      '- Insert a guard/safety node: { "action":"insert_safety_node", "targetNodeId":"<reference node id>", "newNodeType":"<type>", "relation":"before"|"after" }',
      'targetNodeId must be an existing workflow node id. newNodeType must be a known node type, or "none" where no new node is created.',
      'configOverridesJson, when used, must be a JSON object string using only config fields from the selected node type schema.',
      'Do not output edges.',
    ].join('\n');

    const llmInput = [
      'You are a workflow editor. Respond with ONLY a single JSON object (no markdown fences) with keys:',
      '- message: short human explanation',
      '- operations: array of mutation operations following the schema below',
      'You are CtrlChecks AI Editor. Do not mention n8n, Zapier, Make, or competitor-specific settings unless the user explicitly asks for a comparison.',
      'Never invent node config keys. For any config overrides, use only fields present in the selected node schema/default config supplied in this prompt.',
      'Every operation MUST include action, targetNodeId, and newNodeType. Never output an incomplete operation.',
      'If the user request is a graph rewrite (replace, swap, remove, delete, branch-specific change, or multiple existing nodes named), reason over the existing workflow graph and return the required operation array. Do not ask the user to choose a generic node type when the request already names the existing/source/target node type.',
      'Only ask a clarification question with an empty operations array when the target node, target branch, or required destination service cannot be inferred from the workflow and conversation.',
      opHelp,
      '=== GRAPH EDITING RULES ===',
      [
        '- For replacement requests, prefer replace_node on the exact existing node id. Keep upstream/downstream routing intact through the orchestrator.',
        '- Every replace_node must include targetNodeId and newNodeType. targetNodeId must be copied exactly from WORKFLOW NODES.',
        '- For deletion requests, use remove_node on the exact existing node id; do not fake deletion with empty config values.',
        '- Every remove_node must include nodeId copied exactly from WORKFLOW NODES.',
        '- For branch or condition requests, resolve the target using GRAPH REWRITE CONTEXT: match the condition/case/status words in the request against each branch node\'s configSummary and its outgoingBranches sourceHandle values, then pick target node ids from that branch\'s directTargets/downstreamNodes.',
        '- Every node\'s branchPaths in GRAPH REWRITE CONTEXT lists the branch decisions that lead to it (e.g. which if_else handle or switch case). Use it to tell apart same-type nodes on different branches.',
        '- If two or more existing nodes could match the request (for example the same service on different branches) and the request does not clearly pick one, return operations: [] and a clarification message that names each candidate with its label, node id, and branch path. Never guess between candidates.',
        '- For multi-part requests, return all necessary operations in one ordered operations array.',
        '- For adding a terminal/log/result node, use add_node with positionHint after the final relevant node and include only supported config fields.',
        '- If a selected target node type requires configuration and the user did not provide concrete field values, use safe schema/default values only when they are obvious from the request or existing comparable nodes; otherwise return a clear question and no operations.',
        '- The message should explain what will change in plain English. It must not include raw JSON.',
        '- When the request contains multiple changes, the message must list each planned change as a numbered step, in the same order as the operations array (e.g. "1. Replace the Gmail on the If/Else false branch with Slack. 2. Replace the Slack on the pending branch with Gmail.").',
      ].join('\n'),
      '=== WORKFLOW NODES ===',
      JSON.stringify(nodePromptSummary, null, 2),
      '=== WORKFLOW EDGES ===',
      JSON.stringify(edgePromptSummary, null, 2),
      '=== GRAPH REWRITE CONTEXT (deterministic branch map) ===',
      [
        'Precomputed facts about the current graph. Use this to resolve branch language',
        '("when X is false", "status pending", case names) to concrete node ids.',
        'Every targetNodeId, nodeId, and referenceNodeId you output MUST be copied exactly from',
        'an "id" field in this context or in WORKFLOW NODES. Never invent or abbreviate ids.',
      ].join('\n'),
      JSON.stringify(graphRewriteContext, null, 2),
      focusedNode
        ? `=== FOCUSED NODE ===\n${JSON.stringify({ id: focusedNode.id, type: (focusedNode.data as any)?.type || focusedNode.type }, null, 2)}`
        : '',
      '=== REGISTRY SUMMARY (node types in workflow) ===',
      JSON.stringify(registryContext.nodeSchemas, null, 2),
      '=== STRUCTURAL VALIDATION ===',
      JSON.stringify(
        {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
        null,
        2
      ),
      options?.runtimePatternContext?.trim()
        ? [
            '=== RECENT RUNTIME PATTERNS (evidence from real past executions) ===',
            'These are deterministic observations from actual runs, not guesses. When a pattern',
            'clearly explains a problem the user is asking about, prefer an operation that addresses',
            'it directly (e.g. insert_safety_node before a node that received empty upstream data,',
            'or update_node_config on a field that repeatedly fails). Do not invent patterns beyond',
            'what is listed here.',
            options.runtimePatternContext.trim(),
          ].join('\n')
        : '',
      options?.conversationHistory?.length
        ? [
            '=== RECENT CONVERSATION (multi-turn — use for vague follow-ups) ===',
            'Critical rules:',
            '- If the latest user message is short or vague (e.g. "implement it", "do that", "yes", "go ahead", "apply"), the operations MUST implement what earlier messages already established.',
            '- Do NOT invent unrelated edits (e.g. tweaking text_formatter or ollama config) when the user and assistant discussed changing the trigger or graph structure.',
            '- Example: user asked to start with manual_trigger instead of schedule → use replace_node on the schedule node id with newNodeType "manual_trigger" (preserve_compatible or merge as needed), NOT random downstream config updates.',
            '- Identify trigger nodes from WORKFLOW NODES (types like schedule, manual_trigger, webhook_trigger, form, chat_trigger).',
            JSON.stringify(
              options.conversationHistory.map((t) => ({
                role: t.role,
                content:
                  typeof t.content === 'string' && t.content.length > 12000
                    ? `${t.content.slice(0, 12000)}\n...[truncated]`
                    : t.content,
              })),
              null,
              2
            ),
          ].join('\n\n')
        : '',
      '=== USER REQUEST (latest turn) ===',
      prompt.trim(),
    ]
      .filter(Boolean)
      .join('\n\n');

    let message = 'Review suggested operations below.';
    let operations: AiEditorMutationOperation[] = [];
    const structuredSchema = this.getSuggestStructuredOutputSchema(workflow);

    try {
      const rawResult = await geminiOrchestrator.processRequest('chat-generation', llmInput, {
        model: 'gemini-3.5-flash',
        temperature: 0.25,
        cache: false,
        structuredOutput: {
          mimeType: 'application/json',
          schema: structuredSchema,
        },
      });
      const text =
        typeof rawResult === 'string'
          ? rawResult
          : (rawResult as any)?.content || JSON.stringify(rawResult);
      let parsed = await this.parseSuggestJsonWithRepair(text, structuredSchema);
      parsed.operations = this.convertInterpretedOperations(parsed.operations, workflow);
      const validationIssues = this.describeMutationOperationIssues(parsed.operations, workflow);
      if (validationIssues.length) {
        parsed = await this.retrySuggestJsonWithValidation(llmInput, parsed, validationIssues, structuredSchema);
        parsed.operations = this.convertInterpretedOperations(parsed.operations, workflow);
        const retryIssues = this.describeMutationOperationIssues(parsed.operations, workflow);
        if (retryIssues.length) {
          throw new Error(`Invalid AI editor operations: ${retryIssues.join('; ')}`);
        }
      }
      message = parsed.message || message;
      operations = this.sanitizeMutationOperations(parsed.operations);
    } catch (err: any) {
      console.error(
        '[AIWorkflowEditor] suggestWorkflowEdits could not produce validated operations:',
        err?.message || String(err)
      );
      message = this.buildGraphAwareClarification(
        options?.rawUserRequest?.trim() || prompt,
        graphRewriteContext
      );
      operations = [];
    }

    const clone: Workflow = JSON.parse(JSON.stringify(workflow));
    const dryRun = await this.applyOperations(clone, operations);

    return { message, operations, dryRun, needsClarification: operations.length === 0 };
  }

  private parseSuggestJson(text: string): { message: string; operations: unknown[] } {
    const trimmed = text.trim();
    let jsonStr = trimmed;
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
      jsonStr = fence[1].trim();
    }
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start >= 0 && end > start) {
      jsonStr = jsonStr.slice(start, end + 1);
    }
    const obj = JSON.parse(jsonStr);
    return {
      message: typeof obj.message === 'string' ? obj.message : '',
      operations: Array.isArray(obj.operations) ? obj.operations : [],
    };
  }

  private async parseSuggestJsonWithRepair(
    text: string,
    structuredSchema: Record<string, unknown>
  ): Promise<{ message: string; operations: unknown[] }> {
    try {
      return this.parseSuggestJson(text);
    } catch (parseError: any) {
      const repairPrompt = [
        'Repair the following AI workflow editor response into valid JSON.',
        'Return ONLY one JSON object with keys "message" and "operations".',
        'Each operation must contain "action" (one of: ' + AI_EDITOR_MUTATION_OPERATION_KINDS.join(', ') + '), "targetNodeId", and "newNodeType".',
        'Do not add explanations, markdown, or fields that are not present or inferable from the broken response.',
        '',
        'Broken response:',
        text.length > 8000 ? `${text.slice(0, 8000)}\n...[truncated]` : text,
        '',
        `Parser error: ${parseError?.message || String(parseError)}`,
      ].join('\n');

      const repaired = await geminiOrchestrator.processRequest('chat-generation', repairPrompt, {
        model: 'gemini-3.1-flash-lite',
        temperature: 0,
        cache: false,
        structuredOutput: {
          mimeType: 'application/json',
          schema: structuredSchema,
        },
      });
      const repairedText =
        typeof repaired === 'string'
          ? repaired
          : (repaired as any)?.content || JSON.stringify(repaired);
      return this.parseSuggestJson(repairedText);
    }
  }

  private async retrySuggestJsonWithValidation(
    originalPrompt: string,
    previous: { message: string; operations: unknown[] },
    validationIssues: string[],
    structuredSchema: Record<string, unknown>
  ): Promise<{ message: string; operations: unknown[] }> {
    const retryPrompt = [
      originalPrompt,
      '',
      '=== PREVIOUS STRUCTURED RESPONSE WAS INVALID ===',
      'Return a corrected single JSON object now.',
      'Do not repeat incomplete operations.',
      'Validation issues:',
      ...validationIssues.map((issue) => `- ${issue}`),
      '',
      'Previous response:',
      JSON.stringify(previous, null, 2).slice(0, 8000),
      '',
      'Correction requirements:',
      '- If an edit can be performed, return complete operations: every operation must include action, targetNodeId, and newNodeType.',
      '- Copy every targetNodeId exactly from the GRAPH REWRITE CONTEXT or WORKFLOW NODES sections above; use branchPaths and outgoingBranches to pick the node on the requested branch.',
      '- If the target node or branch cannot be identified from the workflow graph, return a clarification message that names the candidate node ids and their branch paths, and operations: [].',
    ].join('\n');

    const retried = await geminiOrchestrator.processRequest('chat-generation', retryPrompt, {
      model: 'gemini-3.5-flash',
      temperature: 0.1,
      cache: false,
      structuredOutput: {
        mimeType: 'application/json',
        schema: structuredSchema,
      },
    });
    const retriedText =
      typeof retried === 'string'
        ? retried
        : (retried as any)?.content || JSON.stringify(retried);
    return this.parseSuggestJsonWithRepair(retriedText, structuredSchema);
  }

  private describeMutationOperationIssues(raw: unknown[], workflow: Workflow): string[] {
    const issues: string[] = [];
    const nodeIds = new Set((workflow.nodes || []).map((node) => node.id));

    raw.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        issues.push(`operations[${index}] must be an object`);
        return;
      }
      const op = item as Record<string, any>;
      if (typeof op.kind !== 'string' || !AI_EDITOR_MUTATION_OPERATION_KINDS.includes(op.kind as any)) {
        issues.push(`operations[${index}] has unsupported kind`);
        return;
      }

      if (op.kind === 'add_node') {
        if (typeof op.nodeType !== 'string' || !op.nodeType.trim()) {
          issues.push(`operations[${index}] add_node requires nodeType`);
        } else if (!unifiedNodeRegistry.get(op.nodeType)) {
          issues.push(`operations[${index}] add_node has unknown nodeType ${op.nodeType}`);
        }
        const referenceNodeId = op.positionHint?.referenceNodeId;
        if (referenceNodeId && !nodeIds.has(referenceNodeId)) {
          issues.push(`operations[${index}] add_node positionHint references unknown node ${referenceNodeId}`);
        }
        return;
      }

      if (op.kind === 'remove_node') {
        if (typeof op.nodeId !== 'string' || !op.nodeId.trim()) {
          issues.push(`operations[${index}] remove_node requires nodeId`);
        } else if (!nodeIds.has(op.nodeId)) {
          issues.push(`operations[${index}] remove_node references unknown node ${op.nodeId}`);
        }
        return;
      }

      if (op.kind === 'replace_node') {
        if (typeof op.targetNodeId !== 'string' || !op.targetNodeId.trim()) {
          issues.push(`operations[${index}] replace_node requires targetNodeId`);
        } else if (!nodeIds.has(op.targetNodeId)) {
          issues.push(`operations[${index}] replace_node references unknown node ${op.targetNodeId}`);
        }
        if (typeof op.newNodeType !== 'string' || !op.newNodeType.trim()) {
          issues.push(`operations[${index}] replace_node requires newNodeType`);
        } else if (!unifiedNodeRegistry.get(op.newNodeType)) {
          issues.push(`operations[${index}] replace_node has unknown newNodeType ${op.newNodeType}`);
        }
        return;
      }

      if (op.kind === 'update_node_config') {
        if (typeof op.nodeId !== 'string' || !op.nodeId.trim()) {
          issues.push(`operations[${index}] update_node_config requires nodeId`);
        } else if (!nodeIds.has(op.nodeId)) {
          issues.push(`operations[${index}] update_node_config references unknown node ${op.nodeId}`);
        }
        if (typeof op.path !== 'string' || !op.path.startsWith('/')) {
          issues.push(`operations[${index}] update_node_config requires JSON pointer path`);
        }
        if (!Object.prototype.hasOwnProperty.call(op, 'newValue')) {
          issues.push(`operations[${index}] update_node_config requires newValue`);
        }
        return;
      }

      if (op.kind === 'insert_safety_node') {
        if (typeof op.nodeType !== 'string' || !op.nodeType.trim()) {
          issues.push(`operations[${index}] insert_safety_node requires nodeType`);
        } else if (!unifiedNodeRegistry.get(op.nodeType)) {
          issues.push(`operations[${index}] insert_safety_node has unknown nodeType ${op.nodeType}`);
        }
        const relation = op.position?.relation;
        const referenceNodeId = op.position?.referenceNodeId;
        if (relation !== 'before' && relation !== 'after') {
          issues.push(`operations[${index}] insert_safety_node requires position.relation before/after`);
        }
        if (typeof referenceNodeId !== 'string' || !nodeIds.has(referenceNodeId)) {
          issues.push(`operations[${index}] insert_safety_node requires valid position.referenceNodeId`);
        }
      }
    });

    return issues;
  }

  private sanitizeMutationOperations(raw: unknown[]): AiEditorMutationOperation[] {
    const allowed = new Set<string>(AI_EDITOR_MUTATION_OPERATION_KINDS);
    const out: AiEditorMutationOperation[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const k = (item as any).kind;
      if (typeof k !== 'string' || !allowed.has(k)) continue;
      if (k === 'add_node' && typeof (item as any).nodeType !== 'string') continue;
      if (k === 'remove_node' && typeof (item as any).nodeId !== 'string') continue;
      if (
        k === 'replace_node' &&
        (typeof (item as any).targetNodeId !== 'string' || typeof (item as any).newNodeType !== 'string')
      ) {
        continue;
      }
      if (
        k === 'update_node_config' &&
        (typeof (item as any).nodeId !== 'string' || typeof (item as any).path !== 'string')
      ) {
        continue;
      }
      if (
        k === 'insert_safety_node' &&
        (typeof (item as any).nodeType !== 'string' || !(item as any).position)
      ) {
        continue;
      }
      out.push(this.sanitizeOperationConfig(item as AiEditorMutationOperation));
    }
    return out;
  }

  private getAllowedConfigKeys(nodeType: string): Set<string> {
    const def = unifiedNodeRegistry.get(nodeType);
    const keys = new Set<string>();
    if (!def) return keys;
    for (const key of Object.keys(def.inputSchema || {})) keys.add(key);
    try {
      for (const key of Object.keys(def.defaultConfig?.() || {})) keys.add(key);
    } catch {
      // Registry default config should be safe, but a bad node definition must not break sanitization.
    }
    return keys;
  }

  private sanitizeConfigOverrides(nodeType: string, overrides: unknown): Record<string, unknown> | undefined {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return undefined;
    const allowedKeys = this.getAllowedConfigKeys(nodeType);
    if (allowedKeys.size === 0) return undefined;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
      if (allowedKeys.has(key)) {
        out[key] = value;
      }
    }
    return Object.keys(out).length ? out : undefined;
  }

  private sanitizeOperationConfig(op: AiEditorMutationOperation): AiEditorMutationOperation {
    if (op.kind === 'add_node') {
      const configOverrides = this.sanitizeConfigOverrides(op.nodeType, op.configOverrides);
      return { ...op, ...(configOverrides ? { configOverrides } : { configOverrides: undefined }) };
    }
    if (op.kind === 'insert_safety_node') {
      const configOverrides = this.sanitizeConfigOverrides(op.nodeType, op.configOverrides);
      return { ...op, ...(configOverrides ? { configOverrides } : { configOverrides: undefined }) };
    }
    if (op.kind === 'replace_node') {
      const configOverrides = this.sanitizeConfigOverrides(op.newNodeType, op.configOverrides);
      return { ...op, ...(configOverrides ? { configOverrides } : { configOverrides: undefined }) };
    }
    return op;
  }

  async suggestNodeImprovements(
    workflow: Workflow,
    currentNode: WorkflowNode
  ): Promise<NodeImprovement> {
    const analysis = await this.analyzeNodeContext(workflow, currentNode);
    
    return {
      suggestions: await this.generateSuggestions(analysis, currentNode),
      alternatives: await this.findAlternativeNodes(currentNode, workflow),
      optimizations: await this.suggestOptimizations(currentNode, workflow),
      warnings: this.identifyPotentialIssues(currentNode, workflow),
    };
  }

  async replaceNode(
    workflow: Workflow,
    nodeId: string,
    replacementType: string
  ): Promise<{
    success: boolean;
    newNode?: any;
    impactAnalysis?: any;
    migrationSteps?: string[];
    errors?: string[];
    suggestions?: string[];
  }> {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) {
      return {
        success: false,
        errors: ['Node not found'],
      };
    }
    
    const context = this.extractNodeContext(workflow, nodeId);
    
    // Generate new node configuration
    const newConfig = await this.generateNodeConfig(replacementType, context);
    
    // Validate the replacement
    const validation = await this.validateReplacement(workflow, nodeId, newConfig);
    
    if (validation.valid) {
      return {
        success: true,
        newNode: newConfig,
        impactAnalysis: validation.impact,
        migrationSteps: validation.migrationSteps,
      };
    }
    
    return {
      success: false,
      errors: validation.errors,
      suggestions: validation.suggestions,
    };
  }

  async realTimeCodeAssist(
    node: WorkflowNode,
    code: string,
    language: string
  ): Promise<{
    completions: string[];
    corrections: any[];
    optimizations: any[];
    documentation: string;
  }> {
    const context = {
      nodeType: node.type,
      nodeConfig: node.data.config,
      existingCode: code,
      language,
    };
    
    try {
      const result = await geminiOrchestrator.processRequest('code-assistance', {
        prompt: `Provide code assistance for ${language} in this context: ${JSON.stringify(context, null, 2)}`,
        model: 'qwen2.5-coder:7b',
        temperature: 0.2,
      });
      
      // Parse AI response
      const parsed = typeof result === 'string' ? this.parseCodeAssistResponse(result) : result;
      
      return {
        completions: parsed.completions || [],
        corrections: parsed.corrections || [],
        optimizations: parsed.optimizations || [],
        documentation: parsed.documentation || '',
      };
    } catch (error) {
      console.error('Error in code assist:', error);
      return {
        completions: [],
        corrections: [],
        optimizations: [],
        documentation: '',
      };
    }
  }

  private async analyzeNodeContext(
    workflow: Workflow,
    node: WorkflowNode
  ): Promise<any> {
    // Analyze surrounding nodes and connections
    const incomingEdges = workflow.edges.filter(e => e.target === node.id);
    const outgoingEdges = workflow.edges.filter(e => e.source === node.id);
    
    const inputNodes = incomingEdges.map(e => 
      workflow.nodes.find(n => n.id === e.source)
    ).filter(Boolean);
    
    const outputNodes = outgoingEdges.map(e => 
      workflow.nodes.find(n => n.id === e.target)
    ).filter(Boolean);
    
    return {
      node,
      inputNodes: inputNodes.map(n => ({ type: n!.type, label: n!.data.label })),
      outputNodes: outputNodes.map(n => ({ type: n!.type, label: n!.data.label })),
      workflowSize: workflow.nodes.length,
      nodeCategory: node.data.category,
    };
  }

  private async generateSuggestions(
    analysis: any,
    currentNode: WorkflowNode
  ): Promise<NodeSuggestion[]> {
    const prompt = `Analyze this workflow node and suggest improvements:
Current Node: ${currentNode.data.label} (${currentNode.type})
Category: ${currentNode.data.category}
Input Nodes: ${analysis.inputNodes.map((n: any) => n.type).join(', ')}
Output Nodes: ${analysis.outputNodes.map((n: any) => n.type).join(', ')}

Suggest 3-5 improvements or alternative approaches. Respond with JSON:
{
  "suggestions": [
    {
      "type": "add_node|replace_node|optimize",
      "reason": "...",
      "confidence": 0.0-1.0,
      "impact": "..."
    }
  ]
}`;
    
    try {
      const result = await geminiOrchestrator.processRequest('node-suggestion', {
        prompt,
        temperature: 0.5,
      });
      
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      return parsed.suggestions || [];
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  private async findAlternativeNodes(
    currentNode: WorkflowNode,
    workflow: Workflow
  ): Promise<any[]> {
    // Find nodes that could replace the current node
    const alternatives: any[] = [];
    
    // Simple heuristic: find nodes in same category
    const sameCategoryNodes = workflow.nodes.filter(
      n => n.data.category === currentNode.data.category && n.id !== currentNode.id
    );
    
    alternatives.push(...sameCategoryNodes.map(n => ({
      node: n,
      reason: 'Same category',
      compatibility: this.checkCompatibility(currentNode, n),
    })));
    
    return alternatives.slice(0, 5);
  }

  private async suggestOptimizations(
    node: WorkflowNode,
    workflow: Workflow
  ): Promise<any[]> {
    const optimizations: any[] = [];
    
    // Check for common optimization patterns
    const actualType = unifiedNormalizeNodeType(node as any) || node.data?.type || node.type;
    const def = unifiedNodeRegistry.get(actualType);

    const isHttpLike = !!def?.inputSchema && ('url' in def.inputSchema || 'endpoint' in def.inputSchema);
    if (isHttpLike) {
      optimizations.push({
        type: 'caching',
        suggestion: 'Consider adding caching for repeated requests',
        impact: 'high',
      });
    }
    
    const isCodeLike = !!def?.inputSchema && ('code' in def.inputSchema || 'script' in def.inputSchema);
    if (isCodeLike) {
      optimizations.push({
        type: 'performance',
        suggestion: 'Review code for performance bottlenecks',
        impact: 'medium',
      });
    }
    
    return optimizations;
  }

  private identifyPotentialIssues(
    node: WorkflowNode,
    workflow: Workflow
  ): string[] {
    const warnings: string[] = [];
    const actualType = unifiedNormalizeNodeType(node as any) || node.data?.type || node.type;
    const def = unifiedNodeRegistry.get(actualType);
    const isTrigger = def?.category === 'trigger' || actualType.includes('trigger');
    
    // Check for common issues
    const incomingEdges = workflow.edges.filter(e => e.target === node.id);
    if (incomingEdges.length === 0 && !isTrigger) {
      warnings.push('Node has no input connections');
    }
    
    const outgoingEdges = workflow.edges.filter(e => e.source === node.id);
    if (outgoingEdges.length === 0) {
      warnings.push('Node has no output connections');
    }
    
    // Check for error handling
    const isHttpLike = !!def?.inputSchema && ('url' in def.inputSchema || 'endpoint' in def.inputSchema);
    if (isHttpLike) {
      const hasErrorHandlingNode = workflow.nodes.some((n) => {
        const nt = unifiedNormalizeNodeType(n as any) || (n as any).data?.type || n.type;
        const nd = unifiedNodeRegistry.get(nt);
        return (nd?.tags || []).some((t) => String(t).toLowerCase().includes('error'));
      });
      if (!hasErrorHandlingNode) {
        warnings.push('HTTP-like node may benefit from explicit error handling (retry/fallback path)');
      }
    }
    
    return warnings;
  }

  private extractNodeContext(workflow: Workflow, nodeId: string): any {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return {};
    
    const incomingEdges = workflow.edges.filter(e => e.target === nodeId);
    const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);
    
    return {
      node,
      inputs: incomingEdges.map(e => ({
        source: workflow.nodes.find(n => n.id === e.source),
        edge: e,
      })),
      outputs: outgoingEdges.map(e => ({
        target: workflow.nodes.find(n => n.id === e.target),
        edge: e,
      })),
      workflowContext: {
        totalNodes: workflow.nodes.length,
        categories: [...new Set(workflow.nodes.map(n => n.data.category))],
      },
    };
  }

  private async generateNodeConfig(
    replacementType: string,
    context: any
  ): Promise<any> {
    const prompt = `Generate configuration for a ${replacementType} node to replace the current node.
Context: ${JSON.stringify(context, null, 2)}

Provide a JSON configuration object with appropriate fields for this node type.`;
    
    try {
      const result = await geminiOrchestrator.processRequest('code-generation', {
        prompt,
        temperature: 0.3,
      });
      
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      return {
        type: replacementType,
        data: {
          type: replacementType,
          label: replacementType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          config: parsed.config || parsed,
        },
      };
    } catch (error) {
      console.error('Error generating node config:', error);
      return {
        type: replacementType,
        data: {
          type: replacementType,
          label: replacementType,
          config: {},
        },
      };
    }
  }

  private async validateReplacement(
    workflow: Workflow,
    nodeId: string,
    newConfig: any
  ): Promise<{
    valid: boolean;
    impact?: any;
    migrationSteps?: string[];
    errors?: string[];
    suggestions?: string[];
  }> {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    // Basic validation
    if (!newConfig.type) {
      errors.push('New node type is required');
    }
    
    // Check compatibility with connections
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (node) {
      const incomingEdges = workflow.edges.filter(e => e.target === nodeId);
      const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);
      
      if (incomingEdges.length > 0) {
        suggestions.push(`Review ${incomingEdges.length} incoming connection(s)`);
      }
      
      if (outgoingEdges.length > 0) {
        suggestions.push(`Review ${outgoingEdges.length} outgoing connection(s)`);
      }
    }
    
    return {
      valid: errors.length === 0,
      impact: {
        affectedNodes: workflow.edges.filter(e => 
          e.source === nodeId || e.target === nodeId
        ).length,
        connections: workflow.edges.filter(e => 
          e.source === nodeId || e.target === nodeId
        ).length,
      },
      migrationSteps: [
        '1. Backup current workflow',
        '2. Replace node configuration',
        '3. Verify connections',
        '4. Test workflow execution',
      ],
      errors: errors.length > 0 ? errors : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  private checkCompatibility(node1: WorkflowNode, node2: WorkflowNode): 'high' | 'medium' | 'low' {
    if (node1.data.category === node2.data.category) {
      return 'high';
    }
    if (node1.type === node2.type) {
      return 'high';
    }
    return 'medium';
  }

  private parseCodeAssistResponse(response: string): any {
    try {
      // Try to parse as JSON first
      return JSON.parse(response);
    } catch {
      // If not JSON, try to extract structured information
      const completions: string[] = [];
      const corrections: any[] = [];
      const optimizations: any[] = [];
      
      // Simple pattern matching (can be enhanced)
      const completionMatches = response.match(/completion[s]?:?\s*(.+?)(?:\n|$)/gi);
      if (completionMatches) {
        completionMatches.forEach(match => {
          const content = match.replace(/completion[s]?:?\s*/i, '').trim();
          if (content) completions.push(content);
        });
      }
      
      return {
        completions,
        corrections,
        optimizations,
        documentation: response,
      };
    }
  }
}

// Export singleton instance
export const aiWorkflowEditor = new AIWorkflowEditor();
