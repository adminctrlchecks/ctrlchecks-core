"use strict";
/**
 * ✅ HTTP RESPONSE NODE - Migrated to Registry
 *
 * Sends HTTP response.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideHttpResponse = overrideHttpResponse;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideHttpResponse(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
