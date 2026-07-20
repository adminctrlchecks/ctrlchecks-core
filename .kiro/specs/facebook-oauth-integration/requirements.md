# Requirements Document

## Introduction

This feature adds Facebook OAuth as a first-class authentication option alongside the existing Google OAuth and GitHub OAuth logins. Users can sign up or sign in using their Facebook account via a "Continue with Facebook" button that mirrors the existing Google and GitHub login buttons in style and UX flow.

The implementation covers:
1. **Frontend**: A Facebook login button, OAuth redirect initiation, and callback handling.
2. **Backend**: Facebook OAuth app registration, authorization code exchange, user creation/linking, and session management.
3. **Multi-provider support**: Users may have multiple login methods (Google, GitHub, Facebook, and potentially email/password) linked to a single account.

The Facebook auth flow uses Supabase's built-in Facebook OAuth provider (`supabase.auth.signInWithOAuth`) for identity only — no extra Facebook API scopes are requested at login time. This mirrors the Google and GitHub auth patterns exactly.

## Glossary

- **Auth_System**: The authentication layer responsible for user identity and session management, powered by Supabase social login.
- **Facebook_Provider**: The Supabase OAuth provider configured to authenticate users via Facebook (`provider: "facebook"`).
- **Identity_Scopes**: The minimal OAuth scopes required for login. For Facebook, this is the default scope set (`email`, `public_profile`) that Supabase requests automatically.
- **Internal_User**: The application's internal user record, keyed by the stable Supabase `user.id` (UUID) derived from the Facebook identity.
- **Login_Flow**: The sequence of steps a user follows to authenticate their identity and create a session using Facebook OAuth.
- **Callback_Handler**: The frontend component that processes the OAuth redirect from Facebook/Supabase and establishes the session.
- **Session**: The Supabase-managed authentication session created after a successful OAuth login.
- **Multi_Provider_Account**: An Internal_User record that has been authenticated via more than one OAuth provider (e.g., Google, GitHub, and/or Facebook).
- **Provider_Identity**: A record linking an Internal_User to a specific OAuth provider (Google, GitHub, or Facebook) and the provider's user identifier.
- **Login_Button**: The UI element a user clicks to initiate the Facebook OAuth Login_Flow.
- **Auth_Page**: The page containing Login_Buttons for all supported OAuth providers (currently Google and GitHub; Facebook is being added).

---

## Requirements

### Requirement 1: Facebook Login Button

**User Story:** As a new or returning user, I want to see a "Continue with Facebook" button on the login/signup page, so that I can authenticate using my Facebook account.

#### Acceptance Criteria

1. THE Auth_Page SHALL display a "Continue with Facebook" Login_Button alongside the existing "Continue with Google" and "Continue with GitHub" buttons.
2. THE Login_Button SHALL use the same visual style (size, shape, spacing, font) as the existing Google and GitHub Login_Buttons, substituting the Facebook logo and label.
3. THE Login_Button SHALL be accessible with a visible focus indicator and an `aria-label` of "Sign in with Facebook".
4. WHEN the Auth_Page is rendered, THE Auth_System SHALL display the Facebook Login_Button regardless of whether the user has previously authenticated with Facebook.

---

### Requirement 2: Initiating the Facebook OAuth Flow

**User Story:** As a user on the login page, I want clicking "Continue with Facebook" to redirect me to Facebook's authorization page, so that I can grant the app permission to read my identity.

#### Acceptance Criteria

1. WHEN a user clicks the "Continue with Facebook" Login_Button, THE Auth_System SHALL call `supabase.auth.signInWithOAuth` with `provider: "facebook"` and a `redirectTo` pointing to the post-login destination (e.g., `/dashboard`).
2. THE Auth_System SHALL NOT pass any custom `queryParams.scope` to the Facebook OAuth call, allowing Supabase to use its default identity scopes.
3. WHEN the OAuth call is initiated, THE Auth_System SHALL redirect the user's browser to the Facebook authorization page.
4. IF `supabase.auth.signInWithOAuth` returns an error before the redirect, THEN THE Auth_System SHALL display a descriptive error message to the user and leave the user on the Auth_Page.

---

### Requirement 3: OAuth Callback and Session Creation

**User Story:** As a user returning from Facebook's authorization page, I want the app to automatically create my session and redirect me to the dashboard, so that I can start using the app immediately.

#### Acceptance Criteria

1. WHEN Facebook redirects the user back to the application callback URL, THE Callback_Handler SHALL detect the Supabase session from the URL hash or query parameters.
2. WHEN a valid session is detected, THE Callback_Handler SHALL redirect the user to `/dashboard` without requiring any additional user action.
3. THE Callback_Handler SHALL NOT store any OAuth provider token in a connector token table during the Facebook Login_Flow.
4. IF the callback URL contains an error parameter, THEN THE Callback_Handler SHALL display a descriptive error message and redirect the user to the Auth_Page after 3 seconds.
5. IF no valid session is detected after the callback, THEN THE Callback_Handler SHALL display a descriptive error message and redirect the user to the Auth_Page after 3 seconds.

