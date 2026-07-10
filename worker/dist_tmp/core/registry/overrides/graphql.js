"use strict";
/**
 * ✅ GRAPHQL NODE - Migrated to Registry
 *
 * GraphQL API requests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideGraphql = overrideGraphql;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideGraphql(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
