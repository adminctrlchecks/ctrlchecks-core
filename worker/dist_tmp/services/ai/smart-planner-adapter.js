"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planWorkflowSpecFromPrompt = planWorkflowSpecFromPrompt;
const preprocessor_1 = require("../../preprocessor");
const plannerAgent_1 = require("../../planner/plannerAgent");
const specValidator_1 = require("../../validator/specValidator");
/**
 * Thin adapter that lets the legacy workflow builder call the new Smart Planner.
 *
 * - Uses Ollama-based plannerAgent to get a WorkflowSpec.
 * - Validates the spec.
 * - Never throws for planner failures when disabled or unavailable (caller can fall back).
 */
async function planWorkflowSpecFromPrompt(userPrompt) {
    const enabled = process.env.SMART_PLANNER_ENABLED === 'true';
    if (!enabled) {
        return undefined;
    }
    try {
        const cleanPrompt = (0, preprocessor_1.preprocessPrompt)(userPrompt);
        const { spec } = await (0, plannerAgent_1.callPlannerAgent)(cleanPrompt);
        const validated = (0, specValidator_1.validateWorkflowSpec)(spec);
        return validated;
    }
    catch (error) {
        console.error('[SmartPlannerAdapter] Planner failed, falling back to legacy pipeline:', error);
        return undefined;
    }
}
