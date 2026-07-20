# 01 - Implementation Roadmap

Use this order exactly to avoid confusion.

## Phase 1: Foundation

1. Create Auth0 tenant.
2. Create one Auth0 Application (Regular Web App or SPA).
3. Configure callback, logout, and web origin URLs.
4. Configure basic branding (domain, logo, button labels).

## Phase 2: Add Identity Providers

1. Add Google connection.
2. Add Microsoft connection.
3. Add GitHub connection.
4. Enable all 3 for your Auth0 Application.

## Phase 3: Integrate Your Website

1. Add Auth0 SDK in frontend or backend.
2. Implement login button / route.
3. Implement callback route.
4. Implement logout route.
5. Protect private routes.

## Phase 4: User Account Management

1. Map Auth0 user (`sub`) to your internal user table.
2. If same person logs in with different provider, decide linking policy.
3. Store only minimal profile fields in your database.

## Phase 5: Security Hardening

1. Enforce HTTPS.
2. Use Authorization Code + PKCE.
3. Set secure cookies.
4. Add MFA (optional now, recommended later).
5. Add rate limiting and bot protection.

## Phase 6: Testing and Go Live

1. Test Google login end to end.
2. Test Microsoft login end to end.
3. Test GitHub login end to end.
4. Test cancellation and error cases.
5. Go live with production callback URLs.
