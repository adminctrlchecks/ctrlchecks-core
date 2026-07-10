"use strict";
/**
 * Universal Node AI Context
 *
 * ✅ ROOT-LEVEL ARCHITECTURE: Provides AI context understanding for ALL nodes
 * Every node has access to AI for auto-generating text fields
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.universalNodeAIContext = exports.UniversalNodeAIContext = void 0;
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const node_library_1 = require("../nodes/node-library");
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const gemini_orchestrator_1 = require("./gemini-orchestrator");
const ai_field_detector_1 = require("./ai-field-detector");
const ai_input_resolver_1 = require("../../core/ai-input-resolver");
function stripAiJsonFence(text) {
    let s = text.trim();
    if (s.startsWith('```')) {
        s = s.replace(/^```(?:json)?\s*/i, '');
        const end = s.lastIndexOf('```');
        if (end !== -1)
            s = s.slice(0, end);
    }
    return s.trim();
}
/**
 * Universal Node AI Context Service
 * Provides AI context and auto-generation for all nodes
 */
class UniversalNodeAIContext {
    /**
     * Get AI context for a node
     */
    async getNodeContext(node, workflow, userPrompt, previousOutputs = {}) {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        const schema = node_library_1.nodeLibrary.getSchema(nodeType);
        const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
        // Build context
        const context = {
            nodeType,
            nodeLabel: node.data?.label || nodeType,
            nodePurpose: schema?.description || nodeDef?.description || `Process data using ${nodeType}`,
            previousNodeOutputs: previousOutputs,
            userPrompt,
            workflowIntent: userPrompt, // Can be enhanced with workflow analysis
            availableData: this.extractAvailableData(workflow, node, previousOutputs),
        };
        return context;
    }
    /**
     * Auto-generate text fields using AI
     */
    async autoGenerateTextFields(node, context, fieldsToGenerate) {
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        const schema = node_library_1.nodeLibrary.getSchema(nodeType);
        if (!schema || !schema.configSchema) {
            return {};
        }
        const generatedFields = {};
        // Build prompt for AI generation
        const systemPrompt = `You are an expert at generating appropriate text content for workflow automation nodes.

NODE CONTEXT:
- Node Type: ${context.nodeType}
- Node Label: ${context.nodeLabel}
- Node Purpose: ${context.nodePurpose}

USER INTENT: "${context.userPrompt}"

AVAILABLE DATA:
${(0, ai_input_resolver_1.compactForAiPrompt)(context.availableData)}

TASK: Generate appropriate text values for the following fields:
${fieldsToGenerate.map(f => `- ${f}`).join('\n')}

Return JSON object with field names as keys and generated values as strings.
Example: { "message": "Generated message text", "subject": "Generated subject" }`;
        try {
            const response = await gemini_orchestrator_1.geminiOrchestrator.processRequest('workflow-generation', {
                system: systemPrompt,
                message: `Generate text values for fields: ${fieldsToGenerate.join(', ')}`,
            }, {
                temperature: 0.7,
                max_tokens: Number.parseInt(process.env.WORKFLOW_RUNTIME_AI_MAX_OUTPUT_TOKENS || '2000', 10) || 2000,
                model: 'gemini-3.1-pro-preview',
                usageStage: 'runtime_autofill',
            });
            // Parse AI response (models often wrap JSON in ```json fences)
            let parsedResponse;
            const asString = typeof response === 'string' ? response : JSON.stringify(response);
            try {
                parsedResponse =
                    typeof response === 'string' ? JSON.parse(stripAiJsonFence(response)) : response;
            }
            catch (e) {
                const cleaned = stripAiJsonFence(asString);
                try {
                    parsedResponse = JSON.parse(cleaned);
                }
                catch {
                    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            parsedResponse = JSON.parse(jsonMatch[0]);
                        }
                        catch {
                            console.warn(`[UniversalNodeAIContext] Failed to parse AI response: ${asString.slice(0, 200)}`);
                            return {};
                        }
                    }
                    else {
                        console.warn(`[UniversalNodeAIContext] Failed to parse AI response: ${asString.slice(0, 200)}`);
                        return {};
                    }
                }
            }
            // Create generated field objects
            for (const fieldName of fieldsToGenerate) {
                if (parsedResponse[fieldName]) {
                    generatedFields[fieldName] = {
                        fieldName,
                        generatedValue: parsedResponse[fieldName],
                        confidence: 0.8, // Default confidence
                        reasoning: `AI-generated based on node context and user intent`,
                    };
                }
            }
            return generatedFields;
        }
        catch (error) {
            console.error(`[UniversalNodeAIContext] Error generating fields for ${nodeType}:`, error);
            return {};
        }
    }
    /**
     * Extract available data from workflow context
     */
    extractAvailableData(workflow, currentNode, previousOutputs) {
        const data = {};
        // Add previous node outputs
        Object.assign(data, compactPreviousOutputs(previousOutputs));
        // Add workflow metadata
        data.workflowId = workflow.metadata?.workflowId || workflow.metadata?.id || 'unknown';
        data.workflowName = workflow.metadata?.name || 'Workflow';
        // Add current node config (for context)
        data.currentNodeConfig = currentNode.data?.config || {};
        return data;
    }
    /**
     * Auto-fill node with AI-generated fields
     * This is the main entry point for auto-filling a node
     */
    async autoFillNode(node, workflow, userPrompt, previousOutputs = {}) {
        // Get AI context
        const context = await this.getNodeContext(node, workflow, userPrompt, previousOutputs);
        // Detect which fields should be AI-generated
        const aiFields = ai_field_detector_1.aiFieldDetector.detectAIFields(node);
        const fieldsToGenerate = aiFields
            .filter(f => f.shouldAutoGenerate)
            .map(f => f.fieldName)
            .filter(fieldName => {
            // Only generate if field is empty
            const currentValue = node.data?.config?.[fieldName];
            return !currentValue || (typeof currentValue === 'string' && currentValue.trim() === '');
        });
        if (fieldsToGenerate.length === 0) {
            return node; // No fields to generate
        }
        // Generate fields using AI
        const generatedFields = await this.autoGenerateTextFields(node, context, fieldsToGenerate);
        // Apply generated fields to node config
        const updatedNode = {
            ...node,
            data: {
                ...(node.data || {}),
                config: {
                    ...(node.data?.config || {}),
                },
            },
        };
        for (const [fieldName, generated] of Object.entries(generatedFields)) {
            if (updatedNode.data && updatedNode.data.config) {
                updatedNode.data.config[fieldName] = generated.generatedValue;
                console.log(`[UniversalNodeAIContext] ✅ Auto-generated ${fieldName} for ${context.nodeType}: "${generated.generatedValue.substring(0, 50)}..."`);
            }
        }
        return updatedNode;
    }
}
exports.UniversalNodeAIContext = UniversalNodeAIContext;
// Export singleton instance
exports.universalNodeAIContext = new UniversalNodeAIContext();
function compactPreviousOutputs(previousOutputs) {
    const compacted = {};
    for (const [key, value] of Object.entries(previousOutputs || {})) {
        try {
            compacted[key] = JSON.parse((0, ai_input_resolver_1.compactForAiPrompt)(value, 800));
        }
        catch {
            compacted[key] = (0, ai_input_resolver_1.compactForAiPrompt)(value, 800);
        }
    }
    return compacted;
}
