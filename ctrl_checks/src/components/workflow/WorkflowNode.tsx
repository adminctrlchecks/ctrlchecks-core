import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { NodeData, useWorkflowStore } from '@/stores/workflowStore';
import { NODE_CATEGORIES } from './nodeTypes';
import { useDebugStore } from '@/stores/debugStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemedBorderGlow } from '@/components/ui/themed-border-glow';
import { getIntegrationLogo } from '@/lib/integrationLogos';
import {
  Play, Webhook, Clock, Globe, Brain, Sparkles, Gem, Link, GitBranch,
  GitMerge, Repeat, Timer, ShieldAlert, Code, Braces, Table, Type,
  Combine, Send, Mail, MessageSquare, Database, Box,
  CheckCircle, XCircle, Loader2,
  FileText, DatabaseZap, Calendar, Users,
  Layers, Edit, Edit3, Tag, Code2, ListChecks,
  ArrowUpDown, List, Terminal, Calculator, Lock, Rss, Target, Bug, Bot,
  AlertTriangle
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Play, Webhook, Clock, Globe, Brain, Sparkles, Gem, Link, GitBranch,
  GitMerge, Repeat, Timer, ShieldAlert, Code, Braces, Table, Type,
  Combine, Send, Mail, MessageSquare, Database, Box, FileText, DatabaseZap,
  Calendar, CheckCircle, Users,
  XCircle, Layers, Edit, Edit3, Tag, Code2, ListChecks, ArrowUpDown, List, Terminal,
  Calculator, Lock, Rss, Target, Bot
};

type WorkflowNodeProps = Node<NodeData>;

