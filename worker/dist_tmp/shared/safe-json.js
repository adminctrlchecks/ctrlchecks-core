"use strict";
/**
 * Safe JSON parsing utilities
 * Prevents crashes from malformed JSON and provides consistent error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeParse = safeParse;
exports.safeParseWithDefault = safeParseWithDefault;
exports.safeStringify = safeStringify;
exports.safeDeepClone = safeDeepClone;
exports.isValidJSON = isValidJSON;
/**
 * Safely parse JSON string, returning null on error
 */
function safeParse(json, defaultValue = null) {
    if (!json || typeof json !== 'string') {
        return defaultValue;
    }
    try {
        const parsed = JSON.parse(json);
        return parsed;
    }
    catch (error) {
        console.warn('[SafeJSON] Failed to parse JSON:', error instanceof Error ? error.message : String(error));
        return defaultValue;
    }
}
/**
 * Safely parse JSON string, returning default value on error
 */
function safeParseWithDefault(json, defaultValue) {
    const parsed = safeParse(json, null);
    return parsed !== null ? parsed : defaultValue;
}
/**
 * Safely stringify object, returning empty string on error
 */
function safeStringify(obj, defaultValue = '') {
    try {
        return JSON.stringify(obj);
    }
    catch (error) {
        console.warn('[SafeJSON] Failed to stringify object:', error instanceof Error ? error.message : String(error));
        return defaultValue;
    }
}
/**
 * Safely deep clone object using JSON (handles circular references)
 */
function safeDeepClone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    }
    catch (error) {
        console.warn('[SafeJSON] Failed to deep clone object:', error instanceof Error ? error.message : String(error));
        return null;
    }
}
/**
 * Check if string is valid JSON without parsing
 */
function isValidJSON(str) {
    if (!str || typeof str !== 'string') {
        return false;
    }
    try {
        JSON.parse(str);
        return true;
    }
    catch {
        return false;
    }
}
