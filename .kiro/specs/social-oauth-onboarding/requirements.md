# Requirements Document

## Introduction

This document covers two connected onboarding features for the CtrlChecks AI workflow automation platform: Instagram OAuth Connect Flow and WhatsApp Business Onboarding Guide. Both features allow any platform user (not just the platform owner) to connect their social accounts so that the existing Instagram and WhatsApp node executors can act on their behalf. Tokens are stored per `user_id` in Supabase and are automatically refreshed before expiry.

## Glossary

- **OAuth_Flow**: The Facebook OAuth 2.0 authorization code flow used to obtain access tokens for both Instagram and WhatsApp integrations.
- **Instagram_Connect_Flow**: The UI and backend sequence that guides a platform user through Facebook OAuth to connect their Instagram account.
- **WhatsApp_Onboarding_Guide**: The UI and backend sequence that detects a user's WhatsApp account type and guides them through the steps needed to connect to the WhatsApp Cloud API.
- **Token_Manager**: The backend service responsible for storing, retrieving, and refreshing OAuth tokens in Supabase (existing `instagram-token-manager.ts` and `whatsapp-token-manager.ts`).
- **Token_Store**: The Supabase tables `instagram_oauth_tokens` and `whatsapp_oauth_tokens` where per-user tokens are persisted.
- **ig_user_id**: The Instagram Business or Creator Account ID resolved from the Facebook Graph API after OAuth.
- **WABA_ID**: The WhatsApp Business Account ID required for the WhatsApp Cloud API.
- **Phone_Number_ID**: The unique identifier for a WhatsApp Business phone number registered in the Meta Developer portal.
- **Account_Settings_Page**: The platform UI page where users manage their connected social accounts.
- **Reconnect_Flow**: The UI sequence triggered when a stored token is expired or revoked, prompting the user to re-authorize.
- **Creator_Account**: An Instagram account type (free upgrade from Personal) that unlocks the Instagram Graph API.
- **WhatsApp_Business_App**: The free Meta mobile app that upgrades a personal WhatsApp number to a WhatsApp Business account.
- **Meta_Developer_Portal**: The web portal at developers.facebook.com where developers create Facebook Apps and configure WhatsApp products.

---

## Requirements

### Requirement 1: Instagram Account Type Detection and Guidance

**User Story:** As a platform user with a personal Instagram account, I want to be informed that I need a Creator or Business account before connecting, so that I can upgrade for free and then proceed with the OAuth flow.

#### Acceptance Criteria

1. WHEN a user initiates the Instagram Connect Flow, THE Instagram_Connect_Flow SHALL display the required Instagram account type (Creator or Business) and explain that Personal accounts are not supported by the Instagram Graph API.
2. WHEN a user indicates they have a Personal Instagram account, THE Instagram_Connect_Flow SHALL present a step-by-step guide explaining how to convert to a Creator account at no cost within the Instagram mobile app.
3. WHEN a user confirms they have a Creator or Business account, THE Instagram_Connect_Flow SHALL proceed to the Facebook OAuth authorization step.
4. IF a user attempts to complete OAuth with a Personal Instagram account that has no linked Creator or Business account, THEN THE Instagram_Connect_Flow SHALL display an error message stating that no eligible Instagram account was found and prompt the user to upgrade their account type before retrying.

---

### Requirement 2: Instagram Facebook OAuth Authorization

**User Story:** As a platform user with a Creator or Business Instagram account, I want to authorize the platform via Facebook OAuth, so that the platform can act on my Instagram account.

#### Acceptance Criteria

1. WHEN a user initiates the Instagram OAuth authorization, THE OAuth_Flow SHALL redirect the user to the Facebook authorization dialog requesting the scopes: `instagram_basic`, `instagram_content_publish`, `instagram_manage_messages`, and `pages_show_list`.
2. WHEN the user grants authorization, THE OAuth_Flow SHALL exchange the authorization code for an access token using `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`.
3. WHEN the access token is obtained, THE OAuth_Flow SHALL immediately exchange it for a long-lived token using the `fb_exchange_token` grant type.
4. IF the user denies authorization or closes the OAuth dialog, THEN THE OAuth_Flow SHALL return the user to the Account_Settings_Page and display a message stating that the connection was cancelled.
5. IF the OAuth token exchange returns an error, THEN THE OAuth_Flow SHALL display a descriptive error message and offer the user the option to retry.

---

### Requirement 3: Instagram ig_user_id Resolution and Token Storage

**User Story:** As a platform user who has completed Instagram OAuth, I want my Instagram Business Account ID and token stored automatically, so that the platform can use them without requiring me to look up technical IDs.

#### Acceptance Criteria

