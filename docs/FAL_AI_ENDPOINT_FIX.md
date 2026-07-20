# Fal.ai Endpoint Fix

## Issue
Getting error: `{"detail": "Application 'veo-3' not found"}`

## Root Cause
The endpoint was using `fal-ai/veo-3` (with dash) but the correct endpoint is `fal-ai/veo3` (without dash).

## Fix Applied

### Correct Endpoints:
- **Generate**: `https://fal.run/fal-ai/veo3` ✅
- **Status**: `https://queue.fal.run/fal-ai/veo3/{jobId}` ✅

### Wrong Endpoints (Fixed):
- ❌ `https://fal.run/fal-ai/veo-3` (with dash - causes 404)
- ❌ `https://fal.run/fal-ai/veo-3/{jobId}` (with dash - causes 404)

## Updated Configuration

Make sure your node has:
1. **Use Fal.run**: `true` (enabled)
2. **API Key**: Your Fal.ai API key (from https://fal.ai)
3. **Endpoint**: Automatically uses `https://fal.run/fal-ai/veo3`

## Testing

After the fix, test with:
- Simple prompt: "A cat playing with a ball"
- Duration: 10 seconds
- Should work without 404 errors

---

**Status**: Fixed ✅
**Date**: 2025-02-15
