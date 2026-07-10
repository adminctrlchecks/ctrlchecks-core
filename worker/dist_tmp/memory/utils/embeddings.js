"use strict";
/**
 * Embedding Generation Utility
 * Generates vector embeddings for workflow descriptions and content
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingGenerator = void 0;
exports.getEmbeddingGenerator = getEmbeddingGenerator;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../../core/config");
/**
 * Embedding Generator
 * Supports OpenAI embeddings (can be extended for other providers)
 */
class EmbeddingGenerator {
    constructor(embeddingConfig) {
        this.openai = null;
        this.config = {
            model: embeddingConfig?.model || 'text-embedding-3-small',
            dimensions: embeddingConfig?.dimensions || 1536,
            apiKey: embeddingConfig?.apiKey || config_1.config.openaiApiKey,
        };
        this.model = this.config.model;
        // Initialize OpenAI client if API key is available
        if (this.config.apiKey) {
            this.openai = new openai_1.default({
                apiKey: this.config.apiKey,
            });
        }
    }
    /**
     * Generate embedding for text content
     */
    async generateEmbedding(text) {
        if (!this.openai) {
            throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
        }
        try {
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: text,
                dimensions: this.config.dimensions,
            });
            return response.data[0].embedding;
        }
        catch (error) {
            throw new Error(`Failed to generate embedding: ${error.message}`);
        }
    }
    /**
     * Generate embeddings for multiple texts (batch)
     */
    async generateEmbeddings(texts) {
        if (!this.openai) {
            throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
        }
        try {
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: texts,
                dimensions: this.config.dimensions,
            });
            return response.data.map((item) => item.embedding);
        }
        catch (error) {
            throw new Error(`Failed to generate embeddings: ${error.message}`);
        }
    }
    /**
     * Generate embedding for workflow definition
     * Creates a text representation of the workflow for embedding
     */
    async generateWorkflowEmbedding(workflow) {
        // Create a descriptive text representation
        const nodeTypes = workflow.nodes.map(n => n.type || n.data?.type).filter(Boolean);
        const nodeTypesStr = [...new Set(nodeTypes)].join(', ');
        const description = `Workflow: ${workflow.name}. Node types: ${nodeTypesStr}. Tags: ${workflow.tags?.join(', ') || 'none'}`;
        return this.generateEmbedding(description);
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        if (denominator === 0) {
            return 0;
        }
        return dotProduct / denominator;
    }
    /**
     * Check if embeddings are available
     */
    isAvailable() {
        return this.openai !== null;
    }
}
exports.EmbeddingGenerator = EmbeddingGenerator;
// Singleton instance
let embeddingGenerator = null;
/**
 * Get or create embedding generator instance
 */
function getEmbeddingGenerator() {
    if (!embeddingGenerator) {
        embeddingGenerator = new EmbeddingGenerator({
            apiKey: config_1.config.openaiApiKey,
        });
    }
    return embeddingGenerator;
}
