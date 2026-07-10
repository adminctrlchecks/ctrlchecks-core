"use strict";
/**
 * ✅ QUEUE CONSUME NODE - Migrated to Registry
 *
 * Consumes items from queue.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideQueueConsume = overrideQueueConsume;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideQueueConsume(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
