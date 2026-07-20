# 10 - Beginner Auth0 Setup (No Experience)

If you are new to Auth0, follow this exactly.

## What Auth0 is (simple)

Auth0 is a login service.  
Your app does not store passwords directly.  
Auth0 handles sign-in and sends user info back to your app securely.

## Your target in simple words

You want one sign-in page where user can login with:

- Google
- Microsoft
- GitHub

## Step 1: Create Auth0 account

1. Open Auth0 website.
2. Click sign up.
3. Verify email.
4. Create one tenant (your auth workspace).

## Step 2: Create one Application in Auth0

1. Open dashboard.
2. Go to `Applications -> Applications`.
3. Click `Create Application`.
4. Name: `main-website-login`.
5. Choose:
   - `Single Page Application` (React/Vue/etc), or
   - `Regular Web Application` (backend-rendered app).

## Step 3: Add your URLs

In Application settings, set:

- Allowed Callback URLs:
  - `http://localhost:3000/callback`
  - `https://yourdomain.com/callback`
- Allowed Logout URLs:
  - `http://localhost:3000`
  - `https://yourdomain.com`
- Allowed Web Origins:
  - `http://localhost:3000`
  - `https://yourdomain.com`

Save changes.

## Step 4: Turn on Universal Login

1. Go to `Branding -> Universal Login`.
2. Keep New Universal Login enabled.
3. This gives you a ready sign-in UI.

## Step 5: Add Google, Microsoft, GitHub

Use these guides:

- `03-google-login.md`
- `04-microsoft-login.md`
- `05-github-login.md`

Important: after adding each provider, enable it for your app in:

- `Applications -> your app -> Connections`

## Step 6: Test

1. Open your app login page.
2. Click login.
3. Confirm Auth0 page shows Google/Microsoft/GitHub buttons.
4. Login with each one and confirm callback works.

## Step 7: Keep it simple first

Do not add custom login complexity in day 1.  
First make default Auth0 Universal Login work.  
Then customize style and extra features.
