"use strict";
/**
 * INPUT GUARANTEE
 *
 * Ensures every node receives schema-valid, complete input: required fields present,
 * types correct. Uses strict validation and deterministic completion from previous
 * node output (metadata, exact key, KEY_ALIASES) so output is guaranteed even when
 * AI fails or returns incomplete JSON.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateResolvedInput = validateResolvedInput;
exports.guaranteeInputForSchema = guaranteeInputForSchema;
const type_converter_1 = require("../utils/type-converter");
const field_ownership_1 = require("../utils/field-ownership");
const system_key_filter_1 = require("./system-key-filter");
/** Key aliases: expected key -> candidate keys in previous output (same as runtime-input-adapter). */
const KEY_ALIASES = {
    number: ['num', 'number', 'value', 'n', 'inputData', 'input'],
    num: ['number', 'num', 'value'],
    age: ['age', 'userAge', 'user_age', 'years'],
    userAge: ['age', 'userAge'],
    value: ['value', 'number', 'num', 'inputData', 'data'],
    inputData: ['inputData', 'data', 'value', 'number', 'json'],
    message: ['message', 'text', 'body', 'content', 'msg'],
    text: ['message', 'text', 'body', 'content'],
    body: ['body', 'message', 'text', 'content'],
    name: ['name', 'username', 'userName', 'fullName'],
    email: ['email', 'mail', 'emailAddress'],
    result: ['result', 'output', 'response', 'data'],
    output: ['output', 'result', 'response'],
    response: ['response', 'result', 'output', 'body'],
    subject: ['title', 'heading', 'subjectLine', 'emailSubject', 'summary'],
    title: ['subject', 'heading', 'emailSubject'],
};
function getCandidateActualKeys(expectedKey) {
    const lower = expectedKey.toLowerCase();
    const candidates = [expectedKey];
    for (const [canon, aliases] of Object.entries(KEY_ALIASES)) {
        if (canon === expectedKey || aliases.includes(expectedKey)) {
            candidates.push(canon, ...aliases);
        }
        if (aliases.some(a => a.toLowerCase() === lower)) {
            candidates.push(canon, ...aliases);
        }
    }
    return [...new Set(candidates)];
}
function getValueType(v) {
    if (v === null)
        return 'null';
    if (v === undefined)
        return 'undefined';
    if (Array.isArray(v))
        return 'array';
    return typeof v;
}
function isTypeCompatible(actual, expected) {
    if (actual === expected)
        return true;
    if (expected === 'string')
        return true;
    // 'expression' is a string-valued template field — treat it as compatible with any string value
    if (expected === 'expression')
        return true;
    if (expected === 'number' && (actual === 'string' || actual === 'number'))
        return true;
    if (expected === 'boolean' && (actual === 'string' || actual === 'number' || actual === 'boolean'))
        return true;
    if (expected === 'object' && actual === 'object')
        return true;
    if (expected === 'array' && actual === 'array')
        return true;
    if (expected === 'json' && (actual === 'object' || actual === 'array'))
        return true;
    return false;
}
/**
 * Validate that resolved object has all required fields with correct types.
 */
function validateResolvedInput(resolved, inputSchema, requiredInputs) {
    const errors = [];
    for (const fieldName of requiredInputs) {
        const fieldDef = inputSchema[fieldName];
        if (!fieldDef)
            continue;
        const value = resolved[fieldName];
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            errors.push(`Required field '${fieldName}' is missing or empty`);
            continue;
        }
        const actualType = getValueType(value);
        const expectedType = (fieldDef.type || 'string');
        if (!isTypeCompatible(actualType, expectedType)) {
            errors.push(`Field '${fieldName}' has wrong type: ${actualType}, expected ${expectedType}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Fill missing or wrong-type fields from previous output using metadata, exact key, then KEY_ALIASES; coerce to schema type.
 * Returns a new object that has every required field set and types aligned to the schema.
 */
function guaranteeInputForSchema(options) {
    const { resolved, previousOutput, inputSchema, requiredInputs, mappingMetadata, fieldFillModes } = options;
    // Strip system/audit metadata keys so they cannot be matched to node input fields.
    // Without this, keys like `nodeId`, `nodeType`, `result` get mapped to `from`, `body`, `subject` etc.
    const rawPrev = previousOutput != null && typeof previousOutput === 'object' ? previousOutput : {};
    const prev = (0, system_key_filter_1.stripSystemKeys)(rawPrev);
    const out = { ...resolved };
    const schemaKeys = Object.keys(inputSchema);
    const fieldsToEnsure = [...new Set([...requiredInputs, ...schemaKeys])];
    for (const fieldName of fieldsToEnsure) {
        const fieldDef = inputSchema[fieldName];
        if (!fieldDef)
            continue;
        const current = out[fieldName];
        const expectedType = (fieldDef.type || 'string');
        const needFill = current === undefined ||
            current === null ||
            (typeof current === 'string' && current.trim() === '') ||
            !isTypeCompatible(getValueType(current), fieldDef.type || 'string');
        const structuralField = (0, field_ownership_1.isStructuralOwnership)(fieldName, fieldDef);
        // If field already has a usable value, just coerce to expected type.
        if (!needFill) {
            const coerced = coerce(current, expectedType, fieldName);
            if (coerced !== undefined)
                out[fieldName] = coerced;
            continue;
        }
        // Respect explicit manual_static fill modes: do NOT auto-fill these fields
        // from previous output or defaults. They must be supplied externally.
        if (fieldFillModes && fieldFillModes[fieldName] === 'manual_static') {
            continue;
        }
        // Title-like fields: derive a short line from upstream AI plain-text `response` when present.
        if (fieldDef.role === 'title_like' &&
            typeof prev.response === 'string' &&
            prev.response.trim().length > 0) {
            const line = prev.response.split(/\r?\n/)[0]?.trim().slice(0, 100) ?? '';
            if (line.length > 0) {
                const coercedTitle = coerce(line, expectedType, fieldName);
                if (coercedTitle !== undefined) {
                    out[fieldName] = coercedTitle;
                    continue;
                }
            }
        }
        let value = undefined;
        if (mappingMetadata?.[fieldName]?.selectedUpstreamKey) {
            const key = mappingMetadata[fieldName].selectedUpstreamKey;
            value = prev[key];
        }
        if (value === undefined && prev[fieldName] !== undefined) {
            value = prev[fieldName];
        }
        if (value === undefined) {
            const candidates = getCandidateActualKeys(fieldName);
            for (const c of candidates) {
                if (prev[c] !== undefined) {
                    value = prev[c];
                    break;
                }
            }
        }
        if (value === undefined && fieldDef.default !== undefined) {
            value = fieldDef.default;
        }
        if (value === undefined && !structuralField) {
            value = getSchemaTypeFallback(fieldDef);
        }
        const coerced = value !== undefined ? coerce(value, expectedType, fieldName) : undefined;
        if (coerced !== undefined) {
            out[fieldName] = coerced;
        }
    }
    return out;
}
function coerce(value, expectedType, fieldName) {
    const result = (0, type_converter_1.convertToType)(value, expectedType, fieldName);
    return result.success ? result.value : value;
}
function getSchemaTypeFallback(fieldDef) {
    const expectedType = (fieldDef.type || 'string');
    if (expectedType === 'array') {
        return [];
    }
    if (expectedType === 'object' || expectedType === 'json') {
        return {};
    }
    if (expectedType === 'number')
        return 0;
    if (expectedType === 'boolean')
        return false;
    return '';
}
