# 05 - GitHub Login Integration

This adds "Continue with GitHub" through Auth0.

## Step 1: Create GitHub OAuth app

1. Open GitHub `Settings -> Developer settings -> OAuth Apps`.
2. Click `New OAuth App`.
3. Fill:
   - Application name
   - Homepage URL (your site)
   - Authorization callback URL (use Auth0 callback URL for GitHub)
4. Create app.

## Step 2: Generate secret

1. Open the OAuth app.
2. Generate client secret.
3. Copy both:
   - Client ID
   - Client Secret

## Step 3: Configure in Auth0

1. Go to `Authentication -> Social`.
2. Open `GitHub`.
3. Add client ID and secret.
4. Save.

## Step 4: Enable GitHub for your app

1. Go to `Applications -> Applications -> your app`.
2. Open `Connections`.
3. Enable GitHub toggle.

## Step 5: Test flow

1. Open login page.
2. Choose GitHub.
3. Authorize the app.
4. Verify callback and active session.

## Common issues

- callback mismatch: GitHub callback URL must exactly match.
- button not shown: connection disabled for application.
- missing primary email: user may have private email; handle fallback logic.
