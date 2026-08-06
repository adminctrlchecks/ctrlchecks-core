/**
 * Capability Review Step UI Component
 *
 * Shows the final review before Backend_Generation starts. This screen is read-only:
 * Continue is still the sole gate that sends the unchanged workflow and structural prompt
 * to the backend confirm endpoint.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { CapabilityContainer, NodeSelectionMap } from '../../types/capability-selection';

interface PreviewNode {
  id?: string;
  type?: string;
  data?: {
    label?: string;
    type?: string;
    category?: string;
    description?: string;
  };
}

interface CapabilityReviewStepProps {
  structuralPrompt: string;
  workflow?: { nodes?: PreviewNode[] } | null;
  selections: NodeSelectionMap;
  containers?: CapabilityContainer[];
  onConfirm: () => void;
  onBack: () => void;
}

interface SelectedWorkflowNode {
  id: string;
  label: string;
  nodeType: string;
  role?: string;
  intentLabel?: string;
  intentDescription?: string;
  nodeDescription?: string;
}

function parseStructuredPrompt(raw: string) {
  const workflowMatch = raw.match(/^WORKFLOW:\s*(.+?)(?=\n\n|\nTRIGGER)/ms);
  const triggerMatch = raw.match(/TRIGGER:?\s*\n?([\s\S]+?)(?=\n\nFLOW|\nFLOW)/ms);
  const flowMatch = raw.match(/FLOW:?\s*\n?([\s\S]+?)(?=\n\nCONNECTIONS|\nCONNECTIONS|$)/ms);
  const connectionsMatch = raw.match(/CONNECTIONS:?\s*\n?([\s\S]+?)$/ms);

  return {
    workflow: workflowMatch?.[1]?.trim() ?? '',
    trigger: triggerMatch?.[1]?.trim() ?? '',
    flow: flowMatch?.[1]?.trim() ?? '',
    connections: connectionsMatch?.[1]?.trim() ?? '',
    isStructured:
      raw.includes('WORKFLOW:') &&
      (raw.includes('FLOW:') || raw.includes('\nFLOW\n') || raw.includes('\nFLOW\r\n')),
  };
}

function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

function splitReadablePoints(text: string) {
  return text
    .split(/\n+|(?<=\.)\s+(?=[A-Z0-9])/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildSelectedWorkflowNodes(
  nodes: PreviewNode[],
  containers: CapabilityContainer[],
  selections: NodeSelectionMap,
): SelectedWorkflowNode[] {
  if (containers.length > 0 && Object.keys(selections).length > 0) {
    return containers
      .slice()
      .sort((a, b) => a.useCaseUnit.orderIndex - b.useCaseUnit.orderIndex)
      .filter((container) => Boolean(selections[container.containerId]))
      .map((container, index) => {
        const selectedNodeType = selections[container.containerId];
        const candidate = container.candidates.find((item) => item.nodeType === selectedNodeType);

        return {
          id: container.containerId || `${selectedNodeType}_${index}`,
          label: candidate?.label ?? container.label ?? selectedNodeType,
          nodeType: selectedNodeType,
          role: container.useCaseUnit.semanticRole,
          intentLabel: container.useCaseUnit.label,
          intentDescription: container.useCaseUnit.description,
          nodeDescription: candidate?.description,
        };
      });
  }

  return nodes.map((node, index) => ({
    id: node?.id ?? `${node?.type ?? 'node'}_${index}`,
    label: node?.data?.label ?? node?.data?.type ?? node?.type ?? 'Unknown node',
    nodeType: node?.data?.type ?? node?.type ?? 'unknown',
    role: node?.data?.category,
    nodeDescription: node?.data?.description,
  }));
}

function SummaryPoint({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <li className={`flex gap-2 text-sm leading-relaxed ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
      <span>{children}</span>
    </li>
  );
}

export function CapabilityReviewStep({
  structuralPrompt,
  workflow,
  selections,
  containers = [],
  onConfirm,
  onBack,
}: CapabilityReviewStepProps) {
  const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
  const selectedWorkflowNodes = buildSelectedWorkflowNodes(nodes, containers, selections);
  const parsed = parseStructuredPrompt(structuralPrompt);

  const renderFlowLines = (flowText: string) =>
    flowText.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const isBranchCase = /^(?:->|\u2192|\u00e2\u2020\u2019)?\s*Case\b/i.test(trimmed);

      return (
        <li
          key={i}
          className={[
            'flex gap-2 leading-relaxed',
            isBranchCase ? 'ml-7 text-xs text-muted-foreground' : 'text-sm text-foreground',
          ].join(' ')}
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
          <span>{renderBold(trimmed.replace(/^(?:->|\u2192|\u00e2\u2020\u2019)\s*/, ''))}</span>
        </li>
      );
    });

  return (
    <div className="w-full space-y-4 pb-24">
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Selected workflow nodes</CardTitle>
              <CardDescription className="text-sm">
                Nodes will run in this order. Review the selected building blocks before setup starts.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs">
              {selectedWorkflowNodes.length} {selectedWorkflowNodes.length === 1 ? 'node' : 'nodes'} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {selectedWorkflowNodes.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {selectedWorkflowNodes.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.25 }}
                  className="rounded-lg border border-border/70 bg-background/70 p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                      <p className="truncate text-sm font-semibold">{item.label}</p>
                    </div>
                    {item.role && (
                      <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                        {item.role.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  {item.intentLabel && (
                    <p className="text-xs font-medium text-foreground/80">{item.intentLabel}</p>
                  )}
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.intentDescription || item.nodeDescription || 'Selected for this workflow step.'}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No selected nodes are available yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Workflow summary</CardTitle>
            <Badge variant="secondary" className="text-xs">AI generated</Badge>
          </div>
          <CardDescription className="text-sm">
            Point-wise explanation of what the AI will build next.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {parsed.isStructured ? (
            <>
              {parsed.workflow && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Goal</p>
                  <ul className="space-y-1.5">
                    <SummaryPoint>{renderBold(parsed.workflow)}</SummaryPoint>
                  </ul>
                </div>
              )}
              {parsed.trigger && (
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trigger</p>
                  <ul className="space-y-1.5">
                    {splitReadablePoints(parsed.trigger).map((point, index) => (
                      <SummaryPoint key={index}>{renderBold(point)}</SummaryPoint>
                    ))}
                  </ul>
                </div>
              )}
              {parsed.flow && (
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flow</p>
                  <ul className="space-y-1.5">{renderFlowLines(parsed.flow)}</ul>
                </div>
              )}
              {parsed.connections && (
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Connections</p>
                  <ul className="space-y-1.5">
                    {splitReadablePoints(parsed.connections).map((point, index) => (
                      <SummaryPoint key={index} muted>
                        {renderBold(point)}
                      </SummaryPoint>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <ul className="space-y-2">
              {splitReadablePoints(structuralPrompt).map((point, index) => (
                <SummaryPoint key={index}>{renderBold(point)}</SummaryPoint>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-sm">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        <Button onClick={onConfirm} className="ml-auto gap-2">
          Continue to workflow setup
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
