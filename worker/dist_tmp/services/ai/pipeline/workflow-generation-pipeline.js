"use strict";
/**
 * Workflow Generation Pipeline — Single Universal Pipeline
 *
 * This is the ONLY pipeline. No feature flag. No fallback. No dual paths.
 * Replaces AiFirstPipeline as the single entry point for all workflow generation.
 *
 * Four stages:
 *   Stage 1 — Prompt Analysis & Intelligent Node Selection
 *   Stage 2 — Structural Prompt Generation (registry-driven, no LLM)
 *   Stage 3 — Backend Finalization (edge reasoning, validation, property population, manifest)
 *   Stage 4 — UI delivery (returns Stage3Output)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.4, 6.5, 7.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowGenerationPipeline = exports.WorkflowGenerationPipeline = void 0;
const crypto_1 = require("crypto");
const logger_1 = require("../../../core/logger");
const node_catalog_builder_1 = require("../node-catalog-builder");
const intent_stage_1 = require("../stages/intent-stage");
const capability_selection_stage_1 = require("../stages/capability-selection-stage");
const structural_prompt_stage_1 = require("../stages/structural-prompt-stage");
const structural_prompt_stage_client_1 = require("../stages/structural-prompt-stage-client");
const node_selection_stage_1 = require("../stages/node-selection-stage");
const structural_prompt_generator_1 = require("../stages/structural-prompt-generator");
const backend_finalizer_1 = require("./backend-finalizer");
const unified_node_registry_1 = require("../../../core/registry/unified-node-registry");
const stage_progress_map_1 = require("../stage-progress-map");
const workflow_build_manifest_utils_1 = require("../../../core/utils/workflow-build-manifest-utils");
class WorkflowGenerationPipeline {
    async run(input) {
        const correlationId = input.correlationId ?? (0, crypto_1.randomUUID)();
        const stageTrace = [];
        logger_1.logger.info({
            event: 'workflow_generation_pipeline_start',
            correlationId,
            promptLen: input.userPrompt.length,
        });
        try {
            const nodeCatalog = (0, node_catalog_builder_1.buildNodeCatalogText)();
            // ── Stage 1a: Intent ─────────────────────────────────────────────────
            const intentStart = Date.now();
            const intentResult = await (0, intent_stage_1.runIntentStage)(input.userPrompt, nodeCatalog, correlationId);
            stageTrace.push({
                stage: 'intent',
                startedAt: intentStart,
                completedAt: Date.now(),
                durationMs: intentResult.durationMs,
                inputSummary: `prompt_len=${input.userPrompt.length}`,
                outputSummary: intentResult.ok ? `actions=${intentResult.intent.actions.length}` : 'failed',
                llmCall: intentResult.ok ? intentResult.llmCall : undefined,
                error: intentResult.ok ? undefined : intentResult.code,
            });
            try {
                input.onStageComplete?.('intent', (0, stage_progress_map_1.getStageProgress)('intent'), stage_progress_map_1.STAGE_LOG_LABELS['intent'] ?? 'intent');
            }
            catch (_) { }
            if (!intentResult.ok) {
                return this.error('INTENT_FAILED', `Intent stage failed: ${intentResult.code}`, stageTrace, correlationId);
            }
            // ── Stage 1b: Capability Selection ───────────────────────────────────
            const csStart = Date.now();
            const csResult = await (0, capability_selection_stage_1.runCapabilitySelectionStage)(intentResult.intent, correlationId);
            stageTrace.push({
                stage: 'capability_selection',
                startedAt: csStart,
                completedAt: Date.now(),
                durationMs: csResult.durationMs,
                inputSummary: `actions=${intentResult.intent.actions.length}`,
                outputSummary: csResult.ok ? `steps=${csResult.steps.length}` : 'failed',
                error: csResult.ok ? undefined : csResult.code,
            });
            try {
                input.onStageComplete?.('capability_selection', (0, stage_progress_map_1.getStageProgress)('capability_selection'), stage_progress_map_1.STAGE_LOG_LABELS['capability_selection'] ?? 'capability_selection');
            }
            catch (_) { }
            if (!csResult.ok) {
                return this.error('CAPABILITY_SELECTION_FAILED', `Capability selection failed: ${csResult.code}`, stageTrace, correlationId);
            }
            // Resolve applied capability selections
            const appliedSelections = this.resolveCapabilitySelections(csResult.steps, input.capabilitySelectionsByStep);
            // Capability selection is decisive by default. The analyze endpoint can
            // still render candidate containers, but workflow generation should keep
            // moving with registry-backed defaults instead of stopping for user choice.
            const ambiguousSteps = csResult.steps.filter((s) => s.candidateNodeTypes.length > 1 ||
                s.ambiguous === true ||
                (typeof s.confidence === 'number' && s.confidence < 0.75));
            if (ambiguousSteps.length > 0 && !input.capabilitySelectionsByStep) {
                logger_1.logger.info({
                    event: 'workflow_generation_pipeline_auto_resolved_capability_selection',
                    correlationId,
                    ambiguousSteps: ambiguousSteps.length,
                });
            }
            // ── Stage 1c: Structural Prompt (Gemini) ──────────────────────────────
            const missingRequiredSelection = csResult.steps.find((step) => step.selectionPolicy?.required !== false &&
                !(appliedSelections.byStep[step.stepId]?.length > 0));
            if (missingRequiredSelection) {
                return this.error('CAPABILITY_SELECTION_FAILED', `Required capability step "${missingRequiredSelection.stepId}" has no selected registry node`, stageTrace, correlationId);
            }
            const spStart = Date.now();
            const structuralPromptConstraints = {
                selectedNodeConstraintsByStep: appliedSelections.byStep,
                selectedNodeConstraintsFlat: appliedSelections.flat,
            };
            const spResult = (await (0, structural_prompt_stage_client_1.runStructuralPromptStageRemote)(intentResult.intent, nodeCatalog, correlationId, structuralPromptConstraints)) ??
                await (0, structural_prompt_stage_1.runStructuralPromptStage)(intentResult.intent, nodeCatalog, correlationId, structuralPromptConstraints);
            stageTrace.push({
                stage: 'structural_prompt',
                startedAt: spStart,
                completedAt: Date.now(),
                durationMs: spResult.durationMs,
                inputSummary: `actions=${intentResult.intent.actions.length}`,
                outputSummary: spResult.ok ? `len=${spResult.structuralPrompt.length}` : 'failed',
                llmCall: spResult.ok ? spResult.llmCall : undefined,
                error: spResult.ok ? undefined : spResult.code,
            });
            try {
                input.onStageComplete?.('structural_prompt', (0, stage_progress_map_1.getStageProgress)('structural_prompt'), stage_progress_map_1.STAGE_LOG_LABELS['structural_prompt'] ?? 'structural_prompt');
            }
            catch (_) { }
            // Degrade gracefully on structural prompt failure — use intent string
            const rawStructuralPrompt = spResult.ok
                ? spResult.structuralPrompt
                : intentResult.intent.intent;
            // ── Stage 1d: Node Selection (Gemini) ─────────────────────────────────
            const nsStart = Date.now();
            const nodeSelectionConstraints = {
                selectedNodeConstraintsByStep: appliedSelections.byStep,
                selectedNodeConstraintsFlat: appliedSelections.flat,
                requiredNodeTypes: appliedSelections.flat,
            };
            const nsResult = await (0, node_selection_stage_1.runNodeSelectionStage)(intentResult.intent, nodeCatalog, correlationId, rawStructuralPrompt, nodeSelectionConstraints);
            stageTrace.push({
                stage: 'node_selection',
                startedAt: nsStart,
                completedAt: Date.now(),
                durationMs: nsResult.durationMs,
                inputSummary: `actions=${intentResult.intent.actions.length}`,
                outputSummary: nsResult.ok ? `selectedNodes=${nsResult.selectedNodes.length}` : 'failed',
                llmCall: nsResult.ok ? nsResult.llmCall : undefined,
                error: nsResult.ok ? undefined : nsResult.code,
            });
            try {
                input.onStageComplete?.('node_selection', (0, stage_progress_map_1.getStageProgress)('node_selection'), stage_progress_map_1.STAGE_LOG_LABELS['node_selection'] ?? 'node_selection');
            }
            catch (_) { }
            if (!nsResult.ok) {
                return this.error(nsResult.code, `Node selection failed: ${nsResult.code}`, stageTrace, correlationId);
            }
            let selectedForGraph = nsResult.selectedNodes;
            // Apply mandatory node type filter
            if (input.mandatoryNodeTypes && input.mandatoryNodeTypes.length > 0) {
                const filtered = (0, workflow_build_manifest_utils_1.applyMandatoryNodeFilterToSelection)(selectedForGraph, input.mandatoryNodeTypes);
                if ('error' in filtered) {
                    return this.error('NO_VALID_NODES', 'Mandatory node types could not be satisfied', stageTrace, correlationId);
                }
                selectedForGraph = filtered;
            }
            // ── Stage 2: Structural Prompt Generation (registry-driven) ──────────
            // StructuralPromptGenerator produces the human-readable, non-repetitive structural prompt
            // with proper branching descriptions, numbered steps, and case-aware routing.
            // This is the PRIMARY generator — Gemini's rawStructuralPrompt is only a fallback.
            const spgStart = Date.now();
            const generator = new structural_prompt_generator_1.StructuralPromptGenerator();
            const structuralPromptObj = generator.generate({
                resolvedNodes: selectedForGraph,
                structuredIntent: intentResult.intent,
                capabilitySelections: appliedSelections.byStep,
            });
            stageTrace.push({
                stage: 'structural_prompt_generator',
                startedAt: spgStart,
                completedAt: Date.now(),
                durationMs: Date.now() - spgStart,
                inputSummary: `nodes=${selectedForGraph.length}`,
                outputSummary: `text_len=${structuralPromptObj.text.length},steps=${structuralPromptObj.steps.length}`,
            });
            // Use the registry-generated structural prompt as the confirmed blueprint.
            // Fall back to Gemini's rawStructuralPrompt only if generator produces nothing.
            const confirmedStructuralPrompt = structuralPromptObj.text || rawStructuralPrompt;
            // ── Stage 3: Backend Finalization ─────────────────────────────────────
            const finalizer = new backend_finalizer_1.BackendFinalizer();
            const finalizerResult = await finalizer.finalize({
                selectedNodes: selectedForGraph,
                structuralPrompt: confirmedStructuralPrompt,
                userIntent: intentResult.intent.intent,
                structuredIntent: intentResult.intent,
                correlationId,
                userId: input.userId,
                userPrompt: input.userPrompt,
                onStageComplete: input.onStageComplete,
            });
            // Merge finalizer stageTrace into pipeline stageTrace
            if (finalizerResult.stageTrace) {
                stageTrace.push(...finalizerResult.stageTrace);
            }
            if (!finalizerResult.ok) {
                return {
                    ...finalizerResult,
                    stageTrace,
                };
            }
            // Apply existing workflow config merge (continuation requests)
            let finalWorkflow = finalizerResult.workflow;
            if (input.existingWorkflow?.nodes?.length) {
                finalWorkflow = this.mergeExistingWorkflowConfig(finalWorkflow, input.existingWorkflow);
            }
            logger_1.logger.info({
                event: 'workflow_generation_pipeline_complete',
                correlationId,
                nodes: finalWorkflow.nodes.length,
                edges: finalWorkflow.edges.length,
            });
            return {
                ok: true,
                workflow: finalWorkflow,
                buildManifest: finalizerResult.buildManifest,
                fieldOwnershipMap: finalizerResult.fieldOwnershipMap,
                fieldOwnershipPolicyMap: finalizerResult.fieldOwnershipPolicyMap,
                validationIssues: finalizerResult.validationIssues,
                stageTrace,
            };
        }
        catch (err) {
            logger_1.logger.error({
                event: 'workflow_generation_pipeline_error',
                correlationId,
                error: err instanceof Error ? err.message : String(err),
            });
            return this.error('INVALID_LLM_RESPONSE', `Pipeline error: ${err instanceof Error ? err.message : String(err)}`, stageTrace, correlationId);
        }
    }
    // ─── Private helpers ────────────────────────────────────────────────────────
    error(code, message, stageTrace, correlationId) {
        return { ok: false, error: code, message, stageTrace, correlationId };
    }
    resolveCapabilitySelections(steps, userSelections) {
        const byStep = {};
        const flat = [];
        for (const step of steps) {
            const userPicked = userSelections?.[step.stepId];
            if (userPicked && userPicked.length > 0) {
                byStep[step.stepId] = userPicked;
                flat.push(...userPicked);
            }
            else if (step.candidateNodeTypes.length === 1) {
                // Confident single candidate — auto-resolve
                byStep[step.stepId] = [step.candidateNodeTypes[0]];
                flat.push(step.candidateNodeTypes[0]);
            }
            else if (step.defaultSuggestedNodeType) {
                // Use default suggestion when no user selection
                byStep[step.stepId] = [step.defaultSuggestedNodeType];
                flat.push(step.defaultSuggestedNodeType);
            }
        }
        // For branching types, preserve count (multiple instances needed for nested workflows).
        // For non-branching types, deduplicate.
        const branchingFlat = [];
        const nonBranchingFlat = [];
        for (const type of flat) {
            const def = unified_node_registry_1.unifiedNodeRegistry.get(type);
            if (def?.isBranching === true) {
                branchingFlat.push(type);
            }
            else {
                nonBranchingFlat.push(type);
            }
        }
        return { byStep, flat: [...branchingFlat, ...new Set(nonBranchingFlat)] };
    }
    /**
     * Merge non-empty config values from existing workflow nodes into generated workflow.
     * Preserves AI-assigned values from prior generations (continuation requests).
     */
    mergeExistingWorkflowConfig(generated, existing) {
        const existingByType = new Map();
        const existingById = new Map();
        for (const node of existing.nodes) {
            const type = node.data?.type || node.type;
            if (type)
                existingByType.set(type, node);
            if (node.id)
                existingById.set(node.id, node);
        }
        const mergedNodes = generated.nodes.map((genNode) => {
            const type = genNode.data?.type || genNode.type;
            const existingNode = existingById.get(genNode.id) || existingByType.get(type);
            if (!existingNode)
                return genNode;
            const existingConfig = existingNode.data?.config || {};
            const generatedConfig = { ...(genNode.data?.config || {}) };
            let merged = false;
            for (const [field, value] of Object.entries(existingConfig)) {
                if (value !== null && value !== undefined && value !== '') {
                    generatedConfig[field] = value;
                    merged = true;
                }
            }
            if (!merged)
                return genNode;
            return { ...genNode, data: { ...genNode.data, config: generatedConfig } };
        });
        return { ...generated, nodes: mergedNodes };
    }
}
exports.WorkflowGenerationPipeline = WorkflowGenerationPipeline;
// Singleton export for convenience
exports.workflowGenerationPipeline = new WorkflowGenerationPipeline();
