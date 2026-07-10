"use strict";
/**
 * Workflow DSL (Domain Specific Language)
 *
 * Intermediate representation between StructuredIntent and Workflow Graph.
 *
 * Pipeline: prompt -> intent -> DSL -> workflow graph
 *
 * The DSL is a deterministic, structured representation that:
 * - Defines trigger, data sources, transformations, outputs
 * - Specifies execution order
 * - Is generated from StructuredIntent (not from LLM directly)
 * - Is the ONLY input accepted by WorkflowCompiler
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dslGenerator = exports.DSLGenerator = exports.DSLGenerationError = void 0;
const node_capability_registry_dsl_1 = require("./node-capability-registry-dsl");
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const node_library_1 = require("../nodes/node-library");
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const node_type_resolver_util_1 = require("../../core/utils/node-type-resolver-util");
const universal_node_type_checker_1 = require("../../core/utils/universal-node-type-checker");
const node_metadata_enricher_1 = require("./node-metadata-enricher");
const resolution_learning_cache_1 = require("./resolution-learning-cache");
const capability_based_validator_1 = require("./capability-based-validator");
const transformation_node_config_1 = require("./transformation-node-config");
const workflow_templates_1 = require("./workflow-templates");
const operation_semantics_1 = require("../../core/constants/operation-semantics");
const semantic_node_equivalence_registry_1 = require("../../core/registry/semantic-node-equivalence-registry");
const node_operation_semantics_1 = require("../../core/registry/node-operation-semantics");
class DSLGenerationError extends Error {
    constructor(message, uncategorizedActions = [], missingIntentActions, minimumComponentViolations) {
        super(message);
        this.uncategorizedActions = uncategorizedActions;
        this.missingIntentActions = missingIntentActions;
        this.minimumComponentViolations = minimumComponentViolations;
        this.name = 'DSLGenerationError';
        Object.setPrototypeOf(this, DSLGenerationError.prototype);
    }
}
exports.DSLGenerationError = DSLGenerationError;
/**
 * Validate that all intent actions are represented in DSL dataSources and outputs
 *
 * @param intent - Structured intent with actions
 * @param dsl - Generated workflow DSL
 * @throws DSLGenerationError if intent actions are missing from DSL
 */
/**
 * Validate intent coverage using capability-based validation
 *
 * ✅ REFACTORED: Now uses capability-based validation instead of type matching
 * - Maps intent actions to required capabilities (read, transform, write)
 * - Maps DSL nodes to provided capabilities
 * - Validates that all required capabilities are satisfied
 *
 * This is more extensible and flexible than type-based matching.
 */
