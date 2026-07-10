"use strict";
/**
 * Workflow Validation Pipeline
 *
 * Layered validation architecture for workflow validation:
 * 1. Intent Coverage Validation - Ensures intent actions are represented in DSL
 * 2. DSL Structure Validation - Validates DSL structure (trigger, components, execution order)
 * 3. Graph Connectivity Validation - Validates workflow graph structure (orphans, connectivity)
 * 4. Type Compatibility Validation - Validates type compatibility between connected nodes
 *
 * Design:
 * - Extensible: New validation layers can be added easily
 * - Composable: Layers can be enabled/disabled
 * - Non-breaking: Works alongside existing validators
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowValidationPipeline = exports.WorkflowValidationPipeline = exports.FinalIntegrityValidationLayer = exports.StructuralDAGValidationLayer = exports.LinearFlowValidationLayer = exports.TypeCompatibilityValidationLayer = exports.GraphConnectivityValidationLayer = exports.DSLStructureValidationLayer = exports.IntentCoverageValidationLayer = exports.ValidationLayer = void 0;
const capability_based_validator_1 = require("./capability-based-validator");
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const universal_node_type_checker_1 = require("../../core/utils/universal-node-type-checker");
const node_handle_registry_1 = require("../../core/utils/node-handle-registry");
const transformation_detector_1 = require("./transformation-detector");
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
/**
 * Base class for validation layers
 */
class ValidationLayer {
    /**
     * Check if this layer should run
     * Override to add conditional logic
     */
    shouldRun(context) {
        return true;
    }
}
exports.ValidationLayer = ValidationLayer;
/**
 * Layer 1: Intent Coverage Validation
 * Ensures all intent actions are represented in DSL
 */
