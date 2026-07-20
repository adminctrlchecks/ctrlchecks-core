# Design Document: Facebook OAuth Integration

## Overview

This design adds Facebook OAuth as a first-class login option alongside the existing Google and GitHub OAuth providers. The implementation mirrors the GitHub auth pattern exactly: a "Continue with Facebook" button on the sign-in and sign-up pages initiates an identity-only OAuth flow via Supabase's built-in Facebook provider (`supabase.auth.signInWithOAuth` with `provider: "facebook"`), and the post-login redirect goes directly to `/dashboard`, bypassing any callback component entirely.

The key distinction from any future Facebook connector flow (which might save tokens to `social_tokens` for API access) is that the **login flow** requests no custom scopes and stores no tokens — it only establishes a Supabase session. Supabase handles user creation, account linking, and PKCE automatically.

### Key Design Decisions

- **No new OAuth client or Supabase project changes beyond provider enablement**: The login flow uses `supabase.auth.signInWithOAuth`. The login flow is distinguished by its `redirectTo` pointing to `/dashboard` and the absence of any `scopes` option.
- **No FacebookAuthCallback component needed**: The login flow uses `redirectTo: /dashboard`, so Supabase redirects directly to the dashboard after session creation. No callback component is invoked during login.
- **`signInWithFacebook()` added to `AuthContext`**: Parallel to `signInWithGoogle()` and `signInWithGitHub()`, keeping the auth interface symmetric across all three providers.
- **Multi-provider support is Supabase-native**: Account linking for users with Google, GitHub, and Facebook identities is handled automatically by Supabase when the same verified email is used.

---

## Architecture

```mermaid
flowchart TD
    A[User clicks "Continue with Facebook"] --> B[signInWithFacebook\nAuthProvider.tsx]
    B --> C[supabase.auth.signInWithOAuth\nprovider: facebook\nno scopes option\nredirectTo: /dashboard]
    C --> D[Facebook Authorization Page\nIdentity only - default scopes]
    D --> E[Supabase session created\nno provider_token stored]
    E --> F[Redirect → /dashboard]
```

The login flow uses Supabase's built-in Facebook provider. It is differentiated from any future connector flow by:
- **Login**: no `scopes` option, `redirectTo: /dashboard` — Supabase redirects directly to dashboard after session creation, bypassing any callback component entirely.
- **Future connector** (if needed): would use `scopes`, `redirectTo: /auth/facebook/callback` — a callback component would save the `provider_token` to `social_tokens` via the backend API.

---

## Components and Interfaces

### AuthProvider.tsx — `signInWithFacebook()`

New method added alongside `signInWithGoogle()` and `signInWithGitHub()`. No scopes, no queryParams — Supabase defaults to Facebook's identity scopes (`email`, `public_profile`).

```typescript
const signInWithFacebook = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        // No scopes — Supabase defaults to email, public_profile
      },
    });

    if (error) {
      console.error('Facebook OAuth error:', error);
      return { error: error as Error };
    }

    return { error: null };
  } catch (err) {
    console.error('Facebook sign-in exception:', err);
    return { error: err as Error };
  }
};
```

### auth-context.tsx — `AuthContextType`

Add `signInWithFacebook` to the interface, parallel to `signInWithGoogle` and `signInWithGitHub`:

```typescript
export interface AuthContextType {
    // ... existing fields ...
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signInWithGitHub: () => Promise<{ error: Error | null }>;
    signInWithFacebook: () => Promise<{ error: Error | null }>;  // NEW
    signOut: () => Promise<void>;
}
```

### SignIn.tsx — Facebook button

Add a "Continue with Facebook" button immediately below the existing GitHub button, using the same `Button variant="outline"` pattern and identical sizing. The Facebook "f" SVG replaces the GitHub Octocat.

```tsx
<Button
  variant="outline"
  className="w-full"
  onClick={handleFacebookSignIn}
  disabled={facebookLoading || loading}
  aria-label="Sign in with Facebook"
>
  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
  {facebookLoading ? "Connecting..." : "Continue with Facebook"}
</Button>
```

The `handleFacebookSignIn` handler mirrors `handleGitHubSignIn` exactly — calls `signInWithFacebook()`, shows an error toast on failure, and leaves the loading state active on success (since the page will redirect).

### SignUp.tsx — Facebook button

Same addition as `SignIn.tsx`. New users signing up via Facebook are handled identically to sign-in — Supabase creates the account on first use.

### No FacebookAuthCallback component

The login flow uses `redirectTo: /dashboard`, so no callback component is invoked. This is the same pattern as Google and GitHub login flows. If a future Facebook connector flow is added, a `FacebookAuthCallback` component would be created at that time.

---

## Data Models

### `auth.users` (Supabase-managed, no changes)

Supabase automatically creates or updates a user record on successful Facebook OAuth. The `user.id` (UUID) is stable across sessions and providers.

### `auth.identities` (Supabase-managed, no changes)

Supabase stores a row per provider per user. A user with Google, GitHub, and Facebook linked will have three rows: `provider='google'`, `provider='github'`, and `provider='facebook'`. Account linking (same email across providers) is handled natively by Supabase.

