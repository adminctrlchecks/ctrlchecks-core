# Requirements Document

## Introduction

This feature implements a clean 2-step Google authentication architecture that separates identity-based login from integration-level OAuth consent. Currently, users are presented with a broad Google consent screen (requesting access to 12+ services) during initial app login — before they have even entered the application. This creates unnecessary friction, reduces signup conversion, and violates the principle of least-privilege.

The target architecture splits the flow into two distinct steps:
1. **Auth step**: Sign in with Google using identity-only scopes (`openid profile email`) via Auth0.
2. **Connector step**: Grant Gmail/Calendar/Drive scopes on demand, only when the user explicitly clicks "Connect Google" inside the integrations settings.

## Glossary

- **Auth_System**: The authentication layer responsible for user identity and session management, powered by Auth0 social login (google-oauth2).
- **Connector_System**: The integration layer responsible for requesting, storing, and managing OAuth tokens for Google services (Gmail, Calendar, Drive).
- **Identity_Scopes**: The minimal OAuth scopes required for login: `openid`, `profile`, `email`.
- **Integration_Scopes**: Service-specific OAuth scopes required for connectors, e.g., `https://www.googleapis.com/auth/gmail.readonly`.
- **Connector_Token**: An OAuth access/refresh token pair issued for a specific integration scope set, stored separately from the login session.
- **Internal_User**: The application's internal user record, keyed by the stable Auth0 `sub` identifier.
- **Token_Store**: The encrypted database table that persists Connector_Tokens mapped to Internal_User IDs.
- **Auth0**: The third-party identity provider used for social login via Google.
- **Consent_Screen**: The Google OAuth permission dialog shown to the user.
- **Login_Flow**: The sequence of steps a user follows to authenticate their identity and create a session.
- **Connector_Flow**: The sequence of steps a user follows to authorize a specific Google integration.

---

## Requirements

### Requirement 1: Identity-Only Login

**User Story:** As a new or returning user, I want to sign in with Google using only my identity information, so that I can access the app without being asked for integration permissions I haven't requested.

#### Acceptance Criteria

1. WHEN a user initiates login via "Continue with Google", THE Auth_System SHALL request only Identity_Scopes (`openid`, `profile`, `email`) from Google.
2. WHEN Auth0 returns a successful identity token, THE Auth_System SHALL create or update the Internal_User record using the stable `sub` identifier from the token.
3. THE Auth_System SHALL NOT request any Integration_Scopes (Gmail, Calendar, Drive, or any other Google service scope) during the Login_Flow.
4. WHEN a user completes the Login_Flow, THE Auth_System SHALL establish a session without storing any Connector_Token.
5. IF Auth0 returns an error during login, THEN THE Auth_System SHALL display a descriptive error message to the user and terminate the Login_Flow without creating a session.

---

### Requirement 2: On-Demand Connector Authorization

**User Story:** As an authenticated user, I want to connect individual Google services (Gmail, Calendar, Drive) from the integrations page, so that I grant only the permissions I need for each service at the time I choose to use it.

#### Acceptance Criteria

1. WHEN a user clicks "Connect Gmail", "Connect Calendar", or "Connect Drive" on the integrations page, THE Connector_System SHALL initiate a separate OAuth flow requesting only the Integration_Scopes required for that specific connector.
2. WHEN the OAuth callback is received for a connector, THE Connector_System SHALL exchange the authorization code for an access token and refresh token.
3. WHEN a Connector_Token is obtained, THE Connector_System SHALL persist it encrypted in the Token_Store, mapped to the Internal_User ID.
4. THE Connector_System SHALL store Connector_Tokens separately from the Auth_System login session.
5. IF the OAuth callback contains an error or the user denies consent, THEN THE Connector_System SHALL record the failure, display a descriptive error to the user, and leave the connector in a disconnected state.

---

### Requirement 3: Connector Status Display

**User Story:** As an authenticated user, I want to see the connection status of each Google integration, so that I know which services are active and can manage them individually.

