"use strict";
/**
 * ✅ TEXT FORMATTER NODE - Migrated to Registry
 *
 * Text formatting operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideTextFormatter = overrideTextFormatter;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideTextFormatter(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
