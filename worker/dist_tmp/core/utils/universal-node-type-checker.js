"use strict";
/**
 * ✅ UNIVERSAL NODE TYPE CHECKER
 *
 * Single source of truth for ALL node type detection (trigger, data source, output, transformation, etc.)
 * Uses unified node registry as the authoritative source - NO hardcoded checks.
 *
 * This ensures:
 * - ALL node types are recognized correctly
 * - No missing node types (like webhook not being recognized as trigger)
 * - Universal fix applies to all workflows automatically
 * - Future node types work automatically without code changes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTriggerNode = isTriggerNode;
exports.isDataSourceNode = isDataSourceNode;
exports.isOutputNode = isOutputNode;
exports.isTerminalSinkNode = isTerminalSinkNode;
exports.hasPrimaryDataRole = hasPrimaryDataRole;
exports.isThroughputSendNode = isThroughputSendNode;
exports.isTransformationNode = isTransformationNode;
exports.isLogicNode = isLogicNode;
exports.getNodeCategory = getNodeCategory;
exports.isAIChatNode = isAIChatNode;
const unified_node_type_normalizer_1 = require("./unified-node-type-normalizer");
const unified_node_registry_1 = require("../registry/unified-node-registry");
const node_capability_registry_dsl_1 = require("../../services/ai/node-capability-registry-dsl");
/**
 * ✅ UNIVERSAL: Check if a node is a trigger using registry as single source of truth
 */
