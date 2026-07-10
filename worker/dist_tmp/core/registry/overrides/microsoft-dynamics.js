"use strict";
/**
 * ✅ MICROSOFT DYNAMICS NODE - Migrated to Registry
 *
 * Microsoft Dynamics 365 CRM integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideMicrosoftDynamics = overrideMicrosoftDynamics;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideMicrosoftDynamics(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor (Dynamics 365 REST API integration)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
