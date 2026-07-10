"use strict";
/**
 * ✅ TEXT SUMMARIZER NODE - Migrated to Registry
 *
 * AI-powered text summarization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideTextSummarizer = overrideTextSummarizer;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideTextSummarizer(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex AI summarization logic)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
