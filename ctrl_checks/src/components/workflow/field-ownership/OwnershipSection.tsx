import { NodeOwnershipCard } from './NodeOwnershipCard';
import type { FieldOwnershipContext, NodeQuestionGroup } from './types';

/**
 * One of the two field-ownership sections ("Workflow structure" / "Secrets & fill mode"):
 * heading, description, and a card per node — or an empty-state line.
 *
 * Extracted verbatim from AutonomousAgentWizard.tsx (Phase 0b) — no behaviour change.
 */
export interface OwnershipSectionProps {
    sectionKey: string;
    title: string;
    description: string;
    groups: NodeQuestionGroup[];
    ctx: FieldOwnershipContext;
}

export function OwnershipSection({
    sectionKey,
    title,
    description,
    groups,
    ctx,
}: OwnershipSectionProps) {
    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            {groups.length === 0 ? (
                <p className="text-xs text-muted-foreground rounded border border-dashed border-border/60 px-3 py-2">
                    No fields in this category for this workflow.
                </p>
            ) : (
                groups.map((group) => (
                    <NodeOwnershipCard
                        key={`${sectionKey}_${group.nodeId}`}
                        group={group}
                        sectionKey={sectionKey}
                        ctx={ctx}
                    />
                ))
            )}
        </div>
    );
}
