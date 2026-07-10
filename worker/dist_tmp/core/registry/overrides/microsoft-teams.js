"use strict";
/**
 * ✅ MICROSOFT TEAMS NODE - Migrated to Registry
 *
 * Microsoft Teams messaging integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideMicrosoftTeams = overrideMicrosoftTeams;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideMicrosoftTeams(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
