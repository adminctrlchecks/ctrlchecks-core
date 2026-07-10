"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRuntimeEmptyValue = isRuntimeEmptyValue;
exports.enforceRuntimeFieldContracts = enforceRuntimeFieldContracts;
const google_sheets_write_values_1 = require("../../shared/google-sheets-write-values");
const recipient_resolver_1 = require("../utils/recipient-resolver");
const EMAIL_FIELD_RE = /(email|e-mail|gmail|recipient|to)$/i;
const PLACEHOLDER_TEXT_RE = /\{\{[^}]+\}\}|\[insert\b|\[add\b|\[fill\b|\[enter\b|\[.*here\]|not configured|filled automatically|to be generated|will be generated|placeholder/i;
const A1_RANGE_RE = /^(?:[A-Za-z]+\d+(?::[A-Za-z]+\d+)?|[A-Za-z]+(?::[A-Za-z]+)?|\d+(?::\d+)?)$/;
function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function preview(value) {
    if (typeof value === 'string')
        return value.length > 160 ? `${value.slice(0, 160)}...` : value;
    if (Array.isArray(value))
        return value.length > 5 ? [...value.slice(0, 5), `... ${value.length - 5} more`] : value;
    if (isPlainObject(value)) {
        const entries = Object.entries(value).slice(0, 12);
        const out = Object.fromEntries(entries);
        const rest = Object.keys(value).length - entries.length;
        if (rest > 0)
            out.__truncatedKeys = rest;
        return out;
    }
    return value;
}
function isRuntimeEmptyValue(value) {
    if (value === undefined || value === null)
        return true;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed)
            return true;
        const lower = trimmed.toLowerCase();
        if (['v', 'n/a', 'na', 'none', 'null', 'undefined', 'not configured'].includes(lower)) {
            return true;
        }
        // A value that starts with a real URL scheme is never placeholder-like regardless of
        // what words appear in the domain (e.g. jsonplaceholder.typicode.com is a real API).
        // Only reject URLs that contain unresolved template tokens like {{url}}.
        if (/^https?:\/\//i.test(trimmed)) {
            return /\{\{[^}]+\}\}/i.test(trimmed);
        }
        // Long strings (>150 chars) are never unfilled placeholder markers — they are real content.
        // AI-generated summaries describing "placeholder data" or "JSONPlaceholder API" must not
        // be classified as empty/placeholder just because they contain the word "placeholder".
        if (trimmed.length > 150) {
            return /\{\{[^}]+\}\}/.test(trimmed);
        }
        return PLACEHOLDER_TEXT_RE.test(trimmed);
    }
    if (Array.isArray(value))
        return value.length === 0;
    if (isPlainObject(value))
        return Object.keys(value).length === 0;
    return false;
}
function conditionMatches(condition, resolved, config) {
    const value = resolved[condition.field] ?? config[condition.field];
    if ('equals' in condition)
        return value === condition.equals;
    if ('notEquals' in condition)
        return value !== condition.notEquals;
    return true;
}
function fieldRequiredByContract(fieldName, fieldDef, resolved, config) {
    if (fieldDef.required)
        return true;
    const uiRequired = fieldDef.ui?.requiredIf;
    if (uiRequired && conditionMatches(uiRequired, resolved, config))
        return true;
    const contractRequired = fieldDef.runtimeContract?.requiredWhen;
    return Array.isArray(contractRequired) && contractRequired.some((c) => conditionMatches(c, resolved, config));
}
function groupSatisfied(fieldName, fieldDef, resolved, inputSchema) {
    const group = fieldDef.runtimeContract?.requiredGroup;
    if (!group)
        return false;
    return Object.entries(inputSchema).some(([otherField, otherDef]) => {
        if (otherField === fieldName)
            return false;
        return otherDef.runtimeContract?.requiredGroup === group && !isRuntimeEmptyValue(resolved[otherField]);
    });
}
function fieldFormats(fieldDef) {
    const validation = fieldDef.runtimeContract?.validation;
    return [
        ...(validation?.format ? [validation.format] : []),
        ...(Array.isArray(validation?.formats) ? validation.formats : []),
    ];
}
function isValidA1Range(value) {
    if (typeof value !== 'string')
        return false;
    const trimmed = value.trim();
    if (!trimmed)
        return true;
    const rangePart = trimmed.includes('!') ? trimmed.split('!').pop() || '' : trimmed;
    return A1_RANGE_RE.test(rangePart.trim());
}
function isRows(value) {
    return (Array.isArray(value) &&
        value.length > 0 &&
        value.some((row) => Array.isArray(row)
            ? row.some((cell) => !isRuntimeEmptyValue(cell))
            : !isRuntimeEmptyValue(row)));
}
function isValidConditions(value) {
    return (Array.isArray(value) &&
        value.length > 0 &&
        value.every((condition) => {
            if (!isPlainObject(condition))
                return false;
            return (typeof condition.field === 'string' &&
                condition.field.trim().length > 0 &&
                typeof condition.operator === 'string' &&
                condition.operator.trim().length > 0 &&
                Object.prototype.hasOwnProperty.call(condition, 'value'));
        }));
}
function isValidSwitchCases(value) {
    return (Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => {
            if (!isPlainObject(item))
                return false;
            return !isRuntimeEmptyValue(item.value);
        }));
}
function validateFormat(value, format) {
    if (format === 'non_empty' && isRuntimeEmptyValue(value))
        return 'value is empty';
    if (format === 'email_list' && (0, recipient_resolver_1.parseRecipientEmails)(value).length === 0)
        return 'no valid email address found';
    if (format === 'a1_range' && !isValidA1Range(value))
        return 'range must be blank or valid A1 notation';
    if (format === 'row_values' && !isRows(value))
        return 'row values must be a non-empty array';
    if (format === 'object_payload' && (!isPlainObject(value) || Object.keys(value).length === 0))
        return 'object payload is empty';
    if (format === 'conditions' && !isValidConditions(value))
        return 'conditions must be non-empty rules with field, operator, and value';
    if (format === 'switch_cases' && !isValidSwitchCases(value))
        return 'switch cases must be non-empty objects with value';
    if (format === 'code' && (typeof value !== 'string' || value.trim().length < 10))
        return 'code is missing or too short';
    if (format === 'url') {
        if (typeof value !== 'string')
            return 'URL must be a string';
        try {
            new URL(value);
        }
        catch {
            return 'URL is invalid';
        }
    }
    if (format === 'number' && typeof value !== 'number')
        return 'value must be a number';
    if (format === 'boolean' && typeof value !== 'boolean')
        return 'value must be a boolean';
    if (format === 'array_min_length' && (!Array.isArray(value) || value.length === 0)) {
        return 'array must contain at least one item';
    }
    return undefined;
}
function flattenValues(value, out = [], depth = 0) {
    if (depth > 5 || value === undefined || value === null)
        return out;
    if (typeof value === 'string') {
        out.push(value);
        return out;
    }
    if (Array.isArray(value)) {
        for (const item of value)
            flattenValues(item, out, depth + 1);
        return out;
    }
    if (isPlainObject(value)) {
        for (const item of Object.values(value))
            flattenValues(item, out, depth + 1);
    }
    return out;
}
function extractEmailsFromLineage(context) {
    const textParts = [
        context.workflowIntent || '',
        ...flattenValues(context.upstreamPayload),
        ...flattenValues(context.allOutputs || {}),
    ];
    const emails = textParts.flatMap((part) => (0, recipient_resolver_1.extractEmailsFromText)(part));
    return Array.from(new Set(emails));
}
function repairField(params) {
    const { fieldName, fieldDef, resolved, context } = params;
    const strategies = fieldDef.runtimeContract?.repair || [];
    const repairs = [];
    const warnings = [];
    let value = resolved[fieldName];
    for (const strategy of strategies) {
        if (strategy === 'extract_email' && isRuntimeEmptyValue(value)) {
            const emails = extractEmailsFromLineage(context);
            if (emails.length > 0) {
                value = emails;
                repairs.push(`${fieldName} repaired from lineage email detection`);
            }
        }
        if (strategy === 'object_to_row_values' && !isRows(value)) {
            const rows = (0, google_sheets_write_values_1.normalizeGoogleSheetsWriteValues)({
                values: value,
                data: resolved.data,
                fallbackInput: context.upstreamPayload,
            });
            if (rows.length > 0) {
                value = rows;
                repairs.push(`${fieldName} repaired by converting object payload to row values`);
            }
        }
        if (strategy === 'clear_invalid_optional') {
            const invalid = fieldFormats(fieldDef)
                .map((format) => validateFormat(value, format))
                .some(Boolean);
            const required = fieldRequiredByContract(fieldName, fieldDef, resolved, context.config);
            if (invalid && !required) {
                value = '';
                repairs.push(`${fieldName} cleared because optional value was invalid`);
            }
            else if (invalid) {
                warnings.push(`${fieldName} is invalid and cannot be cleared because it is required`);
            }
        }
        if (strategy === 'derive_title' && isRuntimeEmptyValue(value)) {
            const source = String(resolved.body || resolved.message || resolved.text || context.workflowIntent || '').trim();
            if (source) {
                value = source.split(/\r?\n/)[0].replace(/\s+/g, ' ').slice(0, 100);
                repairs.push(`${fieldName} derived from body/message/intent`);
            }
        }
        if (strategy === 'derive_body' && isRuntimeEmptyValue(value)) {
            const name = flattenValues(context.upstreamPayload).find((part) => part.length > 2 && !part.includes('@'));
            const intent = context.workflowIntent || 'your workflow submission';
            value = name ? `Hi ${name},\n\n${intent}` : intent;
            repairs.push(`${fieldName} derived from workflow intent`);
        }
        if (strategy === 'derive_condition' && isRuntimeEmptyValue(value)) {
            const intent = (context.workflowIntent || '').toLowerCase();
            const payload = isPlainObject(context.upstreamPayload) ? context.upstreamPayload : {};
            const ageKey = Object.keys(payload).find((k) => k.toLowerCase().includes('age'));
            if (ageKey && /\b(18|adult|greater|above|eligible)\b/.test(intent)) {
                value = [{ field: `$json.${ageKey}`, operator: 'greater_than_or_equal', value: 18 }];
                repairs.push(`${fieldName} derived from intent and upstream age field`);
            }
        }
    }
    return { value, repaired: repairs.length > 0, repairs, warnings };
}
function fieldHasInvalidExample(value, fieldDef) {
    const examples = fieldDef.runtimeContract?.invalidExamples || [];
    return examples.some((example) => JSON.stringify(example) === JSON.stringify(value));
}
function formatDefault(fieldName, fieldDef) {
    const lower = fieldName.toLowerCase();
    const type = String(fieldDef.type || '').toLowerCase();
    const emailAddressLike = lower === 'to' ||
        lower.endsWith('email') ||
        lower.endsWith('emails') ||
        lower.endsWith('emailaddress') ||
        lower.endsWith('emailaddresses') ||
        EMAIL_FIELD_RE.test(lower);
    const canHoldEmailValue = ['string', 'array', 'json'].includes(type) || !type;
    if (canHoldEmailValue && emailAddressLike)
        return 'email_list';
    if (lower.includes('range'))
        return 'a1_range';
    if (lower === 'conditions')
        return 'conditions';
    if (lower === 'cases')
        return 'switch_cases';
    if (lower === 'code')
        return 'code';
    return undefined;
}
function enforceRuntimeFieldContracts(resolvedInputs, inputSources, context) {
    const resolved = { ...resolvedInputs };
    const sources = { ...inputSources };
    const repairs = [];
    const warnings = [];
    const errors = [];
    const audit = [];
    for (const [fieldName, fieldDef] of Object.entries(context.inputSchema || {})) {
        const fillMode = context.effectiveFillModes[fieldName] || 'manual_static';
        const required = fieldRequiredByContract(fieldName, fieldDef, resolved, context.config);
        const allowEmpty = fieldDef.runtimeContract?.validation?.allowEmpty === true;
        const protectedField = fieldDef.runtimeContract?.protected === true || fieldDef.ownership === 'credential';
        const repair = repairField({ fieldName, fieldDef, resolved, context });
        if (repair.repaired) {
            resolved[fieldName] = repair.value;
            sources[fieldName] = 'deterministic_runtime';
            repairs.push(...repair.repairs);
        }
        warnings.push(...repair.warnings);
        const value = resolved[fieldName];
        const source = sources[fieldName];
        const fieldErrors = [];
        if (protectedField && (source === 'runtime_ai' || source === 'field_directive_ai')) {
            fieldErrors.push(`${fieldName}: runtime AI cannot generate protected field`);
        }
        if (fillMode === 'runtime_ai' && source === 'static_config' && required) {
            fieldErrors.push(`${fieldName}: runtime_ai field cannot be satisfied by static_config`);
        }
        if (fillMode === 'runtime_ai' && source === 'template' && required) {
            fieldErrors.push(`${fieldName}: runtime_ai field cannot be satisfied by template`);
        }
        const empty = isRuntimeEmptyValue(value) || fieldHasInvalidExample(value, fieldDef);
        if (empty && required && !allowEmpty && !groupSatisfied(fieldName, fieldDef, resolved, context.inputSchema)) {
            fieldErrors.push(`${fieldName} is required but empty or placeholder-like`);
        }
        const formats = [...fieldFormats(fieldDef)];
        const inferred = formatDefault(fieldName, fieldDef);
        if (inferred && !formats.includes(inferred))
            formats.push(inferred);
        if (!empty || required) {
            for (const format of formats) {
                const formatError = validateFormat(value, format);
                if (formatError && !(allowEmpty && empty)) {
                    if (groupSatisfied(fieldName, fieldDef, resolved, context.inputSchema))
                        continue;
                    fieldErrors.push(`${fieldName}: ${formatError}`);
                }
            }
        }
        errors.push(...fieldErrors);
        audit.push({
            field: fieldName,
            fillMode,
            expectedRole: fieldDef.runtimeContract?.role || fieldDef.role,
            expectedCardinality: fieldDef.runtimeContract?.cardinality,
            source,
            valid: fieldErrors.length === 0,
            repaired: repair.repaired,
            errors: fieldErrors,
            preview: preview(value),
        });
    }
    return { resolvedInputs: resolved, inputSources: sources, repairs, warnings, errors, audit };
}
