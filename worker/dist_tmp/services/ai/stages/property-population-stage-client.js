"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPropertyPopulationJsonRemote = runPropertyPopulationJsonRemote;
const AI_GENERATOR_URL = process.env.AI_GENERATOR_URL?.replace(/\/$/, '');
/**
 * Delegates property-population JSON generation to ai-generator when configured.
 * Registry/default ownership decisions stay in the worker; failures return null
 * so the caller can use the local LLM path and soft-failure safety net.
 */
async function runPropertyPopulationJsonRemote(params) {
    if (!AI_GENERATOR_URL)
        return null;
    try {
        const serviceKey = process.env.AI_GENERATOR_SERVICE_KEY ?? '';
        const res = await fetch(`${AI_GENERATOR_URL}/generate/property-population`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(serviceKey ? { 'x-service-key': serviceKey } : {}),
            },
            body: JSON.stringify(params),
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
            console.warn(`[property-population-stage-client] ai-generator returned ${res.status} - falling back to local`);
            return null;
        }
        return res.json();
    }
    catch (err) {
        console.warn('[property-population-stage-client] remote call failed - falling back to local:', err);
        return null;
    }
}
