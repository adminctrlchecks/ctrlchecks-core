"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractBranchIntentSignals = extractBranchIntentSignals;
exports.expectedBranchTargetCount = expectedBranchTargetCount;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const node_capability_registry_dsl_1 = require("../../services/ai/node-capability-registry-dsl");
function isOutputNodeType(nodeType) {
    const def = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (!def)
        return false;
    return node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isOutput(nodeType) || (def.tags || []).includes('output');
}
function unique(values) {
    return Array.from(new Set(values));
}
function extractBranchIntentSignals(userPrompt) {
    const raw = userPrompt || '';
    const prompt = raw.toLowerCase();
    const hasTemporalLead = /\b(when|once|after|upon|as soon as)\b/.test(prompt);
    const hasAlternativeCue = /\b(else|otherwise|either|or|fallback|alternatively|instead)\b/.test(prompt);
    const hasConditionLead = /\b(if|unless|provided that|in case)\b/.test(prompt);
    const hasIfElse = /\bif\b/.test(prompt) &&
        (/\belse\b/.test(prompt) || /\botherwise\b/.test(prompt) || /\bif not\b/.test(prompt));
    const ifClauseCount = (prompt.match(/\bif\b/g) || []).length;
    const hasMultipleIfClauses = ifClauseCount >= 2;
    const hasOutcomeLanguage = /\b(eligible|ineligible|approve|reject|success|failure|pass|fail|yes|no|true|false)\b/.test(prompt);
    const hasComparisonBranch = /(>=|<=|>|<|≥|≤|\bgreater than\b|\bless than\b|\bequals\b|\bequal to\b)/.test(prompt);
    const hasSwitchKeywords = /\bswitch\b/.test(prompt) || /\bcase\b/.test(prompt);
    // Universal compositional rule: avoid single-token false positives
    // (e.g. temporal "when I submit..." in linear prompts).
    const hasCompositionalBranchIntent = hasIfElse ||
        hasMultipleIfClauses ||
        hasSwitchKeywords ||
        (hasComparisonBranch && (hasAlternativeCue || hasConditionLead)) ||
        (hasOutcomeLanguage && hasAlternativeCue);
    const hasBranchingIntent = hasCompositionalBranchIntent && !(hasTemporalLead && !hasConditionLead && !hasAlternativeCue);
    // Backward-compatible explicit outcome floor.
    let explicitOutcomeCount = 0;
    if (hasIfElse)
        explicitOutcomeCount = Math.max(explicitOutcomeCount, 2);
    const enumerated = prompt.match(/\b(or|either)\b/g);
    if (enumerated && enumerated.length > 0) {
        explicitOutcomeCount = Math.max(explicitOutcomeCount, 2);
    }
    if (!hasBranchingIntent) {
        explicitOutcomeCount = 0;
    }
    const mentionedOutputNodeTypes = [];
    for (const nodeType of unified_node_registry_1.unifiedNodeRegistry.getAllTypes()) {
        if (!isOutputNodeType(nodeType))
            continue;
        const def = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
        const label = (def?.label || '').toLowerCase();
        const typeToken = nodeType.toLowerCase();
        if (typeToken && prompt.includes(typeToken)) {
            mentionedOutputNodeTypes.push(nodeType);
            continue;
        }
        if (label && label.length >= 3 && prompt.includes(label)) {
            mentionedOutputNodeTypes.push(nodeType);
            continue;
        }
    }
    // Sort mentionedOutputNodeTypes by their first appearance position in the prompt
    // so the branch chain body order matches the prompt's case order.
    mentionedOutputNodeTypes.sort((a, b) => {
        const defA = unified_node_registry_1.unifiedNodeRegistry.get(a);
        const defB = unified_node_registry_1.unifiedNodeRegistry.get(b);
        const labelA = (defA?.label || '').toLowerCase();
        const labelB = (defB?.label || '').toLowerCase();
        const posA = Math.min(prompt.includes(a.toLowerCase()) ? prompt.indexOf(a.toLowerCase()) : Infinity, labelA.length >= 3 && prompt.includes(labelA) ? prompt.indexOf(labelA) : Infinity);
        const posB = Math.min(prompt.includes(b.toLowerCase()) ? prompt.indexOf(b.toLowerCase()) : Infinity, labelB.length >= 3 && prompt.includes(labelB) ? prompt.indexOf(labelB) : Infinity);
        return posA - posB;
    });
    // --- NEW: richer signals for universal branching ---
    // 1. Outcome descriptors — extract all condition VALUES from the prompt.
    //    Strategy: run both patterns and merge, deduplicating.
    //    The field name (e.g. "status") is excluded from values.
    const outcomeDescriptors = [];
    const seenDescriptors = new Set();
    // Detect the discriminator field first (used to exclude it from values below)
    // Quick pre-scan: "if <field> is <value>" — the field is the word before "is"
    let detectedField;
    const fieldPreScan = /\bif\s+([a-z0-9_]+)\s+is\s+[a-z0-9_]+/i.exec(prompt);
    if (fieldPreScan)
        detectedField = fieldPreScan[1].toLowerCase();
    // Pattern A: "if <field> is <value>" — capture the VALUE
    // e.g. "if status is shipped" → "shipped"
    const ifFieldIsValueRegex = /\bif\s+[a-z0-9_]+\s+is\s+([a-z0-9_]+)\b/g;
    let ifFivMatch;
    while ((ifFivMatch = ifFieldIsValueRegex.exec(prompt)) !== null) {
        const candidate = ifFivMatch[1].toLowerCase();
        if (candidate && candidate.length <= 20 && !/\d/.test(candidate) && !seenDescriptors.has(candidate)) {
            seenDescriptors.add(candidate);
            outcomeDescriptors.push(candidate);
        }
    }
    // Pattern B: "if <value>" with no "is" following — captures standalone condition values
    // e.g. "if processing, send..." → "processing", "if cancelled, send..." → "cancelled"
    // Skip the field name itself (e.g. "status") and words already captured by Pattern A
    const ifOutcomeRegex = /\bif\s+([a-z0-9_]+)\b(?!\s+is\b)/g;
    let ifMatch;
    while ((ifMatch = ifOutcomeRegex.exec(prompt)) !== null) {
        const candidate = ifMatch[1].toLowerCase();
        // Skip: field name, already seen, too short/long, contains digits
        if (!candidate || candidate.length > 20 || /\d/.test(candidate))
            continue;
        if (detectedField && candidate === detectedField)
            continue;
        if (seenDescriptors.has(candidate))
            continue;
        seenDescriptors.add(candidate);
        outcomeDescriptors.push(candidate);
    }
    // 2. Discriminator field from phrases like "switch on X", "route by X", "based on X",
    //    or "if <field> is <value>" patterns.
    let discriminatorField;
    const discriminatorRegexes = [
        /\bswitch\s+(?:on|by|using)\s+([a-z_][a-z0-9_]*)/i,
        /\bbased\s+on\s+([a-z_][a-z0-9_]*)/i,
        /\bdepending\s+on\s+([a-z_][a-z0-9_]*)/i,
        /\broute\s+by\s+([a-z_][a-z0-9_]*)/i,
        // "if <field> is <value>" — extract the field name
        /\bif\s+([a-z_][a-z0-9_]*)\s+is\s+[a-z0-9_]+/i,
    ];
    for (const re of discriminatorRegexes) {
        const m = re.exec(raw);
        if (m && m[1]) {
            discriminatorField = m[1];
            break;
        }
    }
    // 3. Branch type inference.
    let branchType = null;
    if (hasSwitchKeywords || outcomeDescriptors.length >= 3) {
        branchType = 'switch';
    }
    else if (hasIfElse || hasOutcomeLanguage || hasComparisonBranch) {
        branchType = 'if_else';
    }
    // 4. Estimated branch count: prefer descriptors, then explicit outcome floor.
    let estimatedBranchCount = 0;
    if (outcomeDescriptors.length > 0) {
        estimatedBranchCount = outcomeDescriptors.length;
    }
    else if (explicitOutcomeCount > 0) {
        estimatedBranchCount = explicitOutcomeCount;
    }
    else if (hasBranchingIntent) {
        // Fallback: at least 2 whenever we know there is branching intent.
        estimatedBranchCount = 2;
    }
    // Switch-style prompts with weak descriptors should still aim for >= 3.
    if (branchType === 'switch' && estimatedBranchCount < 3) {
        estimatedBranchCount = 3;
    }
    // 5. Confidence heuristic for diagnostics.
    let confidence = 0;
    if (!hasBranchingIntent) {
        confidence = 0;
    }
    else {
        confidence = 0.4;
        if (branchType === 'switch' && outcomeDescriptors.length >= 3) {
            confidence += 0.4;
        }
        else if (branchType === 'if_else' && explicitOutcomeCount >= 2) {
            confidence += 0.3;
        }
        if (discriminatorField) {
            confidence += 0.1;
        }
        if (mentionedOutputNodeTypes.length > 0) {
            confidence += 0.1;
        }
        if (confidence > 1)
            confidence = 1;
    }
    return {
        hasBranchingIntent,
        explicitOutcomeCount,
        mentionedOutputNodeTypes: unique(mentionedOutputNodeTypes),
        branchType,
        estimatedBranchCount,
        outcomeDescriptors: unique(outcomeDescriptors),
        discriminatorField,
        confidence,
    };
}
function expectedBranchTargetCount(signals) {
    if (!signals.hasBranchingIntent)
        return 1;
    // Prefer richer estimate when available; fall back to explicitOutcomeCount (for legacy callers).
    const baseCount = signals.estimatedBranchCount && signals.estimatedBranchCount > 0
        ? signals.estimatedBranchCount
        : signals.explicitOutcomeCount;
    // For generic branching, ensure at least 2 outputs.
    let required = Math.max(2, baseCount || 0);
    // For switch-style prompts, strongly prefer 3+ distinct targets.
    if (signals.branchType === 'switch') {
        required = Math.max(required, 3);
    }
    return required;
}
