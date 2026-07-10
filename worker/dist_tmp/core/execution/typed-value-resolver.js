"use strict";
/**
 * Typed Value Resolver
 *
 * Resolves template expressions while preserving types.
 * Unlike resolveTemplate which always returns strings, this preserves:
 * - numbers as numbers
 * - booleans as booleans
 * - objects as objects
 * - strings as strings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBareFieldPathString = isBareFieldPathString;
exports.resolveTypedValue = resolveTypedValue;
exports.resolveWithSchema = resolveWithSchema;
const typed_execution_context_1 = require("./typed-execution-context");
const object_utils_1 = require("../utils/object-utils");
/**
 * Bare field paths (no {{ }}) used by structured If/Else conditions, e.g. `age`, `data.qty`, `$json.status`.
 * Excludes spaces and arbitrary prose so literal strings still pass through unchanged.
 */
const BARE_FIELD_PATH_RE = /^(?:\$json\.|json\.)?(?:[a-zA-Z_$][\w$]*)(?:\.[a-zA-Z_$][\w$]*)*$/;
function isBareFieldPathString(s) {
    const t = s.trim();
    return t.length > 0 && BARE_FIELD_PATH_RE.test(t);
}
/**
 * Resolve a template expression with type preservation
 *
 * Examples:
 * - "{{input.age}}" where age is 25 → returns 25 (number)
 * - "{{input.name}}" where name is "John" → returns "John" (string)
 * - "{{input.active}}" where active is true → returns true (boolean)
 * - "Hello {{input.name}}" → returns "Hello John" (string interpolation)
 */
function resolveTypedValue(template, context) {
    // If no template syntax, try resolving as a bare field path (structured If/Else: field / leftValue)
    if (!template.includes('{{')) {
        if (typeof template === 'string' && isBareFieldPathString(template)) {
            const path = template.trim();
            const resolved = (0, typed_execution_context_1.getContextValue)(context, path);
            if (resolved !== undefined) {
                return resolved;
            }
        }
        return template;
    }
    // Check if entire template is a single expression
    const singleExpressionMatch = template.match(/^\{\{([^}]+)\}\}$/);
    if (singleExpressionMatch) {
        // Single expression - return typed value
        const path = singleExpressionMatch[1].trim();
        const value = (0, typed_execution_context_1.getContextValue)(context, path);
        return value !== undefined ? value : null;
    }
    // Multiple expressions or mixed text - resolve as string
    const allOutputs = (0, typed_execution_context_1.getAllNodeOutputs)(context);
    return resolveStringTemplate(template, allOutputs);
}
/**
 * Resolve string template with multiple expressions
 */
function resolveStringTemplate(template, context) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const trimmedPath = path.trim();
        const value = (0, object_utils_1.getNestedValue)(context, trimmedPath);
        if (value === null || value === undefined) {
            return '';
        }
        // Convert to string for interpolation
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    });
}
/**
 * Resolve value with schema-driven type casting
 *
 * If schema specifies a type, cast the value accordingly.
 * Otherwise, preserve the original type.
 */
function resolveWithSchema(template, context, expectedType) {
    const resolved = resolveTypedValue(template, context);
    if (!expectedType) {
        return resolved;
    }
    // Cast to expected type
    switch (expectedType) {
        case 'number':
            return toNumber(resolved);
        case 'boolean':
            return toBoolean(resolved);
        case 'string':
            return String(resolved);
        case 'array':
            return toArray(resolved);
        case 'object':
            return toObject(resolved);
        default:
            return resolved;
    }
}
function toNumber(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'boolean')
        return value ? 1 : 0;
    return 0;
}
function toBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes')
            return true;
        if (lower === 'false' || lower === '0' || lower === 'no')
            return false;
    }
    if (typeof value === 'number')
        return value !== 0;
    return Boolean(value);
}
function toArray(value) {
    if (Array.isArray(value))
        return value;
    if (typeof value === 'object' && value !== null) {
        const obj = value;
        if (obj.rows && Array.isArray(obj.rows))
            return obj.rows;
        if (obj.data && Array.isArray(obj.data))
            return obj.data;
        if (obj.items && Array.isArray(obj.items))
            return obj.items;
        return Object.values(obj);
    }
    return [value];
}
function toObject(value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value;
    }
    if (Array.isArray(value)) {
        const obj = {};
        value.forEach((item, index) => {
            obj[index.toString()] = item;
        });
        return obj;
    }
    return { value };
}
