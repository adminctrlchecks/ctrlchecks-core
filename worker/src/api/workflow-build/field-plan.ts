/**
 * Field Plan — POST /api/workflow-build/field-plan
 *
 * Returns, for every node in an inline `{ nodes, edges }` graph, the field groups the
 * field-ownership step renders, plus where each templated value comes from.
 *
 * Why not `/api/node-definitions`: that endpoint computes `operationFieldPolicies` from
 * a contract's **default config**. Required-field sets are operation-dependent, so they
 * need the **live node instance's** config. Hence a separate endpoint taking nodes inline.
 *
 * Takes the graph in the request body: at this point in the wizard the workflow is a
 * draft that may not be persisted, so there is no id to load. **No DB write, no LLM call.**
 *
 * Nothing executes here (plan §5, Phase 3).
 */

import { Response } from 'express';
import { unifiedNodeRegistry } from '../../core/registry/unified-node-registry';
import { resolveNodeType } from '../../core/registry/node-type-resolution';
import { resolveFieldPolicyForNode } from '../../core/operations/field-policy-resolver';
import { buildEffectiveFillModes } from '../../core/utils/fill-mode-resolver';
import {
  extractJsonFieldRefs,
  resolveUpstreamFields,
  type UpstreamGraph,
} from '../../core/graph/upstream-field-resolver';
import type { AuthenticatedRequest } from '../../core/middleware/subscription-auth';
import { logger } from '../../core/logger';

/** Bound the work a single request can request. */
const MAX_NODES = 60;

export type FieldGroupKey = 'required' | 'aiFilled' | 'aiRuntime' | 'optional' | 'credential';

export interface FieldPlanField {
  fieldName: string;
  label: string;
  description?: string;
  required: boolean;
  hasValue: boolean;
  fillMode: string;
  /** Where a `{{$json.x}}` in this field's value comes from, when resolvable. */
  producedBy?: {
    fieldName: string;
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
  }[];
  /** True when a reference could not be attributed to any upstream node. */
  hasUnresolvedReferences?: boolean;
}

export interface FieldPlanNode {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  operation?: string;
  /**
   * Populated once Phase 6 adds `firstRunClass` to NodeOperationContract. Null until
   * then — deliberately present now so the client shape does not change later.
   */
  firstRunClass: string | null;
  groups: Record<FieldGroupKey, FieldPlanField[]>;
  /**
   * Set ONLY when the node type could not be resolved, carrying the type as it arrived.
   *
   * The one condition under which `groups` is meaningless. Everything in `diagnostics` is
   * informational by comparison — `generated_runtime_contract` describes a healthy node —
   * so callers must gate "could not be analysed" on this, never on `diagnostics.length`.
   */
  unresolvedNodeType?: string;
  diagnostics: string[];
}

export interface FieldPlanResponse {
  nodes: FieldPlanNode[];
  /** Aggregate counts, for the checklist rail. */
  summary: {
    nodeCount: number;
    requiredCount: number;
    unresolvedReferenceCount: number;
  };
}

