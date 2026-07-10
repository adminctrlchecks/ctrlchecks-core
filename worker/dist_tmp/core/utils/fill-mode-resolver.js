"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAiOwnedFillMode = isAiOwnedFillMode;
exports.resolveEffectiveFieldFillMode = resolveEffectiveFieldFillMode;
exports.buildEffectiveFillModes = buildEffectiveFillModes;
exports.coerceFieldFillModeByPolicy = coerceFieldFillModeByPolicy;
exports.isMeaningfulStaticValue = isMeaningfulStaticValue;
const field_ownership_1 = require("./field-ownership");
function isAiOwnedFillMode(mode) {
    return mode === 'runtime_ai' || mode === 'buildtime_ai_once';
}
function resolveEffectiveFieldFillMode(fieldName, inputSchema, config) {
    let candidate = 'manual_static';
    const explicitMode = config?._fillMode?.[fieldName];
    if (explicitMode === 'manual_static' ||
        explicitMode === 'runtime_ai' ||
        explicitMode === 'buildtime_ai_once') {
        candidate = explicitMode;
    }
    else {
        const schemaDefault = inputSchema?.[fieldName]?.fillMode?.default;
        if (schemaDefault === 'manual_static' ||
            schemaDefault === 'runtime_ai' ||
            schemaDefault === 'buildtime_ai_once') {
            candidate = schemaDefault;
        }
    }
    const hasExplicitUserChoice = explicitMode === 'manual_static' ||
        explicitMode === 'runtime_ai' ||
        explicitMode === 'buildtime_ai_once';
    // When the user has explicitly chosen a fill mode, honor it unconditionally
    // except for true credential-locked fields. supportsRuntimeAI/supportsBuildtimeAI
    // are advisory schema defaults, not user-facing restrictions.
    if (hasExplicitUserChoice) {
        const fieldDef = inputSchema?.[fieldName];
        if (fieldDef && (0, field_ownership_1.isCredentialOwnership)(fieldName, fieldDef)) {
            const policy = fieldDef.credentialTogglePolicy ?? 'locked';
            const unlocked = policy === 'unlockable' && config?._ownershipUnlock?.[fieldName] === true;
            if (!unlocked && (candidate === 'runtime_ai' || candidate === 'buildtime_ai_once')) {
                return fieldDef.fillMode?.default ?? 'manual_static';
            }
        }
        return coerceFieldFillModeByPolicy(fieldName, candidate, inputSchema, config).mode;
    }
    return coerceFieldFillModeByPolicy(fieldName, candidate, inputSchema, config).mode;
}
function buildEffectiveFillModes(inputSchema, config) {
    const result = {};
    if (!inputSchema || typeof inputSchema !== 'object') {
        return result;
    }
    for (const fieldName of Object.keys(inputSchema)) {
        result[fieldName] = resolveEffectiveFieldFillMode(fieldName, inputSchema, config);
    }
    return result;
}
function coerceFieldFillModeByPolicy(fieldName, requestedMode, inputSchema, config) {
    const fieldDef = inputSchema?.[fieldName];
    if (fieldDef && (0, field_ownership_1.isCredentialOwnership)(fieldName, fieldDef)) {
        const policy = fieldDef.credentialTogglePolicy ?? 'locked';
        const unlocked = policy === 'unlockable' && config?._ownershipUnlock?.[fieldName] === true;
        if (!unlocked) {
            const fallbackMode = requestedMode === 'runtime_ai' || requestedMode === 'buildtime_ai_once'
                ? fieldDef.fillMode?.default || 'manual_static'
                : requestedMode;
            if (fallbackMode !== requestedMode) {
                return { mode: fallbackMode, coerced: true, reason: 'credential_locked' };
            }
        }
    }
    const fillMeta = fieldDef?.fillMode;
    if (!fillMeta) {
        return { mode: requestedMode, coerced: false };
    }
    if (requestedMode === 'runtime_ai' && fillMeta.supportsRuntimeAI === false) {
        return {
            mode: fillMeta.default === 'runtime_ai' ? 'manual_static' : fillMeta.default,
            coerced: true,
            reason: 'runtime_not_supported',
        };
    }
    if (requestedMode === 'buildtime_ai_once' && fillMeta.supportsBuildtimeAI === false) {
        return {
            mode: fillMeta.default === 'buildtime_ai_once' ? 'manual_static' : fillMeta.default,
            coerced: true,
            reason: 'buildtime_not_supported',
        };
    }
    return { mode: requestedMode, coerced: false };
}
function isMeaningfulStaticValue(value) {
    if (value === undefined || value === null)
        return false;
    if (typeof value === 'string')
        return value.trim().length > 0;
    if (Array.isArray(value))
        return value.length > 0;
    if (typeof value === 'object')
        return Object.keys(value).length > 0;
    return true;
}
