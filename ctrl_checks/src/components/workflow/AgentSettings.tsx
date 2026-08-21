import { Bot, Brain, PlugZap } from 'lucide-react';
import type { Edge, Node } from '@xyflow/react';

interface AgentSettingsProps {
  nodeId?: string;
  nodes?: Node[];
  edges?: Edge[];
}

const ATTACHMENT_LABELS: Record<string, string> = {
  chat_model: 'Chat model',
  chatModel: 'Chat model',
  memory: 'Memory',
  tool: 'Tool',
};

export default function AgentSettings({ nodeId, nodes = [], edges = [] }: AgentSettingsProps) {
  const attachedEdges = edges.filter((edge) =>
    edge.target === nodeId &&
    typeof edge.targetHandle === 'string' &&
    edge.targetHandle in ATTACHMENT_LABELS
  );
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return (
    <section className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Bot className="h-4 w-4" />
        AI Agent
      </div>
      <div className="grid gap-2">
        {attachedEdges.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PlugZap className="h-4 w-4" />
            No attached tools
          </div>
        ) : (
          attachedEdges.map((edge) => {
            const source = nodeById.get(edge.source);
            const handle = String(edge.targetHandle || '');
            const label = ATTACHMENT_LABELS[handle] || handle;
            return (
              <div key={edge.id} className="flex items-center justify-between gap-3 rounded border border-border/70 px-2 py-1.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Brain className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{String(source?.data?.label || source?.type || edge.source)}</span>
                </span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
