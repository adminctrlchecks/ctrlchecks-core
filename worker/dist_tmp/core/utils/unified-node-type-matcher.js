"use strict";
/**
 * UNIFIED NODE TYPE MATCHER
 *
 * WORLD-CLASS ARCHITECTURE: Single source of truth for ALL node type matching
 *
 * This is the UNIVERSAL service that ALL layers MUST use for:
 * - Node type comparison
 * - Requirement satisfaction checking
 * - Semantic equivalence validation
 * - Category-based matching
 *
 * Architecture Principles:
 * 1. ✅ SINGLE SOURCE OF TRUTH: All matching logic centralized here
 * 2. ✅ SEMANTIC-AWARE: Uses SemanticNodeEquivalenceRegistry
 * 3. ✅ CATEGORY-AWARE: Falls back to category matching when needed
 * 4. ✅ OPERATION-AWARE: Context-sensitive matching (same node can match in one context, not another)
 * 5. ✅ EXTENSIBLE: Easy to add new matching strategies
 * 6. ✅ PRODUCTION-READY: Handles null/undefined gracefully
 * 7. ✅ PERFORMANCE: Cached lookups for high-scale usage
 *
 * Usage Across All Layers:
 * - ✅ Validation Layers (GraphConnectivity, PreCompilation, etc.)
 * - ✅ Workflow Builders (ProductionWorkflowBuilder, DSLGenerator)
 * - ✅ Intent Engines (IntentConstraintEngine)
 * - ✅ Sanitizers (WorkflowGraphSanitizer)
 * - ✅ Optimizers (WorkflowOperationOptimizer)
 * - ✅ Auto-Repair Systems
 *
 * This ensures:
 * - Consistent matching behavior across ALL stages
 * - No duplicate logic scattered across codebase
 * - Single point of maintenance for matching rules
 * - World-class scalability (millions/billions of workflows)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unifiedNodeTypeMatcher = exports.UnifiedNodeTypeMatcher = void 0;
exports.matchesNodeType = matchesNodeType;
exports.isRequirementSatisfiedBy = isRequirementSatisfiedBy;
const semantic_node_equivalence_registry_1 = require("../registry/semantic-node-equivalence-registry");
const unified_node_registry_1 = require("../registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("./unified-node-type-normalizer");
/**
 * Unified Node Type Matcher
 *
 * WORLD-CLASS SERVICE: Handles ALL node type matching across entire system
 */
