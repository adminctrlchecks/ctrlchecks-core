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

function edgeAttachmentRole(edge: MinimalEdge): AgentAttachmentHandle | null {
  return (
    normalizeAgentAttachmentHandle(edge.targetHandle) ||
    normalizeAgentAttachmentHandle(edge.data?.role)
  );
}

export function isAgentAttachmentEdge(
  edge: MinimalEdge,
  nodesById: Map<string, MinimalNode>
): boolean {
  if (!edge?.source || !edge?.target) return false;
  const target = nodesById.get(edge.target);
  if (nodeType(target) !== 'ai_agent') return false;

  return edgeAttachmentRole(edge) !== null || edge.data?.agentAttachment === true;
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
  const executionEdges = safeEdges.filter((edge) => !attachmentEdgeSet.has(edge));
  const attachmentSourceIds = new Set(attachmentEdges.map((edge) => edge.source));
  const executionIncidentNodeIds = new Set<string>();

  for (const edge of executionEdges) {
    executionIncidentNodeIds.add(edge.source);
    executionIncidentNodeIds.add(edge.target);
  }

  const attachmentOnlyNodeIds = new Set(
    [...attachmentSourceIds].filter((nodeId) => !executionIncidentNodeIds.has(nodeId))
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
