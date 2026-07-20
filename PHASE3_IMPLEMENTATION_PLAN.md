# Phase 3: Optimization - Implementation Plan

## Overview

Phase 3 introduces **L1 in-memory caching** for router results to optimize performance and reduce redundant computations. This is a **controlled rollout** that happens **after** Phase 2 staging validation confirms production readiness.

## Prerequisites

- ✅ Phase 2 staging validation passes
- ✅ High-confidence activation rate < 20%
- ✅ Router latency acceptable (<5ms)
- ✅ Production monitoring in place

## Phase 3 Goals

1. **L1 In-Memory Caching** (Primary)
   - Cache router results in memory
   - LRU eviction policy
   - Reduce redundant router computations
   - Monitor cache hit rates

2. **Observability** (Required)
   - Cache hit/miss metrics
   - Cache size monitoring
   - Performance impact tracking

3. **L2 Redis Caching** (Future - After L1 Stabilizes)
   - Shared cache across instances
   - TTL-based expiration
   - Only after production patterns understood

## Implementation Strategy

### Step 1: L1 In-Memory Cache

**Location**: `worker/src/core/cache/router-result-cache.ts`

**Features**:
- LRU cache with configurable size (default: 1000 entries)
- Cache key: `{sourceNodeId}-{targetNodeId}-{schemaHash}-{intentHash}`
- TTL: 5 minutes (configurable)
- Automatic eviction on size limit

**Cache Key Components**:
```typescript
interface RouterCacheKey {
  sourceNodeId: string;
  targetNodeId: string;
  sourceSchemaHash: string; // From previous output
  intentHash: string; // Hash of user prompt
}
```

**Cache Value**:
```typescript
interface RouterCacheValue {
  filteredPayload: unknown;
  confidence: number;
  matchedKeys: string[];
  method: 'keyword' | 'embedding' | 'fallback';
  timestamp: number;
}
```

### Step 2: Integration Points

**Modify `IntentDrivenJsonRouter.route()`**:
1. Check cache before routing
2. Return cached result if found
3. Store result in cache after routing
4. Log cache hit/miss

**Modify `shouldActivateRouter()`**:
- Cache check happens before skip logic
- If cached result exists and valid → use cache, skip router
- If no cache → proceed with skip logic

### Step 3: Observability

**Metrics to Track**:
- Cache hit rate (%)
- Cache miss rate (%)
- Cache size (current entries)
- Cache evictions (count)
- Avg cache lookup time
- Router execution time (when cache miss)

**Logging**:
- `[RouterCache] ✅ Cache hit: {key}`
- `[RouterCache] ❌ Cache miss: {key}`
- `[RouterCache] 🗑️  Cache eviction: {key}`

## Implementation Details

### Cache Implementation

```typescript
class RouterResultCache {
  private cache: Map<string, RouterCacheValue>;
  private maxSize: number;
  private ttl: number; // milliseconds

  constructor(maxSize: number = 1000, ttl: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: RouterCacheKey): RouterCacheValue | null {
    const cacheKey = this.serializeKey(key);
    const value = this.cache.get(cacheKey);
    
    if (!value) return null;
    
    // Check TTL
    if (Date.now() - value.timestamp > this.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return value;
  }

  set(key: RouterCacheKey, value: RouterCacheValue): void {
    const cacheKey = this.serializeKey(key);
    
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(cacheKey)) {
      this.evictLRU();
    }
    
    this.cache.set(cacheKey, value);
  }

  private evictLRU(): void {
    // Simple LRU: remove first entry (oldest)
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  private serializeKey(key: RouterCacheKey): string {
    return `${key.sourceNodeId}-${key.targetNodeId}-${key.sourceSchemaHash}-${key.intentHash}`;
  }
}
```

### Integration with Router

