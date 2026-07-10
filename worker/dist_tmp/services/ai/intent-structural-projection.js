"use strict";
/**
 * Projects workflowIntentModel + graph-derived keys onto form and if_else structural configs.
 * Call after initializeWorkflow / before final validateWorkflow. Does not mutate edges directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileFormFieldRecordsToAllowedKeys = reconcileFormFieldRecordsToAllowedKeys;
exports.applyStructuralIntentAlignment = applyStructuralIntentAlignment;
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const intent_extraction_1 = require("./intent-extraction");
const workflow_intent_model_1 = require("./workflow-intent-model");
const structure_materializer_1 = require("./structure-materializer");
const form_ifelse_binding_1 = require("../../core/orchestration/form-ifelse-binding");
const form_field_type_evidence_1 = require("./form-field-type-evidence");
const form_field_type_resolver_1 = require("./form-field-type-resolver");
const form_field_identity_1 = require("../../core/utils/form-field-identity");
function isFormLikeNodeType(nodeType) {
    return nodeType === 'form' || nodeType === 'form_trigger';
}
function isLikelyPlannerNarrative(text) {
    const t = String(text || '').toLowerCase();
    if (!t)
        return false;
    return (t.includes('detected nodes:') ||
        t.includes('branch slots:') ||
        t.includes('execution:') ||
        t.includes('terminal:') ||
        t.includes('terminals:') ||
        t.includes('configuration contract') ||
        t.includes('planner rules:'));
}
function mergeFormFieldsPreservingLabels(existing, fromModel) {
    const byKey = new Map();
    for (const row of existing || []) {
        const k = (0, intent_extraction_1.normalizeFieldKey)(String(row.key || row.name || ''));
        if (k)
            byKey.set(k, row);
    }
    for (const row of fromModel) {
        const k = (0, intent_extraction_1.normalizeFieldKey)(String(row.key || ''));
        if (!k)
            continue;
        if (!byKey.has(k)) {
            byKey.set(k, row);
        }
    }
    return Array.from(byKey.values());
}
/**
 * Rebuild form `fields` to match the canonical ordered key list (intent + graph-referenced operands).
 * Preserves labels, types, ids, and other properties from existing rows when the normalized key matches.
 */
function reconcileFormFieldRecordsToAllowedKeys(existing, allowedOrderedKeys) {
    const byKey = new Map();
    for (const row of existing) {
        const k = (0, intent_extraction_1.normalizeFieldKey)(String(row.key || row.name || ''));
        if (k && !byKey.has(k))
            byKey.set(k, row);
    }
    const templates = (0, intent_extraction_1.buildFormFieldRecordsFromKeys)(allowedOrderedKeys);
    const tmplByKey = new Map();
    for (const t of templates) {
        const k = (0, intent_extraction_1.normalizeFieldKey)(String(t.key || ''));
        if (k)
            tmplByKey.set(k, t);
    }
    const raw = [];
    for (const key of allowedOrderedKeys) {
        const nk = (0, intent_extraction_1.normalizeFieldKey)(key);
        if (!nk)
            continue;
        const tmpl = tmplByKey.get(nk);
        if (!tmpl)
            continue;
        const prev = byKey.get(nk);
        if (prev) {
            raw.push({
                ...prev,
                key: nk,
                name: (0, intent_extraction_1.normalizeFieldKey)(String(prev.name || nk)) || nk,
            });
        }
        else {
            raw.push({ ...tmpl });
        }
    }
    return (0, form_field_identity_1.normalizeFormFieldsIdentity)(raw);
}
/**
 * Applies structural alignment: persists workflowIntentModel, upgrades placeholder / incomplete form fields,
 * and re-derives if_else conditions against upstream form fields when safe (empty or input.* placeholders).
 */
