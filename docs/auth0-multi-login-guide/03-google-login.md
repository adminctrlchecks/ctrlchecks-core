# 03 - Google Login Integration

This adds "Continue with Google" through Auth0.

## Step 1: Create Google OAuth app

1. Open Google Cloud Console.
2. Create or select a project.
3. Configure OAuth consent screen.
4. Create OAuth Client ID.

Use redirect URI from Auth0 Google connection page.  
It usually looks like:

- `https://YOUR_AUTH0_DOMAIN/login/callback`

## Step 2: Collect Google credentials

From Google Cloud, copy:

- Client ID
- Client Secret

## Step 3: Configure in Auth0

1. Go to `Authentication -> Social`.
2. Open `Google`.
3. Enter Google Client ID and Client Secret.
4. Save.

## Step 4: Enable Google for your app

1. Go to `Applications -> Applications -> your app`.
2. Open `Connections`.
3. Enable the Google connection toggle.

## Step 5: Test flow

1. Start your app in local.
2. Click login.
3. Choose Google.
4. Complete consent.
5. Confirm redirect to your callback and logged-in session.

## Common issues

- `redirect_uri_mismatch`: callback URL is wrong in Google console.
- provider button not visible: connection not enabled for the app.
- invalid client: wrong Google client secret or wrong project.
