"use strict";
/**
 * Node Type Resolver Utility — THIN WRAPPER (legacy compatibility shim)
 *
 * All resolution now delegates to unified-node-registry.ts (single source of truth).
 * This file exists only for backward compatibility during migration.
 * Once all callers are updated to import from unified-node-registry directly,
 * this file will be deleted.
 *
 * DO NOT add new logic here. Add aliases to unified-node-registry.ts ALIAS_MAP instead.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveNodeType = resolveNodeType;
exports.resolveNodeTypes = resolveNodeTypes;
exports.resolveCanonicalNodeTypeStrict = resolveCanonicalNodeTypeStrict;
exports.nodeTypeExists = nodeTypeExists;
const unified_node_registry_1 = require("../registry/unified-node-registry");
/**
 * Resolve a node type alias to its canonical form.
 * Delegates to unified-node-registry.ts ALIAS_MAP — single source of truth.
 *
 * @param nodeType - The node type to resolve (e.g., 'gmail', 'email')
 * @param debug - Unused, kept for API compatibility
 * @returns The canonical node type name (e.g., 'google_gmail')
 */
function resolveNodeType(nodeType, debug = false) {
    if (!nodeType || typeof nodeType !== 'string') {
        return nodeType || '';
    }
    // Delegate to registry — single source of truth
    const resolved = unified_node_registry_1.unifiedNodeRegistry.resolveAlias(nodeType);
    if (resolved) {
        return resolved;
    }
    // If not in alias map but exists in registry, return as-is
    if (unified_node_registry_1.unifiedNodeRegistry.has(nodeType)) {
        return nodeType;
    }
    // Lowercase fallback
    const lower = nodeType.toLowerCase().trim();
    const resolvedLower = unified_node_registry_1.unifiedNodeRegistry.resolveAlias(lower);
    if (resolvedLower) {
        return resolvedLower;
    }
    if (unified_node_registry_1.unifiedNodeRegistry.has(lower)) {
        return lower;
    }
    // Return original — let callers decide how to handle unknown types
    return nodeType;
}
/**
 * Resolve multiple node types at once.
 */
function resolveNodeTypes(nodeTypes, debug = false) {
    return nodeTypes.map(type => resolveNodeType(type, debug));
}
/**
 * Strict canonical resolver — only accepts types present in unified-node-registry.
 * Does not use alias heuristics.
 */
function resolveCanonicalNodeTypeStrict(nodeType) {
    const trimmed = typeof nodeType === 'string' ? nodeType.trim() : '';
    if (!trimmed) {
        throw new Error('Empty node type is not allowed');
    }
    if (unified_node_registry_1.unifiedNodeRegistry.has(trimmed)) {
        return trimmed;
    }
    const lowered = trimmed.toLowerCase();
    if (unified_node_registry_1.unifiedNodeRegistry.has(lowered)) {
        return lowered;
    }
    throw new Error(`[StrictNodeTypeResolver] Non-canonical node type "${nodeType}". ` +
        `Generation paths accept only node types present in unified-node-registry.`);
}
/**
 * Check if a node type exists in the registry.
 */
function nodeTypeExists(nodeType) {
    if (!nodeType)
        return false;
    return unified_node_registry_1.unifiedNodeRegistry.has(nodeType) || unified_node_registry_1.unifiedNodeRegistry.has(nodeType.toLowerCase().trim());
}
