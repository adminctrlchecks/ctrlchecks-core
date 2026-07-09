import { useEffect, useCallback, useState, useMemo, useRef, Suspense, lazy } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useDebugStore, type StructuredDebugError } from '@/stores/debugStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useExpressionDropStore } from '@/stores/expressionDropStore';
import InputPanel from './InputPanel';
import OutputPanel from './OutputPanel';

const PropertiesPanel = lazy(() => import('../PropertiesPanel'));
import { X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateExpression } from '@/lib/expressionResolver';
import { awsClient } from '@/integrations/aws/client';
import { ENDPOINTS } from '@/config/endpoints';
import { useToast } from '@/hooks/use-toast';

interface DebugPanelProps {
  onClose?: () => void;
}

function toErrorRecord(payload: unknown, fallback: string, status?: number): StructuredDebugError {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return { ...(payload as Record<string, unknown>), status };
  }

  return {
    error: fallback,
    message: fallback,
    status,
    details: payload === undefined ? undefined : { raw: payload },
  };
}

function getDebugErrorDescription(error: StructuredDebugError | string | undefined, fallback = 'Execution failed'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  return (
    (typeof error.message === 'string' && error.message) ||
    (typeof error.error === 'string' && error.error) ||
    fallback
  );
}

export default function DebugPanel({ onClose }: DebugPanelProps) {
  const { debugNodeId, closeDebug, getNodeState, getPreviousNodeOutput, setNodeInput, setNodeOutput, setNodeStatus, propagateNodeOutput, setPreferredView } = useDebugStore();
  const { nodes, edges, workflowId, selectNode } = useWorkflowStore();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const setPendingExpression = useExpressionDropStore((state) => state.setPendingExpression);

  const debugNode = useMemo(() => {
    if (!debugNodeId) return null;
    return nodes.find((n) => n.id === debugNodeId) || null;
  }, [nodes, debugNodeId]);

  const nodeState = debugNodeId ? getNodeState(debugNodeId) : undefined;
  
  // Get input data from previous node - memoized to prevent infinite loops
  const inputData = useMemo(() => {
    if (!debugNodeId) return {};
    
    // First, try to get from previous node's output
    const prevOutput = getPreviousNodeOutput(debugNodeId, nodes, edges);
    if (prevOutput !== null && prevOutput !== undefined) return prevOutput;
    
    // Second, try to get from stored lastInput
    if (nodeState?.lastInput !== null && nodeState?.lastInput !== undefined) return nodeState.lastInput;
    
    // For trigger nodes (no incoming edges), provide sample input
    const incomingEdges = edges.filter(e => e.target === debugNodeId);
    if (incomingEdges.length === 0 && debugNode) {
      // This is a trigger node - provide sample input based on node type
      if (debugNode.data.type === 'manual_trigger' || debugNode.data.type === 'webhook') {
        return { data: { example: 'value' }, message: 'Sample input' };
      }
    }
    
    return {};
  }, [debugNodeId, nodes, edges, nodeState?.lastInput, debugNode, getPreviousNodeOutput]);

  // Track the last debugNodeId to prevent re-selecting on every render
  const lastDebugNodeIdRef = useRef<string | null>(null);
  
  // Select node only when debugNodeId changes - get node from nodes array inside effect
  useEffect(() => {
    if (!debugNodeId || lastDebugNodeIdRef.current === debugNodeId) return;
    const nodeToSelect = nodes.find((n) => n.id === debugNodeId);
    if (nodeToSelect) {
      selectNode(nodeToSelect);
      lastDebugNodeIdRef.current = debugNodeId;
    }
    
    return () => {
      if (lastDebugNodeIdRef.current === debugNodeId) {
        lastDebugNodeIdRef.current = null;
      }
    };
    // Only depend on debugNodeId to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugNodeId]);

  // Initialize input data only once when node is first opened for debugging
  const lastInitializedNodeIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!debugNodeId || lastInitializedNodeIdRef.current === debugNodeId || nodeState?.lastInput) return;
    const initialInput = inputData;
    if (initialInput !== null && initialInput !== undefined && (
      typeof initialInput !== 'object' || Object.keys(initialInput as Record<string, unknown>).length > 0
    )) {
      setNodeInput(debugNodeId, initialInput);
      lastInitializedNodeIdRef.current = debugNodeId;
    }
    
    return () => {
      if (lastInitializedNodeIdRef.current === debugNodeId) {
        lastInitializedNodeIdRef.current = null;
      }
    };
  }, [debugNodeId, nodeState?.lastInput, inputData, setNodeInput]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    // Get the dragged data
    const draggedData = active.data.current;
    if (!draggedData || !draggedData.path) return;

    // Generate expression
    const expression = generateExpression(draggedData.path);
    
    // Find the drop target (property field key)
    const dropTarget = over.id as string;
    
    // Check if it's a property field drop target (starts with "field-")
    if (dropTarget.startsWith('field-')) {
      const fieldKey = dropTarget.replace('field-', '');
      setPendingExpression(fieldKey, expression);
      toast({
        title: 'Expression Inserted',
        description: `Inserted ${expression} into ${fieldKey}`,
      });
    }
  }, [toast, setPendingExpression]);

  const handleRunNode = useCallback(async () => {
    if (!debugNodeId || !workflowId) return;

    // Get the latest node from the store (not from memoized debugNode)
    // This ensures we have the latest config with updated expressions
    const latestNode = nodes.find((n) => n.id === debugNodeId);
    if (!latestNode) {
      toast({
        title: 'Error',
        description: 'Node not found',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    setNodeStatus(debugNodeId, 'running');

    try {
      // Get the latest node config from the store (includes any dragged expressions)
      const nodeConfig = { ...latestNode.data.config };
      
      // Get the latest input data (reactive to changes)
      const currentInputData = (() => {
        // First, try to get from previous node's output
        const prevOutput = getPreviousNodeOutput(debugNodeId, nodes, edges);
        if (prevOutput !== null && prevOutput !== undefined) return prevOutput;
        
        // Second, try to get from stored lastInput
        const currentState = getNodeState(debugNodeId);
        if (currentState?.lastInput !== null && currentState?.lastInput !== undefined) return currentState.lastInput;
        
        // For trigger nodes (no incoming edges), provide sample input
        const incomingEdges = edges.filter(e => e.target === debugNodeId);
        if (incomingEdges.length === 0) {
          if (latestNode.data.type === 'manual_trigger' || latestNode.data.type === 'webhook') {
            return { data: { example: 'value' }, message: 'Sample input' };
          }
        }
        
        return {};
      })();
      
      // Generate runId (UUID v4) for this debug execution
      const runId = crypto.randomUUID();
      
      // Execute single node
      const { data: sessionData } = await awsClient.auth.getSession();
      const response = await fetch(`${ENDPOINTS.itemBackend}/execute-node`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData?.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          runId,
          nodeId: debugNodeId,
          nodeType: latestNode.data.type,
          config: nodeConfig,
          connectionRefs: (latestNode.data as any).connectionRefs || {},
          input: currentInputData,
          workflowId,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: 'Execute node failed' }));
        const structuredError = toErrorRecord(errorPayload, 'Execute node failed', response.status);
        setNodeStatus(debugNodeId, 'error', structuredError);
        toast({
          title: 'Execution Failed',
          description: getDebugErrorDescription(structuredError),
          variant: 'destructive',
        });
        return;
      }

      const data = await response.json();

      if (data.success) {
        setNodeOutput(debugNodeId, data.output, data.executionTime);
        propagateNodeOutput(debugNodeId, nodes, edges);
        setNodeStatus(debugNodeId, 'success');
        toast({
          title: 'Node Executed',
          description: `Executed in ${data.executionTime}ms`,
        });
      } else {
        const structuredError = toErrorRecord(data, 'Execution failed');
        setNodeStatus(debugNodeId, 'error', structuredError);
        toast({
          title: 'Execution Failed',
          description: getDebugErrorDescription(structuredError, 'Unknown error'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to execute node';
      setNodeStatus(debugNodeId, 'error', errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  }, [debugNodeId, workflowId, nodes, edges, getPreviousNodeOutput, getNodeState, setNodeOutput, propagateNodeOutput, setNodeStatus, toast]);

  if (!debugNodeId || !debugNode) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-background border border-border rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <h2 className="text-lg font-semibold shrink-0">Debug Node</h2>
            <span className="text-sm text-muted-foreground font-mono truncate min-w-0">
              {debugNode.data.label} ({debugNode.data.type})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRunNode}
              disabled={isRunning}
              size="sm"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running...' : 'Run Node'}
            </Button>
            <Button
              onClick={() => {
                closeDebug();
                if (onClose) onClose();
              }}
              variant="ghost"
              size="icon"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Three-Panel Layout */}
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Input Panel */}
            <div className="w-[360px] flex-shrink-0">
              <InputPanel inputData={inputData} />
            </div>

            {/* Center: Properties Panel (Enhanced) */}
            <div className="flex-1 border-x border-border overflow-hidden">
              <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
                <PropertiesPanel
                  onClose={undefined}
                  debugMode={true}
                  debugInputData={inputData}
                  debugError={nodeState?.executionStatus === 'error' ? nodeState?.error : undefined}
                />
              </Suspense>
            </div>

            {/* Right: Output Panel */}
            <div className="w-[460px] flex-shrink-0">
              <OutputPanel
                outputData={nodeState?.lastOutput}
                executionTime={nodeState?.executionTime}
                status={nodeState?.executionStatus}
                error={nodeState?.error}
                nodeId={debugNodeId}
                nodeType={debugNode.data.type}
                preferredView={nodeState?.preferredView}
                onViewChange={(view) => debugNodeId && setPreferredView(debugNodeId, view)}
              />
            </div>
          </div>
        </DndContext>
      </div>
    </div>
  );
}
