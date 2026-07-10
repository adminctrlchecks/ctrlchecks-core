"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNodeCatalogText = buildNodeCatalogText;
exports.buildNodeCatalog = buildNodeCatalog;
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const DEFAULT_PRIORITY_ORDER = [
    'trigger',
    'communication', // moved up: Gmail/Slack must never be cut off by budget
    'logic',
    'data',
    'ai',
    'transformation',
    'utility',
];
const DEFAULT_TOKEN_BUDGET = 150000; // large enough to fit all registered nodes
/**
 * Build a compact, token-budget-aware node catalog string for LLM system prompts.
 *
 * - Reads ALL node definitions from UnifiedNodeRegistry at call time (no hardcoding).
 * - Sorts by priorityOrder so trigger/logic nodes are never dropped first.
 * - Serializes to compact JSON and accumulates until tokenBudget is reached.
 * - Adding a new node to the registry automatically includes it here — zero code changes needed.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
function buildNodeCatalogText(options = {}) {
    const budget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
    const priorityOrder = options.priorityOrder ?? DEFAULT_PRIORITY_ORDER;
    const types = unified_node_registry_1.unifiedNodeRegistry.getAllTypes();
    // Build compact entries from registry (no hardcoded node names)
    const entries = [];
    for (const type of types) {
        const def = unified_node_registry_1.unifiedNodeRegistry.get(type);
        if (!def)
            continue;
        const inputSchema = def.inputSchema || {};
        const outputSchema = def.outputSchema || {};
        const credSchema = def.credentialSchema;
        const inputSummary = Object.keys(inputSchema).slice(0, 8); // top 8 fields
        const outputSummary = Object.keys(outputSchema).slice(0, 4);
        const credentials = [];
        if (credSchema?.requirements) {
            for (const req of credSchema.requirements) {
                if (req.category)
                    credentials.push(req.category);
            }
        }
        // Extract operations from inputSchema if present
        const opField = inputSchema['operation'];
        let operations;
        if (opField?.enum)
            operations = opField.enum;
        else if (opField?.oneOf)
            operations = opField.oneOf.map((o) => o.const ?? o.enum?.[0]).filter(Boolean);
        const entry = {
            type,
            label: def.label || type,
            category: def.category || 'utility',
            description: (def.description || '').slice(0, 120),
            inputSummary,
            outputSummary,
            credentials,
            isTrigger: def.category === 'trigger',
            isBranching: !!def.isBranching,
        };
        if (operations?.length)
            entry.operations = operations;
        if (def.tags?.length)
            entry.tags = def.tags.slice(0, 8);
        if (def.capabilities?.length)
            entry.capabilities = def.capabilities.slice(0, 8);
        if (def.aiSelectionCriteria?.keywords?.length) {
            entry.aiKeywords = def.aiSelectionCriteria.keywords.slice(0, 8);
        }
        if (def.aiSelectionCriteria?.useCases?.length) {
            entry.useCases = def.aiSelectionCriteria.useCases.slice(0, 4);
        }
        entries.push(entry);
    }
    // Sort by priority order (lower index = higher priority = kept first when truncating)
    entries.sort((a, b) => {
        const ai = priorityOrder.indexOf(a.category);
        const bi = priorityOrder.indexOf(b.category);
        const aNorm = ai === -1 ? priorityOrder.length : ai;
        const bNorm = bi === -1 ? priorityOrder.length : bi;
        return aNorm - bNorm;
    });
    // Accumulate until budget is reached
    const included = [];
    let accumulated = 0;
    for (const entry of entries) {
        const serialized = JSON.stringify(entry);
        if (accumulated + serialized.length > budget && included.length > 0)
            break;
        included.push(entry);
        accumulated += serialized.length + 1; // +1 for comma/newline
    }
    return JSON.stringify(included);
}
/**
 * Build a compact node catalog for Gemini planning.
 * Uses UnifiedNodeRegistry as the single source of truth.
 */
function buildNodeCatalog() {
    const types = unified_node_registry_1.unifiedNodeRegistry.getAllTypes();
    const catalog = [];
    for (const type of types) {
        const def = unified_node_registry_1.unifiedNodeRegistry.get(type);
        if (!def)
            continue;
        const name = def.label || type;
        const category = def.category || 'action';
        const description = def.description || '';
        const capabilityTags = Array.isArray(def.tags) ? def.tags : [];
        const inputs = [];
        const outputs = [];
        const inputSchema = def.inputSchema || {};
        let operations = [];
        const operationCapabilities = {};
        for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
            inputs.push({
                name: fieldName,
                type: fieldDef.type || 'string',
                required: !!fieldDef.required,
            });
            // ✅ AI-FIRST: Extract operation information from inputSchema
            if (fieldName.toLowerCase() === 'operation') {
                const fieldType = fieldDef.type;
                // Check for enum/oneOf operations
                if (fieldDef.enum && Array.isArray(fieldDef.enum)) {
                    operations = fieldDef.enum;
                }
                else if (fieldDef.oneOf && Array.isArray(fieldDef.oneOf)) {
                    operations = fieldDef.oneOf.map((item) => item.const || item.enum?.[0]).filter(Boolean);
                }
                // ✅ AI-FIRST: Map operations to capabilities for role assignment
                // Reading operations → data_source capability
                const readOps = ['read', 'get', 'list', 'search', 'fetch', 'query', 'retrieve'];
                // Writing operations → output capability
                const writeOps = ['write', 'send', 'create', 'update', 'delete', 'append', 'post', 'publish'];
                for (const op of operations) {
                    const opLower = op.toLowerCase();
                    const opCaps = [];
                    if (readOps.some(ro => opLower.includes(ro))) {
                        opCaps.push('data_source', 'read');
                    }
                    if (writeOps.some(wo => opLower.includes(wo))) {
                        opCaps.push('output', 'write');
                    }
                    if (opLower.includes('transform') || opLower.includes('process') || opLower.includes('analyze')) {
                        opCaps.push('transformation');
                    }
                    if (opCaps.length > 0) {
                        operationCapabilities[op] = opCaps;
                    }
                }
            }
        }
        const outputSchema = def.outputSchema || {};
        const defaultPort = outputSchema.default;
        if (defaultPort?.schema) {
            outputs.push({
                name: defaultPort.name || 'default',
                type: defaultPort.schema.type || 'object',
            });
        }
        const examples = [];
        if (Array.isArray(def.examples)) {
            examples.push(...def.examples);
        }
        const catalogEntry = {
            type,
            name,
            category,
            description,
            capabilities: capabilityTags,
            inputs,
            outputs,
            examples,
        };
        // ✅ AI-FIRST: Add operation information if available
        if (operations.length > 0) {
            catalogEntry.operations = operations;
            if (Object.keys(operationCapabilities).length > 0) {
                catalogEntry.operationCapabilities = operationCapabilities;
            }
        }
        catalog.push(catalogEntry);
    }
    return catalog;
}
