# Implementation Plan: Facebook OAuth Integration

## Overview

Add Facebook OAuth as a first-class login option alongside Google and GitHub. The change touches three files (`auth-context.tsx`, `SignIn.tsx`, `SignUp.tsx`) and requires no new callback component — the login flow bypasses any callback entirely by redirecting to `/dashboard`.

## Tasks

- [x] 1. Add `signInWithFacebook` to AuthContext
  - [x] 1.1 Update `AuthContextType` interface in `auth-context.tsx`
    - Add `signInWithFacebook: () => Promise<{ error: Error | null }>` alongside `signInWithGoogle` and `signInWithGitHub`
    - _Requirements: 2.1, 2.4_

  - [x] 1.2 Implement `signInWithFacebook()` in `AuthProvider.tsx`
    - Call `supabase.auth.signInWithOAuth` with `provider: "facebook"` and `redirectTo: \`${window.location.origin}/dashboard\``
    - Do NOT pass any `scopes` or `queryParams` — Supabase defaults to `email`, `public_profile`
    - On error, return `{ error }` from the catch block; on success return `{ error: null }`
    - Add a comment near the method documenting that the login flow bypasses any callback component entirely (redirectTo points to /dashboard, not /auth/facebook/callback)
    - _Requirements: 2.1, 2.2, 2.3, 8.2, 8.3_

  - [ ]* 1.3 Write property test: login flow options invariant
    - **Property 2: Login flow options invariant**
    - Mock `supabase.auth.signInWithOAuth`, call `signInWithFacebook()` with arbitrary `window.location.origin` values (different hostnames, ports, protocols) via fast-check (min 100 iterations), assert the captured options object has `redirectTo` ending with `/dashboard` AND contains no `scopes` field, no `queryParams.scope` field, and no Facebook API scope strings
    - **Validates: Requirements 2.1, 2.2, 8.2**

- [x] 2. Add Facebook button to `SignIn.tsx`
  - [x] 2.1 Add `handleFacebookSignIn` handler and Facebook button
    - Import `signInWithFacebook` from `AuthContext`
    - Add `facebookLoading` state mirroring the existing `githubLoading` pattern
    - Implement `handleFacebookSignIn`: call `signInWithFacebook()`, show error toast on failure, leave loading active on success (redirect pending)
    - Render a `<Button variant="outline" className="w-full">` immediately below the GitHub button with the Facebook "f" SVG, label `"Continue with Facebook"`, `disabled={facebookLoading || loading}`, and `aria-label="Sign in with Facebook"`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 2.4, 7.1, 7.2, 7.3, 7.5_

  - [ ]* 2.2 Write property test: Facebook login button always rendered
    - **Property 1: Login button always rendered**
    - Generate arbitrary user auth states (null, partial session objects, full session objects with varying providers including google, github, facebook, and multi-provider combinations) via fast-check (min 100 iterations), render `SignIn.tsx`, assert a button with `aria-label="Sign in with Facebook"` is always present in the output
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 2.3 Write property test: error messages do not expose raw tokens
    - **Property 4: Error messages do not expose raw tokens**
    - Generate arbitrary error objects and session objects containing random `provider_token` strings via fast-check (min 100 iterations), trigger error conditions in `handleFacebookSignIn()`, assert the `provider_token` value does not appear in any toast message content or `console.error` call arguments
    - **Validates: Requirements 7.5, 8.4**

- [x] 3. Add Facebook button to `SignUp.tsx`
  - [x] 3.1 Add `handleFacebookSignUp` handler and Facebook button
    - Mirror the `SignIn.tsx` changes exactly — same handler pattern, same button markup, same `aria-label`
    - New users signing up via Facebook are handled identically to sign-in (Supabase creates the account on first use)
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2_

- [x] 4. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Verify login callback does not store connector tokens
  - [x] 5.1 Confirm no FacebookAuthCallback component is invoked by the login flow
    - Trace the login redirect: `signInWithFacebook()` sets `redirectTo: /dashboard`, so Supabase redirects directly to `/dashboard` after session creation — no callback component at `/auth/facebook/callback` is ever reached
    - No code changes needed; the comment added in task 1.2 documents this invariant in `AuthProvider.tsx`
    - _Requirements: 3.3_

  - [ ]* 5.2 Write property test: login flow never stores connector tokens
    - **Property 3: Login flow never stores connector tokens**
    - Generate arbitrary valid Supabase sessions with random `user_id` and `provider_token` values via fast-check (min 100 iterations), simulate the login flow completing (redirectTo was `/dashboard`, no connector path), assert no call is made to `supabase.from('social_tokens').upsert` or the backend `/api/social-tokens` endpoint
    - **Validates: Requirements 3.3**

- [x] 6. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All property tests use fast-check with a minimum of 100 iterations each
- No FacebookAuthCallback component is needed — the login flow bypasses any callback entirely
- Supabase handles user creation, account linking (same email across providers), and PKCE automatically
- The connector flow (token storage) is unchanged; the login flow is distinguished solely by `redirectTo: /dashboard` and the absence of `scopes`
