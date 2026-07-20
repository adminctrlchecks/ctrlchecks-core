# Design Document: Google Auth Separation

## Overview

This design separates Google OAuth into two distinct flows: a lightweight identity-only login and a separate on-demand connector authorization. The root cause is that `AuthProvider.tsx` currently passes a 12-scope list during login, forcing users through a broad consent screen before they've even entered the app.

The fix is purely in application code — no new Google client ID or Supabase project changes are needed. Supabase's built-in Google OAuth provider (`supabase.auth.signInWithOAuth`) is used for both flows, differentiated by scope list and a `mode=connector` query parameter on the redirect URL.

### Key Design Decisions

- **No new OAuth client**: Supabase holds the Google credentials. Both flows use `supabase.auth.signInWithOAuth`. The connector flow is distinguished by its redirect URL containing `?mode=connector`.
- **Callback page as the branch point**: `Callback.tsx` reads `mode` from the URL search params to decide whether to save tokens (connector) or just redirect to dashboard (login).
- **Scope stored in DB reflects actual granted scopes**: The `scope` column in `google_oauth_tokens` is set to only the integration scopes, never identity scopes.

---

## Architecture

```mermaid
flowchart TD
    A[User clicks "Sign in with Google"] --> B[signInWithGoogle\nAuthProvider.tsx]
    B --> C[supabase.auth.signInWithOAuth\nscopes: openid profile email\nredirectTo: /dashboard]
    C --> D[Google Consent\nIdentity only]
    D --> E[Supabase session created\nno provider_token saved]
    E --> F[Redirect → /dashboard]

    G[User clicks "Connect Google"\nConnectionsPanel / GoogleConnectionStatus] --> H[handleGoogleConnect]
    H --> I[supabase.auth.signInWithOAuth\nscopes: integration scopes only\nredirectTo: /auth/google/callback?mode=connector]
    I --> J[Google Consent\nIntegration scopes]
    J --> K[Callback.tsx\nmode=connector detected]
    K --> L[Upsert provider_token\ninto google_oauth_tokens]
    L --> M[Redirect → /workflows or returnTo]
```

---

## Components and Interfaces

### AuthProvider.tsx — `signInWithGoogle()`

Stripped to identity-only scopes. Remove `queryParams` entirely so Supabase defaults to `openid profile email`.

```typescript
const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
      // No queryParams — Supabase defaults to openid profile email
    },
  });
  if (error) return { error: error as Error };
  return { error: null };
};
```

### ConnectionsPanel.tsx — `handleGoogleConnect()`

Changed to use integration scopes and `mode=connector` redirect:

```typescript
const handleGoogleConnect = async () => {
  const redirectUrl = `${window.location.origin}/auth/google/callback?mode=connector`;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
        scope: INTEGRATION_SCOPES,
      },
    },
  });
};
```

### GoogleConnectionStatus.tsx — `handleGoogleAuth()`

Same change as `ConnectionsPanel.tsx` — use integration scopes and `mode=connector` redirect.

### Callback.tsx — mode-aware processing

Reads `mode` from URL params. Only upserts into `google_oauth_tokens` when `mode === 'connector'`. For login callbacks (no mode param), redirects straight to dashboard.

```typescript
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const isConnectorMode = mode === 'connector';

if (!isConnectorMode) {
  // Login callback — just redirect, don't save tokens
  navigate('/dashboard');
  return;
}
// Connector mode — save provider_token to google_oauth_tokens
```

### Shared constant — `INTEGRATION_SCOPES`

Extract the integration scope string into a shared constant to avoid drift between `ConnectionsPanel.tsx` and `GoogleConnectionStatus.tsx`:

```typescript
// src/lib/google-scopes.ts
export const INTEGRATION_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/bigquery',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/contacts',
].join(' ');
```

---

## Data Models

### `google_oauth_tokens` table (existing, no schema changes)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK to auth.users, unique |
| `access_token` | text | Google provider_token |
| `refresh_token` | text | Google provider_refresh_token |
| `expires_at` | timestamptz | ~1 hour from grant |
| `token_type` | text | 'Bearer' |
| `scope` | text | Integration scopes only (not identity scopes) |
| `updated_at` | timestamptz | Last upsert time |

The `scope` field written by the callback will be set to `INTEGRATION_SCOPES` (not including `email profile`), reflecting what was actually granted.

### Session state (no changes)

The Supabase session (`auth.users`, JWT) is unchanged. The login flow produces a normal Supabase session. The connector flow re-authenticates via Supabase OAuth but the existing session is refreshed/replaced by Supabase — the `user.id` remains stable.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Login flow never requests integration scopes

*For any* invocation of `signInWithGoogle()`, the options passed to `supabase.auth.signInWithOAuth` SHALL NOT contain any integration scope strings (gmail, drive, calendar, sheets, bigquery, tasks, contacts, documents).

**Validates: Requirements 1.1, 1.3, 6.1, 6.3**

### Property 2: Login callback never stores connector tokens

*For any* OAuth callback where the redirect URL does NOT contain `mode=connector`, the callback handler SHALL NOT upsert any row into `google_oauth_tokens`.

