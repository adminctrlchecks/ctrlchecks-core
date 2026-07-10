"use strict";
/**
 * ✅ MANUAL TRIGGER NODE - Migrated to Registry
 *
 * Simple trigger node that returns input as-is.
 * Used for manual workflow execution and testing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideManualTrigger = overrideManualTrigger;
function overrideManualTrigger(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            const { input } = context;
            // Extract input object
            const inputObj = typeof input === 'object' && input !== null && !Array.isArray(input)
                ? input
                : {};
            // ✅ OPTIMIZED: Return clean output - just the input data, no trigger metadata
            // Manual trigger is typically used for testing, so return input as-is
            const result = inputObj && Object.keys(inputObj).length > 0 ? inputObj : {};
            return {
                success: true,
                output: result,
            };
        },
    };
}