#### Acceptance Criteria

1. THE Connector_System SHALL display a connected or disconnected status indicator for each Google connector (Gmail, Calendar, Drive) on the integrations page.
2. WHEN a Connector_Token for a service is present and valid, THE Connector_System SHALL display that connector as connected.
3. WHEN a Connector_Token is absent or has been revoked, THE Connector_System SHALL display that connector as disconnected.
4. WHEN a Connector_Token has expired and cannot be refreshed, THE Connector_System SHALL display a reconnect prompt for that connector.
5. WHEN a user clicks "Disconnect" for a connected integration, THE Connector_System SHALL revoke the Connector_Token and update the connector status to disconnected.

---

### Requirement 4: Token Lifecycle Management

**User Story:** As a system operator, I want connector tokens to be automatically refreshed and securely managed, so that integrations remain functional without requiring users to re-authorize unnecessarily.

#### Acceptance Criteria

1. WHEN a Connector_Token access token is expired and a refresh token is available, THE Connector_System SHALL automatically refresh the access token before executing any integration operation.
2. WHEN a token refresh fails, THE Connector_System SHALL mark the connector as requiring reconnection and notify the user.
3. THE Token_Store SHALL encrypt all access tokens and refresh tokens at rest.
4. THE Connector_System SHALL NOT expose Connector_Tokens in frontend responses, API logs, or error messages.
5. WHEN a user disconnects an integration, THE Connector_System SHALL delete the corresponding Connector_Token from the Token_Store.

---

### Requirement 5: Audit Logging

**User Story:** As a security operator, I want all authentication and connector authorization events to be logged, so that I can audit access and investigate incidents.

#### Acceptance Criteria

1. WHEN a user completes a Login_Flow, THE Auth_System SHALL write an audit log entry recording the event type, Internal_User ID, and timestamp.
2. WHEN a user completes a Connector_Flow (connect or disconnect), THE Connector_System SHALL write an audit log entry recording the event type, connector name, Internal_User ID, and timestamp.
3. WHEN a token refresh fails, THE Connector_System SHALL write an audit log entry recording the failure, connector name, Internal_User ID, and timestamp.
4. THE Auth_System SHALL NOT include secrets, tokens, or personally identifiable information beyond Internal_User ID in audit log entries.

---

### Requirement 6: Existing User Migration

**User Story:** As an existing user who previously authenticated with broader Google scopes, I want my login to continue working after this change, so that I am not locked out of the application.

#### Acceptance Criteria

1. WHEN an existing user logs in after the architecture change is deployed, THE Auth_System SHALL authenticate the user using Identity_Scopes only, regardless of any previously granted scopes.
2. WHEN an existing user's prior Connector_Tokens are present in the Token_Store, THE Connector_System SHALL continue to use those tokens for integrations until they expire or are disconnected.
3. IF an existing user's prior session was associated with Integration_Scopes, THEN THE Auth_System SHALL not carry those scopes forward into the new session.
4. THE Auth_System SHALL NOT require existing users to re-verify their identity as a result of this migration.

---

### Requirement 7: Security and Transport

**User Story:** As a security engineer, I want all OAuth flows and token storage to follow least-privilege and secure transport principles, so that user credentials are protected.

#### Acceptance Criteria

1. THE Auth_System SHALL use HTTPS for all OAuth redirect URIs and callback endpoints in production.
2. THE Connector_System SHALL request only the minimum Integration_Scopes required for each connector's declared functionality.
3. THE Auth0 Google Social Connection SHALL be configured with Identity_Scopes only, with no Integration_Scopes added to the login connection.
4. THE Connector_System SHALL use a dedicated OAuth client configuration separate from the Auth0 login connection for requesting Integration_Scopes.
5. IF a request to an integration endpoint is made without a valid Connector_Token for the required scope, THEN THE Connector_System SHALL return an authorization error and prompt the user to connect the relevant integration.