function isTriggerNode(node) {
    const nodeType = typeof node === 'string'
        ? (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node)
        : (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
    // ✅ PRIMARY: Check unified node registry (single source of truth)
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (nodeDef?.category === 'trigger') {
        return true;
    }
    // ✅ FALLBACK 1: Check node data category (if node object provided)
    if (typeof node !== 'string' && node.data?.category) {
        const category = (node.data.category || '').toLowerCase();
        if (category === 'triggers' || category === 'trigger') {
            return true;
        }
    }
    // ✅ FALLBACK 2: Known trigger types (backward compatibility)
    const TRIGGER_TYPES = [
        'manual_trigger',
        'webhook',
        'schedule',
        'interval',
        'chat_trigger',
        'form',
        'error_trigger',
        'workflow_trigger',
    ];
    return TRIGGER_TYPES.includes(nodeType);
}
/**
 * ✅ UNIVERSAL: Check if a node is a data source using registry
 */
function isDataSourceNode(node) {
    const nodeType = typeof node === 'string'
        ? (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node)
        : (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.type || node.data?.type || '');
    // ✅ ROOT-LEVEL FIX: Triggers cannot be data sources
    // webhook, schedule, manual_trigger, etc. are triggers, not data sources
    const nodeTypeLower = nodeType.toLowerCase();
    if (nodeTypeLower === 'webhook' ||
        nodeTypeLower === 'schedule' ||
        nodeTypeLower === 'manual_trigger' ||
        nodeTypeLower === 'interval' ||
        nodeTypeLower === 'chat_trigger' ||
        nodeTypeLower === 'form' ||
        nodeTypeLower === 'workflow_trigger' ||
        nodeTypeLower === 'error_trigger') {
        return false; // Triggers are not data sources
    }
    // ✅ PRIMARY: Check capability registry (most authoritative)
    if (node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isDataSource(nodeType) || node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.canReadData(nodeType)) {
        return true;
    }
    // ✅ FALLBACK: Check unified node registry category
    // Valid categories: "ai" | "data" | "trigger" | "utility" | "logic" | "communication" | "transformation"
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (nodeDef?.category === 'data') {
        return true;
    }
    // ✅ FALLBACK: Check node data category (if node object provided)
    if (typeof node !== 'string' && node.data?.category) {
        const category = (node.data.category || '').toLowerCase();
        if (category === 'data_source' || category === 'data') {
            return true;
        }
    }
    return false;
}
/**
 * ✅ UNIVERSAL: Check if a node is an output using registry
 */
function isOutputNode(node) {
    const nodeType = typeof node === 'string'
        ? (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node)
        : (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
    // ✅ PRIMARY: Check capability registry (most authoritative)
    if (node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isOutput(nodeType) || node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.canWriteData(nodeType)) {
        return true;
    }
    // ✅ REGISTRY-DRIVEN: single lookup covers both alwaysTerminal and category checks
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (nodeDef?.workflowBehavior?.alwaysTerminal === true) {
        return true;
    }
    if (nodeDef?.category === 'communication') {
        return true;
    }
    // ✅ FALLBACK: Check node data category (if node object provided)
    if (typeof node !== 'string' && node.data?.category) {
        const category = (node.data.category || '').toLowerCase();
        // Accept various output-related categories from node data
        if (category === 'output' || category === 'communication' || category === 'action') {
            return true;
        }
    }
    return false;
}
/**
 * Registry-driven terminal sink (e.g. log_output): must not use generic linear chain; Step 7 wires branch-aware.
 * See edge-reconciliation-engine: throughput outputs (Gmail, etc.) are NOT terminal sinks.
 */
function isTerminalSinkNode(node) {
    const nodeType = typeof node === 'string'
        ? (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node)
        : (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.type || node.data?.type || '');
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (nodeDef?.workflowBehavior?.alwaysTerminal === true) {
        return true;
    }
    if ((nodeDef?.tags || []).includes('terminal')) {
        return true;
    }
    return false;
}
/**
 * Primary data/read role: fetch or read path even if node also has write_data / output capability (e.g. google_sheets).
 * Used by edge reconciliation Step 6 to not skip data nodes when scanning backward from a throughput output.
 */
function hasPrimaryDataRole(node) {
    if (isTerminalSinkNode(node)) {
        return false;
    }
    const nodeType = typeof node === 'string'
        ? (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node)
        : (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.type || node.data?.type || '');
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (nodeDef?.category === 'data') {
        return true;
    }
    return isDataSourceNode(node);
}
/**
 * Throughput send/write node that accepts upstream payload (not a terminal sink): communication-style outputs.
 * Excludes primary data nodes (e.g. google_sheets) even when they have write_data capability.
 */
function isThroughputSendNode(node) {
    if (isTerminalSinkNode(node)) {
        return false;
    }
    if (hasPrimaryDataRole(node)) {
        return false;
    }
    const nodeType = typeof node === 'string'
        ? (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node)
        : (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.type || node.data?.type || '');
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (nodeDef?.category === 'communication') {
        return true;
    }
    return isOutputNode(node);
}
/**
 * ✅ UNIVERSAL: Check if a node is a transformation using registry
 */
function isTransformationNode(node) {
    const nodeType = typeof node === 'string'
        ? (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node)
        : (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.type || node.data?.type || '');
    // ✅ PRIMARY: Check capability registry (most authoritative)
    if (node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isTransformation(nodeType)) {
        return true;
    }
    // ✅ FALLBACK: Check unified node registry category
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (nodeDef?.category === 'transformation' || nodeDef?.category === 'ai' || nodeDef?.category === 'logic') {
        return true;
    }
    // ✅ FALLBACK: Check node data category (if node object provided)
    if (typeof node !== 'string' && node.data?.category) {
        const category = (node.data.category || '').toLowerCase();
        if (category === 'transformation' || category === 'ai' || category === 'logic') {
            return true;
        }
    }
    return false;
}
/**
 * ✅ UNIVERSAL: Check if a node is a logic/branching node using registry
 */
function isLogicNode(node) {
    const nodeType = typeof node === 'string'
        ? (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node)
        : (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.type || node.data?.type || '');
    // ✅ PRIMARY: Check unified node registry
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (nodeDef?.category === 'logic') {
        return true;
    }
    // ✅ FALLBACK: Known logic node types
    const LOGIC_TYPES = [
        'if_else',
        'switch',
        'merge',
        'try_catch',
        'error_handler',
        'retry',
    ];
    return LOGIC_TYPES.includes(nodeType);
}
/**
 * ✅ UNIVERSAL: Get node category from registry
 */
function getNodeCategory(node) {
    const nodeType = typeof node === 'string'
        ? (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node)
        : (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.type || node.data?.type || '');
    // ✅ PRIMARY: Check unified node registry
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (nodeDef?.category) {
        return nodeDef.category;
    }
    // ✅ FALLBACK: Check node data category (if node object provided)
    if (typeof node !== 'string' && node.data?.category) {
        return node.data.category;
    }
    return null;
}
/**
 * ✅ WORLD-CLASS UNIVERSAL: Check if a node is an AI chat node using registry
 *
 * This is UNIVERSAL - works for ALL AI nodes (ai_chat_model, ollama, openai_gpt, anthropic_claude, etc.)
 * No hardcoded node type names - uses registry category 'ai' as single source of truth
 *
 * @param node - Node type string or WorkflowNode object
 * @returns true if node is in 'ai' category (any AI provider)
 */
function isAIChatNode(node) {
    const nodeType = typeof node === 'string'
        ? (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node)
        : (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.type || node.data?.type || '');
    // ✅ PRIMARY: Check unified node registry category (single source of truth)
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (nodeDef?.category === 'ai') {
        return true;
    }
    // ✅ FALLBACK: Check node data category (if node object provided)
    if (typeof node !== 'string' && node.data?.category) {
        const category = (node.data.category || '').toLowerCase();
        if (category === 'ai') {
            return true;
        }
    }
    return false;
}
