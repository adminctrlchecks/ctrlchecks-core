# Implementation Plan: GitHub OAuth Integration

## Overview

Add GitHub OAuth as a first-class login option alongside Google. The change touches three files (`auth-context.tsx`, `SignIn.tsx`, `SignUp.tsx`) and requires no changes to `GitHubAuthCallback.tsx` — the login flow bypasses the callback entirely by redirecting to `/dashboard`.

## Tasks

- [x] 1. Add `signInWithGitHub` to AuthContext
  - [x] 1.1 Update `AuthContextType` interface in `auth-context.tsx`
    - Add `signInWithGitHub: () => Promise<{ error: Error | null }>` alongside `signInWithGoogle`
    - _Requirements: 2.1, 2.4_

  - [x] 1.2 Implement `signInWithGitHub()` in `AuthProvider.tsx`
    - Call `supabase.auth.signInWithOAuth` with `provider: "github"` and `redirectTo: \`${window.location.origin}/dashboard\``
    - Do NOT pass any `scopes` or `queryParams` — Supabase defaults to `read:user`, `user:email`
    - On error, return `{ error }` from the catch block; on success return `{ error: null }`
    - _Requirements: 2.1, 2.2, 2.3, 8.2, 8.3_

  - [ ]* 1.3 Write property test: login flow never requests custom scopes
    - **Property 2: Login flow never requests custom scopes**
    - Mock `supabase.auth.signInWithOAuth`, call `signInWithGitHub()` with arbitrary call contexts (min 100 iterations via fast-check), assert the captured options object contains no `scopes` field, no `queryParams.scope` field, and no GitHub API scope strings (`repo`, `read:org`, `write:`, etc.)
    - **Validates: Requirements 2.2, 8.2**

  - [ ]* 1.4 Write property test: login flow redirects to dashboard
    - **Property 3: Login flow redirects to dashboard**
    - Generate arbitrary `window.location.origin` values (different hostnames, ports, protocols) via fast-check (min 100 iterations), call `signInWithGitHub()`, assert `redirectTo` always ends with `/dashboard`
    - **Validates: Requirements 2.1**

- [x] 2. Add GitHub button to `SignIn.tsx`
  - [x] 2.1 Add `handleGitHubSignIn` handler and GitHub button
    - Import `signInWithGitHub` from `AuthContext`
    - Add `githubLoading` state mirroring the existing `googleLoading` pattern
    - Implement `handleGitHubSignIn`: call `signInWithGitHub()`, show error toast on failure, leave loading active on success (redirect pending)
    - Render a `<Button variant="outline" className="w-full">` immediately below the Google button with the GitHub Octocat SVG, label `"Continue with GitHub"`, `disabled={githubLoading || loading}`, and `aria-label="Sign in with GitHub"`
    - _Requirements: 1.1, 1.2, 1.3, 2.3, 2.4, 7.1, 7.2, 7.3, 7.5_

  - [ ]* 2.2 Write property test: GitHub login button always rendered
    - **Property 1: Login button always rendered**
    - Generate arbitrary user auth states (null, partial session objects, full session objects with varying providers) via fast-check (min 100 iterations), render `SignIn.tsx`, assert a button with `aria-label="Sign in with GitHub"` is always present in the output
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 2.3 Write property test: error messages do not expose raw tokens
    - **Property 5: Error messages do not expose raw tokens**
    - Generate arbitrary error objects and session objects containing random `provider_token` strings via fast-check (min 100 iterations), trigger error conditions in `handleGitHubSignIn()`, assert the `provider_token` value does not appear in any toast message content or `console.error` call arguments
    - **Validates: Requirements 7.5, 8.4**

- [x] 3. Add GitHub button to `SignUp.tsx`
  - [x] 3.1 Add `handleGitHubSignUp` handler and GitHub button
    - Mirror the `SignIn.tsx` changes exactly — same handler pattern, same button markup, same `aria-label`
    - New users signing up via GitHub are handled identically to sign-in (Supabase creates the account on first use)
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2_

- [x] 4. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Verify login callback does not store connector tokens
  - [x] 5.1 Confirm `GitHubAuthCallback.tsx` is not invoked by the login flow
    - Trace the login redirect: `signInWithGitHub()` sets `redirectTo: /dashboard`, so Supabase redirects directly to `/dashboard` after session creation — `GitHubAuthCallback` at `/auth/github/callback` is never reached
    - No code changes needed; document this invariant with a comment in `AuthProvider.tsx` near `signInWithGitHub()`
    - _Requirements: 3.3_

  - [ ]* 5.2 Write property test: login callback never stores connector tokens
    - **Property 4: Login callback never stores connector tokens**
    - Generate arbitrary valid Supabase sessions with random `user_id` and `provider_token` values via fast-check (min 100 iterations), simulate the callback being reached via a `/dashboard` redirect (no connector path), assert no call is made to `supabase.from('social_tokens').upsert` or the backend `/api/social-tokens` endpoint
    - **Validates: Requirements 3.3**

- [ ] 6. Write integration tests
  - [ ]* 6.1 Full login flow integration test
    - Verify Supabase session is created after GitHub OAuth, `social_tokens` is NOT populated, and user is redirected to `/dashboard`
    - _Requirements: 2.1, 3.1, 3.2, 3.3_

  - [ ]* 6.2 Multi-provider account linking integration test
    - Sign in with Google first, then sign in with GitHub using the same email — verify the same `user.id` is returned and both identities exist in `auth.identities`
    - _Requirements: 4.2, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.3 Connector flow regression test
    - Verify the existing GitHub connector flow (via `ConnectionsPanel` / `GitHubConnectionStatus`) still saves tokens to `social_tokens` correctly after the login flow is added
    - _Requirements: 3.3_

- [x] 7. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All property tests use fast-check with a minimum of 100 iterations each
- No changes to `GitHubAuthCallback.tsx` are needed — the login flow bypasses it entirely
- Supabase handles user creation, account linking (same email across providers), and PKCE automatically
- The connector flow (token storage) is unchanged; the login flow is distinguished solely by `redirectTo: /dashboard` and the absence of `scopes`
