"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormStructuralIntentText = getFormStructuralIntentText;
exports.getWorkflowIntentText = getWorkflowIntentText;
exports.mergeOriginalUserPromptMetadata = mergeOriginalUserPromptMetadata;
exports.deriveIfElseConditionsFromIntent = deriveIfElseConditionsFromIntent;
exports.materializeStructuralFields = materializeStructuralFields;
exports.getStructuralDiagnostics = getStructuralDiagnostics;
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const field_ownership_1 = require("../../core/utils/field-ownership");
const form_ifelse_binding_1 = require("../../core/orchestration/form-ifelse-binding");
const form_field_identity_1 = require("../../core/utils/form-field-identity");
const fill_mode_resolver_1 = require("../../core/utils/fill-mode-resolver");
const intent_extraction_1 = require("./intent-extraction");
function structuralFallback(type) {
    const t = (type || 'string').toLowerCase();
    if (t === 'array')
        return [];
    if (t === 'object' || t === 'json')
        return {};
    if (t === 'boolean')
        return false;
    if (t === 'number')
        return 0;
    return '';
}
function isMissingStructuralValue(value, required) {
    return (value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0 && !!required));
}
/** Placeholder or graph mismatch: treat as unfilled so keys can be re-derived. */
function formFieldsEffectivelyMissing(value, workflow, combinedIntentText) {
    if (!Array.isArray(value))
        return true;
    if (value.length === 0)
        return true;
    if ((0, intent_extraction_1.isPlaceholderFormFields)(value))
        return true;
    if ((0, intent_extraction_1.formFieldsMissingReferencedKeys)(workflow, value)) {
        const keys = (0, intent_extraction_1.deriveOrderedFieldKeysForForm)(combinedIntentText, workflow);
        return keys.length > 0;
    }
    return false;
}
/** Last-resort single field so strict structural readiness never fails on an empty `fields` array. */
function minimalPlaceholderFormFields() {
    return (0, form_field_identity_1.normalizeFormFieldsIdentity)([
        {
            id: intent_extraction_1.FORM_FIELDS_PLACEHOLDER_FIELD_ID,
            key: 'response',
            name: 'response',
            label: 'Response',
            type: 'textarea',
            required: false,
        },
    ]);
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
/** User-only text for form field extraction — never the merged planner blob when original is set. */
function getFormStructuralIntentText(workflow) {
    const metadata = workflow?.metadata || {};
    const requirements = metadata.requirements || {};
    const originalUserPrompt = String(metadata.originalUserPrompt || '').trim();
    if (originalUserPrompt)
        return originalUserPrompt;
    const userOnly = String(metadata.userPrompt || metadata.prompt || '').trim();
    if (userOnly)
        return userOnly;
    const reqOriginal = String(requirements.originalPrompt || '').trim();
    if (reqOriginal && !isLikelyPlannerNarrative(reqOriginal))
        return reqOriginal;
    const reqGoal = String(requirements.primaryGoal || '').trim();
    if (reqGoal && !isLikelyPlannerNarrative(reqGoal))
        return reqGoal;
    return '';
}
function getWorkflowIntentText(workflow) {
    const metadata = workflow?.metadata || {};
    const requirements = metadata.requirements || {};
    return String(metadata.generatedFrom ||
        metadata.prompt ||
        metadata.userPrompt ||
        metadata.workflowPrompt ||
        metadata.structuredIntent ||
        requirements.originalPrompt ||
        requirements.primaryGoal ||
        '');
}
/**
 * Attach the API / lifecycle original user prompt so form structural extraction does not scan
 * merged planner text (e.g. "Label (google_gmail)").
 */
function mergeOriginalUserPromptMetadata(workflow, originalPrompt) {
    if (!workflow || !originalPrompt?.trim())
        return workflow;
    const cleanPrompt = originalPrompt.trim();
    return {
        ...workflow,
        metadata: {
            ...(workflow.metadata || {}),
            originalUserPrompt: cleanPrompt,
        },
    };
}
function deriveFormFieldsFromIntent(intentText, workflow) {
    const keys = (0, intent_extraction_1.deriveOrderedFieldKeysForForm)(intentText, workflow);
    if (keys.length === 0) {
        return minimalPlaceholderFormFields();
    }
    return (0, intent_extraction_1.buildFormFieldRecordsFromKeys)(keys);
}
function operatorMeta(op) {
    const normalizedOp = op === 'equal to' ? '==' :
        op === 'equals' ? '==' :
            op === '=' ? '==' :
                op === 'greater than' ? '>' :
                    op === 'less than' ? '<' :
                        op;
    const ruleOperator = normalizedOp === '>=' ? 'greater_than_or_equal' :
        normalizedOp === '<=' ? 'less_than_or_equal' :
            normalizedOp === '>' ? 'greater_than' :
                normalizedOp === '<' ? 'less_than' :
                    normalizedOp === '!=' ? 'not_equals' :
                        'equals';
    return { normalizedOp, ruleOperator };
}
// Pattern set for deriveIfElseConditionsFromIntent — ordered most-specific first.
// Each entry: [regex, operator, groupIndex_field, groupIndex_value]
// Supports: numeric comparisons, string equality, contains/not_contains.
const IF_ELSE_INTENT_PATTERNS = [
    // Numeric/symbol operators: >=, <=, >, <, ==, =, !=
    {
        re: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(>=|<=|>|<|==|!=|=)\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z_][a-zA-Z0-9_]*)/,
        operator: '__symbol__',
        fieldGroup: 1,
        valueGroup: 3,
    },
    // English comparison words
    {
        re: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s+(greater than|less than|equal to|equals)\s+([0-9]+(?:\.[0-9]+)?|[a-zA-Z_][a-zA-Z0-9_]*)/i,
        operator: '__word_compare__',
        fieldGroup: 1,
        valueGroup: 3,
    },
    // "if <field> is greater/less than <num>"
    {
        re: /\bif\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+is\s+(greater than|less than|equal to)\s+([0-9]+(?:\.[0-9]+)?)/i,
        operator: '__word_compare__',
        fieldGroup: 1,
        valueGroup: 3,
    },
    // "<field> does not contain / doesn't contain / not contain <value>"
    {
        re: /\b([a-zA-Z_][a-zA-Z0-9_\s]*?)\s+(?:does not contain|doesn't contain|not contain)\s+["']?([^"'\n,]+?)["']?(?:\s+|$)/i,
        operator: 'not_contains',
        fieldGroup: 1,
        valueGroup: 2,
    },
    // "<field> contains / includes <value>"
    {
        re: /\b([a-zA-Z_][a-zA-Z0-9_\s]*?)\s+(?:contains?|includes?)\s+["']?([^"'\n,]+?)["']?(?:\s+|$)/i,
        operator: 'contains',
        fieldGroup: 1,
        valueGroup: 2,
    },
    // "<field> is not <value>"
    {
        re: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s+is\s+not\s+["']?([a-zA-Z0-9_][a-zA-Z0-9_\s-]*)["']?/i,
        operator: 'not_equals',
        fieldGroup: 1,
        valueGroup: 2,
    },
    // "if <field> is <value>" — must come after "is not"
    {
        re: /\bif\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+is\s+["']?([a-zA-Z0-9_][a-zA-Z0-9_\s-]*)["']?/i,
        operator: 'equals',
        fieldGroup: 1,
        valueGroup: 2,
    },
];
/**
 * Structural defaults for if_else. When `formFields` is set (upstream form output keys),
 * emit `$json.<internalKey>` so conditions match runtime merged input / $json.
 */
function deriveIfElseConditionsFromIntent(intentText, formFields) {
    if (!intentText)
        return [];
    const canonical = intentText
        .replace(/≤/g, '<=')
        .replace(/≥/g, '>=')
        .replace(/–/g, '-')
        .replace(/—/g, '-');
    for (const { re, operator, fieldGroup, valueGroup } of IF_ELSE_INTENT_PATTERNS) {
        const m = canonical.match(re);
        if (!m)
            continue;
        const leftRaw = m[fieldGroup].trim();
        const rightRaw = m[valueGroup].trim();
        const left = (0, intent_extraction_1.normalizeFieldKey)(leftRaw);
        const isNumber = /^[0-9]+(?:\.[0-9]+)?$/.test(rightRaw);
        const value = isNumber ? Number(rightRaw) : rightRaw.trim();
        let resolvedOperator = operator;
        if (operator === '__symbol__') {
            const sym = m[2];
            const { ruleOperator } = operatorMeta(sym);
            resolvedOperator = ruleOperator;
        }
        else if (operator === '__word_compare__') {
            const word = m[2].toLowerCase();
            const { ruleOperator } = operatorMeta(word);
            resolvedOperator = ruleOperator;
        }
        const resolved = formFields && formFields.length > 0 ? (0, form_ifelse_binding_1.resolveFormFieldKeyForConditionOperand)(left, formFields) : null;
        const fieldPath = resolved ? `$json.${resolved}` : `$json.${left}`;
        return [{ field: fieldPath, operator: resolvedOperator, value }];
    }
    return [];
}
/**
 * After form fields are materialized, re-bind if_else conditions that still use `input.*`
 * to `$json.<internalKey>` using upstream form fields (same graph traversal as repair pass).
 */
function bindIfElseConditionsToUpstreamForms(workflow) {
    const intentText = getWorkflowIntentText(workflow);
    const nodes = (workflow.nodes || []).map((node) => {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        if (nodeType !== 'if_else')
            return node;
        const ctx = (0, form_ifelse_binding_1.findUpstreamFormContextForIfElse)(workflow, String(node.id));
        if (!ctx?.fields?.length)
            return node;
        const cond = node.data?.config?.conditions;
        if (!(0, form_ifelse_binding_1.conditionsReferenceInputPaths)(cond) && !(0, form_ifelse_binding_1.conditionsHaveMismatchedJsonPaths)(cond, ctx.fields))
            return node;
        const next = deriveIfElseConditionsFromIntent(intentText, ctx.fields);
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
    return { ...workflow, nodes };
}
function deriveSwitchCasesFromIntent(intentText) {
    if (!intentText)
        return [];
    // Delegate to the canonical, registry-driven extractor — single source of truth.
    const { planSwitchCasesFromPrompt } = require('./switch-case-plan');
    const plan = planSwitchCasesFromPrompt(intentText, undefined);
    return plan.cases;
}
function deriveSwitchExpressionFromIntent(intentText, cases) {
    if (!intentText)
        return '';
    const lower = intentText.toLowerCase();
    const fieldMatch = lower.match(/\b(?:switch|route|classify|categorize)\b[\s\S]{0,30}\b(?:on|by|using|from)\s+([a-z_][a-z0-9_]*)/i) ||
        lower.match(/\bevaluate\s+([a-z_][a-z0-9_]*)/i) ||
        lower.match(/\bif\s+([a-z_][a-z0-9_]*)\s*(?:is|equals?|==|=)/i);
    if (fieldMatch?.[1]) {
        const key = (0, intent_extraction_1.normalizeFieldKey)(fieldMatch[1]);
        return `{{$json.${key}}}`;
    }
    if (lower.includes('classify') || lower.includes('categorize') || lower.includes('route')) {
        // Canonical expression placeholder resolved at runtime by upstream classifier output.
        return '{{$json.category}}';
    }
    const firstCase = String(cases[0]?.value || '');
    return firstCase ? `{{$json.route || '${firstCase}'}}` : '';
}
function normalizeSwitchCasesValue(raw) {
    let candidate = raw;
    if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (!trimmed)
            return [];
        try {
            candidate = JSON.parse(trimmed);
        }
        catch {
            return [];
        }
    }
    if (!Array.isArray(candidate))
        return [];
    const out = [];
    const seen = new Set();
    for (const item of candidate) {
        const valueRaw = typeof item === 'string' ? item : item?.value != null ? String(item.value) : '';
        const value = (0, intent_extraction_1.normalizeFieldKey)(String(valueRaw || ''));
        if (!value || seen.has(value))
            continue;
        seen.add(value);
        const label = typeof item === 'object' && item !== null && typeof item.label === 'string'
            ? String(item.label)
            : (0, intent_extraction_1.toTitleLabel)(value);
        out.push({ value, label });
    }
    return out;
}
/** Form Trigger shares the same `fields` shape as Form; intent derivation must run for both. */
function isFormLikeNodeType(nodeType) {
    return nodeType === 'form' || nodeType === 'form_trigger';
}
function deriveStructuralValueFromIntent(nodeType, fieldName, intentText, workflow) {
    if (isFormLikeNodeType(nodeType) && fieldName === 'fields') {
        const formText = getFormStructuralIntentText(workflow);
        return deriveFormFieldsFromIntent(formText || intentText, workflow);
    }
    if (nodeType === 'if_else' && fieldName === 'conditions') {
        return deriveIfElseConditionsFromIntent(intentText);
    }
    if (nodeType === 'switch' && fieldName === 'cases') {
        // Use the clean user-only prompt for switch case extraction — never the full generated blob.
        const switchIntentText = getFormStructuralIntentText(workflow);
        return deriveSwitchCasesFromIntent(switchIntentText || intentText);
    }
    if (nodeType === 'switch' && fieldName === 'expression') {
        const switchIntentText = getFormStructuralIntentText(workflow);
        const cases = deriveSwitchCasesFromIntent(switchIntentText || intentText);
        return deriveSwitchExpressionFromIntent(switchIntentText || intentText, cases);
    }
    return undefined;
}
function materializeStructuralFields(workflow, options) {
    const freezeBoundary = workflow?.metadata?.freezeBoundary;
    if (options?.postFreezeReadonly || freezeBoundary?.frozen === true) {
        return workflow;
    }
    const intentText = getWorkflowIntentText(workflow);
    const combinedIntentText = getFormStructuralIntentText(workflow) || intentText;
    const unresolved = [];
    const nodes = (workflow.nodes || []).map((node) => {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        let def = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
        // Library registers Form Trigger as `form`; workflows often use `form_trigger`. Share one definition.
        if (!def?.inputSchema && isFormLikeNodeType(nodeType)) {
            def = unified_node_registry_1.unifiedNodeRegistry.get('form');
        }
        if (!def?.inputSchema)
            return node;
        const inputSchema = def.inputSchema;
        const config = { ...(node.data?.config || {}) };
        let changed = false;
        if (nodeType === 'switch') {
            const normalizedCasesPrimary = normalizeSwitchCasesValue(config.cases);
            const normalizedCasesFallback = normalizeSwitchCasesValue(config.rules);
            const normalizedCases = normalizedCasesPrimary.length > 0 ? normalizedCasesPrimary : normalizedCasesFallback;
            const currentCases = normalizeSwitchCasesValue(config.cases);
            // ✅ UNIVERSAL FIX: Detect contaminated or truncated cases.
            // Always use the clean user-only prompt — never the full generated blob which contains
            // configuration contract boilerplate that would pollute case extraction.
            const switchIntentText = getFormStructuralIntentText(workflow) || combinedIntentText;
            const { planSwitchCasesFromPrompt } = require('./switch-case-plan');
            const freshPlan = planSwitchCasesFromPrompt(switchIntentText, undefined);
            const hasContaminatedCases = currentCases.some((c) => {
                const v = String(c?.value || '');
                return v.includes('_via_') || v.length > 32;
            });
            // Only consider truncation when there are actual saved cases to compare against.
            // If currentCases is empty but normalizedCases (from rules fallback) is valid, use that instead.
            const effectiveSavedCases = currentCases.length > 0 ? currentCases : normalizedCases;
            const isTruncated = effectiveSavedCases.length > 0 &&
                freshPlan.cases.length > effectiveSavedCases.length &&
                freshPlan.cases.length >= 2;
            // Re-derive from intent if cases are contaminated, truncated, or structurally wrong
            if ((hasContaminatedCases || isTruncated) && freshPlan.cases.length > 0) {
                config.cases = freshPlan.cases;
                config.rules = freshPlan.cases;
                changed = true;
                console.log(`[StructureMaterializer] ✅ Replaced ${hasContaminatedCases ? 'contaminated' : 'truncated'} switch cases with intent-derived: ${freshPlan.cases.map((c) => c.value).join(', ')}`);
            }
            else if (normalizedCases.length > 0 && JSON.stringify(currentCases) !== JSON.stringify(normalizedCases)) {
                config.cases = normalizedCases;
                changed = true;
            }
        }
        if (!config._fillMode || typeof config._fillMode !== 'object') {
            config._fillMode = {};
        }
        const fillMode = config._fillMode;
        for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
            if (!(0, field_ownership_1.isStructuralOwnership)(fieldName, fieldDef))
                continue;
            const current = config[fieldName];
            const missingBase = isMissingStructuralValue(current, fieldDef.required);
            const formFieldsStale = isFormLikeNodeType(nodeType) &&
                fieldName === 'fields' &&
                fillMode['fields'] !== 'buildtime_ai_once' &&
                formFieldsEffectivelyMissing(current, workflow, combinedIntentText);
            if (missingBase || formFieldsStale) {
                const intentDerived = deriveStructuralValueFromIntent(nodeType, fieldName, intentText, workflow);
                if (intentDerived !== undefined && !isMissingStructuralValue(intentDerived, fieldDef.required)) {
                    config[fieldName] = intentDerived;
                    changed = true;
                }
                else if (fieldDef.default !== undefined && !isMissingStructuralValue(fieldDef.default, fieldDef.required)) {
                    config[fieldName] = fieldDef.default;
                    changed = true;
                }
                else {
                    const fallback = structuralFallback(fieldDef.type);
                    config[fieldName] = fallback;
                    if (fieldDef.required) {
                        unresolved.push({
                            nodeId: node.id,
                            nodeType,
                            fieldName,
                            reason: 'missing_structural_value',
                            confidence: 'low',
                            requiresUserConfirmation: true,
                        });
                    }
                    changed = true;
                }
            }
            if (fillMode[fieldName] === 'runtime_ai') {
                fillMode[fieldName] = 'buildtime_ai_once';
                changed = true;
            }
        }
        // ── NEW: Stamp _fillMode for non-structural buildtime_ai_once fields ─────
        // property-population-stage may have written values without stamping _fillMode
        // (pre-fix workflows in DB). Ensure every field with fillMode.default === 'buildtime_ai_once'
        // and a non-empty stored value carries the stamp so attach-inputs can guard it.
        for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
            if ((0, field_ownership_1.isStructuralOwnership)(fieldName, fieldDef))
                continue; // already handled above
            if (fieldDef.fillMode?.default !== 'buildtime_ai_once')
                continue;
            if (fieldDef.ownership === 'credential')
                continue;
            if (fillMode[fieldName] !== undefined)
                continue; // already stamped — don't overwrite
            const storedValue = config[fieldName];
            const isEmpty = storedValue === undefined ||
                storedValue === null ||
                storedValue === '' ||
                (Array.isArray(storedValue) && storedValue.length === 0) ||
                (typeof storedValue === 'object' &&
                    !Array.isArray(storedValue) &&
                    Object.keys(storedValue).length === 0);
            if (!isEmpty) {
                fillMode[fieldName] = 'buildtime_ai_once';
                changed = true;
            }
        }
        // Reconcile every field to its registry-computed effective mode — including fields that
        // already carry an explicit-but-policy-invalid stamp (e.g. AI tagged `runtime_ai` on a field
        // where the registry sets `supportsRuntimeAI: false`). buildEffectiveFillModes already applies
        // coerceFieldFillModeByPolicy per field, so a stamp that's already policy-correct is a no-op here.
        const effectiveFillModes = (0, fill_mode_resolver_1.buildEffectiveFillModes)(inputSchema, config);
        for (const fieldName of Object.keys(inputSchema)) {
            const cur = fillMode[fieldName];
            const effective = effectiveFillModes[fieldName];
            if (effective !== undefined && effective !== cur) {
                fillMode[fieldName] = effective;
                changed = true;
            }
        }
        for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
            if (!(0, field_ownership_1.isStructuralOwnership)(fieldName, fieldDef))
                continue;
            if (fillMode[fieldName] === 'runtime_ai') {
                fillMode[fieldName] = 'buildtime_ai_once';
                changed = true;
            }
        }
        if (isFormLikeNodeType(nodeType) && Array.isArray(config.fields)) {
            const normalizedFields = (0, form_field_identity_1.normalizeFormFieldsIdentity)(config.fields);
            if (JSON.stringify(normalizedFields) !== JSON.stringify(config.fields)) {
                config.fields = normalizedFields;
                changed = true;
            }
        }
        if (!changed)
            return node;
        return {
            ...node,
            data: {
                ...(node.data || {}),
                config,
            },
        };
    });
    const metadata = {
        ...(workflow.metadata || {}),
        structuralDiagnostics: {
            unresolved,
        },
    };
    let withMeta = { ...workflow, nodes, metadata };
    withMeta = bindIfElseConditionsToUpstreamForms(withMeta);
    return withMeta;
}
function getStructuralDiagnostics(workflow) {
    const diagnostics = workflow?.metadata?.structuralDiagnostics;
    if (!diagnostics || !Array.isArray(diagnostics.unresolved)) {
        return { unresolved: [] };
    }
    return diagnostics;
}
