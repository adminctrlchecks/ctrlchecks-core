"use strict";
/**
 * Optional build-time LLM: proposes form.fields when deterministic extraction yields nothing
 * or when STRUCTURAL_FORM_FIELDS_LLM=true (opt-in). Uses only getFormStructuralIntentText (user prompt).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hydrateFormFieldsFromLlmIfEnabled = hydrateFormFieldsFromLlmIfEnabled;
const llm_adapter_1 = require("../../shared/llm-adapter");
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const structure_materializer_1 = require("./structure-materializer");
const form_field_identity_1 = require("../../core/utils/form-field-identity");
const form_field_type_resolver_1 = require("./form-field-type-resolver");
const form_field_type_evidence_1 = require("./form-field-type-evidence");
function normalizeFieldKey(label) {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32);
}
/**
 * When STRUCTURAL_FORM_FIELDS_LLM=true and GEMINI_API_KEY is set, fill empty form.fields from user intent.
 * Falls back silently on any error.
 */
async function hydrateFormFieldsFromLlmIfEnabled(workflow) {
    if (process.env.STRUCTURAL_FORM_FIELDS_LLM !== 'true' || !process.env.GEMINI_API_KEY) {
        return workflow;
    }
    const intent = (0, structure_materializer_1.getFormStructuralIntentText)(workflow);
    if (!intent.trim())
        return workflow;
    const isFormLike = (nodeType) => nodeType === 'form' || nodeType === 'form_trigger';
    const hasEmptyForm = (workflow.nodes || []).some((node) => {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        if (!isFormLike(nodeType))
            return false;
        const fields = node.data?.config?.fields;
        return !Array.isArray(fields) || fields.length === 0;
    });
    if (!hasEmptyForm)
        return workflow;
    try {
        const adapter = new llm_adapter_1.LLMAdapter();
        const evidenceByField = (0, form_field_type_evidence_1.buildFormFieldTypeEvidence)(workflow, intent);
        const userContent = `User request (form fields only, no workflow nodes):\n${intent.slice(0, 4000)}\n\nReturn a JSON array of objects: [{"key":"snake_case","label":"Human Label","type":"text|email|number|tel|textarea|file|select|checkbox"}]. Only fields the user should fill on a form. No explanation.`;
        const response = await adapter.chat('gemini', [
            {
                role: 'system',
                content: 'You output only valid JSON: an array of form field definitions. Keys must be snake_case. No markdown.',
            },
            { role: 'user', content: userContent },
        ], {
            model: process.env.STRUCTURAL_FORM_FIELDS_MODEL || 'gemini-3.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.2,
        });
        let jsonStr = response.content.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
        }
        const parsed = JSON.parse(jsonStr);
        if (!Array.isArray(parsed) || parsed.length === 0)
            return workflow;
        const built = parsed
            .map((row) => {
            const key = normalizeFieldKey(String(row.key || row.label || ''));
            if (!key)
                return null;
            const llmType = form_field_type_resolver_1.FORM_ALLOWED_TYPES.has(String(row.type || '').toLowerCase())
                ? String(row.type).toLowerCase()
                : '';
            const decision = (0, form_field_type_resolver_1.inferFormFieldTypeDecision)({
                key,
                currentType: llmType || undefined,
                intentText: intent,
                workflow,
                evidenceByField,
                preserveExplicit: true,
            });
            const type = decision.type;
            const label = String(row.label || key).slice(0, 200);
            return {
                id: `field_${key}`,
                key,
                name: key,
                label,
                type,
                required: true,
            };
        })
            .filter(Boolean);
        if (built.length === 0)
            return workflow;
        const canonicalBuilt = (0, form_field_identity_1.normalizeFormFieldsIdentity)(built);
        const nextNodes = (workflow.nodes || []).map((node) => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
            if (nodeType !== 'form' && nodeType !== 'form_trigger')
                return node;
            const fields = node.data?.config?.fields;
            if (Array.isArray(fields) && fields.length > 0)
                return node;
            const cfg = { ...(node.data?.config || {}), fields: canonicalBuilt };
            return {
                ...node,
                data: { ...(node.data || {}), config: cfg },
            };
        });
        return { ...workflow, nodes: nextNodes };
    }
    catch {
        return workflow;
    }
}