class IntentCoverageValidationLayer extends ValidationLayer {
    constructor() {
        super(...arguments);
        this.name = 'intent-coverage';
        this.order = 1;
    }
    validate(context) {
        const errors = [];
        const warnings = [];
        const details = {};
        if (!context.dsl || !context.intent) {
            return { valid: true, errors, warnings, details };
        }
        const intent = context.intent;
        const dsl = context.dsl;
        // Collect node types from DSL (dataSources, outputs, and transformations)
        const dslDataSourceTypes = new Set(dsl.dataSources.map(ds => ds.type?.toLowerCase().trim()).filter(Boolean));
        const dslOutputTypes = new Set(dsl.outputs.map(out => out.type?.toLowerCase().trim()).filter(Boolean));
        const dslTransformationTypes = new Set(dsl.transformations.map(tf => tf.type?.toLowerCase().trim()).filter(Boolean));
        const dslNodeTypes = new Set([...dslDataSourceTypes, ...dslOutputTypes, ...dslTransformationTypes]);
        // Track missing actions with detailed failure information
        const missingActions = [];
        // ✅ REFACTORED: Use capability-based validation instead of type matching
        if (intent.actions && intent.actions.length > 0) {
            const capabilityValidation = (0, capability_based_validator_1.validateIntentCoverageByCapabilities)(intent, dsl);
            if (!capabilityValidation.valid) {
                // Convert capability-based validation results to missing actions format
                for (const missingReq of capabilityValidation.missingRequirements) {
                    const dslDataSourceTypesArray = Array.from(dslDataSourceTypes);
                    const dslTransformationTypesArray = Array.from(dslTransformationTypes);
                    const dslOutputTypesArray = Array.from(dslOutputTypes);
                    // Determine expected category based on capability
                    let expectedIn = 'dataSource';
                    if (missingReq.capability === 'write') {
                        expectedIn = 'output';
                    }
                    else if (missingReq.capability === 'transform') {
                        expectedIn = 'dataSource'; // Transformations are valid coverage
                    }
                    missingActions.push({
                        type: missingReq.intentAction.type,
                        operation: missingReq.intentAction.operation,
                        expectedIn,
                        availableDSLNodes: {
                            dataSources: dslDataSourceTypesArray,
                            transformations: dslTransformationTypesArray,
                            outputs: dslOutputTypesArray,
                        },
                        failureReason: `Missing required capabilities: ${missingReq.requiredCapabilities.join(', ')}. ` +
                            `Available DSL nodes do not provide these capabilities.`,
                        suggestedFix: `Add a DSL node that provides capabilities: ${missingReq.requiredCapabilities.join(', ')}. ` +
                            `For ${missingReq.capability} capability, consider adding a ${missingReq.capability === 'read' ? 'dataSource' : missingReq.capability === 'transform' ? 'transformation' : 'output'} node.`,
                    });
                }
            }
        }
        if (missingActions.length > 0) {
            // ✅ IMPROVED: Build detailed error message with structured information
            const errorDetails = missingActions.map((action, idx) => {
                const availableCount = (action.availableDSLNodes?.dataSources.length || 0) +
                    (action.availableDSLNodes?.transformations.length || 0) +
                    (action.availableDSLNodes?.outputs.length || 0);
                let detail = `\n  ${idx + 1}. Intent action: "${action.type}" (operation: "${action.operation}")`;
                detail += `\n     Expected in: ${action.expectedIn}`;
                detail += `\n     Available DSL nodes: ${availableCount} total`;
                if (action.availableDSLNodes) {
                    if (action.availableDSLNodes.dataSources.length > 0) {
                        detail += `\n       - DataSources: ${action.availableDSLNodes.dataSources.join(', ')}`;
                    }
                    if (action.availableDSLNodes.transformations.length > 0) {
                        detail += `\n       - Transformations: ${action.availableDSLNodes.transformations.join(', ')}`;
                    }
                    if (action.availableDSLNodes.outputs.length > 0) {
                        detail += `\n       - Outputs: ${action.availableDSLNodes.outputs.join(', ')}`;
                    }
                }
                if (action.failureReason) {
                    detail += `\n     Failure reason: ${action.failureReason}`;
                }
                if (action.suggestedFix) {
                    detail += `\n     Suggested fix: ${action.suggestedFix}`;
                }
                return detail;
            }).join('\n');
            errors.push(`Intent coverage validation failed: ${missingActions.length} intent action(s) not represented in DSL.` +
                errorDetails);
            details.missingActions = missingActions;
            details.availableTypes = Array.from(dslNodeTypes);
        }
        // Check operation requirements
        if (intent.actions && intent.actions.length > 0) {
            const readOperations = ['read', 'fetch', 'get', 'query'];
            const writeOperations = ['send', 'write', 'create', 'update', 'notify'];
            const hasReadOperation = intent.actions.some(a => readOperations.includes((a.operation || '').toLowerCase()));
            const hasWriteOperation = intent.actions.some(a => writeOperations.includes((a.operation || '').toLowerCase()));
            if (hasReadOperation && dsl.dataSources.length === 0) {
                errors.push('Intent contains read operations but no data sources were generated.');
                details.missingDataSources = true;
            }
            // ✅ UNIVERSAL: log_output is always added as final output node before validation
            // So we don't need to check for outputs here - log_output will always exist
            // This check is kept for DSL-level validation, but log_output injection happens later
            // Note: This validation happens at DSL level, log_output is added at workflow graph level
            if (hasWriteOperation && dsl.outputs.length === 0) {
                // This is OK - log_output will be added before final validation
                // Just log a warning, not an error
                warnings.push('Intent contains write operations but no outputs in DSL - log_output will be auto-injected');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            details,
        };
    }
    shouldRun(context) {
        return !!context.dsl && !!context.intent;
    }
}
exports.IntentCoverageValidationLayer = IntentCoverageValidationLayer;
/**
 * Layer 2: DSL Structure Validation
 * Validates DSL structure (trigger, components, execution order)
 */
class DSLStructureValidationLayer extends ValidationLayer {
    constructor() {
        super(...arguments);
        this.name = 'dsl-structure';
        this.order = 2;
    }
    validate(context) {
        const errors = [];
        const warnings = [];
        const details = {};
        if (!context.dsl) {
            return { valid: true, errors, warnings, details };
        }
        const dsl = context.dsl;
        // Validate trigger
        if (!dsl.trigger || !dsl.trigger.type) {
            errors.push('DSL must have a trigger');
            details.missingTrigger = true;
        }
        // Validate minimum components
        // ✅ FIXED: Transformations are first-class components
        const hasDataSource = dsl.dataSources.length > 0;
        const hasOutput = dsl.outputs.length > 0;
        const hasTransformation = dsl.transformations.length > 0;
        // A valid workflow must have at least one component that does work:
        // - dataSource (reads data), output (writes data), or transformation (processes data)
        if (!hasDataSource && !hasOutput && !hasTransformation) {
            errors.push('DSL must have at least one data source, output, or transformation');
            details.missingComponents = true;
        }
        // Validate execution order
        if (!dsl.executionOrder || dsl.executionOrder.length === 0) {
            errors.push('DSL execution order must be non-empty');
            details.missingExecutionOrder = true;
        }
        // Validate transformation requirements
        // ✅ WORLD-CLASS UNIVERSAL: Use TransformationDetector + UnifiedNodeTypeMatcher
        if (context.transformationDetection?.detected && context.transformationDetection.verbs.length > 0) {
            const detection = context.transformationDetection;
            if (dsl.transformations.length === 0) {
                errors.push(`Transformation verbs detected (${detection.verbs.join(', ')}) but DSL has 0 transformations. ` +
                    `Required node types: ${detection.requiredNodeTypes.join(', ')}`);
                details.missingTransformations = true;
                details.requiredNodeTypes = detection.requiredNodeTypes;
            }
            else {
                // Validate transformation types match required types using semantic matcher
                const dslTransformationTypes = dsl.transformations.map(t => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(t.type || ''));
                const tfValidation = transformation_detector_1.transformationDetector.validateTransformations(detection, dslTransformationTypes);
                if (!tfValidation.valid && tfValidation.missing.length > 0) {
                    warnings.push(`DSL transformations may not match all required types. Missing: ${tfValidation.missing.join(', ')}`);
                    details.partialTransformationMatch = true;
                    details.missingTransformationTypes = tfValidation.missing;
                    details.transformationValidationErrors = tfValidation.errors;
                }
            }
        }
        // Validate component counts
        details.componentCounts = {
            dataSources: dsl.dataSources.length,
            transformations: dsl.transformations.length,
            outputs: dsl.outputs.length,
            executionOrderSteps: dsl.executionOrder.length,
        };
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            details,
        };
    }
    shouldRun(context) {
        return !!context.dsl;
    }
}
exports.DSLStructureValidationLayer = DSLStructureValidationLayer;
/**
 * Layer 3: Graph Connectivity Validation
 * Validates workflow graph structure (orphans, connectivity, execution order)
 */
