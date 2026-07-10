"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSet = overrideSet;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideSet(def, schema) {
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
                            // UI sends [{name, value}] — convert to JSON string that legacy code expects
                            const fieldsObj = {};
                            for (const f of fieldsRaw) {
                                if (f?.name !== undefined && f?.name !== '') {
                                    fieldsObj[String(f.name)] = f.value ?? '';
                                }
                            }
                            prepared.mergedConfig.fields = JSON.stringify(fieldsObj);
                        }
                        else if (fieldsRaw && typeof fieldsRaw === 'object') {
                            // Plain object {key: value} — stringify for legacy parser
                            prepared.mergedConfig.fields = JSON.stringify(fieldsRaw);
                        }
                    },
                },
            });
        },
    };
}
