"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDeterministicFieldContracts = applyDeterministicFieldContracts;
const upstream_narrative_text_1 = require("../utils/upstream-narrative-text");
function asObject(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }
    return {};
}
function asNonEmptyString(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function isA1Range(value) {
    const s = value.trim();
    const singleCell = /^[A-Za-z]{1,4}[0-9]{1,7}$/;
    const cellRange = /^[A-Za-z]{1,4}[0-9]{1,7}:[A-Za-z]{1,4}[0-9]{0,7}$/;
    const colRange = /^[A-Za-z]{1,4}:[A-Za-z]{1,4}$/;
    const rowRange = /^[0-9]{1,7}:[0-9]{1,7}$/;
    return singleCell.test(s) || cellRange.test(s) || colRange.test(s) || rowRange.test(s);
}
function looksLikePromptText(value) {
    const lower = value.toLowerCase();
    return (lower.includes('planned workflow') ||
        lower.includes('summarize') ||
        lower.includes('summary') ||
        lower.includes('get data from') ||
        lower.includes('send it to'));
}
function pickUpstreamRange(upstreamPayload) {
    const obj = asObject(upstreamPayload);
    const candidates = ['range', 'sheetRange', 'a1Range'];
    for (const k of candidates) {
        const v = asNonEmptyString(obj[k]);
        if (v && isA1Range(v))
            return v;
    }
    return undefined;
}
function applyDeterministicFieldContracts(resolvedInputs, context) {
    const out = { ...resolvedInputs };
    const warnings = [];
    const repairs = [];
    if (context.nodeType === 'google_sheets') {
        const operation = asNonEmptyString(out.operation) || asNonEmptyString(context.config.operation) || 'read';
        const currentRange = asNonEmptyString(out.range);
        if (operation === 'read' && currentRange) {
            const invalid = !isA1Range(currentRange) || looksLikePromptText(currentRange);
            if (invalid) {
                const upstreamRange = pickUpstreamRange(context.upstreamPayload);
                const fallback = upstreamRange || 'A1:Z1000';
                out.range = fallback;
                repairs.push(`google_sheets.range repaired to "${fallback}"`);
                warnings.push(`Invalid google_sheets.range "${currentRange}" replaced with deterministic fallback.`);
            }
        }
        const sheetName = asNonEmptyString(out.sheetName);
        if (sheetName) {
            out.sheetName = sheetName;
        }
    }
    if (context.nodeType === 'ai_chat_model' || context.nodeType === 'text_summarizer' || context.nodeType === 'ai_service') {
        const promptLikeKeys = ['prompt', 'query', 'text', 'message'];
        const hasPromptLike = promptLikeKeys.some((k) => asNonEmptyString(out[k]) !== undefined);
        if (!hasPromptLike) {
            const upstream = asObject(context.upstreamPayload);
            const upstreamText = asNonEmptyString(upstream.text) || asNonEmptyString(upstream.message);
            const fallback = upstreamText || context.userIntent || 'Summarize the upstream payload clearly and concisely.';
            out.prompt = fallback;
            repairs.push(`${context.nodeType}.prompt backfilled from deterministic fallback`);
        }
    }
    // Registry-driven: fill post body / long_body fields from upstream narrative when router mis-mapped (e.g. ai_agent → linkedin).
    const schema = context.inputSchema;
    if (schema && typeof schema === 'object') {
        const upstreamType = (0, upstream_narrative_text_1.getUpstreamNodeTypeFromExecutionGlobal)();
        const narrative = (0, upstream_narrative_text_1.pickPrimaryNarrativeStringFromUpstreamOutput)(upstreamType, context.upstreamPayload);
        if (narrative && narrative.length > 0) {
            for (const [fieldName, rawDef] of Object.entries(schema)) {
                const fd = rawDef;
                if (!fd || (fd.role !== 'content' && fd.role !== 'long_body' && fd.role !== 'prompt'))
                    continue;
                const t = String(fd.type || '').toLowerCase();
                if (t !== 'string' && t !== 'text' && t !== 'markdown' && t !== 'expression')
                    continue;
                const cur = asNonEmptyString(out[fieldName]);
                if (cur && cur.length > 2 && !cur.trim().startsWith('{'))
                    continue;
                if (!cur || cur.trim().startsWith('{')) {
                    out[fieldName] = narrative;
                    repairs.push(`${context.nodeType}.${fieldName} from upstream narrative (registry role ${fd.role})`);
                }
            }
        }
    }
    return { resolvedInputs: out, warnings, repairs };
}