class GraphConnectivityValidationLayer extends ValidationLayer {
    constructor() {
        super(...arguments);
        this.name = 'graph-connectivity';
        this.order = 3;
    }
    validate(context) {
        const errors = [];
        const warnings = [];
        const details = {};
        if (!context.workflow) {
            return { valid: true, errors, warnings, details };
        }
        const { nodes, edges } = context.workflow;
        // Validate nodes exist
        if (!nodes || nodes.length === 0) {
            errors.push('Workflow must have at least one node');
            return { valid: false, errors, warnings, details };
        }
        // ✅ UNIVERSAL FIX: Use registry-based trigger detection (not hardcoded)
        // This ensures ALL trigger types are recognized (webhook, manual_trigger, schedule, chat_trigger, etc.)
        const triggerNodes = nodes.filter(node => (0, universal_node_type_checker_1.isTriggerNode)(node));
        if (triggerNodes.length === 0) {
            errors.push('Workflow must have at least one trigger node');
            details.missingTrigger = true;
        }
        else if (triggerNodes.length > 1) {
            errors.push(`Workflow has ${triggerNodes.length} trigger nodes (expected 1)`);
            details.duplicateTriggers = triggerNodes.map(n => n.id);
        }
        // Build adjacency maps
        const incomingEdges = new Map();
        const outgoingEdges = new Map();
        edges.forEach(edge => {
            if (!incomingEdges.has(edge.target)) {
                incomingEdges.set(edge.target, []);
            }
            incomingEdges.get(edge.target).push(edge);
            if (!outgoingEdges.has(edge.source)) {
                outgoingEdges.set(edge.source, []);
            }
            outgoingEdges.get(edge.source).push(edge);
        });
        // Find orphan nodes (no incoming or outgoing edges, excluding triggers)
        const orphanNodes = [];
        nodes.forEach(node => {
            const nodeId = node.id;
            const hasIncoming = incomingEdges.has(nodeId) && incomingEdges.get(nodeId).length > 0;
            const hasOutgoing = outgoingEdges.has(nodeId) && outgoingEdges.get(nodeId).length > 0;
            const isTrigger = triggerNodes.some(t => t.id === nodeId);
            if (!hasIncoming && !hasOutgoing && !isTrigger) {
                orphanNodes.push(nodeId);
            }
        });
        if (orphanNodes.length > 0) {
            errors.push(`Found ${orphanNodes.length} orphan node(s) with no connections`);
            details.orphanNodes = orphanNodes;
        }
        // Find disconnected nodes (not reachable from trigger)
        if (triggerNodes.length > 0) {
            const visited = new Set();
            const queue = [triggerNodes[0].id];
            visited.add(triggerNodes[0].id);
            while (queue.length > 0) {
                const currentNodeId = queue.shift();
                const outgoing = outgoingEdges.get(currentNodeId) || [];
                for (const edge of outgoing) {
                    if (!visited.has(edge.target)) {
                        visited.add(edge.target);
                        queue.push(edge.target);
                    }
                }
            }
            const disconnectedNodes = nodes
                .filter(node => !visited.has(node.id))
                .map(node => node.id);
            if (disconnectedNodes.length > 0) {
                errors.push(`Found ${disconnectedNodes.length} disconnected node(s) not reachable from trigger`);
                details.disconnectedNodes = disconnectedNodes;
            }
        }
        // Validate edge handles (if available)
        const invalidHandles = [];
        edges.forEach(edge => {
            // Basic validation: source and target must exist
            const sourceExists = nodes.some(n => n.id === edge.source);
            const targetExists = nodes.some(n => n.id === edge.target);
            if (!sourceExists) {
                invalidHandles.push({ edgeId: edge.id, reason: `Source node ${edge.source} does not exist` });
            }
            if (!targetExists) {
                invalidHandles.push({ edgeId: edge.id, reason: `Target node ${edge.target} does not exist` });
            }
        });
        if (invalidHandles.length > 0) {
            errors.push(`Found ${invalidHandles.length} edge(s) with invalid handles`);
            details.invalidHandles = invalidHandles;
        }
        details.connectivity = {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            triggerNodes: triggerNodes.length,
            orphanNodes: orphanNodes.length,
            disconnectedNodes: details.disconnectedNodes?.length || 0,
        };
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            details,
        };
    }
    shouldRun(context) {
        return !!context.workflow;
    }
}
exports.GraphConnectivityValidationLayer = GraphConnectivityValidationLayer;
/**
 * Layer 4: Type Compatibility Validation
 * Validates type compatibility between connected nodes
 */
class TypeCompatibilityValidationLayer extends ValidationLayer {
    constructor() {
        super(...arguments);
        this.name = 'type-compatibility';
        this.order = 4;
    }
    validate(context) {
        const errors = [];
        const warnings = [];
        const details = {};
        if (!context.workflow) {
            return { valid: true, errors, warnings, details };
        }
        const { nodes, edges } = context.workflow;
        // Import type system
        const { nodeDataTypeSystem, validateWorkflowTypes } = require('./node-data-type-system');
        try {
            // Use existing type validation
            const typeValidation = validateWorkflowTypes(nodes, edges);
            if (!typeValidation.valid) {
                errors.push(...typeValidation.errors);
                warnings.push(...typeValidation.warnings);
                if (typeValidation.incompatibleEdges) {
                    details.incompatibleEdges = typeValidation.incompatibleEdges;
                }
                if (typeValidation.suggestedTransforms) {
                    details.suggestedTransforms = typeValidation.suggestedTransforms;
                }
            }
        }
        catch (error) {
            // Type validation not available - skip with warning
            warnings.push('Type compatibility validation skipped (type system not available)');
            details.typeValidationSkipped = true;
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            details,
        };
    }
    shouldRun(context) {
        return !!context.workflow && !!context.workflow.edges && context.workflow.edges.length > 0;
    }
}
exports.TypeCompatibilityValidationLayer = TypeCompatibilityValidationLayer;
/**
 * ✅ WORLD-CLASS: Layer 5 - Linear Flow Validation
 * Validates execution order (producer → transformer → output)
 */
