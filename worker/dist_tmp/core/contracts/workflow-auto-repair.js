"use strict";
/**
 * Workflow Auto-Repair System
 * Automatically fixes common workflow errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowAutoRepair = void 0;
const node_schema_registry_1 = require("./node-schema-registry");
const unified_node_type_normalizer_1 = require("../utils/unified-node-type-normalizer");
/**
 * Workflow Auto-Repair System
 * Attempts to automatically fix common workflow errors
 */
class WorkflowAutoRepair {
    constructor() {
        this.schemaRegistry = node_schema_registry_1.NodeSchemaRegistry.getInstance();
    }
    /**
     * Repair a workflow by applying common fixes
     */
    repair(workflow) {
        const fixes = [];
        let nodes = [...workflow.nodes];
        let edges = [...workflow.edges];
        // Fix 1: Ensure schedule nodes have cron
        nodes = nodes.map(node => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
            if (nodeType === 'schedule') {
                const config = node.data?.config || node.data || {};
                if (!config.cron) {
                    fixes.push(`Added default cron to schedule node: ${node.id}`);
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            config: {
                                ...config,
                                cron: '0 9 * * *' // Default to 9 AM daily
                            }
                        }
                    };
                }
            }
            return node;
        });
        // Fix 2: Fix orphan nodes (connect to trigger if logical)
        const triggers = nodes.filter(n => {
            const type = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(n);
            return ['manual_trigger', 'schedule', 'webhook', 'chat_trigger'].includes(type);
        });
        if (triggers.length > 0) {
            const mainTrigger = triggers[0];
            // NOTE: Auto-connecting orphans directly to the trigger breaks strict linear flow
            // (it gives the trigger multiple outgoing edges). We've moved orphan handling into
            // the connection builder, so here we only log potential orphans for diagnostics.
            nodes.forEach(node => {
                if (node.id !== mainTrigger.id) {
                    const hasIncoming = edges.some(e => e.target === node.id);
                    if (!hasIncoming) {
                        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
                        if (!['manual_trigger', 'schedule', 'webhook', 'chat_trigger'].includes(nodeType)) {
                            fixes.push(`Orphan node ${node.id} (${nodeType}) detected during auto-repair (no auto-connection to trigger; handled by linear connection logic).`);
                        }
                    }
                }
            });
        }
        // Fix 3: Fix edge port names
        edges = edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode)
                return edge;
            const sourceType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(sourceNode);
            const targetType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(targetNode);
            let modified = false;
            const newEdge = { ...edge };
            // Fix for manual_trigger output
            if (sourceType === 'manual_trigger' && edge.sourceHandle === 'data') {
                newEdge.sourceHandle = 'inputData';
                modified = true;
                fixes.push(`Fixed manual_trigger output port from 'data' to 'inputData' for edge ${edge.id}`);
            }
            // Fix for slack input
            if (targetType === 'slack_message' && edge.targetHandle === 'input') {
                newEdge.targetHandle = 'text';
                modified = true;
                fixes.push(`Fixed slack input port from 'input' to 'text' for edge ${edge.id}`);
            }
            return modified ? newEdge : edge;
        });
        return {
            repairedWorkflow: { nodes, edges },
            fixes,
            remainingErrors: []
        };
    }
    /**
     * Validate and repair workflow with multiple iterations
     */
    validateAndRepair(workflow, maxAttempts = 3) {
        const allFixes = [];
        const allErrors = [];
        let currentWorkflow = JSON.parse(JSON.stringify(workflow));
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Validate
            const validation = this.validateWorkflow(currentWorkflow);
            if (validation.valid) {
                // Ensure all nodes have required label field
                const repairedNodes = currentWorkflow.nodes.map(node => ({
                    ...node,
                    data: {
                        ...node.data,
                        label: node.data?.label || node.data?.type || 'Node'
                    }
                }));
                return {
                    valid: true,
                    repairedWorkflow: {
                        ...currentWorkflow,
                        nodes: repairedNodes
                    },
                    fixes: allFixes,
                    errors: []
                };
            }
            // Repair
            const repairResult = this.repair(currentWorkflow);
            allFixes.push(...repairResult.fixes);
            // Ensure labels and category are present in repaired workflow
            currentWorkflow = {
                ...repairResult.repairedWorkflow,
                nodes: repairResult.repairedWorkflow.nodes.map(node => ({
                    ...node,
                    data: {
                        ...node.data,
                        label: node.data?.label || node.data?.type || 'Node',
                        category: node.data?.category || '',
                        config: node.data?.config || {}
                    }
                }))
            };
            // If no fixes were made in this iteration, break
            if (repairResult.fixes.length === 0) {
                allErrors.push(...validation.errors.map(e => e.message));
                break;
            }
        }
        // Final validation
        const finalValidation = this.validateWorkflow(currentWorkflow);
        // Ensure all nodes have required fields
        const finalNodes = currentWorkflow.nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                label: node.data?.label || node.data?.type || 'Node',
                category: node.data?.category || '',
                config: node.data?.config || {}
            }
        }));
        return {
            valid: finalValidation.valid,
            repairedWorkflow: {
                ...currentWorkflow,
                nodes: finalNodes
            },
            fixes: allFixes,
            errors: finalValidation.errors.map(e => e.message)
        };
    }
    /**
     * Validate workflow
     */
    validateWorkflow(workflow) {
        const errors = [];
        const schemaRegistry = node_schema_registry_1.NodeSchemaRegistry.getInstance();
        // Validate nodes
        workflow.nodes.forEach((node) => {
            const validation = schemaRegistry.validateNode(node);
            if (!validation.valid) {
                validation.errors.forEach(error => {
                    errors.push({
                        type: 'node_validation',
                        message: `Node ${node.id}: ${error}`,
                        nodeId: node.id,
                        recoverable: true
                    });
                });
            }
        });
        // Validate edges
        workflow.edges.forEach((edge) => {
            const sourceNode = workflow.nodes.find((n) => n.id === edge.source);
            const targetNode = workflow.nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) {
                errors.push({
                    type: 'edge_validation',
                    message: `Edge ${edge.id}: Missing source or target node`,
                    edgeId: edge.id,
                    recoverable: false
                });
                return;
            }
            const validation = schemaRegistry.validateEdge(sourceNode, targetNode, edge);
            if (!validation.valid) {
                validation.errors.forEach(error => {
                    errors.push({
                        type: 'edge_validation',
                        message: `Edge ${edge.id}: ${error}`,
                        edgeId: edge.id,
                        recoverable: true
                    });
                });
            }
        });
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Get default output port for trigger
     */
    getTriggerOutputPort(triggerType) {
        if (triggerType === 'manual_trigger') {
            return 'inputData';
        }
        return 'output';
    }
    /**
     * Get default input port for node
     */
    getDefaultInputPort(nodeType) {
        if (nodeType === 'slack_message') {
            return 'text';
        }
        return 'input';
    }
}
exports.WorkflowAutoRepair = WorkflowAutoRepair;
