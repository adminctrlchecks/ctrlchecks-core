"use strict";
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
exports.executeViaLegacyExecutor = executeViaLegacyExecutor;
const system_key_filter_1 = require("../execution/system-key-filter");
function isEmptyCredentialValue(value) {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}
function parseStoredCredential(value) {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}'))
        return null;
    try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
function pickScalarCredentialField(contractType) {
    if (contractType === 'webhook')
        return 'webhookUrl';
    if (contractType === 'oauth')
        return 'accessToken';
    if (contractType === 'token')
        return 'token';
    return 'apiKey';
}
async function injectDashboardCredential(context, config) {
    const userIdsToTry = [];
    if (context.userId)
        userIdsToTry.push(context.userId);
    if (context.currentUserId && context.currentUserId !== context.userId)
        userIdsToTry.push(context.currentUserId);
    if (userIdsToTry.length === 0)
        return config;
    const { connectorRegistry } = await Promise.resolve().then(() => __importStar(require('../../services/connectors/connector-registry')));
    const connector = connectorRegistry.getConnectorByNodeType(context.nodeType);
    if (!connector?.credentialContract?.vaultKey)
        return config;
    const { retrieveCredential } = await Promise.resolve().then(() => __importStar(require('../utils/credential-retriever')));
    let stored = null;
    for (const uid of userIdsToTry) {
        stored = await retrieveCredential({
            userId: uid,
            workflowId: context.workflowId,
            nodeId: context.nodeId,
            nodeType: context.nodeType,
        }, connector.credentialContract.vaultKey);
        if (stored)
            break;
    }
    if (!stored)
        return config;
    const nextConfig = { ...config };
    const parsed = parseStoredCredential(stored);
    if (parsed) {
        for (const [key, value] of Object.entries(parsed)) {
            if (!isEmptyCredentialValue(value) && isEmptyCredentialValue(nextConfig[key])) {
                nextConfig[key] = value;
            }
        }
    }
    const fieldName = connector.credentialContract.credentialFieldName || pickScalarCredentialField(connector.credentialContract.type);
    if (isEmptyCredentialValue(nextConfig[fieldName])) {
        const candidate = parsed
            ? parsed[fieldName] ||
                parsed.apiKey ||
                parsed.apiToken ||
                parsed.accessToken ||
                parsed.webhookUrl ||
                parsed.token ||
                parsed.value
            : stored;
        if (!isEmptyCredentialValue(candidate)) {
            nextConfig[fieldName] = candidate;
        }
    }
    return nextConfig;
}
/**
 * Execute a node via the legacy executor, but with the unified runtime guarantees:
 * - Universal template resolution
 * - Placeholder filtering
 * - Deterministic merge of resolved inputs into config (inputs as fallback only)
 * - Output cleaned from config values
 *
 * Node-specific behavior MUST be implemented via overrides (hooks or execute replacement).
 */
async function executeViaLegacyExecutor(args) {
    const { context, schema, hooks } = args;
    try {
        // Import legacy executor directly (bypasses dynamic executor to avoid loop).
        const { executeNodeLegacy } = await Promise.resolve().then(() => __importStar(require('../../api/execute-workflow')));
        // Create nodeOutputs cache from upstream outputs.
        // Strip system/audit keys universally so NO override's beforeExecute hook can
        // accidentally merge observability metadata into downstream business data.
        const { LRUNodeOutputsCache } = await Promise.resolve().then(() => __importStar(require('../cache/lru-node-outputs-cache')));
        const nodeOutputs = new LRUNodeOutputsCache(100, false);
        context.upstreamOutputs.forEach((output, nodeId) => {
            const clean = typeof output === 'object' && output !== null && !Array.isArray(output)
                ? (0, system_key_filter_1.stripSystemKeys)(output)
                : output;
            nodeOutputs.set(nodeId, clean, true);
        });
        // Store rawInput as 'input'/'$json'/'json' for template resolution.
        // Strip system keys here so ALL legacy-path nodes get clean upstream context
        // without needing to do it individually in their own beforeExecute hooks.
        if (context.rawInput !== undefined && context.rawInput !== null) {
            const cleanRaw = typeof context.rawInput === 'object' && !Array.isArray(context.rawInput)
                ? (0, system_key_filter_1.stripSystemKeys)(context.rawInput)
                : context.rawInput;
            nodeOutputs.set('input', cleanRaw, true);
            nodeOutputs.set('$json', cleanRaw, true);
            nodeOutputs.set('json', cleanRaw, true);
        }
        // Universal template resolution (single source of truth)
        const { resolveConfigTemplates } = await Promise.resolve().then(() => __importStar(require('../utils/universal-template-resolver')));
        const resolvedConfig = resolveConfigTemplates(context.config || {}, nodeOutputs, context.nodeType);
        // Placeholder filtering (single source of truth)
        const { filterPlaceholderValues, cleanOutputFromConfig } = await Promise.resolve().then(() => __importStar(require('../utils/placeholder-filter')));
        const filteredConfig = filterPlaceholderValues(resolvedConfig);
        // Merge resolved inputs into config.
        // Runtime-owned fields must override config; static fields keep config precedence.
        const filteredBaseConfig = filterPlaceholderValues(context.config || {});
        const mergedConfig = { ...filteredBaseConfig, ...filteredConfig };
        const inputSources = context && typeof context.resolvedInputSources === 'object'
            ? context.resolvedInputSources
            : {};
        const finalResolvedInputs = (context.finalResolvedInputs || context.inputs || {});
        for (const [fieldName, value] of Object.entries(finalResolvedInputs)) {
            if (inputSources[fieldName] === 'runtime_ai' ||
                inputSources[fieldName] === 'field_directive_ai' ||
                inputSources[fieldName] === 'deterministic_runtime') {
                mergedConfig[fieldName] = value;
                continue;
            }
            const current = mergedConfig[fieldName];
            const isEmptyCurrent = current === undefined ||
                current === null ||
                (typeof current === 'string' && current.trim() === '');
            if (isEmptyCurrent) {
                mergedConfig[fieldName] = value;
            }
        }
        // Default execution input is resolved inputs
        let prepared = {
            nodeOutputs,
            resolvedConfig,
            filteredBaseConfig,
            filteredConfig,
            mergedConfig,
            executionInput: finalResolvedInputs,
        };
        if (hooks?.beforeExecute) {
            const patch = await hooks.beforeExecute(prepared);
            if (patch && typeof patch === 'object') {
                prepared = { ...prepared, ...patch };
            }
        }
        prepared = {
            ...prepared,
            mergedConfig: await injectDashboardCredential(context, prepared.mergedConfig),
        };
        // Convert context to legacy node shape
        const node = {
            id: context.nodeId,
            type: context.nodeType,
            data: {
                label: context.nodeType,
                type: context.nodeType,
                category: schema.category,
                config: prepared.mergedConfig,
            },
        };
        const output = await executeNodeLegacy(node, prepared.executionInput, nodeOutputs, context.db, context.workflowId, context.userId, context.currentUserId);
        const cleanedOutput = cleanOutputFromConfig(output, prepared.filteredConfig);
        return { success: true, output: cleanedOutput };
    }
    catch (error) {
        return {
            success: false,
            error: {
                code: 'EXECUTION_ERROR',
                message: error?.message || 'Node execution failed',
                details: error,
            },
        };
    }
}
