# Bugfix Requirements Document

## Introduction

The Credentials step in the AI workflow wizard incorrectly shows "Action required" for OAuth accounts (e.g. LinkedIn OAuth, Notion OAuth) even when the user has already connected them in the dashboard. This happens because the `generate-workflow` endpoint never returns a `credentialStatuses` array, so the wizard's `filterStillBlockingOAuth()` function — which gates the "Continue To Inputs" button — always sees an empty statuses list and treats every OAuth credential as unresolved. The only provider that avoids this is Google, which has a separate live fallback check against `google_oauth_tokens`. All other providers (LinkedIn, Notion, etc.) have no such fallback and are permanently shown as blocking.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the wizard calls `generate-workflow` and the response contains `requiredCredentials` for an OAuth provider (e.g. LinkedIn, Notion) THEN the system returns no `credentialStatuses` array, leaving it undefined or empty

1.2 WHEN `filterStillBlockingOAuth()` evaluates a LinkedIn or Notion OAuth credential against an empty `credentialStatuses` array THEN the system treats the credential as blocking regardless of whether the user has already connected it in the dashboard

1.3 WHEN the user has a valid OAuth connection stored in the vault (e.g. `linkedin_oauth_tokens`, `notion_oauth_tokens`) THEN the system does not query those tables during workflow generation, so the connection is never reflected in the wizard UI

1.4 WHEN the Credentials step renders for a workflow requiring LinkedIn or Notion OAuth THEN the system displays "Action required" and blocks the "Continue To Inputs" button even for users with active connections

### Expected Behavior (Correct)

2.1 WHEN the `generate-workflow` endpoint completes credential discovery THEN the system SHALL query the user's vault tables for all discovered OAuth providers and return a `credentialStatuses` array with entries shaped as `{ nodeId, credentialId, status: 'resolved_connected' | 'required_missing' }`

2.2 WHEN `filterStillBlockingOAuth()` evaluates a LinkedIn or Notion OAuth credential and `credentialStatuses` contains a matching entry with `status: 'resolved_connected'` THEN the system SHALL treat that credential as non-blocking

2.3 WHEN the user has a valid OAuth connection stored in the vault for any discovered provider THEN the system SHALL reflect that connection as `status: 'resolved_connected'` in the returned `credentialStatuses` array

2.4 WHEN the Credentials step renders for a workflow where all OAuth credentials are already connected THEN the system SHALL not show "Action required" and SHALL not block the "Continue To Inputs" button

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user has NOT connected a required OAuth credential THEN the system SHALL CONTINUE TO show "Action required" and block the "Continue To Inputs" button for that credential

3.2 WHEN the `generate-workflow` endpoint is called and credential discovery fails THEN the system SHALL CONTINUE TO return the workflow successfully with empty credential arrays (non-blocking failure)

3.3 WHEN a workflow requires Google OAuth and the user has a valid `google_oauth_tokens` entry THEN the system SHALL CONTINUE TO resolve that credential as connected via both the new `credentialStatuses` mechanism and the existing live fallback check

3.4 WHEN a workflow requires no OAuth credentials THEN the system SHALL CONTINUE TO skip the Credentials step and proceed normally

3.5 WHEN the wizard stores `pendingWorkflowData` from the generate-workflow response THEN the system SHALL CONTINUE TO pass `credentialStatuses` through to `filterStillBlockingOAuth()` without any additional frontend logic changes
