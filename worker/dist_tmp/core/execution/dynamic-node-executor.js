"use strict";
/**
 * DYNAMIC NODE EXECUTOR
 *
 * This replaces all hardcoded node-specific logic in the execution engine.
 *
 * Architecture:
 * - Fetches node definition from UnifiedNodeRegistry
 * - Validates config against node schema
 * - Executes node using definition.execute()
 * - NO if/else logic for specific node types
 * - NO hardcoded node behavior
 *
 * This ensures:
 * - All node behavior comes from registry
 * - Permanent fixes apply to all workflows
 * - Infinite scalability
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXECUTION_OBSERVABILITY_KEYS = void 0;
exports.looksPlaceholderLikeValue = looksPlaceholderLikeValue;
exports.pickPrimaryMessageLikeField = pickPrimaryMessageLikeField;
exports.executeNodeDynamically = executeNodeDynamically;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const lru_node_outputs_cache_1 = require("../cache/lru-node-outputs-cache");
// ✅ PRODUCTION-GRADE: Removed normalizeNodeType - node types must be canonical before reaching executor
const intent_driven_json_router_1 = require("../intent-driven-json-router");
const universal_node_ai_context_1 = require("../../services/ai/universal-node-ai-context");
const ai_field_detector_1 = require("../../services/ai/ai-field-detector");
const runtime_input_adapter_1 = require("../runtime/runtime-input-adapter");
const input_guarantee_1 = require("./input-guarantee");
const system_key_filter_1 = require("./system-key-filter");
const fill_mode_resolver_1 = require("../utils/fill-mode-resolver");
const upstream_payload_signal_1 = require("../utils/upstream-payload-signal");
const upstream_narrative_text_1 = require("../utils/upstream-narrative-text");
const runtime_ai_title_backfill_1 = require("./runtime-ai-title-backfill");
const apply_input_aliases_1 = require("./apply-input-aliases");
const field_contract_engine_1 = require("./field-contract-engine");
const runtime_field_contract_1 = require("./runtime-field-contract");
const runtime_input_handoff_1 = require("./runtime-input-handoff");
const operation_contract_resolver_1 = require("../operations/operation-contract-resolver");
const field_policy_resolver_1 = require("../operations/field-policy-resolver");
const config_1 = require("../config");
const ai_output_verifier_1 = require("../../services/ai/ai-output-verifier");
const sentry_1 = require("../sentry");
/** Stable nodeOutputs cache keys — see `worker/docs/OBSERVABILITY_CONTRACT.md`. */
exports.EXECUTION_OBSERVABILITY_KEYS = {
    resolvedInputs: (nodeId) => `__resolved_inputs__:${nodeId}`,
    runtimeResolutionAudit: (nodeId) => `__runtime_resolution_audit__:${nodeId}`,
    selfValidation: (nodeId) => `__self_validation__:${nodeId}`,
    acknowledgement: (nodeId) => `__acknowledgement__:${nodeId}`,
};
/** API response envelope keys that are integration metadata, never business content. */
const INTEGRATION_METADATA_KEYS = new Set([
    // Tabular/range identifiers
    'range', 'rangeUsed', 'spreadsheetId', 'sheetName', 'sheetId',
    'tableName', 'databaseName', 'collectionName',
    // Pagination/count
    'count', 'total', 'totalCount', 'totalRows', 'rowCount', 'totalColumns',
    'columnCount', 'page', 'pageSize', 'hasMore', 'nextPageToken', 'cursor',
    // HTTP/API
    'statusCode', 'status', 'url', 'endpoint', 'method', 'requestId',
    // Structural/schema
    '_type', '_source', '_schema', '_version', 'schema', 'fieldNames',
    // Execution/temporal
    'executionId', 'executionTime', 'durationMs', 'timestamp',
    'createdAt', 'updatedAt', 'startedAt', 'finishedAt',
]);
/** Split an upstream payload into business data (usable as content) and integration metadata (structural identifiers). */
function separateUpstreamContext(payload) {
    if (payload == null || typeof payload !== 'object') {
        return {
            businessData: {},
            integrationMetadata: {},
            systemMetadata: {},
            errorData: {},
        };
    }
    if (Array.isArray(payload)) {
        const businessItems = [];
        const errorItems = [];
        for (const item of payload) {
            if (containsRuntimeError(item))
                errorItems.push(item);
            else
                businessItems.push(item);
        }
        return {
            businessData: businessItems.length > 0 ? { items: businessItems } : {},
            integrationMetadata: {},
            systemMetadata: {},
            errorData: errorItems.length > 0 ? { items: errorItems } : {},
        };
    }
    const obj = payload;
    const businessData = {};
    const integrationMetadata = {};
    const systemMetadata = {};
    const errorData = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key === '_error' || key === 'error' || key === '_errorCode' || key === '_errorDetails') {
            errorData[key] = value;
        }
        else if (key.startsWith('_')) {
            systemMetadata[key] = value;
        }
        else if (INTEGRATION_METADATA_KEYS.has(key)) {
            integrationMetadata[key] = value;
        }
        else {
            businessData[key] = value;
        }
    }
    return { businessData, integrationMetadata, systemMetadata, errorData };
}
function containsRuntimeError(value) {
    if (!value || typeof value !== 'object')
        return false;
    if (Array.isArray(value))
        return value.some(containsRuntimeError);
    const obj = value;
    return (typeof obj._error === 'string' ||
        typeof obj.error === 'string' ||
        typeof obj._errorCode === 'string');
}
function getUniversalInputContractFlags() {
    return {
        enabled: process.env.UNIVERSAL_INPUT_CONTRACT_V2 !== 'false',
        strictValidation: process.env.UNIVERSAL_INPUT_CONTRACT_STRICT_VALIDATION === 'true',
        auditOnly: process.env.UNIVERSAL_INPUT_CONTRACT_AUDIT_ONLY === 'true',
    };
}
function looksPlaceholderLikeValue(value) {
    if (typeof value !== 'string')
        return false;
    const t = value.trim().toLowerCase();
    if (!t)
        return true;
    // Bracket-style placeholders the AI sometimes generates for structured-data upstreams
    if (/\[insert\b|\[add\b|\[fill\b|\[enter\b|\[.*here\]|\[.*summary.*\]|\[.*data.*\]/i.test(value))
        return true;
    // Node ID accidentally injected by property population AI (e.g. "node_176fee7c-2227-495e-b91f-822b4332f068")
    // This happens when PP AI confuses a workflow node ID with content for a text/message field.
    if (/^node_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim()))
        return true;
    // Handlebars/template references the AI sometimes generates instead of actual values
    if (/\{\{[^}]+\}\}/.test(value))
        return true;
    // Long strings (>150 chars) are never placeholder markers — real placeholders are short
    // labels. AI-generated summaries that discuss "placeholder data" or "JSONPlaceholder API"
    // must not be discarded as if they were unfilled template slots.
    if (t.length > 150)
        return false;
    return (t.includes('process the workflow') ||
        t.includes('using the configured nodes') ||
        /\bplaceholder\b/.test(t) ||
        t.includes('lorem ipsum') ||
        t === 'generated message' ||
        t.includes('generated manually') ||
        t.includes('summary was generated manually') ||
        t.includes('to be generated') ||
        t.includes('will be generated'));
}
/**
 * Registry role first; if role is missing (legacy defs), allow canonical text field names only.
 */
function shouldFillRuntimeAiFromWorkflowIntent(fieldName, fieldDef) {
    if (!fieldDef)
        return false;
    const t = (fieldDef.type || 'string');
    if (t !== 'string' && t !== 'expression')
        return false;
    const role = fieldDef.role;
    if (role === 'prompt' ||
        role === 'content' ||
        role === 'long_body' ||
        role === 'short_summary' ||
        role === 'title_like') {
        return true;
    }
    if (role)
        return false;
    const f = fieldName.toLowerCase();
    return f === 'prompt' || f === 'query' || f === 'text' || f === 'message';
}
/**
 * Prefer canonical / essential body fields when mapping plain-text AI output (message mode).
 * Avoids filling `text` while leaving `message` empty when both exist (e.g. slack_message alias pair).
 */
function pickPrimaryMessageLikeField(inputSchema) {
    const keys = Object.keys(inputSchema);
    const candidates = keys.filter((field) => {
        const fl = field.toLowerCase();
        return (fl.includes('message') ||
            fl.includes('text') ||
            fl.includes('body') ||
            fl.includes('content'));
    });
    if (candidates.length === 0)
        return undefined;
    const aliasTargets = new Set();
    for (const [, def] of Object.entries(inputSchema)) {
        const ao = def?.aliasOf;
        if (typeof ao === 'string')
            aliasTargets.add(ao);
    }
    const canonical = candidates.find((c) => aliasTargets.has(c));
    if (canonical)
        return canonical;
    const byRole = candidates.find((c) => inputSchema[c]?.role === 'long_body');
    if (byRole)
        return byRole;
    const essential = candidates.find((c) => inputSchema[c]?.essentialForExecution === true);
    if (essential)
        return essential;
    if (candidates.includes('message'))
        return 'message';
    return candidates[0];
}
function isSensitiveInputField(fieldName) {
    const key = fieldName.toLowerCase();
    return (key.includes('credential') ||
        key.includes('password') ||
        key.includes('token') ||
        key.includes('secret') ||
        key.includes('apikey') ||
        key.includes('api_key') ||
        key.includes('auth') ||
        key.includes('oauth') ||
        key.includes('privatekey') ||
        key.includes('private_key'));
}
/**
 * Registry/schema-driven verbose logging for AI input resolution (avoid node-type string checks).
 */
function shouldLogVerboseAiInputResolution(definition) {
    if (!definition)
        return false;
    if (definition.category === 'ai')
        return true;
    const schema = definition.inputSchema;
    if (schema && typeof schema === 'object') {
        const keys = Object.keys(schema);
        if (keys.includes('body') && (keys.includes('headers') || keys.includes('url'))) {
            return true;
        }
    }
    return false;
}
function sanitizeResolvedInputsForPersistence(inputs) {
    const sanitized = {};
    for (const [fieldName, value] of Object.entries(inputs)) {
        if (isSensitiveInputField(fieldName)) {
            sanitized[fieldName] = '[MASKED]';
            continue;
        }
        sanitized[fieldName] = value;
    }
    return sanitized;
}
function createTemplateResolutionCache(source, upstreamPayload) {
    const cache = new lru_node_outputs_cache_1.LRUNodeOutputsCache(100, false);
    const allOutputs = source.getAll();
    for (const [nodeId, output] of Object.entries(allOutputs)) {
        cache.set(nodeId, output, true);
    }
    if (upstreamPayload !== undefined && upstreamPayload !== null) {
        cache.set('input', upstreamPayload, true);
        cache.set('$json', upstreamPayload, true);
        cache.set('json', upstreamPayload, true);
    }
    return cache;
}
function isMeaningfulValueForResolution(value) {
    return !(0, runtime_field_contract_1.isRuntimeEmptyValue)(value);
}
function runtimeAutofillEnabled() {
    return process.env.ENABLE_RUNTIME_AUTOFILL === 'true';
}
function getRuntimeAiFields(inputSchema, effectiveFillModes) {
    return Object.keys(inputSchema || {}).filter((fieldName) => effectiveFillModes[fieldName] === 'runtime_ai');
}
function pickSchemaFields(inputSchema, fieldNames) {
    const picked = {};
    for (const fieldName of fieldNames) {
        if (inputSchema[fieldName])
            picked[fieldName] = inputSchema[fieldName];
    }
    return picked;
}
function findMissingFields(resolved, fields) {
    return fields.filter((fieldName) => !isMeaningfulValueForResolution(resolved?.[fieldName]));
}
function firstLineTitle(value, fallback) {
    const fromValue = typeof value === 'string' ? value.split(/\r?\n/)[0].trim() : '';
    const source = fromValue || fallback;
    return source.trim().replace(/\s+/g, ' ').slice(0, 100);
}
function applyCostFirstRuntimeFallbacks(params) {
    const { resolved, runtimeFields, inputSchema, upstreamPayload, workflowIntent } = params;
    const next = { ...resolved };
    const upstreamType = (0, upstream_narrative_text_1.getUpstreamNodeTypeFromExecutionGlobal)();
    const narrative = (0, upstream_narrative_text_1.pickPrimaryNarrativeStringFromUpstreamOutput)(upstreamType, upstreamPayload);
    const fallbackIntent = workflowIntent || 'Process the workflow using the configured nodes.';
    // When there is a real upstream payload (non-empty, non-thin), do NOT pre-fill runtime_ai
    // fields with the intent string. Leave them empty so resolveInputsWithAI can call the LLM
    // with the actual upstream data. Only apply intent fallbacks when upstream is genuinely absent.
    const hasRealUpstream = upstreamPayload != null &&
        !(0, upstream_payload_signal_1.isEffectivelyEmptyUpstreamPayload)(upstreamPayload) &&
        !(0, upstream_payload_signal_1.isUpstreamNarrativelyThinForRuntimeAi)(upstreamPayload);
    for (const fieldName of runtimeFields) {
        const fieldDef = inputSchema[fieldName];
        const current = next[fieldName];
        const missingOrPlaceholder = !isMeaningfulValueForResolution(current) || looksPlaceholderLikeValue(current);
        if (!missingOrPlaceholder)
            continue;
        const role = fieldDef?.role;
        const lower = fieldName.toLowerCase();
        const stringLike = fieldDef?.type === 'string' || fieldDef?.type === 'expression' || !fieldDef?.type;
        // Only use narrative (extracted string from upstream) if it's a real narrative string,
        // not a large structured payload like Google Sheets rows.
        if (stringLike &&
            narrative &&
            (role === 'long_body' ||
                role === 'content' ||
                role === 'short_summary' ||
                lower === 'body' ||
                lower === 'message' ||
                lower === 'text' ||
                lower === 'content')) {
            next[fieldName] = narrative;
            continue;
        }
        if (stringLike && role === 'title_like') {
            const bodySource = next.body ?? next.message ?? next.text ?? next.content ?? narrative ?? fallbackIntent;
            next[fieldName] = firstLineTitle(bodySource, fallbackIntent);
            continue;
        }
        // Only fill with intent fallback when there is NO real upstream payload.
        // When upstream has real data (e.g. Google Sheets rows), leave the field empty
        // so the LLM call in resolveInputsWithAI can use the actual upstream data.
        if (!hasRealUpstream && shouldFillRuntimeAiFromWorkflowIntent(fieldName, fieldDef)) {
            next[fieldName] = fallbackIntent;
        }
    }
    (0, runtime_ai_title_backfill_1.fillMissingTitleLikeRuntimeAiFields)({
        resolvedInputs: next,
        upstreamPayload,
        inputSchema,
        effectiveFillModes: runtimeFields.reduce((acc, fieldName) => {
            acc[fieldName] = 'runtime_ai';
            return acc;
        }, {}),
        workflowIntent,
    });
    return next;
}
/**
 * Execute node using dynamic definition from registry
 *
 * This is the NEW execution path that replaces all hardcoded switch statements.
 * All node behavior comes from UnifiedNodeRegistry.
 */
async function executeNodeDynamically(context) {
    const { node, input, nodeOutputs, db, workflowId, userId, currentUserId } = context;
    const runtimeMarker = 'runtime-marker-2026-03-20-v1';
    const expectedRuntimeMarker = global.__expectedExecutionRuntimeMarker;
    if (expectedRuntimeMarker && expectedRuntimeMarker !== runtimeMarker) {
        console.warn('[DynamicExecutor] ⚠️ Runtime marker mismatch detected', {
            expectedRuntimeMarker,
            runtimeMarker,
            nodeId: node.id,
            workflowId,
        });
    }
    // Step 1: Extract node type
    const nodeType = node.data?.type || node.type;
    // Step 2: ✅ PRODUCTION-GRADE: Strict validation BEFORE registry
    // This ensures only canonical node types reach the registry
    try {
        const { assertValidNodeType } = require('../utils/node-authority');
        assertValidNodeType(nodeType);
    }
    catch (error) {
        console.error(`[DynamicExecutor] ❌ ${error.message}`);
        return {
            _error: error.message,
            _nodeType: nodeType,
        };
    }
    // Step 3: Get node definition from registry (SINGLE SOURCE OF TRUTH)
    // At this point, nodeType is guaranteed to be canonical
    const definition = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (!definition) {
        // This should NEVER happen if assertValidNodeType passed
        // If it does, it's an integrity issue
        const errorMsg = `[DynamicExecutor] ❌ Integrity error: Canonical node type '${nodeType}' not found in registry. This indicates a system initialization failure.`;
        console.error(errorMsg);
        return {
            _error: errorMsg,
            _nodeType: nodeType,
        };
    }
    console.log(`[DynamicExecutor] ✅ Executing ${nodeType} using definition from registry`);
    // Step 3: Migrate config to current schema version (backward compatibility)
    let config = node.data?.config || {};
    const migratedConfig = unified_node_registry_1.unifiedNodeRegistry.migrateConfig(nodeType, config);
    config = migratedConfig;
    // Derive effective fill modes for each input field from registry metadata and
    // any explicit per-node overrides stored in config._fillMode.
    const inputSchema = definition.inputSchema;
    const effectiveFillModes = (0, fill_mode_resolver_1.buildEffectiveFillModes)(definition.inputSchema, config);
    const runtimeOperationContract = (0, operation_contract_resolver_1.resolveOperationContract)(definition, migratedConfig);
    const runtimeFieldPolicy = (0, field_policy_resolver_1.resolveFieldPolicyForNode)(definition, migratedConfig, effectiveFillModes);
    // ✅ ROOT-LEVEL: Auto-fill text fields using AI before validation
    // This ensures message, subject, body, etc. are auto-generated if empty.
    // Respect registry/UI-driven fill modes so we ONLY auto-fill fields that are
    // allowed to use build-time AI (buildtime_ai_once or runtime_ai) and are not
    // explicitly locked to manual_static.
    if (runtimeAutofillEnabled())
        try {
            const aiFields = ai_field_detector_1.aiFieldDetector.detectAIFields(node);
            const emptyAIFields = aiFields
                .filter((f) => f.shouldAutoGenerate)
                .map((f) => f.fieldName)
                .filter((fieldName) => {
                const mode = effectiveFillModes[fieldName];
                const fieldDef = inputSchema?.[fieldName];
                if (runtimeFieldPolicy.fields[fieldName]?.active === false)
                    return false;
                const supportsBuildtimeAI = fieldDef?.fillMode?.supportsBuildtimeAI ?? false;
                // Skip fields that are explicitly manual or where build-time AI is disallowed.
                if (mode === 'manual_static' || !supportsBuildtimeAI) {
                    return false;
                }
                const currentValue = config[fieldName];
                return !currentValue || (typeof currentValue === 'string' && currentValue.trim() === '');
            });
            if (emptyAIFields.length > 0) {
                console.log(`[DynamicExecutor] 🤖 Auto-generating ${emptyAIFields.length} text field(s) for ${nodeType}: ${emptyAIFields.join(', ')}`);
                // Get previous node outputs for context
                const previousOutputs = {};
                try {
                    // Extract previous outputs from nodeOutputs cache
                    const allOutputs = nodeOutputs.getAll();
                    Object.assign(previousOutputs, allOutputs);
                }
                catch (e) {
                    console.warn(`[DynamicExecutor] ⚠️ Could not get previous outputs for AI context:`, e);
                }
                // Get user prompt from workflow metadata (if available)
                const userPrompt = global.currentWorkflowIntent || 'Process workflow data';
                // Create workflow context (minimal - just for AI context)
                const workflowContext = {
                    nodes: [node], // Minimal workflow for context
                    edges: [],
                    metadata: { workflowId },
                };
                // Auto-fill using AI
                const autoFilledNode = await universal_node_ai_context_1.universalNodeAIContext.autoFillNode({ ...node, data: { ...node.data, config } }, workflowContext, userPrompt, previousOutputs);
                // Update config with AI-generated fields
                config = autoFilledNode.data?.config || config;
                console.log(`[DynamicExecutor] ✅ AI auto-filled ${emptyAIFields.length} field(s) for ${nodeType}`);
            }
        }
        catch (error) {
            console.warn(`[DynamicExecutor] ⚠️ AI auto-fill failed (non-blocking):`, error);
            // Continue without auto-fill - use existing config
        }
    // Step 4: Validate config against node schema
    const validation = unified_node_registry_1.unifiedNodeRegistry.validateConfig(nodeType, config);
    if (!validation.valid) {
        console.error(`[DynamicExecutor] ❌ Config validation failed for ${nodeType}:`, validation.errors);
        // Single-path strict mode (no env override path).
        const isStrictMode = config_1.config.reliability.strictValidation;
        if (isStrictMode) {
            return {
                _error: `Configuration validation failed: ${validation.errors.join(', ')}`,
                _validationErrors: validation.errors,
                _nodeType: nodeType,
            };
        }
        // In non-strict mode, log warnings and continue (backward compatibility - NOT RECOMMENDED)
        if (validation.warnings) {
            console.warn(`[DynamicExecutor] ⚠️  Config warnings for ${nodeType}:`, validation.warnings);
        }
    }
    // Step 5: Intent Router (Phase 2) - Conditional activation with skip logic
    // Only activates when: confidence < 0.85, schema drift, or explicit filtering
    const upstreamOutputs = nodeOutputs.getAll();
    const filteredOutputs = {};
    if (upstreamOutputs && typeof upstreamOutputs === 'object') {
        const userPrompt = global.currentWorkflowIntent || '';
        // Process router for each upstream output (async)
        const routerPromises = [];
        Object.entries(upstreamOutputs).forEach(([upstreamNodeId, output]) => {
            const mappingMetadata = node.data?.config?._mappingMetadata;
            let fieldMetadata = undefined;
            if (mappingMetadata && typeof mappingMetadata === 'object') {
                const metadataEntries = Object.entries(mappingMetadata);
                if (metadataEntries.length > 0) {
                    fieldMetadata = metadataEntries[0][1];
                }
            }
            const shouldRoute = (0, intent_driven_json_router_1.shouldActivateRouter)(fieldMetadata, output, userPrompt);
            if (shouldRoute) {
                const router = new intent_driven_json_router_1.IntentDrivenJsonRouter();
                const routingContext = {
                    previousOutput: output,
                    targetNodeInputSchema: (0, field_policy_resolver_1.pickActiveInputSchema)(definition.inputSchema, runtimeFieldPolicy),
                    userIntent: userPrompt,
                    sourceNodeType: 'unknown',
                    targetNodeType: nodeType,
                    sourceNodeId: upstreamNodeId,
                    targetNodeId: node.id,
                    mappingMetadata: fieldMetadata,
                };
                const routerPromise = router
                    .route(routingContext)
                    .then((routingResult) => {
                    filteredOutputs[upstreamNodeId] = routingResult.filteredPayload;
                    console.log(`[DynamicExecutor] 🔄 Router activated for ${upstreamNodeId} → ${node.id}: ${routingResult.explanation}`);
                })
                    .catch(() => {
                    filteredOutputs[upstreamNodeId] = output;
                });
                routerPromises.push(routerPromise);
            }
            else {
                filteredOutputs[upstreamNodeId] = output;
                console.log(`[DynamicExecutor] ⭕️  Router skipped for ${upstreamNodeId} → ${node.id} (confidence: ${fieldMetadata?.confidence?.toFixed(3) || 'N/A'})`);
            }
        });
        await Promise.all(routerPromises);
    }
    // Step 5.5: Raw upstream payload — AI will analyze its keys and produce JSON for this node.
    // Empty-until-runtime: config input fields are left empty at build time; we fill them here from actual previous output.
    const upstreamPayload = input !== undefined && input !== null ? input : getPreviousNodeOutput(nodeOutputs);
    const templateResolutionNodeOutputs = createTemplateResolutionCache(nodeOutputs, upstreamPayload);
    const universalFlags = getUniversalInputContractFlags();
    // Step 6: Universal node input contract orchestration (intent + previous output + AI + deterministic fallback).
    const contractResult = await resolveNodeInputsUniversalContract({
        definition,
        node,
        nodeType,
        migratedConfig,
        nodeOutputs: templateResolutionNodeOutputs,
        upstreamPayload,
    });
    let resolvedInputs = contractResult.resolvedInputs;
    const runtimeInputSchema = (0, field_policy_resolver_1.pickActiveInputSchema)(definition.inputSchema, runtimeFieldPolicy);
    // Strict runtime_ai enforcement for registry-required runtime fields only.
    // Optional runtime fields may remain empty without blocking execution.
    const strictRuntimeFieldNames = Object.keys(runtimeInputSchema).filter((fieldName) => {
        if (effectiveFillModes[fieldName] !== 'runtime_ai')
            return false;
        return runtimeFieldPolicy.fields[fieldName]?.required === true ||
            (0, operation_contract_resolver_1.fieldRequiredByOperationContract)(runtimeOperationContract, fieldName);
    });
    const unresolvedRuntimeFields = strictRuntimeFieldNames.filter((fieldName) => !(0, fill_mode_resolver_1.isMeaningfulStaticValue)(resolvedInputs[fieldName]));
    if (unresolvedRuntimeFields.length > 0 && (universalFlags.strictValidation || !universalFlags.auditOnly)) {
        nodeOutputs.set(exports.EXECUTION_OBSERVABILITY_KEYS.runtimeResolutionAudit(node.id), {
            runtimeMarker,
            nodeId: node.id,
            nodeType,
            runtimeFields: contractResult.runtimeFieldsAudit,
            resolvedRuntimeFields: contractResult.resolvedRuntimeFieldsAudit,
            unresolvedRuntimeFields,
            fieldAudit: contractResult.fieldAudit,
            blockedReason: `missing_runtime_ai:${unresolvedRuntimeFields.join(',')}`,
            capturedAt: new Date().toISOString(),
        }, true);
        return {
            _error: `Runtime input resolution failed for required field(s): ${unresolvedRuntimeFields.join(', ')}`,
            _validationErrors: unresolvedRuntimeFields.map((f) => `Required runtime_ai field '${f}' is missing after runtime resolution`),
            _nodeType: nodeType,
        };
    }
    if (contractResult.validationErrors.length > 0 && (universalFlags.strictValidation || !universalFlags.auditOnly)) {
        nodeOutputs.set(exports.EXECUTION_OBSERVABILITY_KEYS.runtimeResolutionAudit(node.id), {
            runtimeMarker,
            nodeId: node.id,
            nodeType,
            runtimeFields: contractResult.runtimeFieldsAudit,
            resolvedRuntimeFields: contractResult.resolvedRuntimeFieldsAudit,
            unresolvedRuntimeFields: contractResult.missingRuntimeFieldsAudit,
            validationErrors: contractResult.validationErrors,
            fieldAudit: contractResult.fieldAudit,
            blockedReason: 'runtime_input_contract_validation',
            capturedAt: new Date().toISOString(),
        }, true);
        return {
            _error: `Runtime input contract validation failed: ${contractResult.validationErrors.join('; ')}`,
            _validationErrors: contractResult.validationErrors,
            _runtimeInputAudit: contractResult.fieldAudit,
            _nodeType: nodeType,
        };
    }
    // Deterministic runtime fill-mode observability for debugging and rollout KPIs.
    try {
        const effectiveFillModesForSchema = Object.fromEntries(Object.keys(runtimeInputSchema).map((fieldName) => [
            fieldName,
            effectiveFillModes[fieldName] ?? 'manual_static',
        ]));
        console.log(`[DynamicExecutor] Fill-mode resolution summary for ${node.id} (${nodeType}):`, {
            effectiveFillModes: effectiveFillModesForSchema,
            runtimeFields: contractResult.runtimeFieldsAudit,
            resolvedRuntimeFields: contractResult.resolvedRuntimeFieldsAudit,
            missingRuntimeFields: contractResult.missingRuntimeFieldsAudit,
            outputFallbackUsed: contractResult.outputFallbackUsed,
        });
        nodeOutputs.set(exports.EXECUTION_OBSERVABILITY_KEYS.runtimeResolutionAudit(node.id), {
            runtimeMarker,
            nodeId: node.id,
            nodeType,
            rollout: {
                contractV2: universalFlags.enabled,
                strictValidation: universalFlags.strictValidation,
                auditOnly: universalFlags.auditOnly,
            },
            runtimeFields: contractResult.runtimeFieldsAudit,
            resolvedRuntimeFields: contractResult.resolvedRuntimeFieldsAudit,
            unresolvedRuntimeFields: contractResult.missingRuntimeFieldsAudit,
            runtimeOwnedFields: contractResult.runtimeFieldsAudit,
            runtimeResolvedFields: contractResult.resolvedRuntimeFieldsAudit,
            runtimeResolutionErrors: contractResult.missingRuntimeFieldsAudit,
            fallbackApplied: contractResult.runtimeFieldsAudit.length > 0,
            outputFallbackUsed: contractResult.outputFallbackUsed,
            outputFallbackReason: contractResult.outputFallbackReason,
            contractRepairs: contractResult.contractRepairs,
            validationWarnings: contractResult.validationWarnings,
            fieldAudit: contractResult.fieldAudit,
            kpis: {
                unresolvedRuntimeFieldsRate: contractResult.runtimeFieldsAudit.length > 0
                    ? Number((contractResult.missingRuntimeFieldsAudit.length /
                        contractResult.runtimeFieldsAudit.length).toFixed(4))
                    : 0,
                fallbackPublishRate: contractResult.outputFallbackUsed ? 1 : 0,
            },
            schemaValidationFailures: contractResult.missingRuntimeFieldsAudit.map((f) => `missing:${f}`).concat(contractResult.validationErrors),
            canonicalizationIssues: [],
            capturedAt: new Date().toISOString(),
        }, true);
    }
    catch (runtimeAuditError) {
        console.warn(`[DynamicExecutor] Failed to persist runtime resolution audit for ${node.id}:`, runtimeAuditError);
    }
    // Capture resolved runtime inputs for execution observability without leaking secrets.
    // This is used by execution detail views and "last runtime value" previews in UI.
    let resolvedInputSources = {};
    try {
        resolvedInputSources = {};
        for (const fieldName of Object.keys(resolvedInputs || {})) {
            resolvedInputSources[fieldName] =
                contractResult.inputSources[fieldName] ||
                    (effectiveFillModes[fieldName] === 'runtime_ai' ? 'deterministic_runtime' : 'static_config');
        }
        nodeOutputs.set(exports.EXECUTION_OBSERVABILITY_KEYS.resolvedInputs(node.id), {
            fields: sanitizeResolvedInputsForPersistence(resolvedInputs || {}),
            sources: resolvedInputSources,
            runtimeMarker,
            capturedAt: new Date().toISOString(),
        }, true);
    }
    catch (captureError) {
        console.warn(`[DynamicExecutor] Failed to capture resolved inputs for ${node.id}:`, captureError);
    }
    // Branching nodes (switch/if_else and any future branching type) evaluate expressions
    // against upstream data while also resolving runtime_ai config fields.
    let effectiveInput = upstreamPayload;
    if (definition.isBranching === true) {
        const up = typeof upstreamPayload === 'object' && upstreamPayload !== null && !Array.isArray(upstreamPayload)
            ? upstreamPayload
            : {};
        const res = resolvedInputs && typeof resolvedInputs === 'object' && !Array.isArray(resolvedInputs)
            ? resolvedInputs
            : {};
        effectiveInput = { ...up, ...res };
        if (Object.keys(res).length > 0) {
            console.log(`[DynamicExecutor] ✅ Merged upstream payload with resolved branching config for ${nodeType} (upstreamKeys=${Object.keys(up).join(', ')}, resolvedKeys=${Object.keys(res).join(', ')})`);
        }
    }
    else if (resolvedInputs &&
        typeof resolvedInputs === 'object' &&
        Object.keys(resolvedInputs).length > 0) {
        effectiveInput = resolvedInputs;
        const prevKeys = typeof upstreamPayload === 'object' && upstreamPayload !== null
            ? Object.keys(upstreamPayload)
            : [];
        const aiFields = Object.entries(contractResult.inputSources)
            .filter(([, source]) => source === 'runtime_ai' || source === 'field_directive_ai')
            .map(([fieldName]) => fieldName);
        if (aiFields.length > 0) {
            console.log(`[DynamicExecutor] Runtime AI resolved fields [${aiFields.join(', ')}] from previous keys [${prevKeys.join(', ')}] for ${nodeType}`);
        }
        else {
            console.log(`[DynamicExecutor] Deterministic input resolution produced input JSON for ${nodeType}`);
        }
    }
    else if (upstreamPayload !== undefined &&
        upstreamPayload !== null &&
        typeof upstreamPayload === 'object') {
        const expectedKeys = node.data?.config?._expectedInputKeys;
        const { normalizedPayload, normalized } = (0, runtime_input_adapter_1.normalizeRuntimePayload)({
            payload: upstreamPayload,
            expectedKeys: Array.isArray(expectedKeys) ? expectedKeys : undefined,
        });
        if (normalized)
            effectiveInput = normalizedPayload;
    }
    // Store effective input as input/json for execution conveniences. Template resolution
    // still uses templateResolutionNodeOutputs so $json remains the immediate upstream payload.
    // For branching nodes, $json/json must only contain clean upstream business data — NOT the
    // merged routing config (expression, cases, matchedCase, etc.) that effectiveInput carries.
    if (effectiveInput !== undefined && effectiveInput !== null) {
        nodeOutputs.set('input', effectiveInput, true);
        if (definition.isBranching === true) {
            // Forward only the clean upstream payload so downstream nodes see real business data.
            const up = typeof upstreamPayload === 'object' &&
                upstreamPayload !== null &&
                !Array.isArray(upstreamPayload)
                ? (0, system_key_filter_1.stripRoutingMeta)(upstreamPayload)
                : {};
            nodeOutputs.set('$json', up, true);
            nodeOutputs.set('json', up, true);
        }
        else {
            nodeOutputs.set('$json', effectiveInput, true);
            nodeOutputs.set('json', effectiveInput, true);
        }
    }
    // ✅ CRITICAL FIX: Merge AI-generated inputs back into config for UI display
    // This ensures AI-generated values (headers, body, prompts, etc.) are visible in Properties Panel
    // Only merge if the field is empty in config (don't overwrite user-provided values)
    const mergedDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    const mergedSchema = mergedDef?.inputSchema || {};
    const { config: mergedConfig, appliedFields } = (0, runtime_input_handoff_1.buildFinalProviderConfig)({
        baseConfig: migratedConfig,
        finalResolvedInputs: resolvedInputs || {},
        inputSources: contractResult.inputSources,
        inputSchema: mergedSchema,
        effectiveFillModes,
        fieldPolicy: runtimeFieldPolicy,
    });
    for (const fieldName of appliedFields) {
        const source = contractResult.inputSources[fieldName] || 'static_config';
        console.log(`[DynamicExecutor] Merged ${source} value for ${fieldName} into config`);
    }
    // Remove placeholder-like values (node IDs injected by PP AI) from mergedConfig
    // for runtime_ai fields so the execute() call doesn't receive the artifact.
    for (const fieldName of contractResult.runtimeFieldsAudit) {
        if (looksPlaceholderLikeValue(mergedConfig[fieldName]) &&
            !isMeaningfulValueForResolution(resolvedInputs?.[fieldName])) {
            delete mergedConfig[fieldName];
        }
    }
    // ── runtime_ai resolution contract (spec task 9) ────────────────────────────────────────────
    // Resolve all {{$json.*}} template expressions in mergedConfig via
    // universalTemplateResolver BEFORE the legacy executor receives config.
    // This ensures no template syntax leaks into node execution.
    const { resolveUniversalTemplate } = require('../utils/universal-template-resolver');
    const templateResolvedConfig = {};
    for (const [key, value] of Object.entries(mergedConfig)) {
        if (typeof value === 'string' && (value.includes('{{') || value.includes('$json'))) {
            templateResolvedConfig[key] = resolveUniversalTemplate(value, templateResolutionNodeOutputs);
        }
        else {
            templateResolvedConfig[key] = value;
        }
    }
    const nodeConnectionRefs = (node.data?.connectionRefs || {});
    if (Object.keys(nodeConnectionRefs).length > 0 && !templateResolvedConfig.connectionRefs) {
        templateResolvedConfig.connectionRefs = nodeConnectionRefs;
    }
    const handoffValidation = (0, runtime_input_handoff_1.validateRuntimeInputHandoff)({
        nodeId: node.id,
        nodeType,
        finalResolvedInputs: resolvedInputs || {},
        providerConfig: templateResolvedConfig,
        inputSources: contractResult.inputSources,
        inputSchema: mergedSchema,
        effectiveFillModes,
        operationContract: runtimeOperationContract,
        fieldPolicy: runtimeFieldPolicy,
    });
    if (!handoffValidation.valid && (universalFlags.strictValidation || !universalFlags.auditOnly)) {
        nodeOutputs.set(exports.EXECUTION_OBSERVABILITY_KEYS.runtimeResolutionAudit(node.id), {
            runtimeMarker,
            nodeId: node.id,
            nodeType,
            runtimeFields: contractResult.runtimeFieldsAudit,
            resolvedRuntimeFields: contractResult.resolvedRuntimeFieldsAudit,
            unresolvedRuntimeFields: contractResult.missingRuntimeFieldsAudit,
            validationErrors: handoffValidation.errors,
            fieldAudit: contractResult.fieldAudit,
            handoffAudit: handoffValidation.audit,
            operationContract: {
                operation: runtimeOperationContract.operation,
                resource: runtimeOperationContract.resource,
                requiredFields: runtimeOperationContract.requiredFields,
                optionalFields: runtimeOperationContract.optionalFields,
                providerDefaultFields: runtimeOperationContract.providerDefaultFields,
                payloadGroups: runtimeOperationContract.payloadGroups,
                diagnostics: runtimeOperationContract.diagnostics,
            },
            blockedReason: 'runtime_input_handoff_validation',
            capturedAt: new Date().toISOString(),
        }, true);
        return {
            _error: handoffValidation.errors.join('; '),
            _validationErrors: handoffValidation.errors,
            _runtimeInputAudit: contractResult.fieldAudit,
            _runtimeInputHandoffAudit: handoffValidation.audit,
            _nodeType: nodeType,
        };
    }
    // ──────────────────────────────────────────────────────────────────────────────────────────────
    // Step 7: Create execution context (rawInput = effective normalized payload for never-failing code)
    nodeOutputs.set(exports.EXECUTION_OBSERVABILITY_KEYS.runtimeResolutionAudit(node.id), {
        runtimeMarker,
        nodeId: node.id,
        nodeType,
        runtimeFields: contractResult.runtimeFieldsAudit,
        resolvedRuntimeFields: contractResult.resolvedRuntimeFieldsAudit,
        unresolvedRuntimeFields: contractResult.missingRuntimeFieldsAudit,
        validationErrors: contractResult.validationErrors,
        fieldAudit: contractResult.fieldAudit,
        handoffAudit: handoffValidation.audit,
        operationContract: {
            operation: runtimeOperationContract.operation,
            resource: runtimeOperationContract.resource,
            requiredFields: runtimeOperationContract.requiredFields,
            optionalFields: runtimeOperationContract.optionalFields,
            providerDefaultFields: runtimeOperationContract.providerDefaultFields,
            payloadGroups: runtimeOperationContract.payloadGroups,
            diagnostics: runtimeOperationContract.diagnostics,
        },
        capturedAt: new Date().toISOString(),
    }, true);
    const lineageContext = {
        workflowIntent: String(global.currentWorkflowIntent || '').trim(),
        upstream: separateUpstreamContext(upstreamPayload),
    };
    const operation = String(templateResolvedConfig.operation || resolvedInputs?.operation || '');
    const providerContext = (0, runtime_input_handoff_1.createProviderExecutionContext)({
        finalResolvedInputs: resolvedInputs,
        resolvedInputSources,
        fieldContracts: mergedSchema,
        operationContract: runtimeOperationContract,
        operation,
        rawUpstreamInput: upstreamPayload,
        lineageContext,
        runtimeInputHandoffAudit: handoffValidation.audit,
    });
    const execContext = {
        nodeId: node.id,
        nodeType,
        config: templateResolvedConfig, // Use template-resolved config (spec task 9)
        inputs: resolvedInputs, // Use resolved inputs for execution
        finalResolvedInputs: resolvedInputs,
        resolvedInputSources,
        runtimeInputHandoffAudit: handoffValidation.audit,
        fieldContracts: mergedSchema,
        operation,
        rawUpstreamInput: upstreamPayload,
        lineageContext,
        providerContext,
        rawInput: upstreamPayload,
        upstreamOutputs: new Map(),
        workflowId,
        userId,
        currentUserId,
        db,
    };
    // Populate upstreamOutputs map
    const allUpstreamOutputs = nodeOutputs.getAll();
    if (allUpstreamOutputs && typeof allUpstreamOutputs === 'object') {
        Object.entries(allUpstreamOutputs).forEach(([upstreamNodeId, output]) => {
            execContext.upstreamOutputs.set(upstreamNodeId, output);
        });
    }
    // Step 8: Execute node using definition.execute() (NO hardcoded logic)
    try {
        const result = await sentry_1.Sentry.startSpan({ name: `node.${nodeType}`, op: 'node.execute', attributes: { nodeType, nodeId: node.id, workflowId } }, () => definition.execute(execContext));
        if (result.metadata?.operationStatus ||
            result.metadata?.acknowledgementStatus ||
            result.metadata?.persistenceStatus) {
            nodeOutputs.set(exports.EXECUTION_OBSERVABILITY_KEYS.acknowledgement(node.id), {
                nodeId: node.id,
                nodeType,
                operationStatus: result.metadata.operationStatus,
                acknowledgementStatus: result.metadata.acknowledgementStatus,
                persistenceStatus: result.metadata.persistenceStatus,
                timestamp: new Date().toISOString(),
            });
        }
        if (!result.success) {
            console.error(`[DynamicExecutor] ❌ Node execution failed:`, result.error);
            return {
                _error: result.error?.message || 'Node execution failed',
                _errorCode: result.error?.code,
                _errorDetails: result.error?.details,
                _nodeType: nodeType,
            };
        }
        // Step 9: Validate output against output schema + bounded self-repair
        let candidateOutput = result.output;
        const outputValidation = validateOutputAgainstSchema(candidateOutput, definition.outputSchema);
        if (!outputValidation.valid) {
            const selfCheckEnabled = config_1.config.reliability.aiSelfCheckEnabled;
            const maxAttempts = config_1.config.reliability.aiSelfCheckMaxAttempts;
            const strictValidation = config_1.config.reliability.strictValidation;
            console.warn(`[DynamicExecutor] ⚠️  Output validation warnings before repair:`, outputValidation.warnings);
            if (selfCheckEnabled) {
                const selfCheck = await (0, ai_output_verifier_1.verifyAndRepairNodeOutput)({
                    output: candidateOutput,
                    outputSchema: definition.outputSchema,
                    maxAttempts,
                });
                nodeOutputs.set(exports.EXECUTION_OBSERVABILITY_KEYS.selfValidation(node.id), {
                    nodeId: node.id,
                    nodeType,
                    finalValid: selfCheck.finalValid,
                    attempts: selfCheck.attempts,
                    expectedType: selfCheck.expectedType,
                    timestamp: new Date().toISOString(),
                });
                candidateOutput = selfCheck.repairedOutput;
                if (!selfCheck.finalValid && strictValidation) {
                    return {
                        _error: 'Output validation failed after self-repair attempts',
                        _errorCode: 'OUTPUT_VALIDATION_FAILED',
                        _nodeType: nodeType,
                        _selfValidation: selfCheck,
                    };
                }
            }
            else if (strictValidation) {
                return {
                    _error: 'Output validation failed and self-check is disabled',
                    _errorCode: 'OUTPUT_VALIDATION_FAILED',
                    _nodeType: nodeType,
                    _validationWarnings: outputValidation.warnings,
                };
            }
        }
        // ✅ CLEAN OUTPUT FROM CONFIG VALUES (CORE ARCHITECTURE FIX)
        // Remove config values from output to ensure only actual output data is returned
        // This prevents placeholder values and config fields from appearing in output JSON
        const { cleanOutputFromConfig } = await Promise.resolve().then(() => __importStar(require('../utils/placeholder-filter')));
        const cleanedOutput = cleanOutputFromConfig(candidateOutput, migratedConfig);
        return cleanedOutput;
    }
    catch (error) {
        console.error(`[DynamicExecutor] ❌ Unhandled error during execution:`, error);
        // ✅ CLEAN ERROR OUTPUT: Don't include config values in error output
        const errorOutput = {
            _error: error.message || 'Unhandled execution error',
            _errorDetails: error,
            _nodeType: nodeType,
        };
        const { cleanOutputFromConfig } = await Promise.resolve().then(() => __importStar(require('../utils/placeholder-filter')));
        const cleanedErrorOutput = cleanOutputFromConfig(errorOutput, migratedConfig);
        return cleanedErrorOutput;
    }
}
/**
 * Resolve input values using AI Input Resolver (NEW ARCHITECTURE)
 * When overridePreviousOutput is provided (e.g. normalized payload from runtime adapter), use it for key-aware binding.
 */
async function resolveInputsWithAI(inputSchema, config, nodeOutputs, currentNodeId, nodeType, nodeLabel, overridePreviousOutput, retryRequiredFields, fieldDirectives) {
    let previousOutput;
    if (overridePreviousOutput !== undefined) {
        previousOutput = overridePreviousOutput;
        global.lastPreviousOutputNodeId = null;
    }
    else {
        // ✅ UNIVERSAL FIX: Skip entries that are effectively empty (meta/trigger-only payloads).
        // getMostRecentOutputEntry returns the entry with the highest setTimestamp, but meta keys
        // (e.g. $json, trigger) may be refreshed after the real node output, shadowing it.
        // We iterate from most-recent to least-recent and return the first non-empty real entry.
        const entry = nodeOutputs.getMostRecentOutputEntry(['$json', 'json', 'trigger', 'input']);
        if (entry &&
            !(0, upstream_payload_signal_1.isEffectivelyEmptyUpstreamPayload)(entry.value) &&
            !(0, upstream_payload_signal_1.isUpstreamNarrativelyThinForRuntimeAi)(entry.value)) {
            previousOutput = entry.value;
            global.lastPreviousOutputNodeId = entry.key ?? null;
        }
        else {
            // Fall back: try all entries (excluding meta keys) and pick the first with real narrative payload
            const allEntries = nodeOutputs.getAllEntries?.(['$json', 'json', 'trigger', 'input']) ?? [];
            const nonEmptyEntry = allEntries.find((e) => !(0, upstream_payload_signal_1.isEffectivelyEmptyUpstreamPayload)(e.value) &&
                !(0, upstream_payload_signal_1.isUpstreamNarrativelyThinForRuntimeAi)(e.value));
            previousOutput = nonEmptyEntry?.value ?? entry?.value;
            global.lastPreviousOutputNodeId = (nonEmptyEntry?.key ?? entry?.key) ?? null;
        }
    }
    // Strip system/audit metadata keys before using previousOutput as AI context.
    // This prevents runtimeResolutionAudit objects and routing internals from being
    // treated as real upstream business data by the AI resolver and key-alias matcher.
    if (previousOutput !== undefined && previousOutput !== null) {
        const stripped = (0, system_key_filter_1.stripSystemKeys)(previousOutput);
        previousOutput = Object.keys(stripped).length > 0 ? stripped : undefined;
    }
    // Store previous output globally for body mapping (and node id for registry-driven narrative pick).
    global.lastPreviousOutput = previousOutput;
    // User intent from currentWorkflowIntent set at execution start in execute-workflow (single source for this run).
    const userIntent = global.currentWorkflowIntent || 'Process workflow data';
    // Thin upstream payloads should not short-circuit to static config.
    // We still run AI resolution using workflow intent so runtime_ai fields can be generated.
    if (previousOutput == null ||
        (typeof previousOutput === 'object' &&
            Object.keys(previousOutput).length === 0) ||
        (0, upstream_payload_signal_1.isEffectivelyEmptyUpstreamPayload)(previousOutput) ||
        (0, upstream_payload_signal_1.isUpstreamNarrativelyThinForRuntimeAi)(previousOutput)) {
        console.log('[DynamicExecutor] ℹ️ Thin upstream payload detected, running intent-only AI input resolution', {
            nodeType,
            nodeId: currentNodeId,
        });
        previousOutput = undefined;
        global.lastPreviousOutput = undefined;
        global.lastPreviousOutputNodeId = null;
    }
    // Import AI Input Resolver — AI analyzes actual keys (number, value, number.1, number.list, etc.) and creates input JSON
    const { aiInputResolver } = await Promise.resolve().then(() => __importStar(require('../ai-input-resolver')));
    // Resolve inputs using AI
    try {
        const definitionForVerboseLogs = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
        const logVerboseAiResolution = shouldLogVerboseAiInputResolution(definitionForVerboseLogs);
        if (logVerboseAiResolution) {
            console.log('[DynamicExecutor] 🔍 Starting AI input resolution for node:', {
                nodeId: currentNodeId,
                nodeType,
                nodeLabel,
                hasPreviousOutput: previousOutput !== undefined,
                previousOutputKeys: previousOutput && typeof previousOutput === 'object'
                    ? Object.keys(previousOutput)
                    : [],
                previousOutputSample: previousOutput && typeof previousOutput === 'object'
                    ? JSON.stringify(previousOutput).substring(0, 200)
                    : String(previousOutput).substring(0, 200),
                inputSchemaKeys: Object.keys(inputSchema || {}),
                userIntent,
            });
        }
        const separatedUpstreamContext = previousOutput != null ? separateUpstreamContext(previousOutput) : undefined;
        const resolved = await aiInputResolver.resolveInput({
            previousOutput,
            nodeInputSchema: inputSchema,
            userIntent,
            nodeType,
            nodeLabel,
            retryRequiredFields,
            runtimeLineage: buildRuntimeLineage(nodeOutputs, previousOutput),
            fieldDirectives,
            separatedUpstreamContext,
        });
        if (logVerboseAiResolution) {
            console.log('[DynamicExecutor] ✅ AI input resolution result:', {
                nodeId: currentNodeId,
                nodeType,
                mode: resolved.mode,
                resolvedValueType: typeof resolved.value,
                resolvedValueKeys: resolved.value && typeof resolved.value === 'object'
                    ? Object.keys(resolved.value)
                    : [],
                resolvedValueSample: resolved.value && typeof resolved.value === 'object'
                    ? JSON.stringify(resolved.value).substring(0, 300)
                    : String(resolved.value).substring(0, 300),
                hasPrompt: resolved.value &&
                    typeof resolved.value === 'object' &&
                    'prompt' in resolved.value,
                hasBody: resolved.value &&
                    typeof resolved.value === 'object' &&
                    'body' in resolved.value,
                hasHeaders: resolved.value &&
                    typeof resolved.value === 'object' &&
                    'headers' in resolved.value,
                explanation: resolved.explanation,
            });
        }
        // Map resolved value to input schema fields
        const mapped = mapResolvedValueToSchema(resolved.value, inputSchema, resolved.mode);
        if (logVerboseAiResolution) {
            console.log('[DynamicExecutor] ✅ Mapped resolved input to schema:', {
                nodeId: currentNodeId,
                mappedKeys: Object.keys(mapped),
                mappedSample: JSON.stringify(mapped).substring(0, 300),
                hasPrompt: 'prompt' in mapped,
                hasBody: 'body' in mapped,
                hasHeaders: 'headers' in mapped,
                bodyType: mapped.body ? typeof mapped.body : 'N/A',
                bodySample: mapped.body ? JSON.stringify(mapped.body).substring(0, 200) : 'N/A',
                headersSample: mapped.headers ? JSON.stringify(mapped.headers).substring(0, 200) : 'N/A',
            });
        }
        return mapped;
    }
    catch (error) {
        console.warn(`[DynamicExecutor] ⚠️  AI input resolution failed, using fallback: ${error.message}`);
        // Fallback: Use config values as-is (backward compatibility)
        return resolveInputsFromConfig(inputSchema, config, nodeOutputs);
    }
}
/**
 * Universal contract orchestrator for node input resolution.
 * Order: static/template config -> previous-output extraction -> AI mapping ->
 * deterministic contracts -> guarantee -> intent backfill -> output reliability fallback.
 */
async function resolveNodeInputsUniversalContract(params) {
    const { definition, node, nodeType, migratedConfig, nodeOutputs, upstreamPayload } = params;
    const effectiveFillModes = (0, fill_mode_resolver_1.buildEffectiveFillModes)(definition.inputSchema, migratedConfig);
    const fieldPolicy = (0, field_policy_resolver_1.resolveFieldPolicyForNode)(definition, migratedConfig, effectiveFillModes);
    const runtimeInputSchema = (0, field_policy_resolver_1.pickActiveInputSchema)(definition.inputSchema, fieldPolicy);
    const operationContract = fieldPolicy.operationContract;
    const rawWorkflowIntent = String(global.currentWorkflowIntent || '').trim();
    let runtimeFieldsAudit = [];
    let resolvedRuntimeFieldsAudit = [];
    let missingRuntimeFieldsAudit = [];
    let outputFallbackUsed = false;
    let outputFallbackReason;
    let inputSources = {};
    let validationErrors = [];
    let validationWarnings = [];
    let contractRepairs = [];
    let fieldAudit = [];
    let resolvedInputs = resolveInputsFromConfig(runtimeInputSchema, migratedConfig, nodeOutputs);
    for (const fieldName of Object.keys(resolvedInputs)) {
        const rawConfigValue = migratedConfig[fieldName];
        inputSources[fieldName] =
            typeof rawConfigValue === 'string' && rawConfigValue.includes('{{')
                ? 'template'
                : 'static_config';
    }
    if (runtimeInputSchema &&
        (upstreamPayload == null ||
            typeof upstreamPayload === 'object' ||
            typeof upstreamPayload === 'string')) {
        const runtimeFields = getRuntimeAiFields(runtimeInputSchema, effectiveFillModes).filter((fieldName) => fieldPolicy.fields[fieldName]?.active !== false);
        // Only fields explicitly owned by runtime_ai may be filled at runtime.
        // Manual/static fields are user-owned, even when empty; filling them from intent can
        // corrupt concrete integration values such as Google Sheets ranges or API IDs.
        const emptyUnblockedFields = [];
        const allRuntimeFields = [...runtimeFields, ...emptyUnblockedFields];
        runtimeFieldsAudit = allRuntimeFields;
        for (const fieldName of allRuntimeFields) {
            const fieldDef = runtimeInputSchema[fieldName];
            const protectedField = fieldDef?.runtimeContract?.protected === true ||
                fieldDef?.ownership === 'credential' ||
                fieldDef?.runtimeContract?.sourcePolicy?.manualOnly === true ||
                fieldDef?.runtimeContract?.sourcePolicy?.systemOnly === true;
            const aiAllowed = fieldDef?.runtimeContract?.aiGeneratable !== false &&
                fieldDef?.fillMode?.supportsRuntimeAI !== false &&
                !protectedField;
            const currentSource = inputSources[fieldName];
            const currentValue = resolvedInputs[fieldName];
            if (currentSource === 'static_config' || currentSource === 'template') {
                if (!aiAllowed || !isMeaningfulValueForResolution(currentValue)) {
                    delete resolvedInputs[fieldName];
                    delete inputSources[fieldName];
                }
                else {
                    delete inputSources[fieldName];
                }
            }
        }
        resolvedInputs = (0, input_guarantee_1.guaranteeInputForSchema)({
            resolved: resolvedInputs,
            previousOutput: upstreamPayload,
            inputSchema: runtimeInputSchema,
            requiredInputs: fieldPolicy.requiredFields,
            mappingMetadata: migratedConfig?._mappingMetadata,
            fieldFillModes: effectiveFillModes,
        });
        resolvedInputs = applyCostFirstRuntimeFallbacks({
            resolved: resolvedInputs,
            runtimeFields: allRuntimeFields,
            inputSchema: runtimeInputSchema,
            upstreamPayload,
            workflowIntent: rawWorkflowIntent,
        });
        // Clear placeholder-like values (including node IDs injected by property population AI)
        // from runtime_ai fields so the AI resolution step below generates real content for them.
        for (const fieldName of allRuntimeFields) {
            if (looksPlaceholderLikeValue(resolvedInputs[fieldName])) {
                delete resolvedInputs[fieldName];
                console.warn(`[DynamicExecutor] Cleared placeholder-like value on runtime_ai field '${fieldName}' for ${nodeType} — AI will generate real content.`);
            }
        }
        for (const fieldName of allRuntimeFields) {
            if (isMeaningfulValueForResolution(resolvedInputs[fieldName]) &&
                inputSources[fieldName] !== 'static_config' &&
                inputSources[fieldName] !== 'template') {
                inputSources[fieldName] = 'deterministic_runtime';
            }
        }
        const requiredRuntimeFields = allRuntimeFields.filter((fieldName) => (fieldPolicy.fields[fieldName]?.required === true || (0, operation_contract_resolver_1.fieldRequiredByOperationContract)(operationContract, fieldName)) &&
            !(0, operation_contract_resolver_1.fieldAllowsEmptyValue)(operationContract, fieldName));
        let missingRequiredRuntimeFields = findMissingFields(resolvedInputs, requiredRuntimeFields);
        // Resolve all runtime fields (registry runtime_ai + empty unblocked) still missing after
        // deterministic fallbacks — using AI with user intent + previous node output.
        const aiResolvableRuntimeFields = allRuntimeFields.filter((fieldName) => {
            const fieldDef = runtimeInputSchema[fieldName];
            const protectedField = fieldDef?.runtimeContract?.protected === true ||
                fieldDef?.ownership === 'credential' ||
                fieldDef?.runtimeContract?.sourcePolicy?.manualOnly === true ||
                fieldDef?.runtimeContract?.sourcePolicy?.systemOnly === true;
            return (fieldPolicy.fields[fieldName]?.runtimeAiAllowed !== false &&
                fieldDef?.runtimeContract?.aiGeneratable !== false &&
                fieldDef?.fillMode?.supportsRuntimeAI !== false &&
                !protectedField);
        });
        const missingOptionalRuntimeFields = allRuntimeFields.filter((fieldName) => {
            if ((0, operation_contract_resolver_1.fieldRequiredByOperationContract)(operationContract, fieldName))
                return false;
            if ((0, operation_contract_resolver_1.fieldAllowsEmptyValue)(operationContract, fieldName))
                return false;
            return !isMeaningfulValueForResolution(resolvedInputs[fieldName]);
        });
        const allMissingRuntimeFields = [
            ...new Set([...aiResolvableRuntimeFields, ...missingRequiredRuntimeFields, ...missingOptionalRuntimeFields]),
        ];
        if (allMissingRuntimeFields.length > 0) {
            try {
                const aiSchema = pickSchemaFields(runtimeInputSchema, allMissingRuntimeFields);
                const fieldDirectives = migratedConfig._fieldDirectives;
                const aiResolved = await resolveInputsWithAI(aiSchema, migratedConfig, nodeOutputs, node.id, nodeType, node.data?.label, upstreamPayload, allMissingRuntimeFields, fieldDirectives);
                const aiCurrent = typeof aiResolved === 'object' && aiResolved !== null ? aiResolved : {};
                for (const fieldName of allMissingRuntimeFields) {
                    if (isMeaningfulValueForResolution(aiCurrent[fieldName])) {
                        resolvedInputs[fieldName] = aiCurrent[fieldName];
                        const hasDirective = !!(fieldDirectives?.[fieldName]);
                        inputSources[fieldName] = hasDirective ? 'field_directive_ai' : 'runtime_ai';
                    }
                }
                missingRequiredRuntimeFields = findMissingFields(resolvedInputs, requiredRuntimeFields);
            }
            catch (runtimeAiError) {
                console.warn('[DynamicExecutor] Runtime AI fallback skipped; using deterministic inputs:', {
                    nodeId: node.id,
                    nodeType,
                    missingRequiredRuntimeFields: allMissingRuntimeFields,
                    code: runtimeAiError?.code,
                    message: runtimeAiError?.message,
                });
            }
        }
        // Structured-data-to-text fallback: when a text/content-like field is still empty after AI
        // resolution (AI failed, was budget-blocked, or returned placeholder that was cleared), and
        // the upstream payload is structured data (array/object), serialize it as compact JSON so
        // the node (e.g. Text Summarizer) has actual data to process.
        if (upstreamPayload != null && typeof upstreamPayload === 'object') {
            const stillMissingTextFields = allRuntimeFields.filter((fieldName) => {
                if (isMeaningfulValueForResolution(resolvedInputs[fieldName]))
                    return false;
                const fieldDef = runtimeInputSchema[fieldName];
                const expectedType = (fieldDef?.type || 'string');
                if (expectedType !== 'string' && expectedType !== 'expression')
                    return false;
                const fl = fieldName.toLowerCase();
                return (fl === 'text' ||
                    fl === 'content' ||
                    (fl.includes('text') && !fl.includes('context') && !fl.includes('subtext')));
            });
            if (stillMissingTextFields.length > 0) {
                try {
                    const raw = JSON.stringify(upstreamPayload, null, 2);
                    const serialized = raw.length > 4000 ? raw.slice(0, 4000) + '\n...[truncated]' : raw;
                    if (serialized) {
                        for (const fieldName of stillMissingTextFields) {
                            resolvedInputs[fieldName] = serialized;
                            inputSources[fieldName] = 'deterministic_runtime';
                            console.log(`[DynamicExecutor] ✅ Structured-data-to-text fallback applied for '${fieldName}' in ${nodeType} (${Array.isArray(upstreamPayload) ? upstreamPayload.length + ' items' : 'object'})`);
                        }
                    }
                }
                catch { /* ignore serialization failures */ }
            }
        }
        resolvedInputs = (0, input_guarantee_1.guaranteeInputForSchema)({
            resolved: resolvedInputs,
            previousOutput: upstreamPayload,
            inputSchema: runtimeInputSchema,
            requiredInputs: operationContract.requiredFields,
            mappingMetadata: migratedConfig?._mappingMetadata,
            fieldFillModes: effectiveFillModes,
        });
        (0, runtime_ai_title_backfill_1.fillMissingTitleLikeRuntimeAiFields)({
            resolvedInputs: resolvedInputs,
            upstreamPayload,
            inputSchema: runtimeInputSchema,
            effectiveFillModes,
            workflowIntent: rawWorkflowIntent,
        });
        for (const fieldName of runtimeFields) {
            if (isMeaningfulValueForResolution(resolvedInputs[fieldName]) && !inputSources[fieldName]) {
                inputSources[fieldName] = 'deterministic_runtime';
            }
        }
        const outputNode = String(definition.category) === 'output' || definition.category === 'communication';
        if (((0, upstream_payload_signal_1.isEffectivelyEmptyUpstreamPayload)(upstreamPayload) ||
            (0, upstream_payload_signal_1.isUpstreamNarrativelyThinForRuntimeAi)(upstreamPayload)) &&
            !outputNode) {
            const fallbackIntent = rawWorkflowIntent.length > 0
                ? rawWorkflowIntent
                : 'Process the workflow using the configured nodes.';
            for (const fieldName of Object.keys(runtimeInputSchema)) {
                if (effectiveFillModes[fieldName] !== 'runtime_ai')
                    continue;
                const fieldDef = runtimeInputSchema[fieldName];
                if (!shouldFillRuntimeAiFromWorkflowIntent(fieldName, fieldDef))
                    continue;
                if ((0, fill_mode_resolver_1.isMeaningfulStaticValue)(resolvedInputs[fieldName]))
                    continue;
                resolvedInputs[fieldName] = fallbackIntent;
            }
        }
        const contractResult = (0, field_contract_engine_1.applyDeterministicFieldContracts)(resolvedInputs, {
            nodeType,
            userIntent: rawWorkflowIntent,
            upstreamPayload,
            config: migratedConfig,
            inputSchema: runtimeInputSchema,
        });
        resolvedInputs = contractResult.resolvedInputs;
        for (const fieldName of Object.keys(runtimeInputSchema)) {
            const mode = effectiveFillModes[fieldName];
            if (mode === 'manual_static' || mode === 'buildtime_ai_once') {
                const staticValue = migratedConfig[fieldName];
                if ((0, fill_mode_resolver_1.isMeaningfulStaticValue)(staticValue)) {
                    if (typeof staticValue === 'string' && staticValue.includes('{{')) {
                        const resolved = resolveTemplateExpression(staticValue, nodeOutputs);
                        resolvedInputs[fieldName] =
                            resolved !== undefined && resolved !== null && resolved !== staticValue
                                ? resolved
                                : staticValue;
                        inputSources[fieldName] = 'template';
                    }
                    else {
                        resolvedInputs[fieldName] = staticValue;
                        inputSources[fieldName] = 'static_config';
                    }
                }
            }
        }
        (0, apply_input_aliases_1.applyInputAliasesFromSchema)(resolvedInputs, runtimeInputSchema);
        const finalContractPass = (0, runtime_field_contract_1.enforceRuntimeFieldContracts)(resolvedInputs, inputSources, {
            inputSchema: runtimeInputSchema,
            config: migratedConfig,
            effectiveFillModes,
            upstreamPayload,
            allOutputs: nodeOutputs.getAll(),
            workflowIntent: rawWorkflowIntent,
        });
        resolvedInputs = finalContractPass.resolvedInputs;
        inputSources = finalContractPass.inputSources;
        validationErrors = finalContractPass.errors;
        validationWarnings.push(...finalContractPass.warnings);
        contractRepairs.push(...finalContractPass.repairs);
        fieldAudit = finalContractPass.audit;
        const resolvedRuntimeFields = runtimeFields.filter((fieldName) => isMeaningfulValueForResolution(resolvedInputs?.[fieldName]));
        const missingRuntimeFields = runtimeFields.filter((fieldName) => !resolvedRuntimeFields.includes(fieldName));
        runtimeFieldsAudit = runtimeFields;
        resolvedRuntimeFieldsAudit = resolvedRuntimeFields;
        missingRuntimeFieldsAudit = missingRuntimeFields;
        // Generic output-node reliability: avoid publishing obvious placeholder AI text.
        if (outputNode && runtimeFields.length > 0) {
            const upstreamType = (0, upstream_narrative_text_1.getUpstreamNodeTypeFromExecutionGlobal)();
            const narrativeFallback = (0, upstream_narrative_text_1.pickPrimaryNarrativeStringFromUpstreamOutput)(upstreamType, upstreamPayload);
            const replacedFields = [];
            for (const fieldName of runtimeFields) {
                const fieldDef = runtimeInputSchema[fieldName];
                if (!shouldFillRuntimeAiFromWorkflowIntent(fieldName, fieldDef))
                    continue;
                const val = resolvedInputs[fieldName];
                if (looksPlaceholderLikeValue(val) &&
                    typeof narrativeFallback === 'string' &&
                    narrativeFallback.trim().length > 0) {
                    resolvedInputs[fieldName] = narrativeFallback;
                    if (inputSources[fieldName] !== 'runtime_ai') {
                        inputSources[fieldName] = 'deterministic_runtime';
                    }
                    replacedFields.push(fieldName);
                }
            }
            if (replacedFields.length > 0) {
                outputFallbackUsed = true;
                outputFallbackReason = `placeholder_like_runtime_ai:${replacedFields.join(',')}`;
            }
        }
    }
    return {
        resolvedInputs,
        inputSources,
        runtimeFieldsAudit,
        resolvedRuntimeFieldsAudit,
        missingRuntimeFieldsAudit,
        outputFallbackUsed,
        outputFallbackReason,
        validationErrors,
        validationWarnings,
        contractRepairs,
        fieldAudit,
    };
}
/**
 * Get previous node output from nodeOutputs cache.
 * ✅ UNIVERSAL FIX: Returns the most recently set non-empty, non-meta entry.
 * Skips entries where isEffectivelyEmptyUpstreamPayload returns true so that
 * meta/trigger-only payloads set after real node output do not shadow the real output.
 */
function getPreviousNodeOutput(nodeOutputs) {
    const META_KEYS = ['$json', 'json', 'trigger', 'input'];
    // First try: most recent non-meta entry
    const entry = nodeOutputs.getMostRecentOutputEntry(META_KEYS);
    if (entry && !(0, upstream_payload_signal_1.isEffectivelyEmptyUpstreamPayload)(entry.value)) {
        return entry.value;
    }
    // Second try: scan all non-meta entries for the first non-empty one
    const allEntries = nodeOutputs.getAllEntries(META_KEYS);
    const nonEmpty = allEntries.find((e) => !(0, upstream_payload_signal_1.isEffectivelyEmptyUpstreamPayload)(e.value));
    if (nonEmpty)
        return nonEmpty.value;
    // Final fallback: return whatever the most recent entry has (let caller decide)
    return entry?.value;
}
/**
 * Build runtime lineage context from nodeOutputs for AI context enrichment.
 */
function buildRuntimeLineage(nodeOutputs, previousOutput) {
    const rawOutputs = nodeOutputs.getAll();
    const allOutputs = {};
    for (const [key, value] of Object.entries(rawOutputs)) {
        if (!key.startsWith('__'))
            allOutputs[key] = value;
    }
    const triggerOutput = allOutputs['trigger'] ??
        Object.entries(allOutputs).find(([key]) => key.toLowerCase().includes('trigger'))?.[1];
    const successfulEntries = Object.entries(allOutputs)
        .filter(([k]) => !['$json', 'json', 'trigger', 'input'].includes(k))
        .filter(([, v]) => v != null && !containsRuntimeError(v))
        .filter(([, v]) => !(0, upstream_payload_signal_1.isEffectivelyEmptyUpstreamPayload)(v) && !(0, upstream_payload_signal_1.isUpstreamNarrativelyThinForRuntimeAi)(v));
    const lastSuccessfulBusinessOutput = (!containsRuntimeError(previousOutput) &&
        !(0, upstream_payload_signal_1.isEffectivelyEmptyUpstreamPayload)(previousOutput) &&
        !(0, upstream_payload_signal_1.isUpstreamNarrativelyThinForRuntimeAi)(previousOutput)
        ? previousOutput
        : undefined) ??
        successfulEntries.reverse()[0]?.[1] ??
        triggerOutput;
    return {
        triggerOutput,
        lastSuccessfulBusinessOutput,
        allAvailableOutputs: allOutputs,
    };
}
/**
 * Map resolved AI value to input schema fields
 */
function mapResolvedValueToSchema(resolvedValue, inputSchema, mode) {
    const mapped = {};
    if (mode === 'message') {
        const messageField = pickPrimaryMessageLikeField(inputSchema);
        if (messageField) {
            mapped[messageField] = resolvedValue;
        }
        else {
            // Use first required field or first field
            const firstField = Object.keys(inputSchema)[0];
            if (firstField) {
                mapped[firstField] = resolvedValue;
            }
        }
    }
    else if (mode === 'message+json') {
        // For message+json mode, map message and data fields
        if (typeof resolvedValue === 'object' && resolvedValue !== null) {
            const messageField = pickPrimaryMessageLikeField(inputSchema);
            if (messageField && resolvedValue.message) {
                mapped[messageField] = resolvedValue.message;
            }
            // Map data fields
            if (resolvedValue.data && typeof resolvedValue.data === 'object') {
                Object.assign(mapped, resolvedValue.data);
            }
        }
    }
    else {
        // For json mode, map all fields from resolved value
        if (typeof resolvedValue === 'object' && resolvedValue !== null) {
            Object.assign(mapped, resolvedValue);
            // If the resolver LLM put wrong/short text in long_body fields but upstream has a richer
            // narrative (from registry outputSchema or longest top-level string), prefer upstream.
            // Must run before title_like backfill from body. No regex / no hardcoded node names.
            const previousForBody = global.lastPreviousOutput;
            const upstreamType = (0, upstream_narrative_text_1.getUpstreamNodeTypeFromExecutionGlobal)();
            const primaryNarrative = (0, upstream_narrative_text_1.pickPrimaryNarrativeStringFromUpstreamOutput)(upstreamType, previousForBody);
            if (primaryNarrative && primaryNarrative.length >= 40) {
                const fp = primaryNarrative.slice(0, Math.min(80, primaryNarrative.length));
                for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
                    const def = fieldDef;
                    const isLongBody = def.role === 'long_body' ||
                        (fieldName.toLowerCase() === 'body' &&
                            (def.type === 'string' || def.type === 'expression'));
                    if (!isLongBody)
                        continue;
                    const cur = mapped[fieldName];
                    if (typeof cur !== 'string')
                        continue;
                    const curTrim = cur.trim();
                    const hasUpstreamFingerprint = fp.length >= 20 && curTrim.includes(fp.slice(0, 20));
                    if (!hasUpstreamFingerprint && primaryNarrative.length > curTrim.length * 1.1) {
                        mapped[fieldName] = primaryNarrative;
                        console.log(`[DynamicExecutor] ✅ Replaced ${fieldName} with registry-derived upstream narrative (resolver text did not match upstream fingerprint)`);
                    }
                }
            }
            // HTTP Request body: prefer registry-derived primary string from upstream, then from resolved object.
            if (inputSchema.body && !mapped.body) {
                const previousOutput = global.lastPreviousOutput;
                const uType = (0, upstream_narrative_text_1.getUpstreamNodeTypeFromExecutionGlobal)();
                const fromUpstream = (0, upstream_narrative_text_1.pickPrimaryNarrativeStringFromUpstreamOutput)(uType, previousOutput);
                if (fromUpstream) {
                    mapped.body = { message: fromUpstream };
                    console.log('[DynamicExecutor] ✅ Mapped primary upstream narrative to HTTP Request body');
                }
                else if (typeof resolvedValue === 'object' && resolvedValue !== null) {
                    const fromResolved = (0, upstream_narrative_text_1.pickPrimaryNarrativeStringFromUpstreamOutput)(undefined, resolvedValue);
                    if (fromResolved) {
                        mapped.body = { message: fromResolved };
                        console.log('[DynamicExecutor] ✅ Mapped primary string from resolved value to HTTP Request body');
                    }
                    else if (resolvedValue.body) {
                        mapped.body = resolvedValue.body;
                    }
                }
                if (!mapped.body && previousOutput && typeof previousOutput === 'object') {
                    mapped.body = previousOutput;
                    console.log('[DynamicExecutor] ✅ Using entire previous output as HTTP Request body');
                }
            }
            // Registry-driven: fill empty title_like from first line of a mapped long_body / text sibling (json mode).
            const titleLikeFields = Object.keys(inputSchema).filter((f) => {
                const def = inputSchema[f];
                return def?.role === 'title_like';
            });
            const bodyLikeFields = Object.keys(inputSchema).filter((f) => {
                const def = inputSchema[f];
                const fl = f.toLowerCase();
                return (def?.role === 'long_body' ||
                    fl.includes('body') ||
                    fl.includes('message') ||
                    fl.includes('text') ||
                    fl.includes('content'));
            });
            for (const tf of titleLikeFields) {
                const tv = mapped[tf];
                if (typeof tv === 'string' && tv.trim().length > 0)
                    continue;
                for (const bf of bodyLikeFields) {
                    const bv = mapped[bf];
                    if (typeof bv === 'string' && bv.trim().length > 0) {
                        const firstLine = bv.split(/\r?\n/)[0].trim().slice(0, 100);
                        if (firstLine)
                            mapped[tf] = firstLine;
                        break;
                    }
                }
            }
        }
    }
    // Fill in any missing required fields with defaults
    for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
        const field = fieldDef;
        if (!(fieldName in mapped)) {
            if (field.required && field.default !== undefined) {
                mapped[fieldName] = field.default;
            }
        }
    }
    return mapped;
}
/**
 * Fallback: Resolve inputs from config (backward compatibility)
 */
