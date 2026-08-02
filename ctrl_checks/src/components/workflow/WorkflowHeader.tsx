import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, Play, Settings, Upload, Download, Square, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppBrand } from '@/components/brand/AppBrand';
import { useWorkflowStore } from '@/stores/workflowStore';
import WebhookSettings from './WebhookSettings';
import ScheduleSettings from './ScheduleSettings';
import SaveStateButton from './SaveStateButton';
import { WorkflowActionButton } from '@/components/WorkflowActionButton';
import { toast } from '@/hooks/use-toast';
import { awsClient } from '@/integrations/aws/client';
import { workflowScheduler } from '@/lib/workflowScheduler';

interface WorkflowHeaderProps {
  onSave: () => void | Promise<boolean | void>;
  onRun: (autoSave?: boolean) => void;
  onCheckSetup: () => void;
  isSaving?: boolean;
  isRunning?: boolean;
  isCheckingSetup?: boolean;
  setupReadyForRun?: boolean;
  setupCheckStale?: boolean;
  onImport?: (data: any) => void;
  onCancel?: () => void;
  missingConnectionsCount?: number;
  missingConnections?: Array<{ provider: string; displayName: string }>;
}

export default function WorkflowHeader({
  onSave,
  onRun,
  onCheckSetup,
  isSaving,
  isRunning,
  isCheckingSetup,
  setupReadyForRun = false,
  setupCheckStale = false,
  onImport,
  onCancel,
  missingConnectionsCount = 0,
  missingConnections = [],
}: WorkflowHeaderProps) {
  const navigate = useNavigate();
  const { workflowId, workflowName, isDirty, nodes, edges } = useWorkflowStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isScheduleActive, setIsScheduleActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if schedule is active on mount and when workflowId changes
  useEffect(() => {
    const checkSchedule = () => {
      if (workflowId && workflowId !== 'new') {
        setIsScheduleActive(workflowScheduler.isScheduled(workflowId));
      } else {
        setIsScheduleActive(false);
      }
    };
    
    checkSchedule();
    
    // Also check when schedule is updated
    window.addEventListener('schedule-updated', checkSchedule);
    
    return () => {
      window.removeEventListener('schedule-updated', checkSchedule);
    };
  }, [workflowId]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleConnectionsClick = () => {
    const returnTo = workflowId && workflowId !== 'new' ? `/workflow/${workflowId}` : '/workflows';
    const params = new URLSearchParams({ returnTo });
    if (workflowName) params.set('workflowName', workflowName);
    navigate(`/connections?${params.toString()}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const workflowData = JSON.parse(text);
        if (onImport) {
          onImport(workflowData);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to import workflow: ${error instanceof Error ? error.message : 'Invalid JSON file'}`,
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportClick = async () => {
    if (nodes.length === 0) {
      toast({
        title: 'No workflow to export',
        description: 'Add some nodes to your workflow before exporting',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      // Build local export data (synchronous) and fetch DB metadata in parallel
      const localData: any = {
        name: workflowName || 'Untitled Workflow',
        nodes: nodes.map(node => {
          const { executionStatus, ...cleanData } = node.data;
          return { ...node, data: cleanData };
        }),
        edges: edges.map(edge => {
          const { style, ...cleanEdge } = edge;
          return cleanEdge;
        }),
      };

      const dbMetadata = workflowId
        ? await awsClient
            .from('workflows')
            .select('description, viewport, cron_expression, workflow_type, agent_config, memory_config')
            .eq('id', workflowId)
            .single()
            .then(({ data, error }) => (!error && data ? (data as any) : null))
            .catch(() => null)
        : null;

      const exportData: any = { ...localData };
      if (dbMetadata) {
        if (dbMetadata.description) exportData.description = dbMetadata.description;
        if (dbMetadata.viewport) exportData.viewport = dbMetadata.viewport;
        if (dbMetadata.cron_expression) exportData.cron_expression = dbMetadata.cron_expression;
        if (dbMetadata.workflow_type) exportData.workflow_type = dbMetadata.workflow_type;
        if (dbMetadata.agent_config) exportData.agent_config = dbMetadata.agent_config;
        if (dbMetadata.memory_config) exportData.memory_config = dbMetadata.memory_config;
      }

      // Add export metadata
      exportData.exported_at = new Date().toISOString();
      exportData.version = '1.0';

      // Create JSON blob and download
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Sanitize filename: remove special characters and replace spaces with underscores
      const sanitizedName = (workflowName || 'workflow')
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      link.download = `${sanitizedName}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: 'Workflow exported as JSON file',
      });
    } catch (error) {
      console.error('Error exporting workflow:', error);
      toast({
        title: 'Export failed',
        description: `Failed to export workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-2 min-w-0">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <AppBrand context="app" size="sm" className="hidden sm:flex" />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative inline-flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConnectionsClick}
            className="flex items-center gap-2"
          >
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Connections</span>
          </Button>
          {missingConnectionsCount > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 animate-pulse cursor-pointer z-10" />
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-72 p-3 space-y-2">
                <p className="text-sm font-semibold">Connections needed</p>
                <p className="text-xs text-muted-foreground">
                  This workflow needs these accounts connected before it can run:
                </p>
                <div className="space-y-1.5">
                  {missingConnections.map((c) => (
                    <div key={c.provider} className="flex items-center gap-2 text-sm">
                      <ProviderLogo provider={c.provider} size={18} />
                      <span>{c.displayName}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" className="w-full mt-1" onClick={handleConnectionsClick}>
                  Set Up Connections
                </Button>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <ScheduleSettings workflowId={workflowId} onScheduleChange={setIsScheduleActive} />
        <WebhookSettings workflowId={workflowId} />

        <SaveStateButton onSave={onSave} isDirty={isDirty} isSaving={Boolean(isSaving)} />

        <WorkflowActionButton
          size="sm"
          variant="outline"
          className="border-primary/50 text-primary hover:bg-primary/10"
          onClick={onCheckSetup}
          disabled={isRunning || isSaving || isCheckingSetup || isScheduleActive}
          tooltip={
            isScheduleActive
              ? 'Manual Run is disabled when schedule is active'
              : isDirty
                ? 'Save the current graph and check setup'
                : 'Check workflow setup'
          }
        >
          <ListChecks className="mr-2 h-4 w-4" />
          {isCheckingSetup ? 'Checking...' : 'Check Setup'}
        </WorkflowActionButton>

        {isRunning && onCancel && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onCancel}
          >
            <Square className="mr-2 h-3.5 w-3.5 fill-current" />
            Cancel
          </Button>
        )}

        <WorkflowActionButton
          size="sm"
          className="gradient-primary text-primary-foreground"
          onClick={() => onRun(false)}
          disabled={isRunning || isScheduleActive || !setupReadyForRun}
          tooltip={
            isScheduleActive
              ? 'Manual Run is disabled when schedule is active'
              : setupCheckStale
                ? 'Run Check Setup again after editing'
                : !setupReadyForRun
                  ? 'Run Check Setup before running'
                  : undefined
          }
        >
          <Play className="mr-2 h-4 w-4" />
          {isRunning ? 'Running...' : isScheduleActive ? 'Scheduled' : 'Run'}
        </WorkflowActionButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" />
              Import JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportClick} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export as JSON'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Workflow Settings</DropdownMenuItem>
            <DropdownMenuItem>Version History</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Delete Workflow</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </header>
  );
}
