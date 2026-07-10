"use strict";
/**
 * ✅ SCHEDULEWISE NODE - Migrated to Registry
 *
 * ScheduleWise healthcare scheduling integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideScheduleWise = overrideScheduleWise;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideScheduleWise(def, schema) {
    return {
        ...def,
        tags: [...(def.tags || []), 'integration', 'scheduling', 'healthcare', 'api'],
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
