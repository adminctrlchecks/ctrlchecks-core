"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferBranchType = inferBranchType;
exports.buildRequiredBranchSlots = buildRequiredBranchSlots;
exports.buildBranchSlotContract = buildBranchSlotContract;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const branch_intent_model_1 = require("./branch-intent-model");
function inferBranchType(nodeTypes) {
    if (nodeTypes.includes('switch'))
        return 'switch';
    if (nodeTypes.includes('if_else'))
        return 'if_else';
    return 'unknown';
}
function expectedTargetsFromRegistry(nodeTypes) {
    let required = 1;
    for (const nodeType of nodeTypes) {
        const ports = unified_node_registry_1.unifiedNodeRegistry.getOutgoingPortsForWorkflowNode({
            type: nodeType,
            data: { type: nodeType, config: {} },
        });
        if (Array.isArray(ports) && ports.length > 1) {
            required = Math.max(required, ports.length);
        }
    }
    return required;
}
function buildRequiredBranchSlots(branchType, requiredSlotCount) {
    if (branchType === 'if_else')
        return ['true', 'false'];
    if (branchType === 'switch') {
        const count = Math.max(2, requiredSlotCount);
        return Array.from({ length: count }, (_, i) => `case_${i + 1}`);
    }
    return [];
}
function buildBranchSlotContract(nodeTypes, signals) {
    const branchType = inferBranchType(nodeTypes);
    const registryFloor = expectedTargetsFromRegistry(nodeTypes);
    const intentFloor = (0, branch_intent_model_1.expectedBranchTargetCount)(signals);
    const requiredSlotCount = signals.hasBranchingIntent
        ? Math.max(registryFloor, intentFloor)
        : registryFloor;
    return {
        branchType,
        requiredSlotCount,
        requiredSlots: buildRequiredBranchSlots(branchType, requiredSlotCount),
    };
}
