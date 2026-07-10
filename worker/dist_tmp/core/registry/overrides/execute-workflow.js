"use strict";
/**
 * ✅ EXECUTE WORKFLOW NODE - Migrated to Registry
 *
 * Executes a sub-workflow.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideExecuteWorkflow = overrideExecuteWorkflow;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideExecuteWorkflow(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex sub-workflow execution logic)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
