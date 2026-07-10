"use strict";
/**
 * Single source of truth for "is this config value empty?" and
 * "should this field be treated as required before execution?" across:
 * - validateStructuralReadiness
 * - discoverNodeInputs
 * - comprehensive-node-questions-generator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmptyConfigValue = isEmptyConfigValue;
exports.isFieldInRegistryRequiredList = isFieldInRegistryRequiredList;
exports.computeFieldRequiredBeforeExecution = computeFieldRequiredBeforeExecution;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const node_library_1 = require("../../services/nodes/node-library");
const fill_mode_resolver_1 = require("../utils/fill-mode-resolver");
const field_ownership_1 = require("../utils/field-ownership");
const operation_contract_resolver_1 = require("../operations/operation-contract-resolver");
const field_policy_resolver_1 = require("../operations/field-policy-resolver");
function isEmptyConfigValue(value) {
    return (value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' &&
            !Array.isArray(value) &&
            Object.keys(value).length === 0));
}
function getNodeLibraryRequiredSet(nodeType) {
    const schema = node_library_1.nodeLibrary.getSchema(nodeType);
    const req = schema?.configSchema?.required;
    return new Set(Array.isArray(req) ? req : []);
}
function conditionMatches(condition, config) {
    const value = config[condition.field];
    if ('equals' in condition)
        return value === condition.equals;
    if ('notEquals' in condition)
        return value !== condition.notEquals;
    return true;
}
/**
 * True if the unified registry marks the field as required for the node type
 * (requiredInputs list or per-field required flag).
 */
function isFieldInRegistryRequiredList(nodeType, fieldName) {
    const def = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (!def)
        return false;
    if (def.requiredInputs?.includes(fieldName))
        return true;
    const fd = def.inputSchema?.[fieldName];
    return !!fd?.required;
}
/**
 * Whether a field should be labeled required in wizard / discoverNodeInputs
 * when it is still empty (value-layer and structural layer; excludes credentials).
 */
function computeFieldRequiredBeforeExecution(nodeType, fieldName, fieldDef, config) {
    if (!fieldDef) {
        return (isFieldInRegistryRequiredList(nodeType, fieldName) ||
            getNodeLibraryRequiredSet(nodeType).has(fieldName));
    }
    if ((0, field_ownership_1.isCredentialOwnership)(fieldName, fieldDef)) {
        return false;
    }
    const def = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (def) {
        const operationContract = (0, operation_contract_resolver_1.resolveOperationContract)(def, config);
        const fieldPolicy = (0, field_policy_resolver_1.resolveFieldPolicyForNode)(def, config);
        const policy = fieldPolicy.fields[fieldName];
        if (policy) {
            return policy.required;
        }
        if (!(0, operation_contract_resolver_1.fieldIsActiveForOperation)(operationContract, fieldName)) {
            return false;
        }
        if ((0, operation_contract_resolver_1.fieldAllowsEmptyValue)(operationContract, fieldName)) {
            return false;
        }
        if ((0, operation_contract_resolver_1.fieldRequiredByOperationContract)(operationContract, fieldName)) {
            return true;
        }
    }
    if (fieldDef.ui?.visibleIf && !conditionMatches(fieldDef.ui.visibleIf, config)) {
        return false;
    }
    if (fieldDef.ui?.requiredIf) {
        return conditionMatches(fieldDef.ui.requiredIf, config);
    }
    if (Array.isArray(fieldDef.runtimeContract?.requiredWhen)) {
        const requiredByOperation = fieldDef.runtimeContract.requiredWhen.some((condition) => conditionMatches(condition, config));
        if (requiredByOperation)
            return true;
    }
    const inputSchema = (def?.inputSchema || {});
    const mode = (0, fill_mode_resolver_1.resolveEffectiveFieldFillMode)(fieldName, inputSchema, config);
    if (mode === 'runtime_ai' && fieldDef.fillMode?.supportsRuntimeAI !== false) {
        // Runtime AI fields are normally not blocking pre-execution unless explicitly essential.
        if (fieldDef.essentialForExecution === true) {
            return true;
        }
        return false;
    }
    const libRequired = getNodeLibraryRequiredSet(nodeType).has(fieldName);
    const inRequiredInputs = def?.requiredInputs?.includes(fieldName) ?? false;
    const fieldMarkedRequired = !!fieldDef.required;
    if ((0, field_ownership_1.isStructuralOwnership)(fieldName, fieldDef)) {
        return inRequiredInputs || fieldMarkedRequired || libRequired;
    }
    return inRequiredInputs || fieldMarkedRequired || libRequired;
}
