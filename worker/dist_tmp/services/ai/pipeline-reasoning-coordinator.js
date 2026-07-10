"use strict";
/**
 * Pipeline Reasoning Coordinator
 *
 * Implements a Junior/Senior AI review pattern for workflow generation stages.
 * Junior AI (gemini-3.5-flash) executes each stage; Senior AI (gemini-3.1-pro-preview)
 * validates and optionally corrects the proposal before it is accepted.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineReasoningCoordinator = exports.PipelineContractError = void 0;
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
class PipelineContractError extends Error {
    constructor(code, details) {
        super(`Pipeline contract error: ${code}${details ? ' — ' + details.join('; ') : ''}`);
        this.code = code;
        this.details = details;
        this.name = 'PipelineContractError';
    }
}
exports.PipelineContractError = PipelineContractError;
class PipelineReasoningCoordinator {
    constructor(seniorModel, juniorModel, fullContext) {
        this.seniorModel = seniorModel;
        this.juniorModel = juniorModel;
        this.fullContext = fullContext;
    }
    async executeStage(stageName, juniorExecutor, seniorValidator) {
        // Junior executes
        const proposal = await juniorExecutor();
        // Senior validates
        const validation = await seniorValidator(proposal, this.fullContext);
        if (validation.approved) {
            return proposal.proposal;
        }
        // Rejected — incorporate correction and re-submit once
        if (validation.correctedValue !== undefined) {
            const correctedProposal = {
                stageName,
                proposal: validation.correctedValue,
                rationale: `Corrected by Senior AI: ${validation.rejectionReason || 'see correction'}`,
            };
            const revalidation = await seniorValidator(correctedProposal, this.fullContext);
            if (revalidation.approved) {
                return correctedProposal.proposal;
            }
        }
        throw new PipelineContractError('SENIOR_REJECTION_LIMIT', [
            validation.rejectionReason || 'Senior AI rejected proposal twice',
        ]);
    }
    /**
     * Build a compact registry knowledge summary for Senior AI context.
     * Purely registry-driven — no hardcoded content.
     */
    static buildRegistryKnowledgeSummary() {
        const types = unified_node_registry_1.unifiedNodeRegistry.getAllTypes();
        const lines = ['Available node types:'];
        for (const type of types.slice(0, 80)) { // cap to avoid token overflow
            const def = unified_node_registry_1.unifiedNodeRegistry.get(type);
            if (!def)
                continue;
            const tags = def.tags?.join(', ') || '';
            lines.push(`- ${type} (${def.category || 'action'}${tags ? ', tags: ' + tags : ''}): ${def.description?.slice(0, 80) || ''}`);
        }
        return lines.join('\n');
    }
}
exports.PipelineReasoningCoordinator = PipelineReasoningCoordinator;
