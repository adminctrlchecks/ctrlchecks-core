# Social Media Integration System

## Overview

Production-ready social media integration system using Supabase OAuth for GitHub, Facebook, and Twitter (X). This system provides secure token management, encrypted storage, and a clean service layer architecture.

## Architecture

### Phase 1: Codebase Analysis ✅

**Findings:**
- `execute-workflow.ts` is 5445 lines - needs refactoring
- Tokens stored as plain TEXT - security risk
- No unified social tokens table - each provider has its own
- No encryption utilities
- Twitter node exists but incomplete
- No GitHub or Facebook integration
- Inconsistent error handling
- No centralized service layer

### Phase 2: Database Schema ✅

**Unified `social_tokens` Table:**
- Single table for all providers (github, facebook, twitter, linkedin, google)
- Encrypted token storage (access_token, refresh_token)
- Proper RLS policies
- Indexes for performance
- Migration: `ctrl_checks/sql_migrations/21_social_tokens_unified.sql`

### Phase 3: Token Encryption ✅

**Encryption Utilities (`worker/src/core/utils/token-encryption.ts`):**
- AES-256-GCM encryption
- PBKDF2 key derivation
- IV and auth tag for tamper protection
- Environment variable: `ENCRYPTION_KEY` (required in production)

**Key Generation:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Phase 4: Token Management ✅

**Token Manager (`worker/src/shared/social-token-manager.ts`):**
- `getProviderToken()` - Get token with automatic refresh
- `saveProviderToken()` - Save token with encryption
- `refreshProviderToken()` - Refresh expired tokens
- `deleteProviderToken()` - Remove token
- `hasProviderToken()` - Check connection status

### Phase 5: Service Layer ✅

**Services (`worker/src/services/social/`):**
- `githubService.ts` - GitHub API operations
- `facebookService.ts` - Facebook Graph API operations
- `twitterService.ts` - Twitter API v2 operations
- `social-dispatcher.ts` - Centralized routing
- `retry-wrapper.ts` - Exponential backoff retry logic

**Standardized Response Format:**
```typescript
{
  success: boolean;
  provider: 'github' | 'facebook' | 'twitter';
  action: string;
  data: Record<string, any>;
  error: string | null;
}
```

### Phase 6: Node Integration ✅

**Node Execution (`worker/src/api/execute-workflow.ts`):**
- Unified handler for `github`, `facebook`, `twitter` node types
- Template resolution support
- Proper error handling
- Token retrieval from database

**Node Types:**
- `github.post_issue` - Create GitHub issue
- `github.create_repo` - Create repository
- `github.get_user` - Get user info
- `facebook.post` - Post to Facebook
- `facebook.get_user` - Get user info
- `twitter.post` / `twitter.tweet` - Post tweet
- `twitter.get_user` - Get user info

## Setup Instructions

### 1. Database Migration

Run the migration to create the unified `social_tokens` table:

```sql
-- Run: ctrl_checks/sql_migrations/21_social_tokens_unified.sql
```

### 2. Environment Variables

Add to `.env`:

```bash
# Token Encryption (REQUIRED in production)
ENCRYPTION_KEY=your-32-byte-hex-key-here

# GitHub OAuth (if using GitHub)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Facebook OAuth (if using Facebook)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Twitter OAuth (if using Twitter)
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

### 3. Supabase OAuth Configuration

**📖 See detailed guide: [Supabase OAuth Setup Guide](./SUPABASE_OAUTH_SETUP_GUIDE.md)**

Quick steps:
1. Go to Authentication > Providers
2. Enable GitHub, Facebook, Twitter
3. Add redirect URLs:
   - `http://localhost:5173/auth/github/callback` (development)
   - `https://yourdomain.com/auth/github/callback` (production)
   - Similar for Facebook and Twitter

**For complete step-by-step instructions including:**
- Creating OAuth apps on each platform
- Getting API credentials
- Configuring redirect URLs
- Troubleshooting common issues

**👉 See: [SUPABASE_OAUTH_SETUP_GUIDE.md](./SUPABASE_OAUTH_SETUP_GUIDE.md)**

### 4. Frontend OAuth Callbacks

Create callback handlers in `ctrl_checks/src/pages/auth/`:
- `github/Callback.tsx`
- `facebook/Callback.tsx`
- `twitter/Callback.tsx`

