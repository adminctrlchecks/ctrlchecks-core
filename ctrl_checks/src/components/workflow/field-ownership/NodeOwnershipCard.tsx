import { Sparkles } from 'lucide-react';
import { FieldOwnershipRow } from './FieldOwnershipRow';
import type { FieldOwnershipContext, NodeQuestionGroup, OwnershipQuestion } from './types';

/**
 * One node's card within a field-ownership section: node header, the on-demand
 * AI node description, and a row per field.
 *
 * Extracted verbatim from AutonomousAgentWizard.tsx (Phase 0b) — no behaviour change.
 */
export interface NodeOwnershipCardProps {
    group: NodeQuestionGroup;
    /** Section this card belongs to ('structural' | 'secrets') — namespaces keys. */
    sectionKey: string;
    ctx: FieldOwnershipContext;
}

export function NodeOwnershipCard({ group, sectionKey, ctx }: NodeOwnershipCardProps) {
    const descKey = `desc_${sectionKey}_${group.nodeId}`;
    const descState = ctx.nodeDescriptions[descKey];

    return (
        // id is the scroll target for the matching NodeChecklistRail entry
        <div id={`fo-card-${sectionKey}_${group.nodeId}`} className="rounded border border-border/60 p-3 space-y-3 scroll-mt-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold">{group.nodeLabel}</p>
                    <p className="text-xs text-muted-foreground">{group.nodeType}</p>
                </div>
            </div>
            {/* On-demand AI node description */}
            <div className="space-y-2">
                <button
                    type="button"
                    disabled={descState?.loading}
                    onClick={() =>
                        ctx.fetchNodeDescription(
                            descKey,
                            group.nodeType,
                            group.nodeLabel,
                            group.nodeId
                        )
                    }
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors px-0 bg-transparent border-0 cursor-pointer"
                >
                    <Sparkles className="h-3 w-3" />
                    {descState?.loading
                        ? 'Analyzing…'
                        : descState?.open
                        ? 'Hide description'
                        : 'What does this node do?'}
                </button>
                {descState?.open && descState?.text && (
                    <div className="rounded border border-indigo-400/20 bg-indigo-500/5 px-3 py-2">
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                            {descState.text}
                        </p>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 gap-3">
                {group.fields.map((question: OwnershipQuestion, idx: number) => (
                    <FieldOwnershipRow
                        key={`${sectionKey}_${question.id || idx}`}
                        question={question}
                        group={group}
                        ctx={ctx}
                    />
                ))}
            </div>
        </div>
    );
}
