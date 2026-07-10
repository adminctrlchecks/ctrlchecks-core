"use strict";
/**
 * ✅ NODE INJECTION COORDINATOR
 *
 * Unified API for ALL node injections (safety, missing nodes, error handling, etc.).
 *
 * Key Features:
 * 1. Unified Injection API: Single entry point for all node injections
 * 2. Execution Order Updates: Automatically updates execution order when nodes are injected
 * 3. Edge Reconciliation: Automatically triggers edge reconciliation after injection
 * 4. Registry-Driven: Uses unifiedNodeRegistry to determine injection rules
 *
 * This ensures ALL node injections follow the same orchestration flow.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeInjectionCoordinator = void 0;
const execution_order_manager_1 = require("./execution-order-manager");
const edge_reconciliation_engine_1 = require("./edge-reconciliation-engine");
const unified_node_registry_1 = require("../registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("../utils/unified-node-type-normalizer");
class NodeInjectionCoordinatorImpl {
    /**
     * Inject node into workflow with automatic orchestration
     */
    injectNode(workflow, node, injectionContext) {
        const errors = [];
        const warnings = [];
        try {
            // Step 1: Validate injection context
            const validation = this.validateInjectionContext(workflow, node, injectionContext);
            if (!validation.valid) {
                errors.push(...validation.errors);
                return {
                    workflow,
                    executionOrder: execution_order_manager_1.executionOrderManager.initialize(workflow),
                    edgesReconciled: false,
                    errors,
                    warnings,
                };
            }
            // Step 2: Add node to workflow
            const updatedWorkflow = {
                ...workflow,
                nodes: [...workflow.nodes, node],
            };
            // Step 3: Get or initialize execution order
            let executionOrder = execution_order_manager_1.executionOrderManager.initialize(workflow);
            // Step 4: Update execution order (insert node at correct position)
            executionOrder = execution_order_manager_1.executionOrderManager.insertNode(executionOrder, node, injectionContext.position, injectionContext.referenceNodeId);
            // Step 5: Reconcile edges (automatic)
            const reconciliationResult = edge_reconciliation_engine_1.edgeReconciliationEngine.reconcileEdges(updatedWorkflow, executionOrder);
            if (reconciliationResult.errors.length > 0) {
                errors.push(...reconciliationResult.errors);
            }
            if (reconciliationResult.warnings.length > 0) {
                warnings.push(...reconciliationResult.warnings);
            }
            return {
                workflow: reconciliationResult.workflow,
                executionOrder,
                edgesReconciled: true,
                errors,
                warnings,
            };
        }
        catch (error) {
            errors.push(`Node injection failed: ${error?.message || 'Unknown error'}`);
            return {
                workflow,
                executionOrder: execution_order_manager_1.executionOrderManager.initialize(workflow),
                edgesReconciled: false,
                errors,
                warnings,
            };
        }
    }
    /**
     * Batch inject multiple nodes
     */
    injectNodes(workflow, nodes) {
        let currentWorkflow = workflow;
        let currentOrder = execution_order_manager_1.executionOrderManager.initialize(workflow);
        const allErrors = [];
        const allWarnings = [];
        // Inject nodes one by one (order matters for execution order)
        for (const { node, injectionContext } of nodes) {
            const result = this.injectNode(currentWorkflow, node, injectionContext);
            if (result.errors.length > 0) {
                allErrors.push(...result.errors);
            }
            if (result.warnings.length > 0) {
                allWarnings.push(...result.warnings);
            }
            currentWorkflow = result.workflow;
            currentOrder = result.executionOrder;
        }
        // Final reconciliation pass
        const finalReconciliation = edge_reconciliation_engine_1.edgeReconciliationEngine.reconcileEdges(currentWorkflow, currentOrder);
        return {
            workflow: finalReconciliation.workflow,
            executionOrder: currentOrder,
            edgesReconciled: true,
            errors: allErrors,
            warnings: [...allWarnings, ...finalReconciliation.warnings],
        };
    }
    /**
     * Validate injection context
     */
    validateInjectionContext(workflow, node, context) {
        const errors = [];
        // Check if reference node exists
        if (context.referenceNodeId) {
            const referenceNode = workflow.nodes.find(n => n.id === context.referenceNodeId);
            if (!referenceNode) {
                errors.push(`Reference node ${context.referenceNodeId} not found in workflow`);
            }
        }
        // Check if node type is valid (registry-based)
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.type || node.data?.type || '');
        const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
        if (!nodeDef) {
            errors.push(`Node type ${nodeType} not found in registry`);
        }
        // Check if position is valid for node type (registry-based)
        if (context.position === 'replace' && !context.referenceNodeId) {
            errors.push(`Replace position requires referenceNodeId`);
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
// Export singleton instance
exports.nodeInjectionCoordinator = new NodeInjectionCoordinatorImpl();
