# Design Document: GitHub OAuth Integration

## Overview

This design adds GitHub OAuth as a first-class login option alongside the existing Google OAuth. The implementation mirrors the Google auth pattern exactly: a "Continue with GitHub" button on the sign-in page initiates an identity-only OAuth flow via Supabase's built-in GitHub provider (`supabase.auth.signInWithOAuth` with `provider: "github"`), and the existing `GitHubAuthCallback` component at `/auth/github/callback` handles the post-login redirect.

The key distinction from the existing GitHub connector flow (which saves tokens to `social_tokens` for API access) is that the **login flow** requests no custom scopes and stores no tokens — it only establishes a Supabase session. Supabase handles user creation, account linking, and PKCE automatically.

### Key Design Decisions

- **No new OAuth client or Supabase project changes**: Both the login flow and any future connector flow use `supabase.auth.signInWithOAuth`. The login flow is distinguished by its `redirectTo` pointing to `/dashboard` (no `mode` param) and the absence of any `scopes` option.
- **Login callback is already registered**: `/auth/github/callback` exists and is routed in `App.tsx`. The current `GitHubAuthCallback` component saves connector tokens. The login flow will bypass token storage by detecting the absence of a `mode=login` or connector-specific param — mirroring the Google callback's `mode=connector` pattern.
- **`signInWithGitHub()` added to `AuthContext`**: Parallel to `signInWithGoogle()`, keeping the auth interface symmetric.
- **Multi-provider support is Supabase-native**: Account linking for users with both Google and GitHub identities is handled automatically by Supabase when the same verified email is used.

---

## Architecture

```mermaid
flowchart TD
    A[User clicks "Continue with GitHub"] --> B[signInWithGitHub\nAuthProvider.tsx]
    B --> C[supabase.auth.signInWithOAuth\nprovider: github\nno scopes option\nredirectTo: /dashboard]
    C --> D[GitHub Authorization Page\nIdentity only - default scopes]
    D --> E[Supabase session created\nno provider_token stored]
    E --> F[Redirect → /dashboard]

    G[User clicks Connect GitHub\nConnectionsPanel / GitHubConnectionStatus] --> H[handleGithubConnect]
    H --> I[supabase.auth.signInWithOAuth\nprovider: github\nscopes: repo user read:org\nredirectTo: /auth/github/callback]
    I --> J[GitHub Authorization Page\nConnector scopes]
    J --> K[GitHubAuthCallback.tsx\nprocessSession saves to social_tokens via backend]
    K --> L[Redirect → /workflows or returnTo]
```

The login flow and connector flow share the same Supabase GitHub provider. They are differentiated by:
- **Login**: no `scopes` option, `redirectTo: /dashboard` — Supabase redirects directly to dashboard after session creation, bypassing the callback component entirely.
- **Connector**: `scopes: 'repo user read:org'`, `redirectTo: /auth/github/callback` — the callback component saves the `provider_token` to `social_tokens` via the backend API.

---

## Components and Interfaces

### AuthProvider.tsx — `signInWithGitHub()`

New method added alongside `signInWithGoogle()`. No scopes, no queryParams — Supabase defaults to GitHub's identity scopes (`read:user`, `user:email`).

```typescript
const signInWithGitHub = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        // No scopes — Supabase defaults to read:user, user:email
      },
    });

    if (error) {
      console.error('GitHub OAuth error:', error);
      return { error: error as Error };
    }

    return { error: null };
  } catch (err) {
    console.error('GitHub sign-in exception:', err);
    return { error: err as Error };
  }
};
```

### auth-context.tsx — `AuthContextType`

Add `signInWithGitHub` to the interface, parallel to `signInWithGoogle`:

```typescript
export interface AuthContextType {
    // ... existing fields ...
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signInWithGitHub: () => Promise<{ error: Error | null }>;  // NEW
    signOut: () => Promise<void>;
}
```

### SignIn.tsx — GitHub button

Add a "Continue with GitHub" button immediately below the existing Google button, using the same `Button variant="outline"` pattern and identical sizing. The GitHub Octocat SVG replaces the Google logo.

```tsx
<Button
  variant="outline"
  className="w-full"
  onClick={handleGitHubSignIn}
  disabled={githubLoading || loading}
  aria-label="Sign in with GitHub"
>
  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387..." />
  </svg>
  {githubLoading ? "Connecting..." : "Continue with GitHub"}
</Button>
```

The `handleGitHubSignIn` handler mirrors `handleGoogleSignIn` exactly — calls `signInWithGitHub()`, shows an error toast on failure, and leaves the loading state active on success (since the page will redirect).

### SignUp.tsx — GitHub button

Same addition as `SignIn.tsx`. New users signing up via GitHub are handled identically to sign-in — Supabase creates the account on first use.

### GitHubAuthCallback.tsx — login vs connector mode

The existing callback at `/auth/github/callback` currently always saves tokens (connector behavior). For the login flow, `redirectTo` points to `/dashboard` directly, so the callback is **not invoked** during login. No changes to `GitHubAuthCallback.tsx` are needed for the login flow.

This is the same pattern as Google: the Google login flow uses `redirectTo: /dashboard` (bypasses `GoogleAuthCallback`), while the connector flow uses `redirectTo: /auth/google/callback?mode=connector`.

---

## Data Models

### `auth.users` (Supabase-managed, no changes)

Supabase automatically creates or updates a user record on successful GitHub OAuth. The `user.id` (UUID) is stable across sessions and providers.

### `auth.identities` (Supabase-managed, no changes)

Supabase stores a row per provider per user. A user with both Google and GitHub linked will have two rows: one with `provider='google'` and one with `provider='github'`. Account linking (same email across providers) is handled natively by Supabase.

