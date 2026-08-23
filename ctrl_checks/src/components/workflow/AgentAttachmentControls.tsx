import { useMemo, useState, type ComponentType } from 'react';
import type { Edge, Node } from '@xyflow/react';
import {
  Bot,
  Brain,
  Box,
  Database,
  FileText,
  Globe,
  Plus,
  Search,
  Sparkles,
  Table,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { NodeData, useWorkflowStore } from '@/stores/workflowStore';
import { getIntegrationLogo } from '@/lib/integrationLogos';
import { NODE_TYPES, NodeTypeDefinition } from './nodeTypes';

type AgentSlot = 'chat_model' | 'memory' | 'tool';

const SLOT_META: Record<AgentSlot, { label: string; shortLabel: string; icon: typeof Bot; color: string }> = {
  chat_model: { label: 'Chat Model', shortLabel: 'Model', icon: Sparkles, color: '#6366f1' },
  memory: { label: 'Memory', shortLabel: 'Memory', icon: Brain, color: '#f59e0b' },
  tool: { label: 'Knowledge & Tools', shortLabel: 'Tools', icon: Table, color: '#10b981' },
};

// Only providers LLMAdapter.detectProvider() (worker/src/shared/llm-adapter.ts) actually
// routes to real API calls belong here. Mistral/Cohere are deliberately excluded: their
// model names don't match any prefix detectProvider() recognizes, so attaching one would
// silently execute the agent request on Gemini instead — a wrong answer with no error,
// not an unsupported-provider error. Re-add them once LLMAdapter has real provider branches.
const MODEL_NODE_TYPES = new Set([
  'chat_model',
  'ai_chat_model',
  'google_gemini',
  'openai_gpt',
  'anthropic_claude',
]);

const TOOL_EXCLUDED_TYPES = new Set(['ai_agent', 'chat_model', 'ai_chat_model', 'memory', 'tool']);
const QUICK_TOOL_TYPES = [
  'google_sheets',
  'postgresql',
  'mysql',
  'database_read',
  'notion',
  'airtable',
  'http_request',
  'google_doc',
  'google_drive',
  'website_scraper',
];

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  Bot,
  Brain,
  Box,
  Database,
  FileText,
  Globe,
  Sparkles,
  Table,
};

function normalizeSlot(handle: unknown): AgentSlot | null {
  const value = String(handle || '').toLowerCase();
  if (value === 'chat_model' || value === 'chatmodel') return 'chat_model';
  if (value === 'memory') return 'memory';
  if (value === 'tool') return 'tool';
  return null;
}

function isToolCandidate(node: NodeTypeDefinition): boolean {
  if (TOOL_EXCLUDED_TYPES.has(node.type)) return false;
  const category = String(node.category || '').toLowerCase();
  return category !== 'trigger' && category !== 'triggers';
}

