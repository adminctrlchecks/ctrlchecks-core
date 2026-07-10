"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickActiveInputSchema = pickActiveInputSchema;
exports.resolveFieldPolicyForNode = resolveFieldPolicyForNode;
const operation_contract_resolver_1 = require("./operation-contract-resolver");
const field_ownership_1 = require("../utils/field-ownership");
function valuesEqual(actual, expected) {
    if (Array.isArray(expected))
        return expected.some((candidate) => valuesEqual(actual, candidate));
    return actual === expected;
}
function conditionMatches(condition, config) {
    if (!condition)
        return true;
    const value = config[condition.field];
    if ('equals' in condition)
        return valuesEqual(value, condition.equals);
    if ('notEquals' in condition)
        return !valuesEqual(value, condition.notEquals);
    return true;
}
function recordConditionMatches(when, config) {
    if (!when || Object.keys(when).length === 0)
        return true;
    return Object.entries(when).every(([fieldName, expected]) => valuesEqual(config[fieldName], expected));
}
function requiredByResolvedContract(contract, fieldName, config) {
    if (contract.requiredFields.includes(fieldName))
        return true;
    return contract.conditionallyRequiredFields.some((condition) => condition.field === fieldName && recordConditionMatches(condition.when, config));
}
function isRequiredWhenMatched(field, config) {
    if (field.ui?.requiredIf)
        return conditionMatches(field.ui.requiredIf, config);
    if (Array.isArray(field.runtimeContract?.requiredWhen) && field.runtimeContract.requiredWhen.length > 0) {
        return field.runtimeContract.requiredWhen.some((condition) => conditionMatches(condition, config));
    }
    return field.required === true;
}
function hasInactiveRequiredCondition(field, config) {
    if (field.ui?.requiredIf && !conditionMatches(field.ui.requiredIf, config))
        return true;
    if (Array.isArray(field.runtimeContract?.requiredWhen) && field.runtimeContract.requiredWhen.length > 0) {
        return !field.runtimeContract.requiredWhen.some((condition) => conditionMatches(condition, config));
    }
    return false;
}
function activeByFieldConditions(fieldName, field, contract, config) {
    if (field.ui?.visibleIf && !conditionMatches(field.ui.visibleIf, config)) {
        return { active: false, reason: `hidden_by_visibleIf:${field.ui.visibleIf.field}` };
    }
    if (!(0, operation_contract_resolver_1.fieldIsActiveForOperation)(contract, fieldName)) {
        return { active: false, reason: `inactive_for_operation:${contract.operation}` };
    }
    if (contract.generated &&
        fieldName !== 'operation' &&
        fieldName !== 'resource' &&
        hasInactiveRequiredCondition(field, config)) {
        return { active: false, reason: `inactive_required_condition:${contract.operation}` };
    }
    return { active: true };
}
function pickActiveInputSchema(inputSchema, fieldPolicy) {
    const picked = {};
    for (const fieldName of fieldPolicy.activeFields) {
        if (inputSchema[fieldName])
            picked[fieldName] = inputSchema[fieldName];
    }
    return picked;
}
function resolveFieldPolicyForNode(def, config, effectiveFillModes = {}) {
    const inputSchema = def.inputSchema || {};
    const operationContract = (0, operation_contract_resolver_1.resolveOperationContract)(def, config);
    const fields = {};
    for (const [fieldName, field] of Object.entries(inputSchema)) {
        const condition = activeByFieldConditions(fieldName, field, operationContract, config);
        const credential = (0, field_ownership_1.isCredentialOwnership)(fieldName, field);
        const active = condition.active || credential;
        const allowsEmpty = active &&
            ((0, operation_contract_resolver_1.fieldAllowsEmptyValue)(operationContract, fieldName) ||
                field.runtimeContract?.validation?.allowEmpty === true ||
                operationContract.emptyValuePolicy[fieldName] === 'optional' ||
                operationContract.emptyValuePolicy[fieldName] === 'allow_empty');
        const required = active &&
            !allowsEmpty &&
            (requiredByResolvedContract(operationContract, fieldName, config) ||
                isRequiredWhenMatched(field, config));
        const sourcePolicy = operationContract.fieldSourcePolicy[fieldName] || field.runtimeContract?.sourcePolicy;
        const runtimeAiPolicy = operationContract.runtimeAiPolicy[fieldName];
        const protectedField = credential ||
            field.runtimeContract?.protected === true ||
            sourcePolicy?.manualOnly === true ||
            sourcePolicy?.systemOnly === true;
        const mode = effectiveFillModes[fieldName] || field.fillMode?.default || 'manual_static';
        const runtimeAiAllowed = active &&
            !protectedField &&
            runtimeAiPolicy?.allowed !== false &&
            field.runtimeContract?.aiGeneratable !== false &&
            field.fillMode?.supportsRuntimeAI !== false &&
            (mode === 'runtime_ai' || field.fillMode?.supportsRuntimeAI === true);
        const buildtimeAiAllowed = active &&
            !protectedField &&
            field.fillMode?.supportsBuildtimeAI !== false &&
            (mode === 'buildtime_ai_once' || field.fillMode?.supportsBuildtimeAI === true);
        fields[fieldName] = {
            active,
            required,
            allowsEmpty,
            runtimeAiAllowed,
            buildtimeAiAllowed,
            providerOwned: active && !credential && sourcePolicy?.systemOnly !== true,
            credential,
            reason: condition.reason || (operationContract.generated ? 'generated_contract' : `operation_contract:${operationContract.operation}`),
        };
    }
    const activeFields = Object.keys(fields).filter((fieldName) => fields[fieldName].active);
    const requiredFields = activeFields.filter((fieldName) => fields[fieldName].required);
    const providerDefaultFields = activeFields.filter((fieldName) => fields[fieldName].allowsEmpty);
    const credentialFields = activeFields.filter((fieldName) => fields[fieldName].credential);
    const optionalFields = activeFields.filter((fieldName) => !fields[fieldName].required && !credentialFields.includes(fieldName));
    const inactiveFields = Object.keys(fields).filter((fieldName) => !fields[fieldName].active);
    return {
        operation: operationContract.operation,
        resource: operationContract.resource,
        activeFields,
        requiredFields,
        optionalFields,
        inactiveFields,
        providerDefaultFields,
        credentialFields,
        diagnostics: operationContract.diagnostics || [],
        fields,
        operationContract,
    };
}