class UnifiedNodeTypeMatcher {
    constructor() {
        // Performance optimization: Cache for frequently accessed matches
        this.matchCache = new Map();
        this.cacheMaxSize = 10000; // Prevent memory bloat
        console.log('[UnifiedNodeTypeMatcher] 🏗️  Initializing Unified Node Type Matcher...');
        console.log('[UnifiedNodeTypeMatcher] ✅ Initialized - Ready for world-class matching');
    }
    static getInstance() {
        if (!UnifiedNodeTypeMatcher.instance) {
            UnifiedNodeTypeMatcher.instance = new UnifiedNodeTypeMatcher();
        }
        return UnifiedNodeTypeMatcher.instance;
    }
    /**
     * Check if two node types match (with semantic equivalence support)
     *
     * ✅ PRODUCTION-READY: Handles null/undefined gracefully
     * ✅ SEMANTIC-AWARE: Uses semantic equivalence registry
     * ✅ CATEGORY-AWARE: Falls back to category matching
     * ✅ OPERATION-AWARE: Context-sensitive matching
     *
     * @param type1 - First node type
     * @param type2 - Second node type
     * @param context - Matching context (operation, category, strict mode)
     * @returns Match result with confidence and reason
     */
    matches(type1, type2, context) {
        // ✅ PRODUCTION-READY: Validate inputs
        if (!type1 || !type2) {
            return {
                matches: false,
                confidence: 0,
                reason: 'One or both node types are missing',
            };
        }
        // Check cache first (performance optimization)
        const cacheKey = this.getCacheKey(type1, type2, context);
        const cached = this.matchCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const normalized1 = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(type1).toLowerCase();
        const normalized2 = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(type2).toLowerCase();
        // ✅ STRICT MODE: Exact matching only (for legacy compatibility)
        if (context?.strict) {
            const exactMatch = normalized1 === normalized2;
            const result = {
                matches: exactMatch,
                confidence: exactMatch ? 100 : 0,
                reason: exactMatch ? 'Exact match (strict mode)' : 'No exact match (strict mode)',
            };
            this.cacheResult(cacheKey, result);
            return result;
        }
        // ✅ STEP 1: Exact match (highest confidence)
        if (normalized1 === normalized2) {
            const result = {
                matches: true,
                confidence: 100,
                reason: 'Exact type match',
                canonicalType: normalized1,
            };
            this.cacheResult(cacheKey, result);
            return result;
        }
        // ✅ STEP 2: Semantic equivalence check (most precise)
        const areSemanticallyEquivalent = semantic_node_equivalence_registry_1.semanticNodeEquivalenceRegistry.areEquivalent(normalized1, normalized2, context?.operation, context?.category);
        if (areSemanticallyEquivalent) {
            const canonical1 = semantic_node_equivalence_registry_1.semanticNodeEquivalenceRegistry.getCanonicalType(normalized1, context?.operation, context?.category);
            const result = {
                matches: true,
                confidence: 90,
                reason: `Semantic equivalence: ${normalized1} ≡ ${normalized2} (canonical: ${canonical1})`,
                canonicalType: canonical1,
            };
            this.cacheResult(cacheKey, result);
            return result;
        }
        // ✅ STEP 3: Category-based matching (fallback for nodes not in semantic registry)
        const nodeDef1 = unified_node_registry_1.unifiedNodeRegistry.get(normalized1);
        const nodeDef2 = unified_node_registry_1.unifiedNodeRegistry.get(normalized2);
        if (nodeDef1 && nodeDef2) {
            const category1 = (nodeDef1.category || '').toLowerCase();
            const category2 = (nodeDef2.category || '').toLowerCase();
            if (category1 && category1 === category2) {
                const result = {
                    matches: true,
                    confidence: 80,
                    reason: `Category-based match: both are '${category1}' category`,
                    canonicalType: normalized1, // Prefer first as canonical
                };
                this.cacheResult(cacheKey, result);
                return result;
            }
        }
        // ✅ STEP 4: Partial/contains match (legacy compatibility)
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
            const result = {
                matches: true,
                confidence: 70,
                reason: `Partial match: ${normalized1} contains ${normalized2} or vice versa`,
            };
            this.cacheResult(cacheKey, result);
            return result;
        }
        // No match found
        const result = {
            matches: false,
            confidence: 0,
            reason: `No match: ${normalized1} ≠ ${normalized2} (not semantically equivalent, different categories)`,
        };
        this.cacheResult(cacheKey, result);
        return result;
    }
    /**
     * Check if a required node type is satisfied by any node in a list
     *
     * ✅ PRODUCTION-READY: Used by validators, builders, sanitizers
     *
     * @param requiredType - Required node type
     * @param availableTypes - List of available node types
     * @param context - Matching context
     * @returns Match result with best matching type
     */
    isRequirementSatisfied(requiredType, availableTypes, context) {
        if (!requiredType || !Array.isArray(availableTypes) || availableTypes.length === 0) {
            return {
                matches: false,
                confidence: 0,
                reason: 'Required type or available types list is empty',
            };
        }
        let bestMatch = null;
        for (const availableType of availableTypes) {
            const match = this.matches(requiredType, availableType, context);
            if (match.matches) {
                // Prefer higher confidence matches
                if (!bestMatch || match.confidence > bestMatch.confidence) {
                    bestMatch = {
                        ...match,
                        matchingType: availableType,
                    };
                }
            }
        }
        return bestMatch || {
            matches: false,
            confidence: 0,
            reason: `No matching type found in available types: ${availableTypes.join(', ')}`,
        };
    }
    /**
     * Find all matching types in a list for a given type
     *
     * ✅ PRODUCTION-READY: Used by optimizers, sanitizers
     *
     * @param targetType - Target node type to match
     * @param candidateTypes - List of candidate types
     * @param context - Matching context
     * @returns List of matching types with match results
     */
    findAllMatches(targetType, candidateTypes, context) {
        const matches = [];
        for (const candidateType of candidateTypes) {
            const match = this.matches(targetType, candidateType, context);
            if (match.matches) {
                matches.push({ type: candidateType, match });
            }
        }
        // Sort by confidence (highest first)
        matches.sort((a, b) => b.match.confidence - a.match.confidence);
        return matches;
    }
    /**
     * Get canonical type for a node type
     *
     * ✅ PRODUCTION-READY: Delegates to semantic equivalence registry
     *
     * @param nodeType - Node type to get canonical for
     * @param context - Matching context
     * @returns Canonical type
     */
    getCanonicalType(nodeType, context) {
        return semantic_node_equivalence_registry_1.semanticNodeEquivalenceRegistry.getCanonicalType(nodeType, context?.operation, context?.category);
    }
    /**
     * Check if a node type is semantically equivalent to any in a list
     *
     * ✅ PRODUCTION-READY: Used by auto-repair, injection systems
     *
     * @param nodeType - Node type to check
     * @param existingTypes - List of existing types
     * @param context - Matching context
     * @returns Matching type if found, null otherwise
     */
    findSemanticDuplicate(nodeType, existingTypes, context) {
        const duplicate = semantic_node_equivalence_registry_1.semanticNodeEquivalenceRegistry.findSemanticDuplicate(nodeType, existingTypes, context?.operation, context?.category);
        return duplicate || null;
    }
    /**
     * Clear match cache (for testing or memory management)
     */
    clearCache() {
        this.matchCache.clear();
        console.log('[UnifiedNodeTypeMatcher] 🧹 Cache cleared');
    }
    /**
     * Get cache statistics (for monitoring/debugging)
     */
    getCacheStats() {
        return {
            size: this.matchCache.size,
            maxSize: this.cacheMaxSize,
        };
    }
    // Private helper methods
    getCacheKey(type1, type2, context) {
        const normalized1 = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(type1).toLowerCase();
        const normalized2 = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeTypeString)(type2).toLowerCase();
        const operation = context?.operation || '';
        const category = context?.category || '';
        const strict = context?.strict ? 'strict' : 'semantic';
        // Sort types for cache key (order-independent)
        const sorted = [normalized1, normalized2].sort().join('|');
        return `${sorted}:${operation}:${category}:${strict}`;
    }
    cacheResult(key, result) {
        // Prevent cache bloat
        if (this.matchCache.size >= this.cacheMaxSize) {
            // Remove oldest entries (simple FIFO)
            const firstKey = this.matchCache.keys().next().value;
            if (firstKey) {
                this.matchCache.delete(firstKey);
            }
        }
        this.matchCache.set(key, result);
    }
}
exports.UnifiedNodeTypeMatcher = UnifiedNodeTypeMatcher;
// Export singleton instance
exports.unifiedNodeTypeMatcher = UnifiedNodeTypeMatcher.getInstance();
// Export convenience functions for common use cases
function matchesNodeType(type1, type2, context) {
    return exports.unifiedNodeTypeMatcher.matches(type1, type2, context).matches;
}
function isRequirementSatisfiedBy(requiredType, availableTypes, context) {
    return exports.unifiedNodeTypeMatcher.isRequirementSatisfied(requiredType, availableTypes, context).matches;
}
