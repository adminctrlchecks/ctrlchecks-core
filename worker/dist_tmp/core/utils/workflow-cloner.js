"use strict";
/**
 * Workflow Cloner
 *
 * Creates deep clones of workflow definitions for immutable execution.
 * Ensures runtime never mutates original workflow definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneWorkflowDefinition = cloneWorkflowDefinition;
exports.verifyWorkflowImmutable = verifyWorkflowImmutable;
/**
 * Deep clone workflow definition
 *
 * This ensures the execution engine never mutates the original workflow.
 * All modifications happen on the clone.
 */
function cloneWorkflowDefinition(nodes, edges, workflowId) {
    // Deep clone using JSON serialization (handles nested objects, arrays, etc.)
    const clonedNodes = JSON.parse(JSON.stringify(nodes));
    const clonedEdges = JSON.parse(JSON.stringify(edges));
    return {
        nodes: clonedNodes,
        edges: clonedEdges,
        metadata: {
            clonedAt: new Date().toISOString(),
            originalWorkflowId: workflowId,
        },
    };
}
/**
 * Verify workflow definition hasn't been mutated
 *
 * Compares current state with original to detect mutations.
 */
function verifyWorkflowImmutable(original, current) {
    const mutations = [];
    // Check node count
    if (original.nodes.length !== current.nodes.length) {
        mutations.push(`Node count changed: ${original.nodes.length} → ${current.nodes.length}`);
    }
    // Check edge count
    if (original.edges.length !== current.edges.length) {
        mutations.push(`Edge count changed: ${original.edges.length} → ${current.edges.length}`);
    }
    // Check node IDs
    const originalNodeIds = new Set(original.nodes.map(n => n.id));
    const currentNodeIds = new Set(current.nodes.map(n => n.id));
    if (originalNodeIds.size !== currentNodeIds.size) {
        mutations.push('Node IDs changed');
    }
    // Check for node config mutations (simplified check)
    for (const originalNode of original.nodes) {
        const currentNode = current.nodes.find(n => n.id === originalNode.id);
        if (!currentNode) {
            mutations.push(`Node ${originalNode.id} was removed`);
            continue;
        }
        // Check if config was mutated (deep comparison would be expensive, so we do basic check)
        const originalConfigStr = JSON.stringify(originalNode.data?.config || {});
        const currentConfigStr = JSON.stringify(currentNode.data?.config || {});
        if (originalConfigStr !== currentConfigStr) {
            mutations.push(`Node ${originalNode.id} config was mutated`);
        }
    }
    return {
        isImmutable: mutations.length === 0,
        mutations,
    };
}
