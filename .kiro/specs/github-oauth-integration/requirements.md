# Requirements Document

## Introduction

This feature adds GitHub OAuth as a first-class authentication option alongside the existing Google OAuth login. Users can sign up or sign in using their GitHub account via a "Continue with GitHub" button that mirrors the existing Google login button in style and UX flow.

The implementation covers:
1. **Frontend**: A GitHub login button, OAuth redirect initiation, and callback handling.
2. **Backend**: GitHub OAuth app registration, authorization code exchange, user creation/linking, and session management.
3. **Multi-provider support**: Users may have multiple login methods (Google, GitHub, and potentially email/password) linked to a single account.

The GitHub auth flow uses Supabase's built-in GitHub OAuth provider (`supabase.auth.signInWithOAuth`) for identity only — no integration scopes are requested at login time. This mirrors the Google auth separation pattern exactly.

## Glossary

- **Auth_System**: The authentication layer responsible for user identity and session management, powered by Supabase social login.
- **GitHub_Provider**: The Supabase OAuth provider configured to authenticate users via GitHub (`provider: "github"`).
- **Identity_Scopes**: The minimal OAuth scopes required for login. For GitHub, this is the default scope set (`read:user`, `user:email`) that Supabase requests automatically.
- **Internal_User**: The application's internal user record, keyed by the stable Supabase `user.id` (UUID) derived from the GitHub identity.
- **Login_Flow**: The sequence of steps a user follows to authenticate their identity and create a session using GitHub OAuth.
- **Callback_Handler**: The frontend component (`Callback.tsx` or equivalent) that processes the OAuth redirect from GitHub/Supabase and establishes the session.
- **Session**: The Supabase-managed authentication session created after a successful OAuth login.
- **Multi_Provider_Account**: An Internal_User record that has been authenticated via more than one OAuth provider (e.g., both Google and GitHub).
- **Provider_Identity**: A record linking an Internal_User to a specific OAuth provider (Google or GitHub) and the provider's user identifier.
- **Login_Button**: The UI element a user clicks to initiate the GitHub OAuth Login_Flow.
- **Auth_Page**: The page containing Login_Buttons for all supported OAuth providers (currently Google; GitHub is being added).

---

## Requirements

### Requirement 1: GitHub Login Button

**User Story:** As a new or returning user, I want to see a "Continue with GitHub" button on the login/signup page, so that I can authenticate using my GitHub account.

#### Acceptance Criteria

1. THE Auth_Page SHALL display a "Continue with GitHub" Login_Button alongside the existing "Continue with Google" button.
2. THE Login_Button SHALL use the same visual style (size, shape, spacing, font) as the existing Google Login_Button, substituting the GitHub logo and label.
3. THE Login_Button SHALL be accessible with a visible focus indicator and an `aria-label` of "Sign in with GitHub".
4. WHEN the Auth_Page is rendered, THE Auth_System SHALL display the GitHub Login_Button regardless of whether the user has previously authenticated with GitHub.

---

### Requirement 2: Initiating the GitHub OAuth Flow

**User Story:** As a user on the login page, I want clicking "Continue with GitHub" to redirect me to GitHub's authorization page, so that I can grant the app permission to read my identity.

#### Acceptance Criteria

1. WHEN a user clicks the "Continue with GitHub" Login_Button, THE Auth_System SHALL call `supabase.auth.signInWithOAuth` with `provider: "github"` and a `redirectTo` pointing to the post-login destination (e.g., `/dashboard`).
2. THE Auth_System SHALL NOT pass any custom `queryParams.scope` to the GitHub OAuth call, allowing Supabase to use its default identity scopes.
3. WHEN the OAuth call is initiated, THE Auth_System SHALL redirect the user's browser to the GitHub authorization page.
4. IF `supabase.auth.signInWithOAuth` returns an error before the redirect, THEN THE Auth_System SHALL display a descriptive error message to the user and leave the user on the Auth_Page.

---

### Requirement 3: OAuth Callback and Session Creation

**User Story:** As a user returning from GitHub's authorization page, I want the app to automatically create my session and redirect me to the dashboard, so that I can start using the app immediately.

#### Acceptance Criteria

1. WHEN GitHub redirects the user back to the application callback URL, THE Callback_Handler SHALL detect the Supabase session from the URL hash or query parameters.
2. WHEN a valid session is detected, THE Callback_Handler SHALL redirect the user to `/dashboard` without requiring any additional user action.
3. THE Callback_Handler SHALL NOT store any OAuth provider token in a connector token table (e.g., `google_oauth_tokens` or equivalent) during the GitHub Login_Flow.
4. IF the callback URL contains an error parameter, THEN THE Callback_Handler SHALL display a descriptive error message and redirect the user to the Auth_Page after 3 seconds.
5. IF no valid session is detected after the callback, THEN THE Callback_Handler SHALL display a descriptive error message and redirect the user to the Auth_Page after 3 seconds.

