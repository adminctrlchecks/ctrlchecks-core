/**
 * Capability Review Step UI Component
 *
 * Displays the structural prompt and workflow summary to the user.
 * The Continue button is the sole gate for Backend_Generation — no backend
 * credential resolution or execution begins before the user clicks it.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { NodeSelectionMap } from '../../types/capability-selection';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CapabilityReviewStepProps {
  structuralPrompt: string;
  // workflow is `any` because the Workflow type lives in the worker package
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workflow: any;
  selections: NodeSelectionMap;
  onConfirm: () => void;
  onBack: () => void;
}

// ─── Node Row ─────────────────────────────────────────────────────────────────

interface NodeRowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any;
  index: number;
}

function NodeRow({ node, index }: NodeRowProps) {
  const label: string = node?.data?.label ?? node?.data?.type ?? node?.type ?? 'Unknown node';
  const description: string = node?.data?.description ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      // Cap the stagger: at 25 nodes a per-index delay would leave the last row blank for
      // over a second, which reads as the page having failed to load.
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.25 }}
      // Self-contained bordered row rather than a `border-b` divider list: the steps flow
      // into multiple columns on wide screens, where a shared bottom border would misalign.
      className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 p-3"
    >
      {/* Step number */}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold mt-0.5">
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>

      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary/60 mt-0.5" aria-hidden="true" />
    </motion.div>
  );
}

// ─── Capability Review Step ───────────────────────────────────────────────────

export function CapabilityReviewStep({
  structuralPrompt,
  workflow,
  selections,
  onConfirm,
  onBack,
}: CapabilityReviewStepProps) {
  // Req 5.2 — list nodes in execution order from workflow.nodes
  const nodes: any[] = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
  const selectionCount = Object.keys(selections).length;

  // Parse the structured prompt into sections: WORKFLOW, TRIGGER, FLOW, CONNECTIONS
  // Handles both "SECTION: content" and "SECTION\ncontent" formats for robustness
  const parseStructuredPrompt = (raw: string) => {
    const workflowMatch = raw.match(/^WORKFLOW:\s*(.+?)(?=\n\n|\nTRIGGER)/ms);
    const triggerMatch = raw.match(/TRIGGER:?\s*\n?([\s\S]+?)(?=\n\nFLOW|\nFLOW)/ms);
    const flowMatch = raw.match(/FLOW:?\s*\n?([\s\S]+?)(?=\n\nCONNECTIONS|\nCONNECTIONS|$)/ms);
    const connectionsMatch = raw.match(/CONNECTIONS:?\s*\n?([\s\S]+?)$/ms);

    return {
      workflow: workflowMatch?.[1]?.trim() ?? '',
      trigger: triggerMatch?.[1]?.trim() ?? '',
      flow: flowMatch?.[1]?.trim() ?? '',
      connections: connectionsMatch?.[1]?.trim() ?? '',
      // Structured if it has at least WORKFLOW and FLOW sections
      isStructured: raw.includes('WORKFLOW:') && (raw.includes('FLOW:') || raw.includes('\nFLOW\n') || raw.includes('\nFLOW\r\n')),
    };
  };

  const parsed = parseStructuredPrompt(structuralPrompt);

  // Render bold **text** inline
  const renderBold = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );

  // Render flow lines — handle branch cases (→ Case) with indentation
  const renderFlowLines = (flowText: string) =>
    flowText.split('\n').map((line, i) => {
      const isBranchCase = line.trim().startsWith('→');
      return (
        <div key={i} className={isBranchCase ? 'pl-4 text-xs text-muted-foreground' : 'text-sm'}>
          {renderBold(line)}
        </div>
      );
    });

  return (
    // Full width rather than a centred column, and stacked rather than split: the summary
    // is prose, and squeezing it into half the width made it a narrow ribbon that had to be
    // scrolled inside its own box to read. Full-bleed it fits in a few lines, and the step
    // list — which is short rows, not prose — reads fine underneath it.
    <div className="w-full space-y-4 pb-24">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Review your workflow</h2>
        <p className="text-sm text-muted-foreground">
          Confirm the workflow below before we start building it.{' '}
          <span className="font-medium text-foreground">
            {selectionCount} {selectionCount === 1 ? 'integration' : 'integrations'} selected.
          </span>
        </p>
      </div>

      {/* Workflow summary — structured AI-generated blueprint. Full width, above the steps.
          No height cap or inner scroll: at this width it is short enough to read in place,
          and a nested scrollbar only hid the end of it. */}
      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Workflow summary</CardTitle>
            <Badge variant="secondary" className="text-xs">AI generated</Badge>
          </div>
          {parsed.isStructured && parsed.workflow && (
            <CardDescription className="text-sm font-medium text-foreground/80 mt-1">
              {parsed.workflow}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {parsed.isStructured ? (
            <>
              {parsed.trigger && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Trigger</p>
                  <p className="text-sm text-foreground">{renderBold(parsed.trigger)}</p>
                </div>
              )}
              {parsed.flow && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Flow</p>
                  <div className="space-y-1">{renderFlowLines(parsed.flow)}</div>
                </div>
              )}
              {parsed.connections && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Connections</p>
                  <p className="text-sm text-muted-foreground">{parsed.connections}</p>
                </div>
              )}
            </>
          ) : (
            /* Legacy fallback for unstructured prompts */
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {structuralPrompt.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={i}>{part.slice(2, -2)}</strong>
                  : part
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Execution steps — node name + description only, no duplication */}
      {nodes.length > 0 && (
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Execution steps</CardTitle>
                <CardDescription className="text-sm">Nodes will run in this order.</CardDescription>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {nodes.length} {nodes.length === 1 ? 'step' : 'steps'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Now that the card spans the full width, split into columns much sooner —
                otherwise a handful of short rows would leave most of the width blank.
                Rows fill left-to-right then wrap; the step numbers carry the order.
                Short workflows stay in one column rather than being stretched into a
                sparse grid. */}
            <div
              className={[
                'grid gap-2',
                nodes.length > 3 ? 'md:grid-cols-2' : '',
                nodes.length > 8 ? 'xl:grid-cols-3' : '',
              ].join(' ')}
            >
              {nodes.map((node, index) => (
                <NodeRow key={node?.id ?? index} node={node} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t px-4 py-3 flex gap-3">
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
