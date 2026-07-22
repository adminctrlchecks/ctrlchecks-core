/**
 * Template Editor
 * Allows admins to edit template nodes and edges using the workflow builder
 */

import { useEffect, useCallback, useState, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useWorkflowStore, WorkflowNode } from '@/stores/workflowStore';
import { awsClient } from '@/integrations/aws/client';
import { useToast } from '@/hooks/use-toast';
import type { NodeTypeDefinition } from '@/components/workflow/nodeTypes';

const NodeLibrary = lazy(() => import('@/components/workflow/NodeLibrary'));
const WorkflowCanvas = lazy(() => import('@/components/workflow/WorkflowCanvas'));
const PropertiesPanel = lazy(() => import('@/components/workflow/PropertiesPanel'));
const ExecutionConsole = lazy(() => import('@/components/workflow/ExecutionConsole'));
import { AdminChromeHeader } from '@/components/layout/AdminChromeHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save } from 'lucide-react';
import { Edge } from '@xyflow/react';
import { Json } from '@/integrations/aws/types';
import { updateTemplate } from '@/lib/api/admin';
import { validateAndFixWorkflow } from '@/lib/workflowValidation';
import { enforceFrontendRenderContract, normalizeBackendWorkflow, validateNodeTypesRegistered } from '@/lib/node-type-normalizer';

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);
  const [invalidNodesCount, setInvalidNodesCount] = useState(0);
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    setWorkflowName,
    setIsDirty,
    resetWorkflow,
  } = useWorkflowStore();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  // Load template
  const loadTemplate = useCallback(async (templateId: string) => {
    try {
      const { data, error } = await awsClient
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      if (data) {
        setTemplateData(data);
        setWorkflowName(data.name);

        // Run the same 4-step hydration pipeline WorkflowBuilder.loadWorkflow() uses,
        // so admin template editing never diverges from what end users see when they
        // apply the template (see docs/TEMPLATE_NODE_AUDIT_AND_ADMIN_EDITOR_FIX_PLAN.md).
        const backendWorkflow = {
          nodes: (data.nodes as unknown as WorkflowNode[]) || [],
          edges: (data.edges as unknown as Edge[]) || [],
        };

        const normalizedBackend = normalizeBackendWorkflow(backendWorkflow);
        const normalized = validateAndFixWorkflow({
          nodes: normalizedBackend.nodes,
          edges: normalizedBackend.edges,
        });
        const contracted = enforceFrontendRenderContract({
          nodes: normalized.nodes as any[],
          edges: normalized.edges as any[],
        });

        const typeValidation = validateNodeTypesRegistered(contracted.nodes as any[]);
        setInvalidNodesCount(typeValidation.missingTypes.length);

        if (!typeValidation.valid) {
          toast({
            title: 'Unregistered Node Types Found',
            description: `${typeValidation.missingTypes.length} node(s) use a type not currently registered: ${typeValidation.missingTypes.join(', ')}. They may not render or execute correctly until fixed.`,
            variant: 'destructive',
          });
        }

        const validEdges = (contracted.edges as any[]).filter((edge: any) => {
          const sourceExists = (contracted.nodes as any[]).some((n: any) => n.id === edge.source);
          const targetExists = (contracted.nodes as any[]).some((n: any) => n.id === edge.target);
          return sourceExists && targetExists;
        });

        setNodes(contracted.nodes as WorkflowNode[]);
        setEdges(validEdges as Edge[]);
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive',
      });
    }
  }, [setNodes, setEdges, setWorkflowName, setIsDirty, toast]);

  // Load template
  useEffect(() => {
    if (id && user) {
      loadTemplate(id);
    } else if (!id) {
      resetWorkflow();
    }
  }, [id, user, loadTemplate, resetWorkflow]);

  const handleSave = useCallback(async () => {
    if (!user || !templateData) return;

    // Validate all nodes before saving - ensure they all come from node library
    const { NODE_TYPES } = await import('@/components/workflow/nodeTypes');
    const validNodeTypes = new Set(NODE_TYPES.map((d: any) => d.type));
    const invalidNodes = nodes.filter((node: any) => {
      const nodeType = node.data?.type || node.type;
      return nodeType !== 'form' && (!nodeType || !validNodeTypes.has(nodeType));
    });

    if (invalidNodes.length > 0) {
      toast({
        title: 'Invalid Nodes Detected',
        description: `${invalidNodes.length} node(s) are not from the node library. Please remove them before saving. Only nodes from the node library are allowed.`,
        variant: 'destructive',
      });
      return;
    }

    // Warn admin that changes affect all users
    const confirmed = window.confirm(
      '⚠️ WARNING: Saving this template will update it for ALL users.\n\n' +
      'This will increment the template version. Users with workflows based on older versions ' +
      'will be notified that a new version is available.\n\n' +
      'Do you want to continue?'
    );

    if (!confirmed) return;

    setIsSaving(true);
    try {
      // Validate and fix workflow one more time before saving
      const validated = validateAndFixWorkflow({
        nodes: nodes as any[],
        edges: edges as any[]
      });

      const updatedTemplate = await updateTemplate(templateData.id, {
        nodes: validated.nodes as unknown as Json,
        edges: validated.edges as unknown as Json,
      });

      setIsDirty(false);
      
      // Reload template to get updated version
      await loadTemplate(templateData.id);
      
      toast({
        title: 'Template Updated',
        description: `Template saved successfully. Version incremented to v${updatedTemplate.version || templateData.version + 1}. All users will see this update.`,
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, user, templateData, setIsDirty, toast, loadTemplate]);

  const onDragStart = useCallback((event: React.DragEvent, nodeType: NodeTypeDefinition) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col">
      <AdminChromeHeader compact fluid />
      <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/templates')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{templateData?.name || 'Template Editor'}</span>
            <Badge variant="secondary">Template</Badge>
            {templateData?.version && (
              <Badge variant="outline">v{templateData.version}</Badge>
            )}
            <Badge variant="destructive" className="text-xs">
              ⚠️ Changes affect all users
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {templateData && (
            <div className="text-sm text-muted-foreground mr-2">
              Used {templateData.use_count || 0} times
            </div>
          )}
          {invalidNodesCount > 0 && (
            <Badge variant="destructive" className="mr-2">
              ⚠️ {invalidNodesCount} unregistered node type(s)
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r border-border overflow-y-auto">
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
            <NodeLibrary onDragStart={onDragStart} />
          </Suspense>
        </div>
        <div className="flex-1 relative w-full h-full" style={{ minWidth: 0, minHeight: 0 }}>
          <Suspense fallback={null}>
            <WorkflowCanvas />
          </Suspense>
        </div>
        <div className="w-80 border-l border-border overflow-y-auto">
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
            <PropertiesPanel />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={null}>
        <ExecutionConsole isExpanded={consoleExpanded} onToggle={() => setConsoleExpanded(!consoleExpanded)} />
      </Suspense>
    </div>
  );
}

