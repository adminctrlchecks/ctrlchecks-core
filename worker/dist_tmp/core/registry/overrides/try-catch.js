"use strict";
/**
 * ✅ TRY_CATCH NODE - Real Execution Logic
 *
 * Implements actual try/catch functionality:
 * - Routes execution to 'try' branch initially
 * - Provides error context for catch branch routing
 * - Uses legacy executor for proper execution flow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideTryCatch = overrideTryCatch;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideTryCatch(def, schema) {
    return {
        ...def,
        outgoingPorts: ['default', 'try', 'catch'],
        isBranching: true,
        execute: async (context) => {
            // ✅ REAL FUNCTIONALITY: Use legacy executor which has proper try_catch handling
            // The legacy executor will:
            // 1. Process the try_catch node configuration
            // 2. Return proper output with metadata for branch routing
            // 3. The execution engine will track this node and route errors to catch branch
            try {
                const result = await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({
                    context,
                    schema,
                    hooks: {
                        beforeExecute: (prepared) => {
                            // ✅ CRITICAL: Preserve ALL input data for try branch
                            // The try branch needs access to all upstream data
                            const mergedInput = {
                                ...(typeof prepared.executionInput === 'object' && prepared.executionInput !== null ? prepared.executionInput : {}),
                            };
                            // Merge all upstream outputs into input
                            context.upstreamOutputs.forEach((output) => {
                                if (output && typeof output === 'object' && !Array.isArray(output)) {
                                    Object.assign(mergedInput, output);
                                }
                            });
                            return { executionInput: mergedInput };
                        },
                    },
                });
                // ✅ REAL FUNCTIONALITY: Return output with proper metadata for branch routing
                if (result.success && result.output) {
                    const outputObj = result.output;
                    // Ensure output contains all input data
                    const inputObj = context.inputs;
                    const finalOutput = {
                        ...(typeof outputObj === 'object' && outputObj !== null ? outputObj : {}),
                        ...(typeof inputObj === 'object' && inputObj !== null ? inputObj : {}),
                    };
                    return {
                        success: true,
                        output: finalOutput,
                        metadata: {
                            branch: 'try', // ✅ Always start with try branch
                            tryCatchNodeId: context.nodeId, // ✅ Mark this as a try_catch node for error routing
                            errorHandling: true, // ✅ Indicate this node handles errors
                        },
                    };
                }
                return result;
            }
            catch (error) {
                // ✅ REAL FUNCTIONALITY: If try_catch node itself fails, return error context
                // This allows the engine to route to catch branch
                return {
                    success: false,
                    error: {
                        code: 'TRY_CATCH_ERROR',
                        message: error?.message || 'Try/Catch node execution failed',
                        details: error,
                    },
                    output: {
                        ...(typeof context.rawInput === 'object' && context.rawInput !== null ? context.rawInput : {}),
                        error: error?.message,
                        errorType: error?.constructor?.name || 'Error',
                    },
                    metadata: {
                        branch: 'catch', // ✅ Route to catch branch on error
                        tryCatchNodeId: context.nodeId,
                        errorHandling: true,
                    },
                };
            }
        },
    };
}
