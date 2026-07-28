import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { BlueprintPanel } from './BlueprintPanel';
import { NodeChecklistRail } from './NodeChecklistRail';
import { OwnershipSection } from './OwnershipSection';
import type { FieldOwnershipContext } from './types';

/**
 * The wizard's field-ownership step.
 *
 * Presentational: everything it needs arrives on `ctx`. It owns no state of its own,
 * which is what makes it renderable in a test without mounting the whole wizard.
 *
 * Extracted from AutonomousAgentWizard.tsx (Phase 0b) — no behaviour change.
 */
export interface FieldOwnershipStageProps {
    ctx: FieldOwnershipContext;
}

export function FieldOwnershipStage({ ctx }: FieldOwnershipStageProps) {
    const sections = [
        {
            key: 'structural',
            title: 'Workflow structure',
            description:
                'Forms, conditions, and branching. Choose You for static values, AI (build) for one-time generation at build, or AI (runtime) when the field supports it.',
            groups: ctx.structuralByNode,
        },
        {
            key: 'secrets',
            title: 'Secrets & fill mode',
            description:
                'API keys, webhooks, and other values: You, AI (build), or AI (runtime) where supported. Vault and OAuth are completed on Credentials.',
            groups: ctx.secretsByNode,
        },
    ] as const;

    return (
        <div className="scroll-mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={ctx.sectionStyles.cardClass}>
                    <CardHeader>
                        <CardTitle className={ctx.sectionStyles.titleClass}>
                            <AlertCircle className="h-5 w-5" /> Field Ownership Required
                        </CardTitle>
                        <CardDescription>
                            Two areas: workflow structure (forms, logic), then secrets and fill mode. Locked rows use OAuth, vault, or AI-filled values?finish accounts on the Credentials step.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <BlueprintPanel pendingWorkflowData={ctx.pendingWorkflowData} />
                        {/* Walk Me Through All Fields — single button for the entire ownership stage */}
                        <div className="flex items-center gap-3 py-1" data-testid="walkthrough-bar">
                            <button
                                type="button"
                                onClick={() =>
                                    ctx.startGlobalWalkThrough(ctx.structuralByNode, ctx.secretsByNode)
                                }
                                className="flex items-center gap-1.5 text-[12px] text-violet-400 hover:text-violet-300 transition-colors px-0 bg-transparent border-0 cursor-pointer font-medium"
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
                                        className="h-full rounded-full bg-violet-500/60 transition-all duration-500"
                                        style={{ width: `${Math.round(((ctx.globalWalkActive.currentFieldIdx + 1) / ctx.globalWalkActive.totalFields) * 100)}%` }}
                                    />
                                </div>
                            )}
                        </div>
                        {/*
                          * Two-column working surface (§4.3): sticky rail of steps on the left,
                          * the node cards taking the remaining width. Collapses to one column
                          * below `lg`, matching how node-selection already behaves.
                          */}
                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                            <NodeChecklistRail ctx={ctx} />
                            <div className="w-full lg:flex-1 min-w-0 space-y-8">
                                {sections.map((section) => (
                                    <OwnershipSection
                                        key={section.key}
                                        sectionKey={section.key}
                                        title={section.title}
                                        description={section.description}
                                        groups={section.groups}
                                        ctx={ctx}
                                    />
                                ))}
                                {/*
                                  * Phase 5: this used to read "Proceed To Credentials" and
                                  * advance to the configuration step. Values are entered
                                  * here now, so it builds directly. The gate is the
                                  * repurposed completeness signal (§6a-2 item 4): fields the
                                  * user owns that still have no value.
                                  */}
                                {ctx.outstandingCount > 0 && (
                                    <p
                                        className="text-xs text-amber-500"
                                        data-testid="ownership-outstanding-notice"
                                    >
                                        {ctx.outstandingCount === 1
                                            ? '1 field still needs a value.'
                                            : `${ctx.outstandingCount} fields still need a value.`}
                                    </p>
                                )}
                                <Button
                                    type="button"
                                    className="w-full"
                                    disabled={ctx.outstandingCount > 0}
                                    onClick={ctx.proceedFromOwnershipStage}
                                >
                                    Build Workflow
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