function applyStructuralIntentAlignment(workflow, options) {
    if (options?.postFreezeReadonly) {
        return workflow;
    }
    // ✅ CRITICAL: If ANY node in the workflow has buildtime_ai_once stamps, the AI has
    // already generated all values. Skip structural alignment entirely — the AI's output
    // is the ground truth. No normalization, pruning, or re-derivation should happen.
    // From this point forward, only the user can change values (credentials, manual edits)
    // and AI runtime fields are resolved at execution time, not at save time.
    const hasAiBuildTimeStamps = (workflow.nodes || []).some((node) => {
        const fillMode = node?.data?.config?._fillMode;
        if (!fillMode || typeof fillMode !== 'object')
            return false;
        return Object.values(fillMode).some((mode) => mode === 'buildtime_ai_once');
    });
    if (hasAiBuildTimeStamps) {
        return workflow;
    }
    const formIntentText = (0, structure_materializer_1.getFormStructuralIntentText)(workflow);
    const workflowIntentText = (0, structure_materializer_1.getWorkflowIntentText)(workflow);
    const intentText = formIntentText
        ? formIntentText
        : !isLikelyPlannerNarrative(workflowIntentText)
            ? workflowIntentText
            : '';
    const model = (0, workflow_intent_model_1.buildWorkflowIntentModel)(workflow, intentText);
    let w = (0, workflow_intent_model_1.mergeWorkflowIntentModelMetadata)(workflow, model);
    const intentPruneDisabled = Boolean(w.metadata?.disableFormFieldIntentPrune);
    const nodes = (w.nodes || []).map((node) => {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        if (!isFormLikeNodeType(nodeType))
            return node;
        const config = { ...(node.data?.config || {}) };
        const currentFields = Array.isArray(config.fields) ? config.fields : [];
        // ✅ If fields were set by AI at build time, skip intent-based pruning entirely.
        // The AI already generated the correct fields — do not overwrite or prune them.
        const fieldsFillMode = config._fillMode?.fields;
        if (fieldsFillMode === 'buildtime_ai_once' && currentFields.length > 0) {
            return node;
        }
        const keys = (0, intent_extraction_1.deriveOrderedFieldKeysForForm)(intentText, w).filter((k) => !(0, intent_extraction_1.isLikelyContaminatedFieldKey)(k));
        if (keys.length === 0)
            return node;
        let nextFields = null;
        const trustIntentPrune = !intentPruneDisabled && intentText.trim().length > 0;
        if (trustIntentPrune) {
            nextFields = reconcileFormFieldRecordsToAllowedKeys(currentFields, keys);
        }
        else if ((0, intent_extraction_1.isPlaceholderFormFields)(config.fields) || currentFields.length === 0) {
            nextFields = (0, intent_extraction_1.buildFormFieldRecordsFromKeys)(keys);
        }
        else if ((0, intent_extraction_1.formFieldsMissingReferencedKeys)(w, currentFields)) {
            nextFields = mergeFormFieldsPreservingLabels(currentFields, (0, intent_extraction_1.buildFormFieldRecordsFromKeys)(keys));
        }
        if (!nextFields)
            return node;
        return {
            ...node,
            data: {
                ...node.data,
                config: {
                    ...config,
                    fields: nextFields,
                },
            },
        };
    });
    w = { ...w, nodes };
    const nodes2 = (w.nodes || []).map((node) => {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        if (nodeType !== 'if_else')
            return node;
        // ✅ If conditions were set by AI at build time, skip re-derivation.
        const condFillMode = node.data?.config?._fillMode?.conditions;
        if (condFillMode === 'buildtime_ai_once') {
            const cond = node.data?.config?.conditions;
            const hasConditions = cond !== undefined && cond !== null && !(Array.isArray(cond) && cond.length === 0);
            if (hasConditions)
                return node;
        }
        const cond = node.data?.config?.conditions;
        const empty = cond === undefined || cond === null || (Array.isArray(cond) && cond.length === 0);
        if (!empty && !(0, form_ifelse_binding_1.conditionsReferenceInputPaths)(cond))
            return node;
        const ctx = (0, form_ifelse_binding_1.findUpstreamFormContextForIfElse)(w, String(node.id));
        if (!ctx?.fields?.length)
            return node;
        const next = (0, structure_materializer_1.deriveIfElseConditionsFromIntent)(intentText, ctx.fields);
        if (!next.length)
            return node;
        const config = { ...(node.data?.config || {}) };
        config.conditions = next;
        return {
            ...node,
            data: {
                ...node.data,
                config,
            },
        };
    });
    const withIfElseConditions = { ...w, nodes: nodes2 };
    const typeEvidence = (0, form_field_type_evidence_1.buildFormFieldTypeEvidence)(withIfElseConditions, intentText);
    const healedNodes = (withIfElseConditions.nodes || []).map((node) => {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        if (!isFormLikeNodeType(nodeType))
            return node;
        const config = { ...(node.data?.config || {}) };
        const fields = Array.isArray(config.fields) ? config.fields : [];
        if (fields.length === 0)
            return node;
        const nextFields = fields.map((field) => {
            const key = (0, intent_extraction_1.normalizeFieldKey)(String(field.key || field.name || field.id || ''));
            if (!key)
                return field;
            const currentType = String(field.type || '').toLowerCase();
            const decision = (0, form_field_type_resolver_1.inferFormFieldTypeDecision)({
                key,
                currentType,
                intentText,
                workflow: withIfElseConditions,
                evidenceByField: typeEvidence,
                preserveExplicit: true,
            });
            if (!decision.type || decision.type === currentType)
                return field;
            return {
                ...field,
                type: decision.type,
            };
        });
        return {
            ...node,
            data: {
                ...node.data,
                config: {
                    ...config,
                    fields: nextFields,
                },
            },
        };
    });
    return { ...withIfElseConditions, nodes: healedNodes };
}
