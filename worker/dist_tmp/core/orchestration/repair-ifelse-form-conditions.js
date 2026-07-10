"use strict";
/**
 * Aligns if_else condition field paths with upstream form field internal names.
 * Generated workflows often use placeholder `input.*` while form output exposes
 * `$json.<internalName>` (see typed-value-resolver / execute-workflow if_else).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickFormFieldKeyForAgeIntent = void 0;
exports.repairIfElseConditionsFromUpstreamForm = repairIfElseConditionsFromUpstreamForm;
const form_ifelse_binding_1 = require("./form-ifelse-binding");
var form_ifelse_binding_2 = require("./form-ifelse-binding");
Object.defineProperty(exports, "pickFormFieldKeyForAgeIntent", { enumerable: true, get: function () { return form_ifelse_binding_2.pickFormFieldKeyForAgeIntent; } });
function replaceInputPathsInString(s, fields) {
    return s.replace(/\binput\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (full, name) => {
        const normalized = (0, form_ifelse_binding_1.normalizeIntentFieldToken)(name);
        const key = (0, form_ifelse_binding_1.resolveFormFieldKeyForConditionOperand)(normalized, fields);
        if (!key)
            return full;
        return `$json.${key}`;
    });
}
function deepRemapConditions(value, fields) {
    if (value === null || value === undefined)
        return value;
    if (typeof value === 'string') {
        return replaceInputPathsInString(value, fields);
    }
    if (Array.isArray(value)) {
        return value.map((v) => deepRemapConditions(v, fields));
    }
    if (typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = deepRemapConditions(v, fields);
        }
        return out;
    }
    return value;
}
/**
 * Mutates a copy of workflow nodes' if_else configs when a form upstream exists
 * and conditions reference `input.<name>` placeholders.
 */
function repairIfElseConditionsFromUpstreamForm(workflow) {
    const nodes = workflow.nodes || [];
    const updatedNodes = nodes.map((node) => {
        const nt = (0, form_ifelse_binding_1.getNormalizedNodeType)(node);
        if (nt !== 'if_else')
            return node;
        const ctx = (0, form_ifelse_binding_1.findUpstreamFormContextForIfElse)(workflow, String(node.id));
        if (!ctx?.fields?.length)
            return node;
        const fields = ctx.fields;
        const cond = node.data?.config?.conditions;
        if (cond === undefined || cond === null)
            return node;
        const serialized = JSON.stringify(cond);
        if (!serialized.includes('input.'))
            return node;
        const nextConditions = deepRemapConditions(cond, fields);
        return {
            ...node,
            data: {
                ...node.data,
                config: {
                    ...node.data.config,
                    conditions: nextConditions,
                },
            },
        };
    });
    return { ...workflow, nodes: updatedNodes };
}