```typescript
// In IntentDrivenJsonRouter.route()
async route(context: RoutingContext): Promise<RoutingResult> {
  // Check cache first
  const cacheKey = this.buildCacheKey(context);
  const cached = this.cache.get(cacheKey);
  
  if (cached) {
    console.log(`[RouterCache] ✅ Cache hit: ${cacheKey.sourceNodeId} → ${cacheKey.targetNodeId}`);
    return {
      filteredPayload: cached.filteredPayload,
      confidence: cached.confidence,
      matchedKeys: cached.matchedKeys,
      method: cached.method,
      explanation: `Cached result (${cached.method})`,
    };
  }
  
  console.log(`[RouterCache] ❌ Cache miss: ${cacheKey.sourceNodeId} → ${cacheKey.targetNodeId}`);
  
  // Proceed with routing
  const result = await this.performRouting(context);
  
  // Store in cache
  this.cache.set(cacheKey, {
    filteredPayload: result.filteredPayload,
    confidence: result.confidence,
    matchedKeys: result.matchedKeys,
    method: result.method,
    timestamp: Date.now(),
  });
  
  return result;
}
```

## Rollout Plan

### Phase 3.1: L1 Cache (In-Memory)
1. **Week 1**: Implement cache class
2. **Week 2**: Integrate with router
3. **Week 3**: Add observability/metrics
4. **Week 4**: Test in staging
5. **Week 5**: Gradual production rollout (10% → 50% → 100%)

### Phase 3.2: L2 Cache (Redis) - Future
- Only after L1 cache behavior understood
- Only after production traffic patterns analyzed
- Requires Redis infrastructure
- Shared cache across instances

## Success Criteria

### L1 Cache
- ✅ Cache hit rate > 30% (after warm-up)
- ✅ Router latency reduction > 20% (on cache hits)
- ✅ No memory leaks (stable cache size)
- ✅ No performance degradation

### Observability
- ✅ Cache metrics available in monitoring
- ✅ Logs capture hit/miss patterns
- ✅ Alerts for cache issues

## Risk Mitigation

### Risks
1. **Memory Leaks**: LRU eviction + TTL prevent unbounded growth
2. **Stale Data**: TTL ensures freshness
3. **Cache Invalidation**: Schema hash changes invalidate cache naturally
4. **Performance Impact**: Cache lookup is O(1), minimal overhead

### Mitigation
- Start with small cache size (100 entries)
- Monitor memory usage
- Gradual rollout with feature flags
- Easy disable mechanism

## Monitoring

### Key Metrics
- `router_cache_hit_rate` (gauge)
- `router_cache_miss_rate` (gauge)
- `router_cache_size` (gauge)
- `router_cache_evictions` (counter)
- `router_cache_lookup_time` (histogram)
- `router_execution_time` (histogram)

### Alerts
- Cache hit rate < 10% (may indicate cache key issues)
- Cache size > 90% capacity (may need tuning)
- Cache lookup time > 1ms (performance issue)

## Testing Strategy

### Unit Tests
- Cache get/set operations
- LRU eviction logic
- TTL expiration
- Cache key serialization

### Integration Tests
- Router with cache enabled
- Cache hit scenarios
- Cache miss scenarios
- Cache eviction scenarios

### Staging Tests
- Real workflow execution
- Cache hit rate measurement
- Performance impact measurement
- Memory usage monitoring

## Configuration

### Environment Variables
```bash
# Router Cache Configuration
ROUTER_CACHE_ENABLED=true
ROUTER_CACHE_MAX_SIZE=1000
ROUTER_CACHE_TTL_MS=300000  # 5 minutes
```

### Feature Flags
- `router_cache_enabled`: Enable/disable cache
- `router_cache_size`: Adjust cache size
- `router_cache_ttl`: Adjust TTL

## Timeline

**Estimated Duration**: 4-5 weeks

- Week 1-2: Implementation
- Week 3: Testing & observability
- Week 4: Staging validation
- Week 5: Production rollout

## Dependencies

- Phase 2 staging validation must pass
- Monitoring infrastructure ready
- Feature flag system available

## Next Steps

1. **Wait for Phase 2 staging validation results**
2. **Review metrics** (activation rate, latency)
3. **If validation passes** → Begin Phase 3.1 implementation
4. **If validation fails** → Address issues before Phase 3

---

**Status**: ⏳ Waiting for Phase 2 staging validation

**Ready to proceed**: After staging validation confirms production readiness
