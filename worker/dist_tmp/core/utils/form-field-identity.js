"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFormFieldIdentity = normalizeFormFieldIdentity;
exports.normalizeFormFieldsIdentity = normalizeFormFieldsIdentity;
exports.normalizeWorkflowFormFieldIdentities = normalizeWorkflowFormFieldIdentities;
const crypto_1 = __importDefault(require("crypto"));
const unified_node_type_normalizer_1 = require("./unified-node-type-normalizer");
const MAX_KEY_LENGTH = 32;
const MAX_LABEL_LENGTH = 40;
const RESERVED_KEYS = new Set(['input', 'json', '$json', 'data', 'meta', 'files', 'submitted_at']);
function toSnakeCase(value) {
    return value
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}
function toTitle(value) {
    return value
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (m) => m.toUpperCase());
}
function shortenLabel(input) {
    const compact = input.replace(/\s+/g, ' ').trim();
    if (compact.length <= MAX_LABEL_LENGTH)
        return compact;
    return compact.slice(0, MAX_LABEL_LENGTH - 1).trimEnd() + '…';
}
function hashSuffix(value) {
    return crypto_1.default.createHash('sha1').update(value).digest('hex').slice(0, 6);
}
function safeKey(raw, used) {
    let key = toSnakeCase(raw);
    if (!key)
        key = 'field';
    if (key.length > MAX_KEY_LENGTH) {
        const suffix = hashSuffix(key);
        key = `${key.slice(0, MAX_KEY_LENGTH - 7)}_${suffix}`;
    }
    if (RESERVED_KEYS.has(key) || used.has(key)) {
        const suffix = hashSuffix(raw);
        key = `${key.slice(0, Math.max(1, MAX_KEY_LENGTH - 7))}_${suffix}`;
    }
    while (used.has(key)) {
        const suffix = hashSuffix(`${raw}_${key}`);
        key = `${key.slice(0, Math.max(1, MAX_KEY_LENGTH - 7))}_${suffix}`;
    }
    used.add(key);
    return key;
}
function normalizeFormFieldIdentity(field, usedKeys) {
    const sourceLabel = String(field.label || field.name || field.key || 'Field');
    const sourceKey = String(field.key || field.name || sourceLabel);
    const label = shortenLabel(sourceLabel);
    // ✅ Preserve existing key/name if already valid — only regenerate if missing/invalid
    const existingKey = typeof field.key === 'string' && field.key.trim() ? field.key.trim() : null;
    const existingName = typeof field.name === 'string' && field.name.trim() ? field.name.trim() : null;
    const stableKey = existingKey || existingName || null;
    const key = stableKey && !RESERVED_KEYS.has(stableKey) && !usedKeys.has(stableKey)
        ? (usedKeys.add(stableKey), stableKey)
        : safeKey(sourceKey || sourceLabel, usedKeys);
    // ✅ Preserve existing id — only generate if missing
    const existingId = typeof field.id === 'string' && field.id.trim() ? field.id.trim() : null;
    const type = String(field.type || 'text').toLowerCase();
    const required = field.required !== false;
    return {
        id: existingId || `field_${key}`,
        key,
        name: key,
        label: label || toTitle(key),
        type,
        required,
        options: Array.isArray(field.options) ? field.options : undefined,
        placeholder: typeof field.placeholder === 'string' ? field.placeholder : undefined,
        defaultValue: typeof field.defaultValue === 'string' ? field.defaultValue : undefined,
    };
}
function normalizeFormFieldsIdentity(fields) {
    const usedKeys = new Set();
    return fields.map((f) => normalizeFormFieldIdentity(f, usedKeys));
}
function normalizeWorkflowFormFieldIdentities(workflow) {
    const nodes = (workflow.nodes || []).map((node) => {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        if (nodeType !== 'form')
            return node;
        const fields = node.data?.config?.fields;
        if (!Array.isArray(fields) || fields.length === 0)
            return node;
        // ✅ If fields were set by AI at build time, preserve them exactly as-is.
        // No normalization, no key regeneration, no identity reconstruction.
        const fieldsFillMode = node.data?.config?._fillMode?.fields;
        if (fieldsFillMode === 'buildtime_ai_once')
            return node;
        const normalized = normalizeFormFieldsIdentity(fields);
        return {
            ...node,
            data: {
                ...(node.data || {}),
                config: {
                    ...(node.data?.config || {}),
                    fields: normalized,
                },
            },
        };
    });
    return { ...workflow, nodes };
}
