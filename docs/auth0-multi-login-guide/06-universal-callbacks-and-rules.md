# 06 - Universal Callbacks and Login Rules

All providers should use one common callback handling strategy in your app.

## Core idea

- Google, Microsoft, GitHub all redirect to Auth0.
- Auth0 redirects back to your app callback URL.
- Your app validates session/token once, not provider-by-provider.

## Step 1: Implement one callback route

Create one callback endpoint/page:

- Example: `/callback`

Responsibilities:

1. Exchange authorization code (handled by SDK).
2. Store session securely (cookie/session store).
3. Redirect to dashboard/home.

## Step 2: Store user identity safely

From Auth0 user profile, store:

- `sub` (unique user id from provider)
- `email`
- `name`
- `picture` (optional)
- `last_login_provider` (optional)

Use `sub` as stable external identity key.

## Step 3: Build internal user mapping

Create your own user record with:

- Internal `user_id`
- `auth0_sub`
- `email`
- timestamps

Never depend on provider-specific IDs directly in business logic.

## Step 4: Configure login button strategy

Option A: Single button
- "Continue to Login" and let Auth0 Universal Login show provider buttons.

Option B: Direct provider buttons
- Login with Google
- Login with Microsoft
- Login with GitHub

For beginners, Option A is simpler.

## Step 5: Add baseline security

1. Always use HTTPS in production.
2. Keep client secrets only on backend.
3. Use HTTP-only secure cookies.
4. Validate token issuer and audience through SDK config.
5. Set session expiration policy.

## Step 6: Optional account linking policy

If one user logs in with multiple providers:

1. Decide whether to merge accounts by verified email.
2. If yes, add account linking flow in profile settings.
3. Require re-authentication before linking/unlinking.
