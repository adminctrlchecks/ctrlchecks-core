"use strict";
/**
 * Template Expression Validator
 * Validates that template expressions are correctly formatted and reference valid fields
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTemplateExpressions = validateTemplateExpressions;
exports.validateWorkflowTemplateExpressions = validateWorkflowTemplateExpressions;
exports.fixTemplateExpressions = fixTemplateExpressions;
const input_field_mapper_1 = require("./input-field-mapper");
/**
 * Validate template expressions in node config
 */
function validateTemplateExpressions(node, previousNode, allNodes, nodeIndex) {
    const errors = [];
    const warnings = [];
    const config = node.data?.config || {};
    // Extract all template expressions from config
    const templateExpressions = extractTemplateExpressions(config);
    // Validate each expression
    for (const expr of templateExpressions) {
        const validation = validateSingleTemplateExpression(expr, node, previousNode, allNodes, nodeIndex);
        if (!validation.valid) {
            errors.push(...validation.errors);
        }
        if (validation.warnings.length > 0) {
            warnings.push(...validation.warnings);
        }
    }
    // Validate all input fields are correctly mapped
    const fieldValidation = input_field_mapper_1.inputFieldMapper.validateNodeInputs(node, previousNode, allNodes, nodeIndex);
    if (!fieldValidation.valid) {
        errors.push(...fieldValidation.errors);
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        mappings: fieldValidation.mappings,
    };
}
/**
 * Extract all template expressions from config object
 */
function extractTemplateExpressions(config, path = '') {
    const expressions = [];
    for (const [key, value] of Object.entries(config)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
            // Extract all {{...}} expressions from the string
            const matches = value.match(/\{\{([^}]+)\}\}/g);
            if (matches) {
                for (const match of matches) {
                    const innerExpr = match.slice(2, -2).trim();
                    expressions.push({
                        path: currentPath,
                        expression: innerExpr,
                        value: match,
                    });
                }
            }
        }
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Recursively extract from nested objects
            expressions.push(...extractTemplateExpressions(value, currentPath));
        }
        else if (Array.isArray(value)) {
            // Check array elements
            value.forEach((item, index) => {
                if (typeof item === 'string') {
                    const matches = item.match(/\{\{([^}]+)\}\}/g);
                    if (matches) {
                        for (const match of matches) {
                            const innerExpr = match.slice(2, -2).trim();
                            expressions.push({
                                path: `${currentPath}[${index}]`,
                                expression: innerExpr,
                                value: match,
                            });
                        }
                    }
                }
            });
        }
    }
    return expressions;
}
/**
 * Validate a single template expression
 */
