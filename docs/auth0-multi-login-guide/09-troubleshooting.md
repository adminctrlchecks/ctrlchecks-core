# 09 - Troubleshooting

Use this page when something fails during setup.

## Problem: Login button not showing a provider

Possible causes:

1. Social connection is not enabled for your Auth0 Application.
2. You are testing the wrong tenant/application.
3. Universal Login customization hides provider options.

Fix:

1. Open Auth0 app -> Connections.
2. Enable Google/Microsoft/GitHub toggles.
3. Save and retest.

## Problem: Redirect URI mismatch

Possible causes:

1. Callback URL in provider console does not match Auth0 value exactly.
2. Trailing slash mismatch.
3. Using staging callback in production.

Fix:

1. Copy exact callback URL from Auth0 connection page.
2. Paste into provider app settings exactly.
3. Re-test after save.

## Problem: Works locally but fails in production

Possible causes:

1. Production domain not added in allowed URLs.
2. Wrong environment variables in production deployment.
3. HTTPS not fully configured.

Fix:

1. Update Auth0 allowed callback/logout/web origins.
2. Check production env variables.
3. Confirm HTTPS certificate and domain.

## Problem: User created duplicate accounts

Possible causes:

1. Same user signed in with different providers.
2. No account linking policy in your app.

Fix:

1. Define account linking strategy.
2. Allow manual linking in account settings.
3. Use verified email checks with re-authentication.

## Problem: Missing email from provider

Possible causes:

1. User account privacy settings (common on GitHub).
2. Requested scopes are too limited.

Fix:

1. Request proper profile/email scopes.
2. Add fallback flow asking user to confirm email.
