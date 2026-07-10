import { useEffect, useState, useMemo } from 'react';
import { Search, X, ChevronDown,
  Play, Webhook, Clock, Globe, Brain, Sparkles, Gem, Link, GitBranch, 
  GitMerge, Repeat, Timer, ShieldAlert, Code, Braces, Table, Type, 
  Combine, Send, Mail, MessageSquare, Database, Box, FileText, Heart,
  Filter, Variable, Hash, MessageCircle, DatabaseZap, FileOutput,
  Calendar, CheckCircle, Users,
  XCircle, Layers, Edit, Edit3, Tag, Code2, ListChecks, ArrowUpDown, List, Terminal,
  Calculator, Lock, Rss, Bell, Activity, AlertCircle, Image, Target,
  Key, Shield, CreditCard, ShoppingCart, BarChart, TrendingUp, Bot
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NODE_CATEGORIES, NODE_TYPES, NodeTypeDefinition } from './nodeTypes';
import { cn } from '@/lib/utils';
import { nodeSchemaService, type NodeDefinition } from '@/services/nodeSchemaService';
import { BACKEND_SUPPORTED_NODE_TYPES } from './backendSupportedNodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Play, Webhook, Clock, Globe, Brain, Sparkles, Gem, Link, GitBranch,
  GitMerge, Repeat, Timer, ShieldAlert, Code, Braces, Table, Type,
  Combine, Send, Mail, MessageSquare, Database, Box, FileText, Heart,
  Filter, Variable, Hash, MessageCircle, DatabaseZap, FileOutput,
  Calendar, CheckCircle, Users,
  XCircle, Layers, Edit, Edit3, Tag, Code2, ListChecks, ArrowUpDown, List, Terminal,
  Calculator, Lock, Rss, Bell, Activity, AlertCircle, Image, Target,
  Key, Shield, CreditCard, ShoppingCart, BarChart, TrendingUp, Bot
};

interface NodeLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeTypeDefinition) => void;
  onClose?: () => void;
}

const categoryColors = [
  'hsl(var(--primary))',
  'hsl(217 91% 60%)',
  'hsl(142 71% 45%)',
  'hsl(25 95% 53%)',
  'hsl(280 77% 52%)',
  'hsl(200 75% 50%)',
];

function humanizeCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeBackendCategory(category: string): NodeTypeDefinition['category'] {
  const aliases: Record<string, NodeTypeDefinition['category']> = {
    trigger: 'triggers',
    triggers: 'triggers',
    communication: 'output',
    integrations: 'http_api',
    integration: 'http_api',
    transformation: 'data',
    file: 'storage',
    social: 'social_media',
    auth: 'authentication',
    flow: 'logic',
    workflow: 'logic',
    actions: 'utility',
    microsoft: 'output',
  };
  return aliases[category] || (category as NodeTypeDefinition['category']);
}

// Legacy/internal-only node types: still execute and render in existing workflows,
// but never offered for new placements. Mirrors `internalOnly` in the worker's node-library.
const HIDDEN_NODE_TYPES = new Set(['ollama', 'chat_model', 'memory', 'tool']);

function backendSchemaToNodeType(definition: NodeDefinition): NodeTypeDefinition {
  return {
    type: definition.type,
    label: definition.label,
    category: normalizeBackendCategory(definition.category || 'utility'),
    icon: definition.icon || 'Box',
    description: definition.description || definition.label,
    defaultConfig: definition.defaultInputs || {},
    configFields: [],
  };
}

