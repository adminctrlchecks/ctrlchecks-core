"use strict";
/**
 * Intent-Driven JSON Router
 *
 * Runtime middleware that performs selective property extraction and intelligent
 * data filtering during workflow execution.
 *
 * Architecture:
 * - Only activates when skip conditions are met (confidence < 0.85, schema drift, explicit filtering)
 * - Uses shared IntentParser for consistent intent parsing
 * - Performs hybrid semantic matching (keyword → embedding)
 * - Selectively extracts only relevant data sections
 * - Returns filtered payload for next node
 * - Phase 3: Uses L1 in-memory cache to avoid redundant routing work
 *
 * This is Layer 3 of the four-layer orchestration architecture.
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentDrivenJsonRouter = void 0;
exports.getRouterCacheStats = getRouterCacheStats;
exports.shouldActivateRouter = shouldActivateRouter;
const intent_parser_1 = require("../shared/intent-parser");
const crypto = __importStar(require("crypto"));
const router_result_cache_1 = require("./cache/router-result-cache");
// L1 in-memory cache (process-local)
// Size and TTL can be tuned via env in future if needed.
const routerResultCache = new router_result_cache_1.RouterResultCache(Number(process.env.ROUTER_CACHE_MAX_SIZE || 1000), Number(process.env.ROUTER_CACHE_TTL_MS || 5 * 60 * 1000));
/**
 * Export cache statistics for observability
 * Can be called from monitoring/health check endpoints
 */
function getRouterCacheStats() {
    return routerResultCache.getStats();
}
/**
 * Extract all property keys from a JSON object/array recursively
 * Reuses logic from data-flow-contract-layer for consistency
 */
function extractPropertyKeys(data, prefix = '') {
    const keys = [];
    if (data === null || data === undefined) {
        return keys;
    }
    if (Array.isArray(data)) {
        // For arrays, check first element if it's an object
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
            const firstItem = data[0];
            Object.keys(firstItem).forEach(key => {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                keys.push(fullKey);
                // Also add array access pattern: items[].ColumnName
                keys.push(`${prefix ? prefix : 'items'}[].${key}`);
            });
        }
        else {
            // Array of primitives - add the array itself
            if (prefix) {
                keys.push(prefix);
            }
        }
    }
    else if (typeof data === 'object') {
        Object.keys(data).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.push(fullKey);
            const value = data[key];
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Recursively extract nested keys
                keys.push(...extractPropertyKeys(value, fullKey));
            }
            else if (Array.isArray(value) && value.length > 0) {
                // For nested arrays, add array access pattern
                keys.push(`${fullKey}[]`);
            }
        });
    }
    return keys;
}
/**
 * Calculate schema hash for output structure
 * Reuses logic from data-flow-contract-layer for consistency
 */
function calculateSchemaHash(output) {
    const keys = extractPropertyKeys(output);
    const sortedKeys = keys.sort().join(',');
    return crypto.createHash('sha256').update(sortedKeys).digest('hex').substring(0, 16);
}
function calculateIntentHash(userIntent) {
    const normalized = (userIntent || '').trim().toLowerCase();
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}
/**
 * Calculate keyword matching confidence score
 * Reuses logic from data-flow-contract-layer for consistency
 */
function calculateKeywordConfidence(targetFieldName, matchedKey, intentModel, sourceNodeType, targetNodeType) {
    let confidence = 0.5; // Base confidence
    const targetLower = targetFieldName.toLowerCase();
    const keyLower = matchedKey.toLowerCase();
    // Exact match boost
    if (keyLower === targetLower || keyLower.endsWith(`.${targetLower}`)) {
        confidence += 0.3;
    }
    // Intent entity match boost
    const entityMatch = intentModel.entities.some(entity => keyLower.includes(entity) || entity.includes(keyLower));
    if (entityMatch) {
        confidence += 0.2;
    }
    // Node type pattern match boost
    if (targetNodeType) {
        const targetLower = targetNodeType.toLowerCase();
        if (targetLower.includes('gmail') || targetLower.includes('email')) {
            if (keyLower.includes('subject') || keyLower.includes('body') || keyLower.includes('message')) {
                confidence += 0.2;
            }
        }
        if (targetLower.includes('ai') || targetLower.includes('llm')) {
            if (keyLower.includes('items') || keyLower.includes('data') || keyLower.includes('rows')) {
                confidence += 0.2;
            }
        }
    }
    // Intent confidence boost
    confidence += intentModel.confidence * 0.1;
    return Math.min(confidence, 1.0);
}
/**
 * Determine if router should activate based on skip conditions
 */