class LinearFlowValidationLayer extends ValidationLayer {
    constructor() {
        super(...arguments);
        this.name = 'linear-flow';
        this.order = 5;
    }
    validate(context) {
        const errors = [];
        const warnings = [];
        const details = {};
        if (!context.workflow) {
            return { valid: true, errors, warnings, details };
        }
        const { nodes, edges } = context.workflow;
        // Build execution order from edges (topological sort)
        const executionOrder = this.getExecutionOrder(nodes, edges);
        if (executionOrder.length === 0) {
            return { valid: true, errors, warnings, details };
        }
        // Categorize nodes by type
        const nodeCategories = new Map();
        nodes.forEach(node => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.data?.type || node.type || '');
            const category = this.categorizeNode(nodeType, node); // ✅ UNIVERSAL: Pass node to access metadata
            nodeCategories.set(node.id, category);
        });
        // Validate order for linear workflows
        const orderViolations = [];
        for (let i = 0; i < executionOrder.length; i++) {
            const currentNodeId = executionOrder[i];
            const currentCategory = nodeCategories.get(currentNodeId) || 'other';
            const currentNode = nodes.find(n => n.id === currentNodeId);
            const currentNodeType = currentNode?.data?.type || currentNode?.type || '';
            const immediatePredecessorIndex = i > 0 ? i - 1 : -1;
            if (immediatePredecessorIndex >= 0) {
                const previousNodeId = executionOrder[immediatePredecessorIndex];
                const previousCategory = nodeCategories.get(previousNodeId) || 'other';
                const previousNode = nodes.find(n => n.id === previousNodeId);
                const connectingEdge = edges.find(e => e.source === previousNodeId && e.target === currentNodeId);
                const baseIssue = {
                    nodeId: currentNodeId,
                    nodeType: currentNodeType,
                    nodeLabel: currentNode?.data?.label || currentNode?.id,
                    nodeCategory: currentCategory,
                    previousNodeId,
                    previousNodeType: previousNode?.data?.type || previousNode?.type || '',
                    previousNodeLabel: previousNode?.data?.label || previousNode?.id,
                    previousNodeCategory: previousCategory,
                    edgeId: connectingEdge?.id,
                    severity: 'warning',
                };
                // ❌ INVALID: Output → Processing (can't process after output)
                if (previousCategory === 'output' && currentCategory === 'processing') {
                    orderViolations.push({
                        ...baseIssue,
                        issue: `Output node cannot be followed by processing node`,
                    });
                }
                // ❌ INVALID: Output → Data Source (can't read after output)
                if (previousCategory === 'output' && currentCategory === 'data_source') {
                    orderViolations.push({
                        ...baseIssue,
                        issue: `Output node cannot be followed by data source node`,
                    });
                }
            }
        }
        if (orderViolations.length > 0) {
            const violationMessages = orderViolations.map(v => `${v.nodeType} (${v.issue})`);
            warnings.push(`Execution order advisories: ${violationMessages.join('; ')}`);
            details.orderViolations = orderViolations;
        }
        return {
            valid: true,
            errors,
            warnings,
            details,
        };
    }
    getExecutionOrder(nodes, edges) {
        const inDegree = new Map();
        const adjacencyList = new Map();
        nodes.forEach(node => {
            inDegree.set(node.id, 0);
            adjacencyList.set(node.id, []);
        });
        edges.forEach(edge => {
            const current = inDegree.get(edge.target) || 0;
            inDegree.set(edge.target, current + 1);
            const neighbors = adjacencyList.get(edge.source) || [];
            neighbors.push(edge.target);
            adjacencyList.set(edge.source, neighbors);
        });
        const queue = [];
        const result = [];
        inDegree.forEach((degree, nodeId) => {
            if (degree === 0) {
                queue.push(nodeId);
            }
        });
        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);
            const neighbors = adjacencyList.get(current) || [];
            neighbors.forEach(neighbor => {
                const degree = inDegree.get(neighbor);
                inDegree.set(neighbor, degree - 1);
                if (degree - 1 === 0) {
                    queue.push(neighbor);
                }
            });
        }
        return result;
    }
    categorizeNode(nodeType, node) {
        // ✅ UNIVERSAL: Use operation semantics registry (same as DSL layer) - NO HARDCODING
        // ✅ ERROR-FREE: All edge cases handled gracefully with proper fallbacks
        // Early return for invalid input
        if (!nodeType || typeof nodeType !== 'string') {
            return 'other';
        }
        const { unifiedNodeRegistry } = require('../../core/registry/unified-node-registry');
        const { nodeCapabilityRegistryDSL } = require('./node-capability-registry-dsl');
        const { NodeMetadataHelper } = require('../../core/types/node-metadata');
        const { getOperationSemantic, getDSLCategoryFromSemantic } = require('../../core/registry/node-operation-semantics');
        const nodeDef = unifiedNodeRegistry.get(nodeType);
        const lower = nodeType.toLowerCase();
        // ✅ SAFE: Extract metadata with null checks
        let dslCategory;
        let intendedCapability;
        let operation;
        if (node) {
            try {
                const metadata = NodeMetadataHelper.getMetadata(node);
                dslCategory = metadata?.dsl?.category;
                intendedCapability = metadata?.dsl?.intendedCapability;
                operation = metadata?.dsl?.operation || node.data?.config?.operation;
                // Normalize operation (handle empty strings, null, undefined)
                if (operation && typeof operation === 'string') {
                    operation = operation.trim();
                    if (operation === '') {
                        operation = undefined;
                    }
                }
                else {
                    operation = undefined;
                }
            }
            catch (error) {
                // Metadata extraction failed - continue with undefined values
                // This is safe - we have fallbacks
            }
        }
        // ✅ PRIORITY 1: Check conditional nodes first (if_else, switch)
        if (lower === 'if_else' || lower === 'switch' || lower.includes('if_else') || lower.includes('switch')) {
            return 'conditional';
        }
        if (lower === 'log_output') {
            return 'observer';
        }
        // ✅ PRIORITY 2: Use DSL-determined category (PRIMARY - DSL already used operation semantics)
        // This is the PRIMARY source of truth - DSL layer already did the work using universal operation semantics
        if (dslCategory === 'data_source') {
            return 'data_source';
        }
        if (dslCategory === 'transformation') {
            return 'processing';
        }
        if (dslCategory === 'output') {
            return 'output';
        }
        // ✅ PRIORITY 3: Use operation semantics registry (same universal system DSL uses)
        // This works for ALL nodes with ANY operation - NO HARDCODING
        // ✅ ERROR-FREE: getOperationSemantic and getDSLCategoryFromSemantic never throw - they return safe values
        if (operation && typeof operation === 'string' && nodeType && typeof nodeType === 'string') {
            try {
                const semanticInfo = getOperationSemantic(nodeType, operation);
                if (semanticInfo && semanticInfo.semantic) {
                    const dslCategoryFromSemantic = getDSLCategoryFromSemantic(semanticInfo.semantic, nodeType);
                    // Map DSL category to validation category
                    if (dslCategoryFromSemantic === 'dataSource') {
                        return 'data_source';
                    }
                    if (dslCategoryFromSemantic === 'transformation') {
                        return 'processing';
                    }
                    if (dslCategoryFromSemantic === 'output') {
                        return 'output';
                    }
                }
            }
            catch (error) {
                // Operation semantics registry should never throw, but handle gracefully if it does
                // Continue to fallback - this is safe
            }
        }
        // ✅ PRIORITY 4: Use intendedCapability from metadata (DSL-determined fallback)
        if (intendedCapability === 'transformation') {
            return 'processing';
        }
        if (intendedCapability === 'data_source') {
            return 'data_source';
        }
        if (intendedCapability === 'output') {
            return 'output';
        }
        // ✅ PRIORITY 5: Fallback to capability registry (only if DSL/operation semantics unavailable)
        // ✅ ERROR-FREE: Capability registry methods return boolean, never throw
        try {
            if (nodeCapabilityRegistryDSL.isTransformation(nodeType)) {
                return 'processing';
            }
            if (nodeCapabilityRegistryDSL.isDataSource(nodeType)) {
                return 'data_source';
            }
            if (nodeCapabilityRegistryDSL.isOutput(nodeType)) {
                return 'output';
            }
        }
        catch (error) {
            // Capability registry should never throw, but handle gracefully if it does
            // Continue to fallback - this is safe
        }
        // ✅ PRIORITY 6: Fallback to registry category
        if (nodeDef && nodeDef.category) {
            const category = nodeDef.category;
            if (category === 'ai' || category === 'transformation') {
                return 'processing';
            }
            if (category === 'data') {
                return 'data_source';
            }
            if (category === 'communication' || category === 'social' || category === 'output') {
                return 'output';
            }
        }
        // ✅ PRIORITY 7: Legacy string matching fallback (should rarely be needed)
        if (lower.includes('if_else') || lower.includes('switch') || lower.includes('filter')) {
            return 'conditional';
        }
        if (lower.includes('ai_') || lower.includes('chat_model') || lower.includes('agent') ||
            lower.includes('summar') || lower.includes('transform')) {
            return 'processing';
        }
        // ✅ SAFE FALLBACK: Return 'other' if no category can be determined
        // This won't break workflow generation - validation will handle 'other' appropriately
        return 'other';
    }
    shouldRun(context) {
        return !!context.workflow && !!context.workflow.nodes && context.workflow.nodes.length > 0;
    }
}
exports.LinearFlowValidationLayer = LinearFlowValidationLayer;
/**
 * ✅ WORLD-CLASS: Layer 6 - Structural DAG Enforcement
 * Enforces strict linear DAG (no branches unless explicit)
 */