const WorkflowNode = memo(({ data, selected, id }: NodeProps<WorkflowNodeProps>) => {
  const { openDebug } = useDebugStore();
  const isAiEditedHighlight = useWorkflowStore((s) => s.aiEditedNodeIds.includes(id));
  const nodeError = useWorkflowStore((s) => s.nodeErrors[id]);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const status = data?.executionStatus || 'idle';
  const glowOverrides = useMemo(() => {
    let colors: string[] | undefined;
    let glowColor: string | undefined;
    let glowIntensity: number | undefined;
    let animated = false;

    if (status === 'running') {
      colors = isLight
        ? ['#1e40af', '#2563eb', '#0284c7']
        : ['#2563eb', '#3b82f6', '#60a5fa'];
      glowColor = isLight ? '217 91 40' : '217 91 68';
      glowIntensity = 1.52;
      animated = true;
    } else if (status === 'success') {
      colors = isLight
        ? ['#166534', '#0f766e', '#15803d']
        : ['#22c55e', '#2dd4bf', '#4ade80'];
      glowColor = isLight ? '142 76 32' : '142 76 62';
      glowIntensity = 1.42;
    } else if (selected) {
      glowIntensity = isLight ? 1.52 : 1.58;
      glowColor = isLight ? '174 60 40' : '174 60 68';
    }

    return { colors, glowColor, glowIntensity, animated };
  }, [status, selected, isLight]);

  // Skip rendering form nodes - they use custom FormTriggerNode component
  if (data?.type === 'form') {
    return null;
  }

  // Fallback for missing data fields
  if (!data) {
    console.warn('[WorkflowNode] Missing data prop');
    return null;
  }

  const handleDebugClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    openDebug(id);
  };

  // Ensure required fields exist with fallbacks
  const nodeType = data.type || 'unknown';
  const nodeLabel = data.label || nodeType || 'Unknown Node';
  const nodeCategory = data.category || 'data';
  const nodeIcon = data.icon || 'Box';

  const category = NODE_CATEGORIES.find((c) => c.id === nodeCategory);
  const IconComponent = iconMap[nodeIcon] || Box;
  const logoSrc = getIntegrationLogo(nodeType);
  const isIfElseNode = nodeType === 'if_else';
  const isSwitchNode = nodeType === 'switch';
  const isAIAgentNode = nodeType === 'ai_agent';

  const parseSwitchCases = (raw: unknown): Array<{ value: string; label?: string }> => {
    if (!raw) return [];
    let parsed: unknown = raw;
    if (typeof parsed === 'string') {
      const trimmed = parsed.trim();
      if (!trimmed) return [];
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        console.warn('[WorkflowNode] Invalid switch cases payload, using empty cases');
        return [];
      }
    }
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const normalized: Array<{ value: string; label?: string }> = [];
    for (const item of parsed as any[]) {
      const valueRaw =
        typeof item === 'string' ? item : item?.value != null ? String(item.value) : '';
      const value = String(valueRaw || '').trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      const label =
        typeof item === 'object' && item && typeof item.label === 'string'
          ? item.label
          : undefined;
      normalized.push({ value, ...(label ? { label } : {}) });
    }
    return normalized;
  };

  // Parse Switch cases to create output handles
  // This will automatically update when data.config.cases changes
  let switchCases: Array<{ value: string; label?: string }> = [];
  const switchCasesRaw = data.config?.cases ?? data.config?.rules;
  if (isSwitchNode && switchCasesRaw) {
    switchCases = parseSwitchCases(switchCasesRaw);
  }

  // Create a key based on cases to help React identify when handles need to update
  const switchCasesKey = isSwitchNode
    ? JSON.stringify(switchCases.map(c => c.value).sort())
    : '';

  const nodeWidth = 240;
  const nodeMinHeight = 70;

  return (
    <ThemedBorderGlow
      variant="canvas-node"
      className="shadow-md transition-all"
      style={{ width: nodeWidth, minHeight: nodeMinHeight }}
      colors={glowOverrides.colors}
      glowColor={glowOverrides.glowColor}
      glowIntensity={glowOverrides.glowIntensity}
      animated={glowOverrides.animated}
    >
      <div
        className={cn(
          'px-5 py-4 rounded-xl bg-card transition-all relative',
          status === 'running' && 'motion-safe:animate-pulse',
          isAiEditedHighlight && 'ring-2 ring-violet-500/70 ring-offset-2 ring-offset-background'
        )}
      >
      {isAiEditedHighlight && (
        <div
          className="absolute -top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-600 text-white shadow-sm border border-violet-400/40"
          title="Updated by AI editor"
        >
          AI
        </div>
      )}
      {data.config?.mockMode === true && (
        <div
          className="absolute -top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500 text-white shadow-sm border border-amber-400/40"
          style={isAiEditedHighlight ? { left: '2.5rem' } : undefined}
          title="Mock mode enabled"
        >
          Mock
        </div>
      )}
      {/* Execution Status Indicators */}
      {status === 'running' && (
        <div className="absolute -top-2 -right-2 bg-background rounded-full p-0.5 shadow-sm border border-border z-10">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
        </div>
      )}
      {status === 'success' && (
        <div className="absolute -top-2 -right-2 bg-background rounded-full p-0.5 shadow-sm border border-border z-10">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      )}
      {status === 'error' && (
        <>
          <div
            className="absolute -top-2 -right-2 bg-background rounded-full p-0.5 shadow-sm border border-border z-10 cursor-help"
            title={nodeError || 'Node execution failed'}
          >
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          {nodeError && (
            <div
              className="absolute -bottom-7 left-0 right-0 z-20 mx-1 px-2 py-1 rounded text-[10px] leading-tight text-white bg-red-600/90 shadow border border-red-500/40 truncate"
              title={nodeError}
            >
              {nodeError}
            </div>
          )}
          {isAIAgentNode && (
            <div className="absolute bottom-2 right-2 z-10">
              <div className="bg-red-500 rounded-sm p-0.5">
                <AlertTriangle className="h-3 w-3 text-white" />
              </div>
            </div>
          )}
        </>
      )}

      {/* Input handle — ai_agent uses 'userInput', all other nodes use 'input' */}
      <Handle
        type="target"
        id={isAIAgentNode ? 'userInput' : 'input'}
        position={Position.Top}
        isConnectable={true}
        className="!w-4 !h-4 !bg-muted-foreground !border-2 !border-background"
      />
      {/* Hidden alias handle so edges stored with 'input' still connect on ai_agent */}
      {isAIAgentNode && (
        <Handle
          type="target"
          id="input"
          position={Position.Top}
          isConnectable={false}
          style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        />
      )}

      <div className={cn("flex items-center gap-3", isAIAgentNode && "justify-center")}>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0"
          style={{ backgroundColor: logoSrc ? '#fff' : category?.color + '20', color: category?.color }}
        >
          {logoSrc ? (
            <img src={logoSrc} alt={nodeLabel} className="h-5 w-5 object-contain" />
          ) : (
            <IconComponent className="h-4 w-4" />
          )}
        </div>
        {isAIAgentNode ? (
          <div className="flex-1 min-w-0 text-center">
            <div className="font-medium text-sm leading-tight break-words hyphens-auto">
              {nodeLabel}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm leading-tight break-words hyphens-auto">
              {nodeLabel}
            </div>
            <div className="text-xs text-muted-foreground capitalize leading-tight break-words mt-0.5">
              {nodeCategory}
            </div>
          </div>
        )}
        <button
          onClick={handleDebugClick}
          className={cn(
            "h-6 w-6 flex items-center justify-center rounded-md flex-shrink-0",
            "text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/60",
            "transition-colors duration-150",
            "border border-border/40 hover:border-border"
          )}
          title="Debug Node"
          aria-label="Debug Node"
        >
          <Bug className="h-3.5 w-3.5" />
        </button>
      </div>

      {isIfElseNode ? (
        <>
          <Handle
            type="source"
            id="true"
            position={Position.Bottom}
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
            style={{ left: '25%' }}
          />
          <Handle
            type="source"
            id="false"
            position={Position.Bottom}
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-background"
            style={{ left: '75%' }}
          />
        </>
      ) : isSwitchNode ? (
        switchCases.length > 0 ? (
          <>
            {/* Output handles - dynamically positioned based on number of cases */}
            {switchCases.map((c, idx) => {
              // ✅ Unified formula for N cases — no hardcoded special cases
              // Distributes handles evenly from 15% to 85% of the node width
              let leftPercent: string;
              if (switchCases.length === 1) {
                leftPercent = '50%';
              } else {
                const spacing = 70 / (switchCases.length - 1);
                leftPercent = `${15 + (idx * spacing)}%`;
              }

              return (
                <Handle
                  key={`${c.value}-${switchCasesKey}`}
                  type="source"
                  id={c.value}
                  position={Position.Bottom}
                  className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
                  style={{
                    left: leftPercent,
                    transform: 'translateX(-50%)'
                  }}
                />
              );
            })}
          </>
        ) : (
          // No cases configured yet - show single default handle
          <Handle
            type="source"
            id="output"
            position={Position.Bottom}
            className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
          />
        )
      ) : isAIAgentNode ? (
        <>
          <Handle
            type="target"
            id="chat_model"
            position={Position.Bottom}
            isConnectable={true}
            className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-background"
            style={{ left: '18%', transform: 'translateX(-50%)' }}
          />
          <Handle
            type="target"
            id="memory"
            position={Position.Bottom}
            isConnectable={true}
            className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background"
            style={{ left: '34%', transform: 'translateX(-50%)' }}
          />
          <Handle
            type="target"
            id="tool"
            position={Position.Bottom}
            isConnectable={true}
            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          />
          <Handle
            type="source"
            id="success"
            position={Position.Bottom}
            isConnectable={true}
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
            style={{ left: '70%', transform: 'translateX(-50%)' }}
          />
          <Handle
            type="source"
            id="error"
            position={Position.Bottom}
            isConnectable={true}
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-background"
            style={{ left: '86%', transform: 'translateX(-50%)' }}
          />
          <Handle
            type="source"
            id="output"
            position={Position.Bottom}
            isConnectable={true}
            style={{ opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          />
        </>
      ) : (
        <Handle
          type="source"
          id="output"
          position={Position.Bottom}
          isConnectable={true}
          className="!w-4 !h-4 !bg-muted-foreground !border-2 !border-background"
        />
      )}
      </div>
    </ThemedBorderGlow>
  );
});

WorkflowNode.displayName = 'WorkflowNode';

export default WorkflowNode;
