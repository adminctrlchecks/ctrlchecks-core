"use strict";
/**
 * Universal pre-execution config validator.
 *
 * Scans every node in a workflow before any execution begins.
 * Uses nodeDefinitionRegistry.validateInputs() — fully data-driven, zero node-specific branches.
 *
 * Returns a structured result that maps directly to the GuidedStatusCard frontend pipeline:
 *   { code: 'MISSING_REQUIRED_INPUTS', details: { missingInputs: [...], issues: [...] } }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWorkflowConfig = validateWorkflowConfig;
const node_definition_1 = require("../types/node-definition");
const node_field_intelligence_1 = require("./node-field-intelligence");
/** Node types that have no meaningful user-facing config to validate */
const SKIP_TYPES = new Set([
    'trigger',
    'webhook_trigger',
    'schedule_trigger',
    'manual_trigger',
    'log_output',
    'terminal',
    'no_op',
]);
/**
 * Validates all node configs in a workflow before execution starts.
 *
 * @param nodes  Array of workflow node objects ({ id, type, data: { config } })
 */
function validateWorkflowConfig(nodes) {
    const issues = [];
    for (const node of nodes) {
        const nodeType = node.type;
        if (SKIP_TYPES.has(nodeType))
            continue;
        const def = node_definition_1.nodeDefinitionRegistry.get(nodeType);
        if (!def)
            continue; // Unknown type — skip, let execution handle it
        const config = node.data?.config ?? {};
        const nodeLabel = node.data?.label || def.label || nodeType;
        const { valid, errors } = def.validateInputs(config);
        if (valid)
            continue;
        // Map each error string back to a MissingField using the inputSchema for labels
        const missingFields = errors.map((err) => {
            // Try to find the field key in the error (e.g. "documentId is required")
            const fieldKey = Object.keys(def.inputSchema).find((k) => err.toLowerCase().includes(k.toLowerCase()));
            const fieldSpec = fieldKey ? def.inputSchema[fieldKey] : undefined;
            return {
                fieldName: fieldKey || err,
                friendlyLabel: fieldSpec?.description?.split('—')[0].trim() || fieldKey || err,
                description: err,
            };
        });
        issues.push({ nodeId: node.id, nodeLabel, nodeType, missingFields });
    }
    const missingInputs = issues.flatMap((issue) => issue.missingFields.map((f) => ({
        fieldName: f.friendlyLabel,
        nodeLabel: issue.nodeLabel,
        description: f.description,
    })));
    const intelligenceIssues = (0, node_field_intelligence_1.validateWorkflowNodeIntelligence)({ nodes: nodes, edges: [] });
    // Intelligence issues are advisory only — they cannot see the credential vault or runtime
    // template values, so treating them as hard blocks causes false "stuck at running" executions.
    // Only nodeDefinitionRegistry.validateInputs() issues (real missing config) block execution.
    return {
        valid: issues.length === 0,
        issues,
        validationIssues: intelligenceIssues,
        missingInputs,
    };
}