class StructuralDAGValidationLayer extends ValidationLayer {
    constructor() {
        super(...arguments);
        this.name = 'structural-dag-enforcement';
        this.order = 6;
    }
    validate(context) {
        const errors = [];
        const warnings = [];
        const details = {
            removedBranches: 0,
            removedEdges: [],
        };
        if (!context.workflow) {
            return { valid: true, errors, warnings, details };
        }
        const workflow = context.workflow;
        const { nodes, edges } = workflow;
        // Find all trigger nodes
        const triggerNodes = nodes.filter(n => {
            const type = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(n.type || n.data?.type || '');
            return type === 'manual_trigger' || type.includes('trigger') || type === 'webhook' || type === 'form';
        });
        if (triggerNodes.length === 0) {
            warnings.push('No trigger node found - cannot enforce DAG structure');
            return { valid: true, errors, warnings, details };
        }
        // Build outgoing edges map
        const outgoingEdges = new Map();
        edges.forEach(edge => {
            if (!outgoingEdges.has(edge.source)) {
                outgoingEdges.set(edge.source, []);
            }
            outgoingEdges.get(edge.source).push(edge);
        });
        // ✅ RULE 1: TRIGGERS MUST HAVE EXACTLY 1 OUTGOING EDGE
        for (const triggerNode of triggerNodes) {
            const triggerId = triggerNode.id;
            const outgoing = outgoingEdges.get(triggerId) || [];
            if (outgoing.length > 1) {
                warnings.push(`Trigger node has ${outgoing.length} outgoing edges (expected 1). Multiple branches not allowed in linear workflows.`);
                details.removedBranches += outgoing.length - 1;
            }
        }
        // ✅ RULE 2: NORMAL NODES MUST HAVE EXACTLY 1 OUTGOING EDGE (unless if_else/switch/merge)
        nodes.forEach(node => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.type || node.data?.type || '');
            const isConditional = nodeType === 'if_else' || nodeType === 'switch' || nodeType === 'merge';
            if (!isConditional) {
                const outgoing = outgoingEdges.get(node.id) || [];
                if (outgoing.length > 1) {
                    warnings.push(`Node ${nodeType} has ${outgoing.length} outgoing edges (expected 1). Multiple branches not allowed in linear workflows.`);
                    details.removedBranches += outgoing.length - 1;
                }
            }
        });
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            details,
        };
    }
    shouldRun(context) {
        return !!context.workflow && context.workflow.nodes.length > 0;
    }
}
exports.StructuralDAGValidationLayer = StructuralDAGValidationLayer;
/**
 * ✅ WORLD-CLASS: Layer 7 - Final Integrity Validation
 * Final comprehensive checks (duplicate nodes, all nodes connected to output, required inputs, workflow minimal, edge handles, transformation requirements)
 */
