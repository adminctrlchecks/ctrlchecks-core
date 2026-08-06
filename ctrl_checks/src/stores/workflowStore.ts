import { create } from 'zustand';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  addEdge,
} from '@xyflow/react';
import { normalizeIfElseConfig } from '@/lib/ifElseConditions';

export type NodeCategory = 'triggers' | 'ai' | 'logic' | 'data' | 'database' | 'storage' | 'output' | 'http_api' | 'google' | 'devops' | 'social_media' | 'crm' | 'utility' | 'productivity' | 'authentication' | 'payment' | 'ecommerce' | 'analytics' | 'cms';

export type ExecutionStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'stopped_expected'
  | 'needs_connection'
  | 'needs_configuration'
  | 'provider_unavailable';

export interface ActiveExecution {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  progress: number;
  currentStep: string | null;
  errorMessage: string | null;
  outcome?: import('@/lib/executionOutcome').ExecutionOutcome | null;
}

export interface NodeData {
  label: string;
  type: string;
  category: NodeCategory;
  icon: string;
  config: Record<string, unknown>;
  executionStatus?: 'idle' | 'running' | 'success' | 'error' | 'pending';
  [key: string]: unknown;
}

export type WorkflowNode = Node<NodeData>;

interface WorkflowState {
  nodes: WorkflowNode[];
  edges: Edge[];
  selectedNode: WorkflowNode | null;
  selectedEdge: Edge | null;
  workflowId: string | null;
  workflowPhase: string | null;
  workflowName: string;
  isDirty: boolean;
  copiedNode: WorkflowNode | null;

  /** Node ids to highlight after AI editor apply (short-lived UX cue) */
  aiEditedNodeIds: string[];

  /** Number of missing connections for the currently open workflow (read by AppSidebar for badge) */
  workflowConnectionAlertCount: number;
  setWorkflowConnectionAlertCount: (count: number) => void;

  /** Active execution state for async workflow tracking */
  activeExecution: ActiveExecution | null;
  setActiveExecution: (execution: ActiveExecution) => void;
  updateExecutionStatus: (update: Partial<Omit<ActiveExecution, 'executionId' | 'workflowId'>>) => void;
  clearActiveExecution: () => void;

  /**
   * User-initiated field ownership overrides.
   * nodeId → fieldName → mode ('user' | 'ai_built' | 'ai_runtime').
   * Only fields where the user changed from the build-time default are stored here.
   * Persisted in the save payload alongside the workflow.
   * Read-only after Stage 3 delivers the workflow — only changed via setFieldOwnershipOverride.
   */
  fieldOwnershipOverrides: Record<string, Record<string, string>>;

  // Undo/Redo Stacks
  undoStack: { nodes: WorkflowNode[]; edges: Edge[] }[];
  redoStack: { nodes: WorkflowNode[]; edges: Edge[] }[];

  // Actions
  // Actions
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
  addNode: (node: WorkflowNode) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  updateNodeStatus: (nodeId: string, status: 'idle' | 'running' | 'success' | 'error') => void;
  resetAllNodeStatuses: () => void;
  selectNode: (node: WorkflowNode | null) => void;
  selectEdge: (edge: Edge | null) => void;
  deleteSelectedNode: () => void;
  deleteSelectedEdge: () => void;
  setWorkflowId: (id: string | null) => void;
  setWorkflowPhase: (phase: string | null) => void;
  setWorkflowName: (name: string) => void;
  setIsDirty: (dirty: boolean) => void;
  resetWorkflow: () => void;

  /** Upsert a single field ownership override. Only called by user-initiated UI actions. */
  setFieldOwnershipOverride: (nodeId: string, fieldName: string, mode: string) => void;
  /** Reset all overrides (called on workflow reset). */
  resetFieldOwnershipOverrides: () => void;

  // History & Clipboard
  undo: () => void;
  redo: () => void;
  copySelectedNode: () => void;
  pasteNode: () => void;
  selectAll: () => void;

  setAiEditedNodeIds: (ids: string[]) => void;
  clearAiEditedNodeHighlight: () => void;

