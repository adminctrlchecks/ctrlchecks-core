/**
 * Workflow blueprint summary shown at the top of the field-ownership step.
 * Extracted verbatim from AutonomousAgentWizard.tsx (Phase 0b) — no behaviour change.
 */
export interface BlueprintPanelProps {
    pendingWorkflowData: any;
    /** Layout classes from the caller — the panel does not know its own height budget. */
    className?: string;
}

export function BlueprintPanel({ pendingWorkflowData, className = '' }: BlueprintPanelProps) {
    const update = pendingWorkflowData?.update;
    const blueprint = update?.structuralBlueprint;
    const structuralDiagnostics = update?.structuralDiagnostics;
    if (!blueprint && !structuralDiagnostics) return null;

    const nodeNarratives = Array.isArray(blueprint?.nodeNarratives) ? blueprint.nodeNarratives : [];
    const branchNarratives = Array.isArray(blueprint?.branchNarratives)
        ? blueprint.branchNarratives
        : [];
    const terminalObservability = Array.isArray(blueprint?.terminalObservability)
        ? blueprint.terminalObservability
        : [];
    const structuralErrors =
        Array.isArray(structuralDiagnostics?.errors) && structuralDiagnostics.errors.length > 0
            ? structuralDiagnostics.errors
            : [];
    const structuralWarnings =
        Array.isArray(structuralDiagnostics?.warnings) && structuralDiagnostics.warnings.length > 0
            ? structuralDiagnostics.warnings
            : [];

    return (
        <div className={`rounded border border-indigo-400/30 bg-indigo-500/5 p-4 space-y-3 ${className}`}>
            <p className="text-sm font-semibold text-indigo-300">
                Workflow Blueprint
            </p>
            {blueprint?.overviewText ? (
                <p className="text-sm text-muted-foreground">
                    {blueprint.overviewText}
                </p>
            ) : null}
            {structuralErrors.length > 0 || structuralWarnings.length > 0 ? (
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-red-300">
                        Structural issues
                    </p>
                    {structuralErrors.map((msg: string, idx: number) => (
                        <p key={`struct_err_${idx}`} className="text-xs text-red-200">
                            - {msg}
                        </p>
                    ))}
                    {structuralWarnings.map((msg: string, idx: number) => (
                        <p key={`struct_warn_${idx}`} className="text-xs text-amber-200">
                            - {msg}
                        </p>
                    ))}
                </div>
            ) : null}
            {nodeNarratives.length > 0 ? (
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                        Node-by-node behavior
                    </p>
                    {nodeNarratives.map((n: any, idx: number) => (
                        <p key={`${n.nodeId || idx}`} className="text-xs">
                            - {n.text}
                        </p>
                    ))}
                </div>
            ) : null}
            {branchNarratives.length > 0 ? (
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                        Branch behavior
                    </p>
                    {branchNarratives.map((text: string, idx: number) => (
                        <p key={`branch_${idx}`} className="text-xs">
                            - {text}
                        </p>
                    ))}
                </div>
            ) : null}
            {terminalObservability.length > 0 ? (
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                        Output observability
                    </p>
                    {terminalObservability.map((text: string, idx: number) => (
                        <p key={`terminal_${idx}`} className="text-xs">
                            - {text}
                        </p>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
