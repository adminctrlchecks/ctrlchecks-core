# Task — OAuth completion must be verification-based (universal, all nodes)

## Background: what already works, do NOT redo

The node-selection screen (`localhost:8080/workflow/ai`, step `capability-node-selection`,
`ctrl_checks/src/components/workflow/CapabilityStage.tsx`) already has, landed and tested:

- **One credential resolver.** `credentialRequirementForNode()` in
  `worker/src/services/credential-scope-registry.ts` is the single answer to "does this node
  need a credential". It gained a universal fallback to the node registry's own
  `credentialSchema`. Previously two resolvers disagreed on 73 of 178 node types.
  `worker/src/services/__tests__/credential-resolver-parity.test.ts` holds this. MUST KEEP PASSING.
- **`NodeConnectionChip`** with states `not-required | connected | needs-connection | connecting | checking`.
- **One-click connect.** `ctrl_checks/src/hooks/useNodeConnect.ts` starts OAuth directly from the
  chip. Only API-key providers open a dialog (`NodeConnectFormDialog`).
- **Up-front status for every candidate.** `POST /api/capability-selection/connection-status`
  (`worker/src/api/capability-selection/connection-status.ts`) — presence-only, ONE
  `listCanonicalConnections(userId)` read, no token resolution or refresh. Safe across the whole
  candidate list. **Reuse this; do not build another endpoint.**
- **Scope-aware gate.** `POST /api/capability-selection/connection-readiness` — restricted to
  SELECTED nodes because it can refresh OAuth tokens. Overrides the presence check.
- Continue is gated + tooltip; `CapabilityReviewStep` is a two-column full-width layout.

---

## The bug to fix

Connecting Slack from localhost spins on "Connecting…" forever. Google works. **This is not
node-specific — it is how OAuth completion is detected.**

Verified facts:

1. 4 of 33 providers have redirect URIs pointing at production instead of localhost:
   **Slack, GitHub, LinkedIn, HubSpot** (`GENERIC_SLACK_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/...`).
2. Production **is** running the relay code. Probing
   `https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback?code=probe&state=probe`
   returns a redirect to `.../auth/oauth-relay`.
3. `frontendOrigin()` in `worker/src/api/credential-connections.ts` is
   `new URL(returnTo).origin` with no allowlist — so **on success** prod correctly bounces the
   popup back to `http://localhost:8080/auth/oauth-relay` and the wizard hears it.
4. **The callback ERROR path drops `returnTo`:**

   ```ts
   } catch (error) {
     ...
     return res.status(200).send(oauthCallbackHtml({ type: 'oauth-error', message }));
     //                                              ^ no returnTo
   }
   ```

   So failures fall back to `process.env.FRONTEND_URL` (`https://www.ctrlchecks.ai`) and the
   localhost wizard is never told anything. The result is an infinite spinner instead of an error.
   **This swallows every OAuth failure for every provider, including real users in production.**

Local `.env` points at the production RDS and sets `ENCRYPTION_KEY` (64 chars);
`CREDENTIAL_ENCRYPTION_KEY` is unset so `secret-crypto.ts` falls back to it. Keys are therefore
almost certainly shared between local and prod — treat key mismatch as unlikely, not a blocker.

---

## HARD CONSTRAINTS

1. **Do NOT change any OAuth redirect URI, `.env` value, or provider console setting.** The
   redirect target stays as-is. The UI must verify against the connections system and update
   itself.
2. **Universal only.** No `if (provider === 'slack')`, no per-node lists. Fix at the
   resolver/endpoint level so every current and future node inherits it.
3. **Do NOT fan out `/connection-readiness`** across all candidates — it can refresh OAuth
   tokens. It stays restricted to selected nodes (plus nodes the user explicitly connected).
   Use `/connection-status` for the broad check.
4. **Do NOT modify `ctrl_checks/src/components/connections/*`** (`OAuthConnectButton`,
   `CredentialFormRenderer`, `ProviderLogo`, `ServicePickerGrid`) — shared with `/connections`
   and the properties panel. Compose them.
5. **Do NOT pass `scopes` when starting OAuth.** The backend treats `scopes` as a REPLACEMENT for
   the credential type's registered `defaultScopes`
   (`oauth-service.ts`: `input.scopes?.length ? input.scopes : definition.oauth2.defaultScopes`).
   Passing the gate's per-node minimum previously made Google reject the request outright.
   There is a test asserting no `scopes`/`requiredScopes` is sent — keep it.
