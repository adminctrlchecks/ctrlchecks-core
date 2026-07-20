# 07 - Frontend Integration Example (Concept)

This is a framework-neutral guide so you can adapt to any stack.

## Step 1: Install Auth0 SDK

Pick the SDK matching your stack:

- React SPA: Auth0 React SDK
- Next.js: Auth0 Next.js SDK
- Node backend web app: Auth0 Node SDK / Passport strategy

## Step 2: Add environment variables

At minimum:

- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CALLBACK_URL`
- `AUTH0_AUDIENCE` (if calling APIs)

## Step 3: Add login action

Trigger Auth0 login from your login page:

- Generic login to show all provider options
- Or provider-specific login hint when needed

## Step 4: Add callback handler

In callback route:

1. Process Auth0 response.
2. Create/update session.
3. Fetch user profile.
4. Redirect to authenticated page.

## Step 5: Protect private routes

Only allow authenticated users to access:

- dashboard
- profile
- settings
- any protected API endpoint

## Step 6: Add logout

Logout should:

1. Clear local app session.
2. Call Auth0 logout endpoint.
3. Redirect to public landing page.

## Step 7: Track auth events

Log these events for debugging:

- login_started
- login_success
- login_failed
- callback_failed
- logout_success

Do not log access tokens or secrets.
