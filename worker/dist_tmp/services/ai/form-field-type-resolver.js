"use strict";
/**
 * Single source of truth for form field type inference.
 * Shared across deterministic extraction and LLM-assisted fallback paths.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORM_ALLOWED_TYPES = void 0;
exports.inferFormFieldTypeDecision = inferFormFieldTypeDecision;
exports.inferFormFieldTypeFromKey = inferFormFieldTypeFromKey;
const form_field_type_evidence_1 = require("./form-field-type-evidence");
exports.FORM_ALLOWED_TYPES = new Set([
    'text',
    'email',
    'number',
    'tel',
    'textarea',
    'file',
    'select',
    'checkbox',
    'date',
    'url',
    'password',
]);
function inferFormFieldTypeDecision(input) {
    const normalizedInput = typeof input === 'string' ? { key: input } : input;
    const key = String(normalizedInput.key || '').trim();
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const currentType = String(normalizedInput.currentType || '').toLowerCase().trim();
    const preserveExplicit = normalizedInput.preserveExplicit !== false;
    const evidenceMap = normalizedInput.evidenceByField ||
        (normalizedInput.workflow
            ? (0, form_field_type_evidence_1.buildFormFieldTypeEvidence)(normalizedInput.workflow, normalizedInput.intentText || '')
            : undefined);
    const evidence = evidenceMap?.get(normalizedKey);
    if (evidence && exports.FORM_ALLOWED_TYPES.has(evidence.inferredType)) {
        const explicitLocked = preserveExplicit &&
            currentType &&
            exports.FORM_ALLOWED_TYPES.has(currentType) &&
            currentType !== 'text' &&
            evidence.confidence < 0.95;
        if (!explicitLocked) {
            return {
                type: evidence.inferredType,
                confidence: evidence.confidence,
                reason: evidence.reason,
                source: 'evidence',
            };
        }
    }
    if (preserveExplicit && currentType && exports.FORM_ALLOWED_TYPES.has(currentType)) {
        return {
            type: currentType,
            confidence: 0.92,
            reason: 'preserving explicit field type',
            source: 'explicit',
        };
    }
    return {
        type: 'text',
        confidence: 0.55,
        reason: `default fallback (no strong evidence) for "${key}"`,
        source: 'default',
    };
}
function inferFormFieldTypeFromKey(input) {
    return inferFormFieldTypeDecision(input).type;
}
