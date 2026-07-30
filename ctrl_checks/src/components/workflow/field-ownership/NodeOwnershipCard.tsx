import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
    FIELD_GROUP_ORDER,
    FIELD_SECTION_BLURBS,
    FIELD_SECTION_ORDER,
    FIELD_SECTION_TITLES,
    defaultExpandedSection,
    fieldsForSection,
    outstandingRequiredFields,
    type FieldPlanProducer,
    type FieldSectionKey,
} from '@/lib/api/workflowBuildFieldPlan';
import { NodeConnectPopover } from '../NodeConnectPopover';
import { FieldGroupAccordion } from './FieldGroupAccordion';
import { FieldOwnershipRow } from './FieldOwnershipRow';
import { NodeTestAction } from './NodeTestAction';
import type { FieldOwnershipContext, NodeQuestionGroup, OwnershipQuestion } from './types';

/**
 * One node's card: node header, the on-demand AI node description, and a row per field.
 *
 * Phase A removed the `sectionKey` prop. There is exactly one card per node now, so the
 * node id alone namespaces the description key, the scroll target, and the row keys —
 * previously each of those was prefixed with the section, which is what let the same node
 * mount twice under two different key spaces (RC-1).
 */
export interface NodeOwnershipCardProps {
    group: NodeQuestionGroup;
    ctx: FieldOwnershipContext;
}

