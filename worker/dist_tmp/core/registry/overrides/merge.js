"use strict";
/**
 * ✅ MERGE NODE - Real Execution Logic
 *
 * Implements actual data merging from multiple sources:
 * - Combines outputs from multiple incoming paths (true/false branches, switch cases, etc.)
 * - Supports different merge modes (overwrite, append, deep_merge)
 * - Preserves all data from all sources
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideMerge = overrideMerge;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideMerge(def, schema) {
    return {
        ...def,
        // ✅ MERGE CAPABILITY FLAG: Merge nodes allow multiple inputs by design
        allowsMultipleInputs: true,
        execute: async (context) => {
            // ✅ REAL FUNCTIONALITY: Use legacy executor which has merge logic
            // The execution engine already merges multiple inputs in buildNodeInput(),
            // but the legacy executor can apply merge-specific modes (overwrite, append, deep_merge)
            const result = await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({
                context,
                schema,
                hooks: {
                    beforeExecute: (prepared) => {
                        // ✅ CRITICAL: Merge node needs ALL upstream outputs combined
                        // The execution engine's buildNodeInput() already merges multiple inputs,
                        // but we ensure all upstream data is included
                        const mergedInput = {
                            ...(typeof prepared.executionInput === 'object' && prepared.executionInput !== null ? prepared.executionInput : {}),
                        };
                        // Merge all upstream outputs (from multiple branches)
                        context.upstreamOutputs.forEach((output) => {
                            if (output && typeof output === 'object' && !Array.isArray(output)) {
                                Object.assign(mergedInput, output);
                            }
                            else if (Array.isArray(output)) {
                                // Handle array outputs - merge into items array
                                if (!Array.isArray(mergedInput.items)) {
                                    mergedInput.items = [];
                                }
                                mergedInput.items = [...mergedInput.items, ...output];
                            }
                        });
                        return { executionInput: mergedInput };
                    },
                },
            });
            // ✅ REAL FUNCTIONALITY: Ensure merged output contains all data from all sources
            if (result.success && result.output) {
                const outObj = result.output;
                const inputObj = context.inputs;
                // Combine all input data (already merged by engine + our hooks)
                const finalOutput = {
                    ...(typeof inputObj === 'object' && inputObj !== null ? inputObj : {}),
                    ...(typeof outObj === 'object' && outObj !== null ? outObj : {}),
                };
                return {
                    success: true,
                    output: finalOutput,
                    metadata: {
                        merged: true,
                        sourceCount: context.upstreamOutputs.size,
                    },
                };
            }
            return result;
        },
    };
}
