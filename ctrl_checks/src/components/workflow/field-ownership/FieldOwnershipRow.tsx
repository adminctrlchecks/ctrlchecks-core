import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sparkles } from 'lucide-react';
import { prepareActionableFieldExample } from '@/lib/actionable-field-example';
import { resolveWizardFieldFillMode } from '@/lib/fillMode';
import { explainWizardOwnershipRow, findPlaneRow } from '@/lib/wizard-field-plane';
import {
    buildFieldOwnershipCopy,
    isOwnershipRowEnabled,
    isOwnershipRowLocked,
    resolveAppliedExampleKey,
    resolveFieldEnabledKey,
    resolveFieldHelpKey,
    resolveFieldModeKey,
    resolveFieldUnlockKey,
    resolveOwnerLabel,
    resolveWorkflowPreviewText,
    type FieldDesc,
} from '@/lib/wizard-field-ownership';
import type { FieldPlanProducer } from '@/lib/api/workflowBuildFieldPlan';
import { FieldOwnershipHelpPanel } from '../FieldOwnershipHelpPanel';
import { CredentialHelpDisclosure } from './CredentialHelpDisclosure';
import { FieldValueControl } from './FieldValueControl';
import type { FieldOwnershipContext, NodeQuestionGroup, OwnershipQuestion } from './types';

/**
 * One field's ownership row: label + badges, on/off toggle, ownership help panel,
 * and the value/credential controls shown when the row is on.
 *
 * Extracted verbatim from AutonomousAgentWizard.tsx (Phase 0b) — no behaviour change.
 */
export interface FieldOwnershipRowProps {
    question: OwnershipQuestion;
    group: NodeQuestionGroup;
    ctx: FieldOwnershipContext;
    /** Upstream nodes supplying this field's `{{$json.x}}` references, from the field plan. */
    producedBy?: FieldPlanProducer[];
}

