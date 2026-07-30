import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ListChecks, Loader2, Sparkles } from 'lucide-react';
import { BlueprintPanel } from './BlueprintPanel';
import { CheckReport } from './CheckReport';
import { NodeChecklistRail } from './NodeChecklistRail';
import { NodeOwnershipCard } from './NodeOwnershipCard';
import { PANE_SCROLL } from './pane-scroll';
import type { FieldOwnershipContext } from './types';

/**
 * The wizard's field-ownership step.
 *
 * Presentational: everything it needs arrives on `ctx`. It owns no state of its own,
 * which is what makes it renderable in a test without mounting the whole wizard.
 *
 * Extracted from AutonomousAgentWizard.tsx (Phase 0b).
 *
 * Layout (Phase E, plan RC-7): structurally the same screen as `CapabilityStage` — a plain
 * full-height flex column, a compact header, two panes that scroll independently, and a
 * pinned action bar. It fills the height the wizard hands it and scrolls nothing itself, so
 * the heading cannot travel up under the wizard's fixed header.
 *
 * There is deliberately **no `<Card>` wrapper**. It cost roughly a third of the working
 * height in chrome (a `p-6` header plus a `p-6` content box inside the wizard's own `p-6`),
 * and the shared Card's `motion-safe:hover:scale-[1.02]` put a transform on an ancestor of
 * the pinned bar, which re-anchored it mid-screen on hover. Node selection has no Card for
 * the same reasons; this screen now matches it.
 *
 * Do not reintroduce `calc(100vh - …)` or `min-h` floors — both were tried on node selection
 * and both failed, for reasons recorded in that file's comments.
 */
export interface FieldOwnershipStageProps {
    ctx: FieldOwnershipContext;
}

