# LinkedIn Products Clarification

## Available Products in LinkedIn Developer Portal

When you create a LinkedIn app, you'll see these products available:

### ✅ Products You Need (Default Tier - No Approval Required)

1. **Sign In with LinkedIn using OpenID Connect** (Default Tier)
   - Used for: OAuth authentication
   - Status: Already added by default
   - Required: Yes

2. **Share on LinkedIn** (Default Tier)
   - Used for: Posting content on LinkedIn
   - Status: Already added by default
   - Required: Yes (for posting functionality)

### 📋 Other Available Products (Optional)

- **LinkedIn Ad Library** (Default Tier) - For ad data access
- **Advertising API** (Development Tier) - Requires approval
- **Lead Sync API** (Standard Tier) - Requires approval
- **Community Management API** (Development Tier) - Requires approval
- And others...

## Important Notes

### Product vs Scopes

- **Products** determine which APIs you can access
- **Scopes** are the actual permissions requested during OAuth
- You don't need to "request access" to default tier products - they're available immediately

### Required Scopes

The scopes are requested during the OAuth flow (in your code), not through product selection:

```
openid profile email w_member_social
```

These scopes are:
- `openid` - OIDC sign-in (provided by "Sign In with LinkedIn using OpenID Connect")
- `profile` - Basic profile (provided by "Sign In with LinkedIn using OpenID Connect")
- `email` - Read email address (provided by "Sign In with LinkedIn using OpenID Connect")
- `w_member_social` - Write posts (provided by "Share on LinkedIn")

### Setup Steps

1. ✅ Create your LinkedIn app
2. ✅ Configure OAuth redirect URLs
3. ✅ **No need to request products** - "Sign In with LinkedIn" and "Share on LinkedIn" are already available
4. ✅ Copy Client ID and Client Secret
5. ✅ Configure Supabase with these credentials
6. ✅ The scopes will be requested automatically when users connect

## Common Confusion

**Myth:** "I need to request access to Marketing Developer Platform"

**Reality:** 
- "Marketing Developer Platform" is not a product name in the current LinkedIn Developer Portal
- You need "Share on LinkedIn" (which is available by default)
- The scopes (`w_member_social`) are what actually enable posting

## Verification

To verify your setup is correct:

1. Check that "Sign In with LinkedIn using OpenID Connect" is in your products list ✅
2. Check that "Share on LinkedIn" is in your products list ✅
3. Copy your Client ID and Client Secret
4. Configure Supabase OAuth provider
5. Test the connection - the OAuth flow will request the necessary scopes automatically

## Troubleshooting

**Issue:** "I don't see Share on LinkedIn in my products"

**Solution:** 
- It should be available by default
- If not visible, try refreshing the page
- Make sure you're looking at the "Products" section in the "Auth" tab
- The product might be called "Share on LinkedIn" or similar

**Issue:** "Users can't post after connecting"

**Solution:**
- Verify that `w_member_social` scope is being requested in your OAuth call
- Check that "Share on LinkedIn" product is available
- Ensure users grant all requested permissions during authorization

---

**Bottom Line:** You don't need to request any products - the default tier products ("Sign In with LinkedIn" and "Share on LinkedIn") are sufficient for the integration to work.
