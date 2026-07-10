"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideParallel = overrideParallel;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
/**
 * Parallel node — passthrough + mode from config; concurrent branch execution is
 * handled by the workflow engine. Single execution path via legacy executor.
 */
function overrideParallel(def, schema) {
    return {
        ...def,
        outgoingPorts: ['default'],
        isBranching: true,
        execute: async (context) => {
            const result = await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
            if (!result.success) {
                return result;
            }
            const mode = context.config?.mode ?? 'all';
            return {
                ...result,
                metadata: {
                    ...result.metadata,
                    parallelMode: mode,
                },
            };
        },
    };
}
