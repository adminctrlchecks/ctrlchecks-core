import { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Node,
  Edge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore, NodeData } from '@/stores/workflowStore';
import { NODE_TYPES, NodeTypeDefinition } from './nodeTypes';
import WorkflowNode from './WorkflowNode';
import FormTriggerNode from './FormTriggerNode';

// Universal node type registration:
// Register all semantic node types to WorkflowNode so ReactFlow never falls back
// to "default" when a semantic type leaks through load/normalize paths.
const nodeTypes = (() => {
  const dynamicTypes = NODE_TYPES.reduce<Record<string, any>>((acc, def) => {
    acc[def.type] = WorkflowNode;
    return acc;
  }, {});
  return {
    custom: WorkflowNode,
    ...dynamicTypes,
    form: FormTriggerNode,
  };
})();

// Edge types - register custom edge types to prevent React Flow warnings
// React Flow requires edge types to be registered if they're used in edges
// We'll normalize all edge types to "default" in the styledEdges useMemo
const edgeTypes = {};

type AgentAttachmentHandle = 'chat_model' | 'memory' | 'tool';

const AGENT_ATTACHMENT_COLORS: Record<AgentAttachmentHandle, string> = {
  chat_model: '#6366f1',
  memory: '#f59e0b',
  tool: '#10b981',
};

const AI_AGENT_OUTPUT_COLORS: Record<'success' | 'error', string> = {
  success: '#0ea5e9',
  error: '#ef4444',
};

function normalizeAgentAttachmentHandle(handle: unknown): AgentAttachmentHandle | null {
  const value = String(handle || '').toLowerCase();
  if (value === 'chat_model' || value === 'chatmodel') return 'chat_model';
  if (value === 'memory') return 'memory';
  if (value === 'tool') return 'tool';
  return null;
}

function WorkflowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    addNode,
    selectNode,
    selectEdge,
    deleteSelectedNode,
    deleteSelectedEdge,
    undo,
    redo,
    copySelectedNode,
    pasteNode,
    selectAll,
    selectedNode,
    selectedEdge
  } = useWorkflowStore();

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if input/textarea/select is focused or if typing in an input field
      const target = event.target as HTMLElement;
      const isInputElement =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLDivElement && target.contentEditable === 'true') ||
        target.closest('input, textarea, select, [contenteditable="true"]');

      if (isInputElement) {
        // Allow Delete/Backspace in inputs for normal text editing
        return;
      }

      // Delete or Backspace - Delete selected node/edge
      if ((event.key === 'Delete' || event.key === 'Backspace') && !event.ctrlKey && !event.metaKey) {
        if (selectedNode) {
          event.preventDefault();
          event.stopPropagation();
          deleteSelectedNode();
          return;
        }
        if (selectedEdge) {
          event.preventDefault();
          event.stopPropagation();
          deleteSelectedEdge();
          return;
        }
      }

      // Ctrl/Cmd Shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault();
            event.stopPropagation();
            if (event.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            event.preventDefault();
            event.stopPropagation();
            redo();
            break;
          case 'c':
            event.preventDefault();
            event.stopPropagation();
            copySelectedNode();
            break;
          case 'v':
            event.preventDefault();
            event.stopPropagation();
            pasteNode();
            break;
          case 'a':
            event.preventDefault();
            event.stopPropagation();
            selectAll();
            break;
        }
      }
    };

    // Use capture phase to catch events before they bubble
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedNode, selectedEdge, deleteSelectedNode, deleteSelectedEdge, undo, redo, copySelectedNode, pasteNode, selectAll]);


  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeDataString = event.dataTransfer.getData('application/reactflow');
      if (!nodeDataString) return;

      const nodeData: NodeTypeDefinition = JSON.parse(nodeDataString);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Use 'form' node type for Form Trigger, 'custom' for others
      const nodeType = nodeData.type === 'form' ? 'form' : 'custom';

      // Generate unique ID by checking existing nodes
      // Use crypto.randomUUID if available for better uniqueness
      const existingIds = new Set(nodes.map(n => n.id));
      let nodeId: string;
      let counter = 0;
      const maxAttempts = 100;
      do {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          nodeId = `${nodeData.type}_${crypto.randomUUID()}`;
        } else {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 15);
          nodeId = `${nodeData.type}_${timestamp}_${counter}_${random}`;
        }
        counter++;
        if (counter > maxAttempts) {
          throw new Error('Failed to generate unique node ID after maximum attempts');
        }
      } while (existingIds.has(nodeId));

      const newNode: Node<NodeData> = {
        id: nodeId,
        type: nodeType,
        position,
        data: {
          label: nodeData.label,
          type: nodeData.type,
          category: nodeData.category,
          icon: nodeData.icon,
          config: { ...nodeData.defaultConfig },
        },
      };

      addNode(newNode);
    },
    [screenToFlowPosition, addNode, nodes]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        selectNode(node);
      } catch (error) {
        console.error('Error selecting node:', error);
      }
    },
    [selectNode]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge);
    },
    [selectEdge]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  /**
   * Map backend handle IDs to frontend handle IDs
   * Backend may use different field names (data, message, etc.) but frontend uses standardized IDs
   */
  const normalizeHandleId = (
    handleId: string | undefined,
    nodeType: string | undefined,
    isSource: boolean
  ): string => {
    if (!handleId) {
      // Return default based on position
      return isSource ? 'output' : 'input';
    }

    const nodeTypeLower = (nodeType || '').toLowerCase();
    const handleIdLower = handleId.toLowerCase();

    // AI Agent special handles (must match exactly)
    if (nodeTypeLower === 'ai_agent') {
      if (isSource) {
        if (handleIdLower === 'success') return 'success';
        if (handleIdLower === 'reply') return 'success';
        if (handleIdLower === 'error') return 'error';
        return 'output';
      } else {
        if (handleIdLower === 'chat_model' || handleIdLower === 'chatmodel') return 'chat_model';
        if (handleIdLower === 'memory') return 'memory';
        if (handleIdLower === 'tool') return 'tool';
        if (handleIdLower === 'userinput' || handleIdLower === 'user_input' || handleIdLower === 'input') return 'userInput';
        return 'userInput';
      }
    }

    // Map common backend field names to frontend handle IDs
    if (isSource) {
      // Source handles (outputs)
      const sourceMapping: Record<string, string> = {
        'data': 'output',
        'message': 'output',
        'output': 'output',
        'result': 'output',
        'response': 'output',
        'response_text': 'output',
        'response_json': 'output',
        'true': 'true', // if_else true path
        'false': 'false', // if_else false path
      };
      return sourceMapping[handleIdLower] || handleId; // Use original if no mapping
    } else {
      // Target handles (inputs)
      const targetMapping: Record<string, string> = {
        'data': 'input',
        'input': 'input',
        'message': 'input',
        'userinput': 'userInput',
        'user_input': 'userInput',
        'default': 'input',
      };
      return targetMapping[handleIdLower] || handleId; // Use original if no mapping
    }
  };

  // ✅ PERMANENT FIX: Create stable dependency keys that only change when content actually changes
  // These keys are memoized and only recalculate when edges/nodes content changes (not just reference)
  const edgesKey = useMemo(() => {
    if (edges.length === 0) return '';
    return edges.map(e => `${e.id}:${e.source}:${e.target}:${e.sourceHandle || ''}:${e.targetHandle || ''}`).sort().join('|');
  }, [edges]);

  const nodesKey = useMemo(() => {
    if (nodes.length === 0) return '';
    return nodes.map(n => `${n.id}:${n.data?.type || n.type}:${n.data?.executionStatus || 'idle'}`).sort().join('|');
  }, [nodes]);

  const selectedEdgeId = selectedEdge?.id || '';

  const renderNodes = useMemo(() => {
    if (nodes.length === 0) return nodes;

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const attachmentRoleByNodeId = new Map<string, AgentAttachmentHandle>();

    for (const edge of edges) {
      const targetNode = nodeById.get(edge.target);
      const targetNodeType = targetNode?.data?.type || targetNode?.type;
      if (targetNodeType !== 'ai_agent') continue;

      const attachmentRole = normalizeAgentAttachmentHandle(edge.targetHandle);
      if (attachmentRole) {
        attachmentRoleByNodeId.set(edge.source, attachmentRole);
      }
    }

    return nodes.map((node) => {
      const attachmentRole = attachmentRoleByNodeId.get(node.id);
      if (attachmentRole) {
        return {
          ...node,
          data: {
            ...node.data,
            agentAttachmentRole: attachmentRole,
          },
        };
      }

      if (node.data && 'agentAttachmentRole' in node.data) {
        const { agentAttachmentRole: _agentAttachmentRole, ...dataWithoutRole } = node.data;
        return {
          ...node,
          data: dataWithoutRole as NodeData,
        };
      }

      return node;
    });
  }, [edges, nodes]);

  // Add edge styling based on execution status (green for success, red for error)
  // MANDATORY: Ensure all edges are visible and properly rendered
  // ✅ PERMANENT FIX: Guard against race condition and excessive re-rendering
  const styledEdges = useMemo(() => {
    // ✅ CRITICAL FIX: Don't render edges if nodes are empty (race condition prevention)
    if (nodes.length === 0) {
      return [];
    }

    // ✅ PERMANENT FIX: Removed excessive logging - only log in dev mode when actually needed
    // Logging removed to prevent console spam - edges will render correctly without logs

    const parseSwitchCaseValues = (node: any): string[] => {
      const config = node?.data?.config || {};
      const rawCases = config.cases ?? config.rules;
      let cases: any[] = [];
      if (Array.isArray(rawCases)) {
        cases = rawCases;
      } else if (typeof rawCases === 'string') {
        try {
          const parsed = JSON.parse(rawCases);
          if (Array.isArray(parsed)) {
            cases = parsed;
          }
        } catch {
          return [];
        }
      }
      return cases
        .map((item: any) => String(item?.value ?? '').trim())
        .filter((value: string) => value.length > 0);
    };

    const validEdges = edges.map((edge) => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      // CRITICAL: Only filter edges if nodes truly don't exist (not just missing)
      // This ensures edges are preserved even if nodes are temporarily missing
      if (!sourceNode || !targetNode) {
        console.warn(`[EdgeRender] Edge ${edge.id} references missing node: source=${edge.source}, target=${edge.target}`);
        // Don't return null - keep the edge but mark it as invalid
        // ReactFlow will handle missing nodes gracefully
        return {
          ...edge,
          id: edge.id || `edge-${edge.source}-${edge.target}`,
          style: {
            stroke: '#64748b',
            strokeWidth: 2.5,
            opacity: 0.5, // Dimmed but still visible
            strokeDasharray: '5,5', // Dashed to indicate invalid connection
          },
        };
      }

      // CRITICAL FIX: Normalize handle IDs to match frontend node handles
      const sourceNodeType = sourceNode.data?.type || sourceNode.type;
      const targetNodeType = targetNode.data?.type || targetNode.type;

      // MANDATORY: Always provide valid handles - default to standard handles if missing
      let normalizedSourceHandle = normalizeHandleId(edge.sourceHandle, sourceNodeType, true);
      let normalizedTargetHandle = normalizeHandleId(edge.targetHandle, targetNodeType, false);

      // FALLBACK: If normalization returns undefined, use defaults
      if (!normalizedSourceHandle) {
        normalizedSourceHandle = 'output';
      }
      if (!normalizedTargetHandle) {
        normalizedTargetHandle = targetNodeType === 'ai_agent' ? 'userInput' : 'input';
      }

      const agentAttachmentRole =
        targetNodeType === 'ai_agent' ? normalizeAgentAttachmentHandle(normalizedTargetHandle) : null;
      const isAgentAttachmentEdge = agentAttachmentRole !== null;
      const aiAgentOutputHandle =
        sourceNodeType === 'ai_agent' && (normalizedSourceHandle === 'success' || normalizedSourceHandle === 'error')
          ? normalizedSourceHandle
          : null;

      if (String(sourceNodeType || '') === 'switch') {
        const validSwitchHandles = parseSwitchCaseValues(sourceNode);
        if (validSwitchHandles.length > 0 && !validSwitchHandles.includes(normalizedSourceHandle)) {
          console.warn(
            `[EdgeRender] Dropping edge ${edge.id} due to stale switch handle "${normalizedSourceHandle}". Valid handles: ${validSwitchHandles.join(', ')}`
          );
          return null;
        }
      }

      // ✅ PERMANENT FIX: Only log normalization in development and limit frequency
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        if (edge.sourceHandle !== normalizedSourceHandle || edge.targetHandle !== normalizedTargetHandle) {
          console.log(`[EdgeRender] Normalized handles for edge ${edge.id}:`);
          console.log(`  Source: "${edge.sourceHandle || 'none'}" → "${normalizedSourceHandle}" (node: ${sourceNodeType})`);
          console.log(`  Target: "${edge.targetHandle || 'none'}" → "${normalizedTargetHandle}" (node: ${targetNodeType})`);
        }
      }

      // Check if edge is selected
      const isSelected = selectedEdge?.id === edge.id;

      // Determine edge color based on execution status
      // MANDATORY: Use highly visible colors
      let edgeColor = '#475569'; // Darker slate-600 for better visibility
      let strokeWidth = 3; // Thicker for better visibility

      // Priority: Check execution status for green/red colors
      if (sourceNode?.data?.executionStatus === 'success' && targetNode?.data?.executionStatus !== 'error') {
        // Green for successful execution path
        edgeColor = '#22c55e'; // green-500 (more visible)
        strokeWidth = 3.5;
      } else if (sourceNode?.data?.executionStatus === 'error' || targetNode?.data?.executionStatus === 'error') {
        // Red for error path
        edgeColor = '#ef4444'; // red-500 (more visible)
        strokeWidth = 3.5;
      } else if (sourceNode?.data?.executionStatus === 'running' || targetNode?.data?.executionStatus === 'running') {
        // Light blue for running
        edgeColor = '#3b82f6'; // blue-500 (more visible)
        strokeWidth = 3;
      }

      // Make selected edges more visible
      if (isSelected) {
        strokeWidth = 4;
        edgeColor = '#1e293b'; // Very dark slate for selected
      }

      if (isAgentAttachmentEdge) {
        edgeColor = AGENT_ATTACHMENT_COLORS[agentAttachmentRole];
        strokeWidth = isSelected ? 3.5 : 2.5;
      } else if (aiAgentOutputHandle) {
        edgeColor = AI_AGENT_OUTPUT_COLORS[aiAgentOutputHandle];
        strokeWidth = isSelected ? 4 : 3.25;
      }

      // MANDATORY: Force visibility with strong styling
      const edgeStyle: React.CSSProperties = {
        stroke: edgeColor,
        strokeWidth,
        filter: isSelected
          ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' // Stronger shadow for selected
          : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15))', // Visible shadow
        // Force visibility
        visibility: 'visible',
        display: 'block',
        pointerEvents: 'auto',
        // Override any opacity from edge.style - set opacity after spreading to ensure it's not overridden
        ...edge.style,
        opacity: 1, // Fully visible - MANDATORY (set after spread to override any opacity from edge.style)
      };

      if (isAgentAttachmentEdge) {
        edgeStyle.strokeDasharray = '7 6';
        edgeStyle.opacity = 0.9;
      }

      // Determine if edge represents success or error path
      const isSuccess = sourceNode?.data?.executionStatus === 'success' && targetNode?.data?.executionStatus !== 'error';
      const isError = sourceNode?.data?.executionStatus === 'error' || targetNode?.data?.executionStatus === 'error';

      return {
        ...edge,
        id: edge.id || `edge-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: normalizedSourceHandle,
        targetHandle: normalizedTargetHandle,
        // ✅ CRITICAL: Normalize edge type to "default" to prevent React Flow warnings
        // This ensures all edges use the registered default type, avoiding "edge type not found" errors
        type: 'default', // Always use default type regardless of edge.type value
        style: edgeStyle,
        animated: !isAgentAttachmentEdge && sourceNode?.data?.executionStatus === 'running',
        selected: isSelected,
        data: {
          ...edge.data,
          success: isSuccess,
          error: isError,
        },
        zIndex: isSelected ? 10 : isAgentAttachmentEdge ? 1 : 2, // Higher z-index to ensure visibility
        markerEnd: isAgentAttachmentEdge
          ? undefined
          : {
              type: 'arrowclosed' as const,
              color: edgeColor,
              width: isSelected ? 22 : 20, // Larger arrows for visibility
              height: isSelected ? 22 : 20,
            },
      };
    });

    return validEdges.filter((edge): edge is Edge => edge !== null);
  }, [
    // ✅ PERMANENT FIX: Use stable dependency keys that only change when content actually changes
    // These keys are memoized separately and only change when edges/nodes content changes
    edgesKey,
    nodesKey,
    selectedEdgeId
  ]);

  // Generate a key based on node IDs to force re-render when workflow changes
  // This ensures React Flow resets completely when switching workflows
  const workflowKey = nodes.length > 0
    ? nodes.map(n => n.id).sort().join(',')
    : 'empty';

  // Check for and fix overlapping nodes when workflow loads
  useEffect(() => {
    if (nodes.length === 0) return;

    const NODE_WIDTH = 280;
    const NODE_HEIGHT = 150;
    const MIN_SPACING = 10; // Reduced from 50 - only detect actual overlaps, not close nodes

    let hasOverlaps = false;
    const adjustedNodes = nodes.map((node, index) => {
      const newPosition = { ...node.position };

      // Check for overlaps with other nodes
      // Only detect actual overlaps (nodes touching or overlapping), not just close nodes
      for (let i = 0; i < index; i++) {
        const otherNode = nodes[i];
        const distanceX = Math.abs(newPosition.x - otherNode.position.x);
        const distanceY = Math.abs(newPosition.y - otherNode.position.y);

        // Only adjust if nodes are actually overlapping (distance less than node size)
        // Reduced threshold to only catch true overlaps
        if (distanceX < NODE_WIDTH - MIN_SPACING && distanceY < NODE_HEIGHT - MIN_SPACING) {
          hasOverlaps = true;
          // Move node to the right and down
          newPosition.x = otherNode.position.x + NODE_WIDTH + MIN_SPACING;
          if (distanceY < NODE_HEIGHT - MIN_SPACING) {
            newPosition.y = otherNode.position.y + NODE_HEIGHT + MIN_SPACING;
          }
        }
      }

      return {
        ...node,
        position: newPosition,
      };
    });

    // If overlaps were found, update nodes (only once per workflow load)
    if (hasOverlaps && workflowKey !== 'empty') {
      const timeoutId = setTimeout(() => {
        adjustedNodes.forEach(node => {
          onNodesChange([{
            id: node.id,
            type: 'position',
            position: node.position,
          }]);
        });
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [workflowKey, nodes, onNodesChange]);

  // Centralized helper to make the whole workflow fit nicely in the visible canvas
  const handleFitView = useCallback(() => {
    if (!nodes.length) return;

    // Small timeout ensures React Flow has measured the latest layout
    setTimeout(() => {
      fitView({
        padding: 0.12,
        duration: 250,
        includeHiddenNodes: false,
        // Keep zoom in a comfortable range so nodes are not tiny or huge
        minZoom: 0.7,
        maxZoom: 1.1,
      });
    }, 50);
  }, [fitView, nodes.length]);

  // Fit view when nodes are loaded or workflow changes
  useEffect(() => {
    if (!nodes.length) return;
    handleFitView();
  }, [workflowKey, nodes.length, handleFitView]);

  // Re-fit when the canvas or window is resized so content never spills off‑screen
  useEffect(() => {
    const container = reactFlowWrapper.current;
    if (!container || !nodes.length) return;

    let resizeObserver: ResizeObserver | null = null;

    const onResize = () => {
      handleFitView();
    };

    // Observe size changes of the canvas container
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => onResize());
      resizeObserver.observe(container);
    }

    // Also listen to window resizes (e.g. browser zoom / devtools)
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeObserver && container) {
        resizeObserver.unobserve(container);
        resizeObserver.disconnect();
      }
    };
  }, [nodes.length, handleFitView]);

  return (
    <div
      ref={reactFlowWrapper}
      className="h-full min-h-0 w-full overflow-hidden"
      style={{ width: '100%', height: '100%' }}
    >
      <ReactFlow
        key={workflowKey}
        nodes={renderNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        snapToGrid
        snapGrid={[16, 16]}
        className="bg-muted/30"
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        multiSelectionKeyCode={null}
        connectOnClick={false}
        defaultEdgeOptions={{
          type: 'default',
          style: {
            stroke: '#475569', // Dark slate-600 for maximum visibility
            strokeWidth: 3, // Thicker for visibility
            opacity: 1, // Fully visible - MANDATORY
            visibility: 'visible',
            display: 'block',
          },
          markerEnd: {
            type: 'arrowclosed',
            color: '#475569',
            width: 20, // Larger for visibility
            height: 20,
          },
        }}
      >
        <Background gap={16} size={1} className="!bg-muted/50" />
        <Controls className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted" />
        <MiniMap
          className="!bg-card !border-border"

          nodeColor={(node) => {
            const data = node.data as NodeData;
            switch (data?.category) {
              case 'triggers': return 'hsl(var(--primary))';
              case 'ai': return 'hsl(var(--accent))';
              case 'logic': return 'hsl(var(--secondary))';
              case 'data': return 'hsl(142 71% 45%)';
              case 'output': return 'hsl(25 95% 53%)';
              default: return 'hsl(var(--muted-foreground))';
            }
          }}
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>
    </div>
  );
}

export default function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
