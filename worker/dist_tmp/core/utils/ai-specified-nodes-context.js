"use strict";
/**
 * AI-Specified Nodes Context
 *
 * Universal context for tracking AI-specified nodes from StructuredIntent.
 * This ensures all injection layers respect AI's intent and don't add duplicate nodes.
 *
 * SINGLE SOURCE OF TRUTH: AI-specified nodes from StructuredIntent take precedence
 * over keyword detection, HTTP enforcement, and other heuristic-based injection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAISpecifiedNodesContext = createAISpecifiedNodesContext;
exports.isNodeAISpecified = isNodeAISpecified;
exports.filterAISpecifiedNodes = filterAISpecifiedNodes;
exports.hasAnyAISpecifiedNode = hasAnyAISpecifiedNode;
const intent_constraint_engine_1 = require("../../services/ai/intent-constraint-engine");
const unified_node_type_normalizer_1 = require("./unified-node-type-normalizer");
const node_type_resolver_util_1 = require("./node-type-resolver-util");
/**
 * Create AI-Specified Nodes Context from StructuredIntent
 *
 * This extracts the authoritative list of nodes that AI specified,
 * which should be respected by all injection layers.
 *
 * @param structuredIntent - StructuredIntent from AI
 * @param originalPrompt - Original user prompt (optional, for transformation detection)
 * @returns AI-Specified Nodes Context
 */
function createAISpecifiedNodesContext(structuredIntent, originalPrompt) {
    // ✅ SINGLE SOURCE OF TRUTH: Extract required nodes from StructuredIntent
    // This uses IntentConstraintEngine which is the authoritative source for AI-specified nodes
    const aiSpecifiedNodes = intent_constraint_engine_1.IntentConstraintEngine.getRequiredNodes(structuredIntent, originalPrompt);
    // Normalize all node types to canonical forms
    const normalizedNodeTypes = new Set();
    for (const nodeType of aiSpecifiedNodes) {
        const normalized = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(nodeType);
        // Also resolve aliases to canonical form (e.g., "gmail" → "google_gmail")
        const canonical = (0, node_type_resolver_util_1.resolveNodeType)(normalized, false);
        normalizedNodeTypes.add(canonical);
    }
    console.log(`[AISpecifiedNodesContext] ✅ Created context with ${normalizedNodeTypes.size} AI-specified node(s): ${Array.from(normalizedNodeTypes).join(', ')}`);
    // ✅ FIXED: Don't store structuredIntent to prevent circular reference
    // Only store node types and original prompt - that's all we need
    return {
        aiSpecifiedNodeTypes: normalizedNodeTypes,
        originalPrompt,
    };
}
/**
 * Check if a node type is already specified by AI
 *
 * @param context - AI-Specified Nodes Context
 * @param nodeType - Node type to check (will be normalized)
 * @returns true if node is already specified by AI
 */
function isNodeAISpecified(context, nodeType) {
    const normalized = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(nodeType);
    const canonical = (0, node_type_resolver_util_1.resolveNodeType)(normalized, false);
    const isSpecified = context.aiSpecifiedNodeTypes.has(canonical);
    if (isSpecified) {
        console.log(`[AISpecifiedNodesContext] ✅ Node "${nodeType}" (canonical: ${canonical}) is already specified by AI - skipping injection`);
    }
    return isSpecified;
}
/**
 * Filter out nodes that are already specified by AI
 *
 * @param context - AI-Specified Nodes Context
 * @param nodeTypes - Array of node types to filter
 * @returns Array of node types NOT already specified by AI
 */
function filterAISpecifiedNodes(context, nodeTypes) {
    return nodeTypes.filter(nodeType => !isNodeAISpecified(context, nodeType));
}
/**
 * Check if any of the provided node types are already specified by AI
 *
 * @param context - AI-Specified Nodes Context
 * @param nodeTypes - Array of node types to check
 * @returns true if ANY node is already specified by AI
 */
function hasAnyAISpecifiedNode(context, nodeTypes) {
    return nodeTypes.some(nodeType => isNodeAISpecified(context, nodeType));
}
