"use strict";
/**
 * After graph build / materialize, ensure required inputs that have registry defaults
 * are never persisted as empty objects/strings (e.g. ai_agent.chat_model === {}).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hydrateRequiredConfigFromRegistryDefaults = hydrateRequiredConfigFromRegistryDefaults;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("../utils/unified-node-type-normalizer");
const registry_field_contract_1 = require("./registry-field-contract");
function hydrateRequiredConfigFromRegistryDefaults(workflow) {
    let anyChanged = false;
    const nodes = (workflow.nodes || []).map((node) => {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        const def = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
        if (!def)
            return node;
        const defaults = def.defaultConfig();
        const config = { ...(node.data?.config || {}) };
        let changed = false;
        const tryFill = (fieldName) => {
            const fillModeMap = (config?._fillMode || {});
            const mode = fillModeMap[fieldName];
            // Runtime-owned values are expected to resolve during execution and should not
            // be default-hydrated at build/save time.
            if (mode === 'runtime_ai')
                return;
            if (!(0, registry_field_contract_1.isEmptyConfigValue)(config[fieldName]))
                return;
            const d = defaults[fieldName];
            if (!(0, registry_field_contract_1.isEmptyConfigValue)(d)) {
                config[fieldName] =
                    typeof d === 'object' && d !== null && !Array.isArray(d)
                        ? { ...d }
                        : d;
                changed = true;
                return;
            }
            const fieldSchema = def.inputSchema?.[fieldName];
            const fdDefault = fieldSchema?.default;
            if (!(0, registry_field_contract_1.isEmptyConfigValue)(fdDefault)) {
                config[fieldName] =
                    typeof fdDefault === 'object' && fdDefault !== null && !Array.isArray(fdDefault)
                        ? { ...fdDefault }
                        : fdDefault;
                changed = true;
            }
        };
        for (const fieldName of def.requiredInputs || []) {
            tryFill(fieldName);
        }
        if (!changed)
            return node;
        anyChanged = true;
        return {
            ...node,
            data: {
                ...(node.data || {}),
                config,
            },
        };
    });
    return anyChanged ? { ...workflow, nodes } : workflow;
}
