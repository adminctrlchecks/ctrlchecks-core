"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeNodeType = normalizeNodeType;
exports.normalizeNodeTypeAsync = normalizeNodeTypeAsync;
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const node_library_1 = require("../nodes/node-library");
/**
 * Registry-only node type normalization.
 * No semantic, keyword, or pattern fallbacks are allowed here.
 */
function normalizeNodeType(nodeType) {
    if (!nodeType || typeof nodeType !== 'string') {
        return nodeType;
    }
    const original = nodeType.trim();
    if (!original) {
        return nodeType;
    }
    const lower = original.toLowerCase();
    const aliasResolved = unified_node_registry_1.unifiedNodeRegistry.resolveAlias(lower);
    if (aliasResolved && node_library_1.nodeLibrary.isNodeTypeRegistered(aliasResolved)) {
        return aliasResolved;
    }
    if (unified_node_registry_1.unifiedNodeRegistry.has(lower) && node_library_1.nodeLibrary.isNodeTypeRegistered(lower)) {
        return lower;
    }
    if (node_library_1.nodeLibrary.isNodeTypeRegistered(original)) {
        return original;
    }
    const exact = node_library_1.nodeLibrary.getRegisteredNodeTypes().find((t) => t.toLowerCase() === lower);
    return exact ?? original;
}
async function normalizeNodeTypeAsync(nodeType) {
    return normalizeNodeType(nodeType);
}
