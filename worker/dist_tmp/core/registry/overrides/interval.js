"use strict";
/**
 * ✅ INTERVAL TRIGGER NODE - Migrated to Registry
 *
 * Recurring interval trigger.
 * Returns execution timestamp.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideInterval = overrideInterval;
function overrideInterval(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            const { input } = context;
            // Extract input object
            const inputObj = typeof input === 'object' && input !== null && !Array.isArray(input)
                ? input
                : {};
            // ✅ OPTIMIZED: Interval trigger - return clean output with just timestamp
            // Interval triggers run at recurring intervals, return execution timestamp
            return {
                success: true,
                output: {
                    executed_at: new Date().toISOString(),
                    ...(inputObj && Object.keys(inputObj).length > 0 ? inputObj : {}),
                },
            };
        },
    };
}
