"use strict";
/**
 * Gemini-First Node Selector (Path B)
 *
 * Given user intent and the full node registry, Gemini selects the node types
 * needed to implement the workflow. No keyword-based extraction in this path.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectNodesFromIntent = selectNodesFromIntent;
exports.buildTagsFromRegistry = buildTagsFromRegistry;
const gemini_orchestrator_1 = require("./gemini-orchestrator");
const node_metadata_enricher_1 = require("./node-metadata-enricher");
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const MAX_REGISTRY_CHARS = 80000;
/**
 * Select workflow nodes from user intent using Gemini + full registry.
 * Returns only node type IDs that exist in the registry.
 */
async function selectNodesFromIntent(userPrompt) {
    const nodes = node_metadata_enricher_1.nodeMetadataEnricher.enrichAllNodes();
    const registryText = node_metadata_enricher_1.nodeMetadataEnricher.formatRegistryForNodeSelection(nodes, MAX_REGISTRY_CHARS);
    const systemPrompt = `You are a workflow node selector. Given the user's intent and a list of available node types, you must choose ONLY the node types from the registry that are needed to implement that intent.

Rules:
1. Understand the user's intent from their message.
2. Choose only node types from the provided registry. Return exact type strings as listed (e.g. manual_trigger, form, javascript, if_else, google_gmail).
3. Use form or input-style nodes when the user needs to collect data (e.g. age, details).
4. Use logic/code nodes (if_else, javascript, function) when the user needs conditions, validation, or calculations (e.g. "verify", "eligible", "check", "true or false").
5. Use communication nodes (google_gmail, slack_message, etc.) only when the user clearly mentions sending/notifying to that channel.
6. Include exactly one trigger (e.g. manual_trigger, form, webhook, schedule) when the workflow needs a starting point.
7. Do not add nodes the user did not ask for. Prefer minimal necessary set.

Respond with a single JSON object only, no markdown or explanation. Format:
{"nodeTypes": ["type1", "type2", ...], "tags": ["type1:category", ...]}

Tags are optional; you may omit the "tags" key. If present, use format "nodeType:category" (e.g. "form:data", "if_else:logic").`;
    const userMessage = `User intent:\n\n${userPrompt}\n\n${registryText}`;
    try {
        const raw = await gemini_orchestrator_1.geminiOrchestrator.processRequest('node-suggestion', { system: systemPrompt, message: userMessage }, { cache: false, temperature: 0.2 });
        const text = typeof raw === 'string' ? raw : (raw?.content ?? raw?.text ?? JSON.stringify(raw));
        const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        let nodeTypes = Array.isArray(parsed.nodeTypes) ? parsed.nodeTypes : [];
        const tags = Array.isArray(parsed.tags) ? parsed.tags : undefined;
        // Validate against registry: keep only known types
        const valid = [];
        for (const t of nodeTypes) {
            const type = typeof t === 'string' ? t.trim() : '';
            if (type && unified_node_registry_1.unifiedNodeRegistry.get(type)) {
                valid.push(type);
            }
        }
        nodeTypes = valid;
        if (nodeTypes.length > 0) {
            console.log(`[GeminiNodeSelector] ✅ Path B: Selected ${nodeTypes.length} node(s): ${nodeTypes.join(', ')}`);
        }
        return { nodeTypes, tags };
    }
    catch (err) {
        console.warn('[GeminiNodeSelector] Path B failed, caller should use keyword fallback:', err);
        return { nodeTypes: [], tags: undefined };
    }
}
/**
 * Build tags from registry for a list of node types (e.g. "type:category").
 * Used when Gemini does not return tags or for downstream consistency.
 */
function buildTagsFromRegistry(nodeTypes) {
    const tags = [];
    for (const type of nodeTypes) {
        const def = unified_node_registry_1.unifiedNodeRegistry.get(type);
        if (def?.category) {
            tags.push(`${type}:${def.category}`);
        }
        else {
            tags.push(type);
        }
    }
    return tags;
}
