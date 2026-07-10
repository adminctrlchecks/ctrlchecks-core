"use strict";
/**
 * Central Configuration for Transformation Node Mappings
 *
 * Maps transformation operations to their corresponding node types.
 * This centralizes transformation node type configuration to avoid
 * hardcoded strings across multiple files.
 *
 * Usage:
 *   import { TRANSFORMATION_NODE_MAP, getTransformationNodeType } from './transformation-node-config';
 *   const nodeType = getTransformationNodeType('summarize'); // Returns 'ai_chat_model'
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSFORMATION_NODE_MAP = void 0;
exports.getTransformationNodeType = getTransformationNodeType;
exports.getSupportedTransformationOperations = getSupportedTransformationOperations;
exports.isTransformationOperation = isTransformationOperation;
exports.getTransformationNodeTypes = getTransformationNodeTypes;
/**
 * Central transformation operation to node type mapping
 *
 * All transformation operations (summarize, analyze, classify, generate)
 * map to ai_chat_model, which is the unified AI transformation node.
 */
exports.TRANSFORMATION_NODE_MAP = {
    summarize: 'ai_chat_model',
    summarise: 'ai_chat_model',
    analyze: 'ai_chat_model',
    analyse: 'ai_chat_model',
    classify: 'ai_chat_model',
    generate: 'ai_chat_model',
    translate: 'ai_chat_model',
    extract: 'ai_chat_model',
    process: 'ai_chat_model',
    transform: 'ai_chat_model',
};
/**
 * Get the node type for a transformation operation
 *
 * @param operation - Transformation operation (e.g., 'summarize', 'analyze')
 * @returns Node type for the transformation, or 'ai_chat_model' as default
 */
function getTransformationNodeType(operation) {
    if (!operation || typeof operation !== 'string') {
        return 'ai_chat_model';
    }
    const normalized = operation.toLowerCase().trim();
    return exports.TRANSFORMATION_NODE_MAP[normalized] || 'ai_chat_model';
}
/**
 * Get all supported transformation operations
 *
 * @returns Array of supported transformation operation names
 */
function getSupportedTransformationOperations() {
    return Object.keys(exports.TRANSFORMATION_NODE_MAP);
}
/**
 * Check if an operation is a transformation operation
 *
 * @param operation - Operation to check
 * @returns True if the operation is a transformation operation
 */
function isTransformationOperation(operation) {
    if (!operation || typeof operation !== 'string') {
        return false;
    }
    const normalized = operation.toLowerCase().trim();
    return normalized in exports.TRANSFORMATION_NODE_MAP;
}
/**
 * Get all node types that can handle transformations
 * Returns the unique set of node types from TRANSFORMATION_NODE_MAP
 *
 * @returns Array of node types that can handle transformations
 */
function getTransformationNodeTypes() {
    const nodeTypes = new Set(Object.values(exports.TRANSFORMATION_NODE_MAP));
    return Array.from(nodeTypes);
}