export function FieldOwnershipRow({ question, group, ctx, producedBy }: FieldOwnershipRowProps) {
    const modeKey = resolveFieldModeKey(question);
    const selectedMode =
        ctx.ownershipEffectiveModes.byModeKey[modeKey] ||
        resolveWizardFieldFillMode(
            ctx.fillModeValues[modeKey],
            question.fillModeDefault as
                | 'manual_static'
                | 'runtime_ai'
                | 'buildtime_ai_once'
                | undefined
        );
    const locked = isOwnershipRowLocked(question, ctx.isCredentialUnlocked);
    const showBuildButton = question.supportsBuildtimeAI !== false;
    const showRuntimeButton = question.supportsRuntimeAI !== false;
    // -- Per-field on/off toggle --
    const fieldEnabledKey = resolveFieldEnabledKey(question);
    const fieldEnabled = isOwnershipRowEnabled(question, ctx.fieldEnabledOverrides);
    const rowExplanation = explainWizardOwnershipRow(question, { locked, aiDisabled: false });
    const unlockKey = resolveFieldUnlockKey(question);
    const primaryLabel = question.text || question.label || question.fieldName;
    const nodeFieldDescState = ctx.fieldDescriptions[String(question.nodeId || '')];
    const aiFieldDesc: FieldDesc | null =
        nodeFieldDescState?.data?.[String(question.fieldName || '')] ?? null;
    const fieldHelpKey = resolveFieldHelpKey(question);
    const fieldHelpOpen = !!ctx.fieldHelpExpanded[fieldHelpKey];
    const fieldOwnershipCopy = buildFieldOwnershipCopy(question, aiFieldDesc, {
        selectedMode,
        fieldEnabled,
        locked,
    });
    const preparedOwnershipExample = prepareActionableFieldExample(
        question,
        aiFieldDesc?.actionableExample || null
    );
    const appliedKey = resolveAppliedExampleKey(question);
    const exampleApplied = ctx.appliedExampleKeys[appliedKey] === true;

    const applyOwnershipExample = () => {
        if (!preparedOwnershipExample?.canApply) return;
        const questionKey = String(question.id || '');
        if (!questionKey) return;
        if (question.category === 'credential' && question.isVaultCredential) {
            ctx.setCredentialValues((prev) => ({
                ...prev,
                [questionKey]: preparedOwnershipExample.valueForInput,
            }));
        } else {
            ctx.setInputValues((prev) => ({
                ...prev,
                [questionKey]: preparedOwnershipExample.valueForInput,
            }));
        }
        ctx.setFillModeValues((prev) => ({
            ...prev,
            [modeKey]: 'buildtime_ai_once',
        }));
        ctx.setFieldEnabledOverrides((prev) => ({
            ...prev,
            [fieldEnabledKey]: true,
        }));
        ctx.setAppliedExampleKeys((prev) => ({
            ...prev,
            [appliedKey]: true,
        }));
        ctx.setAppliedFieldGuidanceExamples((prev) => ({
            ...prev,
            [appliedKey]: {
                nodeId: String(question.nodeId || ''),
                fieldName: String(question.fieldName || ''),
                mode: 'buildtime_ai_once',
                source: preparedOwnershipExample.source || 'ai_field_guidance',
            },
        }));
    };

    const ownershipFooterText =
        rowExplanation ||
        (String(question.ownershipClass || '') !== 'structural'
            ? 'Select ownership for this field'
            : null);
    const planeRowForPreview = findPlaneRow(
        ctx.fieldPlaneRows,
        String(question.nodeId || ''),
        String(question.fieldName || '')
    );
    const workflowPreviewText = resolveWorkflowPreviewText(
        planeRowForPreview?.valueSnapshot,
        question
    );
    /** "You provide" — the user owns this value, so it is directly editable. */
    const isUserOwned = selectedMode === 'manual_static';

    return (
        <div
            className="rounded border border-border/40 overflow-hidden"
            onClick={() =>
                ctx.setGuideSelectedField({
                    nodeId: String(question.nodeId || ''),
                    fieldName: String(question.fieldName || ''),
                })
            }
        >
            {/* -- Header row: label + on/off toggle -- */}
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/10">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{primaryLabel}</p>
                        {question.aiFilledAtBuildTime ? (
                            <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-200" title="Filled by AI when the workflow was generated">
                                <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                                AI prefilled
                            </span>
                        ) : null}
                        {question.aiUsesRuntime && !question.aiFilledAtBuildTime ? (
                            <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200" title="AI fills this at runtime">
                                <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                                AI at runtime
                            </span>
                        ) : null}
                        {question.aiBuildTimePending && !question.aiFilledAtBuildTime ? (
                            <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-200">
                                <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                                AI build ? empty
                            </span>
                        ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/80">{group.nodeLabel}</span>
                        <span className="mx-1 opacity-40">?</span>
                        <span className="font-mono text-[11px] opacity-75">{question.fieldName}</span>
                    </p>
                    {/*
                      * Cross-node explanation (Phase 3). Measured on real generated
                      * workflows: ~83% of {{$json.*}} references resolve to exactly one
                      * producing node. Where a reference cannot be attributed, the plan
                      * omits it and nothing is rendered — a wrong origin is worse than none.
                      */}
                    {producedBy && producedBy.length > 0 && (
                        <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                            uses{' '}
                            {producedBy.map((p, i) => (
                                <span key={`${p.nodeId}_${p.fieldName}`}>
                                    {i > 0 && ', '}
                                    <span className="font-mono opacity-80">{p.fieldName}</span> from{' '}
                                    <span className="font-medium text-foreground/70">{p.nodeLabel}</span>
                                </span>
                            ))}
                        </p>
                    )}
                    <button
                        type="button"
                        disabled={nodeFieldDescState?.loading}
                        onClick={(event) => {
                            event.stopPropagation();
                            const willOpen = !fieldHelpOpen;
                            ctx.setFieldHelpExpanded((prev) => ({
                                ...prev,
                                [fieldHelpKey]: willOpen,
                            }));
                            const nodeId = String(group.nodeId || '');
                            const fieldName = String(question.fieldName || '').trim();
                            const requestKey = `${nodeId}:${fieldName}`;
                            if (
                                willOpen &&
                                nodeId &&
                                fieldName &&
                                !nodeFieldDescState?.data?.[String(question.fieldName || '')] &&
                                !nodeFieldDescState?.loading &&
                                !ctx.fieldDescFetchedRef.current.has(requestKey)
                            ) {
                                ctx.fieldDescFetchedRef.current.add(requestKey);
                                ctx.fetchFieldDescriptions(
                                    nodeId,
                                    String(group.nodeType || ''),
                                    String(group.nodeLabel || ''),
                                    [{
                                        ...question,
                                        selectedMode,
                                        fieldEnabled,
                                        currentValue: question.defaultValue || null,
                                    }],
                                    requestKey
                                );
                            }
                        }}
                        className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors px-0 bg-transparent border-0 cursor-pointer"
                    >
                        <Sparkles className="h-3 w-3" />
                        {nodeFieldDescState?.loading
                            ? 'Analyzing this field...'
                            : fieldHelpOpen
                              ? 'Hide input field help'
                              : 'What does this input field do?'}
                    </button>
                </div>
                <Switch
                    checked={fieldEnabled}
                    onCheckedChange={(v) =>
                        ctx.setFieldEnabledOverrides((prev) => ({
                            ...prev,
                            [fieldEnabledKey]: v,
                        }))
                    }
                    aria-label={`Enable ${primaryLabel}`}
                />
            </div>

            {/* -- OFF: collapsed preview -- */}
            {!fieldEnabled && !fieldHelpOpen && (
                <div className="px-3 py-2 border-t border-border/20 space-y-1">
                    <p className="text-[11px] text-muted-foreground/55 italic leading-snug">
                        {fieldOwnershipCopy.offBehavior}
                    </p>
                    {workflowPreviewText ? (
                        <p className="text-[10px] text-muted-foreground/40 font-mono truncate">Current value: {workflowPreviewText.slice(0, 100)}</p>
                    ) : null}
                </div>
            )}

            {/* -- ON: compact ownership hint when help panel is closed -- */}
            {fieldEnabled && !fieldHelpOpen && !locked && (
                <div className="px-3 py-1.5 border-t border-border/20 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                        Owner:{' '}
                        <span className="font-medium text-foreground/80">
                            {resolveOwnerLabel(selectedMode)}
                        </span>
                    </p>
                    <button
                        type="button"
                        className="text-[10px] text-muted-foreground/70 hover:text-foreground/90 underline"
                        onClick={() =>
                            ctx.setFieldHelpExpanded((prev) => ({
                                ...prev,
                                [fieldHelpKey]: true,
                            }))
                        }
                    >
                        Change ownership
                    </button>
                </div>
            )}

            <FieldOwnershipHelpPanel
                fieldHelpOpen={fieldHelpOpen}
                isLoading={!!nodeFieldDescState?.loading}
                hasAiData={!!aiFieldDesc}
                fieldEnabled={fieldEnabled}
                locked={locked}
                selectedMode={selectedMode}
                showBuildButton={showBuildButton}
                showRuntimeButton={showRuntimeButton}
                ownershipFooterText={ownershipFooterText}
                fieldOwnershipCopy={fieldOwnershipCopy}
                actionableExample={preparedOwnershipExample}
                exampleApplied={exampleApplied}
                onModeChange={(mode) =>
                    ctx.setFillModeValues((prev) => ({
                        ...prev,
                        [modeKey]: mode,
                    }))
                }
                onApplyExample={applyOwnershipExample}
            />

            {/* -- ON: full controls -- */}
            {fieldEnabled && (
            <div className="px-3 pb-3 pt-2 border-t border-border/20 space-y-2">
            {question.isUnlockableCredential &&
            question.ownershipUiMode === 'locked' ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 px-2 py-1.5">
                    <Label
                        htmlFor={unlockKey}
                        className="text-xs font-medium text-muted-foreground cursor-pointer"
                    >
                        Unlock ownership (User vs AI)
                    </Label>
                    <Switch
                        id={unlockKey}
                        checked={ctx.isCredentialUnlocked(question)}
                        onCheckedChange={(v) =>
                            ctx.setCredentialUnlockOverrides((prev) => ({
                                ...prev,
                                [unlockKey]: v,
                            }))
                        }
                    />
                </div>
            ) : null}
            {locked && question.aiFilledAtBuildTime ? (
                <div className="mt-2 rounded border border-muted p-2 space-y-1">
                    <p className="text-[11px] text-muted-foreground">Value was set at generation; this row stays locked for this field type.</p>
                    {workflowPreviewText ? (
                        <pre className="text-[11px] whitespace-pre-wrap break-words max-h-28 overflow-auto font-mono text-left text-foreground/90">{workflowPreviewText}</pre>
                    ) : null}
                </div>
            ) : null}
            {/*
              * Inline editing (Phase 4).
              *
              * Fields the user owns are editable right here. AI-owned fields show their
              * value read-only with an Edit action that flips `_fillMode` to
              * manual_static — which moves the row into "You provide" through the
              * existing ownershipEffectiveModes memo, no new state.
              *
              * This replaces the old copy pointing at the Configuration step, which
              * Phase 5 deletes.
              */}
            {!locked && isUserOwned ? (
                <div className="mt-2 space-y-1">
                    <FieldValueControl question={question} ctx={ctx} />
                </div>
            ) : null}

            {!locked && !isUserOwned ? (
                <div className="mt-2 rounded border border-emerald-500/25 bg-emerald-500/5 p-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground">
                            {selectedMode === 'runtime_ai'
                                ? 'AI generates this on every run.'
                                : 'AI filled this when the workflow was generated.'}
                        </p>
                        <button
                            type="button"
                            className="text-[10px] text-primary underline underline-offset-2 hover:text-primary/90"
                            onClick={(event) => {
                                event.stopPropagation();
                                ctx.setFillModeValues((prev) => ({
                                    ...prev,
                                    [modeKey]: 'manual_static',
                                }));
                                ctx.setFieldEnabledOverrides((prev) => ({
                                    ...prev,
                                    [fieldEnabledKey]: true,
                                }));
                            }}
                        >
                            Set it myself
                        </button>
                    </div>
                    {workflowPreviewText ? (
                        <pre className="text-[11px] whitespace-pre-wrap break-words max-h-40 overflow-auto font-mono text-left">{workflowPreviewText}</pre>
                    ) : (
                        <p className="text-[11px] text-muted-foreground/70 italic">
                            No value to preview yet.
                        </p>
                    )}
                </div>
            ) : null}
            {(question.ownershipClass === 'credential' || question.isVaultCredential) && (
                <CredentialHelpDisclosure question={question} ctx={ctx} />
            )}
            </div>
            )}
        </div>
    );
}
