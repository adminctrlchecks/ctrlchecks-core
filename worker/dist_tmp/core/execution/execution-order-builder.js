"use strict";
/**
 * Execution Order Builder
 *
 * ✅ CRITICAL: Prevents Error #2 - Workflow execution order incorrect
 *
 * This builder ensures:
 * 1. Builds execution order based on data dependencies (not just category)
 * 2. Uses topological sort to respect dependencies
 * 3. Understands intent logic (read → transform → write)
 * 4. Validates order before compilation
 *
 * Architecture Rule:
 * - ALL execution order MUST use this builder
 * - NO category-based ordering allowed
 * - Dependencies are the ONLY source of truth for order
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executionOrderBuilder = exports.ExecutionOrderBuilder = void 0;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("../utils/unified-node-type-normalizer");
const node_capability_registry_dsl_1 = require("../../services/ai/node-capability-registry-dsl");
class ExecutionOrderBuilder {
    constructor() { }
    static getInstance() {
        if (!ExecutionOrderBuilder.instance) {
            ExecutionOrderBuilder.instance = new ExecutionOrderBuilder();
        }
        return ExecutionOrderBuilder.instance;
    }
    /**
     * Build execution order using topological sort based on dependencies
     * Prevents Error #2: Incorrect execution order
     *
     * @param nodes - All nodes in workflow
     * @param edges - All edges in workflow
     * @param intent - Optional structured intent for intent-aware ordering
     * @returns Execution order with dependency graph
     */
    buildExecutionOrder(nodes, edges, intent) {
        const errors = [];
        const warnings = [];
        const dependencyGraph = new Map();
        // ✅ STEP 1: Find trigger node (must be first)
        const triggerNode = nodes.find(n => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(n.data.type);
            return nodeType.includes('trigger') || nodeType === 'schedule' || nodeType === 'webhook';
        });
        if (!triggerNode) {
            errors.push('No trigger node found in workflow');
            return {
                orderedNodeIds: [],
                dependencyGraph,
                errors,
                warnings
            };
        }
        // ✅ STEP 2: Build dependency graph from edges
        // Edge: source → target means target depends on source
        for (const edge of edges) {
            if (!dependencyGraph.has(edge.target)) {
                dependencyGraph.set(edge.target, []);
            }
            dependencyGraph.get(edge.target).push(edge.source);
        }
        // ✅ STEP 3: Add implicit dependencies based on node capabilities
        // Data source → Transformation → Output
        for (const node of nodes) {
            if (node.id === triggerNode.id)
                continue;
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.data.type);
            const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
            if (!nodeDef)
                continue;
            // If node is a transformation, it may depend on data sources
            if (node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isTransformation(nodeType)) {
                const dataSources = nodes.filter(n => {
                    if (n.id === node.id)
                        return false;
                    return node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isDataSource((0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(n.data.type));
                });
                // Add implicit dependency if not already in graph
                if (!dependencyGraph.has(node.id)) {
                    dependencyGraph.set(node.id, []);
                }
                for (const ds of dataSources) {
                    if (!dependencyGraph.get(node.id).includes(ds.id)) {
                        dependencyGraph.get(node.id).push(ds.id);
                    }
                }
            }
            // If node is an output, it may depend on transformations or data sources
            if (node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isOutput(nodeType)) {
                const dependencies = nodes.filter(n => {
                    if (n.id === node.id)
                        return false;
                    const otherType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(n.data.type);
                    return node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isTransformation(otherType) ||
                        node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.isDataSource(otherType);
                });
                // Add implicit dependency if not already in graph
                if (!dependencyGraph.has(node.id)) {
                    dependencyGraph.set(node.id, []);
                }
                for (const dep of dependencies) {
                    if (!dependencyGraph.get(node.id).includes(dep.id)) {
                        dependencyGraph.get(node.id).push(dep.id);
                    }
                }
            }
        }
        // ✅ STEP 4: Topological sort
        const orderedNodeIds = [];
        const visited = new Set();
        const visiting = new Set();
        const visit = (nodeId) => {
            if (visiting.has(nodeId)) {
                // Circular dependency detected
                errors.push(`Circular dependency detected involving node ${nodeId}`);
                return;
            }
            if (visited.has(nodeId)) {
                return;
            }
            visiting.add(nodeId);
            // Visit dependencies first
            const dependencies = dependencyGraph.get(nodeId) || [];
            for (const depId of dependencies) {
                visit(depId);
            }
            visiting.delete(nodeId);
            visited.add(nodeId);
            orderedNodeIds.push(nodeId);
        };
        // Start with trigger node
        visit(triggerNode.id);
        // Visit all other nodes
        for (const node of nodes) {
            if (node.id !== triggerNode.id && !visited.has(node.id)) {
                visit(node.id);
            }
        }
        // ✅ STEP 5: Validate order
        // Ensure trigger is first
        if (orderedNodeIds[0] !== triggerNode.id) {
            errors.push('Trigger node is not first in execution order');
            // Fix: move trigger to front
            orderedNodeIds.splice(orderedNodeIds.indexOf(triggerNode.id), 1);
            orderedNodeIds.unshift(triggerNode.id);
            warnings.push('Trigger node moved to first position');
        }
        // Ensure all nodes are included
        const missingNodes = nodes.filter(n => !orderedNodeIds.includes(n.id));
        if (missingNodes.length > 0) {
            errors.push(`Missing nodes in execution order: ${missingNodes.map(n => n.id).join(', ')}`);
            // Add missing nodes at the end
            for (const node of missingNodes) {
                orderedNodeIds.push(node.id);
            }
            warnings.push(`Added ${missingNodes.length} missing node(s) to execution order`);
        }
        return {
            orderedNodeIds,
            dependencyGraph,
            errors,
            warnings
        };
    }
    /**
     * Validate execution order
     *
     * @param order - Execution order to validate
     * @param nodes - All nodes
     * @param edges - All edges
     * @returns Validation result
     */
    validateExecutionOrder(order, nodes, edges) {
        const errors = [];
        const warnings = [];
        // Check: All nodes included
        const nodeIds = new Set(nodes.map(n => n.id));
        const orderIds = new Set(order.orderedNodeIds);
        for (const nodeId of nodeIds) {
            if (!orderIds.has(nodeId)) {
                errors.push(`Node ${nodeId} missing from execution order`);
            }
        }
        // Check: No duplicates
        if (order.orderedNodeIds.length !== new Set(order.orderedNodeIds).size) {
            errors.push('Execution order contains duplicate node IDs');
        }
        // Check: Dependencies respected
        for (const [targetId, dependencies] of order.dependencyGraph.entries()) {
            const targetIndex = order.orderedNodeIds.indexOf(targetId);
            if (targetIndex === -1)
                continue;
            for (const depId of dependencies) {
                const depIndex = order.orderedNodeIds.indexOf(depId);
                if (depIndex === -1)
                    continue;
                if (depIndex >= targetIndex) {
                    errors.push(`Dependency violation: Node ${targetId} (order ${targetIndex}) depends on ${depId} (order ${depIndex}) but dependency comes after`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors: [...errors, ...order.errors],
            warnings: [...warnings, ...order.warnings]
        };
    }
}
exports.ExecutionOrderBuilder = ExecutionOrderBuilder;
// Export singleton instance
exports.executionOrderBuilder = ExecutionOrderBuilder.getInstance();
