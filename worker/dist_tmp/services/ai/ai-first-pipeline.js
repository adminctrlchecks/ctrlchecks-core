"use strict";
/**
 * AI-First Pipeline — DEPRECATED
 *
 * @deprecated Use WorkflowGenerationPipeline from './pipeline/workflow-generation-pipeline' instead.
 * This file is kept for backward compatibility with existing tests and imports.
 * AiFirstPipeline is now a type alias for WorkflowGenerationPipeline.
 *
 * The actual implementation lives in:
 *   worker/src/services/ai/pipeline/workflow-generation-pipeline.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiFirstPipeline = exports.AiFirstPipeline = void 0;
exports.attachCanonicalPipelineMetadata = attachCanonicalPipelineMetadata;
const crypto_1 = require("crypto");
const logger_1 = require("../../core/logger");
const node_catalog_builder_1 = require("./node-catalog-builder");
const intent_stage_1 = require("./stages/intent-stage");
const capability_selection_stage_1 = require("./stages/capability-selection-stage");
const structural_prompt_stage_1 = require("./stages/structural-prompt-stage");
const node_selection_stage_1 = require("./stages/node-selection-stage");
const edge_reasoning_stage_1 = require("./stages/edge-reasoning-stage");
const validation_stage_1 = require("./stages/validation-stage");
const property_population_stage_1 = require("./stages/property-population-stage");
const credential_discovery_stage_1 = require("./stages/credential-discovery-stage");
const field_ownership_stage_1 = require("./stages/field-ownership-stage");
const plan_driven_workflow_builder_1 = require("./plan-driven-workflow-builder");
const workflow_build_manifest_1 = require("../../core/types/workflow-build-manifest");
const workflow_build_manifest_utils_1 = require("../../core/utils/workflow-build-manifest-utils");
const stage_progress_map_1 = require("./stage-progress-map");
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const STRUCTURAL_BLUEPRINT_MAX_LEN = 4000;
/**
 * Canonical build-time metadata for save / attach-inputs / resolveWorkflowRuntimeIntent.
 * Does not mutate nodes or edges.
 */
