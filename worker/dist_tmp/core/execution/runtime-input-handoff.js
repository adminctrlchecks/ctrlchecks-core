"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFinalProviderConfig = buildFinalProviderConfig;
exports.getAuthoritativeInputs = getAuthoritativeInputs;
exports.mergeAuthoritativeInputs = mergeAuthoritativeInputs;
exports.createProviderExecutionContext = createProviderExecutionContext;
exports.validateRuntimeInputHandoff = validateRuntimeInputHandoff;
const operation_contract_resolver_1 = require("../operations/operation-contract-resolver");
const field_ownership_1 = require("../utils/field-ownership");
const runtime_field_contract_1 = require("./runtime-field-contract");
const RUNTIME_AUTHORITY_SOURCES = new Set([
    'runtime_ai',
    'field_directive_ai',
    'deterministic_runtime',
]);
function preview(fieldName, value) {
    const lower = fieldName.toLowerCase();
    if (lower.includes('credential') ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('password') ||
        lower.includes('apikey') ||
        lower.includes('api_key')) {
        return value === undefined ? undefined : '[MASKED]';
    }
    if (typeof value === 'string')
        return value.length > 160 ? `${value.slice(0, 160)}...` : value;
    if (Array.isArray(value))
        return value.length > 5 ? [...value.slice(0, 5), `... ${value.length - 5} more`] : value;
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).slice(0, 12);
        const out = Object.fromEntries(entries);
        const rest = Object.keys(value).length - entries.length;
        if (rest > 0)
            out.__truncatedKeys = rest;
        return out;
    }
    return value;
}
function isEqual(a, b) {
    if (a === b)
        return true;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    catch {
        return false;
    }
}
function ownershipFor(fieldName, inputSchema, effectiveFillModes) {
    const fieldDef = inputSchema[fieldName];
    if (fieldDef && (0, field_ownership_1.isCredentialOwnership)(fieldName, fieldDef))
        return 'credential';
    return effectiveFillModes[fieldName] || fieldDef?.fillMode?.default || 'manual_static';
}
function shouldResolvedValueOwnProviderInput(fieldName, inputSchema, effectiveFillModes, source) {
    const fieldDef = inputSchema[fieldName];
    if (fieldDef && (0, field_ownership_1.isCredentialOwnership)(fieldName, fieldDef) && source !== 'credential') {
        return false;
    }
    if (effectiveFillModes[fieldName] === 'runtime_ai')
        return true;
    return !!source && RUNTIME_AUTHORITY_SOURCES.has(source);
}
function buildFinalProviderConfig(params) {
    const config = { ...(params.baseConfig || {}) };
    const appliedFields = [];
    if (params.fieldPolicy) {
        for (const fieldName of params.fieldPolicy.inactiveFields) {
            delete config[fieldName];
        }
    }
    for (const [fieldName, value] of Object.entries(params.finalResolvedInputs || {})) {
        if (value === undefined)
            continue;
        if (params.fieldPolicy?.fields[fieldName]?.active === false)
            continue;
        const source = params.inputSources[fieldName];
        const shouldOwn = shouldResolvedValueOwnProviderInput(fieldName, params.inputSchema, params.effectiveFillModes, source);
        if (shouldOwn) {
            config[fieldName] = value;
            appliedFields.push(fieldName);
            continue;
        }
        if (!Object.prototype.hasOwnProperty.call(config, fieldName) || (0, runtime_field_contract_1.isRuntimeEmptyValue)(config[fieldName])) {
            config[fieldName] = value;
            appliedFields.push(fieldName);
        }
    }
    return { config, appliedFields };
}
function getAuthoritativeInputs(context) {
    return (context.finalResolvedInputs || context.inputs || {});
}
function mergeAuthoritativeInputs(context) {
    return {
        ...(context.config || {}),
        ...getAuthoritativeInputs(context),
    };
}
function createProviderExecutionContext(context) {
    return {
        finalResolvedInputs: getAuthoritativeInputs(context),
        resolvedInputSources: context.resolvedInputSources || {},
        fieldContracts: context.fieldContracts,
        operationContract: context.operationContract,
        operation: context.operation,
        credentials: context.credentials,
        rawUpstreamInput: context.rawUpstreamInput,
        lineageContext: context.lineageContext,
        handoffAudit: context.runtimeInputHandoffAudit,
    };
}
function validateRuntimeInputHandoff(params) {
    const errors = [];
    const audit = [];
    for (const [fieldName, resolvedValue] of Object.entries(params.finalResolvedInputs || {})) {
        if (params.fieldPolicy?.fields[fieldName]?.active === false) {
            audit.push({
                nodeId: params.nodeId,
                nodeType: params.nodeType,
                fieldName,
                ownership: ownershipFor(fieldName, params.inputSchema, params.effectiveFillModes),
                expectedRole: params.inputSchema[fieldName]?.runtimeContract?.role || params.inputSchema[fieldName]?.role,
                resolvedSource: params.inputSources[fieldName],
                resolvedValuePreview: preview(fieldName, resolvedValue),
                finalProviderValuePreview: undefined,
                validationStatus: 'valid',
                handoffStatus: 'not_applicable',
            });
            continue;
        }
        const source = params.inputSources[fieldName];
        const ownership = ownershipFor(fieldName, params.inputSchema, params.effectiveFillModes);
        const providerValue = params.providerConfig[fieldName];
        const shouldOwn = shouldResolvedValueOwnProviderInput(fieldName, params.inputSchema, params.effectiveFillModes, source);
        let handoffStatus = 'not_applicable';
        let blockedReason;
        if (shouldOwn) {
            if ((0, runtime_field_contract_1.isRuntimeEmptyValue)(providerValue)) {
                if (params.operationContract && (0, operation_contract_resolver_1.fieldAllowsEmptyValue)(params.operationContract, fieldName)) {
                    handoffStatus = 'accepted_empty_provider_default';
                }
                else if (source === 'deterministic_runtime') {
                    // deterministic_runtime values are runtime fallbacks (e.g. narrative text picked from
                    // upstream output). The node's own execute() re-derives them via getAuthoritativeInputs,
                    // so a missing providerConfig entry is not a hard failure — just an audit note.
                    handoffStatus = 'accepted_empty_provider_default';
                }
                else {
                    handoffStatus = 'missing';
                    blockedReason = `Runtime handoff failed: ${fieldName} was resolved from ${source || ownership} but was not delivered to provider.`;
                }
            }
            else if (!isEqual(resolvedValue, providerValue)) {
                handoffStatus = 'mismatch';
                blockedReason = `Runtime handoff failed: ${fieldName} was resolved from ${source || ownership} but provider received a different value.`;
            }
            else {
                handoffStatus = 'delivered';
            }
        }
        if (blockedReason)
            errors.push(blockedReason);
        audit.push({
            nodeId: params.nodeId,
            nodeType: params.nodeType,
            fieldName,
            ownership,
            expectedRole: params.inputSchema[fieldName]?.runtimeContract?.role || params.inputSchema[fieldName]?.role,
            resolvedSource: source,
            resolvedValuePreview: preview(fieldName, resolvedValue),
            finalProviderValuePreview: preview(fieldName, providerValue),
            validationStatus: blockedReason ? 'invalid' : 'valid',
            handoffStatus,
            blockedReason,
        });
    }
    return { valid: errors.length === 0, errors, audit };
}
