"use strict";
/**
 * Shared intent extraction for form fields and condition operands — registry-agnostic, no node-type switches.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORM_FIELDS_PLACEHOLDER_FIELD_ID = void 0;
exports.sanitizeIntentTextForFormFieldExtraction = sanitizeIntentTextForFormFieldExtraction;
exports.isLikelyContaminatedFieldKey = isLikelyContaminatedFieldKey;
exports.normalizeFieldKey = normalizeFieldKey;
exports.toTitleLabel = toTitleLabel;
exports.inferFieldTypeFromKey = inferFieldTypeFromKey;
exports.extractFieldNamesFromIntent = extractFieldNamesFromIntent;
exports.extractInputOperandKeysFromText = extractInputOperandKeysFromText;
exports.collectIfElseReferencedInputKeys = collectIfElseReferencedInputKeys;
exports.deriveOrderedFieldKeysForForm = deriveOrderedFieldKeysForForm;
exports.buildFormFieldRecordsFromKeys = buildFormFieldRecordsFromKeys;
exports.isPlaceholderFormFields = isPlaceholderFormFields;
exports.formFieldsMissingReferencedKeys = formFieldsMissingReferencedKeys;
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const if_else_conditions_1 = require("../../core/utils/if-else-conditions");
const form_field_identity_1 = require("../../core/utils/form-field-identity");
const form_field_type_resolver_1 = require("./form-field-type-resolver");
exports.FORM_FIELDS_PLACEHOLDER_FIELD_ID = 'field_response_placeholder';
/**
 * Strips registry fill-contract / planner boilerplate often concatenated into `generatedFrom`.
 * Prevents "fields (required ownership=…)" and "### Form Trigger" lines from becoming fake form keys.
 *
 * Hardened per spec task 10 to strip ALL registry fill contract headers:
 * - "## Configuration contract"
 * - "Semantics (universal):"
 * - "Planner rules:"
 * - "ownership=" (any variant)
 * - "buildtime_ai_once", "manual_static", "runtime_ai" (fill mode tokens)
 * - Execution-order slugs and node type labels in parentheses
 */
function sanitizeIntentTextForFormFieldExtraction(raw) {
    if (!raw || typeof raw !== 'string')
        return '';
    let s = raw.replace(/\r\n/g, '\n');
    const cutPoints = [
        /\n##\s*Configuration contract\b/i,
        /\n\*\*Planner rules:\*\*/i,
        /\n##\s*Semantics\b/i,
        /\n\*\*Semantics \(universal\):\*\*/i,
        /\nTerminals:\s*\d+\s+separate\s+log_output/i,
        // Additional cut points for registry structural fill contract sections
        /\n###\s*Fill Contract\b/i,
        /\n##\s*Registry Fill Contract\b/i,
    ];
    for (const re of cutPoints) {
        const m = s.search(re);
        if (m >= 0)
            s = s.slice(0, m);
    }
    const lines = s.split('\n');
    const kept = [];
    for (const line of lines) {
        const t = line.trim();
        if (/^detected\s+nodes\s*:/i.test(t) ||
            /^branch\s+slots\s*:/i.test(t) ||
            /^execution\s*:/i.test(t) ||
            /^terminals?\s*:/i.test(t) ||
            /^intent\s+alignment\s*:/i.test(t) ||
            /ownership\s*=\s*(structural|credential|value)/i.test(t) ||
            /\b(buildtime_ai_once|manual_static|runtime_ai)\b/i.test(t) ||
            /\brole\s*=\s*(title_like|raw_json|content|long_body)/i.test(t) ||
            /^#{1,6}\s+###?\s*(Form Trigger|If\/Else|Gmail|Slack|Log Output)/i.test(t) ||
            // Strip execution-order slugs: lines that are just "N. node_type (label)" patterns
            /^\d+\.\s+[a-z_]+\s+\([^)]+\)\s*$/i.test(t) ||
            // Strip node type labels in parentheses at end of line (execution order labels)
            /\([a-z_]+\)\s*$/.test(t) && /^\d+\./.test(t)) {
            continue;
        }
        kept.push(line);
    }
    return kept.join('\n').trim();
}
/** Keys that appear when doc / execution templates are mistaken for user data fields. */
function isBoilerplateOrDocFormKey(k) {
    if (!k)
        return true;
    if (k.length > 28)
        return true;
    if (/^\d+_/.test(k))
        return true;
    if (/^(default_|from_the_|buildtime_|manual_|runtime_)/.test(k))
        return true;
    if (/(^|_)(total|detected|unique|types|slots|execution|terminal|terminals|alignment)($|_)/.test(k))
        return true;
    if (/^\d+_unique_types$/.test(k))
        return true;
    if (/(^|_)(conditions|cases)$/.test(k) && (k.includes('if_else') || k.includes('switch')))
        return true;
    if (k === 'etc' || k === 'universal' || k === 'when_shown')
        return true;
    if (k === 'are_filled' || k === 'from_the_narrative' || k === 'default_fill_mode')
        return true;
    if (k === 'success_path' || k === 'fallback_path')
        return true;
    if (k === 'semantic' || k === 'semantics')
        return true;
    // Execution-line role labels, not data fields
    if (/_path$/.test(k) && (k.includes('success') || k.includes('fallback')))
        return true;
    return false;
}
/**
 * Node type ids that appear in Execution lines as "(form)", "(if_else)", etc. — not user data fields.
 * Do not use unifiedNodeRegistry.has(singleWord): that would drop real fields like "email" if a node id collided.
 */