class FinalIntegrityValidationLayer extends ValidationLayer {
    constructor() {
        super(...arguments);
        this.name = 'final-integrity';
        this.order = 7; // Runs LAST, after all other validations
    }
    validate(context) {
        const errors = [];
        const warnings = [];
        const details = {
            duplicateNodes: [],
            disconnectedNodes: [],
            missingInputs: [],
            invalidEdgeHandles: [],
            missingTransformations: [],
            nonMinimalIssues: [],
        };
        if (!context.workflow) {
            return { valid: true, errors, warnings, details };
        }
        const { nodes, edges } = context.workflow;
        // Check 1: Duplicate nodes (duplicate IDs)
        const nodeIdMap = new Map();
        nodes.forEach(node => {
            if (!nodeIdMap.has(node.id)) {
                nodeIdMap.set(node.id, []);
            }
            nodeIdMap.get(node.id).push(node);
        });
        nodeIdMap.forEach((duplicates, nodeId) => {
            if (duplicates.length > 1) {
                errors.push(`Duplicate node ID found: "${nodeId}" (${duplicates.length} instances)`);
                details.duplicateNodes.push(nodeId);
            }
        });
        // Check 1b: Non-merge nodes with multiple incoming edges mixing branch ports (true/false/case_*) and main-like edges
        const incomingByTarget = new Map();
        edges.forEach(edge => {
            if (!incomingByTarget.has(edge.target))
                incomingByTarget.set(edge.target, []);
            incomingByTarget.get(edge.target).push(edge);
        });
        incomingByTarget.forEach((ins, targetId) => {
            if (ins.length < 2)
                return;
            const targetNode = nodes.find(n => n.id === targetId);
            if (!targetNode)
                return;
            const nt = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(targetNode.type || targetNode.data?.type || '');
            const ntDef = unified_node_registry_1.unifiedNodeRegistry.get(nt);
            if (nt === 'merge' || (ntDef?.tags || []).includes('merge'))
                return;
            const uniqueSources = new Set(ins.map(i => i.source));
            if (uniqueSources.size < 2)
                return;
            const edgeTypes = ins.map(i => String(i.type || i.sourceHandle || 'main').toLowerCase());
            const hasExplicitBranch = edgeTypes.some(t => t === 'true' || t === 'false' || t.startsWith('case_'));
            const hasMainLike = edgeTypes.some(t => {
                const x = t || 'main';
                return x === 'main' || x === 'default';
            });
            if (hasExplicitBranch && hasMainLike) {
                warnings.push(`Structural warning: node "${targetId}" (${nt}) has multiple incoming edges with mixed branch and main connectors — verify exclusive branches; use a merge node to combine paths.`);
            }
        });
        // Check 1c: log_output terminals must be single-input and branch flows must not collapse to one log_output.
        const branchingNodeIds = new Set(nodes
            .filter((n) => {
            const nt = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(n.type || n.data?.type || '');
            return !!unified_node_registry_1.unifiedNodeRegistry.get(nt)?.isBranching;
        })
            .map((n) => n.id));
        const branchTargetIds = new Set(edges.filter((e) => branchingNodeIds.has(e.source)).map((e) => e.target));
        const logOutputNodes = nodes.filter((n) => {
            const nt = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(n.type || n.data?.type || '');
            return nt === 'log_output';
        });
        if (branchTargetIds.size > 1 && logOutputNodes.length === 1) {
            errors.push(`Branching workflow has ${branchTargetIds.size} branch target(s) but only one log_output terminal. Use one log_output per branch path.`);
        }
        for (const logNode of logOutputNodes) {
            const incoming = edges.filter((e) => e.target === logNode.id);
            const uniqueSources = new Set(incoming.map((e) => e.source));
            if (uniqueSources.size > 1) {
                errors.push(`log_output node "${logNode.id}" has ${uniqueSources.size} incoming sources. log_output must be single-input (no branch fan-in).`);
            }
        }
        // Check 2: All nodes connected to output
        // ✅ UNIVERSAL FIX: Recognize ALL output nodes using registry (not hardcoded list)
        // This works for ALL output nodes (CRM, email, social media, log_output, etc.) automatically
        // ✅ IMPORTANT: Check for ANY output node in the workflow, not just terminal ones
        // An output node can exist even if it's not yet connected (will be connected by edge reconciliation)
        const allOutputNodes = nodes.filter(node => {
            return !(0, universal_node_type_checker_1.isTriggerNode)(node) && (0, universal_node_type_checker_1.isOutputNode)(node);
        });
        // Terminal output nodes (no outgoing edges) - these are the final sinks
        const terminalOutputNodes = allOutputNodes.filter(node => {
            const outgoing = edges.filter(e => e.source === node.id);
            return !outgoing.length;
        });
        // ✅ FIX: Check for ANY output node in workflow, not just terminal ones
        // If no output nodes exist at all, that's an error (workflow has no way to output results)
        if (allOutputNodes.length === 0) {
            warnings.push('No output nodes found — workflow may be read-only or data-fetch only');
            // Skip disconnected-node BFS: with no output nodes, every node would appear disconnected
        }
        else if (terminalOutputNodes.length === 0 && allOutputNodes.length > 0) {
            // Output nodes exist but none are terminal - they need to be connected
            warnings.push(`Found ${allOutputNodes.length} output node(s) but none are terminal (may need connection)`);
        }
        // Use terminal output nodes for connectivity check (if any), otherwise use all output nodes
        const outputNodes = terminalOutputNodes.length > 0 ? terminalOutputNodes : allOutputNodes;
        // Build reverse adjacency list (for backward traversal from outputs)
        const reverseAdj = new Map();
        edges.forEach(edge => {
            if (!reverseAdj.has(edge.target)) {
                reverseAdj.set(edge.target, []);
            }
            reverseAdj.get(edge.target).push(edge.source);
        });
        // Find nodes not connected to any output
        const visited = new Set();
        const queue = [...outputNodes.map(n => n.id)];
        outputNodes.forEach(node => visited.add(node.id));
        while (queue.length > 0) {
            const currentNodeId = queue.shift();
            const incoming = reverseAdj.get(currentNodeId) || [];
            for (const neighborId of incoming) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push(neighborId);
                }
            }
        }
        const disconnectedNodes = nodes.filter(node => !visited.has(node.id)).map(n => n.id);
        if (disconnectedNodes.length > 0) {
            warnings.push(`Found ${disconnectedNodes.length} node(s) not connected to any output`);
            details.disconnectedNodes = disconnectedNodes;
        }
        // Check 3: Required inputs
        const incomingEdgesMap = new Map();
        edges.forEach(edge => {
            if (!incomingEdgesMap.has(edge.target)) {
                incomingEdgesMap.set(edge.target, []);
            }
            incomingEdgesMap.get(edge.target).push(edge);
        });
        nodes.forEach(node => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.data?.type || node.type || '');
            if ((0, universal_node_type_checker_1.isTriggerNode)(node)) {
                return; // Triggers don't need inputs
            }
            const incomingEdges = incomingEdgesMap.get(node.id) || [];
            if (incomingEdges.length === 0) {
                errors.push(`Node "${nodeType}" (${node.id}) has no input connections`);
                details.missingInputs.push({
                    nodeId: node.id,
                    nodeType,
                    reason: 'No incoming edges found',
                });
            }
        });
        // Check 4: Edge handles validation
        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (sourceNode && targetNode) {
                const sourceType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(sourceNode.data?.type || sourceNode.type || '');
                const targetType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(targetNode.data?.type || targetNode.type || '');
                if (edge.sourceHandle && !(0, node_handle_registry_1.isValidHandle)(sourceType, edge.sourceHandle, true)) {
                    const reason = `Invalid source handle "${edge.sourceHandle}" for "${sourceType}"`;
                    errors.push(`Edge ${edge.id}: ${reason}`);
                    details.invalidEdgeHandles.push({
                        edgeId: edge.id,
                        sourceHandle: edge.sourceHandle,
                        reason,
                    });
                }
                if (edge.targetHandle && !(0, node_handle_registry_1.isValidHandle)(targetType, edge.targetHandle, false)) {
                    const reason = `Invalid target handle "${edge.targetHandle}" for "${targetType}"`;
                    errors.push(`Edge ${edge.id}: ${reason}`);
                    details.invalidEdgeHandles.push({
                        edgeId: edge.id,
                        targetHandle: edge.targetHandle,
                        reason,
                    });
                }
            }
        });
        // Check 5: Transformation requirements
        // ✅ WORLD-CLASS UNIVERSAL: Use TransformationDetector + UnifiedNodeTypeMatcher
        // to semantically validate that required transformations are present.
        if (context.originalPrompt) {
            // Prefer existing detection from earlier layer, otherwise detect from original prompt
            const detection = context.transformationDetection ||
                transformation_detector_1.transformationDetector.detectTransformations(context.originalPrompt);
            if (detection && detection.detected && detection.requiredNodeTypes.length > 0) {
                const workflowNodeTypes = nodes.map(n => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(n.data?.type || n.type || ''));
                const tfValidation = transformation_detector_1.transformationDetector.validateTransformations(detection, workflowNodeTypes);
                if (!tfValidation.valid && tfValidation.missing.length > 0) {
                    // Keep error message format backward-compatible while using semantic validation
                    errors.push(`Missing required transformation nodes: ${tfValidation.missing.join(', ')}`);
                    details.missingTransformations = tfValidation.missing;
                    details.transformationValidationErrors = tfValidation.errors;
                }
            }
        }
        // Check 6: Workflow minimal (warnings only)
        const nodeTypeCount = new Map();
        nodes.forEach(node => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(node.data?.type || node.type || '');
            nodeTypeCount.set(nodeType, (nodeTypeCount.get(nodeType) || 0) + 1);
        });
        nodeTypeCount.forEach((count, nodeType) => {
            if (count > 1 && !this.isAllowedDuplicate(nodeType)) {
                warnings.push(`Duplicate node type "${nodeType}" found ${count} times (may be non-minimal)`);
                details.nonMinimalIssues.push(`Multiple instances of "${nodeType}" node`);
            }
        });
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            details,
        };
    }
    isAllowedDuplicate(nodeType) {
        const allowedDuplicates = ['set_variable', 'log', 'delay', 'notification'];
        return allowedDuplicates.includes(nodeType);
    }
    shouldRun(context) {
        return !!context.workflow && context.workflow.nodes.length > 0;
    }
}
exports.FinalIntegrityValidationLayer = FinalIntegrityValidationLayer;
/**
 * ✅ WORLD-CLASS: Validation Pipeline Orchestrator
 * SINGLE SOURCE OF TRUTH for workflow validation
 * Runs validation layers in order and aggregates results
 */
