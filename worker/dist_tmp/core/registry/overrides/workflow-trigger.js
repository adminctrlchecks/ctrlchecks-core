"use strict";
/**
 * ✅ WORKFLOW TRIGGER NODE - Migrated to Registry
 *
 * Triggered by another workflow.
 * Returns payload from source workflow.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideWorkflowTrigger = overrideWorkflowTrigger;
function overrideWorkflowTrigger(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            const { input } = context;
            // Extract input object
            const inputObj = typeof input === 'object' && input !== null && !Array.isArray(input)
                ? input
                : {};
            // ✅ OPTIMIZED: Workflow trigger - return clean output with just the payload from source workflow
            // When triggered from another workflow, return the actual payload passed, not metadata
            // Remove trigger metadata and return just the data
            const { trigger, workflow_id, source_workflow_id, executed_at, ...payload } = inputObj;
            return {
                success: true,
                output: payload && Object.keys(payload).length > 0 ? payload : {},
            };
        },
    };
}
