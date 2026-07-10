"use strict";
/**
 * Memory Manager - Core memory management service
 * Handles storage, retrieval, and management of workflow memory
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
const CacheManager_1 = require("./CacheManager");
const VectorStore_1 = require("./VectorStore");
const embeddings_1 = require("./utils/embeddings");
/**
 * Memory Manager - Main interface for memory operations
 */
class MemoryManager {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.cache = new CacheManager_1.CacheManager({
            maxSize: config.maxCacheSize,
        });
        this.vectorStore = new VectorStore_1.VectorStore(prisma, {
            similarityThreshold: config.similarityThreshold,
            maxResults: 5,
            embeddingDimensions: config.vectorDimensions,
        });
    }
    /**
     * Store workflow in memory system
     */
    async storeWorkflow(workflowData) {
        const { randomUUID } = require('crypto');
        const workflowId = workflowData.id || randomUUID();
        // 🚨 CRITICAL: Check if DATABASE_URL is available before using Prisma
        if (!process.env.DATABASE_URL) {
            console.warn('⚠️  [Memory] DATABASE_URL not set, skipping database storage (using cache only)');
            // Store in cache only
            const workflowMemory = {
                id: workflowId,
                definition: workflowData.definition,
                metadata: {
                    version: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isActive: true,
                    tags: workflowData.tags || [],
                    settings: workflowData.settings || {},
                },
                embeddings: [],
                statistics: {
                    totalExecutions: 0,
                    successfulExecutions: 0,
                    failedExecutions: 0,
                    successRate: 0,
                    averageExecutionTime: 0,
                },
                references: [],
            };
            this.cache.set(workflowId, workflowMemory);
            return workflowId;
        }
        try {
            // Store in database
            const workflow = await this.prisma.workflow.upsert({
                where: { id: workflowId },
                create: {
                    id: workflowId,
                    name: workflowData.name,
                    definition: workflowData.definition,
                    tags: (workflowData.tags || []),
                    settings: (workflowData.settings || {}),
                    isActive: true,
                    version: 1,
                },
                update: {
                    name: workflowData.name,
                    definition: workflowData.definition,
                    tags: (workflowData.tags || []),
                    settings: (workflowData.settings || {}),
                    updatedAt: new Date(),
                },
            });
            // Generate and store embedding if enabled
            if (this.config.enableVectorSearch) {
                const embeddingGenerator = (0, embeddings_1.getEmbeddingGenerator)();
                if (embeddingGenerator.isAvailable()) {
                    try {
                        const embedding = await embeddingGenerator.generateWorkflowEmbedding({
                            name: workflowData.name,
                            nodes: workflowData.definition.nodes || [],
                            edges: workflowData.definition.edges || [],
                            tags: workflowData.tags,
                        });
                        // Store as memory reference
                        const reference = await this.prisma.memoryReference.create({
                            data: {
                                workflowId: workflowId,
                                referenceType: 'pattern',
                                content: `Workflow: ${workflowData.name}`,
                                metadata: {
                                    nodeTypes: workflowData.definition.nodes?.map((n) => n.type || n.data?.type).filter(Boolean) || [],
                                },
                            },
                        });
                        // Store embedding using raw SQL (pgvector)
                        const embeddingStr = `[${embedding.join(',')}]`;
                        await this.prisma.$executeRaw `
              UPDATE memory_references
              SET embedding = ${embeddingStr}::vector
              WHERE id = ${reference.id}::uuid
            `;
                    }
                    catch (error) {
                        console.warn('Failed to generate/store embedding:', error);
                    }
                }
            }
            // Update cache
            const statistics = await this.getExecutionStatistics(workflowId);
            const workflowMemory = {
                id: workflowId,
                definition: workflowData.definition,
                metadata: {
                    version: workflow.version,
                    createdAt: workflow.createdAt,
                    updatedAt: workflow.updatedAt,
                    isActive: workflow.isActive,
                    tags: workflow.tags || [],
                    settings: workflow.settings || {},
                },
                embeddings: [],
                statistics,
                references: [],
            };
            this.cache.set(workflowId, workflowMemory);
            return workflowId;
        }
        catch (error) {
            console.error('Failed to store workflow:', error);
            throw error;
        }
    }
    /**
     * Get workflow reference with context
     */
    async getWorkflowReference(workflowId, context = {}) {
        // Try cache first
        const cached = this.cache.get(workflowId);
        if (cached) {
            return cached;
        }
        // 🚨 CRITICAL: Check if DATABASE_URL is available
        if (!process.env.DATABASE_URL) {
            console.warn('⚠️  [Memory] DATABASE_URL not set, returning null (cache miss)');
            return null;
        }
        try {
            // Fetch from database
            const workflow = await this.prisma.workflow.findUnique({
                where: { id: workflowId },
                include: {
                    memoryReferences: true,
                },
            });
            if (!workflow) {
                return null;
            }
            // Get execution statistics
            const statistics = await this.getExecutionStatistics(workflowId);
            // Build workflow memory
            const workflowMemory = {
                id: workflow.id,
                definition: workflow.definition,
                metadata: {
                    version: workflow.version,
                    createdAt: workflow.createdAt,
                    updatedAt: workflow.updatedAt,
                    isActive: workflow.isActive,
                    tags: workflow.tags || [],
                    settings: workflow.settings || {},
                },
                embeddings: [],
                statistics,
                references: workflow.memoryReferences.map((ref) => ({
                    id: ref.id,
                    workflowId: ref.workflowId || undefined,
                    referenceType: ref.referenceType,
                    content: ref.content,
                    metadata: ref.metadata || {},
                    createdAt: ref.createdAt,
                })),
            };
            // Cache it
            this.cache.set(workflowId, workflowMemory);
            return workflowMemory;
        }
        catch (error) {
            console.error('Failed to get workflow reference:', error);
            return null;
        }
    }
    /**
     * Store execution record
     */
    async storeExecution(executionData) {
        const { randomUUID } = require('crypto');
        const executionId = randomUUID();
        // 🚨 CRITICAL: Check if DATABASE_URL is available before using Prisma
        if (!process.env.DATABASE_URL) {
            console.warn('⚠️  [Memory] DATABASE_URL not set, skipping execution storage');
            return executionId;
        }
        try {
            // Store execution
            const execution = await this.prisma.execution.create({
                data: {
                    id: executionId,
                    workflowId: executionData.workflowId,
                    status: executionData.status,
                    inputData: executionData.inputData,
                    resultData: executionData.resultData,
                    startedAt: executionData.startedAt,
                    finishedAt: executionData.finishedAt,
                    executionTime: executionData.executionTime,
                    errorMessage: executionData.errorMessage,
                    context: (executionData.context || {}),
                    nodeExecutions: {
                        create: (executionData.nodeExecutions || []).map(ne => ({
                            nodeId: ne.nodeId,
                            nodeType: ne.nodeType,
                            inputData: ne.inputData,
                            outputData: ne.outputData,
                            status: ne.status,
                            error: ne.error,
                            duration: ne.duration,
                            sequence: ne.sequence,
                            metadata: (ne.metadata || {}),
                        })),
                    },
                },
            });
            // Invalidate cache for workflow (statistics changed)
            this.cache.invalidateWorkflow(executionData.workflowId);
            // Cache execution result
            this.cache.setExecution(executionId, execution);
            return executionId;
        }
        catch (error) {
            const isMissingMemoryTable = error?.code === 'P2021' ||
                String(error?.message || '').includes('memory_executions') ||
                String(error?.message || '').includes('memory_node_executions');
            if (isMissingMemoryTable) {
                console.warn('[Memory] Execution memory tables are not installed; skipping optional memory archive. ' +
                    'Run worker/prisma/migrations/SUPABASE_FIXED_SETUP.sql or disable memory persistence for this environment.');
            }
            else {
                console.error('Failed to store execution:', error);
            }
            throw error;
        }
    }
    /**
     * Find similar workflows using vector search
     */
    async findSimilarWorkflows(query, limit = 5) {
        if (!this.config.enableVectorSearch) {
            return [];
        }
        const results = await this.vectorStore.findSimilarWorkflows(query, limit);
        // Fetch full workflow data for each result
        const similarWorkflows = [];
        for (const result of results) {
            const reference = await this.prisma.memoryReference.findUnique({
                where: { id: result.id },
                include: {
                    workflow: true,
                },
            });
            if (reference?.workflow) {
                const statistics = await this.getExecutionStatistics(reference.workflow.id);
                similarWorkflows.push({
                    workflowId: reference.workflow.id,
                    name: reference.workflow.name,
                    similarity: result.score,
                    definition: reference.workflow.definition,
                    metadata: {
                        version: reference.workflow.version,
                        createdAt: reference.workflow.createdAt,
                        updatedAt: reference.workflow.updatedAt,
                        isActive: reference.workflow.isActive,
                        tags: reference.workflow.tags || [],
                        settings: reference.workflow.settings || {},
                    },
                    statistics,
                });
            }
        }
        return similarWorkflows;
    }
    /**
     * Get execution statistics for a workflow
     */
    async getExecutionStatistics(workflowId) {
        // 🚨 CRITICAL: Check if DATABASE_URL is available
        if (!process.env.DATABASE_URL) {
            // Return empty statistics if database not available
            return {
                totalExecutions: 0,
                successfulExecutions: 0,
                failedExecutions: 0,
                successRate: 0,
                averageExecutionTime: 0,
            };
        }
        try {
            const executions = await this.prisma.execution.findMany({
                where: { workflowId },
                orderBy: { startedAt: 'desc' },
            });
            const totalExecutions = executions.length;
            const successfulExecutions = executions.filter((e) => e.status === 'success').length;
            const failedExecutions = executions.filter((e) => e.status === 'error').length;
            const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;
            const executionTimes = executions
                .filter((e) => e.executionTime !== null)
                .map((e) => e.executionTime);
            const averageExecutionTime = executionTimes.length > 0
                ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
                : 0;
            const lastExecution = executions[0];
            const lastSuccessful = executions.find((e) => e.status === 'success');
            const lastFailed = executions.find((e) => e.status === 'error');
            return {
                totalExecutions,
                successfulExecutions,
                failedExecutions,
                successRate,
                averageExecutionTime,
                lastExecutionAt: lastExecution?.startedAt,
                lastSuccessfulExecutionAt: lastSuccessful?.startedAt,
                lastFailedExecutionAt: lastFailed?.startedAt,
            };
        }
        catch (error) {
            // 🚨 CRITICAL: Handle Prisma errors gracefully
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('DATABASE_URL') || errorMessage.includes('Environment variable not found') ||
                errorMessage.includes('schema cache')) {
                console.warn('⚠️  [Memory] Database not available, returning empty statistics:', errorMessage);
                return {
                    totalExecutions: 0,
                    successfulExecutions: 0,
                    failedExecutions: 0,
                    successRate: 0,
                    averageExecutionTime: 0,
                };
            }
            // Re-throw other errors
            throw error;
        }
    }
    /**
     * Prune old execution data
     */
    async pruneOldExecutions(retentionDays = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const result = await this.prisma.execution.deleteMany({
            where: {
                startedAt: {
                    lt: cutoffDate,
                },
            },
        });
        return result.count;
    }
    /**
     * Store memory reference
     */
    async storeMemoryReference(reference) {
        const { randomUUID } = require('crypto');
        const referenceId = randomUUID();
        const created = await this.prisma.memoryReference.create({
            data: {
                id: referenceId,
                workflowId: reference.workflowId,
                referenceType: reference.referenceType,
                content: reference.content,
                metadata: (reference.metadata || {}),
            },
        });
        // Generate and store embedding if enabled
        if (this.config.enableVectorSearch) {
            await this.vectorStore.generateAndStoreEmbedding(referenceId, reference.content);
        }
        return referenceId;
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cache.getStats();
    }
}
exports.MemoryManager = MemoryManager;
