"use strict";
/**
 * Plan-driven workflow construction: builds a workflow graph that matches
 * WorkflowIntentPlan.proposedNodeChain exactly (no extra helper nodes).
 *
 * Uses unified-node-registry for defaults and unified-graph-orchestrator for edges.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePlanNodeType = resolvePlanNodeType;
exports.buildWorkflowFromPlanChain = buildWorkflowFromPlanChain;
const crypto_1 = require("crypto");
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const orchestration_1 = require("../../core/orchestration");
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const node_type_resolver_util_1 = require("../../core/utils/node-type-resolver-util");
const fill_mode_resolver_1 = require("../../core/utils/fill-mode-resolver");
const structure_materializer_1 = require("./structure-materializer");
const intent_structural_projection_1 = require("./intent-structural-projection");
const form_field_identity_1 = require("../../core/utils/form-field-identity");
const registry_field_contract_1 = require("../../core/validation/registry-field-contract");
const workflow_config_hydrator_1 = require("../../core/validation/workflow-config-hydrator");
const switch_case_node_mapping_1 = require("./switch-case-node-mapping");
const plan_chain_prune_1 = require("./plan-chain-prune");
function buildSingleRetrySwitchContext(original) {
    if (!original)
        return original;
    const normalizeContext = (ctx) => {
        const caseNodeMapping = Object.entries(ctx?.caseNodeMapping || {}).reduce((acc, [k, v]) => {
            acc[k] = {
                targetNodeType: v?.targetNodeType,
                slot: v?.slot,
            };
            return acc;
        }, {});
        return {
            switchNodeId: ctx?.switchNodeId,
            caseNodeMapping,
        };
    };
    const switchContexts = Array.isArray(original?.switchContexts)
        ? original.switchContexts.map((ctx) => normalizeContext(ctx))
        : [normalizeContext(original)];
    return {
        ...normalizeContext(original),
        switchContexts,
    };
}
function parsePlanNodeToken(raw) {
    const trimmed = (raw || '').trim();
    if (!trimmed)
        return { nodeTypeToken: '' };
    const hashIdx = trimmed.indexOf('#');
    const atIdx = trimmed.indexOf('@');
    const sepIdx = hashIdx > 0 && atIdx > 0 ? Math.min(hashIdx, atIdx) : Math.max(hashIdx, atIdx);
    if (sepIdx > 0 && sepIdx < trimmed.length - 1) {
        return {
            nodeTypeToken: trimmed.slice(0, sepIdx).trim(),
            explicitNodeId: trimmed.slice(sepIdx + 1).trim(),
        };
    }
    return { nodeTypeToken: trimmed };
}
/**
 * Normalize a node type from the structured plan to a registry-backed type.
 * Handles annotated tokens like `google_gmail[true]` by stripping the branch tag
 * before registry lookup.
 */
function resolvePlanNodeType(raw) {
    // Use stripPlanTokenToType which handles both [branchTag] and #id/@id annotations
    const canonicalType = (0, plan_chain_prune_1.stripPlanTokenToType)(raw);
    if (!canonicalType) {
        return { normalized: '', error: 'Empty node type in plan chain' };
    }
    try {
        return { normalized: (0, node_type_resolver_util_1.resolveCanonicalNodeTypeStrict)(canonicalType) };
    }
    catch (e) {
        return {
            normalized: canonicalType,
            error: e?.message || `Unknown or unregistered node type "${canonicalType}"`,
        };
    }
}
/**
 * @param planChain - Canonical registry node types in execution order.
 * @param rawUserPrompt - Optional original user prompt (not the full structured plan blob). When set and the chain contains `switch`, case edges are wired deterministically before edge reconciliation.
 */