**Validates: Requirements 1.4**

### Property 3: Connector callback stores tokens for correct user

*For any* connector-mode callback (`mode=connector`) with a valid Supabase session containing a `provider_token`, the callback handler SHALL upsert a row into `google_oauth_tokens` with the correct `user_id` and the `provider_token` as `access_token`.

**Validates: Requirements 2.3**

### Property 4: Connector flow uses only integration scopes

*For any* invocation of the connector connect handler (`handleGoogleConnect`), the OAuth options SHALL contain only integration scopes and the `redirectTo` SHALL include `mode=connector`. The scope list SHALL NOT contain identity-only scope strings (`openid`, `profile`, `email` as standalone scopes).

**Validates: Requirements 2.1, 7.2**

### Property 5: Token validity determines connection status

*For any* user, `checkAuthStatus()` SHALL return `isAuthenticated=true` if and only if a non-expired row exists in `google_oauth_tokens` for that `user_id`.

**Validates: Requirements 3.2, 3.3**

### Property 6: Disconnect removes token from store

*For any* user with a connected Google integration, calling disconnect SHALL result in no row existing in `google_oauth_tokens` for that `user_id`.

**Validates: Requirements 3.5, 4.5**

### Property 7: Missing token returns authorization error

*For any* call to `requireGoogleAuth()` where no valid (non-expired) row exists in `google_oauth_tokens` for the requesting user, the function SHALL throw an authorization error with `ErrorCode.GOOGLE_AUTH_REQUIRED`.

**Validates: Requirements 7.5**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `signInWithOAuth` returns error during login | Return `{ error }` from `signInWithGoogle()`, caller displays error toast |
| `signInWithOAuth` returns error during connector flow | Show error toast, reset `isConnecting` state, leave connector disconnected |
| Callback receives no `provider_token` in connector mode | Show error toast, redirect to `/workflows` after 3s |
| DB upsert fails in callback | Show error toast, redirect to `/workflows` after 3s |
| Token expired, no refresh token | `checkAuthStatus` returns `isAuthenticated=false`, UI shows reconnect prompt |
| `requireGoogleAuth` called without valid token | Throw `GOOGLE_AUTH_REQUIRED` error, caller returns 401 with reconnect hint |

---

## Testing Strategy

### Unit tests (example-based)

- `signInWithGoogle()` with mocked `supabase.auth.signInWithOAuth` — verify no `queryParams.scope` is set
- `handleGoogleConnect()` — verify `redirectTo` contains `mode=connector` and scope matches `INTEGRATION_SCOPES`
- `Callback.tsx` with `mode=connector` — verify `supabase.from('google_oauth_tokens').upsert` is called
- `Callback.tsx` without `mode` param — verify no DB call is made, redirects to `/dashboard`
- `handleDisconnect()` — verify delete is called on `google_oauth_tokens`
- `requireGoogleAuth()` with no token row — verify `GOOGLE_AUTH_REQUIRED` error is thrown
- Error path: `signInWithOAuth` returns error — verify error is propagated

### Property-based tests

Uses [fast-check](https://github.com/dubzzz/fast-check) (TypeScript). Each property test runs a minimum of 100 iterations.

**Feature: google-auth-separation, Property 1: Login flow never requests integration scopes**
Generate arbitrary call contexts for `signInWithGoogle()`, capture the options object, assert no integration scope string appears in any field.

**Feature: google-auth-separation, Property 2: Login callback never stores connector tokens**
Generate arbitrary URL search params without `mode=connector`, run callback logic, assert no upsert is called on `google_oauth_tokens`.

**Feature: google-auth-separation, Property 3: Connector callback stores tokens for correct user**
Generate arbitrary valid sessions with random `user_id` and `provider_token`, run callback with `mode=connector`, assert upsert is called with matching `user_id` and `access_token`.

**Feature: google-auth-separation, Property 4: Connector flow uses only integration scopes**
Generate arbitrary user states, call `handleGoogleConnect()`, assert scope string matches `INTEGRATION_SCOPES` exactly and `redirectTo` contains `mode=connector`.

**Feature: google-auth-separation, Property 5: Token validity determines connection status**
Generate arbitrary token rows with random `expires_at` values (past and future), call `checkAuthStatus()`, assert return value matches whether `expires_at > now`.

**Feature: google-auth-separation, Property 6: Disconnect removes token from store**
Generate arbitrary connected states, call disconnect, assert `google_oauth_tokens` has no row for that `user_id`.

**Feature: google-auth-separation, Property 7: Missing token returns authorization error**
Generate arbitrary requests with valid JWT but no matching `google_oauth_tokens` row, call `requireGoogleAuth()`, assert `GOOGLE_AUTH_REQUIRED` error is thrown.

### Integration tests

- Full login flow: verify Supabase session is created, `google_oauth_tokens` is NOT populated
- Full connector flow: verify `google_oauth_tokens` IS populated after `mode=connector` callback
- Existing token compatibility: pre-insert a token row, verify `requireGoogleAuth()` succeeds without re-auth
