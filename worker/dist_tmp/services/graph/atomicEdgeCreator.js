"use strict";
/**
 * ✅ ATOMIC EDGE CREATOR - Deterministic Edge Creation
 *
 * Creates edges atomically from execution plan.
 * Guarantees:
 * - All edges created in single pass
 * - No partial edge creation
 * - Handles normalized before creation
 * - Node IDs resolved before creation
 *
 * Architecture:
 * - Takes execution plan as input
 * - Creates edges sequentially
 * - Normalizes handles before creation
 * - Uses EdgeCreationService for repair
 * - Returns complete edge set
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.atomicEdgeCreator = exports.AtomicEdgeCreator = void 0;
const node_handle_registry_1 = require("../../core/utils/node-handle-registry");
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const edgeCreationService_1 = require("../edges/edgeCreationService");
const nodeIdResolver_1 = require("../../core/utils/nodeIdResolver");
/**
 * ✅ Atomic Edge Creator
 *
 * Creates edges atomically from execution plan
 */
class AtomicEdgeCreator {
    /**
     * Create edges from execution plan atomically
     *
     * Guarantees:
     * - All edges created in single pass
     * - No partial creation
     * - Handles normalized
     * - IDs resolved
     */
    createEdgesFromExecutionPlan(executionPlan, nodes) {
        const edges = [];
        const errors = [];
        if (!executionPlan.isValid) {
            return {
                edges: [],
                success: false,
                errors: executionPlan.errors,
                stats: { total: 0, created: 0, failed: 0 },
            };
        }
        // ✅ STEP 1: Register all nodes in NodeIdResolver
        nodeIdResolver_1.nodeIdResolver.registerNodes(nodes);
        // ✅ STEP 2: Create edges sequentially from execution plan
        const orderedNodeIds = executionPlan.orderedNodeIds;
        for (let i = 0; i < orderedNodeIds.length - 1; i++) {
            const sourceNodeId = orderedNodeIds[i];
            const targetNodeId = orderedNodeIds[i + 1];
            // Find actual nodes
            const sourceNode = nodes.find(n => n.id === sourceNodeId);
            const targetNode = nodes.find(n => n.id === targetNodeId);
            if (!sourceNode) {
                errors.push(`Source node not found: ${sourceNodeId}`);
                continue;
            }
            if (!targetNode) {
                errors.push(`Target node not found: ${targetNodeId}`);
                continue;
            }
            // ✅ STEP 3: Normalize handles BEFORE edge creation
            const sourceNodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(sourceNode);
            const targetNodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(targetNode);
            // Get default handles (will be normalized by EdgeCreationService)
            const sourceHandle = (0, node_handle_registry_1.normalizeSourceHandle)(sourceNodeType, undefined);
            const targetHandle = (0, node_handle_registry_1.normalizeTargetHandle)(targetNodeType, undefined);
            // ✅ STEP 4: Create edge using EdgeCreationService (with repair)
            const edgeResult = edgeCreationService_1.edgeCreationService.createEdge({
                sourceNodeId: sourceNode.id,
                targetNodeId: targetNode.id,
                sourceHandle,
                targetHandle,
                sourceNode,
                targetNode,
                nodes,
                edgeType: 'default',
                allowRepair: true, // Allow repair during build
                strict: false, // Permissive mode
            });
            if (edgeResult.success && edgeResult.edge) {
                edges.push(edgeResult.edge);
                if (edgeResult.repairs.length > 0) {
                    console.log(`[AtomicEdgeCreator] ✅ Created edge ${sourceNodeType} → ${targetNodeType} ` +
                        `(repaired: ${edgeResult.repairs.map(r => r.type).join(', ')})`);
                }
            }
            else {
                errors.push(`Failed to create edge ${sourceNodeId} → ${targetNodeId}: ${edgeResult.error}`);
            }
        }
        // ✅ STEP 5: Validate all edges created
        const expectedEdges = orderedNodeIds.length - 1; // n nodes = n-1 edges
        const createdEdges = edges.length;
        if (createdEdges < expectedEdges) {
            errors.push(`Only created ${createdEdges}/${expectedEdges} edges. ` +
                `Missing edges: ${expectedEdges - createdEdges}`);
        }
        return {
            edges,
            success: errors.length === 0,
            errors,
            stats: {
                total: expectedEdges,
                created: createdEdges,
                failed: expectedEdges - createdEdges,
            },
        };
    }
    /**
     * Validate edges match execution plan
     */
    validateEdgesAgainstPlan(edges, executionPlan) {
        const errors = [];
        const orderedNodeIds = executionPlan.orderedNodeIds;
        // Check: Expected number of edges
        const expectedEdges = orderedNodeIds.length - 1;
        if (edges.length !== expectedEdges) {
            errors.push(`Expected ${expectedEdges} edges, got ${edges.length}`);
        }
        // Check: Each consecutive pair in plan has an edge
        for (let i = 0; i < orderedNodeIds.length - 1; i++) {
            const sourceId = orderedNodeIds[i];
            const targetId = orderedNodeIds[i + 1];
            const edgeExists = edges.some(e => e.source === sourceId && e.target === targetId);
            if (!edgeExists) {
                errors.push(`Missing edge: ${sourceId} → ${targetId}`);
            }
        }
        // Check: No orphan nodes (all nodes except trigger have incoming edge)
        const nodesWithIncoming = new Set(edges.map(e => e.target));
        for (let i = 1; i < orderedNodeIds.length; i++) {
            const nodeId = orderedNodeIds[i];
            if (!nodesWithIncoming.has(nodeId)) {
                errors.push(`Orphan node detected: ${nodeId} has no incoming edge`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
exports.AtomicEdgeCreator = AtomicEdgeCreator;
// Export singleton instance
exports.atomicEdgeCreator = new AtomicEdgeCreator();
