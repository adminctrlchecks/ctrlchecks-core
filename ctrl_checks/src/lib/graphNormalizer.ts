/**
 * Graph Normalizer
 * 
 * Ensures workflow graphs are in a consistent, valid format before saving.
 * - Deduplicates edges
 * - Normalizes node configs (e.g., If/Else condition -> conditions)
 * - Validates topology
 */

import { Node, Edge } from 'reactflow';
import { normalizeIfElseConfig } from './ifElseConditions';
import {
  getAgentAttachmentEdgeRole,
  normalizeAgentAttachmentHandle,
} from './agentAttachmentEdges';

export interface NormalizedGraph {
  nodes: Node[];
  edges: Edge[];
  errors: string[];
  warnings: string[];
}

/**
 * Normalize If/Else node config from old format (condition) to new format (conditions)
 */
function normalizeIfElseNode(node: Node): Node {
  if (node.data?.type !== 'if_else') {
    return node;
  }

  const config = node.data?.config || {};
  const normalizedConfig = normalizeIfElseConfig(config as Record<string, unknown>);

  return {
    ...node,
    data: {
      ...node.data,
      config: normalizedConfig,
    },
  };
}

function nodeTypeById(nodes: Node[]): Map<string, string> {
  return new Map(nodes.map((node) => [node.id, String(node.data?.type || node.type || '').toLowerCase()]));
}

function normalizeAiAgentOutputHandle(edge: Edge, sourceType: string): Edge {
  if (sourceType !== 'ai_agent') return edge;

  const raw = String(edge.sourceHandle || '').trim().toLowerCase();
  if (raw === 'error') return { ...edge, sourceHandle: 'error' };
  return { ...edge, sourceHandle: 'success' };
}

function canonicalizeAiAgentEdge(edge: Edge, typesById: Map<string, string>, nodesById: Map<string, Node>): Edge {
  const sourceType = typesById.get(edge.source) || '';
  const targetType = typesById.get(edge.target) || '';
  const inferredRole = getAgentAttachmentEdgeRole(edge, nodesById);

  if (targetType === 'ai_agent') {
    const role = normalizeAgentAttachmentHandle(edge.targetHandle) || normalizeAgentAttachmentHandle(edge.data?.role) || inferredRole;
    if (role) {
      return {
        ...edge,
        sourceHandle: edge.sourceHandle || 'output',
        targetHandle: role,
        data: { ...(edge.data || {}), agentAttachment: true, role },
      };
    }
  }

  if (sourceType === 'ai_agent') {
    const role = normalizeAgentAttachmentHandle(edge.sourceHandle) || normalizeAgentAttachmentHandle(edge.data?.role) || inferredRole;
    if (role && targetType !== 'ai_agent') {
      return {
        ...edge,
        source: edge.target,
        target: edge.source,
        sourceHandle: 'output',
        targetHandle: role,
        data: { ...(edge.data || {}), agentAttachment: true, role },
      };
    }
  }

  return normalizeAiAgentOutputHandle(edge, sourceType);
}

/**
 * Deduplicate edges by (source, target, sourceHandle, targetHandle)
 */
function deduplicateEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  const unique: Edge[] = [];
  const typesById = nodeTypeById(nodes);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  for (const edge of edges) {
    const normalizedEdge = canonicalizeAiAgentEdge(edge, typesById, nodesById);
    const key = `${normalizedEdge.source}::${normalizedEdge.target}::${normalizedEdge.sourceHandle || 'default'}::${normalizedEdge.targetHandle || 'default'}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(normalizedEdge);
    }
  }

  return unique;
}

/**
 * Remove edges that reference non-existent nodes
 */
function removeInvalidEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const nodeIds = new Set(nodes.map(n => n.id));
  return edges.filter(edge => {
    const sourceExists = nodeIds.has(edge.source);
    const targetExists = nodeIds.has(edge.target);
    return sourceExists && targetExists;
  });
}

/**
 * Normalize workflow graph
 */
export function normalizeWorkflowGraph(nodes: Node[], edges: Edge[]): NormalizedGraph {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Normalize node configs (If/Else condition -> conditions)
  const normalizedNodes = nodes.map(node => normalizeIfElseNode(node));

  // 2. Remove invalid edges
  let validEdges = removeInvalidEdges(normalizedNodes, edges);
  const removedCount = edges.length - validEdges.length;
  if (removedCount > 0) {
    warnings.push(`Removed ${removedCount} invalid edge(s) referencing non-existent nodes`);
  }

  // 3. Deduplicate edges
  const beforeDedup = validEdges.length;
  validEdges = deduplicateEdges(normalizedNodes, validEdges);
  const dupCount = beforeDedup - validEdges.length;
  if (dupCount > 0) {
    warnings.push(`Removed ${dupCount} duplicate edge(s)`);
  }

  return {
    nodes: normalizedNodes,
    edges: validEdges,
    errors,
    warnings,
  };
}
