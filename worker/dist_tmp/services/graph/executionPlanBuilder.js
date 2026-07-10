"use strict";
/**
 * ✅ EXECUTION PLAN BUILDER - Deterministic Execution Order
 *
 * Constructs a strict linear or DAG execution plan based on intent.
 * Guarantees:
 * - Trigger is always first
 * - All nodes are included in plan
 * - Deterministic ordering
 * - No orphan nodes possible
 *
 * Architecture:
 * - Sorts nodes by intent priority
 * - Ensures trigger is first
 * - Builds linear execution plan
 * - Returns ordered node IDs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executionPlanBuilder = exports.ExecutionPlanBuilder = void 0;
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
/**
 * ✅ Execution Plan Builder
 *
 * Builds deterministic execution plan from nodes and intent
 */
class ExecutionPlanBuilder {
    /**
     * Build execution plan from nodes and intent
     *
     * Guarantees:
     * - Trigger is always first
     * - All nodes included
     * - Deterministic ordering
     */
    buildExecutionPlan(nodes, intent) {
        const errors = [];
        if (nodes.length === 0) {
            return {
                orderedNodeIds: [],
                triggerNodeId: '',
                nodeTypes: [],
                isValid: false,
                errors: ['No nodes provided'],
            };
        }
        // ✅ STEP 1: Find or ensure trigger node
        const triggerNode = this.findOrCreateTrigger(nodes);
        if (!triggerNode) {
            return {
                orderedNodeIds: [],
                triggerNodeId: '',
                nodeTypes: [],
                isValid: false,
                errors: ['No trigger node found and could not create one'],
            };
        }
        // Soft guard: this linear planner is a legacy/fallback path and is not
        // responsible for creating typed branch edges. Prefer unified-graph-orchestrator
        // for workflows that contain explicit branching nodes.
        const hasBranchingNodes = nodes.some((node) => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
            return nodeType === 'if_else' || nodeType === 'switch';
        });
        if (hasBranchingNodes) {
            console.warn('[ExecutionPlanBuilder] Branching nodes detected (if_else/switch). ' +
                'Prefer unified graph orchestrator for branch edge construction.');
        }
        // ✅ STEP 2: Sort nodes by intent priority
        const sortedNodes = this.sortNodesByIntentPriority(nodes, triggerNode, intent);
        // ✅ STEP 3: Build ordered plan (trigger first, then sorted nodes)
        const orderedNodeIds = [triggerNode.id];
        const nodeTypes = [(0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(triggerNode)];
        // Add all other nodes in sorted order
        for (const node of sortedNodes) {
            if (node.id !== triggerNode.id) {
                orderedNodeIds.push(node.id);
                nodeTypes.push((0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node));
            }
        }
        // ✅ STEP 4: Validate plan
        const validation = this.validateExecutionPlan(orderedNodeIds, nodes);
        if (!validation.valid) {
            errors.push(...validation.errors);
        }
        return {
            orderedNodeIds,
            triggerNodeId: triggerNode.id,
            nodeTypes,
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Find trigger node or create one if missing
     */
    findOrCreateTrigger(nodes) {
        // Find existing trigger
        const triggerNodes = nodes.filter(node => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
            return nodeType.includes('trigger') ||
                nodeType === 'manual_trigger' ||
                nodeType === 'webhook' ||
                nodeType === 'schedule' ||
                nodeType === 'interval';
        });
        if (triggerNodes.length > 0) {
            return triggerNodes[0];
        }
        // Create manual_trigger if none exists
        const { randomUUID } = require('crypto');
        const triggerNode = {
            id: randomUUID(),
            type: 'manual_trigger',
            data: {
                type: 'manual_trigger',
                label: 'Manual Trigger',
                category: 'trigger',
                config: {},
            },
            position: { x: 0, y: 0 },
        };
        console.log('[ExecutionPlanBuilder] ✅ Created manual_trigger (none existed)');
        return triggerNode;
    }
    /**
     * Sort nodes by intent priority
     *
     * Priority order:
     * 1. Trigger (already handled)
     * 2. Data sources (read operations)
     * 3. Transformations (processing)
     * 4. Actions (write operations)
     * 5. Outputs (final nodes)
     */
    sortNodesByIntentPriority(nodes, triggerNode, intent) {
        const sorted = [...nodes].filter(n => n.id !== triggerNode.id);
        // Sort by node category/type priority
        sorted.sort((a, b) => {
            const typeA = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(a);
            const typeB = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(b);
            const priorityA = this.getNodePriority(typeA);
            const priorityB = this.getNodePriority(typeB);
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            // Same priority: maintain original order
            return 0;
        });
        return sorted;
    }
    /**
     * Get priority for node type (lower = earlier in execution)
     */
    getNodePriority(nodeType) {
        // Priority 1: Data sources (read)
        if (['google_sheets', 'postgresql', 'db', 'database_read', 'http_request'].includes(nodeType)) {
            return 1;
        }
        // Priority 2: Transformations (processing)
        if (['javascript', 'function', 'if_else', 'switch', 'filter', 'loop'].includes(nodeType)) {
            return 2;
        }
        // Priority 3: AI/ML operations
        if (['ai_chat_model', 'ai_agent', 'ollama', 'openai_gpt', 'anthropic_claude'].includes(nodeType)) {
            return 3;
        }
        // Priority 4: Actions (write)
        if (['google_gmail', 'slack_message', 'email', 'discord', 'telegram'].includes(nodeType)) {
            return 4;
        }
        // Priority 5: Outputs (final)
        if (['log_output', 'http_response'].includes(nodeType)) {
            return 5;
        }
        // Default priority
        return 3;
    }
    /**
     * Validate execution plan
     */
    validateExecutionPlan(orderedNodeIds, nodes) {
        const errors = [];
        // Check: All nodes included
        const planNodeIds = new Set(orderedNodeIds);
        const allNodeIds = new Set(nodes.map(n => n.id));
        for (const nodeId of allNodeIds) {
            if (!planNodeIds.has(nodeId)) {
                errors.push(`Node ${nodeId} not in execution plan`);
            }
        }
        // Check: No duplicates
        if (orderedNodeIds.length !== new Set(orderedNodeIds).size) {
            errors.push('Execution plan contains duplicate node IDs');
        }
        // Check: At least one node (trigger)
        if (orderedNodeIds.length === 0) {
            errors.push('Execution plan is empty');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
exports.ExecutionPlanBuilder = ExecutionPlanBuilder;
// Export singleton instance
exports.executionPlanBuilder = new ExecutionPlanBuilder();
