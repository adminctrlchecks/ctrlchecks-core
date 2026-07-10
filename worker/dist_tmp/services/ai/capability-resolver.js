"use strict";
/**
 * Capability Resolver
 *
 * Resolves AI processing capabilities to actual node types.
 *
 * Architecture:
 * - "ai_service" is a capability tag, not a node type
 * - Capabilities: ai_processing, summarization, classification
 * - Resolves to real nodes: ollama, openai_gpt, anthropic_claude, etc.
 *
 * Priority order: ollama → openai → anthropic → gemini → others
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.capabilityResolver = exports.CapabilityResolver = exports.AICapability = void 0;
const node_library_1 = require("../nodes/node-library");
/**
 * AI Processing Capabilities
 */
var AICapability;
(function (AICapability) {
    AICapability["AI_PROCESSING"] = "ai_processing";
    AICapability["SUMMARIZATION"] = "summarization";
    AICapability["CLASSIFICATION"] = "classification";
    AICapability["TEXT_GENERATION"] = "text_generation";
    AICapability["SENTIMENT_ANALYSIS"] = "sentiment_analysis";
})(AICapability || (exports.AICapability = AICapability = {}));
/**
 * LLM Provider Priority Order
 */
const LLM_PROVIDER_PRIORITY = [
    'ollama', // Priority 1: Local, no API key needed
    'openai_gpt', // Priority 2: OpenAI GPT
    'anthropic_claude', // Priority 3: Anthropic Claude
    'google_gemini', // Priority 4: Google Gemini
    'text_summarizer', // Priority 5: Specialized summarization
];
/**
 * Capability to Node Type Mapping
 */
const CAPABILITY_TO_NODES = {
    [AICapability.AI_PROCESSING]: ['ollama', 'openai_gpt', 'anthropic_claude', 'google_gemini'],
    [AICapability.SUMMARIZATION]: ['text_summarizer', 'ollama', 'openai_gpt'],
    [AICapability.CLASSIFICATION]: ['ollama', 'openai_gpt', 'anthropic_claude'],
    [AICapability.TEXT_GENERATION]: ['ollama', 'openai_gpt', 'anthropic_claude', 'google_gemini'],
    [AICapability.SENTIMENT_ANALYSIS]: ['sentiment_analyzer', 'ollama', 'openai_gpt'],
};
/**
 * Capability Resolver
 * Resolves AI capabilities to actual node types based on availability and priority
 */
