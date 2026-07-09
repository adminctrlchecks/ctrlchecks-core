import { create } from 'zustand';
import { WorkflowNode } from './workflowStore';

export interface StructuredDebugError {
  code?: string;
  error?: string;
  message?: string;
  hint?: string;
  details?: Record<string, unknown>;
  success?: boolean;
  status?: number;
  [key: string]: unknown;
}

export type DebugNodeError = string | StructuredDebugError;

export interface DebugNodeState {
  nodeId: string;
  lastInput: unknown;
  lastOutput: unknown;
  executionStatus: 'idle' | 'running' | 'success' | 'error';
  executionTime?: number;
  error?: DebugNodeError;
  logs?: string[];
  preferredView?: 'tree' | 'json' | 'table' | 'schema';
}

export interface DebugEdge {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

interface DebugState {
  // Current debug node
  debugNodeId: string | null;
  
  // Execution memory per node
  nodeStates: Record<string, DebugNodeState>;
  
  // Actions
  openDebug: (nodeId: string) => void;
  closeDebug: () => void;
  setNodeInput: (nodeId: string, input: unknown) => void;
  setNodeOutput: (nodeId: string, output: unknown, executionTime?: number) => void;
  setNodeStatus: (nodeId: string, status: DebugNodeState['executionStatus'], error?: DebugNodeError) => void;
  propagateNodeOutput: (nodeId: string, nodes: WorkflowNode[], edges: DebugEdge[]) => void;
  clearNodeState: (nodeId: string) => void;
  getNodeState: (nodeId: string) => DebugNodeState | undefined;
  getPreviousNodeOutput: (nodeId: string, nodes: WorkflowNode[], edges: DebugEdge[]) => unknown;
  setPreferredView: (nodeId: string, view: 'tree' | 'json' | 'table' | 'schema') => void;
}

const initialNodeState: DebugNodeState = {
  nodeId: '',
  lastInput: null,
  lastOutput: null,
  executionStatus: 'idle',
};

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function pickOutputForHandle(output: unknown, sourceHandle?: string | null): unknown {
  if (!sourceHandle || sourceHandle === 'output' || sourceHandle === 'main') return output;
  if (output && typeof output === 'object' && !Array.isArray(output) && sourceHandle in output) {
    return (output as Record<string, unknown>)[sourceHandle];
  }
  return output;
}

function buildInputFromIncomingEdges(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: DebugEdge[],
  nodeStates: Record<string, DebugNodeState>,
): unknown {
  const incomingEdges = edges.filter((edge) => edge.target === nodeId);
  const available = incomingEdges
    .map((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.source);
      const sourceState = nodeStates[edge.source];
      if (!hasValue(sourceState?.lastOutput)) return null;

      return {
        edge,
        sourceNode,
        output: pickOutputForHandle(sourceState.lastOutput, edge.sourceHandle),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (available.length === 0) return null;
  if (available.length === 1) return available[0].output;

  const byNode: Record<string, unknown> = {};
  const inputs = available.map(({ edge, sourceNode, output }) => {
    const key = sourceNode?.data?.label || sourceNode?.data?.type || edge.source;
    byNode[edge.source] = output;
    return {
      nodeId: edge.source,
      label: key,
      type: sourceNode?.data?.type,
      targetHandle: edge.targetHandle || null,
      output,
    };
  });

  return { inputs, byNode };
}

export const useDebugStore = create<DebugState>((set, get) => ({
  debugNodeId: null,
  nodeStates: {},

  openDebug: (nodeId: string) => {
    set({ debugNodeId: nodeId });
  },

  closeDebug: () => {
    set({ debugNodeId: null });
  },

  setNodeInput: (nodeId: string, input: unknown) => {
    set((state) => ({
      nodeStates: {
        ...state.nodeStates,
        [nodeId]: {
          ...(state.nodeStates[nodeId] || initialNodeState),
          nodeId,
          lastInput: input,
        },
      },
    }));
  },

  setNodeOutput: (nodeId: string, output: unknown, executionTime?: number) => {
    set((state) => ({
      nodeStates: {
        ...state.nodeStates,
        [nodeId]: {
          ...(state.nodeStates[nodeId] || initialNodeState),
          nodeId,
          lastOutput: output,
          executionTime,
          executionStatus: 'success',
        },
      },
    }));
  },

  setNodeStatus: (nodeId: string, status: DebugNodeState['executionStatus'], error?: DebugNodeError) => {
    set((state) => ({
      nodeStates: {
        ...state.nodeStates,
        [nodeId]: {
          ...(state.nodeStates[nodeId] || initialNodeState),
          nodeId,
          executionStatus: status,
          error,
        },
      },
    }));
  },

  propagateNodeOutput: (nodeId: string, nodes: WorkflowNode[], edges: DebugEdge[]) => {
    set((state) => {
      const downstreamNodeIds = Array.from(new Set(edges
        .filter((edge) => edge.source === nodeId)
        .map((edge) => edge.target)));

      if (downstreamNodeIds.length === 0) return state;

      const nodeStates = { ...state.nodeStates };
      for (const downstreamNodeId of downstreamNodeIds) {
        const nextInput = buildInputFromIncomingEdges(downstreamNodeId, nodes, edges, nodeStates);
        if (!hasValue(nextInput)) continue;

        nodeStates[downstreamNodeId] = {
          ...(nodeStates[downstreamNodeId] || initialNodeState),
          nodeId: downstreamNodeId,
          lastInput: nextInput,
          executionStatus: nodeStates[downstreamNodeId]?.executionStatus || 'idle',
        };
      }

      return { nodeStates };
    });
  },

  clearNodeState: (nodeId: string) => {
    set((state) => {
      const newStates = { ...state.nodeStates };
      delete newStates[nodeId];
      return { nodeStates: newStates };
    });
  },

  getNodeState: (nodeId: string) => {
    return get().nodeStates[nodeId];
  },

  getPreviousNodeOutput: (nodeId: string, nodes: WorkflowNode[], edges: DebugEdge[]) => {
    return buildInputFromIncomingEdges(nodeId, nodes, edges, get().nodeStates);
  },

  setPreferredView: (nodeId: string, view: 'tree' | 'json' | 'table' | 'schema') => {
    set((state) => ({
      nodeStates: {
        ...state.nodeStates,
        [nodeId]: {
          ...(state.nodeStates[nodeId] || initialNodeState),
          nodeId,
          preferredView: view,
        },
      },
    }));
  },
}));

