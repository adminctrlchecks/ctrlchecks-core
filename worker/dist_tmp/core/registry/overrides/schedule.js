"use strict";
/**
 * ✅ SCHEDULE TRIGGER NODE - Migrated to Registry
 *
 * Cron-based scheduling trigger.
 * Returns execution timestamp.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSchedule = overrideSchedule;
function overrideSchedule(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            const { input } = context;
            // Extract input object
            const inputObj = typeof input === 'object' && input !== null && !Array.isArray(input)
                ? input
                : {};
            // ✅ OPTIMIZED: Schedule trigger - return clean output with just timestamp
            // Schedule triggers run at specific times, return execution timestamp
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
