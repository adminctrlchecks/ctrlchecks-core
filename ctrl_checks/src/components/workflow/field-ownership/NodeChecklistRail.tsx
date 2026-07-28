import {
    buildRailEntries,
    resolveWorkflowPreviewText,
    type RailNodeStatus,
} from '@/lib/wizard-field-ownership';
import { findPlaneRow } from '@/lib/wizard-field-plane';
import type { FieldOwnershipContext, OwnershipQuestion } from './types';

/**
 * Sticky left rail: every node in the step, in order, with a status.
 *
 * Per plan §6a/G9 this deliberately shows **node name + status only**. Per-group counts
 * arrive in Phase 3, when the grouping actually exists — building counts now would mean
 * building them twice.
 *
 * Status derivation lives in `lib/wizard-field-ownership.ts` (CLAUDE.md: wizard logic
 * belongs in `lib/wizard-*.ts`, not inline in components).
 */

const STATUS_COPY: Record<RailNodeStatus, string> = {
    waiting: 'Waiting',
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
}

export function NodeChecklistRail({ ctx }: NodeChecklistRailProps) {
    const entries = buildRailEntries({
        sections: [
            { key: 'structural', groups: ctx.structuralByNode },
            { key: 'secrets', groups: ctx.secretsByNode },
        ],
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
        <aside
            aria-label="Workflow steps"
            className="w-full lg:w-[340px] lg:shrink-0 lg:sticky lg:top-6 lg:self-start"
        >
            <div className="rounded border border-border/60 bg-muted/5 p-3 space-y-3">
                <div>
                    <p className="text-sm font-semibold text-foreground">Steps</p>
                    <p className="text-xs text-muted-foreground">
                        {readyCount} of {entries.length} ready
                    </p>
                </div>
                <ol className="space-y-1">
                    {entries.map((entry, idx) => (
                        <li key={entry.key}>
                            <button
                                type="button"
                                onClick={() => {
                                    document
                                        .getElementById(`fo-card-${entry.key}`)
                                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted/30 transition-colors"
                            >
                                <span className="text-[11px] font-mono text-muted-foreground/60 w-4 shrink-0">
                                    {idx + 1}
                                </span>
                                <span
                                    aria-hidden
                                    className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[entry.status]}`}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-medium truncate">
                                        {entry.nodeLabel}
                                    </span>
                                    <span className="block text-[10px] text-muted-foreground">
                                        {STATUS_COPY[entry.status]}
                                        {entry.outstanding > 0 ? ` · ${entry.outstanding}` : ''}
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ol>
            </div>
        </aside>
    );
}
