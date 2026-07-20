# GitHub Node UI Update - OAuth Integration

## Summary

Updated the GitHub node UI to remove manual token entry and rely on OAuth authentication automatically.

## Changes Made

### 1. Frontend (`ctrl_checks/src/components/workflow/nodeTypes.ts`)

**Removed:**
- `token` field from `configFields`
- `token: ''` from `defaultConfig`
- Manual token entry instructions

**Updated:**
- Added OAuth connection notice in `operation` field `helpText`
- Updated help text to guide users to Settings → Connections

### 2. Documentation (`ctrl_checks/src/components/workflow/nodeGuides.ts`)

**Removed:**
- `token` guide with manual token generation steps

**Added:**
- `_github_connection_info` guide explaining OAuth flow
- Instructions for connecting GitHub via Settings → Connections

### 3. Backend (Already Correct)

The backend already handles OAuth tokens correctly:
- Uses `getProviderToken()` to retrieve token from `social_tokens` table
- No token field required in node config
- Returns clear error if GitHub not connected: "No github token found. Please connect your github account in settings."

## How It Works Now

1. **User connects GitHub:**
   - Goes to Settings → Connections
   - Clicks "Connect GitHub"
   - Authorizes CtrlChecks via GitHub OAuth
   - Token is stored securely in `social_tokens` table

2. **User creates GitHub node:**
   - No token field shown
   - Only operation and operation-specific fields
   - Help text explains OAuth connection

3. **Workflow execution:**
   - Backend automatically retrieves token from `social_tokens`
   - Uses token for GitHub API calls
   - If not connected, returns clear error message

## Migration Notes

- **Old workflows:** If a workflow has `token` in config, it will be ignored (backend uses OAuth token)
- **No breaking changes:** Existing workflows continue to work
- **Better UX:** Users no longer need to manually copy/paste tokens

## User Experience

**Before:**
- User had to generate GitHub Personal Access Token
- Copy token from GitHub
- Paste into workflow node
- Risk of token exposure

**After:**
- User clicks "Connect GitHub" in Settings
- One-time OAuth authorization
- Token automatically used in all GitHub nodes
- More secure and user-friendly

## Testing

To test the changes:

1. **Remove GitHub connection** (if connected):
   - Settings → Connections → Disconnect GitHub

2. **Create a GitHub node:**
   - Verify no token field appears
   - Check help text mentions OAuth connection

3. **Try to run workflow:**
   - Should get error: "No github token found. Please connect your github account in settings."

4. **Connect GitHub:**
   - Settings → Connections → Connect GitHub
   - Complete OAuth flow

5. **Run workflow again:**
   - Should work without any token field

## Files Modified

- `ctrl_checks/src/components/workflow/nodeTypes.ts`
- `ctrl_checks/src/components/workflow/nodeGuides.ts`

## Files Not Modified (Already Correct)

- `worker/src/services/social/social-dispatcher.ts` ✅
- `worker/src/api/execute-workflow.ts` ✅
- `worker/src/shared/social-token-manager.ts` ✅
