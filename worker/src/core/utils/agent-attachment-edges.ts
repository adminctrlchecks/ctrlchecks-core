type AgentAttachmentHandle = 'chat_model' | 'memory' | 'tool';

type MinimalNode = {
  id: string;
  type?: string;
  data?: {
    type?: string;
  } & Record<string, unknown>;
};

type MinimalEdge = {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: Record<string, unknown> | null;
};

export function normalizeAgentAttachmentHandle(handle: unknown): AgentAttachmentHandle | null {
  const value = String(handle || '').toLowerCase();
  if (value === 'chat_model' || value === 'chatmodel') return 'chat_model';
  if (value === 'memory') return 'memory';
  if (value === 'tool') return 'tool';
  return null;
}

function nodeType(node: MinimalNode | undefined): string {
  return String(node?.data?.type || node?.type || '').toLowerCase();
}

function edgeAttachmentRole(edge: MinimalEdge, direction: 'into_agent' | 'out_of_agent'): AgentAttachmentHandle | null {
  const handle = direction === 'into_agent' ? edge.targetHandle : edge.sourceHandle;
  return (
    normalizeAgentAttachmentHandle(handle) ||
    normalizeAgentAttachmentHandle(edge.data?.role)
  );
}

function nodeAttachmentRole(node: MinimalNode | undefined): AgentAttachmentHandle | null {
  return normalizeAgentAttachmentHandle(node?.data?.agentAttachmentRole);
}

function attachmentNodeId(edge: MinimalEdge, nodesById: Map<string, MinimalNode>): string | null {
  const source = nodesById.get(edge.source);
  const target = nodesById.get(edge.target);

  if (nodeType(target) === 'ai_agent' && (edgeAttachmentRole(edge, 'into_agent') || nodeAttachmentRole(source))) {
    return edge.source;
  }

  if (nodeType(source) === 'ai_agent' && (edgeAttachmentRole(edge, 'out_of_agent') || nodeAttachmentRole(target))) {
    return edge.target;
  }

  return null;
}

export function isAgentAttachmentEdge(
  edge: MinimalEdge,
  nodesById: Map<string, MinimalNode>
): boolean {
  if (!edge?.source || !edge?.target) return false;
  if (edge.data?.agentAttachment === true) return attachmentNodeId(edge, nodesById) !== null;

  return attachmentNodeId(edge, nodesById) !== null;
}

export function getAgentAttachmentEdgeRole(
  edge: MinimalEdge,
  nodesById: Map<string, MinimalNode>
): AgentAttachmentHandle | null {
  const target = nodesById.get(edge.target);
  if (nodeType(target) === 'ai_agent') {
    return edgeAttachmentRole(edge, 'into_agent') || nodeAttachmentRole(nodesById.get(edge.source));
  }

  const source = nodesById.get(edge.source);
  if (nodeType(source) === 'ai_agent') {
    return edgeAttachmentRole(edge, 'out_of_agent') || nodeAttachmentRole(nodesById.get(edge.target));
  }

  return null;
}

export function getAgentAttachmentNodeId(
  edge: MinimalEdge,
  nodesById: Map<string, MinimalNode>
): string | null {
  return attachmentNodeId(edge, nodesById);
}

export function splitAgentAttachmentEdges<TNode extends MinimalNode, TEdge extends MinimalEdge>(
  nodes: TNode[],
  edges: TEdge[]
): {
  executionNodes: TNode[];
  executionEdges: TEdge[];
  attachmentEdges: TEdge[];
  attachmentSourceIds: Set<string>;
  attachmentOnlyNodeIds: Set<string>;
} {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const safeEdges = (edges || []).filter((edge) => !!edge?.source && !!edge?.target);
  const attachmentEdges = safeEdges.filter((edge) => isAgentAttachmentEdge(edge, nodesById));
  const attachmentEdgeSet = new Set(attachmentEdges);
  const attachmentSourceIds = new Set(
    attachmentEdges
      .map((edge) => getAgentAttachmentNodeId(edge, nodesById))
      .filter((nodeId): nodeId is string => typeof nodeId === 'string' && nodeId.length > 0)
  );

  // An AI Agent sidecar is any node attached to an agent (attachment source) or that
  // explicitly carries an attachment role. Sidecars supply context/capabilities to the
  // agent — they are never linear execution steps. Any edge that runs purely between two
  // sidecars (e.g. an accidental chat_model -> memory -> tool chain produced by generation
  // or auto-linking) is therefore not an execution edge; treating it as one wrongly keeps
  // the sidecars in the execution graph and flags them as unreachable / missing-input.
  const sidecarNodeIds = new Set<string>(attachmentSourceIds);
  for (const node of nodes) {
    if (nodeAttachmentRole(node)) sidecarNodeIds.add(node.id);
  }

  const executionEdges = safeEdges.filter(
    (edge) =>
      !attachmentEdgeSet.has(edge) &&
      !(sidecarNodeIds.has(edge.source) && sidecarNodeIds.has(edge.target))
  );
  const executionIncidentNodeIds = new Set<string>();

  for (const edge of executionEdges) {
    executionIncidentNodeIds.add(edge.source);
    executionIncidentNodeIds.add(edge.target);
  }

  const attachmentOnlyNodeIds = new Set(
    [...sidecarNodeIds].filter((nodeId) => !executionIncidentNodeIds.has(nodeId))
  );
  const executionNodes = nodes.filter((node) => !attachmentOnlyNodeIds.has(node.id));

  return {
    executionNodes,
    executionEdges,
    attachmentEdges,
    attachmentSourceIds,
    attachmentOnlyNodeIds,
  };
}