---

### Requirement 4: User Creation and Account Linking

**User Story:** As a new user signing in with Facebook for the first time, I want the app to create my account automatically, so that I don't need a separate registration step.

#### Acceptance Criteria

1. WHEN a user completes the Facebook Login_Flow for the first time, THE Auth_System SHALL create an Internal_User record using the stable Supabase `user.id` derived from the Facebook identity.
2. WHEN a user completes the Facebook Login_Flow and an Internal_User record already exists with the same verified email address, THE Auth_System SHALL link the Facebook Provider_Identity to the existing Internal_User rather than creating a duplicate account.
3. THE Auth_System SHALL store the Facebook Provider_Identity (provider name and provider user ID) associated with the Internal_User.
4. IF two accounts cannot be automatically linked due to an email conflict, THEN THE Auth_System SHALL surface a descriptive error to the user explaining the conflict.

---

### Requirement 5: Multi-Provider Account Support

**User Story:** As a user who has previously signed in with Google or GitHub, I want to also be able to sign in with Facebook, so that I have multiple login options for the same account.

#### Acceptance Criteria

1. THE Auth_System SHALL allow an Internal_User to have Provider_Identities for Google, GitHub, and Facebook simultaneously.
2. WHEN a user signs in with Facebook and an Internal_User already exists for that email (previously created via Google or GitHub login), THE Auth_System SHALL link the Facebook Provider_Identity to the existing Internal_User.
3. WHEN a user with a Multi_Provider_Account signs in via Google, GitHub, or Facebook, THE Auth_System SHALL establish a Session for the same Internal_User regardless of which provider was used.
4. THE Auth_System SHALL NOT create duplicate Internal_User records when the same email is authenticated via different providers.

---

### Requirement 6: Supabase Facebook Provider Configuration

**User Story:** As a developer configuring the application, I want the Facebook OAuth provider to be enabled in Supabase with the correct callback URL, so that the OAuth flow completes successfully.

#### Acceptance Criteria

1. THE Facebook_Provider SHALL be enabled in the Supabase project's Authentication settings with a valid Facebook App ID and App Secret.
2. THE Facebook_Provider SHALL have the Supabase callback URL (`https://<project>.supabase.co/auth/v1/callback`) registered as an authorized redirect URI in the Facebook App settings.
3. THE Facebook_Provider SHALL be configured to request only default identity scopes; no additional scopes SHALL be added to the Supabase provider configuration.
4. WHERE a staging or preview environment exists, THE Facebook_Provider SHALL have a separate Facebook App registered with the correct callback URL for that environment.

---

### Requirement 7: Error Handling and User Feedback

**User Story:** As a user attempting to sign in with Facebook, I want clear feedback when something goes wrong, so that I understand what happened and can take corrective action.

#### Acceptance Criteria

1. IF the Facebook OAuth flow is cancelled by the user (e.g., they close the Facebook authorization page), THEN THE Auth_System SHALL return the user to the Auth_Page without displaying an error.
2. IF Facebook returns an `access_denied` error, THEN THE Auth_System SHALL display a message indicating the user declined authorization and offer the option to try again.
3. IF a network error occurs during the OAuth flow, THEN THE Auth_System SHALL display a descriptive error message and offer the option to retry.
4. IF the Supabase session cannot be established after a successful Facebook authorization, THEN THE Auth_System SHALL display a descriptive error message and log the failure for debugging.
5. THE Auth_System SHALL NOT expose raw OAuth error codes, tokens, or internal identifiers in user-facing error messages.

---

### Requirement 8: Security and Transport

**User Story:** As a security engineer, I want the Facebook OAuth flow to follow least-privilege and secure transport principles, so that user credentials are protected.

#### Acceptance Criteria

1. THE Auth_System SHALL use HTTPS for all OAuth redirect URIs and callback endpoints in production.
2. THE Facebook_Provider SHALL request only the minimum identity scopes required for login; no additional Facebook Graph API scopes SHALL be requested during the Login_Flow.
3. THE Auth_System SHALL rely on Supabase's PKCE flow for the Facebook OAuth exchange, ensuring the authorization code cannot be intercepted and replayed.
4. THE Auth_System SHALL NOT log or expose the Facebook access token returned by Supabase in frontend responses, API logs, or error messages.
5. IF a request is made to an authenticated endpoint without a valid Session, THEN THE Auth_System SHALL return an authorization error and redirect the user to the Auth_Page.