1. WHEN an access token is successfully obtained, THE Instagram_Connect_Flow SHALL call the Facebook Graph API `me/accounts` endpoint to retrieve the user's linked Facebook Pages.
2. WHEN Facebook Pages are retrieved, THE Instagram_Connect_Flow SHALL resolve the `instagram_business_account.id` (ig_user_id) from each page and store the first valid result.
3. WHEN the ig_user_id is resolved, THE Token_Manager SHALL upsert a record in the `instagram_oauth_tokens` table containing: `user_id`, `access_token`, `refresh_token`, `expires_at`, `ig_user_id`, and `scope`.
4. IF no ig_user_id can be resolved from any linked Facebook Page, THEN THE Instagram_Connect_Flow SHALL display an error message stating that no Instagram Business or Creator account was found linked to the authorized Facebook account.
5. THE Token_Manager SHALL store tokens scoped to the authenticated platform `user_id` so that each platform user's token is isolated from other users' tokens.

---

### Requirement 4: Instagram Token Auto-Refresh

**User Story:** As a platform user with a connected Instagram account, I want my access token to be refreshed automatically before it expires, so that my workflows continue running without interruption.

#### Acceptance Criteria

1. WHILE an Instagram token's `expires_at` is within 5 minutes of the current time, THE Token_Manager SHALL attempt to refresh the token using the `fb_exchange_token` grant type before returning it to a caller.
2. WHEN a token is successfully refreshed, THE Token_Manager SHALL update the `access_token` and `expires_at` fields in the `instagram_oauth_tokens` table for the corresponding `user_id`.
3. IF a token refresh attempt fails, THEN THE Token_Manager SHALL return a null token and log the failure with the associated `user_id`.
4. IF a token refresh fails and a workflow node requires the token, THEN THE Instagram_Connect_Flow SHALL surface a reconnect prompt to the user on the Account_Settings_Page.

---

### Requirement 5: Instagram Connection Status in Account Settings

**User Story:** As a platform user, I want to see whether my Instagram account is connected or disconnected in my account settings, so that I can manage my connection at any time.

#### Acceptance Criteria

1. THE Account_Settings_Page SHALL display the Instagram connection status as either "Connected" (with the linked Instagram username) or "Not Connected" for each platform user.
2. WHEN a user's Instagram token is expired or revoked, THE Account_Settings_Page SHALL display the status as "Reconnect Required" and provide a button to initiate the Reconnect_Flow.
3. WHEN a user clicks "Disconnect" on a connected Instagram account, THE Instagram_Connect_Flow SHALL delete the corresponding record from the `instagram_oauth_tokens` table for that `user_id`.
4. WHEN a user initiates the Reconnect_Flow, THE Instagram_Connect_Flow SHALL restart the full OAuth authorization sequence from Requirement 2.

---

### Requirement 6: WhatsApp Account Type Detection

**User Story:** As a platform user, I want the platform to detect whether I have a WhatsApp Business account or a personal WhatsApp account, so that I am guided through the correct onboarding path.

#### Acceptance Criteria

1. WHEN a user opens the WhatsApp Onboarding Guide, THE WhatsApp_Onboarding_Guide SHALL present two options: "I have WhatsApp Business" and "I only have personal WhatsApp".
2. WHEN a user selects "I only have personal WhatsApp", THE WhatsApp_Onboarding_Guide SHALL display a step-by-step guide explaining how to download the WhatsApp Business app and migrate their existing number at no cost.
3. WHEN a user selects "I have WhatsApp Business", THE WhatsApp_Onboarding_Guide SHALL proceed to detect whether the user has an existing WhatsApp Business API account or only the WhatsApp Business mobile app.
4. WHEN a user selects "I only have personal WhatsApp" and confirms they have completed the upgrade, THE WhatsApp_Onboarding_Guide SHALL advance to the WhatsApp Business API setup steps.

---

### Requirement 7: WhatsApp Business API Setup Guide

**User Story:** As a platform user with a WhatsApp Business mobile app account, I want a guided walkthrough to set up the WhatsApp Cloud API, so that I can connect my number to the platform without needing prior developer experience.

#### Acceptance Criteria

1. WHEN a user needs to set up the WhatsApp Business API, THE WhatsApp_Onboarding_Guide SHALL present the following steps in order: (1) create a Meta Developer account, (2) create a Facebook App with the WhatsApp product, (3) retrieve the Phone_Number_ID and WABA_ID from the Meta Developer Portal, (4) complete OAuth to connect the account.
2. THE WhatsApp_Onboarding_Guide SHALL display each setup step with a title, description, and a direct link to the relevant Meta Developer Portal page where applicable.
3. WHEN a user marks a setup step as complete, THE WhatsApp_Onboarding_Guide SHALL advance to the next step and persist the user's progress so they can resume if they leave and return.
4. IF a user already has a Meta Developer account, THE WhatsApp_Onboarding_Guide SHALL allow them to skip the Meta Developer account creation step.

---

### Requirement 8: WhatsApp Phone Number ID and WABA ID Collection

**User Story:** As a platform user setting up the WhatsApp Cloud API, I want to enter my Phone Number ID and WABA ID so that the platform can associate my WhatsApp Business number with my account.

#### Acceptance Criteria

