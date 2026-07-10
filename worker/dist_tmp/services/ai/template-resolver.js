"use strict";
// Template Resolver Service
// Resolves template variables in node configurations
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateResolver = exports.TemplateResolver = void 0;
const transformation_templates_1 = require("./transformation-templates");
/**
 * TemplateResolver
 * Resolves template variables and generates complete node configurations
 */
class TemplateResolver {
    /**
     * Resolve node templates for all nodes in workflow
     */
    resolveNodeTemplates(nodes, requirements, workflow) {
        return nodes.map((node, index) => {
            if ((0, transformation_templates_1.isTransformationNode)(node.type)) {
                return this.resolveTransformationNode(node, nodes, index, requirements);
            }
            return node;
        });
    }
    /**
     * Resolve transformation node templates
     */
    resolveTransformationNode(node, allNodes, index, requirements) {
        const previousNode = index > 0 ? allNodes[index - 1] : null;
        const resolvedConfig = { ...(node.data?.config || {}) };
        // Get transformation template
        const template = (0, transformation_templates_1.getTransformationTemplate)(node.type, previousNode || undefined);
        Object.assign(resolvedConfig, template);
        // Resolve input fields from previous nodes
        if (requirements.inputOutputMappings) {
            const inputFields = this.resolveInputFields(node.id, requirements.inputOutputMappings);
            if (inputFields.length > 0) {
                resolvedConfig.inputFields = inputFields;
            }
        }
        else if (previousNode) {
            // Generate input fields from previous node
            resolvedConfig.inputFields = this.generateInputFieldsFromPrevious(previousNode);
        }
        // Apply transformation logic from requirements
        if (requirements.dataTransformations) {
            const transformationLogic = this.generateTransformationLogic(requirements.dataTransformations);
            Object.assign(resolvedConfig, transformationLogic);
        }
        // Set default values for required fields
        const requiredFields = this.determineRequiredFields(node.type, requirements);
        if (requiredFields.length > 0 && !resolvedConfig.requiredFields) {
            resolvedConfig.requiredFields = requiredFields;
        }
        // Generate output fields if not present
        const inputFieldsArray = Array.isArray(resolvedConfig.inputFields)
            ? resolvedConfig.inputFields
            : resolvedConfig.inputFields
                ? [resolvedConfig.inputFields]
                : [];
        if (!resolvedConfig.outputFields || (Array.isArray(resolvedConfig.outputFields) && resolvedConfig.outputFields.length === 0)) {
            resolvedConfig.outputFields = this.generateOutputFieldNames(node.type, previousNode);
        }
        // Generate mapping rules if not present
        const outputFieldsArray = Array.isArray(resolvedConfig.outputFields)
            ? resolvedConfig.outputFields
            : resolvedConfig.outputFields
                ? [resolvedConfig.outputFields]
                : [];
        if (!resolvedConfig.mappingRules || (Array.isArray(resolvedConfig.mappingRules) && resolvedConfig.mappingRules.length === 0)) {
            resolvedConfig.mappingRules = this.generateMappingRules(inputFieldsArray.length > 0 ? inputFieldsArray : (resolvedConfig.inputFields || []), outputFieldsArray.length > 0 ? outputFieldsArray : (resolvedConfig.outputFields || []));
        }
        // Set error handling defaults
        if (!resolvedConfig.errorHandling) {
            resolvedConfig.errorHandling = {
                onError: 'continue',
                fallbackValue: null,
                logErrors: true,
            };
        }
        return {
            ...node,
            data: {
                ...node.data,
                config: resolvedConfig,
            },
        };
    }
    /**
     * Resolve input fields from mappings
     */
    resolveInputFields(nodeId, mappings) {
        const mapping = mappings.find((m) => m.targetNodeId === nodeId);
        if (mapping && mapping.fieldMappings) {
            return Object.keys(mapping.fieldMappings);
        }
        return [];
    }
    /**
     * Generate input fields from previous node
     */
    generateInputFieldsFromPrevious(previousNode) {
        // Try to get output fields from previous node config
        if (previousNode.data?.config?.outputFields) {
            const outputFields = previousNode.data.config.outputFields;
            if (Array.isArray(outputFields)) {
                return outputFields;
            }
            return [String(outputFields)];
        }
        // Try to infer from node type
        const nodeType = previousNode.type.toLowerCase();
        if (nodeType.includes('http') || nodeType.includes('api')) {
            return ['response', 'data', 'body'];
        }
        if (nodeType.includes('sheet') || nodeType.includes('database')) {
            return ['rows', 'data', 'records'];
        }
        if (nodeType.includes('json') || nodeType.includes('parse')) {
            return ['json', 'data', 'parsed'];
        }
        // Default
        return ['data', 'output', 'result'];
    }
    /**
     * Generate transformation logic from requirements
     */
    generateTransformationLogic(transformations) {
        const logic = {};
        transformations.forEach((transformation) => {
            if (transformation.type === 'format_conversion') {
                logic.sourceFormat = transformation.sourceFormat || 'json';
                logic.targetFormat = transformation.targetFormat || 'csv';
            }
            else if (transformation.type === 'filtering') {
                logic.filterConditions = transformation.criteria || [];
                logic.logicalOperator = transformation.operator || 'AND';
            }
            else if (transformation.type === 'aggregation') {
                logic.aggregationType = 'sum';
                logic.operations = transformation.operations || [];
            }
        });
        return logic;
    }
    /**
     * Determine required fields for node type
     */
    determineRequiredFields(nodeType, requirements) {
        const required = [];
        const nodeTypeLower = nodeType.toLowerCase();
        if (nodeTypeLower.includes('filter')) {
            required.push('filterConditions', 'logicalOperator');
        }
        if (nodeTypeLower.includes('format') || nodeTypeLower.includes('convert')) {
            required.push('sourceFormat', 'targetFormat');
        }
        if (nodeTypeLower.includes('aggregate')) {
            required.push('aggregationType', 'operations');
        }
        // Always require input/output fields for transformation nodes
        required.push('inputFields', 'outputFields');
        return required;
    }
    /**
     * Generate output field names
     */
    generateOutputFieldNames(nodeType, previousNode) {
        // Try to use previous node's output fields as base
        if (previousNode?.data?.config?.outputFields) {
            const prevOutputs = previousNode.data.config.outputFields;
            if (Array.isArray(prevOutputs)) {
                return prevOutputs.map((field) => `transformed_${field}`);
            }
            return [`transformed_${prevOutputs}`];
        }
        // Generate based on node type
        const nodeTypeLower = nodeType.toLowerCase();
        if (nodeTypeLower.includes('filter')) {
            return ['filtered_data'];
        }
        if (nodeTypeLower.includes('format') || nodeTypeLower.includes('convert')) {
            return ['formatted_data'];
        }
        if (nodeTypeLower.includes('aggregate')) {
            return ['aggregated_data', 'summary'];
        }
        // Default
        return ['transformed_data', 'output'];
    }
    /**
     * Generate mapping rules between input and output fields
     */
    generateMappingRules(inputFields, outputFields) {
        const rules = [];
        // Create direct mappings
        const minLength = Math.min(inputFields.length, outputFields.length);
        for (let i = 0; i < minLength; i++) {
            rules.push({
                source: `{{input.${inputFields[i]}}}`,
                target: outputFields[i],
                transformation: 'direct',
            });
        }
        // If more output fields, map remaining to first input
        if (outputFields.length > inputFields.length) {
            for (let i = inputFields.length; i < outputFields.length; i++) {
                rules.push({
                    source: `{{input.${inputFields[0] || 'data'}}}`,
                    target: outputFields[i],
                    transformation: 'direct',
                });
            }
        }
        return rules;
    }
}
exports.TemplateResolver = TemplateResolver;
exports.templateResolver = new TemplateResolver();
