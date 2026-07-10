"use strict";
/**
 * Deterministic switch case → downstream node mapping for plan-driven graphs.
 * Single source of truth shared by summarize-layer and plan-driven-workflow-builder.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCaseNodeMappingFromPlanChain = buildCaseNodeMappingFromPlanChain;
exports.computeSwitchContextForPlanChain = computeSwitchContextForPlanChain;
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const switch_case_plan_1 = require("./switch-case-plan");
const plan_chain_prune_1 = require("./plan-chain-prune");
function parseTargetDescriptor(raw) {
    const hashIdx = raw.indexOf('#');
    const atIdx = raw.indexOf('@');
    const sepIdx = hashIdx > 0 && atIdx > 0 ? Math.min(hashIdx, atIdx) : Math.max(hashIdx, atIdx);
    if (sepIdx > 0 && sepIdx < raw.length - 1) {
        return {
            targetNodeType: raw.slice(0, sepIdx),
            targetNodeId: raw.slice(sepIdx + 1),
        };
    }
    return { targetNodeType: raw };
}
/**
 * Build caseNodeMapping: each extracted case value maps to the i-th non-terminal node after `switch`
 * in the plan chain, using explicit node IDs when available so duplicate types (e.g. two Gmail) wire correctly.
 */
function buildCaseNodeMappingFromPlanChain(resolvedChain, rawUserPrompt, nodeIdsByChainIndex, switchIndex) {
    const switchIdx = typeof switchIndex === 'number'
        ? switchIndex
        : resolvedChain.findIndex((t) => (0, plan_chain_prune_1.stripPlanTokenToType)(t) === 'switch');
    if (switchIdx === -1)
        return undefined;
    const upstreamNodeType = switchIdx > 0 ? (0, plan_chain_prune_1.stripPlanTokenToType)(resolvedChain[switchIdx - 1]) : undefined;
    const switchPlan = (0, switch_case_plan_1.planSwitchCasesFromPrompt)(rawUserPrompt, upstreamNodeType);
    if (!switchPlan.cases || switchPlan.cases.length === 0)
        return undefined;
    const downstreamTokens = [];
    const downstreamNodeIds = [];
    for (let i = switchIdx + 1; i < resolvedChain.length; i++) {
        const t = resolvedChain[i];
        if ((0, plan_chain_prune_1.stripPlanTokenToType)(t) === 'log_output')
            continue;
        downstreamTokens.push(t);
        downstreamNodeIds.push(nodeIdsByChainIndex && nodeIdsByChainIndex.length > i ? nodeIdsByChainIndex[i] : undefined);
    }
    if (downstreamTokens.length === 0)
        return undefined;
    const mapping = {};
    for (let i = 0; i < switchPlan.cases.length; i++) {
        const caseValue = switchPlan.cases[i].value;
        const rawToken = downstreamTokens[i] ?? downstreamTokens[i % downstreamTokens.length];
        const descriptor = parseTargetDescriptor(rawToken);
        const explicitId = downstreamNodeIds[i] ?? downstreamNodeIds[i % downstreamNodeIds.length];
        mapping[caseValue] = {
            targetNodeType: descriptor.targetNodeType,
            targetNodeId: descriptor.targetNodeId ?? explicitId,
        };
    }
    return Object.keys(mapping).length > 0 ? mapping : undefined;
}
/**
 * Build SwitchContext for `initializeWorkflow` after plan nodes are materialized (same order as resolvedChain).
 */
function computeSwitchContextForPlanChain(nodes, resolvedChain, rawUserPrompt) {
    const nodeIdsByChainIndex = nodes.map((n) => n.id);
    const switchContexts = [];
    for (let i = 0; i < resolvedChain.length; i++) {
        if ((0, plan_chain_prune_1.stripPlanTokenToType)(resolvedChain[i]) !== 'switch')
            continue;
        if (i < 0 || i >= nodes.length)
            continue;
        const switchNode = nodes[i];
        const nt = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(switchNode.data?.type || switchNode.type || '');
        if (nt !== 'switch')
            continue;
        const caseNodeMapping = buildCaseNodeMappingFromPlanChain(resolvedChain, rawUserPrompt, nodeIdsByChainIndex, i);
        if (!caseNodeMapping || Object.keys(caseNodeMapping).length === 0)
            continue;
        switchContexts.push({
            switchNodeId: switchNode.id,
            caseNodeMapping,
        });
    }
    if (switchContexts.length === 0)
        return undefined;
    // Backward compatible: first context remains available via legacy fields.
    return {
        switchNodeId: switchContexts[0].switchNodeId,
        caseNodeMapping: switchContexts[0].caseNodeMapping,
        switchContexts,
    };
}
