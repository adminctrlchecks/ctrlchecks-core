"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFormFieldTypeEvidence = buildFormFieldTypeEvidence;
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const if_else_conditions_1 = require("../../core/utils/if-else-conditions");
function normalizeEvidenceFieldKey(label) {
    return String(label || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32);
}
function buildFormFieldTypeEvidence(workflow, intentText) {
    const evidence = new Map();
    const put = (fieldRaw, inferredType, confidence, reason) => {
        const fieldKey = normalizeEvidenceFieldKey(fieldRaw);
        if (!fieldKey)
            return;
        const prev = evidence.get(fieldKey);
        if (!prev || confidence > prev.confidence) {
            evidence.set(fieldKey, { fieldKey, inferredType, confidence, reason });
        }
    };
    for (const node of workflow.nodes || []) {
        if ((0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node) !== 'if_else')
            continue;
        const cfg = (0, if_else_conditions_1.normalizeIfElseConfig)(node.data?.config || {});
        const conds = Array.isArray(cfg.conditions) ? cfg.conditions : [];
        for (const cond of conds) {
            const rawField = String(cond.field || '').trim();
            if (!rawField)
                continue;
            const field = rawField.replace(/^\$json\./, '').replace(/^input\./, '');
            const op = String(cond.operator || '').toLowerCase();
            const value = cond.value;
            if (['greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal'].includes(op)) {
                put(field, 'number', typeof value === 'number' ? 0.98 : 0.9, `if_else operator ${op}`);
                continue;
            }
            if (typeof value === 'boolean') {
                put(field, 'checkbox', 0.95, 'if_else boolean comparison');
                continue;
            }
            if (op === 'contains' || op === 'not_contains') {
                if (field.includes('email')) {
                    put(field, 'email', 0.9, 'if_else contains on email-like field');
                }
                else {
                    put(field, 'text', 0.72, `if_else operator ${op}`);
                }
            }
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                put(field, 'date', 0.86, 'if_else date literal comparison');
            }
        }
    }
    const text = String(intentText || '');
    const numericPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)\b/g;
    let m;
    while ((m = numericPattern.exec(text)) !== null) {
        put(m[1], 'number', 0.88, `intent comparator ${m[2]}`);
    }
    return evidence;
}
