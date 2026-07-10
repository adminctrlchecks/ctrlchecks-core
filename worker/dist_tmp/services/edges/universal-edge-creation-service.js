"use strict";
/**
 * ✅ UNIVERSAL EDGE CREATION SERVICE
 *
 * This is the SINGLE SOURCE OF TRUTH for ALL edge creation in the system.
 *
 * ALL edge creation MUST go through this service, regardless of:
 * - Which builder is creating the edge (DSL compiler, workflow builder, production builder, etc.)
 * - What prompt was used
 * - What workflow structure exists
 *
 * This ensures CONSISTENT rules are applied to ALL workflows:
 * - No duplicate edges
 * - No branching from non-branching nodes
 * - Proper handle resolution
 * - Cycle detection
 * - Branching node support (if_else, switch, merge)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.universalEdgeCreationService = exports.UniversalEdgeCreationService = void 0;
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const error_prevention_1 = require("../../core/error-prevention");
const crypto_1 = require("crypto");
/**
 * ✅ UNIVERSAL EDGE CREATION SERVICE
 *
 * Enforces ALL edge creation rules consistently:
 * 1. No duplicate edges (same source-target pair)
 * 2. No branching from non-branching nodes
 * 3. Proper handle resolution
 * 4. Cycle detection
 * 5. Branching node support (if_else, switch, merge)
 */
