"use strict";
/**
 * ✅ LANGCHAIN NODE - Migrated to Registry
 *
 * LangChain AI orchestration integration — chains, agents, LLM pipelines via OpenAI or Anthropic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideLangchain = overrideLangchain;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideLangchain(def, schema) {
    return {
        ...def,
        tags: Array.from(new Set([
            ...(def.tags || []),
            'langchain',
            'ai',
            'llm',
            'chain',
            'agent',
            'openai',
            'anthropic',
            'api',
        ])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
