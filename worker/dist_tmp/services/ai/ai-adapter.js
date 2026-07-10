"use strict";
// AI Adapter - Unified interface for AI operations (Gemini via GEMINI_API_KEY)
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAdapter = exports.AIAdapter = void 0;
const gemini_orchestrator_1 = require("./gemini-orchestrator");
const llm_adapter_1 = require("../../shared/llm-adapter");
const llmAdapter = new llm_adapter_1.LLMAdapter();
class AIAdapter {
    async textGeneration(prompt, options = {}) {
        const input = options.system ? { system: options.system, message: prompt } : prompt;
        const result = await gemini_orchestrator_1.geminiOrchestrator.processRequest('chat-generation', input, {
            model: options.model || 'gemini-3.5-flash',
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens,
            cache: false,
        });
        return typeof result === 'string' ? result : (result?.content ?? String(result));
    }
    async codeGeneration(prompt, options = {}) {
        const systemPrompt = options.language
            ? `You are an expert ${options.language}${options.framework ? ` and ${options.framework}` : ''} developer. Generate clean, efficient, and well-commented code.`
            : 'You are an expert programmer. Generate clean, efficient, and well-commented code.';
        const fullPrompt = options.language ? `Write ${options.language} code for: ${prompt}` : prompt;
        const result = await gemini_orchestrator_1.geminiOrchestrator.processRequest('code-generation', { system: systemPrompt, message: fullPrompt }, {
            model: 'gemini-3.5-flash',
            temperature: options.temperature ?? 0.3,
            cache: false,
        });
        return typeof result === 'string' ? result : (result?.content ?? String(result));
    }
    async imageAnalysis(_imageBase64, _question, _options) {
        throw new Error('Image analysis has been removed.');
    }
    async chat(messages, options = {}) {
        const response = await llmAdapter.chat('gemini', messages, {
            model: options.model || 'gemini-3.5-flash',
            temperature: options.temperature ?? 0.7,
        });
        return response.content;
    }
    async summarize(text, options = {}) {
        const prompt = options.focus
            ? `Summarize the following text focusing on ${options.focus}:\n\n${text}`
            : `Summarize the following text${options.maxLength ? ` in ${options.maxLength} words` : ''}:\n\n${text}`;
        const result = await gemini_orchestrator_1.geminiOrchestrator.processRequest('summarization', prompt, { cache: false });
        return typeof result === 'string' ? result : (result?.content ?? String(result));
    }
    async translate(text, targetLanguage, sourceLanguage) {
        const prompt = sourceLanguage
            ? `Translate the following ${sourceLanguage} text to ${targetLanguage}:\n\n${text}`
            : `Translate the following text to ${targetLanguage}:\n\n${text}`;
        const result = await gemini_orchestrator_1.geminiOrchestrator.processRequest('translation', prompt, { cache: false });
        return typeof result === 'string' ? result : (result?.content ?? String(result));
    }
    async sentimentAnalysis(text) {
        const prompt = `Analyze the sentiment of the following text. Respond with JSON: {"sentiment": "positive|negative|neutral", "score": 0.0-1.0, "explanation": "brief explanation"}\n\nText: ${text}`;
        const result = await gemini_orchestrator_1.geminiOrchestrator.processRequest('text-analysis', prompt, { cache: false });
        const content = typeof result === 'string' ? result : (result?.content ?? String(result));
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch)
                return JSON.parse(jsonMatch[0]);
        }
        catch (_) { }
        return { sentiment: 'neutral', score: 0.5, explanation: content };
    }
    async semanticSearch(query, documents, topK = 5) {
        return documents
            .map((doc, index) => ({ document: doc, score: this.textSimilarity(query, doc), index }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
    async extractInformation(text, schema) {
        const fieldsDescription = schema.fields.map(f => `- ${f.name} (${f.type}): ${f.description}`).join('\n');
        const prompt = `Extract the following information from the text below. Respond with JSON only:\n\nFields:\n${fieldsDescription}\n\nText:\n${text}`;
        const result = await gemini_orchestrator_1.geminiOrchestrator.processRequest('entity-extraction', prompt, { cache: false });
        const content = typeof result === 'string' ? result : (result?.content ?? String(result));
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch)
                return JSON.parse(jsonMatch[0]);
        }
        catch (_) { }
        return {};
    }
    async questionAnswering(question, context) {
        const prompt = `Answer based on the context. If unknown, say "I don't know."\n\nContext:\n${context}\n\nQuestion: ${question}`;
        const result = await gemini_orchestrator_1.geminiOrchestrator.processRequest('chat-generation', prompt, { cache: false });
        return typeof result === 'string' ? result : (result?.content ?? String(result));
    }
    textSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return union.size ? intersection.size / union.size : 0;
    }
}
exports.AIAdapter = AIAdapter;
exports.aiAdapter = new AIAdapter();
