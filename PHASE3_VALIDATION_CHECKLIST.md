# Phase 3 (L1 Cache) - Production Validation Checklist

## Overview

Phase 3 introduces **L1 in-memory caching** for router results. This is a **performance-only optimization** with **zero behavioral change**.

## Architecture Validation

### ✅ Cache Safety

#### 1. Schema Change → Cache Miss
**Test**: Change output schema of a node, verify cache miss

**Expected Behavior**:
- Schema hash changes → cache key changes → cache miss
- Router recomputes routing with new schema
- New result stored in cache

**Validation**:
```bash
# Run workflow with schema A
# Modify node output structure (add/remove fields)
# Run same workflow again
# Verify: [RouterCache] ❌ Cache miss (schema hash changed)
```

#### 2. Intent Variation → Cache Miss
**Test**: Slightly different user prompts should miss cache

**Expected Behavior**:
- Intent hash changes → cache key changes → cache miss
- Even subtle normalization differences should be detected

**Validation**:
```bash
# Run workflow with prompt: "Get data from sheets"
# Run workflow with prompt: "Get data from sheets " (trailing space)
# Verify: Cache miss (intent hash different)
```

#### 3. TTL Expiration → Entry Evicted
**Test**: Wait for TTL to expire, verify cache miss

**Expected Behavior**:
- After TTL expires, entry is deleted
- Next request with same key → cache miss
- `ttlExpired` counter increments

**Validation**:
```bash
# Run workflow (creates cache entry)
# Wait >5 minutes (default TTL)
# Run same workflow again
# Verify: [RouterCache] ❌ Cache miss (TTL expired)
# Check stats: ttlExpired counter incremented
```

### ✅ Hit Rate Expectations

#### 1. Warm-Up Behavior
**Test**: Run same workflow multiple times

**Expected Behavior**:
- First run: Cache miss (0% hit rate)
- Second run: Cache hit (100% hit rate for that key)
- Hit rate increases after warm-up

**Validation**:
```bash
# Run workflow 10 times with identical inputs
# Check stats after each run
# Expected: Hit rate increases: 0% → 10% → 20% → ... → 90%
```

#### 2. Router Latency Collapse
**Test**: Measure latency for cache hits vs misses

**Expected Behavior**:
- Cache hit latency: <1ms (near-zero)
- Cache miss latency: ~1-2ms (full routing computation)
- Latency difference visible in logs

**Validation**:
```bash
# Run workflow twice (second should hit cache)
# Check logs for latency:
#   First run: [IntentRouter] ✅ Routed ... (latency=1.5ms)
#   Second run: [RouterCache] ✅ Cache hit ... (latency=0.2ms)
# Verify: Hit latency << Miss latency
```

#### 3. Memory Footprint
**Test**: Monitor cache size under max load

**Expected Behavior**:
- Cache size stays within `maxSize` limit
- LRU eviction prevents unbounded growth
- Memory usage stable

**Validation**:
```bash
# Run many different workflows (more than maxSize)
# Check stats: currentSize should never exceed maxSize
# Verify: Evictions occur when at capacity
```

## Observability Metrics

### Required Counters

All counters are tracked automatically:

1. **`router_cache_hits_total`** → `stats.hits`
2. **`router_cache_misses_total`** → `stats.misses`
3. **`router_cache_evictions_total`** → `stats.evictions`
4. **`router_cache_ttl_expired_total`** → `stats.ttlExpired`

### Accessing Statistics

**From Code**:
```typescript
import { getRouterCacheStats } from './core/intent-driven-json-router';

const stats = getRouterCacheStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);
```

**From Logs**:
- Periodic stats logged every 5 minutes or every 100 operations
- Format: `[RouterCache] 📊 Stats: hits=X, misses=Y, hitRate=Z%, ...`

### Latency Tracking

- **`avgLatencyHit`**: Average latency for cache hits (ms)
- **`avgLatencyMiss`**: Average latency for cache misses (ms)

**Expected Values**:
- `avgLatencyHit`: <1ms (cache lookup only)
- `avgLatencyMiss`: ~1-2ms (full routing computation)

## Production Validation Steps

### Step 1: Cache Safety Tests

1. **Schema Change Test**
   ```bash
   # Run workflow with stable schema
   # Modify node output structure
   # Verify cache miss and correct routing
   ```

2. **Intent Variation Test**
   ```bash
   # Run workflow with prompt A
   # Run workflow with prompt B (slightly different)
   # Verify cache miss for prompt B
   ```

3. **TTL Expiration Test**
   ```bash
   # Run workflow (creates entry)
   # Wait >TTL duration
   # Run same workflow
   # Verify cache miss and ttlExpired increment
   ```