function validateIntentCoverage(intent, dsl) {
    if (!intent.actions || intent.actions.length === 0) {
        return; // No actions to validate
    }
    // ✅ NEW: Use capability-based validation
    const capabilityValidation = (0, capability_based_validator_1.validateIntentCoverageByCapabilities)(intent, dsl);
    if (!capabilityValidation.valid) {
        // Convert capability-based errors to IntentActionCoverageFailure format for backward compatibility
        // ✅ PHASE 3: Build array immutably (use let for reassignment)
        let missingActions = [];
        for (const missingReq of capabilityValidation.missingRequirements) {
            // Collect available DSL nodes
            const dslDataSourceTypes = dsl.dataSources.map(ds => ds.type?.toLowerCase().trim()).filter(Boolean);
            const dslTransformationTypes = dsl.transformations.map(tf => tf.type?.toLowerCase().trim()).filter(Boolean);
            const dslOutputTypes = dsl.outputs.map(out => out.type?.toLowerCase().trim()).filter(Boolean);
            // Determine expected category based on capability
            let expectedIn = 'dataSource';
            if (missingReq.capability === 'write') {
                expectedIn = 'output';
            }
            else if (missingReq.capability === 'transform') {
                expectedIn = 'dataSource'; // Transformations are valid coverage
            }
            const failureInfo = {
                type: missingReq.intentAction.type,
                operation: missingReq.intentAction.operation,
                expectedIn,
                availableDSLNodes: {
                    dataSources: dslDataSourceTypes,
                    transformations: dslTransformationTypes,
                    outputs: dslOutputTypes,
                },
                failureReason: `Missing required capabilities: ${missingReq.requiredCapabilities.join(', ')}. ` +
                    `Available DSL nodes do not provide these capabilities.`,
                suggestedFix: `Add a DSL node that provides capabilities: ${missingReq.requiredCapabilities.join(', ')}. ` +
                    `For ${missingReq.capability} capability, consider adding a ${missingReq.capability === 'read' ? 'dataSource' : missingReq.capability === 'transform' ? 'transformation' : 'output'} node.`,
            };
            missingActions = [...missingActions, failureInfo]; // ✅ PHASE 3: Immutable add
        }
        // Build detailed error message
        const errorDetails = missingActions.map((action, idx) => {
            const availableCount = (action.availableDSLNodes?.dataSources.length || 0) +
                (action.availableDSLNodes?.transformations.length || 0) +
                (action.availableDSLNodes?.outputs.length || 0);
            let detail = `\n  ${idx + 1}. Intent action: "${action.type}" (operation: "${action.operation}")`;
            detail += `\n     Expected capability: ${capabilityValidation.missingRequirements[idx]?.capability || 'unknown'}`;
            detail += `\n     Required capabilities: ${capabilityValidation.missingRequirements[idx]?.requiredCapabilities.join(', ') || 'unknown'}`;
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
        const errorMessage = `Intent coverage validation failed (capability-based): ${missingActions.length} intent action(s) not represented in DSL.` +
            errorDetails +
            `\n\nAll intent actions must be mapped to DSL nodes that provide the required capabilities (read, transform, write).`;
        throw new DSLGenerationError(errorMessage, [], missingActions);
    }
}
/**
 * Validate minimum required components in DSL
 * Ensures DSL has essential components for a valid workflow
 *
 * @param dsl - Generated workflow DSL
 * @throws DSLGenerationError if minimum requirements are not met
 */
function validateMinimumComponents(dsl) {
    // ✅ PHASE 3: Build array immutably (use let for reassignment)
    let violations = [];
    // Minimum requirements:
    // 1. Must have a trigger (always required)
    if (!dsl.trigger || !dsl.trigger.type) {
        violations = [...violations, { component: 'trigger', required: 1, actual: 0 }]; // ✅ PHASE 3: Immutable add
    }
    // 2. Must have at least one data source OR output (workflow must do something)
    // ✅ FIXED: Transformations are first-class components but don't count toward minimum requirement
    // because they need input data (from dataSource or trigger) and produce output (to output or next transformation)
    const hasDataSource = dsl.dataSources.length > 0;
    const hasOutput = dsl.outputs.length > 0;
    const hasTransformation = dsl.transformations.length > 0;
    // A valid workflow must have:
    // - At least one dataSource (to read data) OR
    // - At least one output (to write data) OR
    // - At least one transformation (if trigger provides data directly)
    // However, transformations typically need input, so we require dataSource OR output
    // Transformations alone are valid only if trigger provides data (edge case)
    if (!hasDataSource && !hasOutput && !hasTransformation) {
        violations = [...violations, {
                component: 'dataSource, output, or transformation',
                required: 1,
                actual: 0
            }];
    }
    // Note: Transformations are first-class components and are always included in DSL structure
    // They are optional in count (can be 0 or many) but are treated equally with dataSources and outputs
    // Throw descriptive error if minimum requirements are not met
    if (violations.length > 0) {
        const violationDetails = violations
            .map(v => `${v.component}: required ${v.required}, found ${v.actual}`)
            .join('; ');
        const errorMessage = `Minimum component validation failed: DSL does not meet minimum requirements. ` +
            `Violations: ${violationDetails}. ` +
            `A valid workflow must have a trigger and at least one data source or output.`;
        throw new DSLGenerationError(errorMessage, [], undefined, violations);
    }
}
/**
 * Validate operation-based component requirements
 * Ensures DSL has dataSources for read operations and outputs for write operations
 *
 * @param intent - Structured intent with actions
 * @param dsl - Generated workflow DSL
 * @throws DSLGenerationError if operation requirements are not met
 */
function validateOperationRequirements(intent, dsl) {
    if (!intent.actions || intent.actions.length === 0) {
        return; // No operations to validate
    }
    // ✅ PHASE 3: Build array immutably (use let for reassignment)
    let violations = [];
    // ✅ UNIVERSAL ROOT-LEVEL: Use node-specific operation semantics (NOT global lists)
    const { isReadOperationForNode, isWriteOperationForNode } = require('../../core/registry/node-operation-semantics');
    const hasReadOperation = intent.actions.some(a => {
        const nodeType = a.type || '';
        const operation = a.operation || '';
        // ✅ Use node-specific check (works for ANY operation, ANY node)
        return isReadOperationForNode(nodeType, operation);
    });
    if (hasReadOperation && dsl.dataSources.length === 0) {
        violations = [...violations, { component: 'dataSource', required: 1, actual: 0 }]; // ✅ PHASE 3: Immutable add
    }
    // ✅ UNIVERSAL ROOT-LEVEL: Use node-specific operation semantics
    const hasWriteOperation = intent.actions.some(a => {
        const nodeType = a.type || '';
        const operation = a.operation || '';
        // ✅ Use node-specific check (works for ANY operation, ANY node)
        return isWriteOperationForNode(nodeType, operation);
    });
    // ✅ WORLD-CLASS UNIVERSAL: Chatbot/AI workflows - ANY AI node IS the output
    // For chatbot workflows, the AI response goes back through the chat interface
    // No separate output node is needed
    // Uses registry-based check - works for ALL AI nodes (ai_chat_model, ollama, openai_gpt, etc.)
    const { isAIChatNode, isTriggerNode } = require('../../core/utils/universal-node-type-checker');
    const hasAIChatNode = dsl.transformations.some(tf => {
        return isAIChatNode(tf.type || '');
    });
    const isChatbotWorkflow = hasAIChatNode && (isTriggerNode(dsl.trigger.type || '') &&
        (dsl.trigger.type === 'chat_trigger' || dsl.trigger.type === 'manual_trigger'));
    // If chatbot workflow, AI node IS the output - don't require separate output node
    if (hasWriteOperation && dsl.outputs.length === 0 && !isChatbotWorkflow) {
        violations = [...violations, { component: 'output', required: 1, actual: 0 }]; // ✅ PHASE 3: Immutable add
    }
    // Throw descriptive error if operation requirements are not met
    if (violations.length > 0) {
        const violationDetails = violations
            .map(v => `${v.component}: required ${v.required}, found ${v.actual}`)
            .join('; ');
        const errorMessage = `Operation requirement validation failed: Intent contains operations that require missing DSL components. ` +
            `Violations: ${violationDetails}. ` +
            `Read operations require dataSources, write operations require outputs.`;
        throw new DSLGenerationError(errorMessage, [], undefined, violations);
    }
}
/**
 * DSL Generator
 * Converts StructuredIntent to WorkflowDSL
 */
class DSLGenerator {
    /**
     * Generate DSL from StructuredIntent
     *
     * @param intent - Structured intent
     * @param originalPrompt - Original user prompt
     * @param transformationDetection - Transformation detection result (REQUIRED)
     * @returns Workflow DSL
     */
    async generateDSL(intent, originalPrompt, transformationDetection, confidenceScore, nodeCapabilities, options) {
        console.log('[DSLGenerator] Generating DSL from StructuredIntent...');
        // ✅ PHASE 8: Store nodeCapabilities for use in determineIntendedCapability
        this._nodeCapabilitiesFromTags = nodeCapabilities || {};
        if (Object.keys(this._nodeCapabilitiesFromTags).length > 0) {
            console.log(`[DSLGenerator] ✅ PHASE 8: Using capabilities from tags: ${JSON.stringify(this._nodeCapabilitiesFromTags)}`);
        }
        // ✅ PHASE 2: Validate input contract at stage boundary
        const { validateStructuredIntent } = require('../../core/contracts/pipeline-stage-contracts');
        const intentValidation = validateStructuredIntent(intent);
        if (!intentValidation.valid) {
            throw new DSLGenerationError(`Invalid StructuredIntent: ${intentValidation.errors.join(', ')}`, [], undefined, undefined);
        }
        // ✅ TEMPLATE SELECTION: Select matching template based on intent
        const templateSelection = workflow_templates_1.workflowTemplateSelector.selectTemplate(intent, originalPrompt);
        if (templateSelection.template) {
            console.log(`[DSLGenerator] ✅ Selected template: ${templateSelection.template.id} (confidence: ${(templateSelection.confidence * 100).toFixed(1)}%, reason: ${templateSelection.reason})`);
        }
        else {
            console.log(`[DSLGenerator] No template matched, using standard DSL generation`);
        }
        // Extract trigger
        const triggerConfig = intent.trigger_config || {};
        const trigger = {
            type: (intent.trigger || 'manual_trigger'),
            config: triggerConfig ? {
                ...triggerConfig,
                interval: triggerConfig.interval || undefined,
            } : undefined,
        };
        // ✅ PHASE 3: Extract data sources (build arrays immutably, use let for reassignment)
        let dataSources = [];
        let transformations = [];
        let outputs = [];
        // ✅ PHASE 3: Track uncategorized actions and mapped actions for validation (build arrays immutably, use let for reassignment)
        let uncategorizedActions = [];
        let mappedActionsToDataSources = [];
        let mappedActionsToOutputs = [];
        // Count all intent components (actions + dataSources + transformations from planner)
        const originalActionCount = (intent.actions || []).length +
            (intent.dataSources || []).length +
            (intent.transformations || []).length;
        // Initialize step counter (used for all component IDs)
        let stepCounter = 0;
        // ✅ NEW: Process dataSources from StructuredIntent (if planner provided them separately)
        // This preserves planner.data_sources -> intent.dataSources mapping
        if (intent.dataSources && intent.dataSources.length > 0) {
            console.log(`[DSLGenerator] Processing ${intent.dataSources.length} dataSource(s) from StructuredIntent.dataSources`);
            for (const ds of intent.dataSources) {
                const rawType = ds.type || '';
                // ✅ UNIVERSAL FIX: Use same resolution strategy as actions
                let resolvedType = this.extractBaseNodeName(rawType);
                if (resolvedType === rawType) {
                    try {
                        resolvedType = (0, node_type_resolver_util_1.resolveNodeType)(resolvedType, false);
                    }
                    catch (error) {
                        resolvedType = rawType;
                    }
                }
                const normalizedType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(resolvedType);
                let dsType = normalizedType || resolvedType || rawType;
                const dsOperation = ds.operation || 'read';
                // ✅ OPERATIONS-FIRST: Check if it's a trigger BEFORE categorization
                // Triggers should be in trigger field, not dataSources
                const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(dsType);
                if (nodeDef?.category === 'trigger') {
                    console.warn(`[DSLGenerator] ⚠️  DataSource "${dsType}" is actually a TRIGGER. This should not happen - triggers should be in trigger field, not dataSources. Skipping.`);
                    continue; // Don't add to dataSources
                }
                // ✅ UNIVERSAL FIX: Use getSchema() with pattern matching
                let schema = node_library_1.nodeLibrary.getSchema(dsType);
                if (!schema) {
                    schema = node_library_1.nodeLibrary.getSchema(rawType);
                    if (schema) {
                        dsType = schema.type;
                        console.log(`[DSLGenerator] ✅ Pattern-matched dataSource: "${rawType}" -> "${dsType}"`);
                    }
                }
                else {
                    dsType = schema.type;
                }
                // Skip if still cannot resolve
                if (!schema) {
                    console.error(`[DSLGenerator] ❌ DataSource type "${rawType}" could not be resolved. Skipping this data source.`);
                    continue;
                }
                // ✅ WHITELIST-ONLY: Only add if node is whitelisted (if whitelist exists)
                if (options?.explicitNodeTypes && !options.explicitNodeTypes.has(dsType)) {
                    console.log(`[DSLGenerator] 🚫 WHITELIST-ONLY: Skipping non-whitelisted dataSource: ${dsType}`);
                    continue;
                }
                // Categorize as data source (should always be dataSource)
                // ✅ PHASE 2: Use schema operations directly instead of categorizer
                const dsCategory = this.determineCategoryFromSchema(schema, dsOperation);
                if (dsCategory === 'dataSource') {
                    // ✅ UNIVERSAL: Determine intended capability and available capabilities
                    const { intendedCapability, availableCapabilities } = this.determineIntendedCapability(dsType, dsOperation, 'data_source', originalPrompt);
                    const dslIndex = dataSources.length;
                    dataSources = [...dataSources, {
                            id: `ds_${stepCounter++}`,
                            type: dsType,
                            operation: dsOperation,
                            config: ds.config || {},
                            description: ds.config?.description || undefined,
                            intendedCapability, // ✅ UNIVERSAL: AI-determined intended capability
                            availableCapabilities, // ✅ UNIVERSAL: Available capabilities from registry
                        }];
                    mappedActionsToDataSources = [...mappedActionsToDataSources, { actionType: dsType, operation: dsOperation, dslIndex }]; // ✅ PHASE 3: Immutable add
                }
                else {
                    console.warn(`[DSLGenerator] ⚠️  DataSource "${dsType}" with operation "${dsOperation}" failed dataSource categorization`);
                }
            }
        }
        // ✅ NEW: Process transformations from StructuredIntent (if planner provided them separately)
        // This preserves planner.transformations -> intent.transformations mapping
        if (intent.transformations && intent.transformations.length > 0) {
            console.log(`[DSLGenerator] Processing ${intent.transformations.length} transformation(s) from StructuredIntent.transformations`);
            for (const tf of intent.transformations) {
                const rawType = tf.type || '';
                // ✅ UNIVERSAL FIX: Use same resolution strategy as actions
                let resolvedType = this.extractBaseNodeName(rawType);
                if (resolvedType === rawType) {
                    try {
                        resolvedType = (0, node_type_resolver_util_1.resolveNodeType)(resolvedType, false);
                    }
                    catch (error) {
                        resolvedType = rawType;
                    }
                }
                const normalizedType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(resolvedType);
                let tfType = normalizedType || resolvedType || rawType;
                const tfOperation = tf.operation || 'transform';
                // ✅ UNIVERSAL FIX: Use getSchema() with pattern matching
                let schema = node_library_1.nodeLibrary.getSchema(tfType);
                if (!schema) {
                    schema = node_library_1.nodeLibrary.getSchema(rawType);
                    if (schema) {
                        tfType = schema.type;
                        console.log(`[DSLGenerator] ✅ Pattern-matched transformation: "${rawType}" -> "${tfType}"`);
                    }
                }
                else {
                    tfType = schema.type;
                }
                // Skip if still cannot resolve
                if (!schema) {
                    console.error(`[DSLGenerator] ❌ Transformation type "${rawType}" could not be resolved. Skipping this transformation.`);
                    continue;
                }
                // ✅ WHITELIST-ONLY: Only add if node is whitelisted (if whitelist exists)
                if (options?.explicitNodeTypes && !options.explicitNodeTypes.has(tfType)) {
                    console.log(`[DSLGenerator] 🚫 WHITELIST-ONLY: Skipping non-whitelisted transformation: ${tfType}`);
                    continue;
                }
                // ✅ UNIVERSAL FIX: Categorize and route to correct category (not just skip)
                // Nodes in intent.transformations should be transformations, but if they're not,
                // route them to the correct category to prevent duplicates
                const tfCategory = this.determineCategoryFromSchema(schema, tfOperation);
                if (tfCategory === 'transformation') {
                    // ✅ Valid transformation - add to transformations array
                    const duplicateCheck = this.wouldBeDuplicateOperation(tfType, tfOperation, transformations, 'transformation');
                    if (duplicateCheck.isDuplicate) {
                        console.warn(`[DSLGenerator] ⚠️  Skipping duplicate transformation: ${tfType} (${duplicateCheck.reason})`);
                        continue; // Skip adding duplicate
                    }
                    // ✅ UNIVERSAL: Determine intended capability and available capabilities
                    const { intendedCapability, availableCapabilities } = this.determineIntendedCapability(tfType, tfOperation, 'transformation', originalPrompt);
                    transformations = [...transformations, {
                            id: `tf_${stepCounter++}`,
                            type: tfType,
                            operation: this.mapTransformationOperation(tfOperation),
                            config: tf.config || {},
                            description: tf.config?.description || undefined,
                            intendedCapability, // ✅ UNIVERSAL: AI-determined intended capability
                            availableCapabilities, // ✅ UNIVERSAL: Available capabilities from registry
                        }];
                }
                else if (tfCategory === 'output') {
                    // ✅ MISPLACED NODE: Node in transformations array but is actually an output
                    // Route to outputs to prevent duplicate when processing actions
                    console.warn(`[DSLGenerator] ⚠️  Node "${tfType}" in transformations array is actually an OUTPUT. Routing to outputs.`);
                    const duplicateCheck = this.wouldBeDuplicateOperation(tfType, tfOperation, outputs, 'output');
                    if (!duplicateCheck.isDuplicate) {
                        // ✅ UNIVERSAL: Determine intended capability and available capabilities
                        const { intendedCapability, availableCapabilities } = this.determineIntendedCapability(tfType, tfOperation, 'output', originalPrompt);
                        outputs = [...outputs, {
                                id: `out_${stepCounter++}`,
                                type: tfType,
                                operation: tfOperation,
                                config: tf.config || {},
                                description: tf.config?.description || undefined,
                                intendedCapability, // ✅ UNIVERSAL: AI-determined intended capability
                                availableCapabilities, // ✅ UNIVERSAL: Available capabilities from registry
                            }];
                    }
                    else {
                        console.warn(`[DSLGenerator] ⚠️  Skipping duplicate output: ${tfType} (${duplicateCheck.reason})`);
                    }
                }
                else if (tfCategory === 'dataSource') {
                    // ✅ MISPLACED NODE: Node in transformations array but is actually a dataSource
                    // Route to dataSources to prevent duplicate when processing dataSources
                    console.warn(`[DSLGenerator] ⚠️  Node "${tfType}" in transformations array is actually a DATASOURCE. Routing to dataSources.`);
                    const duplicateCheck = this.wouldBeDuplicateOperation(tfType, tfOperation, dataSources, 'data_source');
                    if (!duplicateCheck.isDuplicate) {
                        // ✅ UNIVERSAL: Determine intended capability and available capabilities
                        const { intendedCapability, availableCapabilities } = this.determineIntendedCapability(tfType, tfOperation, 'data_source', originalPrompt);
                        dataSources = [...dataSources, {
                                id: `ds_${stepCounter++}`,
                                type: tfType,
                                operation: tfOperation,
                                config: tf.config || {},
                                description: tf.config?.description || undefined,
                                intendedCapability, // ✅ UNIVERSAL: AI-determined intended capability
                                availableCapabilities, // ✅ UNIVERSAL: Available capabilities from registry
                            }];
                    }
                    else {
                        console.warn(`[DSLGenerator] ⚠️  Skipping duplicate dataSource: ${tfType} (${duplicateCheck.reason})`);
                    }
                }
                else {
                    // ✅ UNKNOWN CATEGORY: Log error but don't crash
                    console.error(`[DSLGenerator] ❌ Node "${tfType}" with operation "${tfOperation}" could not be categorized. Skipping.`);
                }
            }
        }
        // Process actions (these are outputs/write operations from planner)
        for (const action of intent.actions || []) {
            const rawType = action.type || '';
            // ✅ ROOT-LEVEL FIX: Enhanced resolution with semantic understanding
            // Step 1: Check cache first (fast path)
            let resolvedType = rawType;
            const cached = resolution_learning_cache_1.resolutionLearningCache.get(rawType.toLowerCase());
            if (cached && cached.confidence > 0.8 && cached.resolvedType) {
                if (node_library_1.nodeLibrary.isNodeTypeRegistered(cached.resolvedType)) {
                    resolvedType = cached.resolvedType;
                    console.log(`[DSLGenerator] ✅ Using cached resolution: "${rawType}" -> "${resolvedType}"`);
                }
            }
            // Step 2: Try semantic resolution for variations (e.g., "post on linkedin")
            if (resolvedType === rawType) {
                const looksLikeVariation = /(post|publish|send|create)\s+(on|to|via|using)\s+/.test(rawType.toLowerCase()) ||
                    rawType.includes('_post') || rawType.includes('post_');
                if (looksLikeVariation) {
                    try {
                        // Quick semantic match using keyword overlap (sync)
                        const metadata = node_metadata_enricher_1.nodeMetadataEnricher.enrichAllNodes();
                        const quickMatch = this.findQuickSemanticMatch(rawType.toLowerCase(), metadata);
                        if (quickMatch && node_library_1.nodeLibrary.isNodeTypeRegistered(quickMatch)) {
                            resolvedType = quickMatch;
                            console.log(`[DSLGenerator] ✅ Semantic resolution: "${rawType}" -> "${resolvedType}"`);
                        }
                    }
                    catch (error) {
                        console.debug(`[DSLGenerator] Semantic resolution skipped for "${rawType}":`, error);
                    }
                }
            }
            // Step 3: Extract base node name from compound names (e.g., "notion_write_data" -> "notion")
            // This handles AI-generated compound names that combine node type + operation
            if (resolvedType === rawType) {
                const baseNodeName = this.extractBaseNodeName(resolvedType);
                if (baseNodeName !== resolvedType) {
                    console.log(`[DSLGenerator] 🔍 Extracted base node name: "${resolvedType}" -> "${baseNodeName}"`);
                    resolvedType = baseNodeName;
                }
            }
            // Step 4: Resolve aliases (gmail -> google_gmail) BEFORE normalization
            // This prevents "gmail" from being incorrectly matched to "ai" via substring matching
            if (resolvedType === rawType || !node_library_1.nodeLibrary.isNodeTypeRegistered(resolvedType)) {
                try {
                    const aliasResolved = (0, node_type_resolver_util_1.resolveNodeType)(resolvedType, false);
                    if (aliasResolved !== resolvedType && node_library_1.nodeLibrary.isNodeTypeRegistered(aliasResolved)) {
                        resolvedType = aliasResolved;
                        console.log(`[DSLGenerator] ✅ Resolved alias: "${rawType}" -> "${resolvedType}"`);
                    }
                }
                catch (error) {
                    // If resolution fails, continue to pattern matching
                    console.debug(`[DSLGenerator] Alias resolution skipped for "${rawType}": ${error}`);
                }
            }
            // Step 5: Normalize the resolved type (handles semantic mappings like ai providers)
            const normalizedType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(resolvedType);
            let actionType = normalizedType || resolvedType || rawType;
            // ✅ UNIVERSAL FIX: Use getSchema() with pattern matching (like IntentCompletenessValidator)
            // This ensures we can resolve compound names and variations that aren't directly registered
            let finalSchema = node_library_1.nodeLibrary.getSchema(actionType);
            // If direct lookup fails, try pattern matching via getSchema
            if (!finalSchema) {
                // getSchema() internally uses pattern matching, so try it directly
                finalSchema = node_library_1.nodeLibrary.getSchema(rawType); // Try original name with pattern matching
                if (finalSchema) {
                    actionType = finalSchema.type; // Use the canonical type from schema
                    console.log(`[DSLGenerator] ✅ Pattern-matched node type: "${rawType}" -> "${actionType}"`);
                }
            }
            else {
                // Schema found - use canonical type from schema (may differ from actionType)
                actionType = finalSchema.type;
                if (actionType !== normalizedType && actionType !== resolvedType) {
                    console.log(`[DSLGenerator] ✅ Using canonical type from schema: "${rawType}" -> "${actionType}"`);
                }
            }
            // Final validation: Ensure we have a valid schema
            if (!finalSchema) {
                // Last resort: Try extracting base name again and searching
                const lastResortBase = this.extractBaseNodeName(rawType);
                if (lastResortBase !== rawType) {
                    finalSchema = node_library_1.nodeLibrary.getSchema(lastResortBase);
                    if (finalSchema) {
                        actionType = finalSchema.type;
                        console.log(`[DSLGenerator] ✅ Last resort resolution: "${rawType}" -> "${actionType}"`);
                    }
                }
            }
            // If still no schema found, this is a hard error
            if (!finalSchema) {
                const message = `DSL generation failed: intent action type "${rawType}" could not be resolved to any registered node type. ` +
                    `Tried: "${resolvedType}", "${normalizedType}", "${actionType}", and pattern matching. ` +
                    `The system could not find any supported node type to implement this action.`;
                console.error(`[DSLGenerator] ❌ ${message}`);
                throw new DSLGenerationError(message, [
                    {
                        type: rawType,
                        operation: action.operation || 'read',
                        reason: 'Unresolvable node type: no registered NodeLibrary schema found after all resolution attempts',
                    },
                ]);
            }
            // ✅ WHITELIST-ONLY: Only process if node is whitelisted (if whitelist exists)
            // Check AFTER schema validation to ensure we have a valid actionType
            if (options?.explicitNodeTypes && !options.explicitNodeTypes.has(actionType)) {
                console.log(`[DSLGenerator] 🚫 WHITELIST-ONLY: Skipping non-whitelisted action: ${actionType} (from ${rawType})`);
                continue;
            }
            // ✅ CRITICAL FIX: Infer operation from prompt context if missing
            // Priority: 1. Intent operation → 2. Prompt keywords → 3. Schema default
            let operation = action.operation;
            if (!operation) {
                operation = this.inferOperationFromPromptContext(actionType, rawType, originalPrompt || '', finalSchema);
                console.log(`[DSLGenerator] 🔍 Inferred operation "${operation}" for "${actionType}" from prompt context`);
            }
            // ✅ FIX 1: Use unified categorizer for consistent categorization
            // This ensures DSL generator and compiler use the same logic
            let categorized = false;
            // ✅ CRITICAL FIX: Check if node type is explicitly mentioned in selected variation (not original prompt)
            // Use options.selectedStructuredPrompt if available (selected variation), otherwise fall back to originalPrompt
            const promptToCheck = options?.selectedStructuredPrompt || originalPrompt || '';
            const isUserExplicit = promptToCheck && (promptToCheck.toLowerCase().includes(actionType.toLowerCase()) ||
                promptToCheck.toLowerCase().includes(rawType.toLowerCase()));
            const originSource = isUserExplicit ? 'user' : 'auto';
            const originMetadata = {
                source: originSource,
                stage: 'dsl_generation',
            };
            // ✅ CRITICAL FIX: Check if node type already exists in any category (prevent multi-category duplicates)
            // Nodes with multiple capabilities (e.g., ai_agent with transformation + terminal) should only be added once
            const normalizedActionType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(actionType);
            const alreadyInTransformations = transformations.some(tf => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(tf.type) === normalizedActionType);
            const alreadyInOutputs = outputs.some(out => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(out.type) === normalizedActionType);
            const alreadyInDataSources = dataSources.some(ds => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(ds.type) === normalizedActionType);
            if (alreadyInTransformations || alreadyInOutputs || alreadyInDataSources) {
                const existingCategory = alreadyInTransformations ? 'transformation' : (alreadyInOutputs ? 'output' : 'data_source');
                console.log(`[DSLGenerator] ⚠️  Node type "${actionType}" already exists as ${existingCategory}, skipping duplicate addition to prevent multi-category duplicates`);
                categorized = true; // Mark as categorized to skip fallback
                // Skip to next action (don't add to any category)
            }
            else {
                // ✅ PHASE 2: Use schema operations directly instead of categorization
                // This eliminates redundant categorization layer - schema defines what node can do
                const category = this.determineCategoryFromSchema(finalSchema, operation);
                if (category === 'output') {
                    const dslIndex = outputs.length;
                    const normalizedOutputType = this.normalizeOutputNodeType(actionType, operation, originalPrompt || '');
                    // ✅ UNIVERSAL: Determine intended capability and available capabilities
                    const { intendedCapability, availableCapabilities } = this.determineIntendedCapability(normalizedOutputType, operation, 'output', originalPrompt);
                    outputs = [...outputs, {
                            id: `out_${stepCounter++}`,
                            type: normalizedOutputType,
                            operation: operation,
                            config: action.config || {},
                            description: action.config?.description || undefined,
                            intendedCapability, // ✅ UNIVERSAL: AI-determined intended capability
                            availableCapabilities, // ✅ UNIVERSAL: Available capabilities from registry
                            origin: originMetadata,
                            protected: originSource === 'user', // User-explicit nodes are protected
                        }];
                    mappedActionsToOutputs = [...mappedActionsToOutputs, { actionType: normalizedOutputType, operation, dslIndex }]; // ✅ PHASE 3: Immutable add
                    categorized = true;
                    console.log(`[DSLGenerator] ✅ Categorized "${actionType}" as OUTPUT (using schema operation: "${operation}")`);
                }
                else if (category === 'transformation') {
                    // ✅ ROOT FIX: Check for duplicates BEFORE adding (PREVENTION, not removal)
                    const duplicateCheck = this.wouldBeDuplicateOperation(actionType, operation, transformations, 'transformation');
                    if (duplicateCheck.isDuplicate) {
                        console.warn(`[DSLGenerator] ⚠️  Skipping duplicate transformation: ${actionType} (${duplicateCheck.reason})`);
                        // Still mark as categorized to avoid adding to uncategorizedActions
                        categorized = true;
                        continue; // Skip adding duplicate
                    }
                    // ✅ UNIVERSAL: Determine intended capability and available capabilities
                    const { intendedCapability, availableCapabilities } = this.determineIntendedCapability(actionType, operation, 'transformation', originalPrompt);
                    transformations = [...transformations, {
                            id: `tf_${stepCounter++}`,
                            type: actionType,
                            operation: this.mapTransformationOperation(operation),
                            config: action.config || {},
                            description: action.config?.description || undefined,
                            intendedCapability, // ✅ UNIVERSAL: AI-determined intended capability
                            availableCapabilities, // ✅ UNIVERSAL: Available capabilities from registry
                            origin: originMetadata,
                            protected: originSource === 'user', // User-explicit nodes are protected
                        }];
                    categorized = true;
                    console.log(`[DSLGenerator] ✅ Categorized "${actionType}" as TRANSFORMATION (using schema operation: "${operation}", intendedCapability: ${intendedCapability})`);
                }
                else if (category === 'dataSource') {
                    // ✅ UNIVERSAL: Determine intended capability and available capabilities
                    const { intendedCapability, availableCapabilities } = this.determineIntendedCapability(actionType, operation, 'data_source', originalPrompt);
                    const dslIndex = dataSources.length;
                    dataSources = [...dataSources, {
                            id: `ds_${stepCounter++}`,
                            type: actionType,
                            operation: operation,
                            intendedCapability, // ✅ UNIVERSAL: AI-determined intended capability
                            availableCapabilities, // ✅ UNIVERSAL: Available capabilities from registry
                            config: action.config || {},
                            description: action.config?.description || undefined,
                            origin: originMetadata,
                            protected: originSource === 'user', // User-explicit nodes are protected
                        }];
                    mappedActionsToDataSources = [...mappedActionsToDataSources, { actionType, operation, dslIndex }]; // ✅ PHASE 3: Immutable add
                    categorized = true;
                    console.log(`[DSLGenerator] ✅ Categorized "${actionType}" as DATASOURCE (using schema operation: "${operation}")`);
                }
                // ✅ FIX 1: If unified categorizer didn't categorize, log warning
                // The unified categorizer should handle all cases, but if it doesn't, we log for debugging
                if (!categorized) {
                    console.warn(`[DSLGenerator] ⚠️  Unified categorizer failed to categorize "${actionType}" with operation "${operation}"`);
                    console.warn(`[DSLGenerator]   This should not happen - unified categorizer should handle all cases`);
                }
            } // Close the else block for duplicate check
            // Track uncategorized actions (only if capability fallback also failed)
            if (!categorized) {
                const reason = this.getCategorizationFailureReason(actionType, operation);
                uncategorizedActions = [...uncategorizedActions, {
                        type: rawType,
                        operation,
                        reason,
                    }];
                console.error(`[DSLGenerator] ❌ Failed to categorize action: type="${actionType}", operation="${operation}"`);
                console.error(`[DSLGenerator]   Reason: ${reason}`);
                console.error(`[DSLGenerator]   Attempted: Operation normalization + Capability fallback`);
            }
        }
        // ✅ STRICT VALIDATION: Ensure all actions were categorized
        if (uncategorizedActions.length > 0) {
            console.error(`[DSLGenerator] ❌ DSL Generation Validation Failed:`);
            console.error(`[DSLGenerator]   Total actions: ${originalActionCount}`);
            console.error(`[DSLGenerator]   Uncategorized actions: ${uncategorizedActions.length}`);
            console.error(`[DSLGenerator]   Uncategorized actions details:`, uncategorizedActions);
            throw new DSLGenerationError(`DSL generation failed: ${uncategorizedActions.length} action(s) could not be categorized. ` +
                `Every intent action must be mapped to data source, transformation, or output.`, uncategorizedActions);
        }
        // ✅ FIXED: STRICT PIPELINE CONTRACT - Always include required transformations from TransformationDetector
        // Track auto-injected nodes for metadata (using Set to prevent duplicates)
        const autoInjectedNodesSet = new Set();
        if (transformationDetection?.detected && transformationDetection.verbs.length > 0) {
            console.log(`[DSLGenerator] 🔍 TransformationDetector detected verbs: ${transformationDetection.verbs.join(', ')}`);
            console.log(`[DSLGenerator] 🔍 Required node types: ${transformationDetection.requiredNodeTypes.join(', ')}`);
            // Check if transformations are already included from actions
            const existingTransformationTypes = new Set(transformations.map(t => t.type.toLowerCase()));
            const missingRequiredTypes = transformationDetection.requiredNodeTypes.filter(requiredType => {
                const requiredTypeLower = requiredType.toLowerCase();
                // Check for exact match or substring match
                return !Array.from(existingTransformationTypes).some(existingType => existingType === requiredTypeLower ||
                    existingType.includes(requiredTypeLower) ||
                    requiredTypeLower.includes(existingType));
            });
            if (missingRequiredTypes.length > 0) {
                console.log(`[DSLGenerator] ⚠️  Missing required transformation types: ${missingRequiredTypes.join(', ')}`);
                // Add missing transformations using central TRANSFORMATION_NODE_MAP configuration
                for (const requiredType of missingRequiredTypes) {
                    // Try to map the required type to a transformation node using central config
                    let selectedProvider = null;
                    // First, try to get node type from central config if it's a transformation operation
                    const transformationNodeTypes = (0, transformation_node_config_1.getTransformationNodeTypes)();
                    if (transformationNodeTypes.length > 0) {
                        // Use the first (and typically only) transformation node type from config
                        selectedProvider = transformationNodeTypes[0];
                    }
                    // If still no match, try to infer from required type name
                    if (!selectedProvider) {
                        // Check if requiredType looks like a transformation operation
                        const normalizedRequired = requiredType.toLowerCase();
                        if (normalizedRequired.includes('summarize') || normalizedRequired.includes('analyze') ||
                            normalizedRequired.includes('classify') || normalizedRequired.includes('generate')) {
                            // Extract the operation and get node type from central config
                            const operation = normalizedRequired.split('_')[0] || normalizedRequired;
                            selectedProvider = (0, transformation_node_config_1.getTransformationNodeType)(operation);
                        }
                        else {
                            // Fallback: use the required type as-is (for backward compatibility)
                            selectedProvider = requiredType;
                        }
                    }
                    // Final fallback to ai_chat_model (from central config)
                    if (!selectedProvider) {
                        selectedProvider = (0, transformation_node_config_1.getTransformationNodeType)('summarize'); // Default to ai_chat_model
                    }
                    // Ensure selectedProvider is not null
                    if (!selectedProvider) {
                        selectedProvider = 'ai_chat_model'; // Hard fallback
                    }
                    // Normalize selected provider and ensure it is registered
                    const normalizedProvider = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(selectedProvider);
                    if (!node_library_1.nodeLibrary.isNodeTypeRegistered(normalizedProvider)) {
                        console.error(`[DSLGenerator] ❌ Auto-injected transformation provider "${selectedProvider}" normalized to "${normalizedProvider}" is not registered in NodeLibrary. Skipping this auto-injected transformation.`);
                        continue;
                    }
                    // ✅ IDEMPOTENCY: Check if this provider is already in transformations (prevent duplicates)
                    // Check both existing transformations and transformations being added in this loop
                    const selectedProviderLower = normalizedProvider.toLowerCase();
                    const alreadyExists = Array.from(existingTransformationTypes).some(existingType => existingType === selectedProviderLower ||
                        existingType.includes(selectedProviderLower) ||
                        selectedProviderLower.includes(existingType)) || autoInjectedNodesSet.has(normalizedProvider) || autoInjectedNodesSet.has(selectedProviderLower);
                    if (alreadyExists) {
                        console.log(`[DSLGenerator] ⚠️  Skipping duplicate transformation: ${selectedProvider} (already exists or being added)`);
                        continue; // Skip adding duplicate
                    }
                    // ✅ Map verb to operation using NodeOperationIndex (universal, not hardcoded)
                    const verb = transformationDetection.verbs[0]; // Use first detected verb
                    const operation = await this.mapVerbToOperation(verb, normalizedProvider);
                    console.log(`[DSLGenerator] ✅ Adding missing transformation: ${normalizedProvider} (operation: ${operation})`);
                    transformations = [...transformations, {
                            id: `tf_${stepCounter++}`,
                            type: normalizedProvider,
                            operation: operation,
                            config: {
                                provider: normalizedProvider,
                                verb: verb,
                            },
                            description: `Auto-added transformation for detected verb: ${verb}`,
                            origin: {
                                source: 'auto',
                                stage: 'dsl_generation',
                            },
                            protected: false, // Auto-injected nodes are not protected
                        }];
                    // ✅ TRACK AUTO-INJECTED: Add to set (prevents duplicates) and update existing types
                    autoInjectedNodesSet.add(normalizedProvider);
                    existingTransformationTypes.add(selectedProviderLower);
                }
            }
            else {
                console.log(`[DSLGenerator] ✅ All required transformations already included in DSL`);
            }
        }
        // Convert Set to array for metadata (ensures no duplicates)
        // ✅ PHASE 3: Build array immutably
        let autoInjectedNodes = Array.from(autoInjectedNodesSet);
        // ✅ VALIDATION: Ensure auto-added transformations don't create duplicates
        // This is a redundant check but provides extra safety
        const transformationTypes = transformations.map(t => t.type.toLowerCase());
        const uniqueTransformationTypes = new Set(transformationTypes);
        if (transformationTypes.length !== uniqueTransformationTypes.size) {
            const duplicates = transformationTypes.filter((type, idx) => transformationTypes.indexOf(type) !== idx);
            console.error(`[DSLGenerator] ❌ Duplicate transformations detected: ${[...new Set(duplicates)].join(', ')}`);
            throw new DSLGenerationError(`DSL generation failed: Duplicate transformations detected: ${[...new Set(duplicates)].join(', ')}. ` +
                `This should not happen - duplicate prevention logic may have failed.`, []);
        }
        // ✅ GUARANTEED LLM NODE INJECTION: Ensure ai_chat_model exists for AI transformations
        // This is a safety net that guarantees LLM nodes are always present for AI operations
        // Note: This runs AFTER TransformationDetector injection to ensure we never miss LLM nodes
        const llmInjectionResult = await this.ensureLLMNodeInDSL(intent, transformations, stepCounter, autoInjectedNodesSet, originalPrompt);
        if (llmInjectionResult.injected) {
            // ✅ ROOT FIX: Check for duplicates BEFORE adding LLM nodes (PREVENTION, not removal)
            const nodesToAdd = [];
            for (const llmNode of llmInjectionResult.nodes) {
                const duplicateCheck = this.wouldBeDuplicateOperation(llmNode.type, llmNode.operation || 'summarize', transformations, 'transformation');
                if (duplicateCheck.isDuplicate) {
                    console.warn(`[DSLGenerator] ⚠️  Skipping duplicate LLM node injection: ${llmNode.type} (${duplicateCheck.reason})`);
                    continue; // Skip adding duplicate
                }
                nodesToAdd.push(llmNode);
            }
            if (nodesToAdd.length > 0) {
                transformations = [...transformations, ...nodesToAdd]; // ✅ PHASE 3: Immutable add
                stepCounter = llmInjectionResult.nextStepCounter;
                autoInjectedNodes = [...autoInjectedNodes, ...nodesToAdd.map(n => n.type)]; // ✅ PHASE 3: Immutable add
                console.log(`[DSLGenerator] ✅ Guaranteed LLM node injection: Added ${nodesToAdd.length} ai_chat_model node(s) (${llmInjectionResult.nodes.length - nodesToAdd.length} skipped as duplicates)`);
            }
            else {
                console.log(`[DSLGenerator] ⚠️  All LLM nodes skipped - duplicates already exist`);
            }
        }
        // ✅ CRITICAL FIX: Registry-based duplicate operation detection at DSL level (AFTER LLM injection)
        // Prevents duplicate AI processing operations (ai_agent + ai_chat_model)
        // Uses registry to determine operation signatures (same logic as production-workflow-builder)
        // This runs AFTER LLM injection to catch duplicates created by injection
        const duplicateOperations = this.detectDuplicateOperationsInDSL(transformations);
        if (duplicateOperations.length > 0) {
            console.warn(`[DSLGenerator] ⚠️  Duplicate operations detected in DSL: ${duplicateOperations.map(d => `${d.type1} + ${d.type2} (operation: ${d.operation})`).join(', ')}`);
            // Remove duplicates, keeping the simpler/more direct node (ai_chat_model over ai_agent)
            for (const dup of duplicateOperations) {
                const toRemove = dup.type1 === 'ai_agent' ? dup.type1 : dup.type2; // Prefer ai_chat_model over ai_agent
                const keptNode = dup.type1 === 'ai_agent' ? dup.type2 : dup.type1;
                const index = transformations.findIndex(tf => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(tf.type) === toRemove);
                if (index >= 0) {
                    const nodeToRemove = transformations[index];
                    const reason = `Duplicate operation "${dup.operation}" - keeping simpler node "${keptNode}" over "${toRemove}"`;
                    // ✅ TRACK REPLACEMENT
                    const { nodeReplacementTracker } = await Promise.resolve().then(() => __importStar(require('./node-replacement-tracker')));
                    nodeReplacementTracker.trackReplacement({
                        nodeType: toRemove,
                        operation: dup.operation,
                        category: 'transformation',
                        reason,
                        stage: 'workflow_dsl.detectDuplicateOperationsInDSL',
                        replacedBy: keptNode,
                        wasRemoved: true,
                        isProtected: nodeToRemove.protected === true || nodeToRemove.origin?.source === 'user',
                        confidence: confidenceScore,
                        metadata: {
                            duplicateType1: dup.type1,
                            duplicateType2: dup.type2,
                            operation: dup.operation,
                        },
                    });
                    console.log(`[DSLGenerator] 🗑️  Removing duplicate operation: ${toRemove} (keeping ${keptNode})`);
                    transformations = transformations.filter((_, i) => i !== index); // ✅ PHASE 3: Immutable remove
                }
            }
        }
        // ✅ TEMPLATE APPLICATION: Apply template structure if template was selected
        // This ensures template pipeline structure is respected
        let finalDataSources = dataSources;
        let finalTransformations = transformations;
        let finalOutputs = outputs;
        if (templateSelection.template) {
            const templateResult = this.applyTemplateStructure(templateSelection.template, { dataSources, transformations, outputs }, intent);
            finalDataSources = templateResult.dataSources;
            finalTransformations = templateResult.transformations;
            finalOutputs = templateResult.outputs;
            console.log(`[DSLGenerator] ✅ Applied template structure: ${templateSelection.template.id}`);
        }
        // ✅ AUTO-INJECT OUTPUT NODE: If validation requires output but none exists, auto-inject log_output
        // This ensures every workflow has a terminal output node (log_output is the default)
        // Check BEFORE creating DSL object to prevent validation errors
        // ✅ ROOT-LEVEL FIX: Use constants for operation semantics
        // ✅ PHASE 2: Use proper type instead of 'any'
        const hasWriteOperation = intent.actions && intent.actions.some((a) => (0, operation_semantics_1.isWriteOperation)(a.operation || ''));
        // ✅ WORLD-CLASS UNIVERSAL: Chatbot workflows - ANY AI node produces output through chat interface
        // Don't auto-inject if it's a chatbot workflow (AI node IS the output)
        // Uses registry-based check - works for ALL AI nodes (ai_chat_model, ollama, openai_gpt, etc.)
        const { isAIChatNode } = require('../../core/utils/universal-node-type-checker');
        const hasAIChatNode = finalTransformations.some(tf => {
            return isAIChatNode(tf.type || '');
        });
        const isChatbotWorkflow = hasAIChatNode && (trigger.type === 'chat_trigger');
        // ✅ UNIVERSAL FIX: Check if there are explicit output nodes using registry (not hardcoded list)
        // This works for ALL output nodes (CRM, email, social media, etc.) automatically
        const hasExplicitOutputs = finalOutputs.some(out => {
            const outType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(out.type || '');
            // Use registry-based check - works for ALL output nodes universally
            return (0, universal_node_type_checker_1.isOutputNode)(outType) && outType !== 'log_output';
        });
        // ✅ FIX 3: Prioritize explicit output nodes - place them BEFORE log_output
        // If explicit outputs exist, ensure log_output is added AFTER them (not before)
        if (hasExplicitOutputs) {
            console.log(`[DSLGenerator] ℹ️  Explicit output nodes detected (${finalOutputs.map(o => o.type).join(', ')}), log_output will be added after explicit outputs if needed`);
            // ✅ FIX 3: If log_output already exists, move it to the end
            const logOutputIndex = finalOutputs.findIndex(out => out.type === 'log_output');
            if (logOutputIndex >= 0) {
                const logOutput = finalOutputs[logOutputIndex];
                finalOutputs = [
                    ...finalOutputs.slice(0, logOutputIndex),
                    ...finalOutputs.slice(logOutputIndex + 1),
                    logOutput, // Move log_output to end
                ];
                console.log(`[DSLGenerator] ✅ Moved log_output to end (after explicit outputs)`);
            }
        }
        // Check if output is required but missing (and not a chatbot workflow, and no explicit outputs exist)
        if (hasWriteOperation && finalOutputs.length === 0 && !isChatbotWorkflow && !hasExplicitOutputs) {
            console.log(`[DSLGenerator] 🔧 Auto-injecting log_output node (required by write operation but missing, and no explicit output nodes)`);
            // Verify log_output is registered
            if (!node_library_1.nodeLibrary.isNodeTypeRegistered('log_output')) {
                console.error(`[DSLGenerator] ❌ Cannot auto-inject log_output: Node type not registered in NodeLibrary`);
            }
            else {
                // Auto-inject log_output as default terminal node
                const outputId = `out_${stepCounter++}`;
                finalOutputs = [...finalOutputs, {
                        id: outputId,
                        type: 'log_output',
                        operation: 'write', // log_output writes/logs data
                        config: {
                            message: '{{$json}}', // Output all data from previous node
                        },
                        description: 'Auto-injected terminal output node',
                    }];
                // Track as auto-injected
                autoInjectedNodesSet.add('log_output');
                autoInjectedNodes = [...autoInjectedNodes, 'log_output']; // ✅ PHASE 3: Immutable add
                console.log(`[DSLGenerator] ✅ Auto-injected log_output node (id: ${outputId})`);
            }
        }
        else if (isChatbotWorkflow && finalOutputs.length === 0) {
            console.log(`[DSLGenerator] ℹ️  Chatbot workflow detected - ai_chat_model serves as output (no separate output node needed)`);
        }
        // ✅ UNIVERSAL: Auto-include always-required nodes from registry (registry-driven)
        // These nodes are defined in the registry as alwaysRequired, so they must be included in all workflows
        // This is universal - works for infinite workflows without hardcoding
        if (!isChatbotWorkflow) {
            const alwaysRequiredNodes = unified_node_registry_1.unifiedNodeRegistry.getAlwaysRequiredNodes();
            for (const nodeDef of alwaysRequiredNodes) {
                // Check if node type already in outputs
                const alreadyInOutputs = finalOutputs.some(o => o.type === nodeDef.type);
                if (!alreadyInOutputs) {
                    // Registry says this node is always required - auto-include
                    const outputId = `out_${stepCounter++}`;
                    finalOutputs = [...finalOutputs, {
                            id: outputId,
                            type: nodeDef.type,
                            operation: 'write', // Terminal nodes typically write/log data
                            config: nodeDef.defaultConfig(),
                            description: `Auto-included: ${nodeDef.label} (always required per registry)`,
                            origin: {
                                source: 'system',
                                stage: 'dsl_generation',
                                approach: 'registry_always_required',
                            },
                        }];
                    // Track as auto-injected
                    autoInjectedNodesSet.add(nodeDef.type);
                    autoInjectedNodes = [...autoInjectedNodes, nodeDef.type]; // ✅ PHASE 3: Immutable add
                    console.log(`[DSLGenerator] ✅ Auto-included ${nodeDef.type} (always required per registry)`);
                }
            }
        }
        // ✅ SEMANTIC EQUIVALENCE: Normalize DSL components to canonical types (remove semantic duplicates)
        const normalizedComponents = this.normalizeSemanticEquivalencesInDSL(finalDataSources, finalTransformations, finalOutputs, intent);
        finalDataSources = normalizedComponents.dataSources;
        finalTransformations = normalizedComponents.transformations;
        finalOutputs = normalizedComponents.outputs;
        // ✅ PHASE 3: Filter out blocked nodes from DSL steps
        if (options?.blockedNodeTypes && options.blockedNodeTypes.size > 0) {
            const blockedCount = {
                dataSources: 0,
                transformations: 0,
                outputs: 0,
            };
            finalDataSources = finalDataSources.filter(step => {
                const nodeType = step.type || '';
                if (options.blockedNodeTypes.has(nodeType)) {
                    blockedCount.dataSources++;
                    console.log(`[DSLGenerator] 🚫 PHASE 3: Blocked conflicting node in DSL dataSources: ${nodeType}`);
                    return false;
                }
                return true;
            });
            finalTransformations = finalTransformations.filter(step => {
                const nodeType = step.type || '';
                if (options.blockedNodeTypes.has(nodeType)) {
                    blockedCount.transformations++;
                    console.log(`[DSLGenerator] 🚫 PHASE 3: Blocked conflicting node in DSL transformations: ${nodeType}`);
                    return false;
                }
                return true;
            });
            finalOutputs = finalOutputs.filter(step => {
                const nodeType = step.type || '';
                if (options.blockedNodeTypes.has(nodeType)) {
                    blockedCount.outputs++;
                    console.log(`[DSLGenerator] 🚫 PHASE 3: Blocked conflicting node in DSL outputs: ${nodeType}`);
                    return false;
                }
                return true;
            });
            const totalBlocked = blockedCount.dataSources + blockedCount.transformations + blockedCount.outputs;
            if (totalBlocked > 0) {
                console.log(`[DSLGenerator] 🚫 PHASE 3: Blocked ${totalBlocked} conflicting node(s) from DSL`);
            }
        }
        // ✅ PHASE 3: Ensure explicit nodes are in DSL
        if (options?.explicitNodeTypes && options.explicitNodeTypes.size > 0) {
            for (const explicitNode of options.explicitNodeTypes) {
                // Check if explicit node exists in any DSL component
                const existsInDataSources = finalDataSources.some(step => step.type === explicitNode);
                const existsInTransformations = finalTransformations.some(step => step.type === explicitNode);
                const existsInOutputs = finalOutputs.some(step => step.type === explicitNode);
                if (!existsInDataSources && !existsInTransformations && !existsInOutputs) {
                    console.log(`[DSLGenerator] ✅ PHASE 3: Adding missing explicit node to DSL: ${explicitNode}`);
                    // Determine which component to add to based on node capabilities
                    const { nodeCapabilityRegistryDSL } = await Promise.resolve().then(() => __importStar(require('./node-capability-registry-dsl')));
                    if (nodeCapabilityRegistryDSL.isDataSource(explicitNode)) {
                        finalDataSources.push({
                            id: `ds_${stepCounter++}`,
                            type: explicitNode,
                            operation: 'read',
                            description: `Explicit node: ${explicitNode}`,
                        });
                    }
                    else if (nodeCapabilityRegistryDSL.isTransformation(explicitNode)) {
                        finalTransformations.push({
                            id: `tf_${stepCounter++}`,
                            type: explicitNode,
                            operation: 'transform',
                            description: `Explicit node: ${explicitNode}`,
                        });
                    }
                    else if (nodeCapabilityRegistryDSL.isOutput(explicitNode)) {
                        finalOutputs.push({
                            id: `out_${stepCounter++}`,
                            type: explicitNode,
                            operation: 'send',
                            description: `Explicit node: ${explicitNode}`,
                        });
                    }
                }
            }
        }
        // ✅ WORLD-CLASS UNIVERSAL: Ensure completeness BEFORE building execution order
        // This ensures all required nodes are in DSL before ordering (prevents branches)
        // Missing nodes are added to appropriate DSL component (dataSources, transformations, outputs)
        // This is UNIVERSAL - applies to ALL workflows automatically
        const completenessResult = this.ensureCompletenessDuringGeneration(finalDataSources, finalTransformations, finalOutputs, intent, originalPrompt, stepCounter);
        finalDataSources = completenessResult.dataSources;
        finalTransformations = completenessResult.transformations;
        finalOutputs = completenessResult.outputs;
        stepCounter = completenessResult.stepCounter;
        if (completenessResult.nodesAdded.length > 0) {
            console.log(`[DSLGenerator] ✅ Added ${completenessResult.nodesAdded.length} missing node(s) to DSL during generation: ${completenessResult.nodesAdded.join(', ')}`);
        }
        // ✅ WORLD-CLASS: AI DSL Node Analysis Layer (YOUR IDEA)
        // Analyzes nodes at DSL level (BEFORE edges are created) to remove unnecessary nodes
        // Uses hybrid approach: rule-based (fast) + AI-driven (smart)
        // This is MORE EFFICIENT than pruning after edges are created
        console.log('[DSLGenerator] 🔍 Analyzing DSL nodes for optimization (before building edges)...');
        try {
            const { aiDSLNodeAnalyzer } = await Promise.resolve().then(() => __importStar(require('./ai-dsl-node-analyzer')));
            const analysisResult = aiDSLNodeAnalyzer.analyzeDSLNodes(finalDataSources, finalTransformations, finalOutputs, intent, originalPrompt || '', confidenceScore);
            finalDataSources = analysisResult.dataSources;
            finalTransformations = analysisResult.transformations;
            finalOutputs = analysisResult.outputs;
            if (analysisResult.nodesRemoved.length > 0) {
                console.log(`[DSLGenerator] ✅ AI Node Analysis: Removed ${analysisResult.nodesRemoved.length} unnecessary node(s): ${analysisResult.nodesRemoved.join(', ')}`);
                console.log(`[DSLGenerator]   Reasoning: ${analysisResult.reasoning}`);
                console.log(`[DSLGenerator]   Rule-based removals: ${analysisResult.analysisDetails.ruleBasedRemovals.length}`);
                console.log(`[DSLGenerator]   AI-based removals: ${analysisResult.analysisDetails.aiBasedRemovals.length}`);
                // ✅ LOG REPLACEMENT ANALYSIS
                const { nodeReplacementTracker } = await Promise.resolve().then(() => __importStar(require('./node-replacement-tracker')));
                const report = nodeReplacementTracker.generateAnalysisReport();
                console.log(report);
            }
            else {
                console.log(`[DSLGenerator] ✅ AI Node Analysis: All nodes are necessary - no removals needed`);
            }
        }
        catch (error) {
            // ✅ ERROR RECOVERY: If AI analysis fails, continue with original nodes (don't break workflow generation)
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`[DSLGenerator] ⚠️  AI Node Analysis failed: ${errorMessage}`);
            console.warn(`[DSLGenerator]   Continuing with original nodes (analysis is optional)`);
            // Continue with original nodes
        }
        // Build execution order
        const executionOrder = this.buildExecutionOrder(trigger, finalDataSources, finalTransformations, finalOutputs);
        // ✅ PHASE 10: Validate execution order matches capability order from tags
        const nodeCapabilitiesFromTags = this._nodeCapabilitiesFromTags || {};
        if (Object.keys(nodeCapabilitiesFromTags).length > 0) {
            const validationResult = this.validateExecutionOrderAgainstTags(executionOrder, finalDataSources, finalTransformations, finalOutputs, nodeCapabilitiesFromTags);
            if (!validationResult.valid) {
                console.warn(`[DSLGenerator] ⚠️  PHASE 10: Execution order validation failed: ${validationResult.errors.join('; ')}`);
                // Don't fail - just log warning (capability order is a hint, not a strict requirement)
            }
            else {
                console.log(`[DSLGenerator] ✅ PHASE 10: Execution order matches capability order from tags`);
            }
        }
        // Extract conditions
        const conditions = this.extractConditions(intent.conditions || []);
        const dsl = {
            trigger,
            dataSources: finalDataSources,
            transformations: finalTransformations,
            outputs: finalOutputs,
            executionOrder,
            conditions: conditions.length > 0 ? conditions : undefined,
            metadata: {
                originalPrompt,
                generatedAt: Date.now(),
                ...(autoInjectedNodes.length > 0 && { autoInjectedNodes }),
                ...(templateSelection.template && { templateId: templateSelection.template.id }),
            },
        };
        // ✅ INVARIANT: Ensure canonical DSL shape
        // DSL must always contain: trigger, dataSources[], transformations[], outputs[]
        if (!Array.isArray(dsl.dataSources) || !Array.isArray(dsl.transformations) || !Array.isArray(dsl.outputs)) {
            throw new DSLGenerationError('DSL generation failed: Invalid DSL structure. Expected arrays for dataSources, transformations, and outputs.');
        }
        // ✅ LONG-TERM FIX: Validate operations against node schemas
        // This ensures AI-selected operations match node schemas
        this.validateOperationsAgainstSchemas(dsl);
        // ✅ UNIVERSAL ROOT-LEVEL: Validate outputs array exists and is not empty when write operations are present
        // This prevents "WorkflowDSL missing outputs array or outputs is empty" errors
        const { isWriteOperationForNode: checkWriteOp } = require('../../core/registry/node-operation-semantics');
        const hasWriteOpInIntent = intent.actions?.some(a => {
            const nodeType = a.type || '';
            const operation = a.operation || '';
            return checkWriteOp(nodeType, operation);
        });
        // Check for chatbot workflows (AI node IS the output)
        const { isAIChatNode: checkAIChat, isTriggerNode: checkTrigger } = require('../../core/utils/universal-node-type-checker');
        const hasAIChatInDSL = dsl.transformations.some(tf => checkAIChat(tf.type || ''));
        const isChatbotFlow = hasAIChatInDSL && checkTrigger(dsl.trigger.type || '') &&
            (dsl.trigger.type === 'chat_trigger' || dsl.trigger.type === 'manual_trigger');
        if (hasWriteOpInIntent && (!dsl.outputs || dsl.outputs.length === 0) && !isChatbotFlow) {
            console.warn(`[DSLGenerator] ⚠️  Write operations detected but outputs array is empty. Attempting to fix...`);
            // ✅ AUTO-FIX: Find write operations in actions and ensure they're in outputs
            const writeActions = intent.actions?.filter(a => {
                const nodeType = a.type || '';
                const operation = a.operation || '';
                return checkWriteOp(nodeType, operation);
            }) || [];
            if (writeActions.length > 0) {
                // Add missing write actions to outputs
                for (const action of writeActions) {
                    const nodeType = action.type || '';
                    // Check if this node is already in outputs
                    const alreadyInOutputs = dsl.outputs.some(out => out.type === nodeType);
                    if (!alreadyInOutputs) {
                        // Create output from action - ensure operation matches DSLOutput type
                        const operationValue = action.operation || 'send';
                        const validOperation = (['send', 'write', 'create', 'update', 'notify'].includes(operationValue)
                            ? operationValue
                            : 'send');
                        const output = {
                            id: `output_${dsl.outputs.length + 1}`,
                            type: nodeType,
                            operation: validOperation,
                            config: action.config || {},
                        };
                        dsl.outputs.push(output);
                        console.log(`[DSLGenerator] ✅ Auto-fixed: Added ${nodeType} to outputs (operation: ${validOperation})`);
                    }
                }
            }
            // Final check: if still empty, throw error
            if (dsl.outputs.length === 0) {
                throw new DSLGenerationError('WorkflowDSL missing outputs array or outputs is empty. Intent contains write operations but no outputs were generated.');
            }
        }
        // ✅ PHASE 2-3: Verify ALL StructuredIntent actions are represented in DSL (AFTER final arrays are built)
        // Track which actions from intent were successfully added to DSL
        const allIntentActions = [
            ...(intent.actions || []),
            ...(intent.dataSources || []),
            ...(intent.transformations || [])
        ];
        const usedActionTypes = new Set();
        // Track actions used in dataSources
        mappedActionsToDataSources.forEach(m => usedActionTypes.add(m.actionType.toLowerCase()));
        // Track actions used in outputs
        mappedActionsToOutputs.forEach(m => usedActionTypes.add(m.actionType.toLowerCase()));
        // Track actions used in transformations (from intent.transformations array)
        if (intent.transformations) {
            intent.transformations.forEach(tf => {
                const resolved = this.extractBaseNodeName(tf.type || '');
                usedActionTypes.add(resolved.toLowerCase());
            });
        }
        // Check for unused actions (using final arrays after all processing)
        const unusedActions = [];
        for (const action of allIntentActions) {
            const actionType = (action.type || '').toLowerCase();
            const normalized = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(actionType);
            const baseName = this.extractBaseNodeName(actionType);
            const isUsed = usedActionTypes.has(actionType) ||
                usedActionTypes.has(normalized) ||
                usedActionTypes.has(baseName) ||
                // Also check if it's in final DSL arrays (after all processing)
                finalDataSources.some(ds => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(ds.type).toLowerCase() === normalized) ||
                finalOutputs.some(out => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(out.type).toLowerCase() === normalized) ||
                finalTransformations.some(tf => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(tf.type).toLowerCase() === normalized);
            if (!isUsed) {
                unusedActions.push({ type: action.type || '', operation: action.operation || '' });
                console.warn(`[DSLGenerator] ⚠️  PHASE 2-3: Action from StructuredIntent not used in DSL: ${action.type} (${action.operation})`);
            }
        }
        if (unusedActions.length > 0) {
            console.error(`[DSLGenerator] ❌ PHASE 2-3: ${unusedActions.length} action(s) from StructuredIntent were not added to DSL:`, unusedActions);
            // Don't throw error - log warning and continue (some actions might be intentionally skipped)
            // But log clearly for debugging
        }
        else {
            console.log(`[DSLGenerator] ✅ PHASE 2-3: All ${allIntentActions.length} action(s) from StructuredIntent are represented in DSL`);
        }
        // ✅ SEMANTIC VALIDATION: Verify all intent actions are represented in DSL
        // Note: We already validated that all actions are categorized (lines 268-280)
        // This validation ensures semantic correctness without comparing total counts
        // Transformations can exceed intent count because TransformationDetector auto-injects them
        // ✅ IMPORTANT: Validation runs AFTER transformation injection to ensure auto-added transformations
        // are included in intent coverage checks
        const intentActionsInDataSources = mappedActionsToDataSources.length;
        const intentActionsInOutputs = mappedActionsToOutputs.length;
        const intentActionsInTransformations = originalActionCount - intentActionsInDataSources - intentActionsInOutputs;
        // All intent actions are already validated to be categorized (uncategorizedActions check above)
        // So we know: intentActionsInDataSources + intentActionsInOutputs + intentActionsInTransformations = originalActionCount
        // We don't need to validate count - we just log the semantic breakdown
        const breakdown = {
            dataSources: dataSources.length,
            transformations: transformations.length,
            outputs: outputs.length,
            intentActionsInDataSources,
            intentActionsInOutputs,
            intentActionsInTransformations,
        };
        // ✅ PRODUCTION-GRADE VALIDATION: Verify intent coverage, minimum components, and operation requirements
        // ✅ IMPORTANT: This validation runs AFTER transformation injection, ensuring auto-added transformations
        // are included in intent coverage checks via semantic matching
        validateIntentCoverage(intent, dsl);
        validateMinimumComponents(dsl);
        validateOperationRequirements(intent, dsl);
        // ✅ POST-INJECTION VALIDATION: Verify that auto-added transformations satisfy intent coverage
        // This is a redundant check but provides explicit verification that TransformationDetector output
        // correctly integrates with intent coverage validation
        if (autoInjectedNodes.length > 0) {
            console.log(`[DSLGenerator] 🔍 Verifying ${autoInjectedNodes.length} auto-added transformation(s) satisfy intent coverage...`);
            // Check if any intent actions with transformation operations are now covered
            const transformationOperations = ['summarize', 'analyze', 'process', 'transform'];
            // ✅ PHASE 2: Use proper type instead of 'any'
            const intentTransformationActions = (intent.actions || []).filter((action) => transformationOperations.includes((action.operation || '').toLowerCase()));
            if (intentTransformationActions.length > 0) {
                // Intent coverage validation above should have already verified this, but log for transparency
                const dslTransformationTypes = finalTransformations.map(t => t.type.toLowerCase());
                // ✅ PHASE 2: Use proper type instead of 'any'
                const coveredActions = intentTransformationActions.filter((action) => {
                    const actionType = (action.type || '').toLowerCase();
                    return dslTransformationTypes.some(dslType => dslType === actionType ||
                        dslType.includes(actionType) ||
                        actionType.includes(dslType));
                });
                if (coveredActions.length === intentTransformationActions.length) {
                    console.log(`[DSLGenerator] ✅ All ${intentTransformationActions.length} transformation intent action(s) are covered by DSL transformations`);
                }
                else {
                    console.warn(`[DSLGenerator] ⚠️  ${intentTransformationActions.length - coveredActions.length} transformation intent action(s) may not be fully covered`);
                }
            }
        }
        console.log(`[DSLGenerator] ✅ Generated DSL: ${breakdown.dataSources} data sources, ${breakdown.transformations} transformations, ${breakdown.outputs} outputs`);
        console.log(`[DSLGenerator] ✅ Semantic validation passed: All ${originalActionCount} intent actions categorized`);
        console.log(`[DSLGenerator]   Intent action breakdown: ${intentActionsInDataSources} in dataSources, ${intentActionsInOutputs} in outputs, ${intentActionsInTransformations} in transformations`);
        if (breakdown.transformations > intentActionsInTransformations) {
            const autoAddedTransformations = breakdown.transformations - intentActionsInTransformations;
            console.log(`[DSLGenerator] ℹ️  ${autoAddedTransformations} transformation(s) auto-added by TransformationDetector (total: ${breakdown.transformations}, from intent: ${intentActionsInTransformations})`);
        }
        return dsl;
    }
    /**
     * Normalize output node types with prompt context (deterministic).
     * Fixes critical ambiguity: StructuredIntent may emit `email` even when the user asked for Gmail.
     */
    normalizeOutputNodeType(actionType, operation, originalPrompt) {
        const t = (actionType || '').toLowerCase().trim();
        const op = (operation || '').toLowerCase().trim();
        const p = (originalPrompt || '').toLowerCase();
        const isSend = op === 'send' || op.includes('send') || op.includes('notify');
        const mentionsGmail = p.includes('gmail') ||
            p.includes('google mail') ||
            p.includes('google email') ||
            p.includes('gmali') ||
            /\bgm(?:ai|ia)l\b/i.test(p);
        const mentionsSmtp = p.includes('smtp') || p.includes('mail server') || p.includes('smtp host');
        if (isSend) {
            // Explicit gmail-like action type
            if (t.includes('gmail') || t.includes('google_gmail') || t.includes('google_mail') || t.includes('google mail')) {
                return 'google_gmail';
            }
            // Ambiguous generic email: prefer Gmail unless SMTP explicitly requested
            if ((t === 'email' || t === 'mail' || t.includes('email')) && mentionsGmail && !mentionsSmtp) {
                return 'google_gmail';
            }
            // For generic "send email" without mention, default to Gmail (OAuth-first)
            if ((t === 'email' || t === 'mail') && !mentionsSmtp) {
                return 'google_gmail';
            }
            // Explicit SMTP requested
            if ((t === 'email' || t.includes('email')) && mentionsSmtp && !mentionsGmail) {
                return 'email';
            }
        }
        return actionType;
    }
    /**
     * Get reason why action categorization failed
     * Used for detailed error logging
     */
    getCategorizationFailureReason(type, operation) {
        const typeLower = type.toLowerCase();
        const operationLower = operation.toLowerCase();
        // Check if type exists in capability registry
        const capabilities = node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.getCapabilities(type);
        if (capabilities.length === 0) {
            return `Node type "${type}" not found in capability registry. No capabilities defined.`;
        }
        // ✅ ROOT-LEVEL FIX: Use constants for operation semantics
        if (!(0, operation_semantics_1.isReadOperation)(operation) &&
            !(0, operation_semantics_1.isTransformOperation)(operation) &&
            !(0, operation_semantics_1.isWriteOperation)(operation)) {
            return `Operation "${operation}" does not match expected patterns for data source, transformation, or output operations.`;
        }
        // Type has capabilities but doesn't match any category
        return `Node type "${type}" has capabilities [${capabilities.join(', ')}] but does not match data source, transformation, or output categories for operation "${operation}".`;
    }
    /**
     * ✅ CRITICAL FIX: Infer operation from prompt context when missing
     *
     * Priority order:
     * 1. Check prompt keywords (send, read, write, etc.) near the node type
     * 2. Check node type context (gmail → send, sheets → read)
     * 3. Use schema default operation
     *
     * This ensures operations are correctly inferred even when intent extraction fails.
     *
     * @param nodeType - Node type (e.g., 'google_gmail')
     * @param rawType - Original node type from intent
     * @param prompt - Original user prompt
     * @param schema - Node schema (optional, for fallback)
     * @returns Inferred operation
     */
    inferOperationFromPromptContext(nodeType, rawType, prompt, schema) {
        const promptLower = (prompt || '').toLowerCase();
        const nodeTypeLower = (nodeType || '').toLowerCase();
        const rawTypeLower = (rawType || '').toLowerCase();
        // ✅ STEP 1: Check prompt keywords near node type
        // Look for operation keywords in a window around the node type mention
        const nodeTypePattern = new RegExp(`(?:\\b${rawTypeLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b|\\b${nodeTypeLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'i');
        const nodeTypeIndex = promptLower.search(nodeTypePattern);
        if (nodeTypeIndex >= 0) {
            // Extract context window (50 chars before and after node type)
            const contextStart = Math.max(0, nodeTypeIndex - 50);
            const contextEnd = Math.min(promptLower.length, nodeTypeIndex + rawTypeLower.length + 50);
            const context = promptLower.substring(contextStart, contextEnd);
            // Check for write/output operations
            if (/\b(send|post|write|create|update|notify|deliver|publish|share)\b/.test(context)) {
                return 'send';
            }
            // Check for read/data source operations
            if (/\b(read|get|fetch|retrieve|pull|extract|grab|obtain)\b/.test(context)) {
                return 'read';
            }
            // Check for transform operations
            if (/\b(transform|process|analyze|summarize|classify|translate|generate)\b/.test(context)) {
                return 'transform';
            }
        }
        // ✅ STEP 2: Check node type context (heuristic-based)
        // Gmail/email nodes typically send
        if (nodeTypeLower.includes('gmail') || nodeTypeLower.includes('email') || nodeTypeLower.includes('mail')) {
            // Check if prompt mentions "send" anywhere
            if (/\b(send|post|notify|deliver)\b/.test(promptLower)) {
                return 'send';
            }
            // Default for email nodes is send
            return 'send';
        }
        // Sheets/database nodes typically read
        if (nodeTypeLower.includes('sheet') || nodeTypeLower.includes('database') || nodeTypeLower.includes('db')) {
            // Check if prompt mentions "write" or "create"
            if (/\b(write|create|insert|add)\b/.test(promptLower)) {
                return 'write';
            }
            // Default for data source nodes is read
            return 'read';
        }
        // ✅ STEP 3: Use schema default operation (last resort)
        if (schema?.configSchema?.optional?.operation) {
            const opField = schema.configSchema.optional.operation;
            // Try to get first example or default
            if (opField.examples && opField.examples.length > 0) {
                return String(opField.examples[0]).toLowerCase();
            }
            if (opField.default) {
                return String(opField.default).toLowerCase();
            }
        }
        // ✅ STEP 4: Final fallback - use category-based default
        // This should rarely be reached, but ensures we always return a valid operation
        const { nodeCapabilityRegistryDSL } = require('./node-capability-registry-dsl');
        if (nodeCapabilityRegistryDSL.isOutput(nodeType)) {
            return 'send';
        }
        if (nodeCapabilityRegistryDSL.isTransformation(nodeType)) {
            return 'transform';
        }
        if (nodeCapabilityRegistryDSL.isDataSource(nodeType)) {
            return 'read';
        }
        // Absolute last resort
        return 'read';
    }
    /**
     * ✅ SOLUTION 1: Normalize compound operations to base keywords
     *
     * Extracts base keyword from compound operations like:
     * - "create_contact" -> "create"
     * - "analyze_contact" -> "analyze"
     * - "send_notification" -> "send"
     *
     * This allows operation matching to work with planner-generated compound operations.
     *
     * @param operation - Operation string (may be compound like "create_contact")
     * @returns Normalized base keyword (e.g., "create", "analyze", "send")
     */
    normalizeOperation(operation) {
        if (!operation)
            return '';
        const operationLower = operation.toLowerCase().trim();
        // ✅ ROOT-LEVEL FIX: Use constants for operation semantics
        const allKeywords = [...operation_semantics_1.OUTPUT_KEYWORDS, ...operation_semantics_1.TRANSFORM_OPERATIONS, ...operation_semantics_1.DATA_SOURCE_KEYWORDS];
        // Strategy 1: Check if operation starts with a keyword
        for (const keyword of allKeywords) {
            if (operationLower === keyword) {
                return keyword; // Exact match
            }
            if (operationLower.startsWith(keyword + '_')) {
                return keyword; // "create_contact" -> "create"
            }
            if (operationLower.includes('_' + keyword + '_')) {
                return keyword; // "some_create_contact" -> "create"
            }
            if (operationLower.endsWith('_' + keyword)) {
                return keyword; // "contact_create" -> "create"
            }
        }
        // Strategy 2: Extract first word before underscore
        const firstPart = operationLower.split('_')[0];
        if (allKeywords.includes(firstPart)) {
            return firstPart; // "create_contact" -> "create" (via split)
        }
        // Strategy 3: Check if operation contains keyword (fallback)
        for (const keyword of allKeywords) {
            if (operationLower.includes(keyword)) {
                return keyword; // "recreate" -> "create" (contains check)
            }
        }
        // Fallback: return original operation if no keyword found
        return operationLower;
    }
    /**
     * ✅ PHASE 2: Determine category from schema operations directly (no categorization needed)
     *
     * Uses schema.configSchema.optional.operation to determine category:
     * - Read operations (read, fetch, get, query) → dataSource
     * - Write operations (write, send, post, create, update, notify) → output
     * - Transform operations (transform, analyze, summarize, process) → transformation
     *
     * This eliminates the need for the categorizer - schema defines what node can do.
     *
     * @param schema - Node schema from nodeLibrary
     * @param operation - Operation from intent or schema default
     * @returns Category: 'dataSource' | 'transformation' | 'output'
     */
    /**
     * ✅ UNIVERSAL: Determine category from schema and operation
     *
     * This method categorizes nodes based on OPERATION, not hardcoded patches.
     * Works for ALL nodes universally.
     *
     * Categorization Logic (in priority order):
     * 1. Operation-based categorization (read → dataSource, write → output, transform → transformation)
     * 2. Registry category fallback (if operation doesn't match known patterns)
     *
     * NO hardcoded patches - all nodes use the same logic.
     *
     * @param schema - Node schema from nodeLibrary
     * @param operation - Operation from intent (validated against schema)
     * @returns Category: 'dataSource' | 'transformation' | 'output'
     */
    /**
     * ✅ UNIVERSAL ROOT-LEVEL: Determine category from node schema and operation
     * Uses node-specific operation semantics, NOT hardcoded global lists
     *
     * Flow:
     * 1. Get node definition from registry
     * 2. Get operation semantic from NodeOperationSemantics (node-specific)
     * 3. Map semantic to DSL category
     * 4. Fallback to node category if semantic unknown
     */
    determineCategoryFromSchema(schema, operation) {
        // ✅ OPERATIONS-FIRST: Get node definition
        const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(schema.type);
        if (!nodeDef) {
            throw new Error(`Node ${schema.type} not found in registry`);
        }
        // ✅ SPECIAL NODES: Handle separately - triggers should NEVER reach here
        if (nodeDef.category === 'trigger') {
            throw new Error(`Node ${schema.type} is a TRIGGER (category: trigger) but was passed to determineCategoryFromSchema. Triggers should be handled separately and never categorized here.`);
        }
        // ✅ STEP 1: Ensure operation is at least a valid or default operation for this node
        const nodeOperations = this.getOperationsFromNodeSchema(nodeDef);
        if (operation && !nodeOperations.includes(operation)) {
            console.warn(`[DSLGenerator] ⚠️  Operation "${operation}" not in ${schema.type} schema. Available: ${nodeOperations.join(', ')}`);
            // Use default operation if available, otherwise first available
            const defaultOp = this.getDefaultOperationFromNode(nodeDef);
            if (defaultOp && nodeOperations.includes(defaultOp)) {
                operation = defaultOp;
                console.log(`[DSLGenerator] ✅ Using default operation "${operation}" for ${schema.type}`);
            }
            else if (nodeOperations.length > 0) {
                operation = nodeOperations[0];
                console.log(`[DSLGenerator] ✅ Using first available operation "${operation}" for ${schema.type}`);
            }
        }
        // ✅ STEP 2: Use node-specific operation semantics to determine DSL category
        const semanticInfo = (0, node_operation_semantics_1.getOperationSemantic)(schema.type, operation);
        const dslCategory = (0, node_operation_semantics_1.getDSLCategoryFromSemantic)(semanticInfo.semantic, schema.type);
        console.log(`[DSLGenerator] ✅ OPERATIONS-FIRST: Categorized ${schema.type} as ${dslCategory} ` +
            `(semantic="${semanticInfo.semantic}", derivedFrom=${semanticInfo.derivedFrom}, operation="${operation}")`);
        return dslCategory;
    }
    /**
     * ✅ OPERATIONS-FIRST: Get operations directly from node's schema
     * Universal, root-level - works for ALL nodes automatically
     */
    getOperationsFromNodeSchema(nodeDef) {
        const operations = [];
        // Method 1: Check inputSchema.operation (enum or oneOf)
        if (nodeDef.inputSchema?.operation) {
            const opField = nodeDef.inputSchema.operation;
            if (opField.type === 'string' && opField.enum) {
                operations.push(...opField.enum);
            }
            else if (opField.oneOf) {
                for (const option of opField.oneOf) {
                    if (option.const) {
                        operations.push(option.const);
                    }
                }
            }
        }
        return operations;
    }
    /**
     * ✅ OPERATIONS-FIRST: Get default operation from node's schema
     * Universal, root-level - works for ALL nodes automatically
     */
    getDefaultOperationFromNode(nodeDef) {
        try {
            const defaultConfig = nodeDef.defaultConfig();
            if (defaultConfig && defaultConfig.operation && typeof defaultConfig.operation === 'string') {
                return defaultConfig.operation;
            }
        }
        catch (error) {
            // defaultConfig might throw, ignore
        }
        // Fallback: first operation from schema
        const operations = this.getOperationsFromNodeSchema(nodeDef);
        return operations.length > 0 ? operations[0] : '';
    }
    /**
     * ✅ LONG-TERM FIX: Validate operations against node schemas
     * Ensures AI-selected operations match node schemas (enum/oneOf)
     * This prevents wrong operations from passing through to execution
     */
    validateOperationsAgainstSchemas(dsl) {
        const { unifiedNodeRegistry } = require('../../core/registry/unified-node-registry');
        const { unifiedNormalizeNodeTypeString } = require('../../core/utils/unified-node-type-normalizer');
        const warnings = [];
        // Validate all DSL components
        const allComponents = [
            ...dsl.dataSources.map(ds => ({ type: ds.type, operation: ds.operation, category: 'dataSource' })),
            ...dsl.transformations.map(tf => ({ type: tf.type, operation: tf.operation, category: 'transformation' })),
            ...dsl.outputs.map(out => ({ type: out.type, operation: out.operation, category: 'output' }))
        ];
        for (const component of allComponents) {
            if (!component.type || !component.operation) {
                continue; // Skip if missing type or operation
            }
            const normalizedType = unifiedNormalizeNodeTypeString(component.type);
            const nodeDef = unifiedNodeRegistry.get(normalizedType);
            if (!nodeDef) {
                warnings.push(`Node type "${component.type}" not found in registry (operation: ${component.operation})`);
                continue;
            }
            // Get valid operations from schema
            const validOperations = this.getOperationsFromNodeSchema(nodeDef);
            // If node has no operations defined, skip validation (action-based nodes)
            if (validOperations.length === 0) {
                continue;
            }
            // Check if operation matches schema
            const operationLower = (component.operation || '').toLowerCase();
            const isValidOperation = validOperations.some(op => op.toLowerCase() === operationLower);
            if (!isValidOperation) {
                const defaultOp = this.getDefaultOperationFromNode(nodeDef);
                warnings.push(`Operation "${component.operation}" for ${component.type} (${component.category}) ` +
                    `does not match schema. Valid operations: ${validOperations.join(', ')}. ` +
                    `Using default: ${defaultOp}`);
                // Auto-fix: Use default operation if invalid
                if (defaultOp) {
                    console.log(`[DSLGenerator] ✅ Auto-fixing operation for ${component.type}: ` +
                        `"${component.operation}" → "${defaultOp}"`);
                    // Update operation in DSL
                    if (component.category === 'dataSource') {
                        const ds = dsl.dataSources.find(ds => ds.type === component.type);
                        if (ds)
                            ds.operation = defaultOp;
                    }
                    else if (component.category === 'transformation') {
                        const tf = dsl.transformations.find(tf => tf.type === component.type);
                        if (tf)
                            tf.operation = defaultOp;
                    }
                    else if (component.category === 'output') {
                        const out = dsl.outputs.find(out => out.type === component.type);
                        if (out)
                            out.operation = defaultOp;
                    }
                }
            }
        }
        if (warnings.length > 0) {
            console.warn(`[DSLGenerator] ⚠️  Operation validation warnings (${warnings.length}):`);
            warnings.forEach(w => console.warn(`  - ${w}`));
        }
        else {
            console.log(`[DSLGenerator] ✅ All operations validated against node schemas`);
        }
    }
    /**
     * ✅ ROOT-LEVEL FIX: Operation-based classification helpers
     * These check the OPERATION first, not capabilities
     * This ensures correct categorization based on user intent
     *
     * ✅ ENHANCED: Now uses normalized operations to handle compound operations
     */
    // ✅ ROOT-LEVEL FIX: Use constants for operation semantics
    isOutputOperation(operation) {
        const normalized = this.normalizeOperation(operation);
        return (0, operation_semantics_1.isWriteOperation)(normalized);
    }
    isTransformationOperation(operation) {
        const normalized = this.normalizeOperation(operation);
        return (0, operation_semantics_1.isTransformOperation)(normalized);
    }
    isDataSourceOperation(operation) {
        const normalized = this.normalizeOperation(operation);
        return (0, operation_semantics_1.isReadOperation)(normalized);
    }
    /**
     * ✅ UNIVERSAL: Determine intended capability for a node based on operation and user intent
     *
     * This method determines the PRIMARY role a node should play in this specific workflow,
     * even if the node has multiple capabilities. This enables context-aware classification
     * for multi-capability nodes (e.g., postgresql can be data_source OR output).
     *
     * @param nodeType - Node type (e.g., 'postgresql', 'http_post')
     * @param operation - Operation being performed (e.g., 'read', 'write', 'send')
     * @param defaultCategory - Default category from DSL categorization ('data_source' | 'transformation' | 'output')
     * @param originalPrompt - Original user prompt (for context-aware determination)
     * @returns Object with intendedCapability and availableCapabilities
     */
    determineIntendedCapability(nodeType, operation, defaultCategory, originalPrompt) {
        // Get available capabilities from registry
        const normalizedType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(nodeType);
        const availableCapabilities = node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.getCapabilities(normalizedType);
        // ✅ PHASE 8: Priority 0: Capability from tags (highest priority - AI-specified)
        const nodeCapabilitiesFromTags = this._nodeCapabilitiesFromTags || {};
        if (nodeCapabilitiesFromTags[normalizedType]) {
            const capabilityFromTag = nodeCapabilitiesFromTags[normalizedType];
            // Validate that the capability from tag is available for this node
            const capabilityMap = {
                'data_source': ['data_source', 'read_data', 'fetch_data'],
                'transformation': ['transformation', 'process_data', 'transform_data'],
                'output': ['output', 'write_data', 'send_data', 'send'],
            };
            const mappedCapabilities = capabilityMap[capabilityFromTag] || [];
            if (mappedCapabilities.some(cap => availableCapabilities.includes(cap))) {
                console.log(`[DSLGenerator] ✅ PHASE 8: Using capability from tag for ${normalizedType}: ${capabilityFromTag}`);
                return {
                    intendedCapability: capabilityFromTag,
                    availableCapabilities,
                };
            }
            else {
                console.warn(`[DSLGenerator] ⚠️  PHASE 8: Capability "${capabilityFromTag}" from tag not available for ${normalizedType}, falling back to operation semantics`);
            }
        }
        // Determine intended capability based on operation semantics
        const normalizedOperation = this.normalizeOperation(operation);
        // Priority 1: Operation semantics (most reliable)
        if ((0, operation_semantics_1.isReadOperation)(normalizedOperation)) {
            return {
                intendedCapability: 'data_source',
                availableCapabilities,
            };
        }
        if ((0, operation_semantics_1.isWriteOperation)(normalizedOperation) || normalizedOperation.includes('send') || normalizedOperation.includes('post')) {
            return {
                intendedCapability: 'output',
                availableCapabilities,
            };
        }
        if ((0, operation_semantics_1.isTransformOperation)(normalizedOperation)) {
            return {
                intendedCapability: 'transformation',
                availableCapabilities,
            };
        }
        // Priority 2: Default category (from DSL categorization)
        // This is the category the node was placed in during DSL generation
        if (defaultCategory === 'data_source' || defaultCategory === 'transformation' || defaultCategory === 'output') {
            return {
                intendedCapability: defaultCategory,
                availableCapabilities,
            };
        }
        // Priority 3: Available capabilities (fallback)
        // If node has only one capability, use that
        const hasDataSource = availableCapabilities.includes('data_source') || availableCapabilities.includes('read_data');
        const hasTransformation = availableCapabilities.includes('transformation');
        const hasOutput = availableCapabilities.includes('output') || availableCapabilities.includes('write_data') || availableCapabilities.includes('send');
        if (hasTransformation && !hasDataSource && !hasOutput) {
            return {
                intendedCapability: 'transformation',
                availableCapabilities,
            };
        }
        if (hasOutput && !hasDataSource && !hasTransformation) {
            return {
                intendedCapability: 'output',
                availableCapabilities,
            };
        }
        if (hasDataSource && !hasOutput && !hasTransformation) {
            return {
                intendedCapability: 'data_source',
                availableCapabilities,
            };
        }
        // Priority 4: Default to transformation (safest fallback)
        return {
            intendedCapability: 'transformation',
            availableCapabilities,
        };
    }
    /**
     * ✅ PHASE 10: Validate execution order matches capability order from tags
     * Ensures that nodes are ordered according to their capabilities from tags: data_source → transformation → output
     *
     * @param executionOrder - DSL execution order
     * @param dataSources - DSL data sources
     * @param transformations - DSL transformations
     * @param outputs - DSL outputs
     * @param nodeCapabilitiesFromTags - Capabilities from tags (format: { "nodeType": "capability" })
     * @returns Validation result
     */
    validateExecutionOrderAgainstTags(executionOrder, dataSources, transformations, outputs, nodeCapabilitiesFromTags) {
        const errors = [];
        // Build a map of stepRef -> capability from tags
        const stepRefToCapability = new Map();
        // Map data sources
        for (const ds of dataSources) {
            const capability = nodeCapabilitiesFromTags[ds.type];
            if (capability) {
                stepRefToCapability.set(ds.id, capability);
            }
        }
        // Map transformations
        for (const tf of transformations) {
            const capability = nodeCapabilitiesFromTags[tf.type];
            if (capability) {
                stepRefToCapability.set(tf.id, capability);
            }
        }
        // Map outputs
        for (const out of outputs) {
            const capability = nodeCapabilitiesFromTags[out.type];
            if (capability) {
                stepRefToCapability.set(out.id, capability);
            }
        }
        // Validate order: data_source → transformation → output
        const capabilityOrder = {
            'data_source': 1,
            'transformation': 2,
            'output': 3,
        };
        for (let i = 0; i < executionOrder.length; i++) {
            const step = executionOrder[i];
            const currentCapability = stepRefToCapability.get(step.stepRef);
            if (!currentCapability) {
                continue; // Skip steps without capability from tags
            }
            // Check all previous steps
            for (let j = 0; j < i; j++) {
                const previousStep = executionOrder[j];
                const previousCapability = stepRefToCapability.get(previousStep.stepRef);
                if (!previousCapability) {
                    continue; // Skip steps without capability from tags
                }
                // Validate order: previous capability should come before current capability
                const previousOrder = capabilityOrder[previousCapability] || 999;
                const currentOrder = capabilityOrder[currentCapability] || 999;
                if (previousOrder > currentOrder) {
                    errors.push(`Step "${step.stepRef}" (${currentCapability}) appears before step "${previousStep.stepRef}" (${previousCapability}) in execution order, but capability order requires ${previousCapability} → ${currentCapability}`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    // ✅ PHASE 1 FIX: Removed duplicate categorization methods
    // All categorization now uses unifiedNodeCategorizer as single source of truth
    // Old methods (isDataSource, isTransformation, isOutput) removed - use unifiedNodeCategorizer.categorizeWithOperation() instead
    /**
     * Map transformation operation
     */
    mapTransformationOperation(operation) {
        const mapping = {
            'summarize': 'summarize',
            'analyze': 'analyze',
            'classify': 'classify',
            'translate': 'translate',
            'extract': 'extract',
            'transform': 'transform',
            'process': 'process',
        };
        return mapping[operation] || 'transform';
    }
    /**
     * Ensure LLM node (ai_chat_model) exists for AI transformations
     *
     * Guaranteed LLM node injection:
     * - If structuredIntent.transformations contains: summarize, analyze, classify, generate, ai_processing
     * - Then inject ai_chat_model node if missing
     * - Ensures LLM always exists for AI transformations
     *
     * @param intent - StructuredIntent with transformations
     * @param transformations - Current transformations array
     * @param stepCounter - Current step counter
     * @param autoInjectedNodesSet - Set tracking auto-injected nodes
     * @returns Injection result with nodes and updated counter
     */
    async ensureLLMNodeInDSL(intent, transformations, stepCounter, autoInjectedNodesSet, originalPrompt) {
        // ✅ FIX #1: AI operations that require LLM node (REMOVED 'transform', 'process', 'create' - too generic)
        // Only include explicit AI operations, not generic data transformation or CRUD operations
        // 'create' is a CRUD operation (create record in CRM), NOT an AI operation
        const aiOperations = ['summarize', 'summarise', 'analyze', 'analyse', 'classify', 'generate', 'ai_processing', 'translate', 'extract'];
        // ✅ FIX #2: Check if original prompt mentions AI (semantic validation)
        const originalPromptLower = (originalPrompt || '').toLowerCase();
        const originalMentionsAI = originalPromptLower.includes('ai') ||
            originalPromptLower.includes('chatbot') ||
            originalPromptLower.includes('llm') ||
            originalPromptLower.includes('summarize') ||
            originalPromptLower.includes('summarise') ||
            originalPromptLower.includes('analyze') ||
            originalPromptLower.includes('analyse') ||
            originalPromptLower.includes('classify') ||
            originalPromptLower.includes('generate') ||
            originalPromptLower.includes('translate');
        // Check if intent.transformations contains AI operations
        const intentTransformations = intent.transformations || [];
        const hasAIOperations = intentTransformations.some(tf => {
            const operation = (tf.operation || '').toLowerCase();
            const nodeType = (tf.type || '').toLowerCase();
            // ✅ FIX #1: Skip communication nodes with 'transform' operation (not AI)
            const isCommunicationNode = ['google_gmail', 'slack_message', 'email', 'telegram', 'discord', 'microsoft_teams', 'whatsapp_cloud'].includes(nodeType);
            if (isCommunicationNode && operation === 'transform') {
                return false; // Don't treat communication node 'transform' as AI operation
            }
            return aiOperations.some(aiOp => operation.includes(aiOp));
        });
        // Also check intent.actions for AI operations
        const intentActions = intent.actions || [];
        const hasAIActions = intentActions.some(action => {
            const operation = (action.operation || '').toLowerCase();
            const type = (action.type || '').toLowerCase();
            // ✅ FIX #1: Skip communication nodes with 'transform' operation (not AI)
            const isCommunicationNode = ['google_gmail', 'slack_message', 'email', 'telegram', 'discord', 'microsoft_teams', 'whatsapp_cloud'].includes(type);
            if (isCommunicationNode && operation === 'transform') {
                return false; // Don't treat communication node 'transform' as AI operation
            }
            return aiOperations.some(aiOp => operation.includes(aiOp)) ||
                type.includes('ai') || type.includes('llm') || type.includes('chat');
        });
        // ✅ FIX #2: If original prompt doesn't mention AI AND no explicit AI operations detected, no injection needed
        if (!originalMentionsAI && !hasAIOperations && !hasAIActions) {
            console.log(`[DSLGenerator] ⚠️  Skipping AI injection: Original prompt doesn't mention AI and no explicit AI operations detected`);
            return { injected: false, nodes: [], nextStepCounter: stepCounter, injectedNodeTypes: [] };
        }
        // ✅ FIX #2: If original prompt doesn't mention AI but we detected AI operations, log warning
        if (!originalMentionsAI && (hasAIOperations || hasAIActions)) {
            console.warn(`[DSLGenerator] ⚠️  AI operations detected but original prompt doesn't mention AI. Original: "${originalPrompt?.substring(0, 100)}..."`);
            // Still inject if explicit AI operations detected (might be from transformation detection)
        }
        // ✅ WORLD-CLASS UNIVERSAL: Check for ANY existing AI processing nodes
        // Uses registry-based check - works for ALL AI nodes (ai_chat_model, ollama, openai_gpt, anthropic_claude, etc.)
        // All AI nodes perform the same 'ai_processing' operation, so we should not inject if any exists
        const { isAIChatNode } = require('../../core/utils/universal-node-type-checker');
        const existingLLMNodes = transformations.filter(tf => {
            return isAIChatNode(tf.type || '');
        });
        // If any AI processing node already exists, no injection needed (prevent duplicates)
        if (existingLLMNodes.length > 0) {
            const existingTypes = existingLLMNodes.map(tf => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(tf.type)).join(', ');
            console.log(`[DSLGenerator] ✅ AI processing node(s) already exist in transformations: ${existingTypes} (${existingLLMNodes.length} node(s)) - skipping duplicate injection`);
            return { injected: false, nodes: [], nextStepCounter: stepCounter, injectedNodeTypes: [] };
        }
        // Verify ai_chat_model is registered in NodeLibrary
        if (!node_library_1.nodeLibrary.isNodeTypeRegistered('ai_chat_model')) {
            console.error(`[DSLGenerator] ❌ Cannot inject ai_chat_model: Node type not registered in NodeLibrary`);
            return { injected: false, nodes: [], nextStepCounter: stepCounter, injectedNodeTypes: [] };
        }
        // Determine operation from intent
        let operation = 'summarize';
        if (hasAIOperations) {
            const firstAIOperation = intentTransformations.find(tf => {
                const op = (tf.operation || '').toLowerCase();
                return aiOperations.some(aiOp => op.includes(aiOp));
            });
            if (firstAIOperation) {
                // ✅ Use NodeOperationIndex for operation mapping (universal)
                const nodeType = firstAIOperation.type || 'ai_chat_model';
                operation = await this.mapVerbToOperation(firstAIOperation.operation || 'summarize', nodeType);
            }
        }
        else if (hasAIActions) {
            const firstAIAction = intentActions.find(action => {
                const op = (action.operation || '').toLowerCase();
                return aiOperations.some(aiOp => op.includes(aiOp));
            });
            if (firstAIAction) {
                // ✅ Use NodeOperationIndex for operation mapping (universal)
                const nodeType = firstAIAction.type || 'ai_chat_model';
                operation = await this.mapVerbToOperation(firstAIAction.operation || 'summarize', nodeType);
            }
        }
        // Inject ai_chat_model node
        const llmNode = {
            id: `tf_${stepCounter++}`,
            type: 'ai_chat_model',
            operation: operation,
            config: {
                provider: 'gemini',
                model: 'qwen2.5:14b-instruct-q4_K_M',
            },
            description: 'Guaranteed LLM node injection for AI transformations',
            origin: {
                source: 'auto',
                stage: 'dsl_generation',
            },
            protected: false, // Auto-injected nodes are not protected
        };
        console.log(`[DSLGenerator] ✅ Guaranteed LLM node injection: Adding ai_chat_model (operation: ${operation})`);
        // Track as auto-injected
        autoInjectedNodesSet.add('ai_chat_model');
        return {
            injected: true,
            nodes: [llmNode],
            nextStepCounter: stepCounter,
            injectedNodeTypes: ['ai_chat_model'],
        };
    }
    /**
     * ✅ ROOT FIX: Check if node would be duplicate BEFORE adding (PREVENTION, not removal)
     *
     * This is called BEFORE adding nodes to prevent duplicates at the source.
     * Uses registry to determine operation signatures.
     *
     * @param nodeType - Node type to check
     * @param operation - Operation to check
     * @param existingNodes - Existing nodes in the array
     * @param category - Category of nodes (dataSource, transformation, output)
     * @returns true if node would be duplicate, false otherwise
     */
    wouldBeDuplicateOperation(nodeType, operation, existingNodes, category) {
        const { unifiedNodeRegistry } = require('../../core/registry/unified-node-registry');
        const normalizedType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(nodeType);
        const nodeDef = unifiedNodeRegistry.get(normalizedType);
        if (!nodeDef) {
            return { isDuplicate: false }; // Can't determine operation, allow it
        }
        // Get operation signature for the new node
        const newOperationSignature = this.getOperationSignatureFromRegistry(nodeDef);
        if (!newOperationSignature) {
            return { isDuplicate: false }; // Can't determine operation, allow it
        }
        // Check if any existing node has the same operation signature
        for (const existingNode of existingNodes) {
            const existingNormalizedType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(existingNode.type);
            const existingNodeDef = unifiedNodeRegistry.get(existingNormalizedType);
            if (!existingNodeDef) {
                continue; // Skip if can't determine operation
            }
            const existingOperationSignature = this.getOperationSignatureFromRegistry(existingNodeDef);
            if (existingOperationSignature === newOperationSignature) {
                // Same operation signature - this is a duplicate
                // ✅ WORLD-CLASS UNIVERSAL: Check if both are AI nodes using semantic matching
                // Works for ALL AI nodes (ai_chat_model, ollama, openai_gpt, anthropic_claude, ai_agent, etc.)
                const { isAIChatNode } = require('../../core/utils/universal-node-type-checker');
                const { unifiedNodeTypeMatcher } = require('../../core/utils/unified-node-type-matcher');
                if (isAIChatNode(normalizedType) && isAIChatNode(existingNormalizedType)) {
                    // Both are AI nodes performing the same operation - prefer simpler/more direct node
                    const matchResult = unifiedNodeTypeMatcher.matches(normalizedType, existingNormalizedType, { strict: false });
                    if (matchResult.matches) {
                        return {
                            isDuplicate: true,
                            existingNode,
                            reason: `Duplicate AI processing operation - ${existingNormalizedType} already exists (semantically equivalent to ${normalizedType})`,
                        };
                    }
                }
                return {
                    isDuplicate: true,
                    existingNode,
                    reason: `Duplicate operation "${newOperationSignature}" - ${existingNormalizedType} already exists`,
                };
            }
        }
        return { isDuplicate: false };
    }
    /**
     * ✅ CRITICAL FIX: Detect duplicate operations in DSL using REGISTRY
     *
     * Uses registry properties (category, tags) to determine operation equivalence.
     * Prevents duplicate AI processing operations (ai_agent + ai_chat_model).
     *
     * NOTE: This is a FALLBACK - primary prevention is done via wouldBeDuplicateOperation()
     *
     * @param transformations - DSL transformations to check
     * @returns Array of duplicate operation pairs
     */
    detectDuplicateOperationsInDSL(transformations) {
        const { unifiedNodeRegistry } = require('../../core/registry/unified-node-registry');
        // ✅ PHASE 3: Build array immutably
        let duplicates = [];
        // Group transformations by operation signature
        const operationGroups = new Map();
        for (const tf of transformations) {
            const normalizedType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(tf.type);
            const nodeDef = unifiedNodeRegistry.get(normalizedType);
            if (!nodeDef) {
                continue; // Skip if not in registry
            }
            // Get operation signature from registry (same logic as production-workflow-builder)
            const operationSignature = this.getOperationSignatureFromRegistry(nodeDef);
            if (!operationSignature) {
                continue; // Skip if can't determine operation
            }
            if (!operationGroups.has(operationSignature)) {
                operationGroups.set(operationSignature, []);
            }
            const existing = operationGroups.get(operationSignature) || [];
            operationGroups.set(operationSignature, [...existing, tf]); // ✅ PHASE 3: Immutable add
        }
        // Find duplicates (same operation signature with 2+ nodes)
        for (const [operation, nodes] of operationGroups.entries()) {
            if (nodes.length >= 2) {
                // Found duplicate operations - prefer simpler node (ai_chat_model over ai_agent)
                const types = nodes.map(n => (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(n.type));
                if (types.includes('ai_agent') && types.includes('ai_chat_model')) {
                    duplicates = [...duplicates, {
                            type1: 'ai_agent',
                            type2: 'ai_chat_model',
                            operation: operation,
                        }];
                }
                else if (types.length > 1) {
                    // Other duplicate operations
                    duplicates = [...duplicates, {
                            type1: types[0],
                            type2: types[1],
                            operation: operation,
                        }];
                }
            }
        }
        return duplicates;
    }
    /**
     * ✅ UNIVERSAL: Get operation signature from registry properties
     *
     * Uses registry category and tags to determine operation signature.
     * Same logic as production-workflow-builder.getOperationSignature()
     */
    // ✅ PHASE 2: Use proper type from registry instead of 'any'
    getOperationSignatureFromRegistry(nodeDef) {
        const category = nodeDef.category;
        const tags = nodeDef.tags || [];
        // AI processing operations
        if (category === 'ai' || tags.some((tag) => ['ai', 'llm', 'chat', 'agent'].includes(tag.toLowerCase()))) {
            return 'ai_processing';
        }
        // CRM/route operations
        if (category === 'data' && tags.some((tag) => ['crm', 'route', 'sales'].includes(tag.toLowerCase()))) {
            return 'crm_route';
        }
        // Database/storage operations
        if (category === 'data' && tags.some((tag) => ['database', 'storage', 'write'].includes(tag.toLowerCase()))) {
            return 'data_storage';
        }
        // Email operations
        if (category === 'communication' && tags.some((tag) => ['email', 'gmail', 'mail'].includes(tag.toLowerCase()))) {
            return 'email_notify';
        }
        // Messaging operations
        if (category === 'communication' && tags.some((tag) => ['slack', 'discord', 'message', 'chat'].includes(tag.toLowerCase()))) {
            return 'messaging';
        }
        return null; // Unknown operation
    }
    /**
     * Apply template structure to DSL components
     * Ensures template pipeline structure is respected while preserving intent-specific node types
     *
     * @param template - Selected workflow template
     * @param currentComponents - Current DSL components
     * @param intent - Structured intent (for node type resolution)
     * @returns Updated DSL components that match template structure
     */
    applyTemplateStructure(template, currentComponents, intent) {
        const { dataSources, transformations, outputs } = currentComponents;
        // Template enforcement rules:
        // 1. Templates guide structure but don't override existing nodes
        // 2. Templates ensure required components exist (data sources, transformations, outputs)
        // 3. Preserve existing node types from intent (don't override with template wildcards)
        let updatedDataSources = [...dataSources];
        let updatedTransformations = [...transformations];
        let updatedOutputs = [...outputs];
        // Template validation: Log if structure doesn't match template expectations
        // (but don't force changes - templates are guides, not strict requirements)
        if (template.pipeline.transformations.length > 0 && updatedTransformations.length === 0) {
            console.log(`[DSLGenerator] ⚠️  Template ${template.id} expects transformations but none found`);
        }
        if (template.pipeline.dataSources.length > 0 && updatedDataSources.length === 0) {
            console.log(`[DSLGenerator] ⚠️  Template ${template.id} expects data sources but none found`);
        }
        if (template.pipeline.outputs.length > 0 && updatedOutputs.length === 0) {
            console.log(`[DSLGenerator] ⚠️  Template ${template.id} expects outputs but none found`);
        }
        // Template structure is validated - existing components are preserved
        // Template acts as a guide/validation, not a replacement
        // The deterministic pipeline builder will ensure correct connections
        return {
            dataSources: updatedDataSources,
            transformations: updatedTransformations,
            outputs: updatedOutputs,
        };
    }
    /**
     * ✅ UNIVERSAL: Map transformation verb to operation using NodeOperationIndex
     * No hardcoded mappings - uses registry to find best operation
     */
    async mapVerbToOperation(verb, nodeType) {
        // If nodeType is provided, use NodeOperationIndex to find best operation
        if (nodeType) {
            try {
                const { nodeOperationIndex } = await Promise.resolve().then(() => __importStar(require('../../core/registry/node-operation-index')));
                nodeOperationIndex.initialize();
                const verbTokens = [verb.toLowerCase()];
                const operationMatch = nodeOperationIndex.findBestOperation(nodeType, verbTokens);
                if (operationMatch && operationMatch.confidence > 0.3) {
                    return operationMatch.operation;
                }
                // Fallback: try to get default operation
                const defaultOp = nodeOperationIndex.getDefaultOperation(nodeType);
                if (defaultOp) {
                    return defaultOp;
                }
            }
            catch (error) {
                console.warn(`[DSLGenerator] ⚠️  Failed to use NodeOperationIndex for ${nodeType}:`, error);
            }
        }
        // ✅ UNIVERSAL FALLBACK: Use generic transformation operation
        // This is acceptable as a fallback - it's not hardcoded verb mapping, just a default
        return 'transform';
    }
    /**
     * ✅ SEMANTIC EQUIVALENCE: Normalize DSL components to canonical types and remove semantic duplicates
     *
     * This ensures DSL contains only canonical types, not semantic equivalents.
     * Example: ["instagram", "instagram_post"] -> ["instagram"] (keep canonical, remove duplicate)
     */
    normalizeSemanticEquivalencesInDSL(dataSources, transformations, outputs, intent) {
        console.log('[DSLGenerator] 🔍 Normalizing semantic equivalences in DSL components...');
        // Normalize data sources
        const normalizedDataSources = this.normalizeDSLComponents(dataSources, (ds) => ds.type, (ds, canonical) => ({ ...ds, type: canonical }), (ds) => ds.operation, 'dataSource');
        // Normalize transformations
        const normalizedTransformations = this.normalizeDSLComponents(transformations, (tf) => tf.type, (tf, canonical) => ({ ...tf, type: canonical }), (tf) => tf.operation, 'transformation');
        // Normalize outputs
        const normalizedOutputs = this.normalizeDSLComponents(outputs, (out) => out.type, (out, canonical) => ({ ...out, type: canonical }), (out) => out.operation, 'output');
        const totalBefore = dataSources.length + transformations.length + outputs.length;
        const totalAfter = normalizedDataSources.length + normalizedTransformations.length + normalizedOutputs.length;
        if (totalAfter < totalBefore) {
            console.log(`[DSLGenerator] ✅ Removed ${totalBefore - totalAfter} semantic duplicate(s) from DSL, ` +
                `kept ${totalAfter} canonical node type(s)`);
        }
        return {
            dataSources: normalizedDataSources,
            transformations: normalizedTransformations,
            outputs: normalizedOutputs,
        };
    }
    /**
     * Helper: Normalize a list of DSL components using semantic equivalence
     */
    normalizeDSLComponents(components, getType, setType, getOperation, componentType) {
        // ✅ PHASE 3: Build array immutably
        let normalized = [];
        const seenCanonicals = new Set();
        for (const component of components) {
            const nodeType = getType(component);
            const operation = getOperation(component);
            // Get category from node definition
            const schema = node_library_1.nodeLibrary.getSchema(nodeType);
            const category = schema?.category?.toLowerCase();
            // Get canonical type
            const canonical = semantic_node_equivalence_registry_1.semanticNodeEquivalenceRegistry.getCanonicalType(nodeType, operation?.toLowerCase(), category);
            // Check if canonical already exists
            if (seenCanonicals.has(canonical.toLowerCase())) {
                console.log(`[DSLGenerator] ⚠️  Skipping semantic duplicate ${componentType}: ${nodeType} ` +
                    `(canonical ${canonical} already in DSL)`);
                continue; // Skip duplicate
            }
            // Add canonical type
            const normalizedComponent = setType(component, canonical);
            normalized = [...normalized, normalizedComponent]; // ✅ PHASE 3: Immutable add
            seenCanonicals.add(canonical.toLowerCase());
            if (canonical !== nodeType) {
                console.log(`[DSLGenerator] ✅ Normalized ${componentType} ${nodeType} -> ${canonical} ` +
                    `(semantic equivalence)`);
            }
        }
        return normalized;
    }
    /**
     * Build execution order
     */
    buildExecutionOrder(trigger, dataSources, transformations, outputs) {
        // ✅ PHASE 3: Build array immutably
        let steps = [];
        let order = 0;
        // Step 0: Trigger
        steps = [...steps, {
                stepId: 'step_trigger',
                stepType: 'trigger',
                stepRef: 'trigger',
                order: order++,
            }];
        // Step 1: Data sources (parallel or sequential)
        for (const ds of dataSources) {
            steps = [...steps, {
                    stepId: `step_${ds.id}`,
                    stepType: 'data_source',
                    stepRef: ds.id,
                    dependsOn: ['step_trigger'],
                    order: order++,
                }];
        }
        // Step 2: Transformations (depend on data sources)
        let lastDataSourceId;
        if (dataSources.length > 0) {
            lastDataSourceId = `step_${dataSources[dataSources.length - 1].id}`;
        }
        for (const tf of transformations) {
            const dependsOn = lastDataSourceId ? [lastDataSourceId] : ['step_trigger'];
            steps = [...steps, {
                    stepId: `step_${tf.id}`,
                    stepType: 'transformation',
                    stepRef: tf.id,
                    dependsOn,
                    order: order++,
                }];
            lastDataSourceId = `step_${tf.id}`;
        }
        // Step 3: Outputs (depend on transformations or data sources)
        const lastStepId = lastDataSourceId || (dataSources.length > 0 ? `step_${dataSources[dataSources.length - 1].id}` : 'step_trigger');
        // ✅ CRITICAL FIX: log_output must ALWAYS be last (universal terminal node)
        // Separate log_output from other outputs to ensure correct execution order
        const regularOutputs = outputs.filter(out => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(out.type || '');
            return nodeType !== 'log_output';
        });
        const logOutputs = outputs.filter(out => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(out.type || '');
            return nodeType === 'log_output';
        });
        // Add regular outputs first (linkedin, gmail, etc.)
        let lastRegularOutputId;
        for (const out of regularOutputs) {
            steps = [...steps, {
                    stepId: `step_${out.id}`,
                    stepType: 'output',
                    stepRef: out.id,
                    dependsOn: [lastStepId],
                    order: order++,
                }];
            lastRegularOutputId = `step_${out.id}`;
        }
        // Then add log_output at the very end (depends on last regular output, or last transformation/data source)
        const logOutputDependsOn = lastRegularOutputId || lastStepId;
        for (const out of logOutputs) {
            steps = [...steps, {
                    stepId: `step_${out.id}`,
                    stepType: 'output',
                    stepRef: out.id,
                    dependsOn: [logOutputDependsOn],
                    order: order++,
                }];
        }
        return steps;
    }
    /**
     * Extract conditions from intent
     * ✅ PHASE 2: Use proper type instead of 'any'
     */
    extractConditions(conditions) {
        return conditions.map((cond, idx) => ({
            id: `cond_${idx}`,
            type: cond.type || 'if_else',
            condition: cond.condition || '',
            truePath: cond.true_path || [],
            falsePath: cond.false_path,
            cases: cond.cases,
        }));
    }
    /**
     * Validate DSL
     */
    validateDSL(dsl) {
        // ✅ PHASE 3: Build arrays immutably (use let for reassignment)
        let errors = [];
        let warnings = [];
        // Validate trigger
        if (!dsl.trigger || !dsl.trigger.type) {
            errors = [...errors, 'DSL must have a trigger']; // ✅ PHASE 3: Immutable add
        }
        // Validate execution order
        if (dsl.executionOrder.length === 0) {
            errors = [...errors, 'DSL must have at least one execution step']; // ✅ PHASE 3: Immutable add
        }
        // Validate step references
        const stepRefs = new Set(['trigger']);
        dsl.dataSources.forEach(ds => stepRefs.add(ds.id));
        dsl.transformations.forEach(tf => stepRefs.add(tf.id));
        dsl.outputs.forEach(out => stepRefs.add(out.id));
        for (const step of dsl.executionOrder) {
            if (step.stepType === 'trigger') {
                if (step.stepRef !== 'trigger') {
                    errors = [...errors, `Trigger step must reference 'trigger', got '${step.stepRef}'`]; // ✅ PHASE 3: Immutable add
                }
            }
            else if (!stepRefs.has(step.stepRef)) {
                errors = [...errors, `Execution step references unknown step: ${step.stepRef}`]; // ✅ PHASE 3: Immutable add
            }
            // Validate dependencies
            if (step.dependsOn) {
                for (const dep of step.dependsOn) {
                    const depStep = dsl.executionOrder.find(s => s.stepId === dep);
                    if (!depStep) {
                        errors = [...errors, `Step ${step.stepId} depends on unknown step: ${dep}`]; // ✅ PHASE 3: Immutable add
                    }
                }
            }
        }
        // Validate transformations have input sources
        for (const tf of dsl.transformations) {
            if (!tf.input) {
                warnings = [...warnings, `Transformation ${tf.id} has no input source specified`]; // ✅ PHASE 3: Immutable add
            }
        }
        // Validate outputs have input sources
        for (const out of dsl.outputs) {
            if (!out.input) {
                warnings = [...warnings, `Output ${out.id} has no input source specified`]; // ✅ PHASE 3: Immutable add
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * ✅ UNIVERSAL FIX: Extract base node name from compound names
     * Handles AI-generated compound names like:
     * - "notion_write_data" -> "notion"
     * - "google_sheets_read" -> "google_sheets"
     * - "slack_send_message" -> "slack_message"
     * - "database_write" -> "database_write" (already base name)
     *
     * Strategy:
     * 1. Check if it's already a registered node type
     * 2. Extract common prefixes (notion_, google_, slack_, etc.)
     * 3. Remove operation suffixes (_write, _read, _send, _create, etc.)
     * 4. Return the base node name
     */
    extractBaseNodeName(compoundName) {
        if (!compoundName || typeof compoundName !== 'string') {
            return compoundName;
        }
        const lower = compoundName.toLowerCase().trim();
        // If it's already a registered node type, return as-is
        if (node_library_1.nodeLibrary.isNodeTypeRegistered(compoundName)) {
            return compoundName;
        }
        // Common node prefixes to extract
        const nodePrefixes = [
            'notion', 'google_', 'slack_', 'linkedin', 'twitter', 'instagram',
            'airtable', 'hubspot', 'zoho_', 'pipedrive', 'db', 'postgresql',
            'mysql', 'mongodb', 'redis', 'snowflake', 'sqlite', 'timescale',
            'openai_', 'anthropic_', 'ollama_', 'ai_', 'chat_',
            'discord', 'telegram', 'whatsapp', 'email', 'gmail',
            'github', 'gitlab', 'bitbucket', 'jira', 'jenkins',
            'shopify', 'woocommerce', 'stripe', 'paypal',
            'aws_', 'azure_', 'gcp_', 'dropbox', 'onedrive', 'ftp', 'sftp',
        ];
        // Operation suffixes to remove
        const operationSuffixes = [
            '_write', '_read', '_send', '_create', '_update', '_delete',
            '_post', '_get', '_put', '_patch', '_data', '_operation',
            '_message', '_notification', '_trigger', '_action',
        ];
        // Strategy 1: Try removing operation suffixes first
        for (const suffix of operationSuffixes) {
            if (lower.endsWith(suffix)) {
                const baseName = compoundName.slice(0, -suffix.length);
                if (node_library_1.nodeLibrary.isNodeTypeRegistered(baseName)) {
                    return baseName;
                }
                // Also try with getSchema (pattern matching)
                const schema = node_library_1.nodeLibrary.getSchema(baseName);
                if (schema) {
                    return schema.type;
                }
            }
        }
        // Strategy 2: Extract known prefixes
        for (const prefix of nodePrefixes) {
            if (lower.startsWith(prefix)) {
                // Try the prefix itself
                if (node_library_1.nodeLibrary.isNodeTypeRegistered(prefix)) {
                    return prefix;
                }
                const schema1 = node_library_1.nodeLibrary.getSchema(prefix);
                if (schema1) {
                    return schema1.type;
                }
                // Try prefix + next word (e.g., "google_sheets" from "google_sheets_read")
                const parts = lower.split('_');
                if (parts.length >= 2 && parts[0] === prefix.replace('_', '')) {
                    const twoPartName = `${parts[0]}_${parts[1]}`;
                    if (node_library_1.nodeLibrary.isNodeTypeRegistered(twoPartName)) {
                        return twoPartName;
                    }
                    const schema2 = node_library_1.nodeLibrary.getSchema(twoPartName);
                    if (schema2) {
                        return schema2.type;
                    }
                }
            }
        }
        // Strategy 3: Try first word as base name (for simple cases)
        const firstWord = lower.split('_')[0];
        if (firstWord && firstWord.length > 2) {
            const schema = node_library_1.nodeLibrary.getSchema(firstWord);
            if (schema) {
                return schema.type;
            }
        }
        // Strategy 4: Try first two words (for compound names like "google_sheets")
        if (lower.includes('_')) {
            const parts = lower.split('_');
            if (parts.length >= 2) {
                const twoWords = `${parts[0]}_${parts[1]}`;
                const schema = node_library_1.nodeLibrary.getSchema(twoWords);
                if (schema) {
                    return schema.type;
                }
            }
        }
        // If no extraction worked, return original (will be handled by pattern matching)
        return compoundName;
    }
    /**
     * ✅ ROOT-LEVEL FIX: Quick semantic match using keyword overlap
     * This is a synchronous fallback for semantic resolution
     * Works for variations like "post on linkedin" -> "linkedin"
     */
    findQuickSemanticMatch(input, metadata) {
        const inputWords = input.toLowerCase().split(/[\s_\-]+/).filter(w => w.length > 2);
        let bestMatch = null;
        for (const node of metadata) {
            const nodeKeywords = node.keywords.map(k => k.toLowerCase());
            let score = 0;
            let matches = 0;
            // Check how many input words match node keywords
            for (const word of inputWords) {
                if (nodeKeywords.some(k => k === word || k.includes(word) || word.includes(k))) {
                    matches++;
                    score += 1;
                }
            }
            // Bonus if node type itself matches
            if (node.type.toLowerCase().includes(inputWords[inputWords.length - 1]) ||
                inputWords.some(w => node.type.toLowerCase().includes(w))) {
                score += 2;
            }
            // Normalize score
            const normalizedScore = matches > 0 ? score / (inputWords.length + 1) : 0;
            if (normalizedScore > 0.5 && (!bestMatch || normalizedScore > bestMatch.score)) {
                bestMatch = { type: node.type, score: normalizedScore };
            }
        }
        return bestMatch && bestMatch.score > 0.6 ? bestMatch.type : null;
    }
    /**
     * ✅ WORLD-CLASS UNIVERSAL: Ensure completeness during DSL generation
     *
     * This is a UNIVERSAL solution that ensures all required nodes are in DSL BEFORE ordering.
     * Missing nodes are added to appropriate DSL component (dataSources, transformations, outputs).
     *
     * This prevents nodes from being added after ordering (which creates branches).
     *
     * @param dataSources - Current data sources
     * @param transformations - Current transformations
     * @param outputs - Current outputs
     * @param intent - Structured intent
     * @param originalPrompt - Original user prompt
     * @param stepCounter - Current step counter
     * @returns Updated DSL components with all required nodes
     */
    ensureCompletenessDuringGeneration(dataSources, transformations, outputs, intent, originalPrompt, stepCounter = 0) {
        // ✅ PHASE 3: Build arrays immutably
        let nodesAdded = [];
        let updatedDataSources = [...dataSources];
        let updatedTransformations = [...transformations];
        let updatedOutputs = [...outputs];
        let currentStepCounter = stepCounter;
        // ✅ UNIVERSAL: Extract required nodes from intent using capability-based validation
        // This uses the same validation logic as validateIntentCoverage, but auto-fixes instead of throwing
        const triggerConfig = (intent.trigger_config || {});
        const capabilityValidation = (0, capability_based_validator_1.validateIntentCoverageByCapabilities)(intent, {
            trigger: {
                type: (intent.trigger || 'manual_trigger'),
                config: triggerConfig
            },
            dataSources: updatedDataSources,
            transformations: updatedTransformations,
            outputs: updatedOutputs,
            executionOrder: [],
        });
        // If validation passes, DSL is complete
        if (capabilityValidation.valid) {
            return {
                dataSources: updatedDataSources,
                transformations: updatedTransformations,
                outputs: updatedOutputs,
                stepCounter: currentStepCounter,
                nodesAdded: [],
            };
        }
        // ✅ UNIVERSAL: Add missing nodes based on capability requirements
        // This uses capability-based matching (not hardcoded node types)
        for (const missingReq of capabilityValidation.missingRequirements) {
            const requiredCapabilities = missingReq.requiredCapabilities;
            const intentAction = missingReq.intentAction;
            // ✅ Find node type that provides required capabilities
            const nodeType = this.findNodeTypeForCapabilities(requiredCapabilities, intentAction.type);
            if (!nodeType) {
                console.warn(`[DSLGenerator] ⚠️  Cannot find node type for capabilities: ${requiredCapabilities.join(', ')}`);
                continue;
            }
            const normalizedType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(nodeType);
            // ✅ UNIVERSAL: Check if node is already specified by AI (prevent duplicate injection)
            // If AI already specified this node, skip adding it again
            const aiSpecifiedNodesContext = intent?._aiSpecifiedNodesContext;
            if (aiSpecifiedNodesContext) {
                const { isNodeAISpecified } = require('../../core/utils/ai-specified-nodes-context');
                if (isNodeAISpecified(aiSpecifiedNodesContext, normalizedType)) {
                    console.log(`[DSLGenerator] ✅ Node ${normalizedType} already specified by AI - skipping duplicate injection`);
                    continue;
                }
            }
            const schema = node_library_1.nodeLibrary.getSchema(normalizedType);
            if (!schema) {
                console.warn(`[DSLGenerator] ⚠️  Cannot add missing node "${nodeType}" - not in node library`);
                continue;
            }
            // ✅ Determine which DSL component to add to using capability registry
            const capabilities = node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.getCapabilities(normalizedType);
            const isDataSource = capabilities.includes('data_source') || capabilities.includes('read');
            const isTransformation = capabilities.includes('transformation') || capabilities.includes('ai');
            const isOutput = capabilities.includes('output') || capabilities.includes('write') || capabilities.includes('send') || capabilities.includes('terminal');
            // Determine operation from intent action or default
            let operation = intentAction.operation || 'read';
            if (isTransformation) {
                operation = intentAction.operation || 'transform';
            }
            else if (isOutput) {
                operation = intentAction.operation || 'send';
            }
            // Check if node already exists (avoid duplicates)
            const dslNodeTypes = new Set();
            updatedDataSources.forEach(ds => dslNodeTypes.add((0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(ds.type)));
            updatedTransformations.forEach(tf => dslNodeTypes.add((0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(tf.type)));
            updatedOutputs.forEach(out => dslNodeTypes.add((0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(out.type)));
            if (dslNodeTypes.has(normalizedType)) {
                console.log(`[DSLGenerator] ℹ️  Node ${normalizedType} already exists in DSL, skipping`);
                continue;
            }
            // Get config from intent action if available (may not have config property)
            const actionConfig = intentAction.config || {};
            // ✅ UNIVERSAL: Determine intended capability and available capabilities for missing nodes
            const { intendedCapability, availableCapabilities } = this.determineIntendedCapability(normalizedType, operation, isDataSource ? 'data_source' : (isTransformation ? 'transformation' : 'output'), originalPrompt);
            if (isDataSource) {
                updatedDataSources = [...updatedDataSources, {
                        id: `ds_${currentStepCounter++}`,
                        type: normalizedType,
                        operation: operation,
                        config: actionConfig,
                        intendedCapability, // ✅ UNIVERSAL: AI-determined intended capability
                        availableCapabilities, // ✅ UNIVERSAL: Available capabilities from registry
                    }];
                nodesAdded = [...nodesAdded, normalizedType]; // ✅ PHASE 3: Immutable add
                console.log(`[DSLGenerator] ✅ Added missing data source to DSL: ${normalizedType} (capabilities: ${requiredCapabilities.join(', ')}, intendedCapability: ${intendedCapability})`);
            }
            else if (isTransformation) {
                updatedTransformations = [...updatedTransformations, {
                        id: `tf_${currentStepCounter++}`,
                        type: normalizedType,
                        operation: operation,
                        config: actionConfig,
                        intendedCapability, // ✅ UNIVERSAL: AI-determined intended capability
                        availableCapabilities, // ✅ UNIVERSAL: Available capabilities from registry
                    }];
                nodesAdded = [...nodesAdded, normalizedType]; // ✅ PHASE 3: Immutable add
                console.log(`[DSLGenerator] ✅ Added missing transformation to DSL: ${normalizedType} (capabilities: ${requiredCapabilities.join(', ')}, intendedCapability: ${intendedCapability})`);
            }
            else if (isOutput) {
                updatedOutputs = [...updatedOutputs, {
                        id: `out_${currentStepCounter++}`,
                        type: normalizedType,
                        operation: operation,
                        config: actionConfig,
                        intendedCapability, // ✅ UNIVERSAL: AI-determined intended capability
                        availableCapabilities, // ✅ UNIVERSAL: Available capabilities from registry
                    }];
                nodesAdded = [...nodesAdded, normalizedType]; // ✅ PHASE 3: Immutable add
                console.log(`[DSLGenerator] ✅ Added missing output to DSL: ${normalizedType} (capabilities: ${requiredCapabilities.join(', ')}, intendedCapability: ${intendedCapability})`);
            }
            else {
                console.warn(`[DSLGenerator] ⚠️  Cannot categorize missing node "${nodeType}" - skipping`);
            }
        }
        return {
            dataSources: updatedDataSources,
            transformations: updatedTransformations,
            outputs: updatedOutputs,
            stepCounter: currentStepCounter,
            nodesAdded,
        };
    }
    /**
     * ✅ UNIVERSAL: Find node type that provides required capabilities
     *
     * Uses capability registry to find appropriate node type.
     * This is universal - works for ANY capability requirement.
     *
     * @param requiredCapabilities - Required capabilities (e.g., ['read'], ['write'], ['transform'])
     * @param hintNodeType - Hint from intent action (optional)
     * @returns Node type that provides required capabilities, or null if not found
     */
    findNodeTypeForCapabilities(requiredCapabilities, hintNodeType) {
        // ✅ Try hint node type first (if provided)
        if (hintNodeType) {
            const normalizedHint = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(hintNodeType);
            const hintCapabilities = node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.getCapabilities(normalizedHint);
            // Check if hint node provides all required capabilities
            const providesAll = requiredCapabilities.every(reqCap => hintCapabilities.some(hintCap => hintCap === reqCap ||
                hintCap.includes(reqCap) ||
                reqCap.includes(hintCap)));
            if (providesAll) {
                const schema = node_library_1.nodeLibrary.getSchema(normalizedHint);
                if (schema) {
                    return normalizedHint;
                }
            }
        }
        // ✅ Search node library for node that provides required capabilities
        // This is universal - works for ANY capability requirement
        const allSchemas = node_library_1.nodeLibrary.getAllSchemas();
        for (const schema of allSchemas) {
            const nodeType = schema.type;
            const capabilities = node_capability_registry_dsl_1.nodeCapabilityRegistryDSL.getCapabilities(nodeType);
            // Check if node provides all required capabilities
            const providesAll = requiredCapabilities.every(reqCap => capabilities.some(cap => cap === reqCap ||
                cap.includes(reqCap) ||
                reqCap.includes(cap)));
            if (providesAll) {
                return nodeType;
            }
        }
        return null;
    }
}
exports.DSLGenerator = DSLGenerator;
// Export singleton instance
exports.dslGenerator = new DSLGenerator();
