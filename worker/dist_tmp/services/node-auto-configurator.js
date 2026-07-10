"use strict";
/**
 * Node Auto Configurator
 *
 * Automatically configures node inputs and operations from workflow context
 * without requiring user input.
 *
 * Features:
 * - Automatic operation detection
 * - Input value inference from previous node outputs
 * - Default value application
 * - DataRouter mapping integration
 * - Workflow intent analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeAutoConfigurator = exports.NodeAutoConfigurator = void 0;
const node_library_1 = require("./nodes/node-library");
const node_type_resolver_util_1 = require("../core/utils/node-type-resolver-util");
/**
 * Node Auto Configurator Service
 */
class NodeAutoConfigurator {
    /**
     * Auto-configure a node based on workflow context
     */
    async autoConfigure(node, context) {
        const nodeType = (0, node_type_resolver_util_1.resolveNodeType)(node.data?.type || node.type);
        const schema = node_library_1.nodeLibrary.getSchema(nodeType);
        if (!schema) {
            return {
                success: false,
                config: node.data?.config || {},
                mappedFields: [],
                missingFields: [],
                confidence: 0.0,
                skipWizard: false,
            };
        }
        const config = { ...(node.data?.config || {}) };
        const mappedFields = [];
        const missingFields = [];
        // Step 1: Auto-detect operation
        const operation = this.detectOperation(nodeType, context, schema);
        if (operation) {
            config.operation = operation;
        }
        // Step 2: Infer input values from previous node outputs
        if (context.previousNode) {
            const inputMappings = this.inferInputValues(nodeType, context.previousNode, schema, context);
            for (const mapping of inputMappings) {
                config[mapping.field] = mapping.value;
                mappedFields.push({
                    field: mapping.field,
                    source: context.previousNode.id,
                    sourceField: mapping.sourceField,
                    value: mapping.value,
                });
            }
        }
        // Step 3: Apply default values from schema
        const defaults = this.getDefaultValues(schema, config);
        Object.assign(config, defaults);
        // Step 4: Use DataRouter mappings if available
        if (context.edges && context.previousNode) {
            const dataRouterMappings = this.getDataRouterMappings(context.previousNode, node, context.edges);
            Object.assign(config, dataRouterMappings);
        }
        // Step 5: Check for missing required fields
        const requiredFields = schema.configSchema?.required || [];
        for (const field of requiredFields) {
            if (!config[field] && !this.hasDefaultValue(schema, field)) {
                missingFields.push(field);
            }
        }
        // Step 6: Calculate confidence and skipWizard decision
        const confidence = this.calculateConfidence(config, schema, mappedFields, missingFields);
        const skipWizard = confidence >= 0.8 && missingFields.length === 0;
        return {
            success: missingFields.length === 0,
            config,
            operation,
            mappedFields,
            missingFields,
            confidence,
            skipWizard,
        };
    }
    /**
     * Auto-configure all nodes in a workflow
     */
    async autoConfigureWorkflow(nodes, edges, workflowIntent) {
        const configuredNodes = [];
        let allConfigured = true;
        let skipWizard = true;
        const summary = {
            total: nodes.length,
            configured: 0,
            partial: 0,
            failed: 0,
        };
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const previousNode = i > 0 ? nodes[i - 1] : undefined;
            const nextNode = i < nodes.length - 1 ? nodes[i + 1] : undefined;
            const context = {
                nodes,
                edges,
                previousNode,
                nextNode,
                workflowIntent,
                nodeIndex: i,
            };
            const result = await this.autoConfigure(node, context);
            // Update node config
            const updatedNode = {
                ...node,
                data: {
                    ...node.data,
                    config: result.config,
                    ...(result.success ? { autoConfigured: result.success } : {}),
                    ...(result.confidence ? { autoConfigConfidence: result.confidence } : {}),
                },
            };
            configuredNodes.push(updatedNode);
            // Update summary
            if (result.success && result.confidence >= 0.8) {
                summary.configured++;
            }
            else if (result.confidence >= 0.5) {
                summary.partial++;
                allConfigured = false;
            }
            else {
                summary.failed++;
                allConfigured = false;
            }
            // Skip wizard only if all nodes are fully configured
            if (!result.skipWizard) {
                skipWizard = false;
            }
        }
        return {
            nodes: configuredNodes,
            allConfigured,
            skipWizard: skipWizard && allConfigured,
            summary,
        };
    }
    /**
     * Detect operation for a node based on context
     */
    detectOperation(nodeType, context, schema) {
        // Check if operation is already set
        if (context.nodes.find(n => n.id === context.previousNode?.id)?.data?.config?.operation) {
            return undefined; // Already configured
        }
        // Operation detection rules based on node type and context
        const operationRules = {
            // Google Sheets
            google_sheets: (ctx) => {
                // If previous node is a trigger or no previous node, likely "read"
                if (!ctx.previousNode || ctx.previousNode.type?.includes('trigger')) {
                    return 'read';
                }
                // If next node needs data, likely "read"
                if (ctx.nextNode && this.nodeNeedsData(ctx.nextNode)) {
                    return 'read';
                }
                // Otherwise, check workflow intent
                if (ctx.workflowIntent?.toLowerCase().includes('read') ||
                    ctx.workflowIntent?.toLowerCase().includes('fetch') ||
                    ctx.workflowIntent?.toLowerCase().includes('get')) {
                    return 'read';
                }
                if (ctx.workflowIntent?.toLowerCase().includes('write') ||
                    ctx.workflowIntent?.toLowerCase().includes('save') ||
                    ctx.workflowIntent?.toLowerCase().includes('update')) {
                    return 'write';
                }
                return 'read'; // Default to read
            },
            // Google Gmail
            google_gmail: (ctx) => {
                // Gmail is typically "send" in workflows
                if (ctx.workflowIntent?.toLowerCase().includes('send') ||
                    ctx.workflowIntent?.toLowerCase().includes('email') ||
                    ctx.workflowIntent?.toLowerCase().includes('mail')) {
                    return 'send';
                }
                // If previous node is AI or data processing, likely "send"
                if (ctx.previousNode && this.isDataProducer(ctx.previousNode)) {
                    return 'send';
                }
                return 'send'; // Default to send
            },
            // Database nodes
            database_write: () => 'insert',
            database_read: () => 'select',
            db: (ctx) => {
                if (ctx.workflowIntent?.toLowerCase().includes('read') ||
                    ctx.workflowIntent?.toLowerCase().includes('fetch')) {
                    return 'select';
                }
                return 'insert'; // Default to insert
            },
            // HTTP nodes
            http_request: () => 'GET',
            http_post: () => 'POST',
        };
        const rule = operationRules[nodeType];
        if (rule) {
            return rule(context);
        }
        // Check schema for default operation
        const defaultOperation = schema.configSchema?.optional?.operation?.default;
        if (defaultOperation) {
            return defaultOperation;
        }
        return undefined;
    }
    /**
     * Infer input values from previous node outputs
     */
    inferInputValues(nodeType, previousNode, schema, context) {
        const mappings = [];
        const previousNodeType = (0, node_type_resolver_util_1.resolveNodeType)(previousNode.data?.type || previousNode.type);
        const previousSchema = node_library_1.nodeLibrary.getSchema(previousNodeType);
        if (!previousSchema) {
            return mappings;
        }
        // Get output fields from previous node
        const previousOutputFields = this.getNodeOutputFields(previousNode, previousSchema);
        // Get input fields for current node
        const inputFields = this.getNodeInputFields(nodeType, schema);
        // Field mapping rules based on node type combinations
        const fieldMappings = this.getFieldMappingRules(nodeType, previousNodeType);
        for (const inputField of inputFields) {
            // Try explicit mapping rules first
            const explicitMapping = fieldMappings.find(m => m.targetField === inputField);
            if (explicitMapping && previousOutputFields.includes(explicitMapping.sourceField)) {
                mappings.push({
                    field: inputField,
                    sourceField: explicitMapping.sourceField,
                    value: this.formatTemplateValue(explicitMapping.sourceField, previousNode.id),
                });
                continue;
            }
            // Try semantic matching
            const semanticMatch = this.findSemanticMatch(inputField, previousOutputFields, nodeType, previousNodeType);
            if (semanticMatch) {
                mappings.push({
                    field: inputField,
                    sourceField: semanticMatch,
                    value: this.formatTemplateValue(semanticMatch, previousNode.id),
                });
                continue;
            }
            // Try generic field matching
            const genericMatch = this.findGenericMatch(inputField, previousOutputFields);
            if (genericMatch) {
                mappings.push({
                    field: inputField,
                    sourceField: genericMatch,
                    value: this.formatTemplateValue(genericMatch, previousNode.id),
                });
            }
        }
        return mappings;
    }
    /**
     * Get field mapping rules for node type combinations
     */
    getFieldMappingRules(targetNodeType, sourceNodeType) {
        // Common mapping patterns
        const commonMappings = {
            // Google Sheets → AI nodes
            google_sheets: {
                ai_agent: [
                    { sourceField: 'rows', targetField: 'userInput' },
                    { sourceField: 'data', targetField: 'userInput' },
                ],
                ai_chat_model: [
                    { sourceField: 'rows', targetField: 'inputData' },
                    { sourceField: 'data', targetField: 'inputData' },
                ],
                text_summarizer: [
                    { sourceField: 'rows', targetField: 'text' },
                    { sourceField: 'data', targetField: 'text' },
                ],
            },
            // AI Agent → Gmail
            ai_agent: {
                google_gmail: [
                    { sourceField: 'response_text', targetField: 'body' },
                    { sourceField: 'response_json.message', targetField: 'body' },
                ],
            },
            // AI Chat Model → Gmail
            ai_chat_model: {
                google_gmail: [
                    { sourceField: 'output', targetField: 'body' },
                    { sourceField: 'text', targetField: 'body' },
                    { sourceField: 'response', targetField: 'body' },
                ],
            },
            // Text Summarizer → Gmail
            text_summarizer: {
                google_gmail: [
                    { sourceField: 'summary', targetField: 'body' },
                    { sourceField: 'text', targetField: 'body' },
                ],
            },
        };
        // Try specific mapping
        const specificMapping = commonMappings[sourceNodeType]?.[targetNodeType];
        if (specificMapping) {
            return specificMapping;
        }
        // Try wildcard mapping
        const wildcardMapping = commonMappings['*']?.[targetNodeType];
        if (wildcardMapping) {
            return wildcardMapping;
        }
        return [];
    }
    /**
     * Get node output fields
     */
    getNodeOutputFields(node, schema) {
        // Check node config for output fields
        if (node.data?.config?.outputFields) {
            const outputFields = node.data.config.outputFields;
            if (Array.isArray(outputFields)) {
                return outputFields.filter((f) => typeof f === 'string');
            }
            if (typeof outputFields === 'string') {
                return [outputFields];
            }
        }
        // Check schema for output schema
        if (schema.outputSchema) {
            return Object.keys(schema.outputSchema);
        }
        // Use default output fields based on node type
        const defaultOutputs = {
            google_sheets: ['rows', 'data', 'values'],
            ai_service: ['output', 'text', 'response'],
            ai_agent: ['response_text', 'response_json', 'response_markdown'],
            google_gmail: ['messageId', 'status'],
            database_read: ['rows', 'data', 'results'],
            http_request: ['response', 'body', 'data'],
        };
        const nodeType = (0, node_type_resolver_util_1.resolveNodeType)(node.data?.type || node.type);
        return defaultOutputs[nodeType] || ['output', 'data'];
    }
    /**
     * Get node input fields
     */
    getNodeInputFields(nodeType, schema) {
        const requiredFields = schema.configSchema?.required || [];
        const optionalFields = Object.keys(schema.configSchema?.optional || {});
        // Prioritize required fields, then important optional fields
        const importantOptional = ['inputData', 'input', 'data', 'text', 'body', 'message', 'to', 'subject'];
        const importantFields = importantOptional.filter(f => optionalFields.includes(f));
        return [...requiredFields, ...importantFields];
    }
    /**
     * Find semantic match between input and output fields
     */
    findSemanticMatch(inputField, outputFields, targetNodeType, sourceNodeType) {
        // Normalize field names for comparison
        const normalize = (field) => field.toLowerCase().replace(/[_\s-]/g, '');
        const normalizedInput = normalize(inputField);
        // Try exact match
        for (const outputField of outputFields) {
            if (normalize(outputField) === normalizedInput) {
                return outputField;
            }
        }
        // Try partial match
        for (const outputField of outputFields) {
            const normalizedOutput = normalize(outputField);
            if (normalizedInput.includes(normalizedOutput) || normalizedOutput.includes(normalizedInput)) {
                return outputField;
            }
        }
        // Try semantic synonyms
        const synonyms = {
            inputdata: ['data', 'input', 'rows', 'values'],
            body: ['message', 'text', 'content', 'output'],
            message: ['body', 'text', 'content', 'output'],
            text: ['message', 'body', 'content', 'output'],
            data: ['rows', 'values', 'inputdata', 'input'],
        };
        const inputSynonyms = synonyms[normalizedInput] || [];
        for (const synonym of inputSynonyms) {
            for (const outputField of outputFields) {
                if (normalize(outputField) === synonym) {
                    return outputField;
                }
            }
        }
        return undefined;
    }
    /**
     * Find generic match (fallback)
     */
    findGenericMatch(inputField, outputFields) {
        // Common generic fields
        const genericFields = ['output', 'data', 'result', 'value'];
        for (const genericField of genericFields) {
            if (outputFields.includes(genericField)) {
                return genericField;
            }
        }
        // Return first available field as last resort
        return outputFields.length > 0 ? outputFields[0] : undefined;
    }
    /**
     * Format template value for node connection
     * CRITICAL FIX: Use {{$json.field}} format instead of {{nodeId.field}}
     * This ensures proper data flow and compatibility with the execution engine
     */
    formatTemplateValue(sourceField, sourceNodeId) {
        // Format as template expression: {{$json.field}}
        // The execution engine resolves $json to the previous node's output
        return `{{$json.${sourceField}}}`;
    }
    /**
     * Get default values from schema
     */
    getDefaultValues(schema, existingConfig) {
        const defaults = {};
        const optionalFields = schema.configSchema?.optional || {};
        for (const [fieldName, fieldDef] of Object.entries(optionalFields)) {
            const field = fieldDef;
            // Only set default if not already configured
            if (!existingConfig[fieldName] && field.default !== undefined) {
                defaults[fieldName] = field.default;
            }
        }
        return defaults;
    }
    /**
     * Check if field has default value in schema
     */
    hasDefaultValue(schema, fieldName) {
        const optionalFields = schema.configSchema?.optional || {};
        const field = optionalFields[fieldName];
        return field?.default !== undefined;
    }
    /**
     * Get DataRouter mappings from edges
     */
    getDataRouterMappings(sourceNode, targetNode, edges) {
        const mappings = {};
        // Find edge connecting source to target
        const edge = edges.find(e => e.source === sourceNode.id && e.target === targetNode.id);
        if (edge && edge.data?.mapping) {
            // Use explicit mapping from edge
            Object.assign(mappings, edge.data.mapping);
        }
        return mappings;
    }
    /**
     * Calculate configuration confidence
     */
    calculateConfidence(config, schema, mappedFields, missingFields) {
        let confidence = 0.0;
        const requiredFields = schema.configSchema?.required || [];
        const totalFields = requiredFields.length;
        if (totalFields === 0) {
            return 1.0; // No required fields, fully configured
        }
        // Base confidence from required fields
        const configuredRequired = requiredFields.filter((f) => config[f] !== undefined && config[f] !== null && config[f] !== '').length;
        confidence += (configuredRequired / totalFields) * 0.6;
        // Bonus for mapped fields
        if (mappedFields.length > 0) {
            confidence += Math.min(mappedFields.length / totalFields, 0.3);
        }
        // Penalty for missing fields
        if (missingFields.length > 0) {
            confidence -= (missingFields.length / totalFields) * 0.1;
        }
        return Math.max(0.0, Math.min(1.0, confidence));
    }
    /**
     * Check if node needs data (likely read operation)
     */
    nodeNeedsData(node) {
        const nodeType = (0, node_type_resolver_util_1.resolveNodeType)(node.data?.type || node.type);
        const dataConsumers = ['ai_service', 'ai_agent', 'text_summarizer', 'sentiment_analyzer'];
        return dataConsumers.includes(nodeType);
    }
    /**
     * Check if node produces data
     */
    isDataProducer(node) {
        const nodeType = (0, node_type_resolver_util_1.resolveNodeType)(node.data?.type || node.type);
        const dataProducers = ['ai_service', 'ai_agent', 'text_summarizer', 'google_sheets', 'database_read', 'http_request'];
        return dataProducers.includes(nodeType);
    }
}
exports.NodeAutoConfigurator = NodeAutoConfigurator;
// Export singleton instance
exports.nodeAutoConfigurator = new NodeAutoConfigurator();