### Step 2: Performance Tests

1. **Hit Rate Measurement**
   ```bash
   # Run 100 identical workflows
   # Calculate: hitRate = hits / (hits + misses)
   # Expected: hitRate > 30% after warm-up
   ```

2. **Latency Measurement**
   ```bash
   # Run workflow twice (second should hit cache)
   # Compare latencies:
   #   - First run (miss): ~1-2ms
   #   - Second run (hit): <1ms
   # Expected: Hit latency < 20% of miss latency
   ```

3. **Memory Stability**
   ```bash
   # Run many different workflows (>maxSize)
   # Monitor: currentSize should never exceed maxSize
   # Verify: Evictions occur correctly
   ```

### Step 3: Observability Validation

1. **Counter Accuracy**
   ```bash
   # Run workflows and manually count hits/misses
   # Compare with stats.hits and stats.misses
   # Verify: Counters match manual counts
   ```

2. **Periodic Logging**
   ```bash
   # Run workflows for >5 minutes or >100 operations
   # Verify: Stats logged periodically
   # Format: [RouterCache] 📊 Stats: ...
   ```

3. **Latency Tracking**
   ```bash
   # Run workflows with cache hits and misses
   # Check stats.avgLatencyHit and stats.avgLatencyMiss
   # Verify: Hit latency << Miss latency
   ```

## Success Criteria

### ✅ Cache Safety
- [ ] Schema change → cache miss
- [ ] Intent variation → cache miss
- [ ] TTL expiration → entry evicted
- [ ] No stale data reuse

### ✅ Performance
- [ ] Hit rate > 30% after warm-up
- [ ] Hit latency < 1ms
- [ ] Miss latency ~1-2ms
- [ ] Latency reduction > 20% on hits

### ✅ Memory Management
- [ ] Cache size never exceeds maxSize
- [ ] LRU eviction working correctly
- [ ] No memory leaks
- [ ] Stable memory footprint

### ✅ Observability
- [ ] All counters accurate
- [ ] Periodic logging working
- [ ] Latency tracking accurate
- [ ] Stats accessible via API

## Monitoring in Production

### Key Metrics to Track

1. **Hit Rate** (target: >30%)
   - `stats.hitRate`
   - Should increase over time as cache warms up

2. **Cache Size** (target: <maxSize)
   - `stats.currentSize`
   - Should stay within bounds

3. **Eviction Rate** (target: low)
   - `stats.evictions`
   - High evictions may indicate cache too small

4. **TTL Expiration Rate** (target: low)
   - `stats.ttlExpired`
   - High expiration may indicate TTL too short

5. **Latency Difference** (target: >20% reduction)
   - `stats.avgLatencyHit` vs `stats.avgLatencyMiss`
   - Should show clear performance benefit

### Alerts to Configure

1. **Low Hit Rate** (<10%)
   - May indicate cache key issues or high variability

2. **High Eviction Rate**
   - May indicate cache size too small

3. **Cache Size Near Capacity** (>90%)
   - May need to increase maxSize

4. **High TTL Expiration Rate**
   - May need to increase TTL

## Troubleshooting

### Low Hit Rate

**Possible Causes**:
- High schema variability
- High intent variability
- TTL too short
- Cache size too small

**Solutions**:
- Increase TTL if schemas are stable
- Increase cache size if many unique keys
- Review cache key components

### High Memory Usage

**Possible Causes**:
- Cache size too large
- Large payloads in cache
- Memory leak

**Solutions**:
- Reduce maxSize
- Monitor cache size
- Check for memory leaks

### Stale Data

**Possible Causes**:
- Schema hash collision (unlikely)
- Intent hash collision (unlikely)
- TTL too long

**Solutions**:
- Verify cache key uniqueness
- Reduce TTL if needed
- Check schema hash calculation

## Next Steps After Validation

### If Validation PASSES ✅

1. **Deploy to Production**
   - Monitor hit rates
   - Track latency improvements
   - Watch for any issues

2. **Optimize Configuration**
   - Tune maxSize based on traffic
   - Tune TTL based on data freshness needs

3. **Consider L2 Redis** (Only if needed)
   - Only if horizontal scaling required
   - Only if cache duplication becomes expensive
   - Only after L1 behavior understood

### If Validation FAILS ⚠️

1. **Review Metrics**
   - Identify which criteria failed
   - Check logs for patterns

2. **Investigate Root Cause**
   - Cache key issues?
   - TTL/eviction problems?
   - Memory issues?

3. **Fix and Re-validate**
   - Address issues
   - Re-run validation
   - Verify fixes

---

**Status**: ⏳ Ready for Production Validation

**Next Action**: Run validation tests with real workflows and monitor metrics