class UniversalEdgeCreationService {
    constructor() { }
    static getInstance() {
        if (!UniversalEdgeCreationService.instance) {
            UniversalEdgeCreationService.instance = new UniversalEdgeCreationService();
        }
        return UniversalEdgeCreationService.instance;
    }
    /**
     * ✅ UNIVERSAL: Create an edge with ALL rules enforced
     *
     * This is the ONLY method that should create edges.
     * ALL edge creation MUST go through this method.
     */
    createEdge(request) {
        const { sourceNode, targetNode, sourceHandle, targetHandle, edgeType, existingEdges, allNodes } = request;
        // ✅ RULE 1: Prevent duplicate edges (same source-target pair)
        const duplicateEdge = existingEdges.find(e => e.source === sourceNode.id && e.target === targetNode.id);
        if (duplicateEdge) {
            return {
                success: false,
                error: 'Duplicate edge',
                reason: `Edge from ${sourceNode.id} to ${targetNode.id} already exists`,
            };
        }
        // ✅ RULE 2: For non-branching nodes, prevent multiple outgoing edges
        const sourceNodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(sourceNode.type || sourceNode.data?.type || '');
        const sourceNodeDef = unified_node_registry_1.unifiedNodeRegistry.get(sourceNodeType);
        const sourceAllowsBranching = sourceNodeDef?.isBranching || false;
        if (!sourceAllowsBranching) {
            const existingOutgoingEdges = existingEdges.filter(e => e.source === sourceNode.id);
            if (existingOutgoingEdges.length > 0) {
                // Exception: if_else nodes can have 'true' and 'false' edges
                if (sourceNodeType === 'if_else') {
                    const hasTrueEdge = existingOutgoingEdges.some(e => e.sourceHandle === 'true' || e.type === 'true');
                    const hasFalseEdge = existingOutgoingEdges.some(e => e.sourceHandle === 'false' || e.type === 'false');
                    // Allow if creating the missing branch
                    if ((edgeType === 'true' || sourceHandle === 'true') && !hasTrueEdge) {
                        // Allow true branch
                    }
                    else if ((edgeType === 'false' || sourceHandle === 'false') && !hasFalseEdge) {
                        // Allow false branch
                    }
                    else {
                        return {
                            success: false,
                            error: 'Non-branching node already has outgoing edge',
                            reason: `Node "${sourceNodeType}" already has ${existingOutgoingEdges.length} outgoing edge(s). Non-branching nodes can only have one outgoing edge.`,
                        };
                    }
                }
                else {
                    // Not if_else - reject additional edges
                    return {
                        success: false,
                        error: 'Non-branching node already has outgoing edge',
                        reason: `Node "${sourceNodeType}" already has ${existingOutgoingEdges.length} outgoing edge(s). Non-branching nodes can only have one outgoing edge.`,
                    };
                }
            }
        }
        // ✅ RULE 3: Cycle detection
        const wouldCreateCycle = this.detectCycle(sourceNode.id, targetNode.id, existingEdges, allNodes);
        if (wouldCreateCycle) {
            return {
                success: false,
                error: 'Cycle detected',
                reason: `Creating edge from ${sourceNode.id} to ${targetNode.id} would create a cycle`,
            };
        }
        // ✅ RULE 4: Handle resolution using Universal Handle Resolver (Error Prevention #1)
        const targetNodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(targetNode.type || targetNode.data?.type || '');
        // Use Universal Handle Resolver (prevents Error #1: Invalid handles)
        const sourceHandleResult = error_prevention_1.universalHandleResolver.resolveSourceHandle(sourceNodeType, sourceHandle, // Explicit handle if provided
        edgeType // Connection type ('true', 'false', etc.)
        );
        const targetHandleResult = error_prevention_1.universalHandleResolver.resolveTargetHandle(targetNodeType, targetHandle // Explicit handle if provided
        );
        if (!sourceHandleResult.valid || !targetHandleResult.valid) {
            return {
                success: false,
                error: 'Handle resolution failed',
                reason: sourceHandleResult.reason || targetHandleResult.reason || 'No compatible handles found',
            };
        }
        const resolvedSourceHandle = sourceHandleResult.handle;
        const resolvedTargetHandle = targetHandleResult.handle;
        // ✅ RULE 6: Create the edge
        const edge = {
            id: (0, crypto_1.randomUUID)(),
            source: sourceNode.id,
            target: targetNode.id,
            type: edgeType || 'default',
            sourceHandle: resolvedSourceHandle,
            targetHandle: resolvedTargetHandle,
        };
        return {
            success: true,
            edge,
            reason: `Edge created: ${sourceNodeType}(${resolvedSourceHandle}) → ${(0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(targetNode.type || targetNode.data?.type || '')}(${resolvedTargetHandle})`,
        };
    }
    /**
     * ✅ UNIVERSAL: Detect if creating an edge would create a cycle
     */
    detectCycle(sourceId, targetId, existingEdges, allNodes) {
        // If target is source, it's a self-loop (cycle)
        if (sourceId === targetId) {
            return true;
        }
        // Build adjacency list
        const adjacencyList = new Map();
        existingEdges.forEach(edge => {
            if (!adjacencyList.has(edge.source)) {
                adjacencyList.set(edge.source, []);
            }
            adjacencyList.get(edge.source).push(edge.target);
        });
        // Add the new edge temporarily
        if (!adjacencyList.has(sourceId)) {
            adjacencyList.set(sourceId, []);
        }
        adjacencyList.get(sourceId).push(targetId);
        // DFS to detect cycle
        const visited = new Set();
        const recursionStack = new Set();
        const hasCycleDFS = (nodeId) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            const neighbors = adjacencyList.get(nodeId) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (hasCycleDFS(neighbor)) {
                        return true;
                    }
                }
                else if (recursionStack.has(neighbor)) {
                    return true; // Back edge found - cycle detected
                }
            }
            recursionStack.delete(nodeId);
            return false;
        };
        // Check all nodes for cycles
        for (const node of allNodes) {
            if (!visited.has(node.id)) {
                if (hasCycleDFS(node.id)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * ✅ UNIVERSAL: Batch create edges with validation
     */
    createEdges(requests) {
        const edges = [];
        const errors = [];
        const warnings = [];
        // Track edges as we create them (for duplicate detection across batch)
        const createdEdges = [];
        for (const request of requests) {
            // Update existingEdges to include previously created edges in this batch
            const result = this.createEdge({
                ...request,
                existingEdges: [...request.existingEdges, ...createdEdges],
            });
            if (result.success && result.edge) {
                edges.push(result.edge);
                createdEdges.push(result.edge);
            }
            else {
                errors.push(result.error || 'Unknown error');
                warnings.push(result.reason || 'Edge creation failed');
            }
        }
        return { edges, errors, warnings };
    }
}
exports.UniversalEdgeCreationService = UniversalEdgeCreationService;
// Export singleton instance
exports.universalEdgeCreationService = UniversalEdgeCreationService.getInstance();
