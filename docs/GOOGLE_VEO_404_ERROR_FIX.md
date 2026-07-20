# Fixing Google Veo 404 Error

## Problem
You're getting a **404 Not Found** error when trying to use the Google Veo node, even though you've entered your API key.

## Root Cause
The direct Google Veo API endpoint is **not publicly available** yet. The endpoint we were using doesn't exist, which causes the 404 error.

## Solution: Use Fal.run (Recommended)

Fal.run provides access to Google Veo3 models through their API, which is more reliable and accessible.

### Step 1: Get Fal.run API Key
1. Visit **[https://fal.run](https://fal.run)**
2. Sign up for a free account
3. Go to your dashboard
4. Copy your API key

### Step 2: Update Your Workflow Node
1. Open your Google Veo node configuration
2. **Enable "Use Fal.run"** toggle (set to `true`)
3. Paste your **Fal.run API key** (not Google API key)
4. Keep your prompt and other settings
5. Save and test

### Step 3: Test
Run your workflow again. It should now work with Fal.run.

## Alternative: Wait for Google Veo API
If you want to use Google's direct API:
- Check [Google AI Studio](https://aistudio.google.com/) for updates
- The API may become available in the future
- When available, disable "Use Fal.run" and use your Google API key

## Updated Node Configuration

The node now supports both providers:

```json
{
  "apiKey": "your-fal-run-api-key",
  "useFalRun": true,  // Set to true for Fal.run
  "prompt": "Your video prompt",
  "duration": 60,
  "style": "educational_diagram",
  "resolution": "1080p"
}
```

## Why Fal.run?
- ✅ More reliable and accessible
- ✅ Same Veo3 models
- ✅ Better documentation
- ✅ Easier to get started
- ✅ Free tier available

## Still Getting Errors?

1. **Check API Key Format**
   - Fal.run keys are different from Google keys
   - Make sure you're using the correct key for the provider

2. **Verify "Use Fal.run" is Enabled**
   - The toggle must be set to `true` for Fal.run
   - Set to `false` only if using direct Google API (when available)

3. **Check API Key Permissions**
   - Ensure your Fal.run account is active
   - Check if you have credits/quota available

4. **Test with Simple Prompt**
   - Try a simple prompt first: "A cat playing with a ball"
   - Use shorter duration (5-10 seconds) for testing

## Quick Test

Use this minimal configuration to test:
- **API Key**: Your Fal.run API key
- **Use Fal.run**: `true`
- **Prompt**: "A sunset over the ocean"
- **Duration**: 10 seconds
- **Style**: realistic
- **Resolution**: 1080p

If this works, your setup is correct!

---

**Last Updated**: 2025-02-15
**Status**: Fixed - Use Fal.run for reliable access
