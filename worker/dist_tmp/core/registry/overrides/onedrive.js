"use strict";
/**
 * ✅ ONEDRIVE NODE - Migrated to Registry
 *
 * OneDrive storage operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideOnedrive = overrideOnedrive;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideOnedrive(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
