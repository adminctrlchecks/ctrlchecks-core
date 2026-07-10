"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideAggregate = overrideAggregate;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideAggregate(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({
                context,
                schema,
                hooks: {
                    beforeExecute: (prepared) => {
                        // If rawInput is a direct array, wrap it as { items: [...] } so the
                        // legacy aggregate case (which reads inputObj.items) can find the data.
                        if (Array.isArray(context.rawInput) &&
                            !Array.isArray(prepared.executionInput?.items)) {
                            return {
                                executionInput: {
                                    ...(typeof prepared.executionInput === 'object' && prepared.executionInput !== null
                                        ? prepared.executionInput
                                        : {}),
                                    items: context.rawInput,
                                },
                            };
                        }
                    },
                },
            });
        },
    };
}
