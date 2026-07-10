"use strict";
/**
 * Property Population Stage — AI-First Pipeline (Stage 6)
 *
 * Calls an LLM once per node to populate every field whose
 * `fillMode.default` is `buildtime_ai_once`, using the user's original
 * intent, the structural blueprint, and the node's inputSchema as context.
 *
 * The stage is soft-failing: LLM errors per node fall back to registry
 * defaults without blocking the pipeline. The stage NEVER returns ok: false.
 *
 * CRITICAL constraints:
 * - NEVER mutates workflow.edges
 * - NEVER calls any unifiedGraphOrchestrator method
 * - All node config changes go to node.data.config only
 *
 * Requirements: 1.1–1.5, 2.1–2.5, 3.1–3.6, 4.1–4.6, 5.1, 6.1–6.3, 7.1–7.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPropertyPopulationStage = runPropertyPopulationStage;
const gemini_orchestrator_1 = require("../gemini-orchestrator");
const property_population_stage_client_1 = require("./property-population-stage-client");
const logger_1 = require("../../../core/logger");
const unified_node_registry_1 = require("../../../core/registry/unified-node-registry");
// ─── Helpers ─────────────────────────────────────────────────────────────────
function stripMarkdownFences(text) {
    return text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
}
/** Compact ordered id→type list from current workflow (no registry branching logic). */
function buildCompactGraphDigest(workflow) {
    return workflow.nodes
        .map((n, i) => {
        const t = n.type ?? n.data?.type ?? '?';
        return `${i + 1}. ${n.id}: ${t}`;
    })
        .join('\n');
}
/** True when the stored value equals the registry default — no explicit choice was made yet. */
function isAtRegistryDefault(storedValue, fieldDefault) {
    if (storedValue === undefined || storedValue === null)
        return true;
    if (fieldDefault === undefined || fieldDefault === null)
        return false;
    try {
        return JSON.stringify(storedValue) === JSON.stringify(fieldDefault);
    }
    catch {
        return storedValue === fieldDefault;
    }
}
function tryParseJson(text) {
    try {
        const cleaned = stripMarkdownFences(text);
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1)
            return null;
        const parsed = JSON.parse(cleaned.substring(start, end + 1));
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
async function requestJsonObjectWithRemoteFallback(params) {
    const remote = await (0, property_population_stage_client_1.runPropertyPopulationJsonRemote)({
        purpose: params.purpose,
        systemPrompt: params.systemPrompt,
        message: params.message,
        allowedKeys: params.allowedKeys,
        correlationId: params.correlationId,
        nodeId: params.nodeId,
        nodeType: params.nodeType,
    });
    if (remote?.ok) {
        return remote.values;
    }
    if (remote && !remote.ok) {
        logger_1.logger.warn({
            event: 'ai_pipeline_stage_warn',
            stage: params.logStage,
            correlationId: params.correlationId,
            nodeId: params.nodeId,
            nodeType: params.nodeType,
            reason: `ai-generator returned ${remote.code} — falling back to local`,
        });
    }
    const result = await gemini_orchestrator_1.geminiOrchestrator.processRequest(params.localRequestName, { system: params.systemPrompt, message: params.message }, { model: 'gemini-3.5-flash', temperature: 0.1, cache: false });
    const raw = typeof result === 'string' ? result : JSON.stringify(result);
    let parsed = tryParseJson(raw);
    if (parsed)
        return parsed;
    logger_1.logger.warn({
        event: 'ai_pipeline_stage_warn',
        stage: params.logStage,
        correlationId: params.correlationId,
        nodeId: params.nodeId,
        nodeType: params.nodeType,
        reason: 'LLM returned unparseable JSON — retrying',
    });
    const retryMessage = params.message +
        '\n\nCRITICAL: Your previous response was not valid JSON. ' +
        'Return ONLY the JSON object, nothing else. No markdown fences.';
    const retryResult = await gemini_orchestrator_1.geminiOrchestrator.processRequest(params.localRequestName, { system: params.systemPrompt, message: retryMessage }, { model: 'gemini-3.5-flash', temperature: 0.1, cache: false });
    const retryRaw = typeof retryResult === 'string' ? retryResult : JSON.stringify(retryResult);
    parsed = tryParseJson(retryRaw);
    return parsed;
}
// ─── Per-Field Directive Generation ─────────────────────────────────────────
/**
 * Generates per-field behavioral directives for every runtime_ai field in a node.
 * Called once per node during property population (build time).
 * Stored in node.data.config._fieldDirectives and used at execution time by
 * the AI input resolver to produce semantically correct per-field content.
 *
 * Universal: works for any node type via registry field metadata (type, role, description).
 * Non-blocking: returns {} on any failure.
 */
async function generateRuntimeFieldDirectives(params) {
    const { nodeId, nodeType, runtimeAiFields, userIntent, graphDigest, upstreamFieldNames, correlationId } = params;
    if (runtimeAiFields.length === 0)
        return {};
    const systemPrompt = 'You are a workflow field directive generator. For each listed runtime_ai field, ' +
        'write a precise 1-2 sentence instruction that tells an AI what this field must contain ' +
        'at workflow execution time and what it must never contain.\n\n' +
        'RULES:\n' +
        '- title_like fields: instruct to write a concise human-readable label/subject (max 100 chars). ' +
        'Never use spreadsheet ranges, row identifiers, or structural system keys as the value.\n' +
        '- long_body fields: instruct to write professional prose derived from BUSINESS DATA ' +
        '(form values, names, submitted text). Never use integration identifiers ' +
        '(spreadsheet ranges like "job!A1:E2", row counts, API endpoints) as greeting names or body content.\n' +
        '- recipient fields: instruct to extract a valid email address or identifier from upstream ' +
        'form data using the specific upstream field name. Never substitute a sheet name or range.\n' +
        '- values/data/payload fields: instruct to build a structured payload using the upstream field ' +
        'names provided (e.g. [[{{$json.Name}}, {{$json.Email}}]] for an array row, or an object for ' +
        'key-value pairs). Reference ONLY the upstream field names listed in UPSTREAM_FIELDS.\n' +
        '- Other fields: write a directive based on the field\'s description and semantic role.\n\n' +
        'Return ONLY valid JSON: { "<fieldName>": "<directive string>" }. No markdown, no explanation.';
    const fieldsSection = runtimeAiFields
        .map(({ fieldName, field }) => `  - ${fieldName} (type: ${field.type}, role: ${field.role ?? 'unspecified'}): ${field.description}`)
        .join('\n');
    const upstreamSection = upstreamFieldNames && upstreamFieldNames.length > 0
        ? `\nUPSTREAM_FIELDS (reference these by name at runtime using {{$json.<name>}}):\n` +
            upstreamFieldNames.map((f) => `  - ${f}`).join('\n') + '\n'
        : '';
    const userMessage = `USER_INTENT:\n${userIntent}\n\n` +
        `WORKFLOW_NODE_ORDER:\n${graphDigest}\n\n` +
        `NODE_TYPE: ${nodeType}\n` +
        `NODE_ID: ${nodeId}\n` +
        upstreamSection +
        `\nFIELDS NEEDING DIRECTIVES:\n${fieldsSection}\n\n` +
        `Return a JSON object with exactly these field names as keys and directive strings as values.`;
    try {
        const parsed = await requestJsonObjectWithRemoteFallback({
            purpose: 'field_directive_generation',
            localRequestName: 'field-directive-generation',
            systemPrompt,
            message: userMessage,
            allowedKeys: runtimeAiFields.map((f) => f.fieldName),
            correlationId,
            nodeId,
            nodeType,
            logStage: 'property_population',
        });
        if (!parsed)
            return {};
        // Only keep entries that are string directives for known field names
        const validKeys = new Set(runtimeAiFields.map((f) => f.fieldName));
        const directives = {};
        for (const [key, value] of Object.entries(parsed)) {
            if (validKeys.has(key) && typeof value === 'string' && value.trim().length > 0) {
                directives[key] = value.trim();
            }
        }
        if (Object.keys(directives).length > 0) {
            logger_1.logger.info({
                event: 'field_directives_generated',
                stage: 'property_population',
                correlationId,
                nodeId,
                nodeType,
                fieldCount: Object.keys(directives).length,
                fields: Object.keys(directives),
            });
        }
        return directives;
    }
    catch (err) {
        logger_1.logger.warn({
            event: 'field_directives_skipped',
            stage: 'property_population',
            correlationId,
            nodeId,
            nodeType,
            reason: err instanceof Error ? err.message : String(err),
        });
        return {};
    }
}
// ─── Stage ───────────────────────────────────────────────────────────────────
/**
 * Run the Property Population Stage.
 *
 * For each node in the workflow:
 * 1. Look up its inputSchema in the registry.
 * 2. Filter to fields with fillMode.default === 'buildtime_ai_once' AND ownership !== 'credential'.
 * 3. Build an LLM prompt with userIntent, structuralPrompt, and field metadata.
 * 4. Call the LLM, parse the JSON response, apply the fillMode gate.
 * 5. Merge LLM values over defaultConfig() and write to node.data.config.
 * 6. Record written field names in propertyPopulationSummary.
 *
 * All per-node errors are caught and logged; the stage always returns ok: true.
 */
async function runPropertyPopulationStage(input) {
    const { workflow, userIntent, structuralPrompt, correlationId } = input;
    const startedAt = Date.now();
    const graphDigest = buildCompactGraphDigest(workflow);
    logger_1.logger.info({
        event: 'ai_pipeline_stage_start',
        stage: 'property_population',
        correlationId,
        inputSummary: `nodes=${workflow.nodes.length}`,
    });
    const summary = {};
    // Work on a shallow copy of nodes so we don't mutate the original array reference,
    // but we DO mutate node.data.config in place (nodes are objects).
    const nodes = workflow.nodes;
    for (const node of nodes) {
        const nodeId = node.id;
        const nodeType = node.type ?? node.data?.type;
        if (!nodeType) {
            logger_1.logger.warn({
                event: 'ai_pipeline_stage_warn',
                stage: 'property_population',
                correlationId,
                nodeId,
                reason: 'node has no type — skipping',
            });
            continue;
        }
        try {
            // ── 2.2 Field selection ──────────────────────────────────────────────
            const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
            if (!nodeDef) {
                logger_1.logger.warn({
                    event: 'ai_pipeline_stage_warn',
                    stage: 'property_population',
                    correlationId,
                    nodeId,
                    nodeType,
                    reason: 'node type not found in registry — skipping',
                });
                continue;
            }
            const inputSchema = nodeDef.inputSchema;
            const existingConfig = (node.data?.config || {});
            const eligibleFields = Object.entries(inputSchema).filter(([fieldName, field]) => {
                if (field.ownership === 'credential')
                    return false;
                // Primary: buildtime_ai_once fields are always eligible
                if (field.fillMode?.default === 'buildtime_ai_once')
                    return true;
                // Secondary: manual_static fields where the registry signals AI can suggest
                // a value (supportsBuildtimeAI: true) AND the field is still at its
                // registry default — meaning no explicit user or prior AI choice was made.
                // This lets the LLM infer operation/method/action from intent without
                // adding per-node special cases anywhere in the pipeline.
                if (field.fillMode?.default === 'manual_static' &&
                    field.fillMode?.supportsBuildtimeAI === true &&
                    isAtRegistryDefault(existingConfig[fieldName], field.default))
                    return true;
                return false;
            });
            if (eligibleFields.length === 0) {
                // No eligible fields — leave config unchanged
                continue;
            }
            // ── Find upstream node type for build value context ──────────────────
            let upstreamNodeType;
            try {
                const incomingEdge = workflow.edges.find((e) => e.target === nodeId);
                if (incomingEdge) {
                    const upstreamNode = workflow.nodes.find((n) => n.id === incomingEdge.source);
                    if (upstreamNode) {
                        upstreamNodeType = upstreamNode.type ?? upstreamNode.data?.type;
                    }
                }
            }
            catch {
                // non-blocking
            }
            // ── Get build value context from registry ────────────────────────────
            const buildCtx = unified_node_registry_1.unifiedNodeRegistry.getBuildValueContext(nodeType, upstreamNodeType);
            if (!node.data) {
                node.data = { config: {} };
            }
            // ── 2.3 LLM prompt construction ─────────────────────────────────────
            const systemPrompt = 'You are a workflow configuration assistant specializing in automation workflows. ' +
                'Given a user\'s intent, a workflow blueprint, and a node\'s input schema, return a JSON object with values for the specified fields.\n' +
                'CRITICAL RULES FOR CONTROL FLOW NODES:\n' +
                '- if_else nodes: "conditions" MUST be a non-empty array of objects: [{ "field": "$json.<key>", "operator": "<op>", "value": "<val>" }]\n' +
                '  Valid operators (ONLY these 8): equals, not_equals, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, not_contains\n' +
                '  NEVER return conditions: [] — an empty array will break the workflow branch.\n' +
                '- switch nodes: "expression" MUST be {{$json.<routingField>}} referencing the upstream field that drives branching.\n' +
                '  "cases" MUST be a non-empty array of objects: [{ "value": "<case_value>", "label": "<Human Label>" }]\n' +
                '  Include ALL distinct case values implied by the workflow. NEVER return cases: [].\n' +
                '- loop nodes: "items" MUST be {{$json.<arrayField>}} referencing an upstream array.\n' +
                '- Use {{$json.<fieldName>}} syntax for template references to upstream node output fields.\n' +
                'Return ONLY valid JSON. No markdown, no explanation, no extra text.';
            const fieldsText = eligibleFields
                .map(([fieldName, field]) => {
                let line = `  - ${fieldName} (type: ${field.type}): ${field.description}`;
                if (Array.isArray(field.examples) && field.examples.length > 0) {
                    line += `\n    examples: ${JSON.stringify(field.examples)}`;
                }
                return line;
            })
                .join('\n');
            // ── Collect upstream form field keys (shared by if_else and switch) ────
            const upstreamFormKeys = [];
            for (const n of workflow.nodes) {
                const nt = n.type ?? n.data?.type ?? '';
                if (nt === 'form' || nt === 'form_trigger') {
                    const formFields = n.data?.config?.fields;
                    if (Array.isArray(formFields)) {
                        for (const f of formFields) {
                            const key = f.name ?? f.key ?? f.id;
                            if (key && typeof key === 'string')
                                upstreamFormKeys.push(key);
                        }
                    }
                }
            }
            // ── For if_else nodes: inject upstream form field keys and conditions format ─
            let upstreamFormFieldsHint = '';
            if (nodeType === 'if_else') {
                if (upstreamFormKeys.length > 0) {
                    upstreamFormFieldsHint =
                        `\nUPSTREAM_FORM_FIELD_KEYS (MUST use these exact keys in $json.* condition fields):\n` +
                            upstreamFormKeys.map((k) => `  - ${k} → use "$json.${k}" in condition "field" property`).join('\n') +
                            `\nCRITICAL: condition "field" values MUST be "$json.<key>" using ONLY the keys listed above. ` +
                            `Do NOT invent field names. If the user says "years of experience" and the form field is "experience", use "$json.experience".\n`;
                }
                upstreamFormFieldsHint +=
                    `\nREQUIRED FORMAT for "conditions" field (return this exact structure):\n` +
                        `  [{ "field": "$json.<fieldKey>", "operator": "<operator>", "value": "<compareValue>" }]\n` +
                        `  Valid operators (ONLY these 8): equals, not_equals, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, not_contains\n` +
                        `  DO NOT use starts_with, ends_with, or any other operator — they are invalid and will break execution.\n` +
                        `  Examples:\n` +
                        `    [{ "field": "$json.status", "operator": "equals", "value": "approved" }]\n` +
                        `    [{ "field": "$json.email", "operator": "contains", "value": "urgent" }]\n` +
                        `    [{ "field": "$json.amount", "operator": "greater_than", "value": 100 }]\n` +
                        `  CRITICAL: DO NOT return an empty array []. You MUST produce at least one condition.\n` +
                        `  CRITICAL: The "value" for string checks must be a plain string. For numbers use a number (no quotes).\n`;
            }
            // ── For switch nodes: inject routing field context and cases format ────
            let switchHint = '';
            if (nodeType === 'switch') {
                const primaryKey = upstreamFormKeys.length > 0 ? upstreamFormKeys[0] : '';
                const exampleExpr = primaryKey ? `{{$json.${primaryKey}}}` : '{{$json.status}}';
                if (upstreamFormKeys.length > 0) {
                    switchHint =
                        `\nUPSTREAM_FORM_FIELD_KEYS (pick the routing field for the switch expression):\n` +
                            upstreamFormKeys.map((k) => `  - ${k} → expression: "{{$json.${k}}}"`).join('\n') +
                            `\n`;
                }
                switchHint +=
                    `\nREQUIRED FORMAT for "expression" field:\n` +
                        `  A template expression referencing the field that drives routing.\n` +
                        `  Example: "${exampleExpr}"\n` +
                        `  MUST use {{$json.<fieldKey>}} syntax. Select the upstream field whose value determines which branch executes.\n` +
                        `\nREQUIRED FORMAT for "cases" field (return this exact structure):\n` +
                        `  [{ "value": "<case_value>", "label": "<Human Readable Label>" }]\n` +
                        `  Derive case values from the workflow context and user's intent (e.g., status values, category names).\n` +
                        `  Example: [{ "value": "approved", "label": "Approved" }, { "value": "rejected", "label": "Rejected" }, { "value": "pending", "label": "Pending Review" }]\n` +
                        `  CRITICAL: Include ALL distinct routing paths described or implied by the user. An empty cases array breaks all branching.\n`;
            }
            // Build upstream fields hint
            let upstreamFieldsHint = '';
            if (buildCtx.upstreamFields.length > 0) {
                upstreamFieldsHint =
                    `\nUPSTREAM_OUTPUT_FIELDS (reference these in long_body fields using {{$json.<field>}} syntax):\n` +
                        buildCtx.upstreamFields
                            .map((f) => `  - ${f.name}: ${f.type}${f.description ? ` — ${f.description}` : ''}`)
                            .join('\n') +
                        `\nFor fields with role "long_body", you MUST include at least one {{$json.<field>}} reference ` +
                        `where <field> is one of the upstream field names listed above.\n`;
            }
            // Build field roles hint
            let fieldRolesHint = '';
            if (buildCtx.targetFields.length > 0) {
                fieldRolesHint =
                    `\nFIELD_ROLES (use these to guide value generation):\n` +
                        buildCtx.targetFields
                            .map((f) => `  - ${f.name}: role=${f.role}, essential=${f.essentialForExecution}`)
                            .join('\n') +
                        `\nFor "title_like" fields: generate a concise, human-readable summary derived from the user's intent. ` +
                        `Do NOT use generic placeholders like "Generated Subject" or "Process the workflow".\n` +
                        `For "long_body" fields: reference upstream data using {{$json.<field>}} template syntax.\n`;
            }
            // ── Upstream data flow context (full upstream chain) ────────────────
            // Walk ALL upstream nodes via edges so the LLM sees the complete data
            // shape arriving at this node — not just the immediate predecessor.
            let upstreamDataFlowHint = '';
            try {
                const upstreamChain = [];
                const visited = new Set();
                const queue = [nodeId];
                while (queue.length > 0) {
                    const currentId = queue.shift();
                    if (visited.has(currentId))
                        continue;
                    visited.add(currentId);
                    for (const edge of workflow.edges) {
                        if (edge.target !== currentId || visited.has(edge.source))
                            continue;
                        const upNode = workflow.nodes.find((n) => n.id === edge.source);
                        if (!upNode)
                            continue;
                        const upType = String(upNode.type ?? upNode.data?.type ?? '');
                        const upDef = unified_node_registry_1.unifiedNodeRegistry.get(upType);
                        const upLabel = String(upNode.data?.label || upType);
                        const outputFields = [];
                        if (upDef?.outputSchema) {
                            outputFields.push(...Object.keys(upDef.outputSchema));
                        }
                        // Form nodes surface their configured fields as output
                        if (upType === 'form' || upType === 'form_trigger') {
                            const formFields = upNode.data?.config?.fields;
                            if (Array.isArray(formFields)) {
                                for (const f of formFields) {
                                    const key = f.name ?? f.key ?? f.label ?? f.id;
                                    if (key && typeof key === 'string' && !outputFields.includes(key)) {
                                        outputFields.push(key);
                                    }
                                }
                            }
                        }
                        upstreamChain.push({ nodeType: upType, nodeLabel: upLabel, outputFields });
                        queue.push(edge.source);
                    }
                }
                if (upstreamChain.length > 0) {
                    upstreamDataFlowHint =
                        `\nUPSTREAM_DATA_FLOW (nodes feeding data into this node, use {{$json.<field>}} to reference):\n` +
                            upstreamChain
                                .map((n) => `  - ${n.nodeLabel} (${n.nodeType})` +
                                (n.outputFields.length > 0 ? `: outputs [${n.outputFields.join(', ')}]` : ''))
                                .join('\n') + '\n';
                }
            }
            catch {
                // non-blocking
            }
            // ── Operation options hint for AI-suggestible manual_static fields ──
            // When the LLM must infer an operation from intent, give it the exact
            // valid values from the node's operation contracts rather than guessing.
            let operationOptionsHint = '';
            for (const [fieldName, field] of eligibleFields) {
                if (field.fillMode?.default === 'manual_static' &&
                    field.fillMode?.supportsBuildtimeAI === true) {
                    const contracts = nodeDef.operationContracts;
                    if (Array.isArray(contracts) && contracts.length > 0) {
                        const validOps = contracts
                            .map((c) => c.operation)
                            .filter((op) => typeof op === 'string');
                        if (validOps.length > 0) {
                            operationOptionsHint +=
                                `\nFOR FIELD "${fieldName}": choose the value that matches the user's intent.\n` +
                                    `  Valid values: [${validOps.join(', ')}]\n` +
                                    `  Hint — "append" = inserting new rows/records, "read" = fetching/retrieving data, ` +
                                    `"write" = overwriting, "update" = editing existing rows, ` +
                                    `"create" = creating new resources, "send" = sending messages.\n` +
                                    `  User intent says: "${userIntent.slice(0, 200)}"\n`;
                        }
                    }
                }
            }
            const userMessage = `USER_INTENT:\n${userIntent}\n\n` +
                `WORKFLOW_BLUEPRINT:\n${structuralPrompt}\n\n` +
                `WORKFLOW_NODE_ORDER:\n${graphDigest}\n\n` +
                `NODE_TYPE: ${nodeType}\n` +
                `NODE_ID: ${nodeId}\n` +
                upstreamDataFlowHint +
                upstreamFormFieldsHint +
                switchHint +
                upstreamFieldsHint +
                fieldRolesHint +
                operationOptionsHint +
                `\nFIELDS_TO_POPULATE:\n${fieldsText}\n\n` +
                `Return a JSON object with keys matching the field names above.\n` +
                `For array/object fields, return valid JSON values (not strings).\n` +
                `REMINDER: Never return empty arrays for conditions, cases, or items fields.`;
            // ── 2.4 LLM call, JSON parsing, fillMode gate ────────────────────────
            const parsed = await requestJsonObjectWithRemoteFallback({
                purpose: 'property_population',
                localRequestName: 'property-population',
                systemPrompt,
                message: userMessage,
                allowedKeys: eligibleFields.map(([fieldName]) => fieldName),
                correlationId,
                nodeId,
                nodeType,
                logStage: 'property_population',
            });
            if (!parsed) {
                // Second failure — fall back to defaultConfig for this node
                logger_1.logger.warn({
                    event: 'ai_pipeline_stage_warn',
                    stage: 'property_population',
                    correlationId,
                    nodeId,
                    nodeType,
                    reason: 'LLM returned unparseable JSON on retry — using defaultConfig',
                });
                const prior = node.data?.config && typeof node.data.config === 'object' ? node.data.config : {};
                node.data.config = { ...nodeDef.defaultConfig(), ...prior };
                continue;
            }
            // Apply fillMode gate: only keep keys that are buildtime_ai_once and non-credential
            const filteredLlmValues = {};
            for (const [key, value] of Object.entries(parsed)) {
                const fieldDef = inputSchema[key];
                if (!fieldDef)
                    continue;
                // Gate 1: Skip fields where supportsBuildtimeAI is explicitly false
                if (fieldDef.fillMode?.supportsBuildtimeAI === false)
                    continue;
                // Gate 2: Skip fields where fillMode.default is runtime_ai (defer to runtime)
                if (fieldDef.fillMode?.default === 'runtime_ai')
                    continue;
                // Gate 3: Allow buildtime_ai_once AND manual_static+supportsBuildtimeAI fields
                const isBuildtimeAi = fieldDef.fillMode?.default === 'buildtime_ai_once';
                const isAiSuggestableManual = fieldDef.fillMode?.default === 'manual_static' &&
                    fieldDef.fillMode?.supportsBuildtimeAI === true;
                if (!isBuildtimeAi && !isAiSuggestableManual)
                    continue;
                if (fieldDef.ownership === 'credential')
                    continue;
                // For array/object fields: if LLM returned a string, try JSON.parse
                if ((fieldDef.type === 'array' || fieldDef.type === 'object') && typeof value === 'string') {
                    try {
                        filteredLlmValues[key] = JSON.parse(value);
                    }
                    catch {
                        logger_1.logger.warn({
                            event: 'ai_pipeline_stage_warn',
                            stage: 'property_population',
                            correlationId,
                            nodeId,
                            nodeType,
                            field: key,
                            reason: 'Failed to JSON.parse string value for array/object field — using defaultConfig value',
                        });
                        // Use defaultConfig value for this field only
                        const defaults = nodeDef.defaultConfig();
                        if (defaults[key] !== undefined) {
                            filteredLlmValues[key] = defaults[key];
                        }
                        // If no default, skip this field
                    }
                }
                else {
                    filteredLlmValues[key] = value;
                }
            }
            // ── Enforce {{$json.*}} references for long_body fields ──────────────
            if (buildCtx.upstreamFields.length > 0) {
                const firstUpstreamField = buildCtx.upstreamFields[0].name;
                for (const [key, value] of Object.entries(filteredLlmValues)) {
                    const fieldDef = inputSchema[key];
                    if (fieldDef?.role === 'long_body' && typeof value === 'string') {
                        if (!value.includes('{{$json.')) {
                            filteredLlmValues[key] = `${value}\n\n{{$json.${firstUpstreamField}}}`;
                        }
                    }
                }
            }
            // ── 2.5 Merge over defaults + existing config (preserve _fillMode, structural snapshots, etc.)
            const prior = node.data?.config && typeof node.data.config === 'object' ? node.data.config : {};
            // ── 2.5a Stamp _fillMode for every AI-written non-empty field ────────
            // Preserve any existing _fillMode entries from prior (e.g. structural fields
            // already stamped by an earlier materializer pass).
            const priorFillMode = typeof prior._fillMode === 'object' && prior._fillMode !== null
                ? { ...prior._fillMode }
                : {};
            for (const key of Object.keys(filteredLlmValues)) {
                const v = filteredLlmValues[key];
                const isEmpty = v === undefined ||
                    v === null ||
                    v === '' ||
                    (Array.isArray(v) && v.length === 0) ||
                    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
                if (!isEmpty) {
                    priorFillMode[key] = 'buildtime_ai_once';
                }
            }
            node.data.config = {
                ...nodeDef.defaultConfig(),
                ...prior,
                ...filteredLlmValues,
                _fillMode: priorFillMode, // ← always write the stamped map
            };
            // ── Generate per-field directives for runtime_ai fields ──────────────
            // These are stored as _fieldDirectives in node config and used at
            // execution time to give the AI resolver precise per-field instructions.
            const runtimeAiFields = Object.entries(inputSchema)
                .filter(([, field]) => field.fillMode?.default === 'runtime_ai' &&
                field.ownership !== 'credential' &&
                field.fillMode?.supportsRuntimeAI !== false)
                .map(([fieldName, field]) => ({ fieldName, field: field }));
            if (runtimeAiFields.length > 0) {
                // Collect all upstream field names (form fields + registry output fields)
                // so the directive LLM can generate precise {{$json.<name>}} references.
                const allUpstreamFieldNames = [];
                try {
                    const visitedForDirectives = new Set();
                    const q2 = [nodeId];
                    while (q2.length > 0) {
                        const cid = q2.shift();
                        if (visitedForDirectives.has(cid))
                            continue;
                        visitedForDirectives.add(cid);
                        for (const edge of workflow.edges) {
                            if (edge.target !== cid || visitedForDirectives.has(edge.source))
                                continue;
                            const upN = workflow.nodes.find((n) => n.id === edge.source);
                            if (!upN)
                                continue;
                            const upT = String(upN.type ?? upN.data?.type ?? '');
                            const upD = unified_node_registry_1.unifiedNodeRegistry.get(upT);
                            if (upD?.outputSchema) {
                                allUpstreamFieldNames.push(...Object.keys(upD.outputSchema));
                            }
                            if (upT === 'form' || upT === 'form_trigger') {
                                const ff = upN.data?.config?.fields;
                                if (Array.isArray(ff)) {
                                    for (const f of ff) {
                                        const k = f.name ?? f.key ?? f.label ?? f.id;
                                        if (k && typeof k === 'string' && !allUpstreamFieldNames.includes(k)) {
                                            allUpstreamFieldNames.push(k);
                                        }
                                    }
                                }
                            }
                            q2.push(edge.source);
                        }
                    }
                }
                catch {
                    // non-blocking
                }
                const directives = await generateRuntimeFieldDirectives({
                    nodeId,
                    nodeType,
                    runtimeAiFields,
                    userIntent,
                    graphDigest,
                    upstreamFieldNames: allUpstreamFieldNames.length > 0 ? allUpstreamFieldNames : undefined,
                    correlationId,
                });
                if (Object.keys(directives).length > 0) {
                    node.data.config = { ...node.data.config, _fieldDirectives: directives };
                }
            }
            // ── 2.6 Summary tracking ─────────────────────────────────────────────
            const writtenFields = Object.keys(filteredLlmValues);
            if (writtenFields.length > 0) {
                summary[nodeId] = writtenFields;
            }
        }
        catch (err) {
            // Per-node soft failure (2.5): log warn, leave node at defaultConfig, continue
            const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType ?? '');
            logger_1.logger.warn({
                event: 'ai_pipeline_stage_warn',
                stage: 'property_population',
                correlationId,
                nodeId,
                nodeType,
                reason: `LLM call failed — using defaultConfig: ${err instanceof Error ? err.message : String(err)}`,
            });
            if (nodeDef) {
                const prior = node.data?.config && typeof node.data.config === 'object' ? node.data.config : {};
                node.data.config = { ...nodeDef.defaultConfig(), ...prior };
            }
            // Continue to next node — stage never throws
        }
    }
    const durationMs = Date.now() - startedAt;
    logger_1.logger.info({
        event: 'ai_pipeline_stage_end',
        stage: 'property_population',
        correlationId,
        outputSummary: `populated=${Object.keys(summary).length} nodes`,
        durationMs,
    });
    return {
        ok: true,
        workflow,
        propertyPopulationSummary: summary,
        durationMs,
    };
}
