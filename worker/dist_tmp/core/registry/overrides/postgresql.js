"use strict";
/**
 * ✅ POSTGRESQL NODE - Migrated to Registry
 *
 * PostgreSQL database operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overridePostgresql = overridePostgresql;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overridePostgresql(def, schema) {
    return {
        ...def,
        credentialSchema: {
            requirements: [
                {
                    provider: 'postgresql',
                    category: 'connection_string',
                    required: false,
                    description: 'PostgreSQL connection string. Falls back to DATABASE_URL when omitted.',
                },
            ],
            credentialFields: ['connectionString'],
        },
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
