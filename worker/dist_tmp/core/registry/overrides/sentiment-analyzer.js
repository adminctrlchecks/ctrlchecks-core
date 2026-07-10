"use strict";
/**
 * ✅ SENTIMENT ANALYZER NODE - Migrated to Registry
 *
 * AI-powered sentiment analysis.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSentimentAnalyzer = overrideSentimentAnalyzer;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideSentimentAnalyzer(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Use legacy executor for now (complex AI sentiment analysis logic)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