class CapabilityResolver {
    /**
     * Resolve capability to node type
     *
     * @param capability - Capability tag (e.g., 'ai_processing', 'summarization')
     * @param preferredProvider - Optional preferred provider override
     * @returns Resolved node type or null if no match found
     */
    resolveCapability(capability, preferredProvider) {
        // Normalize capability string
        const normalizedCapability = this.normalizeCapability(capability);
        if (!normalizedCapability) {
            return null;
        }
        // Get available node types for this capability
        const availableNodes = CAPABILITY_TO_NODES[normalizedCapability] || [];
        // Check which nodes are available in NodeLibrary
        const availableInLibrary = availableNodes.filter(nodeType => {
            const schema = node_library_1.nodeLibrary.getSchema(nodeType);
            return schema !== undefined;
        });
        if (availableInLibrary.length === 0) {
            console.warn(`[CapabilityResolver] ⚠️  No nodes available for capability: ${normalizedCapability}`);
            return null;
        }
        // If preferred provider specified, try to use it
        if (preferredProvider) {
            const preferredNode = this.findNodeByProvider(preferredProvider, availableInLibrary);
            if (preferredNode) {
                return {
                    nodeType: preferredNode,
                    capability: normalizedCapability,
                    provider: preferredProvider,
                    reason: `Preferred provider: ${preferredProvider}`,
                    alternatives: availableInLibrary.filter(n => n !== preferredNode),
                };
            }
        }
        // Use priority order to select node
        for (const priorityNode of LLM_PROVIDER_PRIORITY) {
            if (availableInLibrary.includes(priorityNode)) {
                return {
                    nodeType: priorityNode,
                    capability: normalizedCapability,
                    provider: this.extractProvider(priorityNode),
                    reason: `Selected based on priority order (${priorityNode} is highest priority available)`,
                    alternatives: availableInLibrary.filter(n => n !== priorityNode),
                };
            }
        }
        // Fallback to first available
        const fallbackNode = availableInLibrary[0];
        return {
            nodeType: fallbackNode,
            capability: normalizedCapability,
            provider: this.extractProvider(fallbackNode),
            reason: `Fallback to first available node: ${fallbackNode}`,
            alternatives: availableInLibrary.slice(1),
        };
    }
    /**
     * Check if a string represents a capability (not a node type)
     */
    isCapability(value) {
        const normalized = this.normalizeCapability(value);
        return normalized !== null;
    }
    /**
     * Normalize capability string to enum
     */
    normalizeCapability(capability) {
        const lower = capability.toLowerCase().trim();
        // Direct enum match
        if (Object.values(AICapability).includes(lower)) {
            return lower;
        }
        // Alias mappings — Email aliases must NOT be treated as AI capabilities.
        // Email aliases resolve via unified-node-registry alias map to google_gmail.
        const aliases = {
            'ai_service': AICapability.AI_PROCESSING,
            'ai_processing': AICapability.AI_PROCESSING,
            'ai': AICapability.AI_PROCESSING,
            'llm': AICapability.AI_PROCESSING,
            'summarize': AICapability.SUMMARIZATION,
            'summarization': AICapability.SUMMARIZATION,
            'summary': AICapability.SUMMARIZATION,
            'classify': AICapability.CLASSIFICATION,
            'classification': AICapability.CLASSIFICATION,
            'text_generation': AICapability.TEXT_GENERATION,
            'generate_text': AICapability.TEXT_GENERATION,
            'sentiment': AICapability.SENTIMENT_ANALYSIS,
            'sentiment_analysis': AICapability.SENTIMENT_ANALYSIS,
            // Email aliases must NOT be treated as AI capabilities — they resolve via
            // unified-node-registry alias map to google_gmail.
            // 'email', 'mail', 'send_email', 'send', 'notify' are intentionally excluded.
        };
        return aliases[lower] || null;
    }
    /**
     * Find node type by provider name
     */
    findNodeByProvider(provider, availableNodes) {
        const providerLower = provider.toLowerCase();
        const providerMap = {
            'ollama': ['ollama'],
            'openai': ['openai_gpt'],
            'anthropic': ['anthropic_claude'],
            'claude': ['anthropic_claude'],
            'gemini': ['google_gemini'],
            'google': ['google_gemini'],
        };
        const matchingNodes = providerMap[providerLower] || [];
        for (const node of matchingNodes) {
            if (availableNodes.includes(node)) {
                return node;
            }
        }
        return null;
    }
    /**
     * Extract provider name from node type
     */
    extractProvider(nodeType) {
        if (nodeType === 'ollama')
            return 'ollama';
        if (nodeType === 'openai_gpt')
            return 'openai';
        if (nodeType === 'anthropic_claude')
            return 'anthropic';
        if (nodeType === 'google_gemini')
            return 'google';
        if (nodeType === 'text_summarizer')
            return 'summarizer';
        if (nodeType === 'sentiment_analyzer')
            return 'sentiment';
        return 'unknown';
    }
    /**
     * Get all available LLM nodes from NodeLibrary
     */
    getAvailableLLMNodes() {
        const llmNodes = [];
        for (const nodeType of LLM_PROVIDER_PRIORITY) {
            const schema = node_library_1.nodeLibrary.getSchema(nodeType);
            if (schema) {
                llmNodes.push(nodeType);
            }
        }
        // Also check for other AI nodes
        const aiNodes = node_library_1.nodeLibrary.getNodesByCategory('ai');
        for (const schema of aiNodes) {
            if (!llmNodes.includes(schema.type)) {
                // Check if it's an LLM-capable node
                if (schema.capabilities?.some(cap => cap.includes('ai') || cap.includes('llm'))) {
                    llmNodes.push(schema.type);
                }
            }
        }
        return llmNodes;
    }
}
exports.CapabilityResolver = CapabilityResolver;
// Singleton instance
exports.capabilityResolver = new CapabilityResolver();
