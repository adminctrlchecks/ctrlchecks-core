# 08 - Testing and Go-Live Checklist

Use this checklist before production release.

## Functional checks

- [ ] Google login works from start to dashboard.
- [ ] Microsoft login works from start to dashboard.
- [ ] GitHub login works from start to dashboard.
- [ ] Logout works and session is removed.
- [ ] Protected routes reject unauthenticated users.

## Error path checks

- [ ] User cancels provider consent -> app shows friendly error.
- [ ] Invalid callback -> app handles gracefully.
- [ ] Expired session -> user is redirected to login.

## Security checks

- [ ] Production URLs use HTTPS only.
- [ ] No client secret exposed in frontend code.
- [ ] Cookies are `Secure` and `HttpOnly`.
- [ ] Token validation uses correct issuer and audience.
- [ ] Sensitive actions require active session validation.

## Environment checks

- [ ] Dev, staging, and prod callback URLs are correct.
- [ ] Auth0 application settings match each environment.
- [ ] Provider apps (Google/Microsoft/GitHub) include production callback.

## Operations checks

- [ ] Login errors are visible in monitoring/logs.
- [ ] Alerting exists for sudden auth failure spikes.
- [ ] Support team has troubleshooting playbook.

## Go-live decision

Release only when every checkbox above is completed.
