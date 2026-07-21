import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { awsClient } from "@/integrations/aws/client";
import { Zap, Plus, Play, FolderOpen, LayoutTemplate, History, MoreHorizontal, Copy, Trash2, Clock, Bot, Workflow, MessageSquare, ArrowLeft, Activity, CreditCard, AlertCircle, RefreshCw } from "lucide-react";
import { AppChromeHeader } from "@/components/layout/AppChromeHeader";
import GoogleConnectionStatus from "@/components/GoogleConnectionStatus";
import { WorkflowAuthGate } from "@/components/WorkflowAuthGate";
import { WorkflowActionButton } from "@/components/WorkflowActionButton";
import { WorkflowCreationOptions } from "@/components/workflow/WorkflowCreationOptions";
import { useWorkflowAuth } from "@/contexts/WorkflowAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tables, Json } from "@/integrations/aws/types";
import { toast } from "@/hooks/use-toast";
import { is406Error } from "@/lib/utils";
import { workflowAPI } from "@/lib/api/workflowAPI";
import { OnboardingPathCard } from "@/components/onboarding/OnboardingPathCard";

type WorkflowRecord = Tables<'workflows'> & {
  last_execution?: { started_at: string; status: string } | null;
  execution_count?: number;
  workflow_type?: 'chatbot' | 'agent' | 'automation';
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { authStatus } = useWorkflowAuth();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    executionsToday: 0,
    active: 0,
  });
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const loadWorkflowsRunRef = useRef(0);

  // Suppress 406 errors from executions queries (expected when workflows have no executions)
  useEffect(() => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    const shouldSuppress406Error = (args: any[]): boolean => {
      const errorString = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg?.toString?.() || JSON.stringify(arg)
      ).join(' ');
      
      // Only suppress 406 errors related to executions endpoint
      return (
        errorString.includes('406') &&
        (errorString.includes('executions') || 
         errorString.includes('/rest/v1/executions'))
      );
    };
    
    console.error = (...args: any[]) => {
      if (!shouldSuppress406Error(args)) {
        originalConsoleError.apply(console, args);
      }
    };
    
    console.warn = (...args: any[]) => {
      if (!shouldSuppress406Error(args)) {
        originalConsoleWarn.apply(console, args);
      }
    };
    
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  const detectWorkflowType = (nodes: Json): 'chatbot' | 'agent' | 'automation' => {
    if (!Array.isArray(nodes)) return 'automation';
    
    const nodeTypes = nodes.map((n: any) => n?.data?.type || n?.type).filter(Boolean);
    
    const hasAINodes = nodeTypes.some((type: string) => 
      ['openai_gpt', 'anthropic_claude', 'google_gemini', 'memory'].includes(type)
    );
    
    const hasReasoning = nodeTypes.some((type: string) => 
      type.includes('reasoning') || type.includes('agent')
    );
    
    if (hasReasoning) return 'agent';
    if (hasAINodes && nodeTypes.includes('webhook')) return 'chatbot';
    if (hasAINodes) return 'agent';
    return 'automation';
  };

  const loadWorkflows = useCallback(async () => {
    const runId = ++loadWorkflowsRunRef.current;
    setWorkflowsLoading(true);
    setWorkflowsError(null);

    try {
      let query = awsClient
        .from('workflows')
        .select('*')
        .eq('setup_completed', true);

      // Filter by active status if filterActive is true
      if (filterActive) {
        query = query.eq('status', 'active');
      }

      const { data: workflowsData, error: workflowLoadError } = await query
        .order('updated_at', { ascending: false })
        .limit(6); // Show latest 6 workflows on dashboard

      if (workflowLoadError) throw workflowLoadError;

      const baseWorkflows = (workflowsData || []).map((workflow) => ({
        ...workflow,
        last_execution: null,
        execution_count: 0,
        workflow_type: detectWorkflowType(workflow.nodes),
      }));

      if (loadWorkflowsRunRef.current === runId) {
        setWorkflows(baseWorkflows);
        setWorkflowsLoading(false);
      }

      if (baseWorkflows.length === 0) {
        return;
      }

      const workflowsWithStats = await Promise.all(
        baseWorkflows.map(async (workflow) => {
          try {
            // Use maybeSingle() instead of single() to handle workflows with no executions
            let lastExec = null;
            let count = 0;
            
            try {
              // Query latest execution for this workflow
              // NOTE: PostgREST returns 406 (Not Acceptable) when:
              // 1. Query is syntactically valid
              // 2. RLS policy is enabled
              // 3. No rows match the query (workflow has no executions yet)
              // This is expected behavior - 406 means "no visible rows" not "permission denied"
              // We handle this gracefully by treating 406 as "no executions yet"
              const { data, error: execError } = await awsClient
                .from('executions')
                .select('started_at, status')
                .eq('workflow_id', workflow.id)
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              // Handle errors gracefully
              if (execError) {
                if (is406Error(execError)) {
                  // 406 = No executions exist for this workflow (expected)
                  lastExec = null;
                } else if (execError.code === 'PGRST301' || execError.message?.includes('permission denied') || execError.message?.includes('row-level security')) {
                  // Permission/RLS error - log for debugging but don't break the UI
                  console.warn(`Permission error loading execution for workflow ${workflow.id}:`, execError.message);
                  lastExec = null;
                } else {
                  // Other errors - log for debugging
                  console.warn(`Error loading execution for workflow ${workflow.id}:`, {
                    code: execError.code,
                    message: execError.message,
                    details: execError.details,
                    hint: execError.hint
                  });
                  lastExec = null;
                }
              } else {
                lastExec = data || null;
              }
            } catch (execErr: any) {
              // Handle unexpected errors
              if (is406Error(execErr)) {
                // 406 is expected - suppress
                lastExec = null;
              } else {
                // Log other errors for debugging
                console.warn(`Unexpected error loading execution for workflow ${workflow.id}:`, {
                  message: execErr?.message,
                  code: execErr?.code,
                  stack: execErr?.stack
                });
                lastExec = null;
              }
            }

            try {
              // Count executions for this workflow
              // NOTE: 406 errors are expected when workflow has no executions
              // PostgREST returns 406 for empty result sets with RLS enabled
              const { count: execCount, error: countError } = await awsClient
                .from('executions')
                .select('id', { count: 'exact' })
                .eq('workflow_id', workflow.id)
                .limit(0);

              // Handle errors gracefully
              if (countError) {
                if (is406Error(countError)) {
                  // 406 = No executions exist (expected) - treat as 0
                  count = 0;
                } else if (countError.code === 'PGRST301' || countError.message?.includes('permission denied') || countError.message?.includes('row-level security')) {
                  // Permission/RLS error - log for debugging but don't break the UI
                  console.warn(`Permission error counting executions for workflow ${workflow.id}:`, countError.message);
                  count = 0;
                } else {
                  // Other errors - log for debugging
                  console.warn(`Error counting executions for workflow ${workflow.id}:`, {
                    code: countError.code,
                    message: countError.message,
                    details: countError.details,
                    hint: countError.hint
                  });
                  count = 0;
                }
              } else {
                count = execCount || 0;
              }
            } catch (countErr: any) {
              // Suppress 406 errors in catch block as well
              if (!is406Error(countErr)) {
                console.warn(`Error counting executions for workflow ${workflow.id}:`, countErr);
              }
            }

            return {
              ...workflow,
              last_execution: lastExec || null,
              execution_count: count || 0,
            };
          } catch (error) {
            // If there's an error loading stats for a workflow, still return the workflow with defaults
            console.warn(`Error loading stats for workflow ${workflow.id}:`, error);
            return {
              ...workflow,
              last_execution: null,
              execution_count: 0,
            };
          }
        })
      );

      if (loadWorkflowsRunRef.current === runId) {
        setWorkflows(workflowsWithStats);
        setWorkflowsError(null);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      if (loadWorkflowsRunRef.current === runId) {
        setWorkflowsError('Unable to load workflows. Please retry in a moment.');
      }
    } finally {
      if (loadWorkflowsRunRef.current === runId) {
        setWorkflowsLoading(false);
      }
    }
  }, [filterActive]);

  const loadStats = useCallback(async () => {
    try {
      setStatsError(null);
      // Total workflows
      const { count: totalCount, error: totalError } = await awsClient
        .from('workflows')
        .select('id', { count: 'exact' })
        .eq('setup_completed', true)
        .limit(0);
      if (totalError) throw totalError;

      // Executions today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount, error: todayError } = await awsClient
        .from('executions')
        .select('id', { count: 'exact' })
        .gte('started_at', today.toISOString())
        .limit(0);
      if (todayError) throw todayError;

      // Active workflows
      const { count: activeCount, error: activeError } = await awsClient
        .from('workflows')
        .select('id', { count: 'exact' })
        .eq('setup_completed', true)
        .eq('status', 'active')
        .limit(0);
      if (activeError) throw activeError;

      setStats({
        total: totalCount || 0,
        executionsToday: todayCount || 0,
        active: activeCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStatsError('Unable to load workflow stats.');
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/signin");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user?.id) {
      loadWorkflows();
      loadStats();
    }
  }, [user?.id, loadWorkflows, loadStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'paused': return 'bg-warning/10 text-warning border-warning/20';
      case 'draft': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getWorkflowTypeIcon = (type?: string) => {
    switch (type) {
      case 'chatbot': return <MessageSquare className="h-4 w-4" />;
      case 'agent': return <Bot className="h-4 w-4" />;
      default: return <Workflow className="h-4 w-4" />;
    }
  };

  const getWorkflowTypeLabel = (type?: string) => {
    switch (type) {
      case 'chatbot': return 'Chatbot';
      case 'agent': return 'AI Agent';
      default: return 'Automation';
    }
  };

  const duplicateWorkflow = async (workflow: WorkflowRecord) => {
    if (!user) return;
    try {
      const { data, error } = await awsClient
        .from('workflows')
        .insert({
          name: `${workflow.name} (Copy)`,
          description: workflow.description,
          nodes: workflow.nodes,
          edges: workflow.edges,
          status: 'draft',
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newWorkflow: WorkflowRecord = {
          ...data,
          last_execution: null,
          execution_count: 0,
          workflow_type: detectWorkflowType(data.nodes),
        };
        setWorkflows(prev => [newWorkflow, ...prev].slice(0, 6));
        setStats(prev => ({ ...prev, total: prev.total + 1 }));
      }

      toast({
        title: 'Duplicated',
        description: 'Workflow duplicated successfully',
      });
    } catch (error) {
      console.error('Error duplicating workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate workflow',
        variant: 'destructive',
      });
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    const deletedWorkflow = workflows.find(w => w.id === id);

    // Optimistic: remove card and update stats counters immediately
    setWorkflows(prev => prev.filter(w => w.id !== id));
    if (deletedWorkflow) {
      setStats(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        active: deletedWorkflow.status === 'active' ? Math.max(0, prev.active - 1) : prev.active,
      }));
    }

    try {
      await workflowAPI.deleteWorkflow(id);
      toast({
        title: 'Deleted',
        description: 'Workflow deleted successfully',
      });
      // Background sync to keep stats accurate
      loadStats();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      // Rollback: reload from server
      loadWorkflows();
      loadStats();
      toast({
        title: 'Error',
        description: 'Failed to delete workflow',
        variant: 'destructive',
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppChromeHeader />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <WorkflowAuthGate>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Welcome back!</h1>
              <p className="text-muted-foreground mt-1">Here's what's happening with your workflows</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/subscriptions')}
                className="hidden sm:flex items-center gap-1.5"
              >
                <CreditCard className="h-4 w-4" />
                Upgrade Plan
              </Button>
              <WorkflowActionButton
                className="gradient-primary text-primary-foreground"
                onClick={() => setShowCreateOptions(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> New Workflow
              </WorkflowActionButton>
            </div>
          </div>

        <OnboardingPathCard />

        {/* Stats */}
        {statsError && (
          <Card className="mb-4 border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{statsError}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadStats}
                className="self-start sm:self-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card 
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => navigate('/workflows')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Workflows</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsError ? '--' : stats.total}</div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => navigate('/executions')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Executions Today</CardTitle>
              <Play className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsError ? '--' : stats.executionsToday}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${filterActive ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
            onClick={() => {
              setFilterActive(!filterActive);
              setWorkflowsLoading(true);
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Workflows</CardTitle>
              <Activity className={`h-4 w-4 ${filterActive ? 'text-primary' : 'text-success'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsError ? '--' : stats.active}</div>
              {filterActive && (
                <p className="text-xs text-muted-foreground mt-1">Click to show all</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workflows Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {filterActive ? 'Active Workflows' : 'Your Workflows'}
            </h2>
            {workflows.length > 0 && (
              <Button variant="outline" onClick={() => navigate('/workflows')}>
                View All
              </Button>
            )}
          </div>

          {workflowsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : workflowsError ? (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-destructive/10 p-6 mb-4">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Workflows could not load</h3>
                <p className="text-muted-foreground max-w-md mb-6">{workflowsError}</p>
                <Button variant="outline" onClick={loadWorkflows}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : workflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <Zap className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No workflows yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  No workflows created yet. Start by creating your first AI agent or automation workflow.
                </p>
                <WorkflowActionButton
                  className="gradient-primary text-primary-foreground"
                  onClick={() => setShowCreateOptions(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Your First Workflow
                </WorkflowActionButton>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/workflow/${workflow.id}`)}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {workflow.description || 'No description'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/workflow/${workflow.id}`); }}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); duplicateWorkflow(workflow); }}
                          disabled={!authStatus?.googleConnected}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteWorkflow(workflow.id); }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={getStatusColor(workflow.status)}>
                          {workflow.status}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          {getWorkflowTypeIcon(workflow.workflow_type)}
                          {getWorkflowTypeLabel(workflow.workflow_type)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {workflow.execution_count || 0} executions
                        </div>
                        {workflow.last_execution && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(workflow.last_execution.started_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Updated</span>
                        <span>{new Date(workflow.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        </WorkflowAuthGate>
      </main>

      {/* Workflow Creation Options Overlay */}
      {showCreateOptions && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateOptions(false);
            }
          }}
        >
          {/* Blurred Background */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          
          {/* Content */}
          <div className="relative z-10 w-full max-w-4xl px-4 py-8">
            <Button
              variant="ghost"
              onClick={() => setShowCreateOptions(false)}
              className="mb-4"
              size="sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <WorkflowCreationOptions onNavigate={() => setShowCreateOptions(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
