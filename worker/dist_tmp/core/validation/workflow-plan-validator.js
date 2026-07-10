"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndMaterializeWorkflowPlan = validateAndMaterializeWorkflowPlan;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const orchestration_1 = require("../orchestration");
/**
 * Central validator/normalizer for AI-authored WorkflowPlan JSON.
 *
 * Responsibilities:
 * - Ensure all node types exist in unified-node-registry.
 * - Validate that all edges reference existing node ids and have allowed types.
 * - Materialize a Workflow graph via unifiedGraphOrchestrator.initializeWorkflow.
 * - Run orchestrator-level validation to enforce DAG + structural rules.
 *
 * IMPORTANT:
 * - This file does NOT do any prompt-specific logic.
 * - All behavior is driven by the registry + orchestrator contracts.
 */
async function validateAndMaterializeWorkflowPlan(plan) {
    const issues = [];
    if (!plan || !Array.isArray(plan.nodes) || plan.nodes.length === 0) {
        issues.push({
            kind: 'schema',
            message: 'WorkflowPlan must contain at least one node.',
        });
        return { valid: false, issues };
    }
    const nodeIdSet = new Set();
    const workflowNodes = [];
    // Validate nodes against registry existence (config schema validation is delegated to registry)
    for (const node of plan.nodes) {
        if (!node.id || !node.type) {
            issues.push({
                kind: 'node',
                message: 'Each node must have both id and type.',
                nodeId: node.id,
            });
            continue;
        }
        if (nodeIdSet.has(node.id)) {
            issues.push({
                kind: 'node',
                message: `Duplicate node id "${node.id}" in WorkflowPlan.`,
                nodeId: node.id,
            });
            continue;
        }
        nodeIdSet.add(node.id);
        const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(node.type);
        if (!nodeDef) {
            issues.push({
                kind: 'schema',
                message: `Unknown node type "${node.type}" (not found in unified-node-registry).`,
                nodeId: node.id,
            });
            continue;
        }
        const workflowNode = {
            id: node.id,
            type: 'custom',
            position: { x: 0, y: 0 },
            data: {
                type: node.type,
                label: nodeDef.label || node.type,
                category: nodeDef.category,
                config: node.config || {},
            },
        };
        workflowNodes.push(workflowNode);
    }
    if (workflowNodes.length === 0) {
        issues.push({
            kind: 'schema',
            message: 'No valid nodes could be materialized from WorkflowPlan.',
        });
        return { valid: false, issues };
    }
    // NOTE: For now we rely on orchestrator to compute edges from node semantics.
    // The plan.edges array can be used later as a hint layer, but we do not
    // manually mutate workflow.edges here to respect orchestration rules.
    let initialized;
    try {
        initialized = orchestration_1.unifiedGraphOrchestrator.initializeWorkflow(workflowNodes);
    }
    catch (err) {
        issues.push({
            kind: 'graph',
            message: `Failed to initialize workflow from plan: ${err?.message || String(err)}`,
        });
        return { valid: false, issues };
    }
    const workflow = initialized.workflow;
    const validation = orchestration_1.unifiedGraphOrchestrator.validateWorkflow(workflow, initialized.executionOrder);
    if (!validation.valid) {
        for (const error of validation.errors) {
            issues.push({
                kind: 'graph',
                message: error,
            });
        }
    }
    return {
        valid: issues.length === 0,
        workflow,
        issues,
    };
}
