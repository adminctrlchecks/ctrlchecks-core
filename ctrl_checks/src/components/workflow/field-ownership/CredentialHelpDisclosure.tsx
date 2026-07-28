import type { FieldOwnershipContext, OwnershipQuestion } from './types';

/**
 * "Why do I need this? How do I get it?" disclosure on credential rows.
 * Extracted verbatim from AutonomousAgentWizard.tsx (Phase 0b) — no behaviour change.
 */
export interface CredentialHelpDisclosureProps {
    question: OwnershipQuestion;
    ctx: FieldOwnershipContext;
}

export function CredentialHelpDisclosure({ question, ctx }: CredentialHelpDisclosureProps) {
    const helpKey = `credhelp_${question.nodeId}_${question.fieldName}`;
    const isExpanded = !!ctx.credHelpExpanded[helpKey];
    const viewMode = ctx.credHelpViewMode[helpKey] ?? 'simple';
    const nodeLabel = String(question.nodeLabel || question.nodeType || 'this node');
    // Look up AI-generated guidance from discoveredCredentials (matched by nodeId + vaultKey)
    const discoveredCreds: any[] = ctx.pendingWorkflowData?.discoveredCredentials || [];
    const matchedCred = discoveredCreds.find((c: any) =>
        (question.credential?.vaultKey && c.vaultKey === question.credential.vaultKey) ||
        (Array.isArray(c.nodeIds) && c.nodeIds.includes(question.nodeId))
    );
    const simpleText = matchedCred?.simpleDescription || `This credential authorizes ${nodeLabel} to act on your behalf. Find it in the service's settings, API, or developer console.`;
    const technicalText = matchedCred?.technicalDescription || `Credential for ${nodeLabel}. Injected at execution time from the secure vault. Not logged. Reference as {{$credentials.<fieldName>}} in custom expressions if needed.`;
    const howToObtain = matchedCred?.howToObtain || '';

    return (
        <div className="mt-2 border border-border/40 rounded-md overflow-hidden">
            <button
                type="button"
                className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/30 transition-colors text-left"
                onClick={() => ctx.setCredHelpExpanded(prev => ({ ...prev, [helpKey]: !isExpanded }))}
            >
                <span>Why do I need this? How do I get it?</span>
                <span className="ml-2 opacity-60">{isExpanded ? '?' : '?'}</span>
            </button>
            {isExpanded && (
                <div className="px-2 pb-2 pt-1 bg-muted/10 space-y-2">
                    <div className="flex gap-1">
                        <button
                            type="button"
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${viewMode === 'simple' ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 text-muted-foreground hover:bg-muted/30'}`}
                            onClick={() => ctx.setCredHelpViewMode(prev => ({ ...prev, [helpKey]: 'simple' }))}
                        >
                            Simple
                        </button>
                        <button
                            type="button"
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${viewMode === 'technical' ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 text-muted-foreground hover:bg-muted/30'}`}
                            onClick={() => ctx.setCredHelpViewMode(prev => ({ ...prev, [helpKey]: 'technical' }))}
                        >
                            Technical
                        </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {viewMode === 'simple' ? simpleText : technicalText}
                    </p>
                    {howToObtain && (
                        <div className="mt-1 pt-1 border-t border-border/30">
                            <p className="text-[10px] font-medium text-muted-foreground mb-0.5">How to get it:</p>
                            <p className="text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed">{howToObtain}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
