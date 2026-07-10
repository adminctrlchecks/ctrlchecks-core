"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideRetry = overrideRetry;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
/**
 * Retry node — execution is defined in execute-workflow (legacy) and invoked here
 * so template resolution and config merge stay unified. Branching/retry loops remain
 * an orchestration concern; this node forwards input with retry config attached.
 */
function overrideRetry(def, schema) {
    return {
        ...def,
        outgoingPorts: ['default', 'success', 'error'],
        isBranching: true,
        execute: async (context) => {
            const result = await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
            if (!result.success) {
                return result;
            }
            const maxAttempts = context.config?.maxAttempts ?? 3;
            const delayBetween = context.config?.delayBetween ?? 1000;
            const backoff = context.config?.backoff ?? 'none';
            return {
                ...result,
                metadata: {
                    ...result.metadata,
                    branch: 'success',
                    retryConfig: { maxAttempts, delayBetween, backoff },
                },
            };
        },
    };
}