### `social_tokens` (existing, connector flow only — no changes for login)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK to auth.users |
| `provider` | text | `'facebook'` (connector flow only) |
| `access_token` | text | Facebook provider_token (connector flow only) |
| `refresh_token` | text | Facebook provider_refresh_token |
| `expires_at` | timestamptz | Token expiry |
| `scope` | text | Facebook scopes (connector flow only) |
| `provider_user_id` | text | Facebook user ID |

The login flow does **not** write to this table. Only a future connector flow (via a `FacebookAuthCallback` → backend `/api/social-tokens`) would write here.

### Session state (no changes)

The Supabase session (`auth.users`, JWT) is created normally after Facebook login. The `user.id` is stable regardless of which provider was used to sign in.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Login button always rendered

*For any* user authentication state (unauthenticated, authenticated with Google, authenticated with GitHub, authenticated with Facebook, or null session), the Sign-In page SHALL render a button with `aria-label="Sign in with Facebook"`.

**Validates: Requirements 1.4, 1.3**

### Property 2: Login flow options invariant

*For any* invocation of `signInWithFacebook()`, the options passed to `supabase.auth.signInWithOAuth` SHALL contain a `redirectTo` ending with `/dashboard` AND SHALL NOT contain a `scopes` field, `queryParams.scope` field, or any Facebook API scope strings.

**Validates: Requirements 2.1, 2.2, 8.2**

### Property 3: Login flow never stores connector tokens

*For any* Facebook OAuth login where the redirect URL points to `/dashboard` (no connector-specific path), the system SHALL NOT upsert any row into `social_tokens` or any other token storage table.

**Validates: Requirements 3.3**

### Property 4: Error messages do not expose raw tokens

*For any* error condition during the Facebook OAuth login flow, the user-facing error message displayed in the toast SHALL NOT contain the raw `provider_token`, `access_token`, `refresh_token`, or any OAuth authorization code string.

**Validates: Requirements 7.5, 8.4**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `signInWithOAuth` returns error during login | Return `{ error }` from `signInWithFacebook()`, caller shows error toast, user stays on sign-in page |
| User closes Facebook authorization page (cancellation) | Facebook returns no code; Supabase session is not created; user is returned to sign-in page with no error toast |
| Facebook returns `access_denied` | Callback URL contains `error=access_denied`; display "Authorization declined" message; redirect to sign-in after 3s |
| Network error during OAuth initiation | `signInWithOAuth` throws; catch block returns error; toast shown with retry option |
| Supabase session not established after callback | `getSession()` returns null; display error message; redirect to sign-in after 3s |
| Email conflict (account already exists with different provider) | Supabase returns error; `signInWithFacebook()` propagates it; toast shown with descriptive message (no raw error codes) |

---

## Testing Strategy

### Unit tests (example-based)

- `signInWithFacebook()` with mocked `supabase.auth.signInWithOAuth` — verify `provider: "facebook"` is set and no `scopes` option is present
- `SignIn.tsx` render — verify Facebook button is present with correct `aria-label`
- `handleFacebookSignIn()` with `signInWithOAuth` returning an error — verify error toast is shown and loading state is reset
- `handleFacebookSignIn()` with `signInWithOAuth` succeeding — verify loading state remains active (redirect pending)

### Property-based tests

Uses [fast-check](https://github.com/dubzzz/fast-check) (TypeScript). Each property test runs a minimum of 100 iterations.

**Feature: facebook-oauth-integration, Property 1: Login button always rendered**
Generate arbitrary user auth states (null, partial session objects, full session objects with varying providers including google, github, facebook, and multi-provider combinations), render `SignIn.tsx`, assert a button with `aria-label="Sign in with Facebook"` is always present in the output.

**Feature: facebook-oauth-integration, Property 2: Login flow options invariant**
Generate arbitrary `window.location.origin` values (different hostnames, ports, protocols) and arbitrary call contexts for `signInWithFacebook()`, capture the options object passed to the mocked `supabase.auth.signInWithOAuth`, assert the `redirectTo` always ends with `/dashboard` AND no `scopes`, `queryParams.scope`, or Facebook API scope strings appear in any field.

**Feature: facebook-oauth-integration, Property 3: Login flow never stores connector tokens**
Generate arbitrary valid Supabase sessions with random `user_id` and `provider_token` values, simulate the login flow completing (redirectTo was `/dashboard`, no connector path), assert no call is made to `supabase.from('social_tokens').upsert` or the backend `/api/social-tokens` endpoint.

**Feature: facebook-oauth-integration, Property 4: Error messages do not expose raw tokens**
Generate arbitrary error objects and session objects containing random `provider_token` strings, trigger error conditions in `signInWithFacebook()`, assert the `provider_token` value does not appear in any toast message content or `console.error` call arguments.

### Integration tests

- Full login flow: verify Supabase session is created after Facebook OAuth, `social_tokens` is NOT populated, user is redirected to `/dashboard`
- Multi-provider: sign in with Google first, then sign in with Facebook using same email — verify same `user.id` is returned and both identities exist in `auth.identities`
- Three-provider: verify a user can have Google, GitHub, and Facebook all linked to one account with the same stable `user.id`
