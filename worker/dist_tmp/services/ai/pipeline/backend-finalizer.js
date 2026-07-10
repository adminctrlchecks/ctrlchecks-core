"use strict";
/**
 * Backend Finalizer — Stage 3
 *
 * Wraps the existing pipeline stages 5–9 from AiFirstPipeline into a single
 * class with one public finalize() method. This is the ONLY place where:
 *   - Edge reasoning runs (Gemini)
 *   - Semantic validation runs (Gemini + orchestrator safety net)
 *   - Property population runs (Gemini buildtime_ai_once fields)
 *   - Field ownership is classified (registry-driven)
 *   - Credential discovery runs (non-blocking)
 *   - Build manifest is sealed (SHA-256 integrity hash)
 *
 * All edge operations go through UnifiedGraphOrchestrator.
 * workflow.edges is never mutated directly.
 *
 * Requirements: 4.1–4.12, 7.1, 7.2, 7.4, 7.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendFinalizer = void 0;
const logger_1 = require("../../../core/logger");
const unified_graph_orchestrator_1 = require("../../../core/orchestration/unified-graph-orchestrator");
const unified_node_registry_1 = require("../../../core/registry/unified-node-registry");
const node_catalog_builder_1 = require("../node-catalog-builder");
const edge_reasoning_stage_1 = require("../stages/edge-reasoning-stage");
const validation_stage_1 = require("../stages/validation-stage");
const property_population_stage_1 = require("../stages/property-population-stage");
const credential_discovery_stage_1 = require("../stages/credential-discovery-stage");
const field_ownership_stage_1 = require("../stages/field-ownership-stage");
const plan_driven_workflow_builder_1 = require("../plan-driven-workflow-builder");
const workflow_build_manifest_utils_1 = require("../../../core/utils/workflow-build-manifest-utils");
const node_capability_dedupe_1 = require("../../../core/utils/node-capability-dedupe");
const ai_first_pipeline_1 = require("../ai-first-pipeline");
const workflow_build_manifest_1 = require("../../../core/types/workflow-build-manifest");
const stage_progress_map_1 = require("../stage-progress-map");
class BackendFinalizer {
    async finalize(input) {
        const { selectedNodes, structuralPrompt, userIntent, structuredIntent, correlationId, userId, userPrompt, onStageComplete, } = input;
        const stageTrace = [];
        const nodeCatalog = (0, node_catalog_builder_1.buildNodeCatalogText)();
        // ── Step 1: Build WorkflowNode[] from SelectedNode[] ──────────────────
        const workflowNodes = selectedNodes.map((sel) => {
            const def = unified_node_registry_1.unifiedNodeRegistry.get(sel.type);
            const baseConfig = def?.defaultConfig ? def.defaultConfig() : {};
            return {
                id: sel.nodeId,
                type: sel.type,
                data: {
                    label: def?.label || sel.type,
                    type: sel.type,
                    category: def?.category || 'action',
                    config: baseConfig,
                },
            };
        });
        // ── Step 2: Initialize workflow via orchestrator ───────────────────────
        const { workflow: initialWorkflow } = unified_graph_orchestrator_1.unifiedGraphOrchestrator.initializeWorkflow(workflowNodes);
        let workflow = initialWorkflow;
        // ── Step 3: Edge Reasoning via Gemini ─────────────────────────────────
        const erStart = Date.now();
        const useLinear = (0, workflow_build_manifest_utils_1.inferLinearBranchingFromSelection)(selectedNodes);
        let proposedEdges = [];
        if (useLinear) {
            const chain = (0, workflow_build_manifest_utils_1.linearPlanChainFromSelection)(selectedNodes);
            const built = (0, plan_driven_workflow_builder_1.buildWorkflowFromPlanChain)(chain, userIntent);
            if (!built.success || !built.workflow) {
                return {
                    ok: false,
                    error: 'ORCHESTRATOR_VALIDATION_FAILED',
                    message: `Deterministic graph build failed: ${built.errors.join('; ')}`,
                    stageTrace,
                    correlationId,
                };
            }
            workflow = built.workflow;
            proposedEdges = workflow.edges.map((e) => ({
                source: e.source,
                target: e.target,
                type: e.type || 'main',
            }));
            stageTrace.push({
                stage: 'edge_reasoning',
                startedAt: erStart,
                completedAt: Date.now(),
                durationMs: Date.now() - erStart,
                inputSummary: `nodes=${selectedNodes.length},linear=true`,
                outputSummary: `edges=${workflow.edges.length}`,
                llmCall: { model: 'deterministic_linear', temperature: 0, promptTokens: 0, completionTokens: 0 },
            });
        }
        else {
            const erResult = await (0, edge_reasoning_stage_1.runEdgeReasoningStage)(selectedNodes, nodeCatalog, userIntent, correlationId, structuralPrompt);
            stageTrace.push({
                stage: 'edge_reasoning',
                startedAt: erStart,
                completedAt: Date.now(),
                durationMs: erResult.durationMs,
                inputSummary: `nodes=${selectedNodes.length},linear=false`,
                outputSummary: erResult.ok ? `edges=${erResult.workflow.edges.length}` : 'failed',
                llmCall: erResult.ok ? erResult.llmCall : undefined,
                error: erResult.ok ? undefined : erResult.code,
            });
            if (!erResult.ok) {
                return {
                    ok: false,
                    error: erResult.code,
                    message: `Edge reasoning failed: ${erResult.code}`,
                    stageTrace,
                    correlationId,
                };
            }
            workflow = erResult.workflow;
            proposedEdges = erResult.edges;
        }
        try {
            onStageComplete?.('edge_reasoning', (0, stage_progress_map_1.getStageProgress)('edge_reasoning'), stage_progress_map_1.STAGE_LOG_LABELS['edge_reasoning'] ?? 'edge_reasoning');
        }
        catch (_) { }
        // ── Step 4: Validation via Gemini ─────────────────────────────────────
        const vsStart = Date.now();
        const vsResult = await (0, validation_stage_1.runValidationStage)(workflow, nodeCatalog, userIntent, selectedNodes, proposedEdges, correlationId, structuralPrompt);
        stageTrace.push({
            stage: 'validation',
            startedAt: vsStart,
            completedAt: Date.now(),
            durationMs: vsResult.durationMs,
            inputSummary: `nodes=${workflow.nodes.length},edges=${workflow.edges.length}`,
            outputSummary: vsResult.ok ? `issues=${vsResult.validationIssues.length}` : 'failed',
            llmCall: vsResult.ok ? vsResult.llmCall : undefined,
            error: vsResult.ok ? undefined : vsResult.code,
        });
        if (!vsResult.ok) {
            return {
                ok: false,
                error: vsResult.code,
                message: `Validation failed: ${vsResult.code}`,
                stageTrace,
                correlationId,
            };
        }
        workflow = vsResult.workflow;
        try {
            onStageComplete?.('validation', (0, stage_progress_map_1.getStageProgress)('validation'), stage_progress_map_1.STAGE_LOG_LABELS['validation'] ?? 'validation');
        }
        catch (_) { }
        // ── Step 5: Property Population via Gemini ────────────────────────────
        const ppStart = Date.now();
        const ppResult = await (0, property_population_stage_1.runPropertyPopulationStage)({
            workflow,
            userIntent,
            structuralPrompt,
            correlationId,
        });
        stageTrace.push({
            stage: 'property_population',
            startedAt: ppStart,
            completedAt: Date.now(),
            durationMs: ppResult.durationMs,
            inputSummary: `nodes=${workflow.nodes.length}`,
            outputSummary: `populated=${Object.keys(ppResult.propertyPopulationSummary).length} nodes`,
        });
        workflow = ppResult.workflow;
        try {
            onStageComplete?.('property_population', (0, stage_progress_map_1.getStageProgress)('property_population'), stage_progress_map_1.STAGE_LOG_LABELS['property_population'] ?? 'property_population');
        }
        catch (_) { }
        // ── Step 6: Deduplication (linear paths only) ─────────────────────────
        if (useLinear) {
            const seenKeys = new Set();
            const toRemove = [];
            for (const node of workflow.nodes) {
                const nodeType = node.type || node.data?.type;
                const key = (0, node_capability_dedupe_1.getNodeCapabilityDedupeKey)(nodeType);
                if (!key)
                    continue; // skip nodes with no dedup key
                if (seenKeys.has(key)) {
                    toRemove.push(node.id);
                }
                else {
                    seenKeys.add(key);
                }
            }
            for (const nodeId of toRemove) {
                const result = unified_graph_orchestrator_1.unifiedGraphOrchestrator.removeNode(workflow, nodeId);
                workflow = result.workflow;
                logger_1.logger.info({ event: 'backend_finalizer_dedup', correlationId, removedNodeId: nodeId });
            }
        }
        // ── Step 7: Reconcile after deduplication ─────────────────────────────
        const reconcileResult = unified_graph_orchestrator_1.unifiedGraphOrchestrator.reconcileWorkflow(workflow);
        workflow = reconcileResult.workflow;
        // ── Step 8: Field Ownership ───────────────────────────────────────────
        const foStart = Date.now();
        const foResult = await (0, field_ownership_stage_1.runFieldOwnershipStage)(workflow, correlationId);
        stageTrace.push({
            stage: 'field_ownership',
            startedAt: foStart,
            completedAt: Date.now(),
            durationMs: foResult.durationMs,
            inputSummary: `nodes=${workflow.nodes.length}`,
            outputSummary: `nodes=${Object.keys(foResult.fieldOwnershipMap).length}`,
        });
        try {
            onStageComplete?.('field_ownership', (0, stage_progress_map_1.getStageProgress)('field_ownership'), stage_progress_map_1.STAGE_LOG_LABELS['field_ownership'] ?? 'field_ownership');
        }
        catch (_) { }
        // ── Step 9: Credential Discovery (non-blocking) ───────────────────────
        const cdStart = Date.now();
        const cdResult = await (0, credential_discovery_stage_1.runCredentialDiscoveryStage)(workflow, userId, correlationId);
        stageTrace.push({
            stage: 'credential_discovery',
            startedAt: cdStart,
            completedAt: Date.now(),
            durationMs: cdResult.durationMs,
            inputSummary: `nodes=${workflow.nodes.length}`,
            outputSummary: cdResult.ok
                ? `required=${cdResult.requiredCredentials.length},missing=${cdResult.missingCredentials.length}`
                : 'failed (non-blocking)',
            error: cdResult.ok ? undefined : cdResult.code,
        });
        try {
            onStageComplete?.('credential_discovery', (0, stage_progress_map_1.getStageProgress)('credential_discovery'), stage_progress_map_1.STAGE_LOG_LABELS['credential_discovery'] ?? 'credential_discovery');
        }
        catch (_) { }
        // ── Step 10: Final structural validation ──────────────────────────────
        let finalValidation = unified_graph_orchestrator_1.unifiedGraphOrchestrator.validateWorkflow(workflow);
        if (!finalValidation.valid) {
            // One auto-repair attempt
            const repairResult = unified_graph_orchestrator_1.unifiedGraphOrchestrator.reconcileWorkflow(workflow);
            workflow = repairResult.workflow;
            finalValidation = unified_graph_orchestrator_1.unifiedGraphOrchestrator.validateWorkflow(workflow);
            if (!finalValidation.valid) {
                return {
                    ok: false,
                    error: 'ORCHESTRATOR_VALIDATION_FAILED',
                    message: 'Workflow failed structural validation after auto-repair',
                    violations: finalValidation.errors,
                    stageTrace,
                    correlationId,
                };
            }
        }
        // ── Step 11: Seal build manifest ──────────────────────────────────────
        const authorizedNodes = (0, workflow_build_manifest_utils_1.buildAuthorizedEntriesForPipeline)(workflow, selectedNodes, useLinear);
        const fieldOwnershipSnapshot = (0, workflow_build_manifest_utils_1.serializeFieldOwnershipSnapshot)(foResult.fieldOwnershipMap);
        const manifestDraft = {
            version: workflow_build_manifest_1.WORKFLOW_BUILD_MANIFEST_VERSION,
            correlationId,
            createdAt: new Date().toISOString(),
            userPrompt,
            intent: (0, workflow_build_manifest_utils_1.toManifestStructuredIntent)(structuredIntent),
            structuralBlueprint: structuralPrompt,
            authorizedNodes,
            branchingSpec: { mode: (useLinear ? 'linear' : 'branching') },
            graphSpec: useLinear
                ? { kind: 'deterministic_plan_chain', planChain: (0, workflow_build_manifest_utils_1.linearPlanChainFromSelection)(selectedNodes) }
                : { kind: 'llm_seeded', edgeProposalStored: true, orderedNodeIds: workflow.nodes.map((n) => n.id) },
            hydrationSpec: {
                populatedNodeIds: Object.keys(ppResult.propertyPopulationSummary),
                populatedFieldsByNodeId: ppResult.propertyPopulationSummary,
            },
            credentialDiscovery: {
                requiredCredentialKeys: (cdResult.ok ? cdResult.requiredCredentials : [])
                    .map((c) => String(c.vaultKey || c.provider || '').trim())
                    .filter((k) => k.length > 0),
            },
            fieldOwnershipSnapshot,
        };
        const buildManifest = (0, workflow_build_manifest_utils_1.sealWorkflowBuildManifest)(manifestDraft);
        // Freeze fieldOwnershipSnapshot — read-only after this point
        Object.freeze(buildManifest.fieldOwnershipSnapshot);
        stageTrace.push({
            stage: 'build_manifest',
            startedAt: Date.now(),
            completedAt: Date.now(),
            durationMs: 0,
            inputSummary: `authorized=${authorizedNodes.length}`,
            outputSummary: `manifestHash=${buildManifest.integrity.contentHash.slice(0, 16)}`,
        });
        // ── Step 12: Attach canonical pipeline metadata ───────────────────────
        const workflowWithMetadata = (0, ai_first_pipeline_1.attachCanonicalPipelineMetadata)(workflow, {
            userPrompt,
            structuralPrompt,
            correlationId,
            buildManifest,
        });
        // Build the legacy typed map for Stage3Output. Rich policy is additive.
        const fieldOwnershipMap = {};
        for (const [nodeId, fields] of Object.entries(foResult.fieldOwnershipMap)) {
            fieldOwnershipMap[nodeId] = {};
            for (const [fieldName, fillMode] of Object.entries(fields)) {
                fieldOwnershipMap[nodeId][fieldName] = {
                    mode: fillMode === 'buildtime_ai_once' ? 'ai_built'
                        : fillMode === 'runtime_ai' ? 'ai_runtime'
                            : 'user',
                    fillMode: fillMode,
                    ownership: 'value',
                };
            }
        }
        logger_1.logger.info({
            event: 'backend_finalizer_complete',
            correlationId,
            nodes: workflowWithMetadata.nodes.length,
            edges: workflowWithMetadata.edges.length,
        });
        return {
            ok: true,
            workflow: workflowWithMetadata,
            buildManifest,
            fieldOwnershipMap,
            fieldOwnershipPolicyMap: foResult.fieldOwnershipPolicyMap,
            validationIssues: vsResult.validationIssues,
            stageTrace,
        };
    }
}
exports.BackendFinalizer = BackendFinalizer;
