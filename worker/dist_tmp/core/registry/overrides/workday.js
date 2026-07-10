"use strict";
/**
 * ✅ WORKDAY NODE - Migrated to Registry
 *
 * Workday HR API integration — workers, jobs, organizations, supervisory organizations, positions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideWorkday = overrideWorkday;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideWorkday(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags ?? []), 'workday', 'hr', 'staffing', 'api'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
