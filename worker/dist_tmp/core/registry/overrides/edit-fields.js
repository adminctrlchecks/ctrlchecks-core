"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideEditFields = overrideEditFields;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideEditFields(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({
                context,
                schema,
                hooks: {
                    beforeExecute: (prepared) => {
                        const fieldsRaw = prepared.mergedConfig.fields;
                        if (Array.isArray(fieldsRaw)) {
                            // UI sends [{name, value}] where name is the output key and value is an expression.
                            // Convert to {outputKey: expression} object that the legacy switch case expects.
                            const fieldsObj = {};
                            for (const f of fieldsRaw) {
                                if (f?.name !== undefined && f?.name !== '') {
                                    fieldsObj[String(f.name)] = f.value ?? '';
                                }
                            }
                            prepared.mergedConfig.fields = fieldsObj;
                        }
                    },
                },
            });
        },
    };
}
