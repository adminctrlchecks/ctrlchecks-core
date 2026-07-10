"use strict";
/**
 * ✅ ERROR TRIGGER NODE - Migrated to Registry
 *
 * Error-based trigger.
 * Returns error details.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideErrorTrigger = overrideErrorTrigger;
function overrideErrorTrigger(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            const { input } = context;
            // Extract input object
            const inputObj = typeof input === 'object' && input !== null && !Array.isArray(input)
                ? input
                : {};
            // ✅ OPTIMIZED: Error trigger - return clean output with just error details
            // Error triggers need error info, but return it in a clean format
            const errorOutput = {
                failed_node: inputObj.failed_node || null,
                error_message: inputObj.error_message || '',
                error_type: inputObj.error_type || 'unknown',
            };
            if (inputObj.error_stack) {
                errorOutput.error_stack = inputObj.error_stack;
            }
            if (inputObj.node_output) {
                errorOutput.node_output = inputObj.node_output;
            }
            return {
                success: true,
                output: errorOutput,
            };
        },
    };
}
