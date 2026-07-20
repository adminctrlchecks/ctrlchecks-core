# 02 - Auth0 Tenant and App Setup

This is the base setup before adding Google, Microsoft, and GitHub.

## Step 1: Create Auth0 account and tenant

1. Go to Auth0 and sign up.
2. Create a tenant (example: `yourcompany-prod`).
3. Choose the closest region to your users.

## Step 2: Create your Auth0 Application

1. Open `Applications -> Applications`.
2. Click `Create Application`.
3. Name: `your-website-auth`.
4. Type:
   - SPA for React/Vue/Angular frontend apps.
   - Regular Web Application for server-rendered apps.

## Step 3: Configure URLs

In your Auth0 Application settings, set:

- Allowed Callback URLs  
  Example:  
  - `http://localhost:3000/callback` (dev)  
  - `https://yourdomain.com/callback` (prod)

- Allowed Logout URLs  
  Example:  
  - `http://localhost:3000`  
  - `https://yourdomain.com`

- Allowed Web Origins  
  Example:  
  - `http://localhost:3000`  
  - `https://yourdomain.com`

Do not leave wildcard URLs in production.

## Step 4: Save Auth0 values for your app

Collect these values from Auth0 dashboard:

- Domain (example: `yourtenant.us.auth0.com`)
- Client ID
- Client Secret (for backend apps only, keep private)

Create environment variables in your app:

- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET` (if backend app)
- `AUTH0_CALLBACK_URL`
- `AUTH0_LOGOUT_URL`

## Step 5: Basic login flow sanity test

Before adding providers, verify Auth0 itself works:

1. Use default database connection.
2. Try signup/login.
3. Confirm callback receives user session.

If this fails, fix it now before social login setup.