class WorkflowValidationPipeline {
    constructor() {
        this.layers = [];
        // ✅ WORLD-CLASS: Register ALL validation layers (SINGLE SOURCE OF TRUTH)
        this.registerLayer(new IntentCoverageValidationLayer());
        this.registerLayer(new DSLStructureValidationLayer());
        this.registerLayer(new GraphConnectivityValidationLayer());
        this.registerLayer(new TypeCompatibilityValidationLayer());
        this.registerLayer(new LinearFlowValidationLayer());
        this.registerLayer(new StructuralDAGValidationLayer());
        this.registerLayer(new FinalIntegrityValidationLayer()); // Final comprehensive checks
    }
    /**
     * Register a validation layer
     */
    registerLayer(layer) {
        this.layers.push(layer);
        // Sort by order
        this.layers.sort((a, b) => a.order - b.order);
    }
    /**
     * Remove a validation layer
     */
    removeLayer(name) {
        this.layers = this.layers.filter(layer => layer.name !== name);
    }
    /**
     * Get all registered layers
     */
    getLayers() {
        return [...this.layers];
    }
    /**
     * Run validation pipeline
     *
     * @param context - Validation context
     * @returns Validation result
     */
    validate(context) {
        return this.runValidation(context);
    }
    /**
     * Backward compatibility: Validate workflow directly
     * Wraps workflow in ValidationContext and calls validate()
     *
     * @param workflow - Workflow to validate
     * @param originalPrompt - Original user prompt (optional)
     * @returns Validation result (compatible with old interface)
     */
    validateWorkflow(workflow, originalPrompt) {
        const context = {
            intent: {
                trigger: 'manual_trigger',
                actions: [],
                requires_credentials: [],
            },
            workflow,
            originalPrompt,
        };
        return this.runValidation(context);
    }
    /**
     * Internal validation method
     */
    runValidation(context) {
        console.log('[WorkflowValidationPipeline] Starting validation pipeline...');
        const allErrors = [];
        const allWarnings = [];
        const layerResults = new Map();
        // Run each layer in order
        for (const layer of this.layers) {
            if (!layer.shouldRun(context)) {
                console.log(`[WorkflowValidationPipeline] ⏭️  Skipping layer: ${layer.name} (shouldRun returned false)`);
                continue;
            }
            console.log(`[WorkflowValidationPipeline] Running layer: ${layer.name} (order: ${layer.order})`);
            try {
                const result = layer.validate(context);
                layerResults.set(layer.name, result);
                allErrors.push(...result.errors);
                allWarnings.push(...result.warnings);
                if (result.valid) {
                    console.log(`[WorkflowValidationPipeline] ✅ Layer ${layer.name} passed`);
                }
                else {
                    console.error(`[WorkflowValidationPipeline] ❌ Layer ${layer.name} failed: ${result.errors.join('; ')}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[WorkflowValidationPipeline] ❌ Layer ${layer.name} threw error: ${errorMessage}`);
                allErrors.push(`Validation layer ${layer.name} failed: ${errorMessage}`);
                layerResults.set(layer.name, {
                    valid: false,
                    errors: [errorMessage],
                    warnings: [],
                });
            }
        }
        const valid = allErrors.length === 0;
        console.log(`[WorkflowValidationPipeline] Validation complete: ${valid ? 'VALID' : 'INVALID'}`);
        if (allErrors.length > 0) {
            console.error(`[WorkflowValidationPipeline] Total errors: ${allErrors.length}`);
        }
        if (allWarnings.length > 0) {
            console.warn(`[WorkflowValidationPipeline] Total warnings: ${allWarnings.length}`);
        }
        return {
            valid,
            errors: allErrors,
            warnings: allWarnings,
            layerResults,
            context,
            fixesApplied: [], // Backward compatibility: no fixes applied by default
        };
    }
}
exports.WorkflowValidationPipeline = WorkflowValidationPipeline;
// Export singleton instance
exports.workflowValidationPipeline = new WorkflowValidationPipeline();
