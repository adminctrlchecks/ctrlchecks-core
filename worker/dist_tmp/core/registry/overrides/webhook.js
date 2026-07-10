"use strict";
/**
 * ✅ WEBHOOK TRIGGER NODE - Migrated to Registry
 *
 * Webhook trigger returns webhook payload with query params and headers.
 * Used for HTTP webhook-based workflow triggers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideWebhook = overrideWebhook;
function overrideWebhook(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use rawInput — the incoming webhook payload from the HTTP handler.
            // context.input does not exist on NodeExecutionContext; the correct field is rawInput.
            const rawInput = context.rawInput;
            const inputObj = typeof rawInput === 'object' && rawInput !== null && !Array.isArray(rawInput)
                ? rawInput
                : {};
            // ✅ OPTIMIZED: Webhook trigger - return clean output with just the payload
            // The body contains the actual webhook payload, which is what users typically need
            // Also include query params and headers for advanced use cases
            const body = inputObj.body || inputObj;
            const result = typeof body === 'object' && body !== null && !Array.isArray(body)
                ? { ...body }
                : { body };
            if (inputObj.query && typeof inputObj.query === 'object' && Object.keys(inputObj.query).length > 0) {
                result.query = inputObj.query;
            }
            if (inputObj.headers && typeof inputObj.headers === 'object' && Object.keys(inputObj.headers).length > 0) {
                result.headers = inputObj.headers;
            }
            if (inputObj.method) {
                result.method = inputObj.method;
            }
            return {
                success: true,
                output: result,
            };
        },
    };
}
