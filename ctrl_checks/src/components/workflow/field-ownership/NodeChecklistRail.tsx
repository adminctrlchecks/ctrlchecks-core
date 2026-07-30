import {
    buildRailEntries,
    resolveWorkflowPreviewText,
    type RailNodeStatus,
} from '@/lib/wizard-field-ownership';
import { findPlaneRow } from '@/lib/wizard-field-plane';
import { PANE_SCROLL } from './pane-scroll';
import type { FieldOwnershipContext, OwnershipQuestion } from './types';

/**
 * Left rail: every node in the step, in execution order, with a status — and the selector
 * for the detail pane beside it.
 *
 * Exactly one entry per node (Phase A). It used to flat-map a structural and a secrets
 * section, so a node with both kinds of field appeared twice and the count read "11 of 13"
 * for seven nodes (RC-1).
 *
 * Status derivation lives in `lib/wizard-field-ownership.ts` (CLAUDE.md: wizard logic
 * belongs in `lib/wizard-*.ts`, not inline in components).
 */

const STATUS_COPY: Record<RailNodeStatus, string> = {
    waiting: 'Not started',
    'needs-input': 'Needs input',
    ready: 'Ready',
};

const STATUS_DOT: Record<RailNodeStatus, string> = {
    waiting: 'bg-muted-foreground/40',
    'needs-input': 'bg-amber-400',
    ready: 'bg-emerald-400',
};

export interface NodeChecklistRailProps {
    ctx: FieldOwnershipContext;
    selectedNodeId: string | null;
    onSelectNode: (nodeId: string) => void;
}

export function NodeChecklistRail({ ctx, selectedNodeId, onSelectNode }: NodeChecklistRailProps) {
    const entries = buildRailEntries({
        groups: ctx.nodesInOrder,
        outstandingByNodeId: ctx.outstandingByNodeId,
        fieldEnabledOverrides: ctx.fieldEnabledOverrides,
        effectiveModesByKey: ctx.ownershipEffectiveModes.byModeKey,
        fillModeValues: ctx.fillModeValues,
        isCredentialUnlocked: ctx.isCredentialUnlocked,
        resolveRowValue: (question: OwnershipQuestion) => {
            const planeRow = findPlaneRow(
                ctx.fieldPlaneRows,
                String(question.nodeId || ''),
                String(question.fieldName || '')
            );
            return resolveWorkflowPreviewText(planeRow?.valueSnapshot, question);
        },
    });

    const readyCount = entries.filter((e) => e.status === 'ready').length;

    if (entries.length === 0) return null;

    return (
        // Phase E: was `lg:sticky lg:top-6 lg:self-start`, which only works while the page
        // itself scrolls. The rail is its own scrollport now, so it stays put by construction
        // and can scroll its own list when there are more nodes than fit. Its width comes
        // from the parent grid's track, matching node selection — no `w-[340px]` here, or the
        // two would drift apart the next time either is adjusted.
        <aside aria-label="Workflow steps" className={PANE_SCROLL}>
            <div className="rounded border border-border/60 bg-muted/5 p-3 space-y-3">
                <div>
                    <p className="text-sm font-semibold text-foreground">Steps</p>
                    <p className="text-xs text-muted-foreground">
                        {readyCount} of {entries.length} ready
                    </p>
                </div>
                {/*
                  * Selecting, not scrolling (Phase B). The rail used to `scrollIntoView` a
                  * card in a list of every node; now it swaps which single node the detail
                  * pane shows, so the user reviews one step at a time. Navigation is free —
                  * any node, any order — because forcing the sequence blocks someone who only
                  * wants to fix step 6.
                  */}
                <ol className="space-y-1" role="list">
                    {entries.map((entry, idx) => {
                        const selected = entry.nodeId === selectedNodeId;
                        return (
                            <li key={entry.key}>
                                <button
                                    type="button"
                                    aria-current={selected ? 'step' : undefined}
                                    onClick={() => onSelectNode(entry.nodeId)}
                                    className={[
                                        'w-full flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors',
                                        selected
                                            ? 'bg-primary/10 ring-1 ring-primary/40'
                                            : 'hover:bg-muted/30',
                                    ].join(' ')}
                                >
                                    <span className="text-[11px] font-mono text-muted-foreground/60 w-4 shrink-0">
                                        {idx + 1}
                                    </span>
                                    <span
                                        aria-hidden
                                        className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[entry.status]}`}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className={`block text-xs truncate ${selected ? 'font-semibold' : 'font-medium'}`}
                                        >
                                            {entry.nodeLabel}
                                        </span>
                                        <span className="block text-[10px] text-muted-foreground">
                                            {STATUS_COPY[entry.status]}
                                            {entry.outstanding > 0
                                                ? ` · ${entry.outstanding} to fill`
                                                : ''}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </aside>
    );
}
