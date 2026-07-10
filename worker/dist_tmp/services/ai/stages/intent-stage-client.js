"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runIntentStageRemote = runIntentStageRemote;
const AI_GENERATOR_URL = process.env.AI_GENERATOR_URL?.replace(/\/$/, '');
/**
 * Delegates intent analysis to the ai-generator service when AI_GENERATOR_URL is set.
 * Returns null if the env var is absent or the remote call fails, so callers can
 * fall back to running the stage in-process.
 */
async function runIntentStageRemote(userPrompt, catalog, correlationId) {
    if (!AI_GENERATOR_URL)
        return null;
    try {
        const serviceKey = process.env.AI_GENERATOR_SERVICE_KEY ?? '';
        const res = await fetch(`${AI_GENERATOR_URL}/generate/intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(serviceKey ? { 'x-service-key': serviceKey } : {}),
            },
            body: JSON.stringify({ prompt: userPrompt, catalog, correlationId }),
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
            console.warn(`[intent-stage-client] ai-generator returned ${res.status} — falling back to local`);
            return null;
        }
        return res.json();
    }
    catch (err) {
        console.warn('[intent-stage-client] remote call failed — falling back to local:', err);
        return null;
    }
}
