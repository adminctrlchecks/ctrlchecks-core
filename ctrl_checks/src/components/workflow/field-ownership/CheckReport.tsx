import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The result of "Check all steps": every step still missing a value required by the
 * operation it is set to, named field by field.
 *
 * It reports; it runs nothing. Whether a node has been test-run is a separate, optional
 * signal — this answers only "is everything filled in?", which is what gates the build.
 *
 * Nothing here is computed: the completeness comes from the field plan, where the server
 * resolves each node's requirements from its live config. That is what makes the list follow
 * the chosen operation, and what keeps this free of any per-node-type knowledge.
 */
export interface CheckReportProps {
    incompleteNodes: Array<{ nodeId: string; nodeLabel: string; missingLabels: string[] }>;
    onSelectNode: (nodeId: string) => void;
    onDismiss: () => void;
}

export function CheckReport({ incompleteNodes, onSelectNode, onDismiss }: CheckReportProps) {
    if (incompleteNodes.length === 0) {
        return (
            <div
                className="rounded border border-emerald-500/40 bg-emerald-50 p-4 space-y-2 dark:bg-emerald-950/30"
                data-testid="check-report"
            >
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Every step has what it needs
                </p>
                <p className="text-xs text-muted-foreground">
                    Each step has a value for every field its chosen operation requires. You can
                    build the workflow.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
                    Back to steps
                </Button>
            </div>
        );
    }

    const totalMissing = incompleteNodes.reduce((sum, n) => sum + n.missingLabels.length, 0);

    return (
        <div
            className="rounded border border-amber-500/40 bg-amber-50 p-4 space-y-3 dark:bg-amber-950/20"
            data-testid="check-report"
        >
            <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4" />
                    {totalMissing === 1
                        ? '1 value is still missing'
                        : `${totalMissing} values are still missing`}
                </p>
                <p className="text-xs text-muted-foreground">
                    These fields are required by the operation each step is set to. Pick a step to
                    fill them in.
                </p>
            </div>

            <ul className="space-y-2">
                {incompleteNodes.map((node) => (
                    <li key={node.nodeId}>
                        <button
                            type="button"
                            onClick={() => onSelectNode(node.nodeId)}
                            className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 text-left transition-colors hover:border-amber-500/50 hover:bg-background"
                        >
                            <span className="block text-xs font-semibold">{node.nodeLabel}</span>
                            <span className="block text-[11px] text-muted-foreground">
                                Needs {node.missingLabels.join(', ')}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>

            <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
                Back to steps
            </Button>
        </div>
    );
}
