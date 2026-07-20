## LinkedIn Integration (Production)

This document covers the full LinkedIn integration used by CtrlChecks, from OAuth to workflow execution.

### 1. LinkedIn App Setup

- **Create app** in the LinkedIn Developer Portal.
- Configure **OAuth 2.0 redirect URL** to include:
  - `https://<your-frontend-domain>/auth/linkedin/callback`
  - `http://localhost:5173/auth/linkedin/callback` for local development.
- Copy your **Client ID** and **Client Secret**.

### 2. Required Scopes

Request the minimum set of scopes needed for posting and profile lookups:

- `openid` – OIDC sign-in.
- `profile` – basic profile (name/photo).
- `email` – primary email address.
- `w_member_social` – post on behalf of the authenticated member.

The frontend `Connect LinkedIn` button uses Supabase OAuth with:

- Provider: `linkedin_oidc` (recommended; matches Supabase \"LinkedIn (OIDC)\")
- Scopes: `openid profile email w_member_social`

### 3. Environment Variables

Backend (worker):

- `LINKEDIN_CLIENT_ID` – LinkedIn app client ID.
- `LINKEDIN_CLIENT_SECRET` – LinkedIn app client secret.

These are used exclusively on the backend to perform secure token refreshes.

### 4. OAuth Flow

1. User clicks **Connect LinkedIn** in the Connections UI.
2. Frontend calls `supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc', ... })` with the redirect URL.
3. LinkedIn redirects back to `/auth/linkedin/callback`.
4. The `LinkedInAuthCallback` page:
   - Waits for a Supabase `SIGNED_IN`/`TOKEN_REFRESHED` event.
   - Extracts `provider_token` and `provider_refresh_token` from the session.
   - Upserts `linkedin_oauth_tokens` with access token, refresh token, scopes, and expiry.
   - Mirrors a redacted credential into `user_credentials` with `service = 'linkedin'`.
5. The user is redirected back to `/workflows`.

PKCE and `state`/CSRF handling are provided by Supabase's LinkedIn OAuth implementation.

### 5. Token Storage & Security

- Tokens are stored in `public.linkedin_oauth_tokens`:
  - `user_id` (FK → `auth.users(id)`, `ON DELETE CASCADE`)
  - `access_token`, `refresh_token`, `expires_at`, `scope`
  - RLS policies restrict access to the owning user.
- A redacted copy is stored in `user_credentials` as JSON under the `linkedin` service.
- The worker backend uses:
  - `linkedin_oauth_tokens` for actual bearer tokens and refresh.
  - `user_credentials` / vault for credential discovery and capability checks.

Never log raw tokens; logging is limited to status, expiry, and high-level events.

### 6. Token Refresh

Worker uses `getLinkedInAccessToken` to obtain an access token:

1. Looks up `linkedin_oauth_tokens` for the workflow owner/current user.
2. If `expires_at` is within 5 minutes and `refresh_token` exists, calls the LinkedIn OAuth token endpoint:
   - `POST https://www.linkedin.com/oauth/v2/accessToken`
   - `grant_type=refresh_token`
   - `refresh_token=<refresh_token>`
   - `client_id` / `client_secret` from env.
3. On success, it updates `linkedin_oauth_tokens` with the new token and expiry.
4. Falls back to existing token if refresh fails.

The refresh logic is also accessible via `POST /api/connections/linkedin/refresh-now` for manual testing.

### 7. LinkedIn Post Node

Node type: `linkedin`.

- Inputs (config schema):
  - `text` (required) – content to post.
  - `visibility` – `PUBLIC` (default) or `CONNECTIONS`.
  - `personUrn` (required) – member ID (without `urn:li:person:` prefix).
  - `dryRun` – if `true`, validates and returns a simulated request without calling LinkedIn.
  - `richText` / `media` – reserved for future rich content/media support.

Execution (`execute-workflow`):

- Resolves `text` via the expression engine.
- Validates `text` and `personUrn` are present.
- Resolves an access token in order:
  1. `config.accessToken` (if provided).
  2. `linkedin_oauth_tokens` via `getLinkedInAccessToken` (owner/current user).
  3. `process.env.LINKEDIN_ACCESS_TOKEN` (fallback).
- On `dryRun`, returns a `simulatedRequest` object instead of calling LinkedIn.
- Otherwise, POSTs to `https://api.linkedin.com/v2/ugcPosts` with:
  - `Authorization: Bearer <token>`.
  - `X-Restli-Protocol-Version: 2.0.0`.
  - `author: "urn:li:person:<personUrn>"`.
  - `visibility.com.linkedin.ugc.MemberNetworkVisibility`: `PUBLIC` or `CONNECTIONS`.

Error handling:

- Retries on `429` with simple backoff.
- Maps `401`/`403` to explicit authorization errors.
- Returns structured `_error` and `_errorDetails` on failures.

### 8. DX & Debugging

- `GET /api/connections/linkedin/status`
  - Returns `connected`, expiry, and scope metadata for the current user.
- `POST /api/connections/linkedin/test`
  - Verifies the current token by calling LinkedIn `/v2/me`.
- `POST /api/connections/linkedin/refresh-now`
  - Forces refresh using the stored `refresh_token` (if available).

Frontend can surface these via:

- A **LinkedIn connection status** indicator (connected / expires soon).
- A **“Test LinkedIn Connection”** button wired to `/api/connections/linkedin/test`.
- A **“Refresh Now”** admin button wired to `/api/connections/linkedin/refresh-now`.

### 9. Sandbox vs Production

- Use separate LinkedIn apps and credentials for sandbox vs production.
- Configure environment variables per environment.
- Ensure redirect URLs match each environment exactly.

### 10. Troubleshooting

- **401/403 from LinkedIn:**
  - Confirm scopes: `openid`, `profile`, `email`, `w_member_social`.
  - Make sure the member has granted permissions in the LinkedIn consent screen.
- **Posts failing with missing author:**
  - Ensure `personUrn` is set on the LinkedIn node.
- **Expired tokens:**
  - Check `linkedin_oauth_tokens.expires_at`.
  - Use `/api/connections/linkedin/refresh-now` or reconnect via the UI.
- **RLS 406 errors from Supabase:**
  - The `linkedin_oauth_tokens` RLS policy is configured to return empty arrays rather than 406 for missing rows.