function validateSingleTemplateExpression(expr, node, previousNode, allNodes, nodeIndex) {
    const errors = [];
    const warnings = [];
    const expression = expr.expression;
    // Check format
    if (!expression.startsWith('$json.') && !expression.startsWith('input.') && !expression.startsWith('json.')) {
        // Check if it's a direct field reference (should use $json prefix)
        if (!expression.includes('.')) {
            warnings.push(`Template expression "${expr.value}" at ${expr.path} should use $json prefix: {{$json.${expression}}}`);
        }
    }
    // Validate $json expressions
    if (expression.startsWith('$json.')) {
        const fieldPath = expression.substring(6); // Remove '$json.' prefix
        const isValid = validateFieldReference(fieldPath, node, previousNode, allNodes, nodeIndex);
        if (!isValid.valid) {
            errors.push(`Invalid field reference "${expr.value}" at ${expr.path}: ${isValid.error}`);
        }
    }
    // Validate input expressions (from trigger)
    if (expression.startsWith('input.')) {
        const fieldPath = expression.substring(6); // Remove 'input.' prefix
        // Input fields are validated against trigger payload
        // This is generally valid, but we can add specific checks if needed
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
/**
 * Validate that a field reference exists in upstream nodes
 */
function validateFieldReference(fieldPath, node, previousNode, allNodes, nodeIndex) {
    // Split field path (e.g., "contact.email" -> ["contact", "email"])
    const pathParts = fieldPath.split('.');
    const rootField = pathParts[0];
    // Check previous node first
    if (previousNode) {
        const previousOutput = input_field_mapper_1.inputFieldMapper.getNodeOutputFields(previousNode);
        if (previousOutput && previousOutput.outputFields.includes(rootField)) {
            return { valid: true };
        }
    }
    // Check all upstream nodes
    const upstreamNodes = allNodes.slice(0, nodeIndex);
    for (const upstreamNode of upstreamNodes) {
        const upstreamOutput = input_field_mapper_1.inputFieldMapper.getNodeOutputFields(upstreamNode);
        if (upstreamOutput && upstreamOutput.outputFields.includes(rootField)) {
            return { valid: true };
        }
    }
    return {
        valid: false,
        error: `Field "${rootField}" not found in any upstream node outputs`,
    };
}
/**
 * Validate all nodes in a workflow have correct template expressions
 */
function validateWorkflowTemplateExpressions(nodes, edges) {
    const allErrors = [];
    const allWarnings = [];
    const nodeValidations = new Map();
    // Build node dependency graph
    const nodeMap = new Map();
    const nodeIndexMap = new Map();
    nodes.forEach((node, index) => {
        nodeMap.set(node.id, node);
        nodeIndexMap.set(node.id, index);
    });
    // Build incoming edges map
    const incomingEdges = new Map();
    edges.forEach(edge => {
        if (!incomingEdges.has(edge.target)) {
            incomingEdges.set(edge.target, []);
        }
        incomingEdges.get(edge.target).push(edge);
    });
    // Validate each node
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const incoming = incomingEdges.get(node.id) || [];
        // Find previous node (most recent upstream node)
        let previousNode = null;
        if (incoming.length > 0) {
            // Get the most recent upstream node
            const sourceIds = incoming.map(e => e.source);
            const sourceIndices = sourceIds
                .map(id => nodeIndexMap.get(id))
                .filter((idx) => idx !== undefined)
                .sort((a, b) => b - a); // Most recent first
            if (sourceIndices.length > 0) {
                const mostRecentIndex = sourceIndices[0];
                previousNode = nodes[mostRecentIndex];
            }
        }
        const validation = validateTemplateExpressions(node, previousNode, nodes, i);
        nodeValidations.set(node.id, validation);
        if (!validation.valid) {
            allErrors.push(`Node ${node.id} (${node.type}): ${validation.errors.join('; ')}`);
        }
        allWarnings.push(...validation.warnings);
    }
    return {
        valid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        nodeValidations,
    };
}
/**
 * Fix template expressions to use correct format
 */
function fixTemplateExpressions(config) {
    const fixed = { ...config };
    for (const [key, value] of Object.entries(fixed)) {
        if (typeof value === 'string') {
            // Fix expressions without $json prefix
            fixed[key] = value.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
                const trimmed = expr.trim();
                // If it doesn't start with $json, input, or json, add $json prefix
                if (!trimmed.startsWith('$json.') &&
                    !trimmed.startsWith('input.') &&
                    !trimmed.startsWith('json.') &&
                    !trimmed.includes('.')) {
                    return `{{$json.${trimmed}}}`;
                }
                return match;
            });
        }
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            fixed[key] = fixTemplateExpressions(value);
        }
        else if (Array.isArray(value)) {
            fixed[key] = value.map(item => typeof item === 'string'
                ? item.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
                    const trimmed = expr.trim();
                    if (!trimmed.startsWith('$json.') &&
                        !trimmed.startsWith('input.') &&
                        !trimmed.startsWith('json.') &&
                        !trimmed.includes('.')) {
                        return `{{$json.${trimmed}}}`;
                    }
                    return match;
                })
                : item);
        }
    }
    return fixed;
}
