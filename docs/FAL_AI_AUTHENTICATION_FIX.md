# Fal.ai Authentication Error Fix

## Error
```
{"detail": "Cannot access application 'fal-ai/veo3'. Authentication is required to access this application."}
```

## Root Cause
The authentication error can occur due to:
1. **API key not properly formatted** - Fal.ai requires the key in a specific format
2. **Account doesn't have access** - Your Fal.ai account may not have access to Veo3 model
3. **API key expired or invalid** - The key might be incorrect or expired

## Solutions

### Solution 1: Verify API Key
1. Go to [Fal.ai Dashboard](https://fal.ai/dashboard)
2. Check your API key is active
3. Copy the key exactly (no extra spaces)
4. Paste it into the node configuration

### Solution 2: Check Model Access
1. Log into [Fal.ai](https://fal.ai)
2. Go to your dashboard
3. Check if you have access to "Veo3" or "fal-ai/veo3" model
4. If not available, you may need to:
   - Request access from Fal.ai
   - Upgrade your account tier
   - Wait for access approval

### Solution 3: Verify Account Status
1. Check your Fal.ai account status
2. Ensure you have credits/quota available
3. Verify billing is set up (if required)

### Solution 4: Use Correct Authentication
The code now supports multiple authentication methods:
- **Header**: `Authorization: Key YOUR_API_KEY`
- **Query Parameter**: `?key=YOUR_API_KEY` (added automatically)

Both methods are tried automatically.

## Updated Implementation

The code has been updated to:
1. ✅ Add API key as query parameter (Fal.ai sometimes prefers this)
2. ✅ Trim whitespace from API key
3. ✅ Provide better error messages
4. ✅ Support both header and query parameter auth

## Testing Steps

1. **Get Fresh API Key**:
   - Go to https://fal.ai/dashboard
   - Generate a new API key if needed
   - Copy it exactly

2. **Configure Node**:
   - API Key: Your Fal.ai API key
   - Use Fal.run: `true` (enabled)
   - Prompt: "A cat playing with a ball"
   - Duration: 10 seconds

3. **Test**:
   - Run the workflow
   - Check for authentication errors
   - If still failing, verify account access

## Common Issues

### "Authentication is required"
- ✅ Check API key is correct
- ✅ Verify account has Veo3 access
- ✅ Ensure "Use Fal.run" is enabled

### "Application not found"
- ✅ Endpoint should be `fal-ai/veo3` (not `veo-3`)
- ✅ Check if model name changed

### "Access denied"
- ✅ Account may need upgrade
- ✅ Request access to Veo3 model
- ✅ Check billing/quota status

## Alternative: Direct Google Veo API

If Fal.ai access is problematic, you can try:
1. Get Google AI Studio API key
2. Disable "Use Fal.run" in node
3. Use Google's direct API (when available)

---

**Status**: Fixed - Multiple authentication methods supported
**Date**: 2025-02-15