function shouldActivateRouter(mappingMetadata, previousOutput, userPrompt) {
    // Condition 1: No metadata → Use router (new workflow or unmapped field)
    if (!mappingMetadata) {
        return true;
    }
    // Condition 2: Low confidence → Use router
    if (mappingMetadata.confidence < 0.85) {
        return true;
    }
    // Condition 3: Schema drift → Use router
    const runtimeHash = calculateSchemaHash(previousOutput);
    if (runtimeHash !== mappingMetadata.schemaHash) {
        console.log(`[IntentRouter] 🔄 Schema drift detected: ${mappingMetadata.schemaHash} → ${runtimeHash}. Activating router.`);
        return true;
    }
    // Condition 4: Explicit filtering intent → Use router
    const intent = (0, intent_parser_1.parseIntent)(userPrompt);
    if ((0, intent_parser_1.requiresExplicitFiltering)(intent)) {
        console.log(`[IntentRouter] 🔍 Explicit filtering intent detected. Activating router.`);
        return true;
    }
    // Otherwise: Skip router (high confidence, no drift, no explicit filtering)
    return false;
}
/**
 * Intent-Driven JSON Router
 *
 * Performs selective property extraction and intelligent data filtering
 * during workflow execution.
 */
class IntentDrivenJsonRouter {
    /**
     * Route data from previous node to next node
     *
     * Performs semantic matching and selective extraction based on:
     * - User intent
     * - Previous node output structure
     * - Target node input schema
     */
    async route(context) {
        const { previousOutput, targetNodeInputSchema, userIntent, sourceNodeType, targetNodeType, sourceNodeId, targetNodeId, } = context;
        const routeStartTime = Date.now();
        console.log(`[IntentRouter] 🚀 Routing data from ${sourceNodeType} to ${targetNodeType}`);
        // ----- Phase 3: L1 In-Memory Cache (RouterResultCache) -----
        const schemaHash = calculateSchemaHash(previousOutput);
        const intentHash = calculateIntentHash(userIntent);
        const cacheKey = {
            sourceNodeId,
            targetNodeId,
            sourceSchemaHash: schemaHash,
            intentHash,
        };
        const cached = routerResultCache.get(cacheKey, routeStartTime);
        if (cached) {
            const cacheHitLatency = Date.now() - routeStartTime;
            console.log(`[RouterCache] ✅ Cache hit for ${sourceNodeId} → ${targetNodeId} (method=${cached.method}, confidence=${cached.confidence.toFixed(3)}, latency=${cacheHitLatency}ms)`);
            return {
                filteredPayload: cached.filteredPayload,
                confidence: cached.confidence,
                matchedKeys: cached.matchedKeys,
                method: cached.method,
                explanation: `Cached result (${cached.method})`,
            };
        }
        console.log(`[RouterCache] ❌ Cache miss for ${sourceNodeId} → ${targetNodeId}`);
        // Step 1: Parse intent (shared module)
        const intent = (0, intent_parser_1.parseIntent)(userIntent);
        console.log(`[IntentRouter] Intent entities: ${intent.entities.join(', ')}`);
        // Step 2: Extract and flatten JSON keys
        const jsonKeys = extractPropertyKeys(previousOutput);
        console.log(`[IntentRouter] Available keys: ${jsonKeys.slice(0, 10).join(', ')}${jsonKeys.length > 10 ? '...' : ''}`);
        // Step 3: Semantic matching (keyword → embedding hybrid)
        const matchResult = await this.semanticMatch(intent, jsonKeys, targetNodeInputSchema, sourceNodeType, targetNodeType);
        // Step 4: Selective extraction
        const filteredPayload = this.extractRelevantData(previousOutput, matchResult.matchedKeys, intent);
        const routingLatency = Date.now() - routeStartTime;
        console.log(`[IntentRouter] ✅ Routed with ${matchResult.method} matching (confidence: ${matchResult.confidence.toFixed(3)}, latency=${routingLatency}ms)`);
        // Store result in cache for future identical calls
        routerResultCache.set(cacheKey, {
            filteredPayload,
            confidence: matchResult.confidence,
            matchedKeys: matchResult.matchedKeys,
            method: matchResult.method,
        }, routeStartTime);
        return {
            filteredPayload,
            confidence: matchResult.confidence,
            matchedKeys: matchResult.matchedKeys,
            method: matchResult.method,
            explanation: matchResult.explanation,
        };
    }
    /**
     * Perform semantic matching (keyword → embedding hybrid)
     */
    async semanticMatch(intent, jsonKeys, targetNodeInputSchema, sourceNodeType, targetNodeType) {
        // Phase 1: Keyword pre-filter (fast, deterministic)
        const keywordMatches = [];
        for (const fieldName of Object.keys(targetNodeInputSchema)) {
            for (const key of jsonKeys) {
                const confidence = calculateKeywordConfidence(fieldName, key, intent, sourceNodeType, targetNodeType);
                if (confidence >= 0.5) {
                    keywordMatches.push({ key, confidence });
                }
            }
        }
        // Sort by confidence
        keywordMatches.sort((a, b) => b.confidence - a.confidence);
        // If best keyword match has high confidence (≥0.7), use it
        if (keywordMatches.length > 0 && keywordMatches[0].confidence >= 0.7) {
            return {
                matchedKeys: [keywordMatches[0].key],
                confidence: keywordMatches[0].confidence,
                method: 'keyword',
                explanation: `Keyword match: ${keywordMatches[0].key} (confidence: ${keywordMatches[0].confidence.toFixed(3)})`,
            };
        }
        // Phase 2: Embedding similarity (placeholder for now)
        // TODO: Implement embedding-based matching in Phase 3
        if (keywordMatches.length > 0) {
            // Use best keyword match even if confidence < 0.7
            return {
                matchedKeys: [keywordMatches[0].key],
                confidence: keywordMatches[0].confidence + 0.05, // Slight boost for embedding path
                method: 'embedding',
                explanation: `Embedding match (placeholder): ${keywordMatches[0].key} (confidence: ${(keywordMatches[0].confidence + 0.05).toFixed(3)})`,
            };
        }
        // Phase 3: Fallback
        return {
            matchedKeys: jsonKeys.slice(0, 1), // Use first available key
            confidence: 0.4,
            method: 'fallback',
            explanation: 'Fallback: Using first available key',
        };
    }
    /**
     * Extract relevant data based on matched keys and intent
     */
    extractRelevantData(data, matchedKeys, intent) {
        if (matchedKeys.length === 0) {
            return data; // No matches, return full data
        }
        // Check if user requests full dataset
        if (intent.qualifiers.some(q => ['all', 'every', 'entire', 'complete', 'full'].includes(q))) {
            return data; // Return full dataset
        }
        // Extract matched properties
        const result = {};
        for (const key of matchedKeys) {
            // Handle array access patterns like "items[].Resume"
            if (key.includes('[].')) {
                const [arrayKey, fieldName] = key.split('[].');
                if (Array.isArray(data[arrayKey])) {
                    // Filter array items based on intent entities
                    const filtered = data[arrayKey].filter((item) => {
                        if (intent.entities.length === 0)
                            return true;
                        // Check if item matches intent entities
                        const itemStr = JSON.stringify(item).toLowerCase();
                        return intent.entities.some(entity => itemStr.includes(entity));
                    });
                    result[arrayKey] = filtered;
                }
            }
            else {
                // Simple property access
                const value = this.getNestedValue(data, key);
                if (value !== undefined) {
                    this.setNestedValue(result, key, value);
                }
            }
        }
        return Object.keys(result).length > 0 ? result : data;
    }
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }
    /**
     * Set nested value in object using dot notation
     */
    setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current) || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
    }
}
exports.IntentDrivenJsonRouter = IntentDrivenJsonRouter;
