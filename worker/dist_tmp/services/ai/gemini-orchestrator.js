"use strict";
// Core Gemini Orchestrator
// Unified model management & routing for all AI services using Google Gemini 3
// Performance optimization & caching
// Fallback chains & error recovery
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiOrchestrator = exports.GeminiOrchestrator = void 0;
const llm_adapter_1 = require("../../shared/llm-adapter");
const metrics_tracker_1 = require("./metrics-tracker");
const performance_monitor_1 = require("./performance-monitor");
const gemini_models_1 = require("./gemini-models");
class GeminiOrchestrator {
    constructor() {
        this.cache = new Map();
        this.cacheTTL = 60 * 60 * 1000; // 1 hour default
        this.modelPerformance = new Map();
        // Model pricing (per 1M tokens)
        this.MODEL_PRICING = {
            [gemini_models_1.GEMINI_PRO_MODEL]: { input: 1.25, output: 5.00 },
            [gemini_models_1.GEMINI_DEFAULT_MODEL]: { input: 0.075, output: 0.30 },
            [gemini_models_1.GEMINI_LITE_MODEL]: { input: 0.0375, output: 0.15 },
        };
        this.llmAdapter = new llm_adapter_1.LLMAdapter();
        this.initializeModelPerformance();
    }
    initializeModelPerformance() {
        gemini_models_1.GEMINI_MODELS.forEach(model => {
            this.modelPerformance.set(model, {
                usageCount: 0,
                successRate: 100,
                averageLatency: 0,
                totalTokens: 0,
            });
        });
    }
    /**
     * Main entry point for all AI requests
     */
    async processRequest(type, input, options) {
        const startTime = Date.now();
        let selectedModel = (0, gemini_models_1.normalizeGeminiModel)(options?.model || this.selectOptimalModel(type, input));
        try {
            // Check cache first
            // NOTE: workflow-generation and workflow-analysis are never cached — each prompt is unique
            // and caching causes stale switch cases / form fields to be served on re-generation.
            const isCacheable = options?.cache !== false &&
                type !== 'workflow-generation' &&
                type !== 'workflow-analysis';
            if (isCacheable) {
                const cacheKey = this.getCacheKey(type, input);
                const cached = this.cache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
                    metrics_tracker_1.metricsTracker.trackCache(true);
                    console.log(`[GeminiOrchestrator] Cache hit for ${type}`);
                    return cached.result;
                }
                metrics_tracker_1.metricsTracker.trackCache(false);
            }
            // Build prompt based on request type
            const prompt = this.buildPrompt(type, input);
            // Prepare messages for Gemini API
            const messages = this.prepareMessages(prompt, input);
            // Execute with retry logic
            const result = await this.executeWithRetry(selectedModel, messages, {
                temperature: options?.temperature ?? this.getDefaultTemperature(type),
                maxTokens: options?.max_tokens ?? this.getDefaultMaxTokens(type),
                stream: options?.stream ?? false,
                structuredOutput: options?.structuredOutput,
                usageStage: options?.usageStage,
            });
            // Post-process result
            const processedResult = this.postprocessResult(type, result);
            // Update performance metrics
            const duration = Date.now() - startTime;
            this.updateModelPerformance(selectedModel, duration, true);
            // Cache result (only for cacheable request types)
            if (isCacheable) {
                const cacheKey = this.getCacheKey(type, input);
                this.cache.set(cacheKey, {
                    result: processedResult,
                    timestamp: Date.now(),
                });
            }
            // Track metrics
            metrics_tracker_1.metricsTracker.trackRequest(selectedModel, true, duration);
            performance_monitor_1.aiPerformanceMonitor.trackRequest(type, selectedModel, startTime, true);
            return processedResult;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.updateModelPerformance(selectedModel, duration, false);
            metrics_tracker_1.metricsTracker.trackRequest(selectedModel, false, duration);
            performance_monitor_1.aiPerformanceMonitor.trackRequest(type, selectedModel, startTime, false);
            console.error(`[GeminiOrchestrator] Error processing ${type}:`, error);
            throw error;
        }
    }
    /**
     * Select optimal Gemini model based on request type and complexity
     */
    selectOptimalModel(type, input) {
        // High complexity tasks → Pro
        if ([
            'workflow-generation', 'code-generation', 'code-assistance',
            'image-understanding', 'image-comparison', 'reasoning',
            // Catalog-level reasoning: picking from 100+ node types requires deep understanding
            'node-suggestion',
            // Field population makes critical structural decisions (operation, template wiring)
            'property-population',
        ].includes(type)) {
            return gemini_models_1.GEMINI_PRO_MODEL;
        }
        // Low complexity tasks → Flash Lite
        if (['summarization', 'translation', 'text-analysis', 'entity-extraction', 'text-completion'].includes(type)) {
            return gemini_models_1.GEMINI_LITE_MODEL;
        }
        // Default → Flash (balanced)
        return gemini_models_1.GEMINI_DEFAULT_MODEL;
    }
    /**
     * Build prompt based on request type
     */
    buildPrompt(type, input) {
        if (typeof input === 'string') {
            return input;
        }
        if (input.prompt) {
            return input.prompt;
        }
        if (input.system && input.message) {
            return `${input.system}\n\n${input.message}`;
        }
        if (input.messages && Array.isArray(input.messages)) {
            return input.messages.map((m) => m.content || m).join('\n');
        }
        // Fallback: stringify the input
        return JSON.stringify(input, null, 2);
    }
    /**
     * Prepare messages array for Gemini API (LLMMessage format)
     */
    prepareMessages(prompt, input) {
        // If input has structured messages, use them
        if (input.messages && Array.isArray(input.messages)) {
            return input.messages.map((msg) => ({
                role: (msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user'),
                content: typeof msg === 'string' ? msg : (msg.content || JSON.stringify(msg)),
            }));
        }
        // If input has system and message, create structured messages
        if (input.system && input.message) {
            return [
                { role: 'system', content: input.system },
                { role: 'user', content: input.message },
            ];
        }
        // Default: single user message
        return [{ role: 'user', content: prompt }];
    }
    /**
     * Execute request with retry logic
     */
    async executeWithRetry(model, messages, options, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.llmAdapter.chat('gemini', messages, {
                    model,
                    temperature: options.temperature ?? 0.7,
                    maxTokens: options.maxTokens,
                    stream: options.stream,
                    structuredOutput: options.structuredOutput,
                    usageStage: options.usageStage,
                });
                return response;
            }
            catch (error) {
                const isLastAttempt = attempt === maxRetries;
                const isRateLimit = error.message?.includes('rate limit') || error.status === 429;
                const isServerError = error.status >= 500;
                if (isLastAttempt || (!isRateLimit && !isServerError)) {
                    throw error;
                }
                // Exponential backoff — capped at 3s
                const delay = Math.min(500 * Math.pow(2, attempt - 1), 3000);
                console.log(`[GeminiOrchestrator] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error('Max retries exceeded');
    }
    /**
     * Post-process result based on request type
     */
    postprocessResult(type, result) {
        if (typeof result === 'string') {
            // Try to parse JSON if it looks like JSON
            if (result.trim().startsWith('{') || result.trim().startsWith('[')) {
                try {
                    return JSON.parse(result);
                }
                catch {
                    // Not valid JSON, return as string
                }
            }
            return result;
        }
        // If result has content property (Gemini response format)
        if (result.content) {
            return result.content;
        }
        // If result has text property
        if (result.text) {
            return result.text;
        }
        return result;
    }
    /**
     * Get cache key for request
     */
    getCacheKey(type, input) {
        const inputStr = typeof input === 'string'
            ? input
            : JSON.stringify(input);
        return `gemini:${type}:${Buffer.from(inputStr).toString('base64')}`;
    }
    /**
     * Get default temperature for request type
     */
    getDefaultTemperature(type) {
        // Lower temperature for structured outputs
        if (['workflow-generation', 'code-generation'].includes(type)) {
            return 0.2;
        }
        // Higher temperature for creative tasks
        if (['chat-generation', 'text-completion'].includes(type)) {
            return 0.7;
        }
        return 0.5; // Default
    }
    /**
     * Get default max tokens for request type
     */
    getDefaultMaxTokens(type) {
        if (['workflow-generation', 'code-generation'].includes(type)) {
            return 16000; // Longer outputs — workflow JSON can exceed 4000 tokens for 5+ node graphs
        }
        // Intent analysis returns structured JSON with actions + dataFlows arrays.
        // Complex prompts (5+ dataFlows) can exceed 2000 tokens and get truncated.
        if (type === 'intent-analysis') {
            return 4000;
        }
        if (['summarization', 'text-completion'].includes(type)) {
            return 500; // Shorter outputs
        }
        return 2000; // Default
    }
    /**
     * Update model performance metrics
     */
    updateModelPerformance(model, latency, success) {
        const perf = this.modelPerformance.get(model);
        if (!perf)
            return;
        perf.usageCount++;
        if (success) {
            perf.averageLatency = (perf.averageLatency * (perf.usageCount - 1) + latency) / perf.usageCount;
            perf.successRate = ((perf.successRate / 100) * (perf.usageCount - 1) + 1) / perf.usageCount * 100;
        }
        else {
            perf.successRate = ((perf.successRate / 100) * (perf.usageCount - 1)) / perf.usageCount * 100;
        }
        this.modelPerformance.set(model, perf);
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return new Map(this.modelPerformance);
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        // This would need to track hits/misses separately for accurate hit rate
        return {
            size: this.cache.size,
            hitRate: 0, // TODO: Implement hit rate tracking
        };
    }
}
exports.GeminiOrchestrator = GeminiOrchestrator;
// Export singleton instance
exports.geminiOrchestrator = new GeminiOrchestrator();