1. WHEN a user reaches the Phone_Number_ID and WABA_ID collection step, THE WhatsApp_Onboarding_Guide SHALL display input fields for both values along with instructions on where to find them in the Meta Developer Portal.
2. WHEN a user submits their Phone_Number_ID and WABA_ID, THE WhatsApp_Onboarding_Guide SHALL validate that both fields are non-empty strings before proceeding.
3. IF either the Phone_Number_ID or WABA_ID field is empty when the user submits, THEN THE WhatsApp_Onboarding_Guide SHALL display a field-level error message indicating which value is missing.
4. WHEN valid Phone_Number_ID and WABA_ID values are submitted, THE WhatsApp_Onboarding_Guide SHALL store them alongside the OAuth token in the `whatsapp_oauth_tokens` table for the corresponding `user_id`.

---

### Requirement 9: WhatsApp Facebook OAuth Authorization

**User Story:** As a platform user with a WhatsApp Business API account, I want to authorize the platform via Facebook OAuth, so that the platform can send and manage messages on my behalf.

#### Acceptance Criteria

1. WHEN a user initiates WhatsApp OAuth authorization, THE OAuth_Flow SHALL redirect the user to the Facebook authorization dialog requesting the scopes: `whatsapp_business_messaging`, `whatsapp_business_management`, and `pages_show_list`.
2. WHEN the user grants authorization, THE OAuth_Flow SHALL exchange the authorization code for an access token using `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`.
3. WHEN the access token is obtained, THE OAuth_Flow SHALL immediately exchange it for a long-lived token using the `fb_exchange_token` grant type.
4. IF the user denies authorization or closes the OAuth dialog, THEN THE OAuth_Flow SHALL return the user to the Account_Settings_Page and display a message stating that the connection was cancelled.
5. IF the OAuth token exchange returns an error, THEN THE OAuth_Flow SHALL display a descriptive error message and offer the user the option to retry.

---

### Requirement 10: WhatsApp Token Storage

**User Story:** As a platform user who has completed WhatsApp OAuth, I want my token, Phone Number ID, and WABA ID stored automatically, so that the platform can use them in my workflows.

#### Acceptance Criteria

1. WHEN a WhatsApp access token is successfully obtained, THE Token_Manager SHALL upsert a record in the `whatsapp_oauth_tokens` table containing: `user_id`, `access_token`, `refresh_token`, `expires_at`, `phone_number_id`, `business_account_id`, and `scope`.
2. THE Token_Manager SHALL store tokens scoped to the authenticated platform `user_id` so that each platform user's token is isolated from other users' tokens.
3. IF a record for the `user_id` already exists in `whatsapp_oauth_tokens`, THE Token_Manager SHALL update the existing record rather than inserting a duplicate.

---

### Requirement 11: WhatsApp Token Auto-Refresh

**User Story:** As a platform user with a connected WhatsApp account, I want my access token to be refreshed automatically before it expires, so that my workflows continue running without interruption.

#### Acceptance Criteria

1. WHILE a WhatsApp token's `expires_at` is within 5 minutes of the current time, THE Token_Manager SHALL attempt to refresh the token using the `fb_exchange_token` grant type before returning it to a caller.
2. WHEN a token is successfully refreshed, THE Token_Manager SHALL update the `access_token` and `expires_at` fields in the `whatsapp_oauth_tokens` table for the corresponding `user_id`.
3. IF a token refresh attempt fails, THEN THE Token_Manager SHALL return a null token and log the failure with the associated `user_id`.
4. IF a token refresh fails and a workflow node requires the token, THEN THE WhatsApp_Onboarding_Guide SHALL surface a reconnect prompt to the user on the Account_Settings_Page.

---

### Requirement 12: WhatsApp Connection Status in Account Settings

**User Story:** As a platform user, I want to see whether my WhatsApp Business account is connected or disconnected in my account settings, so that I can manage my connection at any time.

#### Acceptance Criteria

1. THE Account_Settings_Page SHALL display the WhatsApp connection status as either "Connected" (with the linked phone number) or "Not Connected" for each platform user.
2. WHEN a user's WhatsApp token is expired or revoked, THE Account_Settings_Page SHALL display the status as "Reconnect Required" and provide a button to initiate the Reconnect_Flow.
3. WHEN a user clicks "Disconnect" on a connected WhatsApp account, THE Token_Manager SHALL delete the corresponding record from the `whatsapp_oauth_tokens` table for that `user_id`.
4. WHEN a user initiates the Reconnect_Flow for WhatsApp, THE WhatsApp_Onboarding_Guide SHALL restart the OAuth authorization sequence from Requirement 9, skipping the setup guide steps if Phone_Number_ID and WABA_ID are already stored.

---

### Requirement 13: Multi-User Token Isolation

**User Story:** As a platform operator, I want each user's OAuth tokens to be strictly isolated by `user_id`, so that one user's credentials can never be used by another user's workflows.

#### Acceptance Criteria

1. THE Token_Manager SHALL only return a token when the requesting `user_id` matches the `user_id` stored in the Token_Store record.
2. THE Token_Manager SHALL accept an array of `user_id` values and attempt each in order, returning the first valid token found for a matching `user_id`.
3. IF no token is found for any of the provided `user_id` values, THEN THE Token_Manager SHALL return null and log a warning without exposing any other user's token data.
