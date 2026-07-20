# 04 - Microsoft Login Integration

This adds "Continue with Microsoft" through Auth0.

Note: Bing is not a login provider. Use Microsoft Account via Microsoft Entra app registration.

## Step 1: Create Microsoft app registration

1. Open Microsoft Entra admin center.
2. Go to `App registrations -> New registration`.
3. Name your app.
4. Account types:
   - Start with "Accounts in any organizational directory and personal Microsoft accounts".
5. Redirect URI:
   - Use Auth0 callback URI shown in the Microsoft social connection setup.

## Step 2: Create client secret

1. Open `Certificates & secrets`.
2. Create a new client secret.
3. Copy the secret value immediately.

## Step 3: Collect values

Copy:

- Application (client) ID
- Client secret
- Tenant ID (if required by your selected account mode)

## Step 4: Configure in Auth0

1. Go to `Authentication -> Social`.
2. Open `Microsoft`.
3. Enter client ID and secret.
4. Configure scopes (basic profile/email first).
5. Save.

## Step 5: Enable Microsoft for your app

1. Go to `Applications -> Applications -> your app`.
2. Open `Connections`.
3. Enable Microsoft toggle.

## Step 6: Test flow

1. Click login in your app.
2. Choose Microsoft.
3. Complete sign-in/consent.
4. Confirm callback and logged-in state.

## Common issues

- `AADSTS50011` redirect mismatch: wrong callback URI in Entra app.
- login only works for one tenant: wrong account type selection.
- email missing in profile: adjust requested scopes.