const EXECUTION_LINE_NODE_SLUGS = new Set([
    'form',
    'form_trigger',
    'if_else',
    'switch',
    'google_gmail',
    'slack_message',
    'slack_webhook',
    'log_output',
    'manual_trigger',
    'schedule',
    'webhook',
    'respond_to_webhook',
    'interval',
    'chat_model',
    'ai_chat_model',
]);
function isExecutionLineNodeSlug(k) {
    if (!k)
        return false;
    return EXECUTION_LINE_NODE_SLUGS.has(k);
}
function isLikelyContaminatedFieldKey(raw) {
    const k = normalizeFieldKey(raw || '');
    if (!k)
        return true;
    if (isBoilerplateOrDocFormKey(k))
        return true;
    if (isExecutionLineNodeSlug(k))
        return true;
    if (/(^|_)(detected|nodes|branch|slots|execution|terminal|terminals|unique|types|total)($|_)/.test(k))
        return true;
    return false;
}
function normalizeFieldKey(label) {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32);
}
const FIELD_HEAD_ALIASES = {
    age: 'age',
    email: 'email',
    e_mail: 'email',
    mail: 'email',
    phone: 'phone',
    mobile: 'phone',
    tel: 'phone',
    name: 'name',
    full_name: 'name',
    first_name: 'first_name',
    last_name: 'last_name',
    status: 'status',
    color: 'color',
    message: 'message',
    comment: 'comment',
    description: 'description',
    details: 'details',
    // Extended aliases for common intent-driven field names
    category: 'category',
    date: 'date',
    url: 'url',
    quantity: 'quantity',
    price: 'price',
    amount: 'amount',
    cost: 'cost',
    subject: 'subject',
    title: 'title',
    rating: 'rating',
    score: 'score',
    priority: 'priority',
    type: 'type',
    ticket: 'ticket',
    vip: 'ticket_type',
    regular: 'ticket_type',
};
const FIELD_NOISE_TOKENS = new Set([
    'details',
    'detail',
    'through',
    'including',
    'include',
    'form',
    'submission',
    'submit',
    'submitted',
    'user',
    'workflow',
    'where',
    'with',
    'and',
    'or',
    'a',
    'an',
    'the',
    'etc',
    'universal',
    'semantic',
    'semantics',
    'narrative',
    // Ownership/contract vocabulary should never become field keys.
    'ownership',
    'structural',
    'credential',
    'value',
]);
function splitSemanticTokens(text) {
    const cleaned = text
        .toLowerCase()
        .replace(/[^a-z0-9_ ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!cleaned)
        return [];
    return cleaned
        .split(' ')
        .map((token) => normalizeFieldKey(token))
        .filter(Boolean);
}
function extractSemanticFieldCandidate(raw) {
    const key = normalizeFieldKey(raw);
    if (!key)
        return null;
    if (FIELD_HEAD_ALIASES[key])
        return FIELD_HEAD_ALIASES[key];
    const tokens = splitSemanticTokens(raw);
    for (const token of tokens) {
        if (FIELD_HEAD_ALIASES[token] && !FIELD_NOISE_TOKENS.has(token)) {
            return FIELD_HEAD_ALIASES[token];
        }
    }
    if (!key.includes('_'))
        return key;
    const parts = key.split('_').filter(Boolean);
    const noiseCount = parts.filter((p) => FIELD_NOISE_TOKENS.has(p)).length;
    const noiseRatio = parts.length === 0 ? 1 : noiseCount / parts.length;
    if (parts.length <= 3 && noiseRatio < 0.5) {
        return key;
    }
    return null;
}
function toTitleLabel(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
}
function inferFieldTypeFromKey(key) {
    return (0, form_field_type_resolver_1.inferFormFieldTypeFromKey)(key);
}
function filterNodeTypeLikeFieldKeys(keys) {
    return keys.filter((key) => {
        if (!key.includes('_'))
            return true;
        return !unified_node_registry_1.unifiedNodeRegistry.has(key);
    });
}
function extractFieldNamesFromIntent(intentText) {
    const sanitized = sanitizeIntentTextForFormFieldExtraction(intentText);
    const out = [];
    const seen = new Set();
    const push = (raw) => {
        const key = extractSemanticFieldCandidate(raw);
        if (!key || seen.has(key))
            return;
        const nk = normalizeFieldKey(key);
        if (isBoilerplateOrDocFormKey(nk))
            return;
        seen.add(key);
        out.push(key);
    };
    const parenthetical = sanitized.match(/\(([^)]+)\)/g) || [];
    for (const chunk of parenthetical) {
        const inner = chunk.slice(1, -1);
        inner
            .split(/,|\/|\bor\b|\band\b/gi)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((segment) => {
            const seg = segment.trim();
            if (!seg)
                return;
            const nk = normalizeFieldKey(seg);
            if (isBoilerplateOrDocFormKey(nk))
                return;
            if (isExecutionLineNodeSlug(nk))
                return;
            if (/\b(total|unique\s+types|branch\s+slots)\b/i.test(seg))
                return;
            if (/success\s+path|fallback\s+path/i.test(seg))
                return;
            push(seg);
        });
    }
    // "fields: a, b" / "inputs: a, b"
    const fieldsClauses = sanitized.match(/\b(fields?|inputs?)\s*[:=]\s*([^\n]+)/gi) || [];
    for (const clause of fieldsClauses) {
        if (/ownership|structural|buildtime_ai|manual_static|runtime_ai|role\s*=/i.test(clause))
            continue;
        const rhs = clause.replace(/\b(fields?|inputs?)\s*[:=]\s*/i, '');
        rhs
            .split(/,|\/|\bor\b|\band\b/gi)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach(push);
    }
    // "Create a form with fields Name, Email, Color" (no colon) — exclude doc lines like "fields (required ownership"
    const fieldsInline = sanitized.match(/\bfields\s+([^.\n]+)/gi) || [];
    for (const clause of fieldsInline) {
        if (/ownership|structural|required\s*\(|buildtime_ai|manual_static|role\s*=/i.test(clause))
            continue;
        const rhs = clause.replace(/^\s*fields\s*:?\s*/i, '').trim();
        if (!rhs || /^\(/.test(rhs))
            continue;
        rhs
            .split(/,|\/|\bor\b|\band\b/gi)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach(push);
    }
    const collectionClauses = sanitized.match(/\b(collect|capture|submit(?:ted|s)?|asks?\s+for|including|include)\b[\s\S]{0,120}/gi) || [];
    for (const clause of collectionClauses) {
        const firstSentence = clause.split(/[.\n]/)[0] || clause;
        firstSentence
            .split(/,|\/|\bor\b|\band\b/gi)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((token) => {
            const cleaned = token
                .replace(/\b(collect|capture|submit(?:ted|s)?|asks?\s+for|including|include|with|fields?|inputs?)\b/gi, '')
                .trim();
            if (cleaned)
                push(cleaned);
        });
    }
    // Single-token "collects/captures <optional-modifier> <field> as input" pattern
    // e.g. "collects order status as input" → "status"
    //      "captures customer email as input" → "email"
    const asInputPattern = /\b(?:collect|capture)s?\s+(?:\w+\s+){0,3}?(\w+)\s+as\s+(?:an?\s+)?input\b/gi;
    let asInputMatch;
    while ((asInputMatch = asInputPattern.exec(sanitized)) !== null) {
        push(asInputMatch[1]);
    }
    return out;
}
/** Pull `input.foo` operands from free text (user prompt or expressions). */
function extractInputOperandKeysFromText(text) {
    const sanitized = sanitizeIntentTextForFormFieldExtraction(text);
    if (!sanitized)
        return [];
    const out = [];
    const re = /\binput\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let m;
    while ((m = re.exec(sanitized)) !== null) {
        out.push(m[1]);
    }
    return out;
}
/**
 * Derive `input.<key>` operands from existing if_else nodes (planner often fills conditions before form fields).
 */
function collectIfElseReferencedInputKeys(workflow) {
    const keys = [];
    const inputFieldRe = /^input\.([a-zA-Z_][a-zA-Z0-9_]*)$/;
    const jsonFieldRe = /^\$json\.([a-zA-Z_][a-zA-Z0-9_]*)$/;
    const inputAnyRe = /\binput\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const jsonAnyRe = /\$json\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    for (const node of workflow.nodes || []) {
        const nt = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        if (nt !== 'if_else')
            continue;
        const cfg = (0, if_else_conditions_1.normalizeIfElseConfig)((node.data?.config || {}));
        const conds = cfg.conditions;
        if (!Array.isArray(conds))
            continue;
        for (const c of conds) {
            const field = typeof c?.field === 'string' ? c.field.trim() : '';
            const im = field.match(inputFieldRe);
            if (im)
                keys.push(im[1]);
            const jm = field.match(jsonFieldRe);
            if (jm)
                keys.push(jm[1]);
            const expr = typeof c?.expression === 'string' ? c.expression : '';
            let mm;
            const r = new RegExp(inputAnyRe.source, 'g');
            while ((mm = r.exec(expr)) !== null) {
                keys.push(mm[1]);
            }
            const rj = new RegExp(jsonAnyRe.source, 'g');
            while ((mm = rj.exec(expr)) !== null) {
                keys.push(mm[1]);
            }
        }
    }
    return keys;
}
/**
 * Ordered unique keys for form fields: intent phrases, prompt input.* refs, and graph if_else refs.
 */
function deriveOrderedFieldKeysForForm(intentText, workflow) {
    const orderedKeys = [];
    const seen = new Set();
    const add = (raw) => {
        const k = normalizeFieldKey(raw);
        if (!k || seen.has(k))
            return;
        if (isBoilerplateOrDocFormKey(k))
            return;
        seen.add(k);
        orderedKeys.push(k);
    };
    const text = sanitizeIntentTextForFormFieldExtraction(intentText || '');
    for (const k of extractFieldNamesFromIntent(text))
        add(k);
    for (const k of extractInputOperandKeysFromText(text))
        add(k);
    for (const k of collectIfElseReferencedInputKeys(workflow))
        add(k);
    return filterNodeTypeLikeFieldKeys(orderedKeys);
}
function buildFormFieldRecordsFromKeys(keys) {
    const raw = keys.map((key) => ({
        id: `field_${key}`,
        key,
        name: key,
        label: toTitleLabel(key),
        type: inferFieldTypeFromKey(key),
        required: true,
    }));
    return (0, form_field_identity_1.normalizeFormFieldsIdentity)(raw);
}
/** True when fields are the structural fallback single "response" placeholder. */
function isPlaceholderFormFields(fields) {
    if (!Array.isArray(fields) || fields.length !== 1)
        return false;
    const f = fields[0];
    const id = String(f?.id || '');
    const key = String(f?.key || f?.name || '');
    return id === exports.FORM_FIELDS_PLACEHOLDER_FIELD_ID || (key === 'response' && id.includes('placeholder'));
}
/** Keys referenced by if_else but missing from current form field list. */
function formFieldsMissingReferencedKeys(workflow, fields) {
    const needed = new Set(collectIfElseReferencedInputKeys(workflow));
    if (needed.size === 0)
        return false;
    const have = new Set();
    for (const f of fields || []) {
        const k = String(f.key || f.name || f.id || '').trim();
        if (k)
            have.add(normalizeFieldKey(k));
    }
    for (const n of needed) {
        if (!have.has(normalizeFieldKey(n)))
            return true;
    }
    return false;
}