export default function NodeLibrary({ onDragStart, onClose }: NodeLibraryProps) {
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [schemaNodes, setSchemaNodes] = useState<NodeTypeDefinition[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    nodeSchemaService.fetchAllSchemas()
      .then((schemas) => {
        if (cancelled) return;
        // Internal/legacy-only nodes (hidden) still render in existing workflows,
        // but are not offered in the palette for new placements.
        setSchemaNodes(schemas.filter((schema) => !schema.hidden).map(backendSchemaToNodeType));
      })
      .catch((error) => {
        console.error('[NodeLibrary] Falling back to static backend-supported node list:', error);
        if (!cancelled) setSchemaNodes(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sourceNodes = useMemo(
    () =>
      schemaNodes ||
      NODE_TYPES.filter(
        (node) => BACKEND_SUPPORTED_NODE_TYPES.has(node.type) && !HIDDEN_NODE_TYPES.has(node.type),
      ),
    [schemaNodes],
  );

  const filteredNodes = useMemo(() => 
    search
      ? sourceNodes.filter(
          (node) =>
            node.label.toLowerCase().includes(search.toLowerCase()) ||
            node.description.toLowerCase().includes(search.toLowerCase())
        )
      : sourceNodes,
    [search, sourceNodes]
  );

  // Sort categories alphabetically
  const sortedCategories = useMemo(() => {
    const existing = new Map<string, { id: string; label: string; color: string }>(
      NODE_CATEGORIES.map((category) => [category.id, category]),
    );
    Array.from(new Set(sourceNodes.map((node) => node.category))).forEach((category, index) => {
      if (!existing.has(category)) {
        existing.set(category, {
          id: category,
          label: humanizeCategory(category),
          color: categoryColors[index % categoryColors.length],
        });
      }
    });
    return Array.from(existing.values())
      .filter((category) => sourceNodes.some((node) => node.category === category.id))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [sourceNodes]);

  const getNodesByCategory = (categoryId: string) =>
    filteredNodes
      .filter((node) => node.category === categoryId)
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

  return (
    <div className="relative w-full h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40">
        <div className="mb-3 relative flex items-center justify-center">
          <h2 className="text-sm font-medium text-foreground/90">Node Library</h2>
          {onClose && (
            <button
              onClick={onClose}
              className={cn(
                "absolute right-0 h-6 w-6 flex items-center justify-center rounded-sm",
                "text-muted-foreground/60 hover:text-foreground/80",
                "hover:bg-muted/40 transition-colors duration-150"
              )}
              title="Close panel"
              aria-label="Close panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm border-border/60 bg-background focus-visible:ring-1 focus-visible:ring-ring/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2.5 py-2 w-full">
          {sortedCategories.map((category) => {
            const nodes = getNodesByCategory(category.id);
            if (nodes.length === 0) return null;
            const isOpen = openCategories.has(category.id);

            return (
              <div key={category.id} className="mb-0.5 w-full">
                {/* Category trigger — fixed width, no layout shift */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 py-1.5 px-2 rounded-sm",
                    "hover:bg-muted/40 transition-colors duration-150",
                    "text-left"
                  )}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-xs font-medium text-foreground/80 truncate flex-1 min-w-0">
                    {category.label}
                  </span>
                  <span className="text-xs text-muted-foreground/70 flex-shrink-0 mr-1">
                    {nodes.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 flex-shrink-0 text-muted-foreground/60 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Category content — expands in-place, no width change */}
                {isOpen && (
                  <div className="pt-1 pb-1.5 px-1 w-full">
                    <div className="space-y-0.5">
                      {nodes.map((node) => {
                        const IconComponent = iconMap[node.icon] || Box;
                        const logoSrc = getIntegrationLogo(node.type);
                        return (
                          <div
                            key={node.type}
                            draggable
                            onDragStart={(e) => onDragStart(e, node)}
                            className={cn(
                              "flex items-start gap-2.5 p-2 rounded-sm cursor-grab",
                              "hover:bg-muted/50 transition-colors duration-150",
                              "active:cursor-grabbing w-full"
                            )}
                          >
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: logoSrc ? '#fff' : category.color + '15', color: category.color }}
                            >
                              {logoSrc ? (
                                <img src={logoSrc} alt={node.label} className="h-4 w-4 object-contain" />
                              ) : (
                                <IconComponent className="h-3 w-3" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="text-xs font-medium text-foreground/90 truncate leading-tight">
                                {node.label}
                              </div>
                              <div className="line-clamp-2 text-xs leading-tight text-muted-foreground/70 mt-0.5">
                                {node.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