function humanizeFieldName(fieldName: string): string {
  return String(fieldName || '')
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

/**
 * Which group a field belongs to. Order matters: credential first (it is never a plain
 * input), then AI ownership, then required, then optional. Exactly one group per field,
 * so counts add up to the node's active field count.
 */
function groupForField(args: {
  credential: boolean;
  required: boolean;
  fillMode: string;
  hasValue: boolean;
}): FieldGroupKey {
  if (args.credential) return 'credential';
  if (args.fillMode === 'runtime_ai') return 'aiRuntime';
  if (args.fillMode === 'buildtime_ai_once') return 'aiFilled';
  if (args.required) return 'required';
  return 'optional';
}

export default async function fieldPlan(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = req.body as { nodes?: unknown; edges?: unknown };
  const rawNodes = Array.isArray(body?.nodes) ? body.nodes : [];
  const rawEdges = Array.isArray(body?.edges) ? body.edges : [];

  if (rawNodes.length === 0) {
    res.json({ nodes: [], summary: { nodeCount: 0, requiredCount: 0, unresolvedReferenceCount: 0 } });
    return;
  }
  if (rawNodes.length > MAX_NODES) {
    res.status(400).json({ error: `Too many nodes (max ${MAX_NODES})` });
    return;
  }

  const graph: UpstreamGraph = {
    nodes: rawNodes as UpstreamGraph['nodes'],
    edges: rawEdges as UpstreamGraph['edges'],
  };

  try {
    const planNodes: FieldPlanNode[] = [];
    let requiredCount = 0;
    let unresolvedReferenceCount = 0;

    for (const node of graph.nodes) {
      /*
       * Which node this actually is. The resolution rules — business type first, alias
       * translation, strict lookup — live in core/registry/node-type-resolution.ts, because
       * getting them wrong fails silently and differently at every site that reads a type.
       * Here the failure was an entry with five EMPTY groups: no error, no diagnostic, and a
       * card that rendered three empty sections and read as a grouping bug.
       *
       * `nodeType` is canonical when resolved and the type AS IT ARRIVED when not — "unknown
       * node type google_gmail" would be nonsense when what was sent was `gmail`.
       */
      const { nodeType, definition: def, rawNodeType } = resolveNodeType(node);
      const nodeLabel = String(node.data?.label ?? def?.label ?? nodeType ?? node.id);
      if (!def) {
        planNodes.push({
          nodeId: node.id,
          nodeType,
          nodeLabel,
          firstRunClass: null,
          groups: { required: [], aiFilled: [], aiRuntime: [], optional: [], credential: [] },
          /*
           * An explicit flag, not a string for the UI to pattern-match.
           *
           * `diagnostics` also carries INFORMATIONAL notes from the policy resolver —
           * `generated_runtime_contract` simply means the node declared no explicit operation
           * contract so a default one was derived, which is normal and describes a perfectly
           * analysed node. Treating "has diagnostics" as "failed" made healthy nodes render
           * as errors and lose their three sections.
           */
          unresolvedNodeType: rawNodeType,
          // Names the type as it ARRIVED, not as resolved — "unknown node type
          // google_gmail" would be nonsense when what was actually sent was `gmail`.
          diagnostics: [`Unknown node type "${rawNodeType}" — not in the registry.`],
        });
        continue;
      }

      const config = (node.data?.config ?? {}) as Record<string, unknown>;
      const effectiveFillModes = buildEffectiveFillModes(def.inputSchema, config as Record<string, any>);
      const policy = resolveFieldPolicyForNode(def, config, effectiveFillModes);

      // Upstream shape is resolved once per node, then consulted per field reference.
      const upstream = resolveUpstreamFields(graph, node.id);
      const producerByFieldName = new Map(upstream.fields.map((f) => [f.name, f]));

      const groups: Record<FieldGroupKey, FieldPlanField[]> = {
        required: [],
        aiFilled: [],
        aiRuntime: [],
        optional: [],
        credential: [],
      };

      for (const fieldName of policy.activeFields) {
        const entry = policy.fields[fieldName];
        if (!entry) continue;
        const schemaField = def.inputSchema?.[fieldName];
        const value = config[fieldName];
        const fillMode = effectiveFillModes[fieldName] ?? 'manual_static';

        const refs = extractJsonFieldRefs(value);
        const producedBy: FieldPlanField['producedBy'] = [];
        let unresolved = false;
        for (const ref of refs) {
          const producer = producerByFieldName.get(ref);
          if (producer) {
            producedBy.push({
              fieldName: ref,
              nodeId: producer.producedByNodeId,
              nodeLabel: producer.producedByNodeLabel,
              nodeType: producer.producedByNodeType,
            });
          } else {
            unresolved = true;
          }
        }
        if (unresolved) unresolvedReferenceCount += 1;

        const planField: FieldPlanField = {
          fieldName,
          // NodeInputField carries no label; the humanized field name is the label.
          label: humanizeFieldName(fieldName),
          description: schemaField?.description,
          required: entry.required,
          hasValue: hasMeaningfulValue(value),
          fillMode,
          ...(producedBy.length > 0 ? { producedBy } : {}),
          ...(unresolved ? { hasUnresolvedReferences: true } : {}),
        };

        const group = groupForField({
          credential: entry.credential,
          required: entry.required,
          fillMode,
          hasValue: planField.hasValue,
        });
        groups[group].push(planField);
        if (entry.required) requiredCount += 1;
      }

      planNodes.push({
        nodeId: node.id,
        nodeType,
        nodeLabel,
        operation: policy.operation,
        firstRunClass: null,
        groups,
        diagnostics: policy.diagnostics ?? [],
      });
    }

    const response: FieldPlanResponse = {
      nodes: planNodes,
      summary: {
        nodeCount: planNodes.length,
        requiredCount,
        unresolvedReferenceCount,
      },
    };
    res.json(response);
  } catch (error) {
    logger.error('[workflow-build/field-plan] failed', {
      error: error instanceof Error ? error.message : String(error),
      nodeCount: graph.nodes.length,
    });
    res.status(500).json({ error: 'Could not build the field plan for this workflow.' });
  }
}