  /** Per-node error messages surfaced from WebSocket NODE_UPDATE events. nodeId → error string. */
  nodeErrors: Record<string, string>;
  setNodeError: (nodeId: string, error: string) => void;
  clearNodeErrors: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  workflowId: null,
  workflowPhase: null,
  workflowName: 'Untitled Workflow',
  isDirty: false,
  copiedNode: null,
  aiEditedNodeIds: [],
  workflowConnectionAlertCount: 0,
  activeExecution: null,
  fieldOwnershipOverrides: {},
  undoStack: [],
  redoStack: [],
  nodeErrors: {},

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as WorkflowNode[],
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection) => {
    const { nodes } = get();
    const targetNode = nodes.find(n => n.id === connection.target);
    const sourceNode = nodes.find(n => n.id === connection.source);
    
    // CRITICAL FIX: Preserve the actual targetHandle from React Flow connection
    // This ensures connections to specific ports (like AI Agent's userInput) work correctly
    // Only use defaults if handle IDs are truly missing
    let targetHandle = connection.targetHandle;
    let sourceHandle = connection.sourceHandle;
    
    // All nodes default to unified primary input handle.
    if (!targetHandle) {
      targetHandle = 'input';
    }
    
    // For source handle, use provided or default to 'output'
    if (!sourceHandle) {
      sourceHandle = 'output';
    }
    
    const connectionWithHandles = {
      ...connection,
      sourceHandle,
      targetHandle,
    };
    
    console.log(`[WorkflowStore] Connection: ${sourceNode?.data?.type || connection.source} → ${targetNode?.data?.type || connection.target}`, {
      sourceHandle,
      targetHandle,
      originalTargetHandle: connection.targetHandle
    });
    
    set({
      edges: addEdge(connectionWithHandles, get().edges),
      isDirty: true,
    });
  },

  onReconnect: (oldEdge, newConnection) => {
    const { edges, nodes } = get();
    // Save state for undo
    const newUndoStack = [...get().undoStack, { nodes: [...nodes], edges: [...edges] }];

    const targetNode = nodes.find(n => n.id === newConnection.target);
    
    // CRITICAL FIX: Preserve the actual targetHandle from React Flow connection
    let targetHandle = newConnection.targetHandle;
    let sourceHandle = newConnection.sourceHandle;
    
    if (!targetHandle) {
      targetHandle = 'input';
    }
    
    if (!sourceHandle) {
      sourceHandle = 'output';
    }

    const connectionWithHandles = {
      ...newConnection,
      sourceHandle,
      targetHandle,
    };

    set({
      edges: addEdge(connectionWithHandles, edges.filter((e) => e.id !== oldEdge.id)),
      isDirty: true,
      undoStack: newUndoStack,
      redoStack: [],
    });
  },

  addNode: (node) => {
    const { nodes, edges } = get();
    const newUndoStack = [...get().undoStack, { nodes: [...nodes], edges: [...edges] }];
    set({
      nodes: [...nodes, node],
      isDirty: true,
      undoStack: newUndoStack,
      redoStack: [],
    });
  },

  updateNodeConfig: (nodeId, config) => {
    const { nodes, edges } = get();
    // Only push to undo stack if config actually changes significantly or debounced? 
    // For now, let's keep it simple. If this is called frequently on typing, we might need to debounce history.
    // Assuming this is called on blur or explicit save/change.
    const newUndoStack = [...get().undoStack, { nodes: [...nodes], edges: [...edges] }];

    const updatedNodes = nodes.map((node) => {
      if (node.id !== nodeId) return node;
      const mergedConfig = { ...node.data.config, ...config };
      const finalConfig =
        (node.data?.type || node.type) === 'if_else'
          ? normalizeIfElseConfig(mergedConfig)
          : mergedConfig;
      return { ...node, data: { ...node.data, config: finalConfig } };
    });
    const updatedNode = updatedNodes.find((node) => node.id === nodeId);
    const updatedNodeType = updatedNode?.data?.type || updatedNode?.type;

    const updatedEdges =
      updatedNodeType === 'switch'
        ? (() => {
            const switchConfig = updatedNode?.data?.config || {};
            const rawCases = switchConfig.cases ?? switchConfig.rules;
            let caseValues: string[] = [];
            if (Array.isArray(rawCases)) {
              caseValues = rawCases
                .map((item: any) => String(item?.value ?? '').trim())
                .filter((value: string) => value.length > 0);
            } else if (typeof rawCases === 'string') {
              try {
                const parsed = JSON.parse(rawCases);
                if (Array.isArray(parsed)) {
                  caseValues = parsed
                    .map((item: any) => String(item?.value ?? '').trim())
                    .filter((value: string) => value.length > 0);
                }
              } catch {
                caseValues = [];
              }
            }

            if (caseValues.length === 0) {
              return edges;
            }

            const outgoing = edges.filter((edge) => edge.source === nodeId);
            const ordinalByEdgeId = new Map<string, number>();
            outgoing.forEach((edge, idx) => {
              ordinalByEdgeId.set(edge.id, idx);
            });

            return edges.map((edge) => {
              if (edge.source !== nodeId) return edge;
              const currentHandle = String(edge.sourceHandle || edge.type || '').trim();
              let nextHandle = currentHandle;
              const positionalMatch = /^case_(\d+)$/i.exec(currentHandle);
              if (positionalMatch) {
                const caseIndex = parseInt(positionalMatch[1], 10) - 1;
                nextHandle = caseValues[caseIndex] || caseValues[0];
              } else if (!caseValues.includes(currentHandle)) {
                const ordinal = ordinalByEdgeId.get(edge.id) ?? 0;
                nextHandle = caseValues[Math.min(ordinal, caseValues.length - 1)];
              }
              if (!nextHandle || nextHandle === currentHandle) return edge;
              return {
                ...edge,
                sourceHandle: nextHandle,
                type: nextHandle,
              };
            });
          })()
        : edges;

    const selectedNode = get().selectedNode;
    const updatedSelectedNode = selectedNode?.id === nodeId
      ? updatedNodes.find(n => n.id === nodeId) || null
      : selectedNode;

    set({
      nodes: updatedNodes,
      edges: updatedEdges,
      selectedNode: updatedSelectedNode,
      isDirty: true,
      undoStack: newUndoStack,
      redoStack: [],
    });
  },

  updateNodeStatus: (nodeId, status) => {
    // Status updates don't need to be in history/undo stack
    const { nodes, edges } = get();
    const updatedNodes = nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, executionStatus: status } }
        : node
    );
    
    // Recalculate ALL edge colors based on current node states
    // Rules:
    // - Show green for edges from successful nodes (including edges leading to error nodes)
    // - No color change for edges FROM error nodes (default color)
    // - Yellow for running, gray for pending
    const updatedEdges = edges.map((edge) => {
      const sourceNode = updatedNodes.find(n => n.id === edge.source);
      const targetNode = updatedNodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) {
        // Edge connected to non-existent node, keep default
        const { style, ...edgeWithoutStyle } = edge;
        return edgeWithoutStyle;
      }
      
      const sourceStatus = sourceNode.data.executionStatus || 'idle';
      
      let edgeColor: string | undefined;
      
      // Color edges from successful nodes green (including edges leading to error nodes)
      // Don't color edges FROM error nodes (keep default)
      if (sourceStatus === 'success') {
        edgeColor = '#22c55e'; // Green - for all edges from successful nodes
      } else if (sourceStatus === 'running') {
        edgeColor = '#facc15'; // Yellow
      } else if (sourceStatus === 'pending') {
        edgeColor = '#9ca3af'; // Gray
      }
      // If source is 'error' or 'idle', no custom color (use default)
      
      // Apply color if defined, otherwise remove custom styling
      if (edgeColor) {
        return { ...edge, style: { stroke: edgeColor, strokeWidth: 2 } };
      } else {
        // Remove custom style to use default
        const { style, ...edgeWithoutStyle } = edge;
        return edgeWithoutStyle;
      }
    });
    
    set({
      nodes: updatedNodes,
      edges: updatedEdges,
    });
  },

  resetAllNodeStatuses: () => {
    // Reset all node execution statuses to 'idle' - used when starting a new execution
    // Also reset edge colors to default
    const { nodes, edges } = get();
    set({
      nodes: nodes.map((node) => ({
        ...node,
        data: { ...node.data, executionStatus: 'idle' as const },
      })),
      edges: edges.map((edge) => {
        // Remove custom stroke style to reset to default
        if (edge.style) {
          const { style, ...edgeWithoutStyle } = edge;
          return edgeWithoutStyle;
        }
        return edge;
      }),
      nodeErrors: {},
    });
  },

  setNodeError: (nodeId, error) => {
    set((state) => ({ nodeErrors: { ...state.nodeErrors, [nodeId]: error } }));
  },

  clearNodeErrors: () => set({ nodeErrors: {} }),

  selectNode: (node) => {
    const { nodes, edges } = get();
    set({
      selectedNode: node,
      selectedEdge: null,
      // Sync visual state
      nodes: nodes.map(n => ({ ...n, selected: n.id === node?.id })),
      edges: edges.map(e => ({ ...e, selected: false }))
    });
  },
  selectEdge: (edge) => {
    const { nodes, edges } = get();
    set({
      selectedEdge: edge,
      selectedNode: null,
      // Sync visual state 
      edges: edges.map(e => ({ ...e, selected: e.id === edge?.id })),
      nodes: nodes.map(n => ({ ...n, selected: false }))
    });
  },

  deleteSelectedNode: () => {
    const { selectedNode, nodes, edges } = get();
    if (!selectedNode) return;

    // Save state for undo
    const newUndoStack = [...get().undoStack, { nodes: [...nodes], edges: [...edges] }];

    // Filter out the selected node and any edges connected to it
    const updatedNodes = nodes.filter((n) => n.id !== selectedNode.id);
    const updatedEdges = edges.filter(
      (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
    );

    set({
      nodes: updatedNodes,
      edges: updatedEdges,
      selectedNode: null,
      selectedEdge: null,
      isDirty: true,
      undoStack: newUndoStack,
      redoStack: [],
    });
  },

  deleteSelectedEdge: () => {
    const { selectedEdge, nodes, edges } = get();
    if (!selectedEdge) return;

    const newUndoStack = [...get().undoStack, { nodes: [...nodes], edges: [...edges] }];

    set({
      edges: edges.filter((e) => e.id !== selectedEdge.id),
      selectedEdge: null,
      isDirty: true,
      undoStack: newUndoStack,
      redoStack: [],
    });
  },

  undo: () => {
    const { undoStack, nodes, edges, redoStack } = get();
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    set({
      nodes: previousState.nodes,
      edges: previousState.edges,
      undoStack: newUndoStack,
      redoStack: [...redoStack, { nodes, edges }],
      selectedNode: null,
      selectedEdge: null,
      isDirty: true,
    });
  },

  redo: () => {
    const { undoStack, nodes, edges, redoStack } = get();
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    set({
      nodes: nextState.nodes,
      edges: nextState.edges,
      undoStack: [...undoStack, { nodes, edges }],
      redoStack: newRedoStack,
      selectedNode: null,
      selectedEdge: null,
      isDirty: true,
    });
  },

  copySelectedNode: () => {
    const { selectedNode } = get();
    if (selectedNode) {
      set({ copiedNode: JSON.parse(JSON.stringify(selectedNode)) });
    }
  },

  pasteNode: () => {
    const { copiedNode, nodes, edges } = get();
    if (!copiedNode) return;

    const newUndoStack = [...get().undoStack, { nodes: [...nodes], edges: [...edges] }];

    // Generate unique ID by checking existing nodes
    // Use crypto.randomUUID if available for better uniqueness
    const existingIds = new Set(nodes.map(n => n.id));
    let nodeId: string;
    let counter = 0;
    const maxAttempts = 100;
    const nodeType = copiedNode.data?.type || copiedNode.type || 'node';
    do {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        nodeId = `${nodeType}_copy_${crypto.randomUUID()}`;
      } else {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        nodeId = `${nodeType}_copy_${timestamp}_${counter}_${random}`;
      }
      counter++;
      if (counter > maxAttempts) {
        throw new Error('Failed to generate unique node ID after maximum attempts');
      }
    } while (existingIds.has(nodeId));

    // Create new node with unique ID and offset position
    const copiedConfig = { ...(copiedNode.data?.config || {}) };
    delete (copiedConfig as Record<string, unknown>).connectionRefs;

    const newNode: WorkflowNode = {
      ...copiedNode,
      id: nodeId,
      position: {
        x: copiedNode.position.x + 50,
        y: copiedNode.position.y + 50,
      },
      data: {
        ...copiedNode.data,
        config: copiedConfig,
        connectionRefs: undefined,
      },
      selected: true,
    };

    set({
      nodes: [...nodes.map(n => ({ ...n, selected: false })), newNode],
      selectedNode: newNode,
      isDirty: true,
      undoStack: newUndoStack,
      redoStack: [],
    });
  },

  selectAll: () => {
    const { nodes } = get();
    // React Flow handles multi-selection by adding 'selected: true' to nodes
    // We update our nodes state to reflect this
    set({
      nodes: nodes.map(n => ({ ...n, selected: true })),
      selectedNode: null, // Clear single selection reference
    });
  },

  setActiveExecution: (execution) => set({ activeExecution: execution }),

  updateExecutionStatus: (update) => {
    const current = get().activeExecution;
    if (!current) return;
    set({ activeExecution: { ...current, ...update } });
  },

  clearActiveExecution: () => set({ activeExecution: null }),

  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowPhase: (phase) => set({ workflowPhase: phase }),
  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),

  setFieldOwnershipOverride: (nodeId, fieldName, mode) => {
    const current = get().fieldOwnershipOverrides;
    set({
      fieldOwnershipOverrides: {
        ...current,
        [nodeId]: {
          ...(current[nodeId] || {}),
          [fieldName]: mode,
        },
      },
    });
  },

  resetFieldOwnershipOverrides: () => set({ fieldOwnershipOverrides: {} }),

  setAiEditedNodeIds: (ids) => set({ aiEditedNodeIds: [...new Set(ids)] }),

  clearAiEditedNodeHighlight: () => set({ aiEditedNodeIds: [] }),

  setWorkflowConnectionAlertCount: (count) => set({ workflowConnectionAlertCount: count }),

  resetWorkflow: () => {
    // CRITICAL: Completely reset all state to prevent stale data
    set({
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedEdge: null,
      workflowId: null,
      workflowName: 'Untitled Workflow',
      isDirty: false,
      undoStack: [],
      redoStack: [],
      copiedNode: null,
      aiEditedNodeIds: [],
      fieldOwnershipOverrides: {},
      workflowConnectionAlertCount: 0,
      activeExecution: null,
    });
  },
}));
