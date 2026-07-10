"use strict";
/**
 * System Key Filter
 *
 * Strips internal observability/metadata keys from upstream payloads before
 * they are used as context for AI resolution or key-alias matching.
 * This prevents audit objects and routing config from leaking into downstream
 * nodes as if they were real business data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROUTING_INTERNAL_KEYS = exports.SYSTEM_META_KEYS = void 0;
exports.stripSystemKeys = stripSystemKeys;
exports.stripRoutingMeta = stripRoutingMeta;
/** Keys that are execution-observability / audit metadata, never user business data. */
exports.SYSTEM_META_KEYS = new Set([
    'nodeId',
    'nodeType',
    'rollout',
    'kpis',
    'runtimeMarker',
    'runtimeFields',
    'runtimeOwnedFields',
    'runtimeResolvedFields',
    'runtimeResolutionErrors',
    'unresolvedRuntimeFields',
    'resolvedRuntimeFields',
    'schemaValidationFailures',
    'canonicalizationIssues',
    'capturedAt',
    'submitted_at',
    'sources',
    'form',
    'meta',
    'files',
    'fields',
    'fallbackPublishRate',
    'unresolvedRuntimeFieldsRate',
    'strictValidation',
    'contractV2',
    'auditOnly',
]);
/** Keys that are switch/if_else routing internals, not user business data. */
exports.ROUTING_INTERNAL_KEYS = new Set([
    'expression',
    'expressionValue',
    'cases',
    'rules',
    'routingType',
    'matchedCase',
    'matchedLabel',
    'condition',
    'condition_result',
    'fallbackApplied',
    'outputFallbackUsed',
    '_switchRecoveredVia',
]);
/**
 * Strip system metadata and `__`-prefixed audit keys from an upstream payload
 * before it is passed to AI resolvers or key-alias matching.
 */
function stripSystemKeys(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj))
        return {};
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
        if (k.startsWith('__'))
            continue;
        if (exports.SYSTEM_META_KEYS.has(k))
            continue;
        result[k] = v;
    }
    return result;
}
/**
 * Strip routing-internal keys from a branching node's upstream payload
 * so downstream nodes only see actual business data in `$json`.
 */
function stripRoutingMeta(obj) {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
        if (!exports.ROUTING_INTERNAL_KEYS.has(k))
            result[k] = v;
    }
    return result;
}
