"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runNodeSelectionJsonRemote = runNodeSelectionJsonRemote;
const AI_GENERATOR_URL = process.env.AI_GENERATOR_URL?.replace(/\/$/, '');
/**
 * Delegates only the node-selection LLM call and JSON parsing to ai-generator.
 * Registry reconciliation, trigger injection, required-node repair, node-id
 * assignment, and capability policy decisions remain in the worker.
 */
async function runNodeSelectionJsonRemote(params) {
    if (!AI_GENERATOR_URL)
        return null;
    try {
        const serviceKey = process.env.AI_GENERATOR_SERVICE_KEY ?? '';
        const res = await fetch(`${AI_GENERATOR_URL}/generate/node-selection-json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(serviceKey ? { 'x-service-key': serviceKey } : {}),
            },
            body: JSON.stringify(params),
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
            console.warn(`[node-selection-stage-client] ai-generator returned ${res.status} - falling back to local`);
            return null;
        }
        return res.json();
    }
    catch (err) {
        console.warn('[node-selection-stage-client] remote call failed - falling back to local:', err);
        return null;
    }
}
