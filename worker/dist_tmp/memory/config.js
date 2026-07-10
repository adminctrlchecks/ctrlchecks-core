"use strict";
/**
 * Memory System Configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultMemoryConfig = void 0;
exports.getMemoryConfig = getMemoryConfig;
/**
 * Default memory configuration
 */
exports.defaultMemoryConfig = {
    maxCacheSize: parseInt(process.env.MEMORY_CACHE_SIZE || '100', 10),
    retentionPolicy: {
        executionRetentionDays: parseInt(process.env.EXECUTION_RETENTION_DAYS || '30', 10),
        workflowRetentionDays: parseInt(process.env.WORKFLOW_RETENTION_DAYS || '365', 10),
        logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '7', 10),
        enableAutoPrune: process.env.ENABLE_AUTO_PRUNE === 'true',
    },
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7'),
    vectorDimensions: parseInt(process.env.VECTOR_DIMENSIONS || '1536', 10),
    enableVectorSearch: process.env.ENABLE_VECTOR_SEARCH !== 'false',
};
/**
 * Get memory configuration
 */
function getMemoryConfig() {
    return {
        ...exports.defaultMemoryConfig,
        // Override with environment variables if needed
    };
}
