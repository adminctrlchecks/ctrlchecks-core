"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTerminalMode = resolveTerminalMode;
exports.evaluateTerminalMode = evaluateTerminalMode;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("../utils/unified-node-type-normalizer");
function resolveTerminalMode(workflow) {
    const raw = String((workflow?.metadata?.terminalMode || 'log_output_preferred')).toLowerCase();
    if (raw === 'gmail_terminal')
        return 'gmail_terminal';
    if (raw === 'mixed')
        return 'mixed';
    return 'log_output_preferred';
}
function getLeafNodes(workflow) {
    const hasOutgoing = new Set((workflow.edges || []).map((e) => e.source));
    return (workflow.nodes || []).filter((n) => !hasOutgoing.has(n.id));
}
function evaluateTerminalMode(workflow) {
    const mode = resolveTerminalMode(workflow);
    const leafNodes = getLeafNodes(workflow);
    const leafTypes = leafNodes.map((n) => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(n));
    const hasLeafLogOutput = leafTypes.includes('log_output');
    const hasLeafGmail = leafTypes.includes('google_gmail');
    const hasLeafSinkOutput = leafNodes.some((n) => {
        const def = unified_node_registry_1.unifiedNodeRegistry.get((0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(n));
        return (def?.tags || []).includes('output') || (def?.tags || []).includes('sink');
    });
    const nodeById = new Map((workflow.nodes || []).map((n) => [n.id, n]));
    const hasGmailBeforeTerminal = (workflow.edges || []).some((e) => {
        const sourceType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(nodeById.get(e.source));
        const targetType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(nodeById.get(e.target));
        return sourceType === 'google_gmail' && targetType === 'log_output';
    });
    const errors = [];
    const warnings = [];
    if (mode === 'gmail_terminal' && !hasLeafGmail && !hasGmailBeforeTerminal) {
        errors.push('Terminal mode "gmail_terminal" requires a terminal gmail route (leaf gmail or gmail -> log_output)');
    }
    else if (mode === 'mixed') {
        if (!hasLeafLogOutput && !hasLeafSinkOutput) {
            errors.push('Terminal mode "mixed" requires at least one terminal output leaf node');
        }
    }
    else if (!hasLeafLogOutput && hasLeafSinkOutput) {
        warnings.push('No log_output terminal found; using output sink terminal mode');
    }
    return {
        mode,
        hasLeafLogOutput,
        hasLeafGmail,
        hasGmailBeforeTerminal,
        hasLeafSinkOutput,
        errors,
        warnings,
    };
}