function buildWorkflowFromPlanChain(planChain, rawUserPrompt) {
    const errors = [];
    const warnings = [];
    const resolvedChain = [];
    const canonicalization = [];
    if (!Array.isArray(planChain) || planChain.length === 0) {
        return {
            success: false,
            errors: ['planProposedNodeChain must be a non-empty array'],
            warnings,
            resolvedChain,
            diagnostics: {
                canonicalization: [{ input: 'planProposedNodeChain', status: 'rejected', reason: 'empty_chain' }],
                resolvedChain,
                unknownTypes: [],
                branchCoverage: { branchingNodes: 0, branchEdges: 0 },
            },
        };
    }
    const nodes = [];
    const usedNodeIds = new Set();
    for (const raw of planChain) {
        const { explicitNodeId } = parsePlanNodeToken(raw);
        const { normalized, error } = resolvePlanNodeType(raw);
        if (error || !normalized) {
            canonicalization.push({
                input: raw,
                normalized: normalized || undefined,
                status: 'rejected',
                reason: error || 'invalid_node_type',
            });
            errors.push(error || `Invalid type: ${raw}`);
            continue;
        }
        canonicalization.push({ input: raw, normalized, status: 'accepted' });
        resolvedChain.push((0, plan_chain_prune_1.formatPlanChainToken)(raw, normalized));
        const def = unified_node_registry_1.unifiedNodeRegistry.get(normalized);
        if (!def) {
            errors.push(`Registry missing definition for ${normalized}`);
            continue;
        }
        const config = typeof def.defaultConfig === 'function' ? def.defaultConfig() : {};
        // Universal planner invariant:
        // if required fields are missing at plan stage, select the policy-safe deferred owner.
        const requiredInputs = Array.isArray(def.requiredInputs) ? def.requiredInputs : [];
        for (const field of requiredInputs) {
            const value = config[field];
            const missing = (0, registry_field_contract_1.isEmptyConfigValue)(value);
            if (missing) {
                if (!config._fillMode || typeof config._fillMode !== 'object') {
                    config._fillMode = {};
                }
                config._fillMode[field] = (0, fill_mode_resolver_1.coerceFieldFillModeByPolicy)(field, 'runtime_ai', def.inputSchema, config).mode;
            }
        }
        let id = explicitNodeId || `node_${(0, crypto_1.randomUUID)()}`;
        // When a branchTag is present (e.g. google_gmail[true]), incorporate it into the ID
        // so same-type branch nodes get distinct IDs.
        const branchTag = (0, plan_chain_prune_1.extractBranchTag)(raw);
        if (branchTag && !explicitNodeId) {
            id = `${normalized}_${branchTag}_${(0, crypto_1.randomUUID)().slice(0, 8)}`;
        }
        if (usedNodeIds.has(id)) {
            id = `${id}_${(0, crypto_1.randomUUID)().slice(0, 8)}`;
            warnings.push(`Duplicate explicit node id in plan token; using generated id "${id}"`);
        }
        usedNodeIds.add(id);
        const label = def.label || normalized;
        nodes.push({
            id,
            type: normalized,
            data: {
                label,
                type: normalized,
                category: def.category || 'utility',
                config: { ...config },
                // Store branchTag in meta for downstream Config_Filler context
                ...(branchTag ? { meta: { branchTag } } : {}),
            },
        });
    }
    if (errors.length > 0 || nodes.length !== resolvedChain.length) {
        return {
            success: false,
            errors,
            warnings,
            resolvedChain,
            diagnostics: {
                canonicalization,
                resolvedChain,
                unknownTypes: canonicalization.filter((c) => c.status === 'rejected').map((c) => c.input),
                branchCoverage: { branchingNodes: 0, branchEdges: 0 },
            },
        };
    }
    const trimmedPrompt = typeof rawUserPrompt === 'string' ? rawUserPrompt.trim() : '';
    const hasSwitch = resolvedChain.some((t) => (0, plan_chain_prune_1.stripPlanTokenToType)(t) === 'switch');
    const switchContext = trimmedPrompt.length > 0 && hasSwitch
        ? (0, switch_case_node_mapping_1.computeSwitchContextForPlanChain)(nodes, resolvedChain, trimmedPrompt)
        : undefined;
    let workflow;
    let executionOrder;
    let initializeError;
    try {
        ({ workflow, executionOrder } = orchestration_1.unifiedGraphOrchestrator.initializeWorkflow(nodes, undefined, undefined, switchContext));
    }
    catch (err) {
        initializeError = err;
        const retrySwitchContext = buildSingleRetrySwitchContext(switchContext);
        try {
            ({ workflow, executionOrder } = orchestration_1.unifiedGraphOrchestrator.initializeWorkflow(nodes, undefined, undefined, retrySwitchContext));
            warnings.push(`Switch wiring required single retry with relaxed target IDs: ${err instanceof Error ? err.message : String(err)}`);
        }
        catch (retryErr) {
            return {
                success: false,
                errors: [
                    `Deterministic branch wiring failed after one retry: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
                ],
                warnings: [
                    ...(initializeError ? [`Initial branch wiring error: ${initializeError instanceof Error ? initializeError.message : String(initializeError)}`] : []),
                    ...warnings,
                ],
                resolvedChain,
                diagnostics: {
                    canonicalization,
                    resolvedChain,
                    unknownTypes: canonicalization.filter((c) => c.status === 'rejected').map((c) => c.input),
                    branchCoverage: { branchingNodes: 0, branchEdges: 0 },
                },
            };
        }
    }
    workflow = (0, structure_materializer_1.materializeStructuralFields)(workflow);
    workflow = (0, intent_structural_projection_1.applyStructuralIntentAlignment)(workflow);
    workflow = (0, workflow_config_hydrator_1.hydrateRequiredConfigFromRegistryDefaults)(workflow);
    workflow = (0, form_field_identity_1.normalizeWorkflowFormFieldIdentities)(workflow);
    // Ensure branching nodes receive contract-valid branch fanout/typed edges before validation.
    const reconciled = orchestration_1.unifiedGraphOrchestrator.reconcileWorkflow(workflow);
    workflow = reconciled.workflow;
    executionOrder = reconciled.executionOrder;
    if (reconciled.errors.length > 0) {
        errors.push(...reconciled.errors);
    }
    if (reconciled.warnings?.length) {
        warnings.push(...reconciled.warnings);
    }
    if (reconciled.errors.length > 0) {
        return {
            success: false,
            errors,
            warnings,
            resolvedChain,
            diagnostics: {
                canonicalization,
                resolvedChain,
                unknownTypes: canonicalization.filter((c) => c.status === 'rejected').map((c) => c.input),
                branchCoverage: { branchingNodes: 0, branchEdges: 0 },
            },
        };
    }
    const branchingNodes = workflow.nodes.filter((n) => {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(n.type || n.data?.type || '');
        return unified_node_registry_1.unifiedNodeRegistry.get(nodeType)?.isBranching === true;
    }).length;
    const branchEdges = workflow.edges.filter((e) => e.type === 'true' || e.type === 'false' || String(e.type || '').startsWith('case_')).length;
    if (branchingNodes > 0 && branchEdges === 0) {
        warnings.push('Branching nodes detected but no typed branch edges found after reconciliation');
    }
    return {
        success: true,
        workflow,
        errors: [],
        warnings,
        resolvedChain,
        diagnostics: {
            canonicalization,
            resolvedChain,
            unknownTypes: [],
            branchCoverage: { branchingNodes, branchEdges },
        },
    };
}