function makeNodeId(type: string, existingIds: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}_${attempt}_${Math.random().toString(36).slice(2)}`;
    const id = `${type}_${suffix}`;
    if (!existingIds.has(id)) return id;
  }
  throw new Error('Could not create a unique node id');
}

function positionForSlot(agent: Node<NodeData>, slot: AgentSlot, existingCount: number) {
  const baseX = agent.position?.x || 0;
  const baseY = agent.position?.y || 0;
  if (slot === 'chat_model') return { x: baseX - 150, y: baseY + 170 };
  if (slot === 'memory') return { x: baseX - 10, y: baseY + 190 };
  return { x: baseX + 145 + existingCount * 125, y: baseY + 170 + (existingCount % 2) * 34 };
}

function nodeTypeToWorkflowNode(
  definition: NodeTypeDefinition,
  id: string,
  slot: AgentSlot,
  position: { x: number; y: number },
): Node<NodeData> {
  return {
    id,
    type: definition.type === 'form' ? 'form' : 'custom',
    position,
    data: {
      label: definition.label,
      type: definition.type,
      category: definition.category,
      icon: definition.icon,
      config: { ...definition.defaultConfig },
      agentAttachmentRole: slot,
    },
  };
}

export default function AgentAttachmentControls({ agentId }: { agentId: string }) {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setEdges = useWorkflowStore((state) => state.setEdges);
  const setIsDirty = useWorkflowStore((state) => state.setIsDirty);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const [openSlot, setOpenSlot] = useState<AgentSlot | null>(null);
  const [query, setQuery] = useState('');

  const agentNode = nodes.find((node) => node.id === agentId);

  const attachedBySlot = useMemo(() => {
    const result: Record<AgentSlot, Node<NodeData>[]> = {
      chat_model: [],
      memory: [],
      tool: [],
    };
    for (const edge of edges) {
      if (edge.target !== agentId) continue;
      const slot = normalizeSlot(edge.targetHandle);
      if (!slot) continue;
      const source = nodes.find((node) => node.id === edge.source);
      if (source) result[slot].push(source);
    }
    return result;
  }, [agentId, edges, nodes]);

  const candidates = useMemo(() => {
    const source =
      openSlot === 'chat_model'
        ? NODE_TYPES.filter((node) => MODEL_NODE_TYPES.has(node.type))
        : openSlot === 'memory'
          ? NODE_TYPES.filter((node) => node.type === 'memory')
          : NODE_TYPES.filter(isToolCandidate);

    const searched = query.trim().toLowerCase();
    const filtered = searched
      ? source.filter((node) =>
          `${node.label} ${node.description} ${node.type}`.toLowerCase().includes(searched)
        )
      : source;

    return filtered.sort((a, b) => {
      const aQuick = QUICK_TOOL_TYPES.indexOf(a.type);
      const bQuick = QUICK_TOOL_TYPES.indexOf(b.type);
      if (openSlot === 'tool' && (aQuick !== -1 || bQuick !== -1)) {
        if (aQuick === -1) return 1;
        if (bQuick === -1) return -1;
        return aQuick - bQuick;
      }
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
  }, [openSlot, query]);

  const placeNode = (definition: NodeTypeDefinition, slot: AgentSlot) => {
    if (!agentNode) return;
    const existingIds = new Set(nodes.map((node) => node.id));
    const nodeId = makeNodeId(definition.type, existingIds);
    const attachedCount = attachedBySlot[slot].length;
    const newNode = nodeTypeToWorkflowNode(definition, nodeId, slot, positionForSlot(agentNode, slot, attachedCount));
    const nextEdge: Edge = {
      id: `edge_${nodeId}_${agentId}_${slot}`,
      source: nodeId,
      target: agentId,
      sourceHandle: 'output',
      targetHandle: slot,
      data: { agentAttachment: true, role: slot },
    };

    const singletonSlot = slot !== 'tool';
    const nextEdges = singletonSlot
      ? edges.filter((edge) => edge.target !== agentId || normalizeSlot(edge.targetHandle) !== slot)
      : edges;

    setNodes([...nodes, newNode]);
    setEdges([...nextEdges, nextEdge]);
    setIsDirty(true);
    selectNode(newNode);
    setOpenSlot(null);
    setQuery('');
  };

  const openPicker = (slot: AgentSlot) => {
    setOpenSlot((current) => (current === slot ? null : slot));
    setQuery('');
  };

  return (
    <div className="nodrag nopan mt-3 space-y-2" onMouseDown={(event) => event.stopPropagation()}>
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(SLOT_META) as AgentSlot[]).map((slot) => {
          const meta = SLOT_META[slot];
          const Icon = meta.icon;
          const attached = attachedBySlot[slot];
          const hasAttached = attached.length > 0;
          return (
            <button
              key={slot}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openPicker(slot);
              }}
              className={cn(
                'min-h-[52px] rounded-md border px-1.5 py-1 text-left transition-colors',
                'bg-background/70 hover:bg-muted/70',
                openSlot === slot ? 'border-foreground/30 shadow-sm' : 'border-border/60',
              )}
              title={`Place ${meta.label}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="truncate text-[10px] font-medium text-foreground/85">{meta.shortLabel}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                {hasAttached ? (
                  <>
                    <Icon className="h-3 w-3" />
                    <span className="truncate">{slot === 'tool' ? `${attached.length} placed` : attached[0].data.label}</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    <span>Place</span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {openSlot && (
        <div
          className="absolute left-1/2 top-[calc(100%+8px)] z-50 w-[310px] -translate-x-1/2 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SLOT_META[openSlot].color }} />
            <div>
              <div className="text-xs font-semibold">Place {SLOT_META[openSlot].label}</div>
            </div>
          </div>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search nodes"
              className="h-8 pl-7 text-xs"
              autoFocus
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto pr-1">
            {candidates.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">No matching nodes</div>
            ) : (
              <div className="space-y-1">
                {candidates.slice(0, 80).map((node) => {
                  const logo = getIntegrationLogo(node.type);
                  const Icon = iconMap[node.icon] || Box;
                  return (
                    <button
                      key={node.type}
                      type="button"
                      onClick={() => placeNode(node, openSlot)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-muted/70"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background">
                        {logo ? (
                          <img src={logo} alt={node.label} className="h-5 w-5 object-contain" />
                        ) : (
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{node.label}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{node.category}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
