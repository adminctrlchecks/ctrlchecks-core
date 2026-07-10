"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCapabilitySelectionStage = runCapabilitySelectionStage;
exports.mapRegistryCategoryToIntentClass = mapRegistryCategoryToIntentClass;
const logger_1 = require("../../../core/logger");
const unified_node_registry_1 = require("../../../core/registry/unified-node-registry");
const gemini_orchestrator_1 = require("../gemini-orchestrator");
const system_prompt_builder_1 = require("../system-prompt-builder");
const node_catalog_builder_1 = require("../node-catalog-builder");
const capability_stage_client_1 = require("./capability-stage-client");
async function runCapabilitySelectionStage(intent, correlationId) {
    const startedAt = Date.now();
    const nodeCatalog = (0, node_catalog_builder_1.buildNodeCatalogText)();
    const { systemPrompt } = system_prompt_builder_1.systemPromptBuilder.build({
        stage: 'capability_selection',
        nodeCatalog,
        userIntent: intent.intent,
    });
    const userMessage = [
        'STRUCTURED_INTENT:',
        JSON.stringify(intent, null, 2),
        '',
        'TASK:',
        'Return one capability-selection step for the trigger and one for every user action.',
        'Use only canonical node types present in NODE CATALOG.',
        'For each step, list up to 3 candidateNodeTypes ranked best-first.',
        'Set defaultSuggestedNodeType to the single best match.',
        'When the action names a specific service (e.g. "via Gmail", "via Slack"), that service',
        'MUST appear as the first candidateNodeType — do not substitute a generic alternative.',
        'Only mark ambiguous=true if no registry node can be chosen from the catalog.',
    ].join('\n');
    logger_1.logger.info({
        event: 'ai_pipeline_stage_start',
        stage: 'capability_selection',
        correlationId,
        inputSummary: `actions=${intent.actions.length}`,
    });
    let raw = null;
    let text = '';
    let parsed = null;
    const remote = await (0, capability_stage_client_1.runCapabilitySelectionJsonRemote)({
        systemPrompt,
        message: userMessage,
        correlationId,
    });
    if (remote?.ok) {
        parsed = remote.steps;
        text = JSON.stringify({ steps: remote.steps });
    }
    else {
        if (remote && !remote.ok) {
            logger_1.logger.warn({
                event: 'ai_pipeline_stage_warn',
                stage: 'capability_selection',
                correlationId,
                reason: `ai-generator returned ${remote.code} - falling back to local`,
            });
        }
        try {
            raw = await gemini_orchestrator_1.geminiOrchestrator.processRequest('node-suggestion', { system: systemPrompt, message: userMessage }, {
                model: 'gemini-3.5-flash',
                temperature: 0.1,
                cache: false,
            });
            text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.error({
                event: 'ai_pipeline_stage_error',
                stage: 'capability_selection',
                correlationId,
                error: 'CAPABILITY_SELECTION_FAILED',
                message,
            });
            logger_1.logger.warn({
                event: 'ai_pipeline_stage_fallback',
                stage: 'capability_selection',
                correlationId,
                reason: 'LLM_CALL_FAILED',
            });
            raw = null;
            text = message;
        }
        parsed = parseCapabilitySelection(raw) ?? parseCapabilitySelection(text);
    }
    if (!parsed) {
        logger_1.logger.warn({
            event: 'ai_pipeline_stage_retry',
            stage: 'capability_selection',
            correlationId,
            reason: 'STRUCTURED_DECODE_FAILED',
        });
        try {
            const retryPrompt = `${systemPrompt}\n\nCRITICAL: Return ONLY valid JSON that conforms to the schema.`;
            raw = await gemini_orchestrator_1.geminiOrchestrator.processRequest('node-suggestion', { system: retryPrompt, message: userMessage }, {
                model: 'gemini-3.5-flash',
                temperature: 0.1,
                cache: false,
            });
            text = typeof raw === 'string' ? raw : JSON.stringify(raw);
            parsed = parseCapabilitySelection(raw) ?? parseCapabilitySelection(text);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.error({
                event: 'ai_pipeline_stage_error',
                stage: 'capability_selection',
                correlationId,
                error: 'CAPABILITY_SELECTION_RETRY_FAILED',
                message,
            });
            text = message;
        }
    }
    if (!parsed) {
        logger_1.logger.error({
            event: 'ai_pipeline_stage_fallback',
            stage: 'capability_selection',
            correlationId,
            reason: 'INVALID_AI_RESPONSE',
            rawResponse: text,
        });
        parsed = buildDeterministicStepsFromIntent(intent);
    }
    const reconciled = reconcileDestinationCoverage(parsed, intent, correlationId);
    const validated = validateRegistryBackedSteps(reconciled, intent);
    if (!validated.ok) {
        logger_1.logger.error({
            event: 'ai_pipeline_stage_error',
            stage: 'capability_selection',
            correlationId,
            error: validated.code,
            message: validated.message,
        });
        return {
            ok: false,
            code: validated.code,
            durationMs: Date.now() - startedAt,
            message: validated.message,
            rawResponse: text,
        };
    }
    logger_1.logger.info({
        event: 'ai_pipeline_stage_end',
        stage: 'capability_selection',
        correlationId,
        outputSummary: `steps=${validated.steps.length}`,
        durationMs: Date.now() - startedAt,
    });
    return {
        ok: true,
        steps: validated.steps,
        durationMs: Date.now() - startedAt,
    };
}
function stripMarkdownFences(text) {
    let cleaned = String(text || '').trim();
    cleaned = cleaned.replace(/^\uFEFF/, '').trim();
    for (let i = 0; i < 3; i += 1) {
        const next = cleaned
            .replace(/^\s*```[a-z0-9_-]*\s*/i, '')
            .replace(/\s*```\s*$/i, '')
            .trim();
        if (next === cleaned)
            break;
        cleaned = next;
    }
    return cleaned.replace(/^\s*```[a-z0-9_-]*\s*$/gim, '').trim();
}
function parseCapabilitySelection(input) {
    if (input && typeof input === 'object') {
        return validateCapabilitySelectionObject(input);
    }
    if (typeof input !== 'string')
        return null;
    const cleaned = stripMarkdownFences(input);
    try {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1)
            return tryParsePartialCapabilitySelection(cleaned);
        const full = validateCapabilitySelectionObject(JSON.parse(cleaned.substring(start, end + 1)));
        return full ?? tryParsePartialCapabilitySelection(cleaned);
    }
    catch {
        // JSON was truncated (Gemini hit its output token limit mid-response).
        // Salvage any complete step objects that were emitted before the cut.
        return tryParsePartialCapabilitySelection(cleaned);
    }
}
/**
 * Partial recovery for truncated Gemini capability-selection responses.
 *
 * Gemini may hit its output token limit mid-JSON, leaving the "steps" array
 * unclosed. This function scans for complete, balanced { } step objects
 * inside the partial array and returns however many were fully emitted.
 * The caller's reconcileDestinationCoverage pass then adds any missing
 * destination nodes from the original prompt.
 */
function tryParsePartialCapabilitySelection(text) {
    try {
        const stepsKeyMatch = /"steps"\s*:\s*\[/.exec(text);
        if (!stepsKeyMatch)
            return null;
        const arrayStart = text.indexOf('[', stepsKeyMatch.index);
        if (arrayStart === -1)
            return null;
        const steps = [];
        let i = arrayStart + 1;
        while (i < text.length) {
            // Skip whitespace and commas between objects
            while (i < text.length && /[\s,]/.test(text[i]))
                i++;
            if (i >= text.length || text[i] === ']')
                break;
            if (text[i] !== '{')
                break;
            // Walk forward to find the matching closing brace for this step object
            let depth = 0;
            let inString = false;
            let escape = false;
            let j = i;
            for (; j < text.length; j++) {
                const ch = text[j];
                if (escape) {
                    escape = false;
                    continue;
                }
                if (ch === '\\' && inString) {
                    escape = true;
                    continue;
                }
                if (ch === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (ch === '{')
                        depth++;
                    else if (ch === '}') {
                        depth--;
                        if (depth === 0) {
                            j++;
                            break;
                        }
                    }
                }
            }
            if (depth !== 0)
                break; // Object was truncated — stop salvaging
            try {
                const obj = JSON.parse(text.substring(i, j));
                const validated = validateCapabilitySelectionObject({ steps: [obj] });
                if (validated && validated.length > 0)
                    steps.push(validated[0]);
            }
            catch {
                break; // Malformed object — stop
            }
            i = j;
        }
        return steps.length > 0 ? steps : null;
    }
    catch {
        return null;
    }
}
function validateCapabilitySelectionObject(obj) {
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.steps))
        return null;
    const validClasses = [
        'trigger',
        'data_source',
        'communication',
        'logic',
        'transformation',
        'generic_action',
    ];
    const steps = [];
    for (const raw of obj.steps) {
        if (!raw || typeof raw !== 'object')
            continue;
        const stepId = String(raw.stepId || '').trim();
        const stepText = String(raw.stepText || '').trim();
        const intentClass = String(raw.intentClass || '').trim();
        const candidateNodeTypes = Array.isArray(raw.candidateNodeTypes)
            ? raw.candidateNodeTypes.map((x) => String(x || '').trim()).filter(Boolean)
            : [];
        if (!stepId || !stepText || !validClasses.includes(intentClass) || candidateNodeTypes.length === 0) {
            continue;
        }
        const defaultSuggestedNodeType = raw.defaultSuggestedNodeType === null || raw.defaultSuggestedNodeType === undefined
            ? null
            : String(raw.defaultSuggestedNodeType || '').trim() || null;
        const confidenceRaw = Number(raw.confidence);
        steps.push({
            stepId,
            stepText,
            intentClass,
            candidateNodeTypes,
            defaultSuggestedNodeType,
            selectionPolicy: {
                multiSelectAllowed: raw.selectionPolicy?.multiSelectAllowed !== false,
                required: raw.selectionPolicy?.required !== false,
            },
            confidence: Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : undefined,
            ambiguous: raw.ambiguous === true,
            reason: typeof raw.reason === 'string' ? raw.reason : undefined,
        });
    }
    return steps.length > 0 ? steps : null;
}
function validateRegistryBackedSteps(steps, intent) {
    const out = [];
    const stepIds = new Set();
    const inputSteps = ensureTriggerStep(steps, intent);
    for (const step of inputSteps) {
        const canonicalCandidates = [
            ...new Set(step.candidateNodeTypes
                .map((type) => unified_node_registry_1.unifiedNodeRegistry.resolveAlias(type) || type)
                .filter((type) => !!unified_node_registry_1.unifiedNodeRegistry.get(type))),
        ];
        const globalBestCandidate = chooseBestRegistryNodeCandidate(step, intent);
        const candidateBest = canonicalCandidates.length > 0
            ? chooseBestRegistryNodeCandidate(step, intent, canonicalCandidates)
            : null;
        const fallbackCandidate = globalBestCandidate?.nodeType || null;
        const eligibleCandidates = shouldPreferGlobalRegistryMatch(candidateBest, globalBestCandidate)
            ? [globalBestCandidate.nodeType]
            : canonicalCandidates.length > 0
                ? canonicalCandidates
                : fallbackCandidate
                    ? [fallbackCandidate]
                    : [];
        if (eligibleCandidates.length === 0) {
            return {
                ok: false,
                code: 'NO_VALID_REGISTRY_NODES',
                message: `AI capability step "${step.stepId}" did not contain any registered node types`,
            };
        }
        const suggested = step.defaultSuggestedNodeType
            ? (unified_node_registry_1.unifiedNodeRegistry.resolveAlias(step.defaultSuggestedNodeType) || step.defaultSuggestedNodeType)
            : null;
        const defaultSuggestedNodeType = suggested && eligibleCandidates.includes(suggested)
            ? suggested
            : chooseBestRegistryNode(step, intent, eligibleCandidates) || eligibleCandidates[0];
        const baseStepId = step.stepId;
        let stepId = baseStepId;
        let suffix = 2;
        while (stepIds.has(stepId)) {
            stepId = `${baseStepId}_${suffix++}`;
        }
        stepIds.add(stepId);
        out.push({
            ...step,
            stepId,
            candidateNodeTypes: [defaultSuggestedNodeType],
            defaultSuggestedNodeType,
            ambiguous: false,
            confidence: Math.max(step.confidence ?? 0, 0.75),
        });
    }
    const hasTriggerStep = out.some((step) => step.candidateNodeTypes.some((type) => unified_node_registry_1.unifiedNodeRegistry.isTrigger(type)));
    if (!hasTriggerStep) {
        return {
            ok: false,
            code: 'NO_VALID_REGISTRY_NODES',
            message: 'AI capability selection did not include any registered trigger node',
        };
    }
    return { ok: true, steps: out };
}
function reconcileDestinationCoverage(steps, intent, correlationId) {
    const out = [...steps];
    const coveredTypes = new Set(out.flatMap((step) => step.candidateNodeTypes
        .map((type) => unified_node_registry_1.unifiedNodeRegistry.resolveAlias(type) || type)
        .filter((type) => !!unified_node_registry_1.unifiedNodeRegistry.get(type))));
    const destinationTargets = collectDestinationCoverageTargets(intent);
    for (const target of destinationTargets) {
        if (coveredTypes.has(target.nodeType))
            continue;
        out.push({
            stepId: buildCoverageStepId(target.nodeType, out.length + 1),
            stepText: target.stepText,
            intentClass: mapRegistryCategoryToIntentClass(unified_node_registry_1.unifiedNodeRegistry.getCategory(target.nodeType) || ''),
            candidateNodeTypes: [target.nodeType],
            defaultSuggestedNodeType: target.nodeType,
            selectionPolicy: { multiSelectAllowed: false, required: true },
            confidence: target.confidence,
            ambiguous: false,
            reason: target.reason,
        });
        coveredTypes.add(target.nodeType);
        logger_1.logger.info({
            event: 'ai_pipeline_destination_coverage_repaired',
            stage: 'capability_selection',
            correlationId,
            nodeType: target.nodeType,
            source: target.source,
        });
    }
    return out;
}
function collectDestinationCoverageTargets(intent) {
    const targets = [];
    const seen = new Set();
    // Use the verbatim user prompt so service names like "Gmail" and "Slack" are
    // always present, regardless of how the AI summarised the intent field.
    const promptText = intent.originalPrompt || intent.intent;
    const addTarget = (rawText, source, fallbackStepText) => {
        const candidate = resolveDestinationNode(rawText, intent);
        if (!candidate || seen.has(candidate.nodeType))
            return;
        // Gate on the original prompt — not the AI-summarised intent string.
        if (!isNodeExplicitlyMentioned(candidate.nodeType, promptText))
            return;
        const def = unified_node_registry_1.unifiedNodeRegistry.get(candidate.nodeType);
        targets.push({
            nodeType: candidate.nodeType,
            stepText: fallbackStepText || buildDestinationStepText(def?.label || candidate.nodeType),
            confidence: Math.max(0.8, Math.min(1, candidate.score / 30)),
            reason: `Destination coverage inferred from ${source}`,
            source,
        });
        seen.add(candidate.nodeType);
    };
    // Only scan phrases that appear verbatim in the user's original prompt.
    // dataFlows entries are AI-inferred and may name generic services (e.g.
    // "email service") that resolve to unrelated nodes — skip them entirely.
    for (const phrase of extractDestinationPhrases(promptText)) {
        addTarget(phrase, 'prompt.destination_phrase');
    }
    return targets;
}
function isNodeExplicitlyMentioned(nodeType, promptText) {
    const def = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    const phrases = explicitMentionPhrasesForNode(nodeType, def);
    return phrases.some((phrase) => containsNormalizedPhrase(promptText, phrase));
}
function explicitMentionPhrasesForNode(nodeType, def) {
    const base = [
        nodeType,
        nodeType.replace(/_/g, ' '),
        def?.label || '',
    ];
    const serviceAliases = {
        google_gmail: ['gmail', 'google gmail', 'email', 'mail'],
        slack_message: ['slack', 'slack message'],
        slack_webhook: ['slack', 'slack webhook'],
        amazon_ses: ['amazon ses', 'aws ses', 'ses'],
        zoom_video: ['zoom', 'zoom video', 'zoom meeting', 'video call'],
        workday: ['workday'],
    };
    return [...base, ...(serviceAliases[nodeType] || [])]
        .map(normalizeText)
        .filter((phrase, index, all) => phrase.length > 1 && all.indexOf(phrase) === index);
}
function containsNormalizedPhrase(text, phrase) {
    const normalizedText = ` ${normalizeText(text)} `;
    const normalizedPhrase = normalizeText(phrase);
    return normalizedPhrase.length > 1 && normalizedText.includes(` ${normalizedPhrase} `);
}
function resolveDestinationNode(rawText, intent) {
    const text = normalizeText(rawText);
    if (!text)
        return null;
    const direct = unified_node_registry_1.unifiedNodeRegistry.resolveAlias(text);
    if (direct && unified_node_registry_1.unifiedNodeRegistry.get(direct) && isDestinationCapableNode(direct)) {
        return { nodeType: direct, score: 30 };
    }
    const best = chooseBestRegistryNodeCandidate({ stepText: rawText, intentClass: 'communication' }, intent, unified_node_registry_1.unifiedNodeRegistry.getAllTypes().filter(isDestinationCapableNode));
    return best && best.score >= 10 ? best : null;
}
function extractDestinationPhrases(intentText) {
    const text = String(intentText || '');
    const phrases = [];
    const destinationPattern = /\b(?:send|post|publish|notify|message|email|forward|deliver)\b[\s\S]{0,80}?\b(?:to|via|through|using)\s+([a-zA-Z0-9][a-zA-Z0-9 _.-]{1,40})/gi;
    for (const match of text.matchAll(destinationPattern)) {
        const phrase = trimDestinationPhrase(match[1]);
        if (phrase)
            phrases.push(phrase);
    }
    return [...new Set(phrases)];
}
function trimDestinationPhrase(value) {
    return normalizeText(value)
        .split(/\b(?:and|then|after|before|when|with|from|get|read|summarize|summary)\b/)[0]
        .trim();
}
function isDestinationCapableNode(nodeType) {
    const def = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (!def || unified_node_registry_1.unifiedNodeRegistry.isTrigger(nodeType))
        return false;
    if (def.deprecated)
        return false;
    if (def.category === 'communication')
        return true;
    if (def.workflowBehavior?.alwaysTerminal === true || def.isTerminal === true || def.maxOutDegree === 0)
        return true;
    const searchable = normalizeText([
        def.type,
        def.label,
        def.description,
        ...(def.tags || []),
        ...(def.capabilities || []),
        ...(def.aiSelectionCriteria?.keywords || []),
        ...(def.aiSelectionCriteria?.useCases || []),
        ...(def.aiSelectionCriteria?.whenToUse || []),
    ].join(' '));
    return /\b(send|message|email|notify|post|publish|webhook|terminal|output)\b/.test(searchable);
}
function buildCoverageStepId(nodeType, ordinal) {
    return `destination_${normalizeText(nodeType).replace(/\s+/g, '_') || ordinal}`;
}
function buildDestinationStepText(label) {
    return `Send result to ${label}`;
}
function ensureTriggerStep(steps, intent) {
    const hasTriggerStep = steps.some((step) => step.intentClass === 'trigger' ||
        step.candidateNodeTypes.some((type) => {
            const canonical = unified_node_registry_1.unifiedNodeRegistry.resolveAlias(type) || type;
            return unified_node_registry_1.unifiedNodeRegistry.isTrigger(canonical);
        }));
    if (hasTriggerStep)
        return steps;
    const triggerType = resolveTriggerType(intent.triggerType);
    return [
        {
            stepId: 'trigger',
            stepText: `${intent.triggerType.replace(/_/g, ' ')} trigger`,
            intentClass: 'trigger',
            candidateNodeTypes: [triggerType],
            defaultSuggestedNodeType: triggerType,
            selectionPolicy: { multiSelectAllowed: false, required: true },
            confidence: 0.9,
            ambiguous: false,
            reason: 'Trigger selected from structured intent',
        },
        ...steps,
    ];
}
function buildDeterministicStepsFromIntent(intent) {
    const triggerType = resolveTriggerType(intent.triggerType);
    const steps = [
        {
            stepId: 'trigger',
            stepText: `${intent.triggerType.replace(/_/g, ' ')} trigger`,
            intentClass: 'trigger',
            candidateNodeTypes: [triggerType],
            defaultSuggestedNodeType: triggerType,
            selectionPolicy: { multiSelectAllowed: false, required: true },
            confidence: 0.9,
            ambiguous: false,
            reason: 'Trigger selected from structured intent',
        },
    ];
    let hasDeterministicLogicStep = false;
    intent.actions.forEach((action, index) => {
        if (isActionCoveredByTrigger(action, intent.triggerType))
            return;
        const intentClass = inferIntentClassForAction(action);
        if (intentClass === 'logic') {
            if (hasDeterministicLogicStep)
                return;
            const logicType = unified_node_registry_1.unifiedNodeRegistry.resolveAlias('if_else') || 'if_else';
            if (!unified_node_registry_1.unifiedNodeRegistry.get(logicType))
                return;
            steps.push({
                stepId: `action_${index + 1}`,
                stepText: action,
                intentClass,
                candidateNodeTypes: [logicType],
                defaultSuggestedNodeType: logicType,
                selectionPolicy: { multiSelectAllowed: false, required: true },
                confidence: 0.82,
                ambiguous: false,
                reason: 'Conditional action mapped to If/Else logic',
            });
            hasDeterministicLogicStep = true;
            return;
        }
        const candidate = chooseBestRegistryNode({
            stepText: action,
            intentClass,
        }, intent);
        if (!candidate)
            return;
        steps.push({
            stepId: `action_${index + 1}`,
            stepText: action,
            intentClass,
            candidateNodeTypes: [candidate],
            defaultSuggestedNodeType: candidate,
            selectionPolicy: { multiSelectAllowed: false, required: true },
            confidence: 0.75,
            ambiguous: false,
            reason: 'Registry-selected node for intent action',
        });
    });
    return steps;
}
function isActionCoveredByTrigger(action, triggerType) {
    const text = normalizeText(action);
    if (triggerType === 'form') {
        return /\b(form|submission|submit|submits|submitted)\b/.test(text)
            && !/\b(send|email|notify|message|post|publish|update|create|mark|set|fetch|get|read|query|summarize|analyze)\b/.test(text);
    }
    if (triggerType === 'webhook') {
        // Only suppress the action if it describes receiving/inbound data (not outbound fetch).
        // "http request", "api call" in an action phrase means the workflow CALLS an external URL —
        // that must become an http_request node, not be swallowed by the webhook trigger.
        return /\b(incoming webhook|receive.*request|inbound|on.*webhook)\b/.test(text)
            && !/\b(send|email|notify|message|post|publish|update|create|fetch|get|read|query|summarize|analyze|call|url|http)\b/.test(text);
    }
    if (triggerType === 'schedule') {
        return /\b(schedule|scheduled|every|daily|weekly|monthly|cron)\b/.test(text)
            && !/\b(send|email|notify|message|post|publish|update|create|fetch|get|read|query|summarize|analyze)\b/.test(text);
    }
    return false;
}
function resolveTriggerType(triggerType) {
    const canonical = unified_node_registry_1.unifiedNodeRegistry.resolveAlias(triggerType) || triggerType;
    if (unified_node_registry_1.unifiedNodeRegistry.isTrigger(canonical))
        return canonical;
    const manual = unified_node_registry_1.unifiedNodeRegistry.resolveAlias('manual_trigger') || 'manual_trigger';
    return unified_node_registry_1.unifiedNodeRegistry.isTrigger(manual) ? manual : canonical;
}
function inferIntentClassForAction(action) {
    const text = normalizeText(action);
    if (containsConditionalAction(action))
        return 'logic';
    const best = chooseBestRegistryNode({
        stepText: action,
        intentClass: 'generic_action',
    }, {
        intent: action,
        triggerType: 'manual_trigger',
        actions: [action],
        dataFlows: [],
        constraints: [],
        originalPrompt: action,
    });
    const category = best ? unified_node_registry_1.unifiedNodeRegistry.getCategory(best) || '' : '';
    if (category)
        return mapRegistryCategoryToIntentClass(category);
    if (/\b(if|when|condition|filter|route|switch|branch)\b/.test(text))
        return 'logic';
    if (/\b(send|message|email|notify|post|publish|reply)\b/.test(text))
        return 'communication';
    if (/\b(read|get|fetch|list|query|retrieve|load|search)\b/.test(text))
        return 'data_source';
    if (/\b(transform|format|parse|summarize|analyze|extract|convert)\b/.test(text))
        return 'transformation';
    return 'generic_action';
}
function containsConditionalAction(action) {
    const raw = String(action || '');
    const text = normalizeText(raw);
    // Check for conditional keywords
    const hasKeywords = /\b(if|when|else|otherwise|condition|conditional|route|switch|branch|check)\b/.test(text);
    // Check for comparison operators (including Unicode)
    const hasOperators = /(?:<=|>=|==|!=|[<>]|\u2264|\u2265)/.test(raw);
    // Check for conditional phrases
    const hasPhrases = /\b(check if|verify if|based on whether|depending on|route by|approve or reject)\b/.test(text);
    return hasKeywords || hasOperators || hasPhrases;
}
function chooseBestRegistryNode(step, intent, allowedTypes) {
    return chooseBestRegistryNodeCandidate(step, intent, allowedTypes)?.nodeType || null;
}
function chooseBestRegistryNodeCandidate(step, intent, allowedTypes) {
    const types = allowedTypes && allowedTypes.length > 0 ? allowedTypes : unified_node_registry_1.unifiedNodeRegistry.getAllTypes();
    let bestType = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const type of types) {
        const def = unified_node_registry_1.unifiedNodeRegistry.get(type);
        if (!def)
            continue;
        const score = scoreDefinitionForStep(def, step, intent);
        if (score > bestScore) {
            bestScore = score;
            bestType = type;
        }
    }
    return bestType && bestScore > 0 ? { nodeType: bestType, score: bestScore } : null;
}
function shouldPreferGlobalRegistryMatch(candidateBest, globalBest) {
    if (!globalBest)
        return false;
    if (!candidateBest)
        return true;
    if (candidateBest.nodeType === globalBest.nodeType)
        return false;
    return globalBest.score >= candidateBest.score + 6 && globalBest.score >= 12;
}
function scoreDefinitionForStep(def, step, intent) {
    const stepText = normalizeText(step.stepText);
    const intentText = normalizeText(`${intent.intent} ${intent.constraints.join(' ')}`);
    const searchText = normalizeText([
        def.type,
        def.type.replace(/_/g, ' '),
        def.label,
        def.description,
        ...(def.tags || []),
        ...(def.capabilities || []),
        ...(def.aiSelectionCriteria?.keywords || []),
        ...(def.aiSelectionCriteria?.useCases || []),
        ...(def.aiSelectionCriteria?.whenToUse || []),
    ].join(' '));
    const directAlias = unified_node_registry_1.unifiedNodeRegistry.resolveAlias(stepText);
    let score = directAlias === def.type ? 20 : 0;
    // Strong boost when the step text contains a known service alias for this node
    // (e.g. "gmail" in "send via Gmail" → +15 for google_gmail).
    // This ensures explicitly-named services always outscore generic alternatives.
    const nodeAliases = explicitMentionPhrasesForNode(def.type, def);
    if (nodeAliases.some((alias) => alias.length > 2 && stepText.includes(alias))) {
        score += 15;
    }
    const category = mapRegistryCategoryToIntentClass(def.category || '');
    if (step.intentClass === category)
        score += 6;
    if (step.intentClass === 'trigger' && unified_node_registry_1.unifiedNodeRegistry.isTrigger(def.type))
        score += 10;
    if (step.intentClass !== 'trigger' && unified_node_registry_1.unifiedNodeRegistry.isTrigger(def.type))
        score -= 20;
    if (def.deprecated)
        score -= 4;
    if (def.category === 'utility')
        score -= 1;
    if (searchText.includes(stepText) && stepText.length >= 3)
        score += 10;
    if (stepText.includes(normalizeText(def.label)) && def.label.length >= 3)
        score += 8;
    if (intentText.includes(normalizeText(def.label)) && def.label.length >= 3)
        score += 4;
    const stepTokens = tokenize(stepText);
    const searchTokens = new Set(tokenize(searchText));
    const matchedTokens = [];
    for (const token of stepTokens) {
        if (searchTokens.has(token)) {
            score += 2;
            matchedTokens.push(token);
        }
        if (normalizeText(def.type).split(' ').includes(token)) {
            score += 2;
            matchedTokens.push(token);
        }
    }
    for (const phrase of [
        ...(def.aiSelectionCriteria?.keywords || []),
        ...(def.tags || []),
        ...(def.capabilities || []),
    ]) {
        const normalizedPhrase = normalizeText(phrase);
        if (normalizedPhrase && stepText.includes(normalizedPhrase))
            score += 5;
    }
    const genericKeywordMatches = matchedTokens.filter((token) => GENERIC_SELECTION_TOKENS.has(token)).length;
    if (matchedTokens.length > 0) {
        const genericRatio = genericKeywordMatches / matchedTokens.length;
        if (genericRatio > 0.3) {
            // Penalty scales from -10 (30% generic) to -20 (100% generic)
            score -= Math.floor(10 + (genericRatio - 0.3) * 14);
        }
    }
    // Category mismatch penalties
    if (step.intentClass === 'communication' && category === 'data_source') {
        score -= 8;
    }
    // Penalize data nodes for communication steps (e.g., Workday, Salesforce)
    if (step.intentClass === 'communication' && def.category === 'data') {
        score -= 12;
    }
    return score;
}
const GENERIC_SELECTION_TOKENS = new Set([
    'data',
    'api',
    'integration',
    'system',
    'platform',
    'service',
    'details',
    'user',
    'record',
    'records',
]);
function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function tokenize(value) {
    const stopWords = new Set([
        'a',
        'an',
        'and',
        'as',
        'by',
        'for',
        'from',
        'in',
        'into',
        'it',
        'of',
        'on',
        'or',
        'the',
        'then',
        'to',
        'with',
    ]);
    return normalizeText(value)
        .split(' ')
        .filter((token) => token.length > 1 && !stopWords.has(token));
}
function mapRegistryCategoryToIntentClass(category) {
    const c = String(category || '').toLowerCase();
    if (c === 'trigger')
        return 'trigger';
    if (c === 'communication')
        return 'communication';
    if (c === 'logic')
        return 'logic';
    if (c === 'transformation' || c === 'ai')
        return 'transformation';
    if (c === 'data')
        return 'data_source';
    return 'generic_action';
}