export function FieldOwnershipStage({ ctx }: FieldOwnershipStageProps) {
    /**
     * Which node the detail pane is showing (Phase B). Local, ephemeral UI state — it is not
     * part of the workflow, so it deliberately does not join the wizard-owned maps on `ctx`.
     */
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    /** The check report is opt-in: the user asks "what is left?" and gets a concrete list. */
    const [checkReportOpen, setCheckReportOpen] = useState(false);

    const firstIncompleteId = ctx.incompleteNodes?.[0]?.nodeId;

    // Land on the first node that still needs something, so the step opens on work rather
    // than on whatever happens to be first. Only ever *seeds* the selection: once the user
    // has chosen a node, their choice survives the plan refetching underneath them.
    useEffect(() => {
        setSelectedNodeId((current) => {
            if (current && ctx.nodesInOrder.some((g) => g.nodeId === current)) return current;
            return firstIncompleteId ?? ctx.nodesInOrder[0]?.nodeId ?? null;
        });
    }, [ctx.nodesInOrder, firstIncompleteId]);

    const selectedGroup = useMemo(
        () => ctx.nodesInOrder.find((g) => g.nodeId === selectedNodeId) ?? null,
        [ctx.nodesInOrder, selectedNodeId]
    );

    const incompleteNodes = ctx.incompleteNodes ?? [];
    const totalOutstanding = incompleteNodes.reduce((sum, n) => sum + n.missingLabels.length, 0);
    const allNodesReady = incompleteNodes.length === 0;
    // Both gates: fields required by each node's operation, and the wizard's own
    // manual-question signal. Either one outstanding means the workflow is not complete.
    const canBuild = allNodesReady && ctx.outstandingCount === 0;

    const handleSelectNode = (nodeId: string) => {
        setSelectedNodeId(nodeId);
        setCheckReportOpen(false);
    };

    return (
        // `pb-20` reserves the pinned action bar's footprint at every size, so the panes end
        // just above it rather than under it. The framer-motion entrance that used to wrap
        // this was removed in Phase E: it re-ran on every return to the step, and an element
        // animating from `y: 20` cannot participate in the height chain below it.
        <div className="w-full flex flex-col gap-4 scroll-mt-6 pb-20 lg:h-full lg:min-h-0">
            {/* Header — one row: title and sub-line on the left, the walk-through control
                right-aligned beside them rather than on a line of its own. Every row spent
                here is a row the panes below do not get. */}
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 lg:shrink-0">
                <div className="space-y-1">
                    <h2 className={`text-xl font-semibold ${ctx.sectionStyles.titleClass}`}>
                        <AlertCircle className="h-5 w-5" /> Field Ownership Required
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        One card per step, in the order the workflow runs. Each card holds
                        everything that step needs.
                    </p>
                </div>
                {/* Walk Me Through All Fields — single control for the entire ownership stage.
                    Rendered as a filled pill, not a bare text link: it is the step's one piece
                    of guidance and was reading as incidental caption text next to the heading.
                    Explicit light/dark pairs rather than opacity tints, matching how
                    CapabilityStage handles its accent surfaces. */}
                <div
                    className="flex min-w-[220px] flex-1 items-center justify-end gap-3 lg:max-w-md"
                    data-testid="walkthrough-bar"
                >
                    <button
                        type="button"
                        onClick={() => ctx.startGlobalWalkThrough(ctx.nodesInOrder)}
                        aria-pressed={Boolean(ctx.globalWalkActive)}
                        className={[
                            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5',
                            'text-xs font-medium cursor-pointer transition-colors',
                            ctx.globalWalkActive
                                ? 'border-violet-400 bg-violet-100 text-violet-800 hover:bg-violet-200 dark:border-violet-500/70 dark:bg-violet-900/50 dark:text-violet-100 dark:hover:bg-violet-900/70'
                                : 'border-violet-300 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-violet-100 dark:border-violet-800/70 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-900/50',
                        ].join(' ')}
                    >
                        {ctx.globalWalkActive ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {ctx.globalWalkActive
                            ? `${ctx.globalWalkActive.currentNodeLabel} · ${ctx.globalWalkActive.currentFieldLabel} (${ctx.globalWalkActive.currentFieldIdx + 1}/${ctx.globalWalkActive.totalFields}) — click to stop`
                            : 'Walk me through all fields'}
                    </button>
                    {ctx.globalWalkActive && (
                        <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                                style={{ width: `${Math.round(((ctx.globalWalkActive.currentFieldIdx + 1) / ctx.globalWalkActive.totalFields) * 100)}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* The blueprint grows a paragraph per node, so as a plain sibling it would eat
                the panes' height on exactly the large workflows that need them most. Capped
                and scrollable, it costs a fixed amount whatever the workflow's size. */}
            <BlueprintPanel
                pendingWorkflowData={ctx.pendingWorkflowData}
                className="lg:shrink-0 lg:max-h-40 lg:overflow-y-auto"
            />

            {/*
              * Two-pane working surface (§4.3): the rail of steps on the left, the node cards
              * taking the remaining width. Collapses to one column below `lg`, matching how
              * node selection already behaves. Same grid track as that screen so the two
              * screens' rails line up as the user moves between them.
              *
              * `lg:flex-1 lg:min-h-0` takes exactly the height left over after the header —
              * no more, no less — so the panes fill the screen and the step never overflows.
              * `min-h-0` is what permits the "no more" half: without it a flex child refuses
              * to shrink below its content and the scroll escapes back up to the page.
              */}
            <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-[340px_1fr] lg:flex-1 lg:min-h-0 lg:items-stretch">
                <NodeChecklistRail
                    ctx={ctx}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={handleSelectNode}
                />
                {/*
                  * Detail pane — the selected node ONLY (Phase B).
                  *
                  * Every node used to render here at once: to reach the last step you scrolled
                  * past every field of every earlier one, and nothing on screen ever said "this
                  * is what you still have to decide". One node at a time makes each step
                  * reviewable, and the rail keeps the whole workflow visible so nothing is
                  * hidden by the selection.
                  */}
                <div className={`min-w-0 space-y-3 ${PANE_SCROLL}`} data-testid="ownership-cards-pane">
                    {checkReportOpen ? (
                        <CheckReport
                            incompleteNodes={incompleteNodes}
                            onSelectNode={handleSelectNode}
                            onDismiss={() => setCheckReportOpen(false)}
                        />
                    ) : selectedGroup ? (
                        <NodeOwnershipCard
                            key={selectedGroup.nodeId}
                            group={selectedGroup}
                            ctx={ctx}
                        />
                    ) : (
                        <p className="text-xs text-muted-foreground rounded border border-dashed border-border/60 px-3 py-2">
                            No fields to review for this workflow.
                        </p>
                    )}
                </div>
            </div>

            {/*
              * Action bar — pinned to the viewport at every size, spanning its full width, so
              * Build is reachable from wherever the user is in either pane. The root's `pb-20`
              * reserves its footprint so it never covers the last card. Held to the same
              * `max-w-7xl` as the wizard's content so it lines up with the columns.
              *
              * Keep it clear of any transformed ancestor. `position: fixed` resolves against
              * the viewport only while nothing above it is transformed; a transformed ancestor
              * becomes the containing block instead. That is what the old `<Card>` wrapper did
              * on hover via `motion-safe:hover:scale-[1.02]` — the bar re-anchored to the
              * card's bottom edge and jumped into the middle of the screen.
              *
              * Phase 5: this used to read "Proceed To Credentials" and advance to the
              * configuration step. Values are entered here now, so it builds directly. The
              * gate is the repurposed completeness signal (§6a-2 item 4): fields the user
              * owns that still have no value.
              */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t px-4 py-3">
                <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
                    {/* Live status line. Names the workflow-level state so the disabled Build
                        button below is never a dead end the user has to guess at.
                        Keyed to `canBuild`, not to the plan alone: the wizard's own
                        manual-question count can still block after every node reports ready,
                        and claiming "everything has what it needs" beside a dead button is
                        worse than saying nothing. */}
                    {canBuild ? (
                        <p
                            className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
                            data-testid="ownership-ready-notice"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Every step has what it needs.
                        </p>
                    ) : (
                        <p
                            className="text-xs text-amber-600 dark:text-amber-500"
                            data-testid="ownership-outstanding-notice"
                        >
                            {!allNodesReady
                                ? incompleteNodes.length === 1
                                    ? `1 step still needs ${totalOutstanding === 1 ? 'a value' : `${totalOutstanding} values`}.`
                                    : `${incompleteNodes.length} steps still need values.`
                                : ctx.outstandingCount === 1
                                ? '1 field still needs a value.'
                                : `${ctx.outstandingCount} fields still need a value.`}
                        </p>
                    )}

                    {/* Check — the explicit "did I miss anything?" action. It reports; it does
                        not run anything. Per-node test runs are a separate, optional signal. */}
                    <Button
                        type="button"
                        variant="outline"
                        className="ml-auto gap-2"
                        data-testid="ownership-check-button"
                        onClick={() => setCheckReportOpen((open) => !open)}
                    >
                        <ListChecks className="h-4 w-4" />
                        {checkReportOpen ? 'Hide check' : 'Check all steps'}
                    </Button>

                    <Button
                        type="button"
                        disabled={!canBuild}
                        aria-disabled={!canBuild}
                        title={
                            canBuild
                                ? undefined
                                : incompleteNodes.length > 0
                                ? `Not ready: ${incompleteNodes
                                      .map((n) => n.nodeLabel)
                                      .join(', ')} still need required values.`
                                : 'Some fields you own still need a value.'
                        }
                        onClick={ctx.proceedFromOwnershipStage}
                    >
                        Build Workflow
                    </Button>
                </div>
            </div>
        </div>
    );
}