export function NodeOwnershipCard({ group, ctx }: NodeOwnershipCardProps) {
    const descKey = `desc_${group.nodeId}`;
    const descState = ctx.nodeDescriptions[descKey];

    const planNode = ctx.fieldPlan?.nodes.find((n) => n.nodeId === group.nodeId);
    const nodeConnection = ctx.nodeConnections?.find((c) => c.nodeType === group.nodeType);
    // Opens on whatever needs the user first: fields they must provide, else the AI's work
    // to review.
    const [expandedSection, setExpandedSection] = useState<FieldSectionKey | null>(() =>
        defaultExpandedSection(planNode)
    );

    /*
     * Sectioned as soon as a plan exists — the three sections are the step's structure, not
     * a decoration applied when there happen to be enough fields to justify it.
     *
     * This used to also require `!hasSinglePopulatedGroup(...)`, suppressing the headings for
     * any node whose fields all landed in one bucket. The intent was to spare `http_request`
     * and `code` a pointless accordion, but the effect was that most nodes rendered as a flat
     * list while a few showed sections, so the layout changed shape as the user moved between
     * steps and there was no consistent place to look for "what must I provide".
     *
     * Without a usable plan the step falls back to flat rows rather than inventing sections
     * it cannot fill. A node whose TYPE could not be resolved counts as "no usable plan":
     * showing three confidently-empty headings above the error would contradict it.
     *
     * Keyed to `unresolvedNodeType`, not to `diagnostics.length`. Diagnostics also carry
     * informational notes from the policy resolver, and gating on their presence stripped the
     * sections from healthy nodes: a Form Trigger reporting `generated_runtime_contract` — a
     * note meaning "no explicit operation contract was declared, so one was derived" — was
     * rendered as a failure despite having resolved perfectly.
     */
    const unresolved = Boolean(planNode?.unresolvedNodeType);
    const grouped = Boolean(planNode) && !unresolved;

    // Field name -> where its {{$json.x}} references come from, for the row's explanation.
    const producedByField = new Map<string, FieldPlanProducer[]>();
    for (const key of FIELD_GROUP_ORDER) {
        for (const field of planNode?.groups?.[key] ?? []) {
            if (field.producedBy?.length) producedByField.set(field.fieldName, field.producedBy);
        }
    }

    /*
     * A question the plan did not classify is a field that is **not active for this node's
     * chosen operation** — `resolveFieldPolicyForNode` only returns `activeFields`. Gmail's
     * `subject` matters for `send` and not for `addLabel`, so the set moves when the operation
     * does.
     *
     * These are collapsed away rather than deleted. Hiding them outright is the clearer
     * screen, but the plan can also be briefly stale (it refetches on a debounce) and a field
     * silently vanishing is the one failure mode that would be impossible to diagnose from the
     * UI. Collapsed keeps the disclosure honest and keeps the safety net.
     */
    const plannedFieldNames = new Set(
        FIELD_GROUP_ORDER.flatMap((key) => (planNode?.groups?.[key] ?? []).map((f) => f.fieldName))
    );
    const inactiveQuestions = grouped
        ? group.fields.filter((q: OwnershipQuestion) => !plannedFieldNames.has(String(q.fieldName ?? '')))
        : [];

    // Required by the chosen operation and still empty — what stops this step being Ready.
    const missingRequired = outstandingRequiredFields(planNode);

    return (
        // id is the scroll target for the matching NodeChecklistRail entry
        <div id={`fo-card-${group.nodeId}`} className="rounded border border-border/60 p-3 space-y-3 scroll-mt-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    {/* The step's name, stated plainly — with only one node on screen at a
                        time, this is the user's sole marker of where they are. */}
                    <p className="text-base font-semibold">{group.nodeLabel}</p>
                    <p className="text-xs text-muted-foreground">
                        {group.nodeType}
                        {planNode?.operation ? ` · ${planNode.operation}` : ''}
                    </p>
                </div>
                {/* Test action: one button, right-aligned in the card header (§4.3) */}
                {ctx.onRunNode && (
                    <NodeTestAction
                        nodeType={group.nodeType}
                        running={ctx.runningNodeId === group.nodeId}
                        result={ctx.runResults?.[group.nodeId]}
                        onRun={(consented) => ctx.onRunNode?.(group.nodeId, consented)}
                    />
                )}
            </div>
            {/*
              * The plan could not describe this node, so nothing below it can be trusted.
              *
              * Say so. Previously this rendered as three empty sections with every field
              * swept into a leftover bucket — a card that looked merely mis-grouped while the
              * endpoint had, all along, returned a diagnostic naming the exact cause. The
              * diagnostic was in the response and nothing displayed it.
              */}
            {unresolved && (
                <div
                    className="rounded border border-red-500/40 bg-red-50 px-3 py-2 dark:bg-red-950/20"
                    data-testid="node-plan-diagnostic"
                >
                    <p className="text-[11px] font-medium text-red-700 dark:text-red-300">
                        This step could not be analysed
                    </p>
                    <p className="text-[11px] text-red-700/80 dark:text-red-300/80">
                        Unknown node type “{planNode?.unresolvedNodeType}” — not in the registry.
                    </p>
                    <p className="pt-1 text-[11px] text-muted-foreground">
                        Its fields are listed below, but which ones are required could not be
                        worked out.
                    </p>
                </div>
            )}
            {/* What this step still needs, before the user reads a single row. Driven by the
                operation the node is actually set to, so it changes when that changes. */}
            {planNode && !unresolved && (
                missingRequired.length > 0 ? (
                    <p
                        className="rounded border border-amber-500/40 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                        data-testid="node-missing-required"
                    >
                        Still needed for “{planNode.operation || group.nodeType}”:{' '}
                        <span className="font-medium">
                            {missingRequired.map((f) => f.label || f.fieldName).join(', ')}
                        </span>
                    </p>
                ) : (
                    <p
                        className="rounded border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                        data-testid="node-ready-notice"
                    >
                        This step has everything it needs. Review the AI-filled values below and
                        change any that are wrong.
                    </p>
                )
            )}
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
                    {/*
                      * Three sections, always all three, in a fixed order: AI built →
                      * you provide → optional. Always present even when empty, so the
                      * shape of a node card is the same on every step and the user learns
                      * one layout rather than re-reading each node's structure.
                      */}
                    {FIELD_SECTION_ORDER.map((sectionKey) => {
                        const names = new Set(
                            fieldsForSection(planNode, sectionKey).map((f) => f.fieldName)
                        );
                        const questions = group.fields.filter((q: OwnershipQuestion) =>
                            names.has(String(q.fieldName ?? ''))
                        );
                        /*
                         * Fields the current operation does not use join Optional — they are
                         * exactly that: available, not needed. They used to get a fourth
                         * section of their own, which made the card's shape depend on the
                         * operation and, whenever the plan came back empty, became the bucket
                         * that quietly swallowed every field on the node.
                         */
                        const rows =
                            sectionKey === 'optional'
                                ? [...questions, ...inactiveQuestions]
                                : questions;

                        return (
                            <FieldGroupAccordion
                                key={sectionKey}
                                title={FIELD_SECTION_TITLES[sectionKey]}
                                count={rows.length}
                                expanded={expandedSection === sectionKey}
                                onToggle={() =>
                                    setExpandedSection((current) =>
                                        current === sectionKey ? null : sectionKey
                                    )
                                }
                            >
                                <p className="pb-2 text-[11px] text-muted-foreground">
                                    {FIELD_SECTION_BLURBS[sectionKey]}
                                </p>
                                {rows.length === 0 ? (
                                    <p className="pb-1 text-[11px] text-muted-foreground/70 italic">
                                        Nothing in this group for this step.
                                    </p>
                                ) : (
                                    rows.map((question: OwnershipQuestion, idx: number) => (
                                        <FieldOwnershipRow
                                            key={String(question.id || idx)}
                                            question={question}
                                            group={group}
                                            ctx={ctx}
                                            producedBy={producedByField.get(
                                                String(question.fieldName ?? '')
                                            )}
                                        />
                                    ))
                                )}
                            </FieldGroupAccordion>
                        );
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {group.fields.map((question: OwnershipQuestion, idx: number) => (
                        <FieldOwnershipRow
                            key={String(question.id || idx)}
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
