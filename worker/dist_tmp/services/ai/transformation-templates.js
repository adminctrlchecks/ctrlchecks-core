"use strict";
// Transformation Templates
// Provides reusable configuration templates for common transformation patterns
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformationTemplates = void 0;
exports.getTransformationTemplate = getTransformationTemplate;
exports.generateDefaultMappingRules = generateDefaultMappingRules;
exports.generateValidationRules = generateValidationRules;
exports.isTransformationNode = isTransformationNode;
/**
 * Transformation Templates
 * Provides pre-configured templates for common transformation node patterns
 */
exports.TransformationTemplates = {
    /**
     * Data Mapping Template
     * Maps fields from input to output with direct transformation
     */
    DataMapping: {
        configuration: {
            mappingType: 'field_mapping',
            inputFields: ['{{previousNode.output}}'],
            outputFields: ['transformed_data'],
            mappingRules: [
                {
                    source: '{{inputField}}',
                    target: '{{outputField}}',
                    transformation: 'direct',
                },
            ],
            preserveUnmapped: true,
            errorHandling: {
                onError: 'continue',
                logErrors: true,
            },
        },
    },
    /**
     * Format Conversion Template
     * Converts data between different formats (JSON, CSV, XML, etc.)
     */
    FormatConverter: {
        configuration: {
            sourceFormat: 'json',
            targetFormat: 'csv',
            fieldSeparator: ',',
            includeHeaders: true,
            encoding: 'utf-8',
            dateFormat: 'ISO',
            errorHandling: {
                onError: 'continue',
                logErrors: true,
            },
        },
    },
    /**
     * Data Filter Template
     * Filters data based on conditions
     */
    DataFilter: {
        configuration: {
            filterConditions: [
                {
                    field: '{{fieldName}}',
                    operator: 'equals',
                    value: '{{filterValue}}',
                },
            ],
            logicalOperator: 'AND',
            caseSensitive: false,
            preserveStructure: true,
            errorHandling: {
                onError: 'continue',
                logErrors: true,
            },
        },
    },
    /**
     * Data Aggregation Template
     * Aggregates data (sum, count, average, etc.)
     */
    DataAggregation: {
        configuration: {
            aggregationType: 'sum',
            groupBy: [],
            operations: [
                {
                    field: '{{fieldName}}',
                    operation: 'sum',
                    alias: 'total',
                },
            ],
            errorHandling: {
                onError: 'continue',
                logErrors: true,
            },
        },
    },
    /**
     * Data Transformation Template
     * Generic transformation with custom logic
     */
    DataTransformation: {
        configuration: {
            transformationType: 'map',
            preserveStructure: true,
            inputMapping: {},
            outputSchema: {},
            transformationRules: [],
            errorHandling: {
                onError: 'continue',
                fallbackValue: null,
                logErrors: true,
            },
        },
    },
};
/**
 * Get transformation template by type
 */
function getTransformationTemplate(nodeType, previousNode) {
    const nodeTypeLower = nodeType.toLowerCase();
    // Map node types to templates
    if (nodeTypeLower.includes('filter')) {
        return exports.TransformationTemplates.DataFilter.configuration;
    }
    if (nodeTypeLower.includes('format') ||
        nodeTypeLower.includes('convert') ||
        nodeTypeLower.includes('csv') ||
        nodeTypeLower.includes('json')) {
        return exports.TransformationTemplates.FormatConverter.configuration;
    }
    if (nodeTypeLower.includes('aggregate') ||
        nodeTypeLower.includes('sum') ||
        nodeTypeLower.includes('count')) {
        return exports.TransformationTemplates.DataAggregation.configuration;
    }
    if (nodeTypeLower.includes('transform') ||
        nodeTypeLower.includes('process') ||
        nodeTypeLower.includes('map')) {
        // Use previous node's output schema if available
        if (previousNode?.data?.config?.outputSchema) {
            return {
                ...exports.TransformationTemplates.DataTransformation.configuration,
                inputMapping: generateInputMappingFromPrevious(previousNode),
                outputSchema: previousNode.data.config.outputSchema,
            };
        }
        return exports.TransformationTemplates.DataTransformation.configuration;
    }
    // Default to generic transformation
    return exports.TransformationTemplates.DataTransformation.configuration;
}
/**
 * Generate input mapping from previous node
 */
function generateInputMappingFromPrevious(previousNode) {
    const mapping = {};
    // Try to extract output fields from previous node
    if (previousNode.data?.config?.outputFields) {
        const outputFields = Array.isArray(previousNode.data.config.outputFields)
            ? previousNode.data.config.outputFields
            : [previousNode.data.config.outputFields];
        outputFields.forEach((field) => {
            mapping[field] = `{{previousNode.${field}}}`;
        });
    }
    else {
        // Default mapping
        mapping['data'] = '{{previousNode.output}}';
    }
    return mapping;
}
/**
 * Generate default mapping rules
 */
function generateDefaultMappingRules() {
    return [
        {
            source: '{{input.data}}',
            target: 'output',
            transformation: 'direct',
        },
    ];
}
/**
 * Generate validation rules
 */
function generateValidationRules() {
    return [
        {
            field: 'data',
            type: 'required',
            message: 'Input data is required',
        },
    ];
}
/**
 * Check if a node type is a transformation node
 */
function isTransformationNode(nodeType) {
    const nodeTypeLower = nodeType.toLowerCase();
    return (nodeTypeLower.includes('transform') ||
        nodeTypeLower.includes('process') ||
        nodeTypeLower.includes('filter') ||
        nodeTypeLower.includes('format') ||
        nodeTypeLower.includes('convert') ||
        nodeTypeLower.includes('map') ||
        nodeTypeLower.includes('aggregate'));
}
