"use strict";
/**
 * ✅ FORM TRIGGER NODE - Migrated to Registry
 *
 * Form submission trigger.
 * Returns form data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFormTriggerOutput = normalizeFormTriggerOutput;
exports.overrideFormTrigger = overrideFormTrigger;
/** Meta keys that carry submission envelope metadata, not user field values. */
const FORM_META_KEYS = new Set([
    '_form', '_chat', 'nodeId', 'submitted_at', 'form', 'data', 'files', 'meta', 'trigger',
]);
/**
 * Normalize a form submission input into a clean field-value map.
 *
 * Handles two input shapes:
 *  - trigger-service: { _form: true, nodeId, email, data: { email } }
 *  - local form-trigger resume: { submitted_at, form: {...}, data: { email } }
 *
 * Returns the `data` sub-object when non-empty, otherwise extracts
 * top-level keys excluding meta/envelope keys.
 */
function normalizeFormTriggerOutput(input) {
    if (typeof input !== 'object' || input === null)
        return {};
    const obj = input;
    // Prefer explicit data sub-object when non-empty
    if (obj.data && typeof obj.data === 'object' && obj.data !== null) {
        const dataObj = obj.data;
        if (Object.keys(dataObj).length > 0)
            return dataObj;
    }
    // Fall back: extract top-level user fields, excluding meta keys and _-prefixed keys
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
        if (!FORM_META_KEYS.has(k) && !k.startsWith('_')) {
            result[k] = v;
        }
    }
    return result;
}
function overrideFormTrigger(def, schema) {
    const inputSchema = {
        ...def.inputSchema,
        formTitle: def.inputSchema.formTitle
            ? {
                ...def.inputSchema.formTitle,
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
                ownership: 'structural',
            }
            : def.inputSchema.formTitle,
        fields: def.inputSchema.fields
            ? {
                ...def.inputSchema.fields,
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
                ownership: 'structural',
                role: 'raw_json',
            }
            : def.inputSchema.fields,
        formDescription: def.inputSchema.formDescription
            ? {
                ...def.inputSchema.formDescription,
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
                ownership: 'value',
            }
            : def.inputSchema.formDescription,
        submitButtonText: def.inputSchema.submitButtonText
            ? {
                ...def.inputSchema.submitButtonText,
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
                ownership: 'value',
            }
            : def.inputSchema.submitButtonText,
        successMessage: def.inputSchema.successMessage
            ? {
                ...def.inputSchema.successMessage,
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
                ownership: 'value',
            }
            : def.inputSchema.successMessage,
        allowMultipleSubmissions: def.inputSchema.allowMultipleSubmissions
            ? {
                ...def.inputSchema.allowMultipleSubmissions,
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: false,
                },
                ownership: 'structural',
            }
            : def.inputSchema.allowMultipleSubmissions,
        requireAuthentication: def.inputSchema.requireAuthentication
            ? {
                ...def.inputSchema.requireAuthentication,
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: false,
                },
                ownership: 'structural',
            }
            : def.inputSchema.requireAuthentication,
        captcha: def.inputSchema.captcha
            ? {
                ...def.inputSchema.captcha,
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: false,
                },
                ownership: 'structural',
            }
            : def.inputSchema.captcha,
    };
    return {
        ...def,
        inputSchema,
        execute: async (context) => {
            const { input } = context;
            // Extract input object
            const inputObj = typeof input === 'object' && input !== null && !Array.isArray(input)
                ? input
                : {};
            return {
                success: true,
                output: normalizeFormTriggerOutput(inputObj),
            };
        },
    };
}