function resolveInputsFromConfig(inputSchema, config, nodeOutputs) {
    const resolved = {};
    // For each field in input schema, resolve from config
    for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
        const field = fieldDef;
        const configValue = config[fieldName];
        if (configValue === undefined || configValue === null) {
            // Use default if available
            if (field.default !== undefined) {
                resolved[fieldName] = field.default;
            }
            continue;
        }
        // If it's a template expression, resolve it (legacy support)
        if (typeof configValue === 'string' && configValue.includes('{{')) {
            resolved[fieldName] = resolveTemplateExpression(configValue, nodeOutputs);
        }
        else {
            resolved[fieldName] = configValue;
        }
    }
    return resolved;
}
/**
 * Resolve input values from upstream nodes using template expressions (LEGACY - kept for fallback)
 */
function resolveInputsFromUpstream(inputSchema, config, nodeOutputs, currentNodeId) {
    return resolveInputsFromConfig(inputSchema, config, nodeOutputs);
}
/**
 * Resolve template expression like {{$json.field}} or {{$json.items[].Column}}
 *
 * ✅ CORE ARCHITECTURE: Uses universal template resolver
 * This ensures consistent template resolution across ALL nodes
 */
function resolveTemplateExpression(template, nodeOutputs) {
    // ✅ Use universal template resolver (single source of truth)
    const { resolveUniversalTemplate } = require('../utils/universal-template-resolver');
    return resolveUniversalTemplate(template, nodeOutputs);
}
/**
 * Get nested value from object using dot notation or array access
 */
function getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        // Handle array access: items[].Column
        if (part.includes('[]')) {
            const [arrayKey, ...rest] = part.split('[]');
            if (Array.isArray(current[arrayKey])) {
                // For array access, return the array itself (filtering handled separately)
                current = current[arrayKey];
                if (rest.length > 0) {
                    // Continue with remaining path on first element
                    const remainingPath = rest.join('[]') + parts.slice(parts.indexOf(part) + 1).join('.');
                    if (current.length > 0) {
                        return getNestedValue(current[0], remainingPath);
                    }
                }
                return current;
            }
        }
        else {
            current = current[part];
        }
    }
    return current;
}
/**
 * Validate output against output schema
 */
function validateOutputAgainstSchema(output, outputSchema) {
    const warnings = [];
    if (!outputSchema || typeof outputSchema !== 'object') {
        return { valid: true }; // No schema to validate against
    }
    const defaultPort = outputSchema.default;
    if (!defaultPort || typeof defaultPort !== 'object') {
        return { valid: true }; // No default port schema
    }
    const expectedType = defaultPort.schema?.type;
    if (!expectedType) {
        return { valid: true }; // No type in schema
    }
    const actualType = output === null ? 'null' : Array.isArray(output) ? 'array' : typeof output;
    if (expectedType === 'object' &&
        (actualType !== 'object' || output === null || Array.isArray(output))) {
        warnings.push(`Expected object output, got ${actualType}`);
    }
    else if (expectedType === 'array' && !Array.isArray(output)) {
        warnings.push(`Expected array output, got ${actualType}`);
    }
    return {
        valid: warnings.length === 0,
        warnings: warnings.length > 0 ? warnings : undefined,
    };
}