---

### Requirement 4: User Creation and Account Linking

**User Story:** As a new user signing in with GitHub for the first time, I want the app to create my account automatically, so that I don't need a separate registration step.

#### Acceptance Criteria

1. WHEN a user completes the GitHub Login_Flow for the first time, THE Auth_System SHALL create an Internal_User record using the stable Supabase `user.id` derived from the GitHub identity.
2. WHEN a user completes the GitHub Login_Flow and an Internal_User record already exists with the same verified email address, THE Auth_System SHALL link the GitHub Provider_Identity to the existing Internal_User rather than creating a duplicate account.
3. THE Auth_System SHALL store the GitHub Provider_Identity (provider name and provider user ID) associated with the Internal_User.
4. IF two accounts cannot be automatically linked due to an email conflict, THEN THE Auth_System SHALL surface a descriptive error to the user explaining the conflict.

---

### Requirement 5: Multi-Provider Account Support

**User Story:** As a user who has previously signed in with Google, I want to also be able to sign in with GitHub, so that I have multiple login options for the same account.

#### Acceptance Criteria

1. THE Auth_System SHALL allow an Internal_User to have Provider_Identities for both Google and GitHub simultaneously.
2. WHEN a user signs in with GitHub and an Internal_User already exists for that email (previously created via Google login), THE Auth_System SHALL link the GitHub Provider_Identity to the existing Internal_User.
3. WHEN a user with a Multi_Provider_Account signs in via either Google or GitHub, THE Auth_System SHALL establish a Session for the same Internal_User regardless of which provider was used.
4. THE Auth_System SHALL NOT create duplicate Internal_User records when the same email is authenticated via different providers.

---

### Requirement 6: Supabase GitHub Provider Configuration

**User Story:** As a developer configuring the application, I want the GitHub OAuth provider to be enabled in Supabase with the correct callback URL, so that the OAuth flow completes successfully.

#### Acceptance Criteria

1. THE GitHub_Provider SHALL be enabled in the Supabase project's Authentication settings with a valid GitHub OAuth App Client ID and Client Secret.
2. THE GitHub_Provider SHALL have the Supabase callback URL (`https://<project>.supabase.co/auth/v1/callback`) registered as an authorized callback URL in the GitHub OAuth App settings.
3. THE GitHub_Provider SHALL be configured to request only default identity scopes; no additional scopes SHALL be added to the Supabase provider configuration.
4. WHERE a staging or preview environment exists, THE GitHub_Provider SHALL have a separate GitHub OAuth App registered with the correct callback URL for that environment.

---

### Requirement 7: Error Handling and User Feedback

**User Story:** As a user attempting to sign in with GitHub, I want clear feedback when something goes wrong, so that I understand what happened and can take corrective action.

#### Acceptance Criteria

1. IF the GitHub OAuth flow is cancelled by the user (e.g., they close the GitHub authorization page), THEN THE Auth_System SHALL return the user to the Auth_Page without displaying an error.
2. IF GitHub returns an `access_denied` error, THEN THE Auth_System SHALL display a message indicating the user declined authorization and offer the option to try again.
3. IF a network error occurs during the OAuth flow, THEN THE Auth_System SHALL display a descriptive error message and offer the option to retry.
4. IF the Supabase session cannot be established after a successful GitHub authorization, THEN THE Auth_System SHALL display a descriptive error message and log the failure for debugging.
5. THE Auth_System SHALL NOT expose raw OAuth error codes, tokens, or internal identifiers in user-facing error messages.

---

### Requirement 8: Security and Transport

**User Story:** As a security engineer, I want the GitHub OAuth flow to follow least-privilege and secure transport principles, so that user credentials are protected.

#### Acceptance Criteria

1. THE Auth_System SHALL use HTTPS for all OAuth redirect URIs and callback endpoints in production.
2. THE GitHub_Provider SHALL request only the minimum identity scopes required for login; no repository, organization, or other GitHub API scopes SHALL be requested during the Login_Flow.
3. THE Auth_System SHALL rely on Supabase's PKCE flow for the GitHub OAuth exchange, ensuring the authorization code cannot be intercepted and replayed.
4. THE Auth_System SHALL NOT log or expose the GitHub access token returned by Supabase in frontend responses, API logs, or error messages.
5. IF a request is made to an authenticated endpoint without a valid Session, THEN THE Auth_System SHALL return an authorization error and redirect the user to the Auth_Page.
