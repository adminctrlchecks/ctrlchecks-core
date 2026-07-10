"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEdgeReasoningJsonRemote = runEdgeReasoningJsonRemote;
exports.runEdgeReasoningStageRemote = runEdgeReasoningStageRemote;
const AI_GENERATOR_URL = process.env.AI_GENERATOR_URL?.replace(/\/$/, '');
/**
 * Delegates only the edge-reasoning LLM call, JSON parsing, and cycle-detection retry
 * to the ai-generator service. Returns null when AI_GENERATOR_URL is unset or the
 * remote call fails, so callers can fall back to the local LLM path.
 *
 * The worker keeps: prompt building, WorkflowNode construction (real registry),
 * seeded edge construction, graph orchestrator initialization, switch-case extraction,
 * and branch coverage logic.
 */
async function runEdgeReasoningJsonRemote(params) {
    if (!AI_GENERATOR_URL)
        return null;
    try {
        const serviceKey = process.env.AI_GENERATOR_SERVICE_KEY ?? '';
        const res = await fetch(`${AI_GENERATOR_URL}/generate/edge-reasoning-json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(serviceKey ? { 'x-service-key': serviceKey } : {}),
            },
            body: JSON.stringify(params),
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
            console.warn(`[edge-reasoning-stage-client] ai-generator returned ${res.status} - falling back to local`);
            return null;
        }
        return res.json();
    }
    catch (err) {
        console.warn('[edge-reasoning-stage-client] remote call failed - falling back to local:', err);
        return null;
    }
}
// ─── Full Stage Remote (Day 42) ───────────────────────────────────────────────
/**
 * Delegates the full edge-reasoning stage (LLM call + JSON parsing + cycle detection +
 * partial materialization) to the ai-generator service. Returns null when
 * AI_GENERATOR_URL is unset or the remote call fails, so callers can fall back to the
 * JSON-only remote or local LLM path.
 *
 * The worker uses orderedNodeIds + edges from the result to re-materialize the
 * workflow with the real registry (defaultConfig, port resolution, etc.).
 */
async function runEdgeReasoningStageRemote(params) {
    if (!AI_GENERATOR_URL)
        return null;
    try {
        const serviceKey = process.env.AI_GENERATOR_SERVICE_KEY ?? '';
        const res = await fetch(`${AI_GENERATOR_URL}/generate/edge-reasoning`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(serviceKey ? { 'x-service-key': serviceKey } : {}),
            },
            body: JSON.stringify(params),
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
            console.warn(`[edge-reasoning-stage-client] ai-generator /edge-reasoning returned ${res.status} - falling back`);
            return null;
        }
        return res.json();
    }
    catch (err) {
        console.warn('[edge-reasoning-stage-client] stage remote call failed - falling back:', err);
        return null;
    }
}
