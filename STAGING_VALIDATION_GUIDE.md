# Phase 2 Staging Validation Guide

## Overview

The staging validation script (`worker/scripts/staging-validation-phase2.ts`) validates Phase 2 skip logic with **REAL enriched workflows** and **valid credentials** in a staging-like environment.

## Prerequisites

1. **Valid Credentials**: Ensure Google Sheets and Gmail OAuth tokens are configured
2. **Environment Variables**: Set `TEST_SHEET_ID` if using custom test sheets
3. **Phase 1 Enabled**: Workflows will be automatically enriched with Phase 1 metadata

## Running Staging Validation

```bash
cd worker
npx ts-node scripts/staging-validation-phase2.ts
```

## Metrics Captured

### 1. Activation Rate for Mappings ≥ 0.85
- **Target**: <10-20%
- **What it measures**: How often router activates for high-confidence mappings
- **Expected**: Should be low (<20%) if skip logic is working correctly

### 2. Schema Drift Frequency
- **Target**: <30% of activations
- **What it measures**: How often schema hash mismatches trigger router
- **Expected**: Should be low in successful executions with stable schemas

### 3. Router Latency Distribution
- **Target**: <5ms average, <10ms p95
- **What it measures**: Performance impact of router activation
- **Expected**: ~1-2ms average latency

### 4. No-Metadata Activation Rate
- **Target**: <20% of activations
- **What it measures**: How often router activates due to missing Phase 1 metadata
- **Expected**: Should be low if Phase 1 enrichment is working

## Validation Criteria

✅ **PASS** if:
- High-confidence activation rate < 20%
- Avg router latency < 5ms
- Schema drift rate < 30%
- No-metadata rate < 20%

⚠️ **REVIEW** if any metric exceeds target

## Expected Results in Staging

With valid credentials and successful execution:

1. **Reduced Schema Drift**: Fewer error-shaped outputs → fewer drift detections
2. **High-Confidence Skips**: Most high-confidence mappings skip router
3. **Lower Overall Activation**: Enriched metadata reduces "no-metadata" activations
4. **Stable Latency**: Router operations complete in ~1-2ms

## Interpreting Results

### High-Confidence Activation Rate

- **<10%**: Excellent - Skip logic working perfectly
- **10-20%**: Good - Within target range
- **>20%**: Review needed - May indicate schema drift or metadata issues

### Schema Drift Rate

- **<10%**: Excellent - Stable schemas
- **10-30%**: Acceptable - Some drift expected
- **>30%**: Review needed - Investigate schema stability

### Router Latency

- **<2ms**: Excellent - Negligible impact
- **2-5ms**: Good - Acceptable overhead
- **>5ms**: Review needed - May need optimization

## Next Steps After Validation

### If Validation PASSES ✅

1. **Mark Phase 2 as Production-Verified**
2. **Proceed to Phase 3**: Start with L1 in-memory caching
3. **Monitor Production**: Track metrics in real workflows

### If Validation FAILS ⚠️

1. **Review Metrics**: Identify which criteria failed
2. **Investigate Root Cause**: Check logs for patterns
3. **Fix Issues**: Address schema drift, metadata, or performance issues
4. **Re-run Validation**: Verify fixes before production

## Customizing Test Workflows

Edit `loadTestWorkflows()` in `staging-validation-phase2.ts` to:

- Load workflows from database
- Add more test scenarios
- Use different node types
- Test edge cases

## Production Deployment Checklist

Before deploying Phase 2 to production:

- [ ] Staging validation passes all criteria
- [ ] High-confidence activation rate < 20%
- [ ] Router latency < 5ms average
- [ ] Schema drift rate < 30%
- [ ] No-metadata rate < 20%
- [ ] Monitoring/observability in place
- [ ] Rollback plan prepared

---

**Note**: This validation uses real credentials and executes actual workflows. Ensure you're running in a staging environment, not production.