These should:
1. Extract `provider_token` from Supabase session
2. Call `/api/social-tokens` endpoint to save token
3. Redirect to workflows page

## API Endpoints

### POST /api/social-tokens

Save OAuth token (with encryption).

**Headers:**
```
Authorization: Bearer <supabase_session_token>
Content-Type: application/json
```

**Body:**
```json
{
  "provider": "github",
  "access_token": "token_from_supabase_session",
  "refresh_token": "refresh_token_if_available",
  "expires_at": "2024-12-31T23:59:59Z",
  "scope": "repo,user",
  "provider_user_id": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "github token saved successfully"
}
```

## Usage Examples

### GitHub Node

```json
{
  "type": "github",
  "config": {
    "operation": "post_issue",
    "owner": "{{input.repo_owner}}",
    "repo": "{{input.repo_name}}",
    "title": "Bug Report",
    "body": "Found a bug in the system"
  }
}
```

### Facebook Node

```json
{
  "type": "facebook",
  "config": {
    "operation": "post",
    "message": "Hello from CtrlChecks!",
    "pageId": "optional_page_id"
  }
}
```

### Twitter Node

```json
{
  "type": "twitter",
  "config": {
    "operation": "post",
    "text": "Hello from CtrlChecks!"
  }
}
```

## Security Features

1. **Token Encryption**: All tokens encrypted with AES-256-GCM before storage
2. **RLS Policies**: Row-level security ensures users can only access their own tokens
3. **Automatic Refresh**: Tokens are automatically refreshed when expired
4. **No Token Exposure**: Tokens never exposed to frontend
5. **Secure Storage**: Encrypted tokens in database

## Error Handling

All services return standardized error responses:

```typescript
{
  success: false,
  provider: 'github',
  action: 'post_issue',
  data: {},
  error: 'Error message here'
}
```

Common errors:
- `Invalid or expired token` - Token needs refresh or re-authentication
- `Missing required fields` - Required parameters not provided
- `API error (401)` - Unauthorized (token invalid)
- `API error (403)` - Forbidden (insufficient permissions)
- `API error (429)` - Rate limited (automatic retry with backoff)

## Retry Logic

All API calls use exponential backoff retry:
- Max retries: 3
- Initial delay: 1 second
- Max delay: 30 seconds
- Backoff multiplier: 2
- Retryable errors: 429, 500, 502, 503, 504

## Rate Limiting

Services handle rate limits automatically:
- Detects 429 responses
- Uses `Retry-After` header if available
- Exponential backoff for retries

## Migration from Old Tables

If you have existing `google_oauth_tokens` or `linkedin_oauth_tokens` tables:

1. Tokens are automatically migrated when users reconnect
2. Old tables can be kept for backward compatibility
3. New tokens are stored in unified `social_tokens` table

## Testing

Test token retrieval:
```typescript
import { getProviderToken } from './shared/social-token-manager';

const token = await getProviderToken(supabase, userId, 'github');
```

Test service:
```typescript
import { postGitHubIssue } from './services/social/githubService';

const result = await postGitHubIssue(token, 'owner', 'repo', 'Title', 'Body');
```

## Production Checklist

- [ ] Set `ENCRYPTION_KEY` environment variable
- [ ] Configure OAuth providers in Supabase
- [ ] Add redirect URLs to OAuth providers
- [ ] Run database migration
- [ ] Test OAuth flow end-to-end
- [ ] Verify token encryption in database
- [ ] Test token refresh
- [ ] Monitor rate limits
- [ ] Set up error alerts

## Troubleshooting

### Token Not Found
- Check user has connected provider in settings
- Verify token exists in `social_tokens` table
- Check RLS policies are correct

### Token Decryption Failed
- Verify `ENCRYPTION_KEY` is set correctly
- Check token format (should be `iv:tag:encrypted`)
- May be old unencrypted token (will use as-is)

### API 401 Error
- Token expired - automatic refresh should handle
- Token invalid - user needs to reconnect
- Check token scopes match required permissions

### API 429 Error
- Rate limited - automatic retry with backoff
- Check rate limit headers
- Consider implementing request queuing for high volume

## Future Enhancements

1. Request queuing for rate limit management
2. Token scope validation
3. Webhook support for token refresh events
4. Multi-account support per provider
5. Token usage analytics
6. Automatic token rotation
