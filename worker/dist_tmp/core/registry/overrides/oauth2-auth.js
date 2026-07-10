"use strict";
/**
 * ✅ OAUTH2 AUTH NODE - Migrated to Registry
 *
 * OAuth2 authentication.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideOauth2Auth = overrideOauth2Auth;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideOauth2Auth(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
