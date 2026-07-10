"use strict";
/**
 * ✅ HTTP REQUEST NODE - Migrated to Registry
 *
 * Makes HTTP requests to external APIs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideHttpRequest = overrideHttpRequest;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideHttpRequest(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex HTTP logic with rate limiting, timeouts, etc.)
            // TODO: Port full HTTP request logic to registry when time permits
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
