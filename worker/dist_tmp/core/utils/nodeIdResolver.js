"use strict";
/**
 * ✅ NODE ID RESOLVER - Production-Grade ID Mapping Service
 *
 * Maintains mapping between logical node IDs (from workflow structure)
 * and physical runtime IDs (actual node.id values).
 *
 * This prevents "Removing invalid edge: X -> Y (node missing)" errors
 * by ensuring edges always reference valid physical node IDs.
 *
 * Architecture:
 * - Maps logical IDs (from structure) → physical IDs (from nodes)
 * - Provides reverse lookup (physical → logical)
 * - Used everywhere edges are created
 * - Persists across workflow generation phases
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeIdResolver = exports.NodeIdResolver = void 0;
/**
 * ✅ Node ID Resolver
 *
 * Maintains bidirectional mapping between logical and physical node IDs
 */
class NodeIdResolver {
    constructor() {
        this.logicalToPhysical = new Map();
        this.physicalToLogical = new Map();
        this.physicalToType = new Map();
        this.mappings = [];
    }
    /**
     * Register a mapping between logical and physical IDs
     */
    register(logicalId, physicalId, nodeType) {
        // Remove old mappings if they exist
        const oldPhysical = this.logicalToPhysical.get(logicalId);
        if (oldPhysical) {
            this.physicalToLogical.delete(oldPhysical);
            this.physicalToType.delete(oldPhysical);
        }
        const oldLogical = this.physicalToLogical.get(physicalId);
        if (oldLogical) {
            this.logicalToPhysical.delete(oldLogical);
        }
        // Register new mapping
        this.logicalToPhysical.set(logicalId, physicalId);
        this.physicalToLogical.set(physicalId, logicalId);
        this.physicalToType.set(physicalId, nodeType);
        // Store mapping record
        const existingIndex = this.mappings.findIndex(m => m.logicalId === logicalId);
        if (existingIndex >= 0) {
            this.mappings[existingIndex] = {
                logicalId,
                physicalId,
                nodeType,
                timestamp: Date.now(),
            };
        }
        else {
            this.mappings.push({
                logicalId,
                physicalId,
                nodeType,
                timestamp: Date.now(),
            });
        }
        console.log(`[NodeIdResolver] ✅ Registered: ${logicalId} → ${physicalId} (${nodeType})`);
    }
    /**
     * Resolve logical ID to physical ID
     *
     * @param logicalId - Logical ID from structure
     * @returns Physical ID (node.id) or undefined if not found
     */
    resolve(logicalId) {
        const physicalId = this.logicalToPhysical.get(logicalId);
        if (!physicalId) {
            console.warn(`[NodeIdResolver] ⚠️  Logical ID "${logicalId}" not found in mapping`);
        }
        return physicalId;
    }
    /**
     * Reverse lookup: Get logical ID from physical ID
     */
    reverse(physicalId) {
        return this.physicalToLogical.get(physicalId);
    }
    /**
     * Get node type for a physical ID
     */
    getNodeType(physicalId) {
        return this.physicalToType.get(physicalId);
    }
    /**
     * Check if logical ID is registered
     */
    hasLogical(logicalId) {
        return this.logicalToPhysical.has(logicalId);
    }
    /**
     * Check if physical ID is registered
     */
    hasPhysical(physicalId) {
        return this.physicalToLogical.has(physicalId);
    }
    /**
     * Resolve multiple logical IDs at once
     */
    resolveBatch(logicalIds) {
        const result = new Map();
        for (const logicalId of logicalIds) {
            const physicalId = this.resolve(logicalId);
            if (physicalId) {
                result.set(logicalId, physicalId);
            }
        }
        return result;
    }
    /**
     * Register all nodes from a workflow
     */
    registerNodes(nodes) {
        for (const node of nodes) {
            const nodeType = node.type || node.data?.type || 'unknown';
            // Use physical ID as logical ID initially (for backward compatibility)
            // But also allow explicit logical IDs if provided
            this.register(node.id, node.id, nodeType);
        }
    }
    /**
     * Register mappings from structure connections
     *
     * Maps step IDs to node IDs
     */
    registerFromStructure(stepIdToNodeId, nodes) {
        // Register step ID → node ID mappings
        for (const [stepId, nodeId] of stepIdToNodeId.entries()) {
            const node = nodes.find(n => n.id === nodeId);
            const nodeType = node?.type || node?.data?.type || 'unknown';
            this.register(stepId, nodeId, nodeType);
        }
        // Also register node IDs as themselves (for direct references)
        this.registerNodes(nodes);
    }
    /**
     * Clear all mappings (for new workflow generation)
     */
    clear() {
        this.logicalToPhysical.clear();
        this.physicalToLogical.clear();
        this.physicalToType.clear();
        this.mappings = [];
        console.log('[NodeIdResolver] ✅ Cleared all mappings');
    }
    /**
     * Get all mappings (for debugging)
     */
    getAllMappings() {
        return [...this.mappings];
    }
    /**
     * Get statistics
     */
    getStats() {
        return {
            totalMappings: this.mappings.length,
            logicalIds: this.logicalToPhysical.size,
            physicalIds: this.physicalToLogical.size,
        };
    }
}
exports.NodeIdResolver = NodeIdResolver;
// Export singleton instance
exports.nodeIdResolver = new NodeIdResolver();
