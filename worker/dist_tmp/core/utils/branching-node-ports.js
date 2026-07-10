"use strict";
/**
 * Registry-driven outgoing port names for branching nodes whose ports depend on
 * persisted workflow node config (e.g. switch case values).
 * Single place for edge reconciliation and canvas — no mutation of UnifiedNodeDefinition at runtime.
 *
 * **Switch contract:** Edge `type` / `sourceHandle` MUST equal `cases[].value` (string).
 * The Switch `expression` must evaluate (after templates) to exactly one of those values for routing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSwitchCasePortNames = extractSwitchCasePortNames;
exports.getBranchOutgoingPortsForNode = getBranchOutgoingPortsForNode;
const unified_node_type_normalizer_1 = require("./unified-node-type-normalizer");
/** Extract switch case values as edge port IDs (matches execute-workflow switch + legacy `rules`). */
function extractSwitchCasePortNames(config) {
    if (!config)
        return [];
    try {
        const casesRaw = config.cases ?? config.rules ?? [];
        let cases = [];
        if (typeof casesRaw === 'string') {
            const parsed = JSON.parse(casesRaw);
            if (Array.isArray(parsed)) {
                cases = parsed;
            }
        }
        else if (Array.isArray(casesRaw)) {
            cases = casesRaw;
        }
        const seen = new Set();
        for (const c of cases) {
            const raw = typeof c === 'string' ? c : c?.value != null ? String(c.value) : '';
            const value = raw.trim();
            if (!value)
                continue;
            seen.add(value);
        }
        // Ensure stable unique output handles for deterministic edge mapping.
        return Array.from(seen);
    }
    catch {
        return [];
    }
}
/**
 * Effective outgoing branch ports for a workflow node instance.
 * @param fallbackPorts from UnifiedNodeDefinition.outgoingPorts when config does not specialize ports
 */
function getBranchOutgoingPortsForNode(nodeTypeRaw, config, fallbackPorts) {
    const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(nodeTypeRaw || '');
    if (nodeType === 'if_else') {
        return ['true', 'false'];
    }
    if (nodeType === 'switch') {
        const fromConfig = extractSwitchCasePortNames(config);
        if (fromConfig.length > 0) {
            return fromConfig;
        }
        const safeFallback = Array.isArray(fallbackPorts) && fallbackPorts.length > 0 ? fallbackPorts : ['output'];
        return safeFallback;
    }
    return fallbackPorts;
}
