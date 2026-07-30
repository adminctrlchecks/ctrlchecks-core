# Node-Selection Connection Gate & Connect-Chip Redesign — Plan

Status: **Proposed — not implemented.** No application code has been changed.
Audit results in §2 are **measured**, not estimated (script run against the live registry, then deleted).

Scope: the capability/node-selection screen of the AI workflow wizard
(`localhost:8080/workflow/ai`, step `capability-node-selection`).

---

## 1. What was asked

1. Replace the Wi-Fi "Connected" pill with a **rectangular chip carrying the node's icon** — green
   when satisfied, actionable **"Connect"** when not.
2. Clicking Connect opens the node connection UI without losing the user's place in the wizard.
3. **Continue stays disabled** until every selected node is connected; hovering explains why.
4. Must work **for all nodes, end to end**, with UI, backend, DB and routing properly aligned.

---

## 2. THE ROOT CAUSE — two credential resolvers that disagree on 73 of 178 nodes

The screen is not "missing a gate". It has **two independent answers** to *"does this node need a
credential?"*, and they contradict each other:

| Layer | Resolver | Nodes it says need a credential |
|---|---|---|
| Chip / cheap check | `unifiedNodeRegistry.getRequiredCredentials()` — [capability-grouper-stage.ts:263](worker/src/services/ai/stages/capability-grouper-stage.ts#L263) | 48 |
| Authoritative gate | `credentialRequirementForNode()` — [credential-scope-registry.ts:206](worker/src/services/credential-scope-registry.ts#L206) | 95 |

**Measured divergence across all 178 registered node types:**

```
agree - no credential needed      : 72
agree - credential needed         : 37
>> NO CHIP  (gate=needs, chip=no) : 58   <-- green "Connected", no Connect button
>> UNGATED  (chip=needs, gate=no) : 11   <-- runs with NO credential
>> PROVIDER MISMATCH              :  4   <-- Connect button connects the wrong service
>> DEAD END (needs, no provider)  :  0
```

### 2.1 This is exactly what your screenshot shows

`google_sheets` and `airtable` are both in the **58**. The chip layer believes they need *nothing*,
so `hasCredentials` is hard-set to `true`:

```ts
// capability-grouper-stage.ts (~L266)
if (requirements.length === 0) { hasCredentials = true; }   // "No credentials required"
```

That is why Google Sheets, Airtable **and** Manual Trigger all render an identical green
"Connected" pill. Manual Trigger is honestly credential-free; the other two are **mislabelled**.
Nothing on that screen was actually verified against your account.

Behaviour today, once the user selects Google Sheets: authoritative readiness runs, returns
`connected: false`, and the chip **flips from green "Connected" to "Google — connect"**. The gate
does eventually block Continue — but only after showing a green badge that was never true.

### 2.2 The genuinely dangerous class — the 11 UNGATED

`firebase, odoo, vercel, xero, contentful, wordpress, zendesk, cohere, langchain, huggingface, mistral`

Chip says a credential is needed; the gate produces **no row**, and the endpoint reads a missing
row as `connected: true` ([connection-readiness.ts:120-126](worker/src/api/capability-selection/connection-readiness.ts#L120-L126)).
So the chip goes green, **Continue enables, and the node executes with no credential** — failing at
runtime instead of at the gate. These are not blocked today.

### 2.3 The 4 PROVIDER MISMATCH nodes create an unfixable loop

| Node | Chip connects | Gate demands |
|---|---|---|
| `whatsapp`, `whatsapp_cloud` | `facebook` | `whatsapp` |
| `instagram` | `facebook` | `instagram` |
| `discord_webhook` | `discord_webhook` | `discord` |

The user clicks Connect, completes OAuth for the provider the chip named, and the gate **still**
reports not-connected — with no other affordance on the screen. Dead loop.

### 2.4 The gate also fails OPEN on backend error

[connection-readiness.ts:158-167](worker/src/api/capability-selection/connection-readiness.ts#L158-L167)
returns `connected: true` for every node in its `catch`. Because authoritative rows override the
cheap check, any exception silently unblocks Continue.

---

## 3. What already works (keep it)

The verification machinery itself is sound and genuinely DB-backed per user:

```
chip Connect
  → OAuthConnectButton / CredentialFormRenderer     (components/connections/*)
  → createConnection()  → POST /api/connections
  → connections table   (userId, provider, authType, credentialTypeId, status, expiresAt, scopes)
  → invalidateAfterConnectionChange() + connectionNonce++
  → POST /api/capability-selection/connection-readiness   [selected node types only]
      → getWorkflowConnectionReadiness({ userId, nodes })
      → listCanonicalConnectionsByProvider(userId, provider, authTypes)
           filters: canonical provider match, status==='active', not expired
      → dryRunCredential() → resolveCredentialDryRun()
           ready | missing_scope | expired | revoked | runtime_missing | error
  → connected:true/false → chip turns green → Continue enables
```

- Keyed on **userId + provider** — *not* a workflow id. No workflow exists at this step; the
  endpoint fabricates synthetic nodes under `SYNTHETIC_WORKFLOW_ID` and never persists them.
- `dryRunCredential` is the **same resolution path execution uses**, so green means the token
  really exists, is unexpired, unrevoked, and carries the required scopes.
- Readiness is fetched for **selected nodes only** — that path can trigger a real OAuth token
  refresh ([documented here](worker/src/api/capability-selection/connection-readiness.ts#L17-L24)).
  **This constraint must survive the redesign.**

---

## 4. Confirmed design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Connect surface | **In-wizard side panel (`Sheet`)** | `AutonomousAgentWizard.tsx` has **zero** `sessionStorage`/`localStorage`; navigating to `/connections` would destroy the prompt, the LLM-generated containers and all selections. OAuth is a popup, so the page stays mounted. |
| Nodes needing no credentials | **Neutral "No setup needed" chip** | Green must keep meaning "you connected this". |

---

## 5. Implementation phases

### Phase 1 — Collapse the two resolvers into one *(the fix everything else depends on)*

Per CLAUDE.md's single-source-of-truth rule there must be **one** answer. Adopt
`credentialRequirementForNode()` as that answer, because it is more complete (95 vs 48),
scope-aware, and already the thing that actually blocks.

1. `hydrateCandidateNode()` in `capability-grouper-stage.ts` calls
   `credentialRequirementForNode(nodeType)` instead of
   `unifiedNodeRegistry.getRequiredCredentials(nodeType)`.
   → resolves all **58** NO-CHIP and all **4** PROVIDER-MISMATCH nodes at once.
2. Backfill the **11** UNGATED nodes into the connector registry so the gate covers them.
   → after this, chip coverage and gate coverage are identical by construction.
3. Add a **startup integrity check** mirroring the existing 178-node one: assert the two
   resolvers agree, and fail loudly on drift. Prevents silent regression as nodes are added.
   Ship the audit as a permanent test rather than a throwaway script.
4. Flip the `catch` in `connection-readiness.ts` to `connected: false` + `status: 'error'` so a
   failed check **blocks** rather than passes.

*No `if (node.type === ...)` anywhere — everything stays registry-driven, so new nodes inherit it.*

### Phase 2 — Add "not required" as a real state

`connected: true` currently means both "verified" and "nothing to verify".

1. Add `credentialRequired: boolean` to `CapabilityConnectionReadinessNode`; `false` only in the
   genuine no-requirement branch, `true` otherwise (and in the error path).
2. Mirror the field in `ctrl_checks/src/lib/api/capabilityConnectionReadiness.ts`.
3. Frontend fallback before readiness resolves: `candidate.credentialRequirements.length === 0`.

### Phase 3 — `NodeConnectionChip`

New `NodeConnectionChip.tsx` + a shared `node-icon.ts` resolver (lucide name → component,
`Box` fallback; four duplicated `iconMap`s already exist — add one shared resolver, don't add a fifth).

```ts
type NodeConnectionStatus = 'not-required' | 'connected' | 'needs-connection' | 'checking';
```

| Status | Visual | Action |
|---|---|---|
| `not-required` | Muted rectangle, node icon, "No setup needed" | inert |
| `connected` | **Green** rectangle, provider logo, "Connected" | inert |
| `needs-connection` | Amber rectangle, provider logo, "Connect {service}" | opens panel |
| `checking` | Skeleton chip | inert |

Fixed height (`rounded-md border px-2.5 py-1.5`), 16–18px icon — all four states occupy identical
space so the row never reflows when status resolves. Icon precedence:
`ProviderLogo(provider)` → node lucide icon → `Box`. `ProviderLogo` already degrades to coloured
initials, so it cannot render blank. Replaces `CredentialBadge`
([CapabilityStage.tsx:66-106](ctrl_checks/src/components/workflow/CapabilityStage.tsx#L66-L106)).

### Phase 4 — In-wizard connect panel

`NodeConnectPopover` has **three** mount points — `CapabilityStage`, `NodeOwnershipCard`
([:117](ctrl_checks/src/components/workflow/field-ownership/NodeOwnershipCard.tsx#L117)) and
`AutonomousAgentWizard` — so it must not be replaced in place.

1. Extract its body ([NodeConnectPopover.tsx:60-145](ctrl_checks/src/components/workflow/NodeConnectPopover.tsx#L60-L145))
   into `NodeConnectPanelBody.tsx`.
2. `NodeConnectPopover` re-renders that body → all three mounts keep working, existing test mocks stay valid.
3. New `NodeConnectSheet.tsx` renders the same body in `ui/sheet`, opened by the chip.
4. Success reuses the existing `onConnected` → `setConnectionNonce(n => n + 1)`
   ([CapabilityStage.tsx:547](ctrl_checks/src/components/workflow/CapabilityStage.tsx#L547)), which
   already re-runs readiness. Chip flips to green with no reload.
5. Escape hatch: `/connections?service=X&returnTo=...` — already supported
   ([Connections.tsx:217-219](ctrl_checks/src/pages/Connections.tsx#L217-L219), auto-opens at
   [:338-357](ctrl_checks/src/pages/Connections.tsx#L338-L357)) — for credential types the panel can't render.

### Phase 5 — Gate polish

1. Wrap Continue in a `Tooltip`. **A disabled `<button>` emits no pointer events**, so the trigger
   must be a wrapping `<span tabIndex={0}>`, not the button.
2. Copy by cause: unconnected → `Connect all selected nodes first — {names}`;
   `readinessLoading` → `Checking connections…`; incomplete selection → existing `validation.message`.
3. Keep `aria-disabled` + `title` for screen readers.
4. Update the left-rail `connection-gate-notice` copy to match the new chip wording.

### Phase 6 — Tests

Extend `__tests__/CapabilityStage.connections.test.tsx` — this suite **imports the real component**
(unlike the `AutonomousAgentWizard` tests, which mirror logic rather than importing it), so its
assertions are meaningful:

- `not-required` renders "No setup needed" and no Connect action.
- `connected` renders green; `needs-connection` renders actionable.
- Continue disabled + tooltip text while a selected node is unconnected.
- Connecting flips the chip and enables Continue.
- Preserved: readiness never queried for unselected candidates.

Worker: resolver-parity test (Phase 1.3) over all 178 types; `credentialRequired` on both branches;
`catch` path now blocks.

Run **single files only** (`npx vitest run <path>`, `npx jest <path>`) — never the full suite
locally. Plus `npm run type-check` (worker) and `npm run lint` (frontend).

---

## 6. Out of scope

`/connections` page internals, `components/connections/*`, the workflow-canvas gate, wizard state
persistence, refactoring the four `iconMap`s beyond the shared resolver, loosening the
selected-nodes-only readiness scope.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Phase 1 changes which nodes demand credentials → workflows that "worked" now block | Intended: they were failing at runtime instead. Land Phase 1 behind the parity test and review the 11+4 list before shipping. |
| Backfilling 11 nodes needs correct provider/scope data | Derive from each node's existing `credentialSchema`; verify per node against its OAuth app. |
| Extracting the popover body breaks field-ownership | Popover keeps its exact public props; run `FieldOwnershipStage.test.tsx`. |
| Sheet focus trap blocks the OAuth popup | OAuth is `window.open` + BroadcastChannel; verify live for one OAuth and one API-key provider. |
| Backend `credentialRequired` deployed after frontend | Frontend falls back to `credentialRequirements.length === 0`. |
