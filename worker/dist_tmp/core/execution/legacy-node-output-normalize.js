"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLegacyWrappedNodeOutput = normalizeLegacyWrappedNodeOutput;
/**
 * Legacy execution used to wrap some node results as { data, type }.
 * Unwrap for registry/dynamic paths while incremental migration continues.
 */
function normalizeLegacyWrappedNodeOutput(result) {
    if (result && typeof result === 'object' && 'data' in result && 'type' in result) {
        return result.data;
    }
    return result;
}