6. **Do NOT widen `allowedOrigins`** in `useOAuthFlow` to accept the production origin. That would
   trust messages from an origin the user is not on, and still would not cover connecting in
   another tab.
7. `NodeConnectPopover` has three mount points (`NodeOwnershipCard`, `AutonomousAgentWizard`, and
   its own tests). Keep its public props identical.

---

## Work to do

### 1. Preserve `returnTo` on the OAuth error path — DO THIS FIRST, ALONE

`worker/src/api/credential-connections.ts` + `worker/src/credentials-system/oauth-service.ts`.

- Resolve the `oauth_states` row (and its `return_to`) **before** the token exchange, so a
  later failure can still be reported to the right origin.
- Have `oauthService.callback` attach `returnTo` to the thrown error (e.g. a typed error with a
  `returnTo` field), and have `oauthCallbackHandler` pass it into `oauthCallbackHtml`.
- When the state row genuinely cannot be found, `returnTo` is unknowable — keep the existing
  `FRONTEND_URL` fallback for that case only.

**Then stop and retry Slack in the browser.** The real error message will finally surface, and it
determines whether anything beyond step 2 is needed. Report that error before continuing.

### 2. Verification-based completion (the core change)

The OAuth popup message becomes a *hint*. The source of truth is `/connection-status`.

In `ctrl_checks/src/hooks/useNodeConnect.ts`:
- Add an `unverified` outcome. When the popup closes/times out without a success message, return
  `unverified` rather than `error` — the connection may well have saved.

In `ctrl_checks/src/components/workflow/CapabilityStage.tsx`:
- **Poll while a connect is in flight**: re-fetch `/connection-status` every ~2.5s, give up after
  ~2 min, stop immediately once the node flips to connected. Cancel on unmount.
- **Refresh on tab focus / `visibilitychange`**: connecting on the `/connections` page in another
  tab must make this screen go green on return. This is the piece that makes it work regardless
  of which origin the callback lands on.
- **Verify before reporting failure**: only surface `connectError` if status still says
  unconnected after the popup ends. A saved-but-unannounced connection must turn green.
- Keep the existing "re-check every candidate after a connection" behaviour and the
  `connectedNodeTypes` set feeding `readinessNodeTypes`.

Guard against overlapping/stale polls (nonce or abort flag) so a slow response cannot overwrite a
newer one.

### 3. Two cosmetic bugs visible in the UI

- `selectedNodeTypes` is `Object.values(selections)` with **no dedupe**, so selecting the same
  node type in two containers renders "2 services still need connecting — Slack, Slack".
- `connectingNodeType` is a single string compared against `candidate.nodeType`, so one click
  spins the chip on **every** candidate sharing that node type. Key it per container + node type.

### 4. Tests

Extend `ctrl_checks/src/components/workflow/__tests__/CapabilityStage.connections.test.tsx`
(29 tests, imports the real component — meaningful. The `AutonomousAgentWizard` tests copy logic
instead of importing it and stay green through any refactor; do not add coverage there).

Cover:
- popup ends unverified BUT status says connected → chip turns green, **no error shown**
- popup ends unverified AND status says unconnected → error shown
- polling stops once connected, and stops at the bound
- regaining tab focus re-checks status
- same node type in two containers → notice names it once; only the clicked chip shows `connecting`

Worker: a test that a token-exchange failure still routes the relay to the request's `returnTo`
origin, and that an unknown state falls back to `FRONTEND_URL`.

---

## Verification

Run **single test files only** — never `npm test` or a full suite (it crashes this machine):

```bash
cd ctrl_checks && npx vitest run src/components/workflow/__tests__/CapabilityStage.connections.test.tsx
cd ctrl_checks && npx vitest run src/components/workflow/field-ownership/__tests__/FieldOwnershipStage.test.tsx
cd worker && npx jest src/api/capability-selection/__tests__/ --coverage=false
cd worker && npx jest src/services/__tests__/credential-resolver-parity.test.ts --coverage=false
cd worker && npm run type-check
cd ctrl_checks && npx tsc --noEmit -p tsconfig.json
```

Browser: connect **Google** (redirect on localhost) and **Slack** (redirect on production) — they
exercise the two different completion paths, which is the whole point. Also connect something on
`/connections` in a second tab and confirm this screen updates on focus.

Note: the worker can run orphaned without its nodemon parent and silently serve stale code. If a
live test contradicts the code, check the process start time against file mtimes first. A worker
restart is required to pick up backend route changes.

Report honestly what passed and what did not. Do not claim browser verification you did not perform.