### `social_tokens` (existing, connector flow only — no changes for login)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK to auth.users |
| `provider` | text | `'github'` |
| `access_token` | text | GitHub provider_token (connector flow only) |
| `refresh_token` | text | GitHub provider_refresh_token |
| `expires_at` | timestamptz | Token expiry |
| `scope` | text | `'repo,user,read:org'` (connector flow only) |
| `provider_user_id` | text | GitHub user ID |

The login flow does **not** write to this table. Only the connector flow (via `GitHubAuthCallback` → backend `/api/social-tokens`) writes here.

### Session state (no changes)

The Supabase session (`auth.users`, JWT) is created normally after GitHub login. The `user.id` is stable regardless of which provider was used to sign in.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Login button always rendered

*For any* user authentication state (unauthenticated, authenticated with Google, authenticated with GitHub, or null session), the Sign-In page SHALL render a button with `aria-label="Sign in with GitHub"`.

**Validates: Requirements 1.4, 1.3**

### Property 2: Login flow never requests custom scopes

*For any* invocation of `signInWithGitHub()`, the options passed to `supabase.auth.signInWithOAuth` SHALL NOT contain a `scopes` field, `queryParams.scope` field, or any GitHub API scope strings (`repo`, `read:org`, `write:`, etc.).

**Validates: Requirements 2.2, 8.2**

### Property 3: Login flow redirects to dashboard

*For any* invocation of `signInWithGitHub()`, the `redirectTo` option passed to `supabase.auth.signInWithOAuth` SHALL contain `/dashboard`.

**Validates: Requirements 2.1**

### Property 4: Login callback never stores connector tokens

*For any* GitHub OAuth callback where the redirect URL does NOT contain a connector-specific path (i.e., `redirectTo` was `/dashboard`), the callback handler SHALL NOT upsert any row into `social_tokens` or any other token storage table.

**Validates: Requirements 3.3**

### Property 5: Error messages do not expose raw tokens

*For any* error condition during the GitHub OAuth login flow, the user-facing error message displayed in the toast SHALL NOT contain the raw `provider_token`, `access_token`, `refresh_token`, or any OAuth authorization code string.

**Validates: Requirements 7.5, 8.4**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `signInWithOAuth` returns error during login | Return `{ error }` from `signInWithGitHub()`, caller shows error toast, user stays on sign-in page |
| User closes GitHub authorization page (cancellation) | GitHub returns no code; Supabase session is not created; user is returned to sign-in page with no error toast |
| GitHub returns `access_denied` | Callback URL contains `error=access_denied`; display "Authorization declined" message; redirect to sign-in after 3s |
| Network error during OAuth initiation | `signInWithOAuth` throws; catch block returns error; toast shown with retry option |
| Supabase session not established after callback | `getSession()` returns null; callback shows error message; redirect to sign-in after 3s |
| Email conflict (account already exists with different provider) | Supabase returns error; `signInWithGitHub()` propagates it; toast shown with descriptive message (no raw error codes) |

---

## Testing Strategy

### Unit tests (example-based)

- `signInWithGitHub()` with mocked `supabase.auth.signInWithOAuth` — verify `provider: "github"` is set and no `scopes` option is present
- `SignIn.tsx` render — verify GitHub button is present with correct `aria-label`
- `handleGitHubSignIn()` with `signInWithOAuth` returning an error — verify error toast is shown and loading state is reset
- `handleGitHubSignIn()` with `signInWithOAuth` succeeding — verify loading state remains active (redirect pending)

### Property-based tests

Uses [fast-check](https://github.com/dubzzz/fast-check) (TypeScript). Each property test runs a minimum of 100 iterations.

**Feature: github-oauth-integration, Property 1: Login button always rendered**
Generate arbitrary user auth states (null, partial session objects, full session objects with varying providers), render `SignIn.tsx`, assert a button with `aria-label="Sign in with GitHub"` is always present in the output.

**Feature: github-oauth-integration, Property 2: Login flow never requests custom scopes**
Generate arbitrary call contexts for `signInWithGitHub()`, capture the options object passed to the mocked `supabase.auth.signInWithOAuth`, assert no `scopes`, `queryParams.scope`, or GitHub API scope strings appear in any field.

**Feature: github-oauth-integration, Property 3: Login flow redirects to dashboard**
Generate arbitrary `window.location.origin` values (different hostnames, ports, protocols), call `signInWithGitHub()`, assert the `redirectTo` option always ends with `/dashboard`.

**Feature: github-oauth-integration, Property 4: Login callback never stores connector tokens**
Generate arbitrary valid Supabase sessions with random `user_id` and `provider_token` values, simulate the callback being reached via a `/dashboard` redirect (no connector path), assert no call is made to `supabase.from('social_tokens').upsert` or the backend `/api/social-tokens` endpoint.

**Feature: github-oauth-integration, Property 5: Error messages do not expose raw tokens**
Generate arbitrary error objects and session objects containing random `provider_token` strings, trigger error conditions in `signInWithGitHub()` and the callback handler, assert the `provider_token` value does not appear in any toast message content or `console.error` call arguments.

### Integration tests

- Full login flow: verify Supabase session is created after GitHub OAuth, `social_tokens` is NOT populated, user is redirected to `/dashboard`
- Multi-provider: sign in with Google first, then sign in with GitHub using same email — verify same `user.id` is returned and both identities exist in `auth.identities`
- Connector flow unchanged: verify existing GitHub connector flow (via `ConnectionsPanel`) still saves tokens to `social_tokens` correctly after login flow is added
