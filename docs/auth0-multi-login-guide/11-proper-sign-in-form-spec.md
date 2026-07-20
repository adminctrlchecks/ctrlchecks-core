# 11 - Proper Sign-In Form Specification

Use this as your standard sign-in form for your website.

Important: even if you use Auth0 Universal Login, keep this spec for UI consistency and QA.

## A. Sign-in page structure

Top to bottom order:

1. Logo
2. Title: `Sign in to your account`
3. Subtitle: `Use your preferred account`
4. Social buttons section
5. Divider line: `or`
6. Email/password section (optional fallback)
7. Forgot password link
8. Sign-in button
9. Sign-up link
10. Terms + Privacy links

## B. Social button requirements

Show exactly these in this order:

1. Continue with Google
2. Continue with Microsoft
3. Continue with GitHub

Button style:

- Full width
- Same height and spacing
- Provider icon on left
- Clear hover/focus state

## C. Email/password fallback (recommended)

Fields:

- Email (required)
- Password (required)
- Remember me (optional)

Rules:

- Validate email format.
- Password minimum length policy.
- Do not reveal whether email exists in error message.

## D. UX and accessibility

- Keyboard accessible (tab order correct).
- Visible focus states.
- Error text below field.
- Button disabled while submitting.
- Loading state: `Signing you in...`
- Mobile responsive.

## E. Security behavior

- Use HTTPS only.
- Never log passwords.
- Add CSRF protection.
- Rate limit sign-in endpoint.
- Lock out repeated failed attempts temporarily.

## F. Error messages (safe format)

Use generic messages:

- `Unable to sign in. Please try again.`
- `Login was cancelled.`
- `Session expired. Please sign in again.`

Avoid messages like:

- `This email does not exist`
- `Wrong password for this account`

## G. Auth0 mapping

If using Auth0 Universal Login:

- Social buttons are configured from Auth0 connections.
- Email/password box comes from Auth0 database connection.
- Password reset flow comes from Auth0.

If using custom app login screen:

- Your buttons redirect to Auth0 authorization endpoint.
- Callback processing still handled by Auth0 SDK.

## H. QA acceptance checklist

- [ ] Google login works.
- [ ] Microsoft login works.
- [ ] GitHub login works.
- [ ] Email/password fallback works (if enabled).
- [ ] Forgot password flow works.
- [ ] Error states are user-friendly and safe.
- [ ] Mobile layout is correct.
