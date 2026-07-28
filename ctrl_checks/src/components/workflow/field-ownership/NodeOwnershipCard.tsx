import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
    FIELD_GROUP_ORDER,
    FIELD_GROUP_TITLES,
    defaultExpandedGroup,
    hasSinglePopulatedGroup,
    type FieldGroupKey,
    type FieldPlanProducer,
} from '@/lib/api/workflowBuildFieldPlan';
import { NodeConnectPopover } from '../NodeConnectPopover';
import { FieldGroupAccordion } from './FieldGroupAccordion';
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

    const planNode = ctx.fieldPlan?.nodes.find((n) => n.nodeId === group.nodeId);
    const nodeConnection = ctx.nodeConnections?.find((c) => c.nodeType === group.nodeType);
    const [expandedGroup, setExpandedGroup] = useState<FieldGroupKey | null>(() =>
        defaultExpandedGroup(planNode?.groups)
    );

    // Grouping only when the plan has arrived AND it actually partitions this node's
    // fields. Measured on real workflows: http_request and code drop every field into
    // one bucket, where an accordion is pure friction. Without a plan the step falls
    // back to the flat rendering it had before Phase 3.
    const grouped = Boolean(planNode) && !hasSinglePopulatedGroup(planNode?.groups);

    // Field name -> where its {{$json.x}} references come from, for the row's explanation.
    const producedByField = new Map<string, FieldPlanProducer[]>();
    for (const key of FIELD_GROUP_ORDER) {
        for (const field of planNode?.groups?.[key] ?? []) {
            if (field.producedBy?.length) producedByField.set(field.fieldName, field.producedBy);
        }
    }

    // Any question the plan did not classify still renders — never silently dropped.
    const plannedFieldNames = new Set(
        FIELD_GROUP_ORDER.flatMap((key) => (planNode?.groups?.[key] ?? []).map((f) => f.fieldName))
    );
    const ungroupedQuestions = grouped
        ? group.fields.filter((q: OwnershipQuestion) => !plannedFieldNames.has(String(q.fieldName ?? '')))
        : [];

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
            {/*
              * Connect affordance for a node whose credential the pipeline injected —
              * the user never chose it at node selection, so it was never gated there
              * (plan §2.4 "safety net, not a second step"). Same component, second
              * mount point.
              */}
            {nodeConnection && !nodeConnection.connected && nodeConnection.provider && (
                <NodeConnectPopover
                    provider={nodeConnection.provider}
                    serviceLabel={nodeConnection.providerLabel ?? group.nodeLabel}
                    credentialTypeId={nodeConnection.credentialTypeId}
                />
            )}
            {grouped ? (
                <div className="space-y-2">
                    {FIELD_GROUP_ORDER.map((groupKey) => {
                        const planFields = planNode?.groups?.[groupKey] ?? [];
                        if (planFields.length === 0) return null;
                        const names = new Set(planFields.map((f) => f.fieldName));
                        const questions = group.fields.filter((q: OwnershipQuestion) =>
                            names.has(String(q.fieldName ?? ''))
                        );
                        if (questions.length === 0) return null;
                        return (
                            <FieldGroupAccordion
                                key={groupKey}
                                title={FIELD_GROUP_TITLES[groupKey]}
                                count={questions.length}
                                expanded={expandedGroup === groupKey}
                                onToggle={() =>
                                    setExpandedGroup((current) => (current === groupKey ? null : groupKey))
                                }
                            >
                                {questions.map((question: OwnershipQuestion, idx: number) => (
                                    <FieldOwnershipRow
                                        key={`${sectionKey}_${question.id || idx}`}
                                        question={question}
                                        group={group}
                                        ctx={ctx}
                                        producedBy={producedByField.get(String(question.fieldName ?? ''))}
                                    />
                                ))}
                            </FieldGroupAccordion>
                        );
                    })}
                    {ungroupedQuestions.length > 0 && (
                        <div className="grid grid-cols-1 gap-3">
                            {ungroupedQuestions.map((question: OwnershipQuestion, idx: number) => (
                                <FieldOwnershipRow
                                    key={`${sectionKey}_ungrouped_${question.id || idx}`}
                                    question={question}
                                    group={group}
                                    ctx={ctx}
                                    producedBy={producedByField.get(String(question.fieldName ?? ''))}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {group.fields.map((question: OwnershipQuestion, idx: number) => (
                        <FieldOwnershipRow
                            key={`${sectionKey}_${question.id || idx}`}
                            question={question}
                            group={group}
                            ctx={ctx}
                            producedBy={producedByField.get(String(question.fieldName ?? ''))}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
