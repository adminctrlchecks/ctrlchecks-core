# Implementation Plan: Google Auth Separation

## Overview

Separate Google OAuth into two distinct flows: identity-only login and on-demand connector authorization. The fix touches five files and introduces one new shared constant file.

## Tasks

- [x] 1. Create shared INTEGRATION_SCOPES constant
  - Create `ctrl_checks/src/lib/google-scopes.ts` and export `INTEGRATION_SCOPES` as a space-joined string of all nine integration scope URLs (spreadsheets, documents, drive, calendar, gmail.send, gmail.readonly, bigquery, tasks, contacts)
  - This is the single source of truth — no other file should hardcode the integration scope list
  - _Requirements: 2.1, 7.2_

- [x] 2. Fix login flow in AuthProvider.tsx
  - [x] 2.1 Remove integration scopes from `signInWithGoogle()`
    - In `ctrl_checks/src/components/AuthProvider.tsx`, remove the `queryParams` block from `signInWithGoogle()` entirely, keeping only `redirectTo: \`${window.location.origin}/dashboard\``
    - After the fix, Supabase defaults to `openid profile email` — no integration scopes are requested at login
    - _Requirements: 1.1, 1.3, 6.1, 6.3_

  - [x]* 2.2 Write property test for login flow scope isolation
    - **Property 1: Login flow never requests integration scopes**
    - Mock `supabase.auth.signInWithOAuth`, call `signInWithGoogle()` with arbitrary contexts (min 100 iterations via fast-check), assert the captured options object contains no integration scope strings (gmail, drive, calendar, sheets, bigquery, tasks, contacts, documents)
    - **Validates: Requirements 1.1, 1.3, 6.1, 6.3**

- [x] 3. Fix connector flow in ConnectionsPanel.tsx
  - [x] 3.1 Update `handleGoogleConnect()` to use INTEGRATION_SCOPES and mode=connector redirect
    - In `ctrl_checks/src/components/ConnectionsPanel.tsx`, import `INTEGRATION_SCOPES` from `@/lib/google-scopes`
    - Change `redirectUrl` to `` `${window.location.origin}/auth/google/callback?mode=connector` ``
    - Replace the hardcoded `scope` string in `queryParams` with `INTEGRATION_SCOPES`
    - _Requirements: 2.1, 7.2_

  - [x]* 3.2 Write property test for connector connect handler
    - **Property 4: Connector flow uses only integration scopes**
    - Mock `supabase.auth.signInWithOAuth`, call `handleGoogleConnect()` with arbitrary user states (min 100 iterations via fast-check), assert `redirectTo` contains `mode=connector` and `queryParams.scope` equals `INTEGRATION_SCOPES` exactly
    - **Validates: Requirements 2.1, 7.2**

- [x] 4. Fix connector flow in GoogleConnectionStatus.tsx
  - [x] 4.1 Update `handleGoogleAuth()` to use INTEGRATION_SCOPES and mode=connector redirect
    - In `ctrl_checks/src/components/GoogleConnectionStatus.tsx`, import `INTEGRATION_SCOPES` from `@/lib/google-scopes`
    - Change `redirectUrl` to `` `${window.location.origin}/auth/google/callback?mode=connector` ``
    - Replace the hardcoded `scope` string in `queryParams` with `INTEGRATION_SCOPES`
    - _Requirements: 2.1, 7.2_

  - [x]* 4.2 Write property test for GoogleConnectionStatus connector handler
    - **Property 4: Connector flow uses only integration scopes**
    - Same property as 3.2 but exercised through `handleGoogleAuth()` in `GoogleConnectionStatus`
    - Mock `supabase.auth.signInWithOAuth`, assert `redirectTo` contains `mode=connector` and scope equals `INTEGRATION_SCOPES` for all generated inputs (min 100 iterations)
    - **Validates: Requirements 2.1, 7.2**

- [x] 5. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update Callback.tsx to be mode-aware
  - [x] 6.1 Add mode detection and branch on connector vs login
    - In `ctrl_checks/src/pages/auth/google/Callback.tsx`, read `mode` from `new URLSearchParams(window.location.search)`
    - If `mode !== 'connector'`: call `navigate('/dashboard')` immediately and return — do NOT touch `google_oauth_tokens`
    - If `mode === 'connector'`: run the existing token-saving logic as before
    - Replace the hardcoded scope string in the `upsert` call with `INTEGRATION_SCOPES` imported from `@/lib/google-scopes`
    - _Requirements: 1.4, 2.3, 2.4_

  - [x]* 6.2 Write property test: login callback never stores tokens
    - **Property 2: Login callback never stores connector tokens**
    - Generate arbitrary URL search param strings that do NOT contain `mode=connector` (min 100 iterations via fast-check), run callback logic with mocked Supabase, assert `supabase.from('google_oauth_tokens').upsert` is never called
    - **Validates: Requirements 1.4**

  - [x]* 6.3 Write property test: connector callback stores correct tokens
    - **Property 3: Connector callback stores tokens for correct user**
    - Generate arbitrary valid sessions with random `user_id` and `provider_token` strings (min 100 iterations via fast-check), run callback with `mode=connector` in URL params, assert upsert is called with matching `user_id` and `access_token`
    - **Validates: Requirements 2.3**

- [x] 7. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All property tests use fast-check with a minimum of 100 iterations each
- `INTEGRATION_SCOPES` in `google-scopes.ts` is the single source of truth — never duplicate the scope list elsewhere
- The callback branch is the key correctness gate: login callbacks must never write to `google_oauth_tokens`
