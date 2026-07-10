"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationMiddleware = exports.ValidationMiddleware = void 0;
const config_1 = require("../config");
/**
 * Phase 3: Validation Middleware
 *
 * Integrates Zod validation into workflow execution.
 * Provides validation at key boundaries:
 * 1. Node configuration validation (before execution)
 * 2. Node input validation (optional, before processing)
 * 3. Node output validation (optional, after execution)
 * 4. Template resolution validation (when resolving templates)
 */
const node_schemas_1 = require("./node-schemas");
/**
 * Default validation options
 */
const DEFAULT_OPTIONS = {
    validateConfig: true,
    validateInput: false,
    validateOutput: true,
    validateTemplates: true,
    strict: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV === 'development' ? 'development' : 'production',
};
/**
 * Validation middleware for node execution
 */
class ValidationMiddleware {
    constructor(options = {}) {
        this.validationErrors = [];
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Validate node configuration before execution
     */
    validateConfig(nodeType, config, nodeId) {
        if (!this.options.validateConfig) {
            return { success: true, data: config };
        }
        const result = (0, node_schemas_1.validateNodeConfig)(nodeType, config, nodeId);
        if (!result.success && result.error) {
            this.handleValidationError(result.error, 'config');
        }
        return result;
    }
    /**
     * Validate node input before processing
     */
    validateInput(input) {
        if (!this.options.validateInput) {
            return { success: true, data: input };
        }
        const result = (0, node_schemas_1.validateNodeInput)(input);
        if (!result.success && result.error) {
            this.handleValidationError(result.error, 'input');
        }
        return result;
    }
    /**
     * Validate node output after execution
     */
    validateOutput(output) {
        if (!this.options.validateOutput) {
            return { success: true, data: output };
        }
        const result = (0, node_schemas_1.validateNodeOutput)(output);
        if (!result.success && result.error) {
            this.handleValidationError(result.error, 'output');
        }
        return result;
    }
    /**
     * Check if a template value is valid
     */
    validateTemplateValue(template, value, context) {
        if (!this.options.validateTemplates) {
            return { valid: true };
        }
        // Basic validation: check if template resolved to undefined when it shouldn't
        if (value === undefined && !template.includes('undefined')) {
            // Check if the path exists in context
            const path = this.extractTemplatePath(template);
            if (path && !this.pathExistsInContext(path, context)) {
                return {
                    valid: false,
                    error: `Template '${template}' references non-existent field '${path}'. Available fields: ${this.getAvailableFields(context).join(', ')}`,
                };
            }
        }
        return { valid: true };
    }
    /**
     * Handle validation error (log or throw based on strict mode)
     */
    handleValidationError(error, type) {
        this.validationErrors.push(error);
        const formattedError = (0, node_schemas_1.formatValidationError)(error);
        const logMessage = `[Validation ${type.toUpperCase()}] ${formattedError}`;
        if (this.options.environment === 'development') {
            console.error(logMessage);
            if (error.suggestions) {
                console.error('Suggestions:', error.suggestions);
            }
        }
        else {
            console.warn(logMessage);
        }
        if (this.options.strict) {
            throw new Error(formattedError);
        }
    }
    /**
     * Extract template path from template string
     * Example: "{{node.field}}" -> "node.field"
     */
    extractTemplatePath(template) {
        const match = template.match(/\{\{([^}]+)\}\}/);
        return match ? match[1].trim() : null;
    }
    /**
     * Check if a path exists in context
     */
    pathExistsInContext(path, context) {
        const keys = path.split('.');
        let current = context;
        for (const key of keys) {
            if (current === null || current === undefined) {
                return false;
            }
            if (typeof current !== 'object') {
                return false;
            }
            if (!(key in current)) {
                return false;
            }
            current = current[key];
        }
        return true;
    }
    /**
     * Get available fields from context (for error messages)
     */
    getAvailableFields(context, maxFields = 10) {
        const fields = [];
        for (const key in context) {
            if (fields.length >= maxFields) {
                fields.push('...');
                break;
            }
            fields.push(key);
        }
        return fields;
    }
    /**
     * Get all validation errors encountered
     */
    getErrors() {
        return [...this.validationErrors];
    }
    /**
     * Clear validation errors
     */
    clearErrors() {
        this.validationErrors = [];
    }
    /**
     * Get validation statistics
     */
    getStats() {
        // Track error types by checking which validation method was called
        // We'll use a simple approach: check if error has nodeType (config) or not
        const configErrors = this.validationErrors.filter(e => e.nodeType !== undefined).length;
        const inputErrors = this.validationErrors.filter(e => e.field === 'input').length;
        const outputErrors = this.validationErrors.filter(e => e.field === 'output').length;
        return {
            totalErrors: this.validationErrors.length,
            configErrors,
            inputErrors,
            outputErrors,
            nodesWithSchemas: 0, // Would need to track this separately
            nodesWithoutSchemas: 0, // Would need to track this separately
        };
    }
    /**
     * Check if node type has validation schema
     */
    hasSchema(nodeType) {
        return (0, node_schemas_1.hasNodeSchema)(nodeType);
    }
}
exports.ValidationMiddleware = ValidationMiddleware;
/**
 * Global validation middleware instance
 * Can be configured via environment variables or constructor
 */
exports.validationMiddleware = new ValidationMiddleware({
    validateConfig: true,
    validateInput: false,
    validateOutput: config_1.config.reliability.validateNodeOutput,
    validateTemplates: true,
    strict: config_1.config.reliability.strictValidation,
    environment: process.env.NODE_ENV === 'development' ? 'development' : 'production',
});
