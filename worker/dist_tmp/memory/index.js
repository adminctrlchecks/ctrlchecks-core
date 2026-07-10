"use strict";
/**
 * Memory System - Main export
 * n8n-style memory and reference system for AI workflow agent
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingGenerator = exports.VectorStore = exports.CacheManager = exports.WorkflowAnalyzer = exports.ReferenceBuilder = exports.MemoryManager = void 0;
exports.getPrismaClient = getPrismaClient;
exports.getMemoryManager = getMemoryManager;
exports.getReferenceBuilder = getReferenceBuilder;
exports.getWorkflowAnalyzer = getWorkflowAnalyzer;
const client_1 = require("@prisma/client");
const MemoryManager_1 = require("./MemoryManager");
const ReferenceBuilder_1 = require("./ReferenceBuilder");
const WorkflowAnalyzer_1 = require("./WorkflowAnalyzer");
const config_1 = require("./config");
// Singleton Prisma client
let prismaClient = null;
/**
 * Get or create Prisma client
 */
function getPrismaClient() {
    if (!prismaClient) {
        prismaClient = new client_1.PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    }
    return prismaClient;
}
/**
 * Get memory manager instance
 */
let memoryManagerInstance = null;
function getMemoryManager() {
    if (!memoryManagerInstance) {
        const prisma = getPrismaClient();
        const config = (0, config_1.getMemoryConfig)();
        memoryManagerInstance = new MemoryManager_1.MemoryManager(prisma, config);
    }
    return memoryManagerInstance;
}
/**
 * Get reference builder instance
 */
let referenceBuilderInstance = null;
function getReferenceBuilder() {
    if (!referenceBuilderInstance) {
        const memoryManager = getMemoryManager();
        referenceBuilderInstance = new ReferenceBuilder_1.ReferenceBuilder(memoryManager);
    }
    return referenceBuilderInstance;
}
/**
 * Get workflow analyzer instance
 */
let workflowAnalyzerInstance = null;
function getWorkflowAnalyzer() {
    if (!workflowAnalyzerInstance) {
        workflowAnalyzerInstance = new WorkflowAnalyzer_1.WorkflowAnalyzer();
    }
    return workflowAnalyzerInstance;
}
// Export types and classes
__exportStar(require("./types"), exports);
var MemoryManager_2 = require("./MemoryManager");
Object.defineProperty(exports, "MemoryManager", { enumerable: true, get: function () { return MemoryManager_2.MemoryManager; } });
var ReferenceBuilder_2 = require("./ReferenceBuilder");
Object.defineProperty(exports, "ReferenceBuilder", { enumerable: true, get: function () { return ReferenceBuilder_2.ReferenceBuilder; } });
var WorkflowAnalyzer_2 = require("./WorkflowAnalyzer");
Object.defineProperty(exports, "WorkflowAnalyzer", { enumerable: true, get: function () { return WorkflowAnalyzer_2.WorkflowAnalyzer; } });
var CacheManager_1 = require("./CacheManager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return CacheManager_1.CacheManager; } });
var VectorStore_1 = require("./VectorStore");
Object.defineProperty(exports, "VectorStore", { enumerable: true, get: function () { return VectorStore_1.VectorStore; } });
var embeddings_1 = require("./utils/embeddings");
Object.defineProperty(exports, "EmbeddingGenerator", { enumerable: true, get: function () { return embeddings_1.EmbeddingGenerator; } });
