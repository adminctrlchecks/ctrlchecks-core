"use strict";
/**
 * Vector Store - Manages vector embeddings and similarity search
 * Uses PostgreSQL with pgvector extension
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStore = void 0;
const embeddings_1 = require("./utils/embeddings");
/**
 * Vector Store for semantic search
 * Handles storage and retrieval of vector embeddings
 */
class VectorStore {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.embeddingGenerator = (0, embeddings_1.getEmbeddingGenerator)();
    }
    /**
     * Store embedding for a memory reference
     */
    async storeEmbedding(referenceId, content, embedding) {
        // Prisma doesn't directly support vector types, so we use raw SQL
        const embeddingStr = `[${embedding.join(',')}]`;
        await this.prisma.$executeRaw `
      UPDATE memory_references
      SET embedding = ${embeddingStr}::vector
      WHERE id = ${referenceId}::uuid
    `;
    }
    /**
     * Generate and store embedding for content
     */
    async generateAndStoreEmbedding(referenceId, content) {
        if (!this.embeddingGenerator.isAvailable()) {
            console.warn('Embedding generator not available, skipping embedding storage');
            return;
        }
        const embedding = await this.embeddingGenerator.generateEmbedding(content);
        await this.storeEmbedding(referenceId, content, embedding);
    }
    /**
     * Find similar workflows using vector similarity search
     */
    async findSimilarWorkflows(query, limit = 5) {
        if (!this.embeddingGenerator.isAvailable()) {
            return [];
        }
        // Generate embedding for query
        const queryEmbedding = await this.embeddingGenerator.generateEmbedding(query);
        const embeddingStr = `[${queryEmbedding.join(',')}]`;
        // Use pgvector cosine similarity search
        // Note: This requires pgvector extension to be installed in PostgreSQL
        const results = await this.prisma.$queryRaw `
      SELECT 
        id,
        content,
        1 - (embedding <=> ${embeddingStr}::vector) as similarity,
        metadata
      FROM memory_references
      WHERE embedding IS NOT NULL
        AND (1 - (embedding <=> ${embeddingStr}::vector)) >= ${this.config.similarityThreshold}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;
        return results.map((r) => ({
            id: r.id,
            score: r.similarity,
            content: r.content,
            metadata: r.metadata,
        }));
    }
    /**
     * Find similar workflows by workflow ID
     */
    async findSimilarToWorkflow(workflowId, limit = 5) {
        // Get the workflow's embedding
        const workflow = await this.prisma.workflow.findUnique({
            where: { id: workflowId },
            include: {
                memoryReferences: {
                    where: {
                        referenceType: 'pattern',
                    },
                    take: 1,
                },
            },
        });
        if (!workflow || !workflow.memoryReferences.length) {
            return [];
        }
        const reference = workflow.memoryReferences[0];
        if (!reference.content) {
            return [];
        }
        return this.findSimilarWorkflows(reference.content, limit);
    }
    /**
     * Batch store embeddings
     */
    async batchStoreEmbeddings(items) {
        if (!this.embeddingGenerator.isAvailable()) {
            console.warn('Embedding generator not available, skipping batch embedding storage');
            return;
        }
        // Generate embeddings in batch
        const contents = items.map(item => item.content);
        const embeddings = await this.embeddingGenerator.generateEmbeddings(contents);
        // Store each embedding
        for (let i = 0; i < items.length; i++) {
            await this.storeEmbedding(items[i].id, items[i].content, embeddings[i]);
        }
    }
    /**
     * Calculate similarity between two embeddings
     */
    async calculateSimilarity(embedding1, embedding2) {
        return this.embeddingGenerator.cosineSimilarity(embedding1, embedding2);
    }
}
exports.VectorStore = VectorStore;
