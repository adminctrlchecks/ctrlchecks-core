"use strict";
/**
 * SCHEMA-BASED VALIDATOR
 *
 * This replaces all hardcoded validation rules.
 *
 * Architecture:
 * - Fetches node schema from UnifiedNodeRegistry
 * - Validates config against inputSchema
 * - Validates output against outputSchema
 * - NO hardcoded validation rules
 *
 * This ensures:
 * - All validation comes from registry
 * - Permanent fixes apply to all workflows
 * - Consistent validation across system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegistryContractForNodeType = validateRegistryContractForNodeType;
exports.validateNodeConfig = validateNodeConfig;
exports.validateWorkflowSchema = validateWorkflowSchema;
exports.getRequiredFields = getRequiredFields;
exports.getDefaultConfig = getDefaultConfig;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("../utils/unified-node-type-normalizer");
function validateRegistryContractForNodeType(nodeType) {
    const definition = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (!definition) {
        return { valid: false, errors: [`Unknown node type: ${nodeType}`] };
    }
    const errors = [];
    const warnings = [];
    const inputSchema = (definition.inputSchema || {});
    const keys = new Set(Object.keys(inputSchema));
    for (const req of definition.requiredInputs || []) {
        if (!keys.has(req)) {
            errors.push(`Registry invariant failed: requiredInputs contains unknown field '${req}'`);
        }
    }
    try {
        const defaults = unified_node_registry_1.unifiedNodeRegistry.getDefaultConfig(nodeType);
        const defaultValidation = definition.validateConfig(defaults || {});
        if (!defaultValidation.valid) {
            warnings.push(`Registry invariant warning: defaultConfig is incomplete (${defaultValidation.errors.join(', ')})`);
        }
    }
    catch (e) {
        warnings.push(`Registry invariant warning: defaultConfig validation threw (${e?.message || String(e)})`);
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
/**
 * Validate node config against schema from registry
 */
function validateNodeConfig(node) {
    const normalizedType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
    const nodeType = normalizedType || node.data?.type || node.type;
    const config = node.data?.config || {};
    // ✅ STRICT ARCHITECTURE: Pre-validation guard before registry
    try {
        const { assertValidNodeType } = require('../utils/node-authority');
        assertValidNodeType(nodeType);
    }
    catch (error) {
        return {
            valid: false,
            errors: [error.message],
        };
    }
    // Get node definition from registry (SINGLE SOURCE OF TRUTH)
    const definition = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (!definition) {
        // This should NEVER happen if assertValidNodeType passed
        return {
            valid: false,
            errors: [`[NodeAuthority] Integrity error: Canonical node type '${nodeType}' not found in registry. This indicates a system initialization failure.`],
        };
    }
    // Migrate config first (backward compatibility)
    const migratedConfig = unified_node_registry_1.unifiedNodeRegistry.migrateConfig(nodeType, config);
    // Validate registry contracts first, then config.
    const contract = validateRegistryContractForNodeType(nodeType);
    if (!contract.valid) {
        return contract;
    }
    return definition.validateConfig(migratedConfig);
}
/**
 * Validate entire workflow using registry schemas
 */
function validateWorkflowSchema(workflow) {
    const errors = [];
    const warnings = [];
    const nodeErrors = new Map();
    for (const node of workflow.nodes) {
        const validation = validateNodeConfig(node);
        if (!validation.valid) {
            errors.push(`Node ${node.id} (${node.data?.type || node.type}): ${validation.errors.join(', ')}`);
            nodeErrors.set(node.id, validation.errors);
        }
        if (validation.warnings && validation.warnings.length > 0) {
            warnings.push(`Node ${node.id}: ${validation.warnings.join(', ')}`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        nodeErrors,
    };
}
/**
 * Get required fields for a node type from registry
 */
function getRequiredFields(nodeType) {
    const definition = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (!definition) {
        return [];
    }
    return definition.requiredInputs;
}
/**
 * Get default config for a node type from registry
 */
function getDefaultConfig(nodeType) {
    return unified_node_registry_1.unifiedNodeRegistry.getDefaultConfig(nodeType);
}
