import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { BlueprintPanel } from './BlueprintPanel';
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
                        <div className="flex items-center gap-3 py-1">
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
                        <div className="space-y-8">
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
                        </div>
                        <Button type="button" className="w-full" onClick={ctx.proceedFromOwnershipStage}>
                            Proceed To Credentials
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
