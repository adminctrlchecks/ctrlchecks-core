"use strict";
/**
 * ✅ EDGE SANITIZER - Production-Grade Edge Cleanup Service
 *
 * Scans all edges and fixes:
 * - Node ID mismatches
 * - Invalid handle names
 * - Removes only unrecoverable edges
 * - Logs all repairs for audit
 *
 * Architecture:
 * - Scans all edges in workflow
 * - Fixes node ID mismatches using NodeIdResolver
 * - Normalizes handles using registry
 * - Removes only edges that cannot be repaired
 * - Logs all repairs for debugging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.edgeSanitizer = exports.EdgeSanitizer = void 0;
const nodeIdResolver_1 = require("../../core/utils/nodeIdResolver");
const edgeCreationService_1 = require("./edgeCreationService");
/**
 * ✅ Edge Sanitizer
 *
 * Sanitizes edges by fixing ID mismatches and invalid handles
 */
class EdgeSanitizer {
    /**
     * Sanitize all edges in a workflow
     */
    sanitize(edges, nodes) {
        const sanitized = [];
        const removed = [];
        const repaired = [];
        const nodeMap = new Map();
        nodes.forEach(node => {
            nodeMap.set(node.id, node);
        });
        console.log(`[EdgeSanitizer] 🔍 Sanitizing ${edges.length} edges...`);
        for (const edge of edges) {
            // ✅ STEP 1: Check if source node exists
            let sourceNode = nodeMap.get(edge.source);
            if (!sourceNode) {
                // Try to resolve logical ID
                const resolvedSource = nodeIdResolver_1.nodeIdResolver.resolve(edge.source);
                if (resolvedSource) {
                    sourceNode = nodeMap.get(resolvedSource);
                    if (sourceNode) {
                        console.log(`[EdgeSanitizer] ✅ Resolved source ID: ${edge.source} → ${resolvedSource}`);
                        edge.source = resolvedSource;
                    }
                }
            }
            // ✅ STEP 2: Check if target node exists
            let targetNode = nodeMap.get(edge.target);
            if (!targetNode) {
                // Try to resolve logical ID
                const resolvedTarget = nodeIdResolver_1.nodeIdResolver.resolve(edge.target);
                if (resolvedTarget) {
                    targetNode = nodeMap.get(resolvedTarget);
                    if (targetNode) {
                        console.log(`[EdgeSanitizer] ✅ Resolved target ID: ${edge.target} → ${resolvedTarget}`);
                        edge.target = resolvedTarget;
                    }
                }
            }
            // ✅ STEP 3: Validate nodes exist
            if (!sourceNode || !targetNode) {
                console.warn(`[EdgeSanitizer] ❌ Removing unrecoverable edge: ` +
                    `${edge.source} → ${edge.target} (node missing)`);
                removed.push(edge);
                continue;
            }
            // ✅ STEP 4: Repair edge using EdgeCreationService
            const repairResult = edgeCreationService_1.edgeCreationService.createEdge({
                sourceNodeId: edge.source,
                targetNodeId: edge.target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                sourceNode,
                targetNode,
                nodes,
                edgeType: edge.type,
                allowRepair: true,
                strict: false,
            });
            if (repairResult.success && repairResult.edge) {
                if (repairResult.repairs.length > 0) {
                    repaired.push({
                        edge: repairResult.edge,
                        repairs: repairResult.repairs,
                    });
                    console.log(`[EdgeSanitizer] 🔧 Repaired edge: ${edge.source} → ${edge.target} ` +
                        `(${repairResult.repairs.length} repair(s))`);
                }
                sanitized.push(repairResult.edge);
            }
            else {
                console.warn(`[EdgeSanitizer] ❌ Removing unrecoverable edge: ` +
                    `${edge.source} → ${edge.target} (${repairResult.error})`);
                removed.push(edge);
            }
        }
        const stats = {
            total: edges.length,
            valid: sanitized.length - repaired.length,
            repaired: repaired.length,
            removed: removed.length,
        };
        console.log(`[EdgeSanitizer] ✅ Sanitization complete: ` +
            `${stats.valid} valid, ${stats.repaired} repaired, ${stats.removed} removed`);
        return {
            edges: sanitized,
            removed,
            repaired,
            stats,
        };
    }
    /**
     * Quick validation check (doesn't repair, just validates)
     */
    validate(edges, nodes) {
        const valid = [];
        const invalid = [];
        const nodeMap = new Map();
        nodes.forEach(node => {
            nodeMap.set(node.id, node);
        });
        for (const edge of edges) {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (!sourceNode) {
                invalid.push({
                    edge,
                    reason: `Source node not found: ${edge.source}`,
                });
                continue;
            }
            if (!targetNode) {
                invalid.push({
                    edge,
                    reason: `Target node not found: ${edge.target}`,
                });
                continue;
            }
            valid.push(edge);
        }
        return { valid, invalid };
    }
}
exports.EdgeSanitizer = EdgeSanitizer;
// Export singleton instance
exports.edgeSanitizer = new EdgeSanitizer();