function attachCanonicalPipelineMetadata(workflow, args) {
    const prev = workflow.metadata && typeof workflow.metadata === 'object' && !Array.isArray(workflow.metadata)
        ? workflow.metadata
        : {};
    const sp = args.structuralPrompt;
    const structuralBlueprintSummary = sp.length > STRUCTURAL_BLUEPRINT_MAX_LEN ? `${sp.slice(0, STRUCTURAL_BLUEPRINT_MAX_LEN)}…` : sp;
    return {
        ...workflow,
        metadata: {
            ...prev,
            originalUserPrompt: args.userPrompt.trim(),
            structuralBlueprintSummary,
            aiPipelineCorrelationId: args.correlationId,
            timestamp: (typeof prev.timestamp === 'string' && prev.timestamp ? prev.timestamp : new Date().toISOString()),
            ...(args.buildManifest ? { buildManifest: args.buildManifest } : {}),
        },
    };
}
// ─── AiFirstPipeline ─────────────────────────────────────────────────────────
class AiFirstPipeline {
    constructor(deps = {}) {
        this.nodeCatalogOptions = deps.nodeCatalogOptions ?? {
            tokenBudget: 32000,
            priorityOrder: ['trigger', 'logic', 'data', 'ai', 'communication', 'transformation', 'utility'],
        };
    }
    async run(input) {
        const correlationId = input.correlationId ?? (0, crypto_1.randomUUID)();
        const stageTrace = [];
        try {
            const nodeCatalog = (0, node_catalog_builder_1.buildNodeCatalogText)(this.nodeCatalogOptions);
            logger_1.logger.info({ event: 'ai_pipeline_start', correlationId, promptLen: input.userPrompt.length });
            // ── Stage 1: Intent ────────────────────────────────────────────────────
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
                return { ok: false, code: 'INTENT_FAILED', message: `Intent stage failed: ${intentResult.code}`, stageTrace };
            }
            // ── Stage 2: Capability Selection ──────────────────────────────────────
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
                return { ok: false, code: 'CAPABILITY_SELECTION_FAILED', message: `Capability selection stage failed: ${csResult.code}`, stageTrace };
            }
            const appliedCapabilitySelections = resolveAppliedCapabilitySelections(csResult.steps, input.capabilitySelectionsByStep);
            if (!appliedCapabilitySelections.ok) {
                return {
                    ok: false,
                    code: 'CAPABILITY_SELECTION_FAILED',
                    message: appliedCapabilitySelections.message,
                    stageTrace,
                };
            }
            // ── Stage 3: Structural Prompt ─────────────────────────────────────────
            const spStart = Date.now();
            const spResult = await (0, structural_prompt_stage_1.runStructuralPromptStage)(intentResult.intent, nodeCatalog, correlationId, {
                selectedNodeConstraintsByStep: appliedCapabilitySelections.byStep,
                selectedNodeConstraintsFlat: appliedCapabilitySelections.flat,
            });
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
            if (!spResult.ok) {
                return { ok: false, code: 'STRUCTURAL_PROMPT_FAILED', message: `Structural prompt stage failed: ${spResult.code}`, stageTrace };
            }
            const structuralPrompt = spResult.structuralPrompt;
            // ── Stage 4: Node Selection ────────────────────────────────────────────
            const nsStart = Date.now();
            const nsResult = await (0, node_selection_stage_1.runNodeSelectionStage)(intentResult.intent, nodeCatalog, correlationId, structuralPrompt, {
                selectedNodeConstraintsByStep: appliedCapabilitySelections.byStep,
                selectedNodeConstraintsFlat: appliedCapabilitySelections.flat,
                requiredNodeTypes: appliedCapabilitySelections.flat,
            });
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
                return { ok: false, code: nsResult.code, message: `Node selection failed: ${nsResult.code}`, stageTrace };
            }
            let selectedForGraph = nsResult.selectedNodes;
            const mandatory = input.mandatoryNodeTypes;
            if (mandatory && mandatory.length > 0) {
                const filtered = (0, workflow_build_manifest_utils_1.applyMandatoryNodeFilterToSelection)(selectedForGraph, mandatory);
                if (!Array.isArray(filtered)) {
                    return {
                        ok: false,
                        code: 'NO_VALID_NODES',
                        message: 'Mandatory node types could not be satisfied by AI node selection',
                        stageTrace,
                    };
                }
                selectedForGraph = filtered;
            }
            // ✅ UNIVERSAL FIX: Remove nodes not grounded in the user's intent.
            // The intent-stage produces actions as plain strings (e.g. "send email via Gmail").
            // We check each selected node type against the action strings and the user prompt.
            // Nodes whose type cannot be matched to any action or the prompt are removed.
            // This is a lightweight, type-safe filter that doesn't depend on MinimalWorkflowPolicy's
            // incompatible StructuredIntent shape.
            if (selectedForGraph.length > 0) {
                try {
                    const intentActions = Array.isArray(intentResult.intent.actions)
                        ? intentResult.intent.actions.map((a) => String(a).toLowerCase())
                        : [];
                    const promptLower = input.userPrompt.toLowerCase();
                    const triggerType = String(intentResult.intent.triggerType || '').toLowerCase();
                    const filtered = selectedForGraph.filter((sel) => {
                        const nodeType = sel.type.toLowerCase();
                        const nodeDef = require('../../core/registry/unified-node-registry').unifiedNodeRegistry.get(sel.type);
                        const nodeCategory = String(nodeDef?.category || '').toLowerCase();
                        // Always keep trigger nodes
                        if (nodeCategory === 'trigger' || nodeDef?.isTrigger === true)
                            return true;
                        // Always keep if_else / switch (logic nodes) — they implement conditions
                        if (nodeType === 'if_else' || nodeType === 'switch' || nodeCategory === 'logic' || nodeCategory === 'flow')
                            return true;
                        // Always keep merge nodes
                        if (nodeType === 'merge')
                            return true;
                        // Check if node type appears in any action string or the prompt
                        const nodeLabel = String(nodeDef?.label || nodeType).toLowerCase();
                        const nodeAliases = [nodeType, nodeLabel, ...(nodeDef?.tags || []).map((t) => t.toLowerCase())];
                        const matchesAction = intentActions.some((action) => nodeAliases.some((alias) => action.includes(alias) || alias.includes(action.replace(/\s+/g, '_'))));
                        const matchesPrompt = nodeAliases.some((alias) => promptLower.includes(alias.replace(/_/g, ' ')) || promptLower.includes(alias));
                        return matchesAction || matchesPrompt;
                    });
                    if (filtered.length > 0 && filtered.length < selectedForGraph.length) {
                        logger_1.logger.info({
                            event: 'ai_pipeline_intent_filter',
                            correlationId,
                            before: selectedForGraph.length,
                            after: filtered.length,
                            removed: selectedForGraph.length - filtered.length,
                            removedTypes: selectedForGraph.filter((s) => !filtered.includes(s)).map((s) => s.type),
                        });
                        selectedForGraph = filtered;
                    }
                }
                catch (filterErr) {
                    logger_1.logger.warn({ event: 'ai_pipeline_intent_filter_warn', correlationId, error: String(filterErr) });
                }
            }
            // ✅ UTILITY NODE FILTER: Remove utility/logging nodes not explicitly requested by the user.
            // Uses registry-driven isUtilityNode() — no hardcoded type strings.
            if (selectedForGraph.length > 0) {
                try {
                    const { unifiedNodeRegistry: utilityReg } = require('../../core/registry/unified-node-registry');
                    const promptLower = input.userPrompt.toLowerCase();
                    const intentActionsLower = Array.isArray(intentResult.intent.actions)
                        ? intentResult.intent.actions.map((a) => String(a).toLowerCase())
                        : [];
                    const beforeUtilityFilter = selectedForGraph.length;
                    const utilityFiltered = selectedForGraph.filter((sel) => {
                        // Non-utility nodes always pass
                        if (!utilityReg.isUtilityNode(sel.type))
                            return true;
                        // Utility node: only keep if user prompt or intent actions explicitly mention it
                        const nodeDef = utilityReg.get(sel.type);
                        const nodeLabel = String(nodeDef?.label || sel.type).toLowerCase();
                        const nodeType = sel.type.toLowerCase();
                        const aliases = [nodeType, nodeLabel, ...(nodeDef?.tags || []).map((t) => t.toLowerCase())];
                        const mentionedInPrompt = aliases.some((alias) => promptLower.includes(alias.replace(/_/g, ' ')) || promptLower.includes(alias));
                        const mentionedInActions = intentActionsLower.some((action) => aliases.some((alias) => action.includes(alias) || alias.includes(action.replace(/\s+/g, '_'))));
                        return mentionedInPrompt || mentionedInActions;
                    });
                    if (utilityFiltered.length < beforeUtilityFilter) {
                        logger_1.logger.info({
                            event: 'ai_pipeline_utility_filter',
                            correlationId,
                            before: beforeUtilityFilter,
                            after: utilityFiltered.length,
                            removed: beforeUtilityFilter - utilityFiltered.length,
                            removedTypes: selectedForGraph
                                .filter((s) => !utilityFiltered.includes(s))
                                .map((s) => s.type),
                        });
                        selectedForGraph = utilityFiltered;
                    }
                }
                catch (utilityFilterErr) {
                    logger_1.logger.warn({ event: 'ai_pipeline_utility_filter_warn', correlationId, error: String(utilityFilterErr) });
                }
            }
            // ✅ UNIVERSAL FIX: Ensure enough branch targets exist for switch/if_else nodes.
            // The LLM sometimes collapses multiple branches into fewer unique node types.
            // For a switch with N cases, we need N downstream nodes (one per branch).
            // For if_else, we need 2 downstream nodes (true + false).
            try {
                const { randomUUID: uuid } = require('crypto');
                const { unifiedNodeRegistry: reg } = require('../../core/registry/unified-node-registry');
                const branchingNodes = selectedForGraph.filter((sel) => reg.get(sel.type)?.isBranching === true);
                for (const branchNode of branchingNodes) {
                    const nodeDef = reg.get(branchNode.type);
                    // Determine required branch count
                    let requiredBranches = 2; // default for if_else
                    if (branchNode.type === 'switch') {
                        // Can't know cases yet (not populated until property_population), default to 2
                        requiredBranches = 2;
                    }
                    // Count non-trigger, non-branching nodes after this branching node in selection
                    const branchNodeIndex = selectedForGraph.indexOf(branchNode);
                    const downstreamNodes = selectedForGraph.slice(branchNodeIndex + 1).filter((sel) => {
                        const def = reg.get(sel.type);
                        return def?.category !== 'trigger' && def?.isBranching !== true;
                    });
                    // If fewer downstream nodes than required branches, duplicate the last output node
                    if (downstreamNodes.length > 0 && downstreamNodes.length < requiredBranches) {
                        const lastNode = downstreamNodes[downstreamNodes.length - 1];
                        const missing = requiredBranches - downstreamNodes.length;
                        for (let i = 0; i < missing; i++) {
                            selectedForGraph.push({ ...lastNode, nodeId: uuid() });
                        }
                        logger_1.logger.info({
                            event: 'ai_pipeline_branch_pad',
                            correlationId,
                            branchType: branchNode.type,
                            added: missing,
                            duplicatedType: lastNode.type,
                        });
                    }
                }
            }
            catch (padErr) {
                logger_1.logger.warn({ event: 'ai_pipeline_branch_pad_warn', correlationId, error: String(padErr) });
            }
            const useLinearDeterministic = (0, workflow_build_manifest_utils_1.inferLinearBranchingFromSelection)(selectedForGraph);
            // ── Stage 4: Edge Reasoning (deterministic linear OR LLM) ─────────────
            const erStart = Date.now();
            let erResult;
            if (useLinearDeterministic) {
                const chain = (0, workflow_build_manifest_utils_1.linearPlanChainFromSelection)(selectedForGraph);
                const built = (0, plan_driven_workflow_builder_1.buildWorkflowFromPlanChain)(chain, intentResult.intent.intent);
                if (!built.success || !built.workflow) {
                    return {
                        ok: false,
                        code: 'ORCHESTRATOR_VALIDATION_FAILED',
                        message: `Deterministic graph build failed: ${built.errors.join('; ')}`,
                        stageTrace,
                    };
                }
                const linearWf = built.workflow;
                const edges = linearWf.edges.map((e) => ({
                    source: e.source,
                    target: e.target,
                    type: e.type || 'main',
                }));
                const done = Date.now();
                erResult = {
                    ok: true,
                    workflow: linearWf,
                    orderedNodeIds: linearWf.nodes.map((n) => n.id),
                    edges,
                    durationMs: done - erStart,
                    llmCall: {
                        model: 'deterministic_linear',
                        temperature: 0,
                        promptTokens: 0,
                        completionTokens: 0,
                    },
                };
            }
            else {
                erResult = await (0, edge_reasoning_stage_1.runEdgeReasoningStage)(selectedForGraph, nodeCatalog, intentResult.intent.intent, correlationId, structuralPrompt);
            }
            stageTrace.push({
                stage: 'edge_reasoning',
                startedAt: erStart,
                completedAt: Date.now(),
                durationMs: erResult.durationMs,
                inputSummary: `nodes=${selectedForGraph.length},linear=${useLinearDeterministic}`,
                outputSummary: erResult.ok ? `edges=${erResult.workflow.edges.length}` : 'failed',
                llmCall: erResult.ok ? erResult.llmCall : undefined,
                error: erResult.ok ? undefined : erResult.code,
            });
            try {
                input.onStageComplete?.('edge_reasoning', (0, stage_progress_map_1.getStageProgress)('edge_reasoning'), stage_progress_map_1.STAGE_LOG_LABELS['edge_reasoning'] ?? 'edge_reasoning');
            }
            catch (_) { }
            if (!erResult.ok) {
                return { ok: false, code: erResult.code, message: `Edge reasoning failed: ${erResult.code}`, stageTrace };
            }
            // ── Stage 5: Validation ────────────────────────────────────────────────
            const vsStart = Date.now();
            const vsResult = await (0, validation_stage_1.runValidationStage)(erResult.workflow, nodeCatalog, intentResult.intent.intent, selectedForGraph, erResult.edges, correlationId, structuralPrompt);
            stageTrace.push({
                stage: 'validation',
                startedAt: vsStart,
                completedAt: Date.now(),
                durationMs: vsResult.durationMs,
                inputSummary: `nodes=${erResult.workflow.nodes.length}, edges=${erResult.workflow.edges.length}`,
                outputSummary: vsResult.ok ? `issues=${vsResult.validationIssues.length}` : 'failed',
                llmCall: vsResult.ok ? vsResult.llmCall : undefined,
                error: vsResult.ok ? undefined : vsResult.code,
            });
            try {
                input.onStageComplete?.('validation', (0, stage_progress_map_1.getStageProgress)('validation'), stage_progress_map_1.STAGE_LOG_LABELS['validation'] ?? 'validation');
            }
            catch (_) { }
            if (!vsResult.ok) {
                return {
                    ok: false,
                    code: vsResult.code,
                    message: `Validation failed: ${vsResult.code}`,
                    stageTrace,
                };
            }
            // ── Stage 6: Property Population ──────────────────────────────────────
            const ppStart = Date.now();
            const ppResult = await (0, property_population_stage_1.runPropertyPopulationStage)({
                workflow: vsResult.workflow,
                userIntent: intentResult.intent.intent,
                structuralPrompt,
                correlationId,
            });
            stageTrace.push({
                stage: 'property_population',
                startedAt: ppStart,
                completedAt: Date.now(),
                durationMs: ppResult.durationMs,
                inputSummary: `nodes=${vsResult.workflow.nodes.length}`,
                outputSummary: `populated=${Object.keys(ppResult.propertyPopulationSummary).length} nodes`,
            });
            try {
                input.onStageComplete?.('property_population', (0, stage_progress_map_1.getStageProgress)('property_population'), stage_progress_map_1.STAGE_LOG_LABELS['property_population'] ?? 'property_population');
            }
            catch (_) { }
            // ── Stage 6b: Existing Workflow Config Merge ───────────────────────────
            // When existingWorkflow is provided (continuation request), merge non-empty config
            // field values from existing nodes into the generated workflow. This preserves
            // AI-assigned values from prior generations rather than discarding them.
            let mergedWorkflow = ppResult.workflow;
            if (input.existingWorkflow && input.existingWorkflow.nodes && input.existingWorkflow.nodes.length > 0) {
                const existingNodesByType = new Map();
                const existingNodesById = new Map();
                for (const existingNode of input.existingWorkflow.nodes) {
                    const nodeType = existingNode.data?.type || existingNode.type;
                    if (nodeType)
                        existingNodesByType.set(nodeType, existingNode);
                    if (existingNode.id)
                        existingNodesById.set(existingNode.id, existingNode);
                }
                const mergedNodes = mergedWorkflow.nodes.map((generatedNode) => {
                    const nodeType = generatedNode.data?.type || generatedNode.type;
                    // Match by id first, then by type
                    const existingNode = existingNodesById.get(generatedNode.id) || existingNodesByType.get(nodeType);
                    if (!existingNode)
                        return generatedNode;
                    const existingConfig = existingNode.data?.config || {};
                    const generatedConfig = { ...(generatedNode.data?.config || {}) };
                    let merged = false;
                    for (const [field, value] of Object.entries(existingConfig)) {
                        // Only copy non-empty values from existing workflow (preserve AI-assigned values)
                        if (value !== null && value !== undefined && value !== '') {
                            generatedConfig[field] = value;
                            merged = true;
                        }
                    }
                    if (!merged)
                        return generatedNode;
                    return {
                        ...generatedNode,
                        data: { ...generatedNode.data, config: generatedConfig },
                    };
                });
                mergedWorkflow = { ...mergedWorkflow, nodes: mergedNodes };
                logger_1.logger.info({ event: 'existing_workflow_config_merged', correlationId, mergedNodes: mergedNodes.length });
            }
            // ── Stage 7: Credential Discovery ─────────────────────────────────────
            const cdStart = Date.now();
            const cdResult = await (0, credential_discovery_stage_1.runCredentialDiscoveryStage)(mergedWorkflow, input.userId, correlationId);
            stageTrace.push({
                stage: 'credential_discovery',
                startedAt: cdStart,
                completedAt: Date.now(),
                durationMs: cdResult.durationMs,
                inputSummary: `nodes=${mergedWorkflow.nodes.length}`,
                outputSummary: cdResult.ok
                    ? `required=${cdResult.requiredCredentials.length}, missing=${cdResult.missingCredentials.length}`
                    : 'failed (non-blocking)',
                error: cdResult.ok ? undefined : cdResult.code,
            });
            try {
                input.onStageComplete?.('credential_discovery', (0, stage_progress_map_1.getStageProgress)('credential_discovery'), stage_progress_map_1.STAGE_LOG_LABELS['credential_discovery'] ?? 'credential_discovery');
            }
            catch (_) { }
            // Credential discovery is non-blocking — always continue with empty arrays on failure
            const requiredCredentials = cdResult.ok ? cdResult.requiredCredentials : [];
            const missingCredentials = cdResult.ok ? cdResult.missingCredentials : [];
            // ── Stage 7: Field Ownership ───────────────────────────────────────────
            const foStart = Date.now();
            const foResult = await (0, field_ownership_stage_1.runFieldOwnershipStage)(mergedWorkflow, correlationId);
            stageTrace.push({
                stage: 'field_ownership',
                startedAt: foStart,
                completedAt: Date.now(),
                durationMs: foResult.durationMs,
                inputSummary: `nodes=${mergedWorkflow.nodes.length}`,
                outputSummary: `nodes=${Object.keys(foResult.fieldOwnershipMap).length}`,
            });
            try {
                input.onStageComplete?.('field_ownership', (0, stage_progress_map_1.getStageProgress)('field_ownership'), stage_progress_map_1.STAGE_LOG_LABELS['field_ownership'] ?? 'field_ownership');
            }
            catch (_) { }
            logger_1.logger.info({ event: 'ai_pipeline_complete', correlationId, nodes: mergedWorkflow.nodes.length, edges: mergedWorkflow.edges.length });
            const graphSpec = useLinearDeterministic
                ? {
                    kind: 'deterministic_plan_chain',
                    planChain: (0, workflow_build_manifest_utils_1.linearPlanChainFromSelection)(selectedForGraph),
                }
                : {
                    kind: 'llm_seeded',
                    edgeProposalStored: true,
                    orderedNodeIds: erResult.orderedNodeIds,
                };
            const authorizedNodes = (0, workflow_build_manifest_utils_1.buildAuthorizedEntriesForPipeline)(ppResult.workflow, selectedForGraph, useLinearDeterministic);
            const manifestDraft = {
                version: workflow_build_manifest_1.WORKFLOW_BUILD_MANIFEST_VERSION,
                correlationId,
                createdAt: new Date().toISOString(),
                userPrompt: input.userPrompt.trim(),
                intent: (0, workflow_build_manifest_utils_1.toManifestStructuredIntent)(intentResult.intent),
                structuralBlueprint: structuralPrompt,
                authorizedNodes,
                branchingSpec: {
                    mode: (0, workflow_build_manifest_utils_1.inferLinearBranchingFromSelection)(selectedForGraph) ? 'linear' : 'branching',
                },
                graphSpec,
                hydrationSpec: {
                    populatedNodeIds: Object.keys(ppResult.propertyPopulationSummary),
                    populatedFieldsByNodeId: ppResult.propertyPopulationSummary,
                },
                credentialDiscovery: {
                    requiredCredentialKeys: requiredCredentials
                        .map((c) => String(c.vaultKey || c.provider || '').trim())
                        .filter((k) => k.length > 0),
                },
                fieldOwnershipSnapshot: (0, workflow_build_manifest_utils_1.serializeFieldOwnershipSnapshot)(foResult.fieldOwnershipMap),
            };
            const buildManifest = (0, workflow_build_manifest_utils_1.sealWorkflowBuildManifest)(manifestDraft);
            stageTrace.push({
                stage: 'build_manifest',
                startedAt: Date.now(),
                completedAt: Date.now(),
                durationMs: 0,
                inputSummary: `authorized=${authorizedNodes.length}`,
                outputSummary: `manifestHash=${buildManifest.integrity.contentHash.slice(0, 16)}`,
            });
            const workflowWithMetadata = attachCanonicalPipelineMetadata(mergedWorkflow, {
                userPrompt: input.userPrompt,
                structuralPrompt,
                correlationId,
                buildManifest,
            });
            return {
                ok: true,
                workflow: workflowWithMetadata,
                validationIssues: vsResult.validationIssues,
                stageTrace,
                requiredCredentials,
                missingCredentials,
                fieldOwnershipMap: foResult.fieldOwnershipMap,
                fieldOwnershipPolicyMap: foResult.fieldOwnershipPolicyMap,
                propertyPopulationSummary: ppResult.propertyPopulationSummary,
                capabilityOptions: csResult.steps,
                appliedCapabilitySelectionsByStep: appliedCapabilitySelections.byStep,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger_1.logger.error({ event: 'ai_pipeline_unhandled_error', correlationId, error: message, stack: err instanceof Error ? err.stack : undefined });
            return {
                ok: false,
                code: 'INVALID_LLM_RESPONSE',
                message: `Unexpected pipeline error: ${message}`,
                stageTrace,
            };
        }
    }
}
exports.AiFirstPipeline = AiFirstPipeline;
exports.aiFirstPipeline = new AiFirstPipeline();
function resolveAppliedCapabilitySelections(steps, userSelectionsByStep) {
    const hasExplicitSelections = !!(userSelectionsByStep && Object.keys(userSelectionsByStep).length > 0);
    const byStep = {};
    const globalAllowed = new Set(steps.flatMap((step) => step.candidateNodeTypes));
    const normalizedGlobalRequested = hasExplicitSelections
        ? [
            ...new Set(Object.values(userSelectionsByStep || {})
                .flatMap((raw) => (Array.isArray(raw) ? raw : []))
                .map((t) => unified_node_registry_1.unifiedNodeRegistry.resolveAlias(String(t || '').trim()) || String(t || '').trim())
                .filter((t) => t.length > 0)),
        ]
        : [];
    const unknownRequested = normalizedGlobalRequested.filter((t) => !globalAllowed.has(t));
    if (unknownRequested.length > 0) {
        return { ok: false, message: `Invalid capability selections (unknown node types: ${unknownRequested.join(', ')})` };
    }
    const globallyAssigned = new Set();
    for (const step of steps) {
        const stepId = step.stepId;
        const allowed = new Set(step.candidateNodeTypes);
        const raw = Array.isArray(userSelectionsByStep?.[stepId]) ? userSelectionsByStep?.[stepId] : [];
        const normalized = raw
            .map((t) => unified_node_registry_1.unifiedNodeRegistry.resolveAlias(String(t || '').trim()) || String(t || '').trim())
            .filter((t) => t.length > 0);
        const selectedForStep = [...new Set(normalized.filter((t) => allowed.has(t)))];
        if (hasExplicitSelections) {
            const fallbackCompatible = normalizedGlobalRequested.filter((t) => !globallyAssigned.has(t) && allowed.has(t));
            const combined = [...new Set([...selectedForStep, ...fallbackCompatible])];
            const limited = step.selectionPolicy.multiSelectAllowed ? combined : combined.slice(0, 1);
            byStep[stepId] = limited;
            limited.forEach((x) => globallyAssigned.add(x));
            continue;
        }
        // No explicit selections were provided: seed from defaults for first-pass runs.
        if (!hasExplicitSelections) {
            byStep[stepId] = step.defaultSuggestedNodeType ? [step.defaultSuggestedNodeType] : [];
            continue;
        }
    }
    const flat = [...new Set(Object.values(byStep).flat())];
    return { ok: true, byStep, flat };
}
