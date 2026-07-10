"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpstreamNodeTypeFromExecutionGlobal = getUpstreamNodeTypeFromExecutionGlobal;
exports.pickPrimaryNarrativeStringFromUpstreamOutput = pickPrimaryNarrativeStringFromUpstreamOutput;
const unified_node_registry_1 = require("../registry/unified-node-registry");
/**
 * Resolves the upstream workflow node type for the output currently stored as
 * `lastPreviousOutput` (set during AI input resolution).
 */
function getUpstreamNodeTypeFromExecutionGlobal() {
    const id = globalThis.lastPreviousOutputNodeId;
    const map = globalThis.__executionNodeTypeById;
    if (id && map && typeof map[id] === 'string' && map[id].length > 0) {
        return map[id];
    }
    return undefined;
}
function isSchemaStringLikeProperty(spec) {
    if (!spec)
        return false;
    const t = String(spec.type || '').toLowerCase();
    return t === 'string' || t === 'text' || t === 'markdown' || t === 'email' || t === 'datetime';
}
/**
 * Picks the primary user-facing string from an upstream node output using the registry
 * output schema when available; otherwise the longest top-level string on the object.
 * No node-type string matching or regex — driven by declared output properties + values.
 */
function pickPrimaryNarrativeStringFromUpstreamOutput(upstreamNodeType, output) {
    if (output === null || output === undefined || typeof output !== 'object' || Array.isArray(output)) {
        return undefined;
    }
    const obj = output;
    const type = upstreamNodeType?.trim();
    const effective = type && type.length > 0 ? unified_node_registry_1.unifiedNodeRegistry.getEffectiveOutputSchema(type) : undefined;
    const fromDeclared = [];
    if (effective?.properties && Object.keys(effective.properties).length > 0) {
        for (const [key, spec] of Object.entries(effective.properties)) {
            if (!isSchemaStringLikeProperty(spec))
                continue;
            const v = obj[key];
            if (typeof v === 'string' && v.trim().length > 0) {
                fromDeclared.push(v.trim());
            }
        }
    }
    const pool = fromDeclared.length > 0 ? fromDeclared : collectTopLevelStrings(obj);
    if (pool.length === 0)
        return undefined;
    return pool.reduce((a, b) => (a.length >= b.length ? a : b));
}
function collectTopLevelStrings(obj) {
    const out = [];
    for (const v of Object.values(obj)) {
        if (typeof v === 'string' && v.trim().length > 0) {
            out.push(v.trim());
        }
    }
    return out;
}
