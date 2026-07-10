"use strict";
/**
 * ✅ AI SERVICE NODE - Migrated to Registry
 *
 * Generic AI service integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideAiService = overrideAiService;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideAiService(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
