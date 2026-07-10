"use strict";
/**
 * Capability deduplication keys for workflow chain / injection logic.
 *
 * Branching nodes (if_else, switch, …) must NOT share a dedupe bucket with AI or generic
 * transforms — otherwise a required if_else is dropped when an AI node is already present.
 *
 * For nodes with `isBranching` in the unified registry, we return `null` so callers skip
 * coarse capability deduplication (exact-node and semantic-equivalence checks still apply).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeCapabilityDedupeKey = getNodeCapabilityDedupeKey;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const node_capability_registry_dsl_1 = require("../../services/ai/node-capability-registry-dsl");
const unified_node_type_normalizer_1 = require("./unified-node-type-normalizer");
/**
 * Returns a key used to enforce "one slot per coarse role" in a linear chain.
 * `null` means: do not treat this node as consuming a generic data_source / ai / transformation / output slot.
 */
function getNodeCapabilityDedupeKey(nodeType) {
    const normalized = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(nodeType) || nodeType;
    if (unified_node_registry_1.unifiedNodeRegistry.allowsBranching(normalized)) {
        return null;
    }
    if (node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.hasCapability(normalized, 'ai_processing')) {
        return 'ai_processing';
    }
    if (node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isDataSource(normalized)) {
        return 'data_source';
    }
    if (node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isOutput(normalized)) {
        return 'output';
    }
    if (node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isTransformation(normalized)) {
        return 'transformation';
    }
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(normalized);
    if (nodeDef) {
        const category = nodeDef.category;
        if (category === 'data' || category === 'trigger') {
            return 'data_source';
        }
        if (category === 'ai') {
            return 'ai_processing';
        }
        if (category === 'transformation' || category === 'utility') {
            return 'transformation';
        }
        if (category === 'logic') {
            return 'transformation';
        }
        if (category === 'communication' || category === 'social' || category === 'output') {
            return 'output';
        }
    }
    return 'transformation';
}
