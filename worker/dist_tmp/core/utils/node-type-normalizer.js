"use strict";
/**
 * Node Type Normalizer
 * Handles normalization of node types, especially for frontend "custom" type nodes
 * where the actual type is stored in data.type
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeNodeType = normalizeNodeType;
exports.isValidNodeType = isValidNodeType;
exports.getNormalizedNodeTypeWithValidation = getNormalizedNodeTypeWithValidation;
exports.resolveNodeType = resolveNodeType;
/**
 * Centralized Node Type Resolver
 *
 * ✅ ARCHITECTURAL FIX: This is the SINGLE SOURCE OF TRUTH for resolving node types.
 * Never use node.type directly - always use this function.
 *
 * Handles the frontend pattern where type: "custom" and actual type is in data.type
 *
 * @param node - The node object to normalize
 * @returns The normalized node type string
 */
function normalizeNodeType(node) {
    // First, try to get the type from the standard location
    let nodeType = node.type || '';
    // Handle frontend normalization where type: "custom" with actual type in data.type
    if (nodeType === 'custom' && node.data?.type) {
        nodeType = node.data.type;
    }
    // Also check for data.nodeType as fallback
    if ((!nodeType || nodeType === 'custom') && node.data?.nodeType) {
        nodeType = node.data.nodeType;
    }
    // If still empty, try to infer from data.type directly
    if (!nodeType && node.data?.type) {
        nodeType = node.data.type;
    }
    return nodeType || '';
}
/**
 * Checks if a node type is valid (not "custom" or empty)
 *
 * @param node - The node object to check
 * @returns True if the node type is valid
 */
function isValidNodeType(node) {
    const normalizedType = normalizeNodeType(node);
    return normalizedType !== '' && normalizedType !== 'custom';
}
/**
 * Gets the normalized node type and validates it exists
 *
 * @param node - The node object
 * @param availableTypes - Array of available node types (optional, for validation)
 * @returns Object with normalized type and validation result
 */
function getNormalizedNodeTypeWithValidation(node, availableTypes) {
    const normalizedType = normalizeNodeType(node);
    if (!normalizedType || normalizedType === 'custom') {
        return {
            type: normalizedType,
            valid: false,
            error: `Node type is invalid or undefined: ${JSON.stringify(node)}`
        };
    }
    if (availableTypes && !availableTypes.includes(normalizedType)) {
        return {
            type: normalizedType,
            valid: false,
            error: `Node type "${normalizedType}" does not exist in available types`
        };
    }
    return {
        type: normalizedType,
        valid: true
    };
}
/**
 * Alias for normalizeNodeType() - provides semantic clarity
 * This is the centralized resolver that should be used everywhere.
 *
 * @param node - The node object to resolve
 * @returns The resolved node type string
 */
function resolveNodeType(node) {
    return normalizeNodeType(node);
}
