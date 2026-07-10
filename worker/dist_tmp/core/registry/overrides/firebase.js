"use strict";
/**
 * ✅ FIREBASE NODE - Migrated to Registry
 *
 * Firebase Firestore and Realtime Database operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideFirebase = overrideFirebase;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideFirebase(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
