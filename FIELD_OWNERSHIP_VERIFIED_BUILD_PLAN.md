# Field Ownership → First Run — Redesign Plan (v4, repo-verified)

Status: **Planning only. No application code changed.**
Verified against the repository on 2026-07-28. Every claim below was re-checked against the live source; corrections to v3 are marked **[CORRECTED]**.

> ### ▶ Ready to implement — paste the self-looping prompt in §8.
> It runs all twelve phases as `plan → implement → test → commit → record → re-plan next`, looping until done. Each phase is planned immediately before it is built, so later plans are informed by what earlier phases actually taught.
> One mandatory pause before Phase 7b, the first code that sends real emails and messages. §8-legacy holds the older static two-run prompts.
> **§6c** covers what still needs figuring out after 0–4 — including a verified scope boundary: templates and canvas edits never reach this flow at all.

Scope: the `field-ownership` step of the AI workflow wizard, the steps around it (`credentials`, `configuration`, `building`, `complete`), the connection gate that should precede it, and the handoff into `/workflow/:id`.

**Version history:** v1 argued against executing nodes during setup. v2 reversed that. v3 settled consent via an explicit per-node Test action. **v4 is the first version audited against the repo** — it corrects four material errors in v3, one of which invalidated the Phase-0 safety plan.

---

## 0. Audit Summary — What Changed From v3

| # | v3 said | Reality | Impact |
|---|---|---|---|
| 1 | Phase 0's safety net is "existing tests pass untouched" | **The two wizard tests re-implement the logic instead of importing it.** They never import or render `AutonomousAgentWizard.tsx`. | **Critical.** The stated acceptance criterion proves nothing. Characterization tests must be written *before* the refactor. |
| 2 | `buildRuntimeValidationGuidance()` is the seam for mapping provider errors to fields | It only maps **runtime input-validation** failures already present on the node output. It does **not** interpret provider/API errors (Google 404, Slack `channel_not_found`). | **Major.** The §2.2 guidance card is under-scoped; a provider-error→field mapping layer must be built from scratch. |
| 3 | Create `ctrl_checks/src/lib/wizard-field-ownership.ts` in Phase 0 | **The file already exists** (209 lines) with `buildFieldOwnershipCopy`, `humanizeFieldName`, `findFieldDocForQuestion`, `FieldDesc`. | Phase 0 **extends**, not creates. |
| 4 | `generated-node-operation-contracts.ts` might be machine-generated | It is **not** — no script writes it, no auto-gen header. But the correct home for `firstRunClass` is `NodeOperationContract` in `unified-node-contract.ts:389`. | Resolved favourably; target file changed. |
| 5 | Various line numbers | File grew to **8,876** lines this session. Wrapper moved `5784 → 5795`; `Proceed To Credentials` `7210 → 7211`. | References updated. |

**Everything else in v3's §3.5 reuse table verified as accurate.**

---

## 1. The Concept (unchanged)

> **The wizard's last step is not a rehearsal. It is the workflow's first real execution, performed during setup, with the user's explicit consent, one node at a time.**

- A real Slack post is **the deliverable**, not a side effect — the user built a workflow whose purpose is to post to Slack.
- The run is recorded as **execution #1**, which is why the canvas opens with real logs.
- A wrong field is wrong *now*, on the screen where the user is already typing.
- Re-running later produces the output again. Expected and correct.

---

## 2. Settled Decisions (unchanged from v3, still valid after audit)

### 2.1 Consent lives in an explicit per-node Test action

Copy states the effect before it happens:

> **Test this step** — Checks your Slack connection works, then **posts the message to `#alerts`**.

| Class | Examples | Behaviour |
|---|---|---|
| `none` / `read` | trigger shaping, Sheets `read`, HTTP `GET`, transforms, logic, AI | **Auto-runs** when inputs complete. Nothing leaves the system. |
| `write` | send message/email, append row, create issue, `POST`/`PUT` | **Explicit Test action**, copy names the real effect and target. |
| `destructive` | delete, archive, payment, bulk overwrite | Explicit Test action, stronger confirm, no auto-advance. |

**[CORRECTED] Declaration site:** add to `NodeOperationContract` (`worker/src/core/types/unified-node-contract.ts:389`), defaulting to `'write'`:

```ts
firstRunClass?: 'none' | 'read' | 'write' | 'destructive';   // default 'write'
```

Per-node values populate in `generated-node-operation-contracts.ts` (hand-maintained despite its name). No `switch (node.type)` elsewhere — CLAUDE.md single-source-of-truth rule.

### 2.2 Guidance, never errors — **[CORRECTED: larger than v3 assumed]**

Every failure resolves to: **what happened** → **why** → **what to do next** → **the field, editable inline**. Technical detail behind a collapsed disclosure. No red alerts, no stack traces, no toasts.

**The audit found this is not a thin wrapper over existing code.** `buildRuntimeValidationGuidance()` (`worker/src/core/utils/runtime-validation-guidance.ts:102`) reads `_validationErrors`, `_runtimeInputAudit` and `_runtimeInputHandoffAudit` off a node's output and maps *those* to fields. It handles "you didn't supply a required runtime field". It does **nothing** with a provider's own error — a Google Sheets 404, a Slack `channel_not_found`, a Gmail 403 insufficient-scope.

Since the entire value of the first run is surfacing exactly those provider errors, a **new provider-error→field mapping layer** is required:

- a per-provider error interpreter (registry-level, alongside the override files in `worker/src/core/registry/overrides/`),
- a default fallback that attributes an unmapped error to the node rather than a field, with generic next-steps,
- `buildRuntimeValidationGuidance()` composed in for the input-validation half.

This is **its own phase**, not a line item. See Phase 7a.

### 2.3 Fan-out capped during the first run

`loop` and `split_in_batches` exist in the registry. Uncapped, *"read customers → email each"* on a 500-row sheet sends **500 real emails** during setup. **A collection output is sampled to 1 record before feeding a downstream fan-out.** Shown as *"Ran with 1 of 24 rows — the full set runs when you execute the workflow."*

### 2.4 **[REVISED] Connections are established at node selection — not in a separate step**

**Earlier drafts proposed a standalone `connections` step between capability-review and field-ownership. That is now dropped** in favour of connecting *at the moment of choosing the node*, which is both simpler and removes a whole round-trip.

The node-selection screen (`CapabilityStage.tsx`) **already shows per-candidate connection state** — the `Connected` / `Not connected` badge is driven by `CandidateNode.hasCredentials`, computed server-side in `capability-grouper-stage.ts:255-296` by a live vault lookup. The information is on screen; it is simply not actionable.

**The design:**

1. The connection badge on a candidate row becomes **clickable** — labelled with the node it serves (e.g. *"Google Sheets — connect"*).
2. Clicking opens the connect affordance inline (OAuth launch, or an API-key form for key-based providers), composed from `components/connections/*` **without modifying those components** (§2.5).
3. Selection state is persisted before any OAuth redirect and restored on return, so the user comes back to exactly the choices they had made.
4. **`Continue` is gated on every *selected* node being connected.** Unselected candidates are irrelevant — the user is not made to connect Gmail just because it was offered alongside Slack.
5. Nodes requiring no credentials (`manual_trigger`, logic, transforms) are satisfied automatically — `hasCredentials` already returns `true` for them.

**Consequence:** by the time the user reaches field ownership, every selected node is connected, so a node becomes runnable the instant its fields are filled. No separate step, no back-and-forth, no repeated credential prompts.

**Safety net, not a second step:** the generation pipeline can inject nodes the user never explicitly selected (a `manual_trigger` where none existed, terminal `log_output`). If such a node needs a credential, the *same* inline connect component renders inside its field-ownership card as guidance. One component, two mount points — not a repeated stage.

#### Three verified gaps this phase must close

| Gap | Evidence | Fix |
|---|---|---|
| **`hasCredentials` is weaker than the downstream gate.** It is `checks.some(Boolean)` — a node needing two credentials reads "Connected" with only one — and it checks `vault.exists(userId, provider)`, which is **provider-level, not scope-aware**. `/missing-items` + `workflow-connection-readiness` *are* scope-aware (they handle Gmail `gmail.send`). A node can therefore show "Connected" here and still fail readiness later. | `capability-grouper-stage.ts:278-283` | Make the badge authoritative: require **all** requirements satisfied (`every`, not `some`) and route the check through the same scope-aware readiness service the rest of the app uses. Until then the badge must not be treated as a hard guarantee. |
| **OAuth return loses node selections.** `checkOAuthReturn` (`:868-925`) restores only `pendingWorkflowData.discoveredCredentials`. It does not touch `capNodeContainers`, `capNodeSelections`, `capNodeCorrelationId`, `capNodeStructuralPrompt`, `capNodeWorkflow` (`:753-763`). Returning from OAuth mid-selection would drop the user's choices. | `:868`, `:753-763` | Extend the persisted snapshot to include capability-stage state, and restore it on return. |
| **The OAuth round-trip is Google-only and currently orphaned.** `checkOAuthReturn` hardcodes `fetchRuntimeCredentialStatus('google')`; the only writer of `pendingWorkflowAfterOAuth` is `handleConnectGoogleOAuth` (`:3328`), which is dead code never called from JSX (§3.11). | `:881`, `:3312` | Generalise the return handler to any provider, and wire it to the new connect affordance. |

### 2.5 **[NEW] Non-regression contract — existing connection flows must keep working**

Connections already work today **outside** the wizard: on the workflow/canvas page, on the standalone `/connections` page, and per-node in the properties panel. Users depend on those paths for manually-built workflows and every other use case. **This project must not disturb them.**

Verified shared surfaces and the rule for each:

| Shared surface | Used by | Rule |
|---|---|---|
| `components/connections/*` — `OAuthConnectButton`, `CredentialFormRenderer`, `ConnectionCard`, `ConnectionStatusBadge`, `ProviderLogo`, `ServicePickerGrid`, `NewConnectionModal` | `pages/Connections.tsx`, `WorkflowConnectionGate.tsx`, `WorkflowHeader.tsx`, `NodeCredentialSelector.tsx` | **Consume, do not modify.** If a variant is needed, add an optional prop whose default preserves today's behaviour, or wrap the component. Never change internals or required props. |
| `GET /api/workflows/:id/missing-items` | `useWorkflowConnectionStatus.ts:297` (workflow-page gate), and the wizard already at `:809`, `:3081`, `:4595` | **Additive only.** New response fields are fine; renaming or removing any existing field breaks the canvas gate. |
| `useWorkflowConnectionStatus` + its tests | workflow page gate | Do not change its contract. |
| `executeNode()` (`execute-workflow.ts:2650`) | full workflow execution, `/api/execute-node` (debug panel) | **Do not modify.** First-run policy, consent gating and fan-out sampling live in the *new* `/api/workflow-build/*` callers, never inside `executeNode`. |
| `buildWorkflowReadinessEnvelope`, `node-readiness-resolver` | `/api/execute-node`, execute-workflow | Read-only / additive. |
| `NodeOperationContract` | registry, field policy, node-definitions API | `firstRunClass` is **optional** with a safe default — purely additive. |
| Registry overrides (`core/registry/overrides/*`) | live execution of every workflow | Phase 7a may only **add** an error `code` on paths that already fail. Success paths and thrown behaviour must be untouched. |

**Practical consequence:** every phase adds new files and new routes rather than editing shared ones. Where a shared file must change, the change is additive and its existing tests (`WorkflowConnectionGate.setup.test.tsx`, `WorkflowHeader.setup.test.tsx`, `useWorkflowConnectionStatus.test.ts`, `connections/__tests__/*`) must pass **unmodified** — and unlike the wizard tests (§3.7), those are real tests that genuinely exercise their components, so they are a trustworthy net.

### 2.6 The honest promise

UI says **"Verified — ran successfully on <date>"**, never "this can never fail." Build-time execution proves configuration, credentials, template resolution and data shape. It cannot prevent an expired token at 3am.

---

## 3. Verified Current State

### 3.1 Wizard step machine

`ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx` — **8,876 lines** [CORRECTED].

```
idle → analyzing → summarize → questioning → capability-selection
     → refining → confirmation → field-ownership → credentials → configuration
     → building → complete
```

Parallel FSM in `ctrl_checks/src/lib/workflow-generation-state.ts` must move in lockstep with any step change.

### 3.2 **[NEW FINDING] Only one path is live**

`handleAnalyze` (`:1803`) begins:

```ts
const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    // Always use the new 3-phase capability-node-selection flow.
    await handleCapabilityNodeSelectionAnalyze();
    return;
    // ~200 lines of unreachable legacy code follow
```

**Everything after `:1808` in that function is dead.** The live route is:

```
handleAnalyze → handleCapabilityNodeSelectionAnalyze → capability-node-selection
  → capability-review → handleCapabilityNodeSelectionConfirm (:5492)
  → /api/capability-selection/confirm → setStep('field-ownership') (:5666)
```

`setStep('field-ownership')` also appears at `:2821`, `:2830`, `:4282` — all on legacy paths behind the dead `handleAnalyze` body or the old credential flow. **The plan only needs to serve the `:5666` path.** This materially de-risks the work and should be confirmed once more before Phase 5 deletes anything.

### 3.3 Intent Context leaks into field ownership

`:5729-5733` — `showIntentContextCard` true for every post-analysis step. `isCapabilitySelectionFlow` (`:5734`, added this session) gives the node-selection steps a simplified variant; `field-ownership` still gets the full card with "Edit intent" / "Restart".

### 3.4 Close already behaves correctly

`:3282-3299` — confirms, best-effort deletes the uncommitted draft (`.eq('setup_completed', false)`), navigates to `/workflows`. **No new button needed.**

### 3.5 The field-ownership block

`:6584-7218`, ~635 lines, ~20 levels deep. Ends at `Proceed To Credentials` (`:7211`) [CORRECTED], which calls `proceedFromOwnershipStage` (`:5338`) → jumps straight to `configuration`, skipping `credentials`. The value preview at `:7128` still reads *"Current value in workflow (edit on Configuration step)"*.

### 3.6 **[NEW] Complete coupling inventory — the Phase 0 prerequisite**

**Own state (safe to move):**

| State | Line | Setter |
|---|---|---|
| `fieldEnabledOverrides` | 599 | `setFieldEnabledOverrides` |
| `nodeDescriptions` | 644 | `setNodeDescriptions` |
| `fieldDescriptions` | 648 | `setFieldDescriptions` |
| `appliedExampleKeys` | 655 | `setAppliedExampleKeys` |
| `fieldHelpExpanded` | 656 | `setFieldHelpExpanded` |
| `credentialUnlockOverrides` | 767 | `setCredentialUnlockOverrides` |
| `credHelpExpanded` / `credHelpViewMode` | 769 / 771 | — |
| `guideSelectedField` | 779 | `setGuideSelectedField` |
| `fieldDescFetchedRef` | ref | — |

**⚠️ SHARED state (must be passed as props — moving it breaks other steps):**

| State | Line | Also used by |
|---|---|---|
| `inputValues` | 594 | `configuration` step (`:7692-7750`), `handleBuild` (`:3450`, `:3470`) |
| `credentialValues` | 591 | `configuration` (`:7271-7616`), `handleBuild` (`:3563-3582`), `:3808`, `:3868`, `:6520` |
| `fillModeValues` | 596 | `:2774`, `:2901`, `:5182`, `:5197`, `:5622`, derived modes at `:1071-1275` |
| `appliedFieldGuidanceExamples` | 652 | `handleBuild` metadata (`:3388`) |
| `pendingWorkflowData` | 695 | most steps |

**Derived (`useMemo`/`useCallback`):** `fieldPlaneRows` (1010), `isCredentialUnlocked` (1054), `ownershipEffectiveModes` (1062), `blockingOAuthCredentials` (1335), `ownershipStructuralByNode` (1489), `ownershipSecretsByNode` (1494).

**Handlers:** `fetchNodeDescription` (5012), `fetchFieldDescriptions` (5062), `startGlobalWalkThrough` (5205), `proceedFromOwnershipStage` (5338).

**Already-extracted helpers to reuse:** `explainWizardOwnershipRow`, `buildFieldPlaneRows`, `findPlaneRow` (`wizard-field-plane.ts`); `buildFieldOwnershipCopy` (`wizard-field-ownership.ts` — **exists**); `prepareActionableFieldExample` (`actionable-field-example.ts`); `resolveWizardFieldFillMode` (`fillMode.ts`); `snapshotConfigFieldToString` (`wizard-config-snapshot.ts`); `FieldOwnershipHelpPanel.tsx` (315 lines, reuse as-is).

### 3.7 **[CRITICAL CORRECTION] The tests cannot protect this refactor**

| Test | What it actually does |
|---|---|
| `AutonomousAgentWizard.preservation.test.ts` | **Re-implements** the logic locally — *"Shared type and logic (mirrors AutonomousAgentWizard.tsx configuration step)"*. Never imports the component. |
| `AutonomousAgentWizard.stage-gating.test.ts` | Same pattern — local `derivePromptComposerVisibility` copy. |
| `FieldOwnershipHelpPanel.test.tsx` | Genuine — tests that component directly. |
| `wizard-field-plane.test.ts`, `wizard-field-utils.test.ts`, `actionable-field-example.test.ts` | Genuine — test the extracted helpers. |

**These two wizard tests will stay green through any refactor, correct or not.** v3's Phase-0 acceptance criterion was therefore worthless. Phase 0 must be preceded by **characterization tests that actually render the component** (Phase −1 below).

### 3.9 **[NEW] Testability finding — the monolith cannot be characterized directly**

Phase −1 as first drafted ("render the wizard and assert on it") is **not practical**, and the repo already says so:

- `AutonomousAgentWizard.tsx` has **61 module-scope imports**, including `useNavigate` (needs a Router), `awsClient`, and `useWorkflowStore`.
- `src/__tests__/lazyWizard.test.tsx:96-97` explicitly declines to render it: *"We don't actually load the component (too heavy) — just verify the export exists."* A previous author already hit this wall.
- No `setupFiles` in `vite.config.ts` — every test does its own mocking; assertions use `.toBeTruthy()`, not jest-dom matchers.

**But the pattern is proven at one level down.** `PropertiesPanel.inspector.test.tsx` renders a ~2,800-line store-coupled component using ~8 `vi.mock` calls plus a `ResizeObserver` stub. A component that receives its state as **props** is strictly easier than that.

**Resolution — invert the order (§5 updated).** Do not characterize the monolith. Extract first, into a *presentational* component whose entire input is props, then characterize the extracted unit. The wiring risk this creates ("did I pass the right props?") is precisely the class of error `tsc` catches, so the safety net becomes three layers:

| Layer | Catches | Cost |
|---|---|---|
| `tsc --noEmit` | prop wiring: missing, misnamed, wrong-typed | free |
| Rendered tests on the extracted unit | behaviour, now and in future | S–M |
| Before/after screenshot via a temporary debug route | visual drift types can't see | S |

The screenshot technique is already proven in this repo — it was used successfully on `CapabilityStage` earlier this session (mount the component with fixture data behind a throwaway route, capture, revert).

### 3.10 **[NEW] Provider errors are semi-structured — better than feared**

Phase 7a's input is not raw strings. `dynamic-node-executor.ts:1301-1305` returns:

```ts
{ _error: result.error?.message, _errorCode: result.error?.code,
  _errorDetails: result.error?.details, _nodeType: nodeType }
```

`NodeExecutionResult.error` is typed `{ code, message, details? }` (`unified-node-contract.ts:433`), and `_errorCode`/`_errorDetails` are preserved through output cleaning (`:352`).

**So a structured `code` is available wherever a node override populates it.** Coverage is uneven — several overrides (`jenkins`, `salesforce`, `youtube`) do capture `response.status`, others throw bare messages. Phase 7a therefore splits into: (1) an interpreter keyed on `_errorCode` with substring-matching fallback on `_error`, and (2) a per-provider audit ensuring the priority nodes emit codes. That is materially smaller than "build provider error mapping from scratch."

### 3.11 **[NEW — BLOCKER] The wizard has no OAuth connection UI at all**

An early draft assumed Phase 2 would "promote" an existing connections step. **There is no such step to promote** — and §2.4 now places connecting at node selection instead. Verified:

| Thing | Status |
|---|---|
| `step === 'credentials'` render block | **Does not exist.** No render guard anywhere in the file. Setting the step shows a blank content area. |
| `handleConnectGoogleOAuth` (`:3312`) | Defined, **never referenced in any JSX** — dead code. The only OAuth entry point in the wizard is unreachable. |
| `CredentialStatusPanel` | Imported at `:32`, **never rendered** — dead import. |
| field-ownership block credential rows | Explanatory copy only — *"Vault and OAuth are completed on Credentials"* — pointing at a step that renders nothing. |
| `components/connections/*` (8 components incl. `OAuthConnectButton`, `CredentialFormRenderer`) | Exist and work, but **the wizard imports none of them**. |

**What *does* work:** typed secrets (API keys, passwords) are entered in the **`configuration` step** (`:7220-7810`, `setCredentialValues`, with `type="password"` support). So API-key providers are servicable today; **OAuth providers are not.**

**Live bug found in passing:** the configuration step at `:7778` renders a button — *"account connections are handled on the Credentials step"* — whose `onClick` is `setStep('credentials')`. Since nothing renders for that step, **this navigates the user to a blank screen.** Reachable whenever `discoveredCredentials.length > 0`.

**Consequences for this plan:**

1. **Phase 2 builds the connect affordance from scratch**, mounted at node selection per §2.4 — sized L, risk High.
2. **Phase 2 is a hard blocker for Phase 7b.** A Google Sheets node cannot be test-run without a Google connection, and there is currently no way to establish one inside the wizard. The first-run concept is unbuildable until this exists.
3. **Compose `components/connections/*`** (`OAuthConnectButton`, `CredentialFormRenderer`, `ConnectionCard`, `ConnectionStatusBadge`, `ProviderLogo`) rather than writing new UI — without modifying them (§2.5).
4. The dead `credentials` step, unused `handleConnectGoogleOAuth`, and unused `CredentialStatusPanel` import should be cleaned up as part of it — or the blank-screen bug fixed independently if this project stalls.

**Note on data source:** at node-selection time there is no `workflowId` yet (the workflow isn't generated until `capability-selection/confirm`), so `/api/workflows/:id/missing-items` **cannot** drive this screen. It must use the candidate's own `hasCredentials` — which is why §2.4 requires strengthening that signal to be `every`-based and scope-aware. `/missing-items` remains the source for the later field-ownership fallback, where a workflow id does exist.

### 3.8 Verified reuse table

| Need | Status | Location |
|---|---|---|
| required/optional/provider-default/credential buckets per operation | ✅ verified | `field-policy-resolver.ts:125` (`resolveFieldPolicyForNode`) |
| operation-aware active schema | ✅ | `field-policy-resolver.ts:114`, `operation-contract-resolver.ts` |
| missing required fields on live config, fill-mode aware | ✅ | `node-readiness-resolver.ts:209` |
| credential readiness | ✅ | `node-readiness-resolver.ts:321`; `workflow-readiness-aggregator.ts:86` |
| scope-aware connection readiness API | ✅ **(better than v3 knew)** | `worker/src/api/workflows-missing-items.ts` + `workflow-connection-readiness.ts` |
| execute one node for real | ✅ | `executeNode()` — `execute-workflow.ts:2650` |
| run-node-then-propagate reference implementation | ✅ | `DebugPanel.tsx:283-324` |
| schema → frontend control | ✅ | `schemaConverter.ts:517` / `:272` |
| field policies already shipped to FE | ✅ | `node-definitions.ts:75-94` (`operationFieldPolicies`) |
| draft → commit lifecycle | ✅ | `workflow-setup-lifecycle.ts` |
| executions table accepts a seeded run | ✅ | `execute-workflow.ts:19398` — `{workflow_id, user_id, status, trigger, input, logs[], started_at, last_heartbeat, timeout_seconds, metadata}` |
| provider-error → field guidance | ❌ **does not exist** | must be built (Phase 7a) |
| build-time node testing of any kind | ❌ none in repo | greenfield |
| connections UI for the wizard | ⚠️ partial | `components/connections/*` (8 components) exists but **the wizard imports none of them** |

---

## 4. Target Design

### 4.1 Step flow

```
… → capability-node-selection   ← connect inline, per selected node (§2.4)
   → capability-review
   → field-ownership            ← values + inline editing + per-node first run
   → complete                   ← /workflow/:id, already executed, logs seeded
```

**No `connections` step is added.** `configuration` and `credentials` are deleted; `building` collapses into the run. Net effect: the wizard gets *shorter*, not longer — connections resolve where the node is chosen, values resolve where the node runs.

### 4.2 Backend endpoints

**(a) `POST /api/workflow-build/field-plan`** — `{ nodes, edges }` inline, no DB write. Returns per node: `firstRunClass`, `testActionCopy`, `triggerInputSpec?`, `groups{required, aiFilled, aiRuntime, optional, credential}`, `upstreamContext.producedBy[]`.

*Justified despite `/api/node-definitions` already exposing `operationFieldPolicies`*: that endpoint computes policy from **default config per contract**, not from a **live node instance's** config. Operation-dependent required-field sets need the instance. New endpoint stands.

**(b) `POST /api/workflow-build/run-node`** — `{ buildId, nodes, edges, nodeId, upstreamOutputs, consented?, sampleLimit? }`. Resolves `firstRunClass`; `write`/`destructive` without `consented:true` → `awaiting_consent`, no execution. Else `executeNode()`. Applies §2.3 cap. Returns `status: 'passed' | 'awaiting_consent' | 'needs_attention'` (never `failed` — deliberate vocabulary) plus `guidance`.

**(c) `POST /api/workflow-build/run`** — topological orchestration, threads outputs, halts at each `awaiting_consent`, streams NDJSON (`x-stream-progress: true`, pattern already used by `/api/generate-workflow`).

**Why not reuse `/api/execute-node`:** it loads by DB id and hard-refuses setup-pending workflows (`execute-node.ts:76-82`) — exactly a draft's state. Relaxing that gate would weaken the live execution path.

### 4.3 Layout contract

Two columns: sticky left rail ~340px (checklist, progress, primary action), right column takes remaining width. Wizard wrapper → `max-w-7xl` for this step (`:5795` [CORRECTED]), mirroring `capability-node-selection`.

- One node = one card, execution order, numbered.
- **Exactly one group expanded per card** by default (the actionable one); others collapsed with count badges.
- One status chip per card: `○ Waiting` · `● Needs input (2)` · `▶ Ready to test` · `⟳ Running` · `✓ Ran 1.2s` · `⚠ Needs attention`.
- Test action = single right-aligned button in the card header. No floating bars, no modals.
- Guidance **replaces the actionable group in place**; never stacks below, never pushes other cards down.

| Group | Row shows | Action |
|---|---|---|
| You provide | live editable control (`convertSchemaToConfigField`) | type directly |
| AI filled — review | value, read-only, `AI` chip | `Edit` → flips `_fillMode` to `manual_static`, moves to *You provide*, editable in place |
| AI at runtime | what will be generated at execution | read-only; `Set it myself` where supported |
| Optional | label + current/empty | `Add` reveals control |

### 4.4 Trigger input panels

`form` → render its own configured fields (doubles as end-user preview). `webhook` → JSON editor seeded from output schema. `chat_trigger` → message input. `schedule` → synthesised timestamp. `manual_trigger` → configured `inputData`. Saved as the node's **sample payload** for later canvas re-runs.

### 4.5 Handoff

`Continue` → `setup-draft` → `commit-setup` → **persist `RunReport` as execution #1** (shape verified, §3.8) → `navigate('/workflow/:id')`.

---

## 5. Phases (re-sequenced after audit)

| Phase | What | Effort | Touches | Risk |
|---|---|---|---|---|
| **0a** | **Baseline capture.** Screenshot the current field-ownership step via a temporary debug route with fixture data (technique proven on `CapabilityStage` this session), then revert the route. This is the visual reference for "unchanged". | S | throwaway only | None |
| **0b** | **Extraction, zero behaviour change.** `:6584-7218` → `components/workflow/field-ownership/{FieldOwnershipStage,NodeOwnershipCard,FieldGroup,FieldRow}.tsx` as **presentational components whose entire input is props**; **extend** existing `lib/wizard-field-ownership.ts`. Shared state (§3.6) passed in — **not** relocated. Bundle the ~15 values into one typed `FieldOwnershipContext` prop object rather than drilling 15 separate props (keeps it mechanical and type-checked; avoids React context, which would change re-render semantics). Safety = `tsc` on wiring + 0a screenshot diff. | L | wizard + new dir | Med |
| **0c** | **Characterization tests on the extracted unit** (now cheap to render — see §3.9). Assert group structure, ownership labels, enable toggle, locked rows, `Proceed` wiring. Follow the `PropertiesPanel.inspector.test.tsx` mocking pattern. | S–M | `__tests__/` only | None |
| **1** | Intent Context off this step; two-column full-width layout (§4.3). | S | wizard, new components | Low |
| **2** | **Inline connect at node selection (§2.4) — no new step.** Make the existing `Connected`/`Not connected` badge in `CapabilityStage.tsx` actionable: click → connect (OAuth or key form) composed from `components/connections/*` **unmodified** (§2.5). Gate `Continue` on every *selected* node being connected. Close the three verified gaps in §2.4: make `hasCredentials` authoritative (`every`, scope-aware), persist/restore capability-stage state across the OAuth redirect, and generalise `checkOAuthReturn` beyond Google. Reuse the same component as a fallback inside field-ownership cards for pipeline-injected nodes. Delete the dead `credentials` step, the orphaned `handleConnectGoogleOAuth`, and the unused `CredentialStatusPanel` import; fix the `:7778` blank-screen navigation (§3.11). **Hard blocker for Phase 7b** — nodes cannot be test-run without connections. | **L** | `CapabilityStage.tsx`, wizard, FSM | **High** |
| **3** | `/api/workflow-build/field-plan`; four-group accordions; `upstreamContext` explanations. No execution. | M–L | worker + FE | Low |
| **4** | Inline editing; `Edit` flips fill mode; writes back to `pendingWorkflowData`. **Must write `inputValues`/`credentialValues` using the existing question-ID keys — see §6a-2.** Deliver the parity report; it gates Phase 5. | M | FE | Med |
| **5** | Delete `configuration` + `credentials` steps. **Designed in §6a-2** — no `handleBuild` rewiring needed if Phase 4 honours the key contract; this becomes deletion plus repurposing `manualConfigurationQuestions` as a completeness signal. | M | wizard, FSM | Med |
| **6** | `firstRunClass` on `NodeOperationContract` + per-node values + fan-out sampler. Backend only, nothing executes. Unit-tested in isolation. | M | worker | **Critical correctness** |
| **7a** | **[NEW] Provider-error→field guidance layer** (§2.2). Interpreter keyed on the existing `_errorCode` with substring fallback on `_error` (§3.10), + per-provider audit so priority nodes emit codes, + safe node-level fallback, + compose `buildRuntimeValidationGuidance` for the input-validation half. | M | worker | Med |
| **7b** | `/api/workflow-build/run-node`; Test action + consent copy; guidance rendering; trigger input panels. **Implements the `BuildRunState` model in §6a** — G2 invalidation, G3 idempotency, G4 Redis lifecycle, G5 auth/ceiling, G6 resume, G8 badges. Correctness requirements, not follow-ups. | L | worker + FE | High |
| **8** | `/api/workflow-build/run` chained orchestration, NDJSON, seeded execution #1, `Continue` gating (no node in `needs_attention`), "skip and open anyway" escape. **Reuses `shouldSkipNode` + `branchResults` per G1** — a naive topological walk would fire both branches of every `if_else`. | L | worker + FE | High |

**Ordering notes:** Phase 6 must land before 7b (nothing auto-executes until the classifier and cap exist). 7a must land before 7b (otherwise failures render as raw errors, violating §2.2). Phase 5 is the highest-risk step and depends on Phase 4 parity being proven.

---

## 6. Verification

- **Phase −1 is the gate for everything.** Until real characterization tests exist, no wizard refactor is verifiable.
- **Phase 6 unit tests must prove:** unclassified operations default to `write` (never auto-run); destructive never executes without `consented:true`; a 500-row read feeds exactly **1** record downstream.
- **Never run `npm test` locally** — per [[feedback_testing_strategy]] it has crashed this machine. Write tests; run in CI or live.
- **Non-regression suite (§2.5) — run on every phase.** `WorkflowConnectionGate.setup.test.tsx`, `WorkflowHeader.setup.test.tsx`, `useWorkflowConnectionStatus.test.ts`, `components/connections/__tests__/*` must pass **unmodified**. Unlike the wizard tests (§3.7) these genuinely exercise their components, so they are a trustworthy net.
- **Manual non-regression E2E:** after Phase 2, confirm the untouched paths still work — `/connections` page connect/disconnect, the canvas connection gate on a manually-built workflow, and the per-node connection selector in the properties panel.
- **OAuth round-trip E2E (Phase 2):** start from node selection with several nodes chosen, connect an unconnected one via OAuth, and confirm on return that **every prior selection is still intact** and the badge has flipped to Connected. This is the specific regression the §2.4 gap analysis predicts.
- **Manual E2E:** "read Sheets → post to Slack" against a throwaway channel — exactly one message, logs seeded on canvas.
- **Fan-out E2E:** 50-row sheet → email node — exactly **one** email.
- **Guidance E2E:** bad spreadsheet ID → no red error, no stack trace, guidance card with next steps and the field editable inline.

---

## 6a. Gap Resolutions — the run-state model

Eleven gaps were found by re-reading v4 against the code. **Ten are now resolved by design below; one (G7) needs a product decision.** All of them live in Phases 6–8 — **none blocks Phases 0–4** (see §6b).

Most resolve from one shared object. Define it once and G1, G2, G3, G6 and G8 all fall out:

```ts
// Redis: key `wfbuild:{buildId}`, TTL 2h refreshed on activity (G4)
interface BuildRunState {
  buildId: string;
  userId: string;                    // bound at creation; mismatch → 403 (G5)
  nodes: WorkflowNode[]; edges: Edge[];
  nodeRuns: Record<string, {
    status: 'waiting' | 'needs_input' | 'ready' | 'running'
          | 'passed' | 'not_exercised' | 'needs_attention';
    configHash: string;              // hash of this node's resolved config (G2)
    upstreamHash: string;            // hash of the inputs it consumed  (G2)
    idempotencyKey: string;          // = hash(buildId,nodeId,configHash,upstreamHash) (G3)
    output?: unknown; guidance?: Guidance; executionMs?: number;
  }>;
  branchResults: {                   // mirrors the real engine (G1)
    ifElseResults: Record<string, boolean>;
    switchResults: Record<string, string | null>;
  };
  executionCount: number;            // per-build ceiling (G5)
}
```

**G1 — branching.** The orchestrator reuses `shouldSkipNode()` from `unified-execution-engine.ts:245`, feeding it the captured `branchResults`, exactly as `execute-workflow.ts` does. Skipped nodes get status `not_exercised`, not `passed`, and render as *"Not exercised — this path didn't run with your test data"*. `Continue` gates on **no node in `needs_attention`**, so `not_exercised` never blocks. One real branch fires, not both.

**G2 — cascade invalidation.** Every edit recomputes `configHash` for that node. If it changed, that node and **all descendants** (BFS over `edges`) reset to `ready`, dropping stored `output`/`guidance`. A chip can only read `passed` while its `configHash` *and* `upstreamHash` still match. Stale verification becomes structurally impossible.

**G3 — idempotency.** `run-node` computes `idempotencyKey` and checks `nodeRuns[nodeId]` first: same key and status `passed` → return the stored result **without re-executing**. Prevents double-click, re-render and post-success timeout duplicates. The client additionally disables the button while `status === 'running'`.

**G4 — build lifecycle.** Redis (`REDIS_URL` is already a dependency), server-authoritative so upstream outputs cannot be tampered with client-side. 2h TTL refreshed on activity; expiry → the wizard offers a clean restart.

**G5 — auth and abuse.** Require an authenticated session; bind `userId` at build creation and 403 on mismatch; per-user rate limit on node runs; per-build `executionCount` ceiling (suggest 50) → `429` with guidance copy, never an error dialog.

**G6 — resume.** On re-entry with a live `buildId`, restore `BuildRunState` and display prior results as-is. **Never auto re-run** — nodes whose `configHash` changed already show `ready` via G2. Falls out of G2 + G4 at no extra cost.

**G8 — honest per-trigger badges.** `manual` / `form` / `chat` / `webhook` with a supplied payload → `Verified`. `schedule` → **`Configured — fires on schedule`**, since synthesising a timestamp proves nothing about it firing later. Extends §2.6 to the node level.

**G9 — Phase 1/3 rework.** Phase 1 ships the layout and the left rail with node name + status only. All **group-count** UI defers to Phase 3, when the grouping actually exists. No rework.

**G11 — abandonment.** Accepted and disclosed, not prevented. The run panel states plainly: *"Steps that have run have really run."* Consistent with §2.1.

**G10 — `capability-review`'s role.** Not a defect; assess during Phase 2 and fold or keep. Remains an open question (§7).

**G7 — needs your decision.** `runtime_ai` fields resolve for real during the first run (real LLM cost, a real value). Is that value frozen into the workflow, or re-resolved every run? *Recommendation:* **do not freeze** — record it in the run log for transparency, keep the field `runtime_ai`, and badge it *"Verified with a sample AI value; regenerates each run."* Freezing would silently convert a dynamic field into a static one, which is not what the user chose.

### Resolved while checking

`dynamic-node-executor.ts` performs **zero** DB writes (`.from(` count = 0), so `workflowId` is pass-through context only. A synthetic draft id for the build-time run is safe.

---

## 6a-2. Phase 5 Design — deleting `configuration` (was the last undesigned blocker)

Investigated after v4. **The blocker largely dissolves once you see what the two steps actually share.** Phase 5 drops from High risk to Medium, and needs **no `handleBuild` rewiring at all** — provided Phase 4 honours one contract.

### The key finding: both steps render the same question set

```ts
// :1489 — field-ownership, structural half
ownershipStructuralByNode = groupQuestionsByNode(
  ownershipQuestions.filter(q => q.ownershipClass === 'structural'))

// :1494 — field-ownership, secrets half
ownershipSecretsByNode    = groupQuestionsByNode(
  ownershipQuestions.filter(q => q.ownershipClass !== 'structural'))

// :1420 — configuration step
manualConfigurationQuestions = ownershipQuestions.filter(q =>
     fieldEnabled(q)                       // toggled on in field-ownership
  && effectiveMode(q) === 'manual_static'  // user chose "You provide"
  && shouldAskWizardManualQuestion(...))
```

**`configuration` is a filtered second pass over `ownershipQuestions` — exactly the rows the user marked "You provide" on the previous screen.** It is not a distinct data model; it is the same rows, asked again one at a time. That is precisely the redundancy Phase 4's inline editing removes, which is why Phase 4 is the gate on Phase 5.

### The second finding: `handleBuild` never touches the step

`handleBuild` consumes nothing step-shaped. It builds two keyed maps and POSTs them:

```ts
// :3449 → POST /api/workflows/:id/attach-inputs
combinedInputs = { ...inputValues, ...sanitizedModeInputs, ...unlockPayload }
// keys are question IDs: config_*, op_*, cred_*, mode_*, unlock_*

// :3562 → POST /api/workflows/:id/attach-credentials
credentialsToSend = questionId → vaultKey mapping over credentialValues
```

`sanitizedModeInputs` derives from `fillModeValues` and `unlockPayload` from `credentialUnlockOverrides` — **both already produced by field-ownership**, not by `configuration`. So the only thing `configuration` uniquely contributes is **typed values written into `inputValues` / `credentialValues`, keyed by question ID.**

### ✅ The design: a key-compatibility contract, not a rewire

**Phase 4 must write into the same two state maps, using the same question-ID keys the `configuration` step uses today.** If it does, `handleBuild`, `attach-inputs`, `attach-credentials` and the entire backend stay untouched, and Phase 5 becomes pure deletion.

```ts
// Phase 4 FieldRow onChange — MUST match the configuration step's key format
setInputValues(prev => ({ ...prev, [String(question.id)]: value }));       // config_*, op_*
setCredentialValues(prev => ({ ...prev, [String(question.id)]: value }));  // cred_* / vault
```

**This is the single highest-risk detail in the whole project.** If Phase 4 invents its own key scheme (e.g. `nodeId::fieldName`), everything still type-checks, the UI still looks right, and `attach-inputs` silently receives an empty or unrecognised map — the workflow saves with no user values. Add an explicit test asserting the key format.

### Phase 5 work items

1. Delete the `configuration` render block (`:7220-7810`, ~590 lines).
2. Point `proceedFromOwnershipStage` (`:5338`) straight at `handleBuild` instead of `setStep('configuration')`.
3. Remove `'configuration'` and `'credentials'` from the `WizardStep` union (`:239`) and from `workflow-generation-state.ts` (`mapWizardStepToState` / `mapStateToWizardStep`).
4. **Keep `manualConfigurationQuestions` (`:1420`)** — repurpose it from a *render source* into a *completeness signal*: "which fields still need a manual value". It becomes the gate that enables `Continue` on field-ownership.
5. Delete the one-question-at-a-time machinery: `currentQuestionIndex`, its clamping effect (`:1476-1484`), `manualConfigurationQuestionIdsKey`.
6. Retire `configurationPhaseUnlocked` and `configurationGateReady` — the latter is already hardcoded `true` (`:1487`, *"Always allow proceeding"*), so no gate is being lost.

### What makes this safe

- `configurationGateReady = true` already, so deleting the step removes **no** existing guard.
- Both steps read one source (`ownershipQuestions`), so no data model disappears.
- The backend contract (`attach-inputs` / `attach-credentials`) is untouched — nothing to coordinate or deploy in lockstep.

### Residual risks

| Risk | Mitigation |
|---|---|
| **Key-format drift** between Phase 4 and the old configuration step | Explicit test on `inputValues` / `credentialValues` key shape; assert `attach-inputs` receives `config_*` / `cred_*` keys |
| Field types only `configuration` handled (JSON/textarea, select, **password**, credential rows) | This is exactly what the **Phase 4 parity report** exists to prove — do not start Phase 5 until it is green |
| A question is `manual_static` but its field-ownership row is toggled **off**, so Phase 4 never renders an input for it | Repurposed `manualConfigurationQuestions` (item 4) surfaces these as "still needs a value" instead of letting them slip through |
| `appliedFieldGuidanceExamples` (`:3479`) writes | Already written from field-ownership (`applyOwnershipExample`), unaffected |

**Revised sizing: M, risk Medium** (was L/High). Still gated on the Phase 4 parity report.

---

## 6b. Readiness — what you can start today

| Phase | Blocked by | Ready? |
|---|---|---|
| **0a / 0b / 0c** extraction + tests | nothing | ✅ **Start now** |
| **1** Intent Context + layout | nothing | ✅ **Start now** |
| **2** inline connect at node selection | nothing | ✅ Ready |
| **3** field-plan API + grouping | nothing | ✅ Ready |
| **4** inline editing | Phase 3 | ✅ Ready after 3 |
| **5** delete `configuration`/`credentials` | Phase 4 parity report only — **designed in §6a-2** | ✅ Ready after 4 |
| **6** `firstRunClass` + fan-out cap | Open Q1 (sample size), Q2 (deny-list) | ⚠️ Two decisions |
| **7a** guidance layer | Open Q7 (provider priority) | ⚠️ One decision |
| **7b** single-node run | Phase 6, 7a + **G7 decision** | ⚠️ |
| **8** chained run | Phase 7b + Open Q3, Q4 | ⚠️ |

**Phases 0–4 are unblocked and need no decisions from you.** That is roughly the whole UI redesign — Intent Context removed, full-width two-column layout, inline connect at node selection, required/AI-filled/optional grouping, and inline editing that retires the round-trip to the Configuration step. The first-run engine (5–8) needs the decisions in §7 before it starts, and its safety layer (Phase 6) must land before anything executes.

---

## 6c. After Phases 0–4 — what still needs figuring out

Three categories: decisions you already know about, questions only the early phases can answer, and **scope this plan has never covered**.

### A. Decisions (listed in §7) — needed before Phase 6

G7 `runtime_ai` freezing · fan-out sample size · destructive deny-list · unverified-save escape hatch · quota treatment · provider-interpreter priority. None block Phases 0–4.

### B. Questions only Phases 0–4 can answer

These are deliberately deferred — they need real data, not more analysis:

1. **Does `upstreamContext` resolve cleanly on real graphs?** Phase 3's BFS maps each `{{$json.*}}` back to a producing node. On real generated workflows some references may be ambiguous or unresolvable, which would degrade the cross-node explanations (§4.2a). Measure on ~10 generated workflows before committing to the copy.
2. **Does the four-group taxonomy actually partition usefully?** If some node types dump every field into `required`, the accordions add clicks without adding clarity. Phase 3 reveals this per node type.
3. **Does inline editing reach parity with the `configuration` step?** This is the explicit gate on Phase 5 — do not delete `configuration` until Phase 4 demonstrably covers every field type it handles (JSON/textarea, selects, password, credential rows).
4. **`field-plan` latency** on a 10-node workflow — it resolves policy per node; if slow, it needs caching before Phase 7.

### C. **[NEW — unexamined scope]** This plan only covers one of three ways a workflow is born

Verified during this pass, and **not addressed anywhere in the plan**:

| Path | Reaches field-ownership? | Consequence |
|---|---|---|
| **AI wizard** (`/workflow/ai`) — the only renderer of `AutonomousAgentWizard` (`pages/AIWorkflowBuilder.tsx:65`) | ✅ yes | Gets connections, values, first run, verified status |
| **Templates** — `pages/Templates.tsx:60` does `navigate('/workflow/${result.workflow.id}')` | ❌ **no** | Lands straight on the canvas. **No connection check, no field ownership, no first run.** A template-instantiated workflow is entirely unverified. |
| **Canvas / AI editor** — no reference to field-ownership in `WorkflowBuilder.tsx` or `WorkflowCanvas.tsx` | ❌ **no** | Adding a node that needs credentials via canvas editing never triggers the gate. |

**So "the user never sees a failed workflow" holds only for wizard-created workflows.** A user who starts from a template — arguably the *easier* on-ramp we actively promote — gets none of these guarantees, and a user who edits on canvas can silently degrade a previously-verified workflow.

This is not a defect in the phases as written; it is a **scope boundary that was never stated**. Three ways to close it, in increasing cost:

- **State the boundary honestly** — "Verified" is a property of how the workflow was built, and the badge disappears once it's edited on canvas. Cheapest, and arguably correct.
- **Reuse the run engine on the canvas** — once Phases 6–8 exist, `/api/workflow-build/run` is graph-shaped and not wizard-specific. A "Verify this workflow" action on the canvas would cover templates and edits with little new code. **Recommended follow-on.**
- **Route templates through field-ownership** — richest, but changes a flow that currently works, and templates are pre-configured by design.

### D. Not yet considered at all

- **Rollout** — this rewrites the primary creation flow. Feature flag, or big-bang deploy? Nothing in the plan says.
- **Responsive** — §4.3 fixes a 340px rail; behaviour below `lg` is unstated for field-ownership (the node-selection layout already collapses to one column).
- **Accessibility** — live-updating run status needs polite announcements; accordions and status chips need roles. No a11y requirements anywhere in the plan.
- **Telemetry** — with no instrumentation you cannot tell whether the redesign worked. Worth capturing: drop-off at field-ownership, % of builds reaching all-verified, and the most frequently failing field per node type (which would also prioritise §7's interpreter list).
- **Cost at scale** — Phases 7–8 run real provider calls plus LLM resolution on every build, including abandoned ones.
- **Wizard size** — after Phases 0–5 the component is smaller but still very large. No target stated.

---

## 7. Open Questions

**Blocking Phase 6+ only. Phases 0–4 need none of these (§6b).**

0. **[G7] `runtime_ai` values from the first run** — freeze into the workflow, or keep regenerating each run? *Recommend: keep regenerating*, record the sample value in the log, badge it accordingly. Freezing silently converts a dynamic field to a static one.
1. **Fan-out sample size** — fixed 1, or user-visible "run with first N"?
2. **Destructive deny-list** — confirm: delete/archive, payments/refunds, bulk overwrite/truncate. Anything else?
3. **Failure escape hatch** — can a user save with an "unverified" marker if a node can't pass? *Recommend yes* — a hard gate traps users.
4. **Quota** — does execution #1 bill against the user's quota / Gemini wallet? *Recommend recorded but not billed.*
5. **`Close` destination** — `/workflows` today. Keep, or `/dashboard`?
6. **[NEW] Dead-code cleanup** — the unreachable ~200 lines in `handleAnalyze` (§3.2) and the legacy `setStep('field-ownership')` paths at `:2821/:2830/:4282`: delete as part of Phase 5, or a separate hygiene PR? *Recommend separate* — unrelated risk.
7. **[NEW] Provider-error interpreter coverage** — which providers get hand-written interpreters first? *Recommend Google (Sheets/Gmail/Drive), Slack, Notion* — the highest-traffic in generated workflows.

---

## 8. Implementation Prompt — Self-Looping (use this one)

**This is the prompt to paste.** It runs every phase as `plan → implement → test → commit → record → re-plan the next phase`, looping until all twelve phases are done. Each phase's plan is written *after* the previous phase, so it is informed by what was actually learned rather than what was predicted.

§8.1 / §8.2 below are the older two-run static prompts, kept for reference.

### Goal (paste into `/goal`)

> Implement the entire field-ownership redesign in `FIELD_OWNERSHIP_VERIFIED_BUILD_PLAN.md` phase by phase — 0a, 0b, 0c, 1, 2, 3, 4, 5, 6, 7a, 7b, 8 — where each phase is planned in detail immediately before it is built, implemented, verified, committed, and then used to re-plan the next phase. Maintain `FIELD_OWNERSHIP_IMPLEMENTATION_LOG.md` as the durable record. Stop only when Phase 8 is complete and verified, or when a phase cannot be completed safely.

### The prompt

> You are implementing a large, repo-verified redesign of the AI workflow wizard in the CtrlChecks monorepo. You will work **phase by phase in a loop**, and you will keep going until every phase is done. Do not stop between phases to ask permission — the plan and all decisions are already settled below.
>
> ---
>
> ## Step 0 — Orientation (do this once, before any code)
>
> 1. Read **`FIELD_OWNERSHIP_VERIFIED_BUILD_PLAN.md`** at the repo root **in full**. It was audited against this repository on 2026-07-28 and contains the current-state analysis, verified `file:line` references, settled design decisions (§2), resolved design gaps (§6a), the Phase 5 design (§6a-2), and the phase table (§5).
> 2. Read **`CLAUDE.md`** — especially the single-source-of-truth registry rule (no `switch (node.type)` outside the registry) and the rule that wizard business logic lives in `ctrl_checks/src/lib/wizard-*.ts`.
> 3. Verify the plan's key anchors still exist and note their **current** line numbers (the wizard file shifts constantly as you work — never trust a stale number): the field-ownership block, `showIntentContextCard`, `proceedFromOwnershipStage`, `handleBuild`'s `attach-inputs` / `attach-credentials` calls, `manualConfigurationQuestions`, `CapabilityStage`'s credential badge.
> 4. Create **`FIELD_OWNERSHIP_IMPLEMENTATION_LOG.md`** at the repo root with a phase checklist (0a, 0b, 0c, 1, 2, 3, 4, 5, 6, 7a, 7b, 8) all unchecked. **This file is your durable memory** — this run is long and your context will be compacted, so anything you will need later must be written there, not merely remembered.
> 5. Post a short orientation summary: what you confirmed, what had drifted, anything the plan got wrong.
>
> ---
>
> ## The loop — repeat for every phase, in order
>
> Phases in order: **0a → 0b → 0c → 1 → 2 → 3 → 4 → 5 → 6 → 7a → 7b → 8**
>
> For each phase:
>
> **① PLAN.** Before writing code, read the current state of the files this phase touches and write a concrete implementation plan for *this phase only* into `FIELD_OWNERSHIP_IMPLEMENTATION_LOG.md`: exact files, exact functions, the specific edits, the risks, and how you will verify it. Base it on what the code looks like **now** — including everything earlier phases changed — not on what the master plan predicted months ago. If the master plan and the code disagree, **the code wins**: say so explicitly and adapt.
>
> **② IMPLEMENT.** Build exactly that plan. Nothing from a later phase.
>
> **③ VERIFY.** Run the verification for this phase (below). Every phase must end with `npx tsc --noEmit` and `npm run lint` clean in `ctrl_checks/`, and `npm run type-check` clean in `worker/` if you touched it. **Never run `npm test` locally — it has crashed this machine.** Write tests and run them in CI or live. If verification fails, fix it before moving on — never leave a phase half-landed.
>
> **④ COMMIT.** One commit per phase, message naming the phase. Never mix phases in one commit.
>
> **⑤ RECORD.** Append to the log: what you actually did, what you verified vs. could not verify, what surprised you, and **what this changes for later phases**. Tick the phase off.
>
> **⑥ RE-PLAN THE NEXT PHASE.** Using what you just learned, revise the next phase's entry in the master plan (§5 and its detail sections) if your findings invalidate or sharpen it. Then start the loop again at ①.
>
> Continue looping without pausing until the stop condition is met.
>
> ---
>
> ## The phases
>
> Full detail is in the plan; this is the map.
>
> - **0a — baseline.** Mount the current field-ownership step with fixture data behind a temporary debug route, screenshot it, revert the route completely, confirm `git status` is clean of debug artifacts. This screenshot is the "unchanged" reference for 0b.
> - **0b — extraction, zero behaviour change.** Field-ownership block → `ctrl_checks/src/components/workflow/field-ownership/` (`FieldOwnershipStage`, `NodeOwnershipCard`, `FieldGroup`, `FieldRow`) as presentational components taking everything via props. **Extend** the existing `ctrl_checks/src/lib/wizard-field-ownership.ts` (it already exists). **Shared state (§3.6) — `inputValues`, `credentialValues`, `fillModeValues`, `appliedFieldGuidanceExamples`, `pendingWorkflowData` — must be passed in as props, never relocated**, or `handleBuild` breaks workflow saving. Bundle them into one typed `FieldOwnershipContext` prop object; do **not** use React context (it changes re-render semantics). Verify: post-0b screenshot identical to 0a.
> - **0c — characterization tests** on the extracted components, following the mocking pattern in `PropertiesPanel.inspector.test.tsx`. **§3.7: the two existing `AutonomousAgentWizard.*.test.ts` files re-implement wizard logic instead of importing it — they stay green through any refactor and are not evidence of anything.**
> - **1 — Intent Context + layout.** Exclude `field-ownership` from `showIntentContextCard`; `handleWizardClose` is already the escape hatch, add no button. Two-column layout per §4.3 (sticky ~340px left rail, full-width right column), wrapper to `max-w-7xl` for this step. **Rail shows node name + status only — no group counts** (§6a/G9: grouping arrives in Phase 3).
> - **2 — inline connect at node selection (§2.4).** Make `CapabilityStage`'s connection badge actionable, composing `components/connections/*` **unmodified**. Gate `Continue` on every *selected* node being connected. Close the three verified gaps: `hasCredentials` must use `every` and be scope-aware; capability-stage state must survive the OAuth redirect; the return handler must work beyond Google. Delete the dead `credentials` step, orphaned `handleConnectGoogleOAuth`, unused `CredentialStatusPanel` import; fix the blank-screen navigation (§3.11).
> - **3 — field-plan API + grouping.** `POST /api/workflow-build/field-plan` taking `{nodes, edges}` inline. Assemble from `resolveFieldPolicyForNode()` and `buildNodeInputReadinessIssues()` — both already compute the buckets. New work is `upstreamContext.producedBy` (BFS over edges; factor out what `property-population-stage.ts` already does). Regroup into required / AI-filled / AI-runtime / optional / credential accordions, one expanded by default, counts on the rest. Nothing executes.
> - **4 — inline editing.** `convertSchemaToConfigField()` into `FieldRow`; `Edit` flips `_fillMode` to `manual_static` and reveals the real control in place. **⚠ Highest-risk detail in the project (§6a-2): write into `inputValues`/`credentialValues` using the existing question-ID keys** (`setInputValues(prev => ({...prev, [String(question.id)]: value}))`). A different key scheme still type-checks and still looks right, but the workflow saves with **none of the user's values**. Add an explicit key-shape test. End with a **parity report**: does inline editing handle text, number, select, textarea/JSON, password, and credential rows? That report gates Phase 5.
> - **5 — delete `configuration` + `credentials` (designed in §6a-2).** Only if the parity report is green. No `handleBuild` rewiring needed. Delete the configuration render block; point `proceedFromOwnershipStage` at `handleBuild`; remove both steps from the `WizardStep` union and `workflow-generation-state.ts`; **keep `manualConfigurationQuestions`, repurposed as a completeness signal** driving the Continue gate; delete `currentQuestionIndex` machinery. **Acceptance: build a workflow end to end, enter values only in field-ownership, save, and confirm in the DB that the values actually persisted.**
> - **6 — safety layer, backend only, nothing executes.** Add `firstRunClass?: 'none'|'read'|'write'|'destructive'` to `NodeOperationContract` (`unified-node-contract.ts:389`), **defaulting to `'write'`**; populate values in `generated-node-operation-contracts.ts` (hand-maintained despite the name). Implement the fan-out sampler (§2.3). Unit tests must prove: unclassified → `write`; destructive never runs without `consented: true`; a 500-row read feeds exactly **1** record downstream. **Write no execution path in this phase.**
> - **7a — guidance layer (§2.2, §3.10).** Provider-error → field interpreter keyed on the existing `_errorCode`/`_errorDetails` from `dynamic-node-executor.ts`, substring fallback on `_error`, composing `buildRuntimeValidationGuidance()`, plus a safe node-level fallback. Audit Google/Slack/Notion to populate `error.code`. **Every failure renders as: what happened → why → what to do next → the field, editable inline.** No stack traces, no error codes, no red alerts, no toasts. API vocabulary is `passed | awaiting_consent | needs_attention` — never `failed`.
> - **7b — single-node run.** `POST /api/workflow-build/run-node` implementing the full `BuildRunState` model in §6a: Redis-backed (`wfbuild:{buildId}`, 2h TTL, server-authoritative), `userId` bound at creation with 403 on mismatch, per-build execution ceiling, `configHash`/`upstreamHash` cascade invalidation, `idempotencyKey` dedupe, resume without auto re-running. Execute via the shared `executeNode()` — **call it, never modify it**; all policy lives in the caller. Per-node Test action whose copy names the real effect and target (§2.1); trigger input panels (§4.4); `schedule` badges *"Configured — fires on schedule"*, not *"Verified"*.
> - **8 — chained run.** `POST /api/workflow-build/run` streaming NDJSON. **Reuse `shouldSkipNode()` from `unified-execution-engine.ts` with captured `ifElseResults`/`switchResults`** — a naive topological walk fires **both** branches of every `if_else`, meaning a real email *and* a real Slack message when only one should have gone. Untaken branches get `not_exercised`, which does not block `Continue` (gate: no node in `needs_attention`). Persist the `RunReport` as execution #1. Add the "skip and open anyway" escape.
>
> ---
>
> ## Invariants — true in every phase
>
> **Non-regression (§2.5).** Connections already work on the canvas, on `/connections`, and per-node in the properties panel. Do not disturb them:
> - `components/connections/*` — **compose, never modify**. Need a variant? Add an optional prop defaulting to current behaviour.
> - `GET /api/workflows/:id/missing-items` — **additive only**; `useWorkflowConnectionStatus.ts` (the canvas gate) depends on its shape.
> - `executeNode()` (`worker/src/api/execute-workflow.ts`) — **never modify**; it serves full execution and the debug panel.
> - These must pass **unmodified** after every phase: `WorkflowConnectionGate.setup.test.tsx`, `WorkflowHeader.setup.test.tsx`, `useWorkflowConnectionStatus.test.ts`, `components/connections/__tests__/*`. Unlike the wizard tests, these genuinely exercise their components.
>
> **Other invariants:** never run `npm test` locally · one commit per phase · registry single-source-of-truth (no `switch (node.type)`) · wizard logic in `lib/wizard-*.ts` · when plan and code disagree, the code wins and you say so.
>
> ---
>
> ## Decisions — already made, never ask
>
> - **`runtime_ai` values:** do **not** freeze. Record the sample in the run log, keep the field `runtime_ai`, badge *"Verified with a sample AI value; regenerates each run."*
> - **Fan-out sample:** exactly **1** record. Show *"Ran with 1 of N — the full set runs when you execute the workflow."*
> - **Destructive deny-list** (`firstRunClass: 'destructive'`): deletes/archives, payments/refunds, bulk overwrite/truncate. Unclassified defaults to `'write'` and never auto-runs.
> - **Escape hatch:** yes — a user may save an unverified workflow, marked unverified.
> - **Quota:** execution #1 is recorded as a real execution but **not billed**.
> - **Provider interpreters:** Google (Sheets/Gmail/Drive), Slack, Notion first.
> - **`Close` destination:** keep `/workflows`.
>
> ---
>
> ## The one mandatory pause
>
> **Phase 7b is the first code that performs real external operations** — real emails sent, real Slack messages posted, real rows written. Before you begin 7b, **stop and report**: what landed in 0a–7a, and confirmation that Phase 6's safety layer is unit-tested and passing. Wait for a go-ahead.
>
> That is the only pause. Everything before it runs unattended, and after the go-ahead 7b and 8 run to completion. *(If you want it fully unattended, delete this section before pasting — but then all E2E testing must target a throwaway Slack channel and test inbox, never a production workspace.)*
>
> ---
>
> ## Verification per phase
>
> - Every phase: `npx tsc --noEmit` + `npm run lint` in `ctrl_checks/`; `npm run type-check` in `worker/` if touched. tsc is your primary safety net for prop wiring in 0b.
> - After 0b: screenshot identical to the 0a baseline. After 1: screenshot showing the intended change.
> - After 2: manual non-regression — `/connections` connect/disconnect, canvas connection gate on a manually-built workflow, per-node connection selector. Plus OAuth round-trip: select several nodes, connect one, confirm **every prior selection survives** and the badge flipped.
> - After 5: a workflow built end to end persists the user's field-ownership values (checked in the DB).
> - After 8, all against throwaway targets: (a) "read Sheets → post to Slack" produces exactly **one** message with logs seeded on the canvas; (b) a 50-row sheet into an email node sends exactly **one** email; (c) a bad spreadsheet ID yields a guidance card with next steps and an inline-editable field, no red error; (d) an `if_else` workflow fires exactly **one** branch.
>
> ---
>
> ## Stop condition
>
> Stop when **all twelve phases** are complete and committed, tsc/lint clean in both packages, the non-regression tests pass unmodified, and every verification above has been performed. Then post a final report: what landed, what you verified vs. could not verify, where the plan proved inaccurate, and anything left for a follow-up.
>
> Stop early **only** if a phase cannot be completed safely — in that case report the blocker rather than partially landing it or working around it.

---

## 8-legacy. Static two-run prompts (superseded by §8 above)

**Recommended split — two runs, not one.** Every phase is now designed, so end-to-end is *possible*. It is still better as two prompts, and the seam is not arbitrary:

| | Prompt A — **Phases 0a → 5** | Prompt B — **Phases 6 → 8** |
|---|---|---|
| What it is | The complete UI redesign | The first-run execution engine |
| Side effects | **None.** Nothing executes. | **Sends real emails, posts real messages.** |
| Decisions needed | None — all designed | Five (§7), pre-answered in 8.3 |
| Verification | tsc, lint, screenshots, unit tests | Requires manual E2E against a throwaway Slack channel / inbox |
| Rollback | Trivial | Side effects cannot be un-sent |

Running B unsupervised means an agent developing and debugging code whose correct behaviour *is* sending real messages. Land A, look at it, then start B deliberately.

---

### 8.1 Prompt A — Phases 0a → 5 (the UI redesign)

**Scope:** everything through deleting the `configuration` step. No execution, no side effects, no outstanding decisions.

#### Goal (for `/goal`)

> Implement Phases 0a through 5 of `FIELD_OWNERSHIP_VERIFIED_BUILD_PLAN.md` end to end: extract the field-ownership block into components with zero behaviour change, remove the Intent Context panel from that step, convert it to the full-width two-column layout, make node-selection connection badges actionable with OAuth round-trip state preservation, add the `field-plan` API with required/AI-filled/optional grouping, enable inline field editing, and delete the redundant `configuration` and `credentials` steps. Stop at the end of Phase 5 — do not start Phase 6. Type-check and lint clean, non-regression suite passing, verified visually on the dev server.

#### Prompt

> You are implementing a planned, repo-verified redesign of the AI workflow wizard's field-ownership step in the CtrlChecks monorepo.
>
> **First, read `FIELD_OWNERSHIP_VERIFIED_BUILD_PLAN.md` at the repo root in full.** It was audited against this repository on 2026-07-28 and contains the current-state analysis, verified file:line references, settled design decisions, and resolved design gaps. Also read `CLAUDE.md` for the registry single-source-of-truth rule. Re-confirm line numbers before editing — the wizard file shifts as you work.
>
> **Implement Phases 0a through 5 (§5). Do NOT start Phase 6, 7 or 8** — those execute nodes for real (sending real emails and messages) and require product decisions handled in a separate run. Stop when Phase 5 is complete and report.
>
> ---
>
> **Phase 0a — visual baseline.** Mount the current field-ownership step with fixture data behind a temporary debug route, screenshot it, then fully revert the route and delete the debug file. Confirm `git status` shows no debug artifacts. This screenshot is your reference for "unchanged" in 0b.
>
> **Phase 0b — extraction, zero behaviour change.** Extract `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx:6584-7218` into `ctrl_checks/src/components/workflow/field-ownership/`: `FieldOwnershipStage.tsx`, `NodeOwnershipCard.tsx`, `FieldGroup.tsx`, `FieldRow.tsx` — presentational components whose entire input arrives via props. **Extend the existing `ctrl_checks/src/lib/wizard-field-ownership.ts`** (already 209 lines) rather than creating it. Reuse `FieldOwnershipHelpPanel.tsx` unchanged and the helpers listed in §3.6.
>
> **Critical (§3.6):** `inputValues`, `credentialValues`, `fillModeValues`, `appliedFieldGuidanceExamples` and `pendingWorkflowData` are **shared with the `configuration` step and `handleBuild`** — `handleBuild` reads them to save the workflow. Pass them in as props; do **not** relocate them, or workflow saving breaks. Only state listed as "own" in §3.6 may move. Bundle the ~15 passed values into a single typed `FieldOwnershipContext` prop object rather than drilling 15 props. Do **not** introduce React context — it changes re-render semantics and breaks the zero-behaviour-change guarantee.
>
> **Phase 0c — characterization tests** on the extracted components (cheap to render now they take props). Follow the mocking pattern in `PropertiesPanel.inspector.test.tsx` (~8 `vi.mock` calls plus a `ResizeObserver` stub; there is no `setupFiles`, so use `.toBeTruthy()` not jest-dom matchers). Assert: both section headings, per-node grouping, ownership labels (`You` / `AI Build` / `AI Runtime`), the per-field enable toggle, locked-row treatment, and that the proceed button invokes its callback. **Note (§3.7): the two existing `AutonomousAgentWizard.*.test.ts` files re-implement wizard logic instead of importing it — they stay green through any refactor and are not a safety net. Do not treat them as evidence.**
>
> **Phase 1 — Intent Context removal + layout.** Exclude `step === 'field-ownership'` from `showIntentContextCard` (`:5729-5733`) so that panel and its "Edit intent" / "Restart" buttons no longer render there; `handleWizardClose` (`:3282`) is already the correct escape hatch, so add no new button. Convert the step to the two-column layout in §4.3: sticky left rail (~340px, node checklist in execution order, per-node status, overall "N of M"), full-width right column of node cards. Widen the wizard content wrapper (`:5795`) to `max-w-7xl` for `field-ownership` as already done for `capability-node-selection`. **Per §6a/G9, ship node name + status only in the rail — no group counts yet** (grouping arrives in Phase 3, and building counts now means building them twice).
>
> **Phase 2 — inline connect at node selection (§2.4).** In `CapabilityStage.tsx`, make the existing `Connected` / `Not connected` badge actionable: clicking opens a connect affordance (OAuth launch or API-key form) **composed from `ctrl_checks/src/components/connections/*` without modifying those components** (§2.5). Gate `Continue` on every *selected* node being connected; unselected candidates are irrelevant, and nodes needing no credentials already report `hasCredentials: true`. Close the three verified gaps in §2.4:
> 1. Make the badge authoritative — `worker/src/services/ai/stages/capability-grouper-stage.ts:278-283` currently uses `checks.some(Boolean)` (a node needing two credentials reads "Connected" with one) and checks provider-level vault existence, not scope. Use `every`, and route through the same scope-aware readiness service used elsewhere.
> 2. Preserve capability-stage state across the OAuth redirect — `checkOAuthReturn` (`:868-925`) restores only `pendingWorkflowData.discoveredCredentials`, not `capNodeContainers` / `capNodeSelections` / `capNodeCorrelationId` / `capNodeStructuralPrompt` / `capNodeWorkflow` (`:753-763`). Returning from OAuth mid-selection currently loses the user's choices.
> 3. Generalise the return handler beyond Google — it hardcodes `fetchRuntimeCredentialStatus('google')` (`:881`), and its only writer `handleConnectGoogleOAuth` (`:3312`) is dead code never called from JSX.
>
> Also delete the dead `credentials` step (no render block exists for it), the orphaned `handleConnectGoogleOAuth`, and the unused `CredentialStatusPanel` import (`:32`), and fix the `:7778` button that navigates to that non-rendering step and lands the user on a blank screen (§3.11). Mount the same connect component as a fallback inside field-ownership cards for pipeline-injected nodes.
>
> **Phase 3 — field-plan API + grouping.** Add `POST /api/workflow-build/field-plan` (§4.2a) taking `{ nodes, edges }` inline — no DB write, no `workflowId` required. Assemble from `resolveFieldPolicyForNode()` (`worker/src/core/operations/field-policy-resolver.ts:125`) and `buildNodeInputReadinessIssues()` (`worker/src/core/readiness/node-readiness-resolver.ts:209`), both of which already compute the buckets. The genuinely new part is `upstreamContext.producedBy` — a BFS over edges resolving each `{{$json.*}}` to its producing node (`property-population-stage.ts` already does this internally; factor it out rather than duplicating). Regroup the UI into required / AI-filled / AI-runtime / optional / credential accordions per §4.3, with exactly one group expanded per card by default and count badges on the rest. Add the cross-node explanations ("uses the spreadsheet ID from Manual Trigger"). Nothing executes in this phase.
>
> **Phase 4 — inline editing.** Wire `convertSchemaToConfigField()` (`ctrl_checks/src/lib/schemaConverter.ts:272`) into `FieldRow` so an AI-filled row's `Edit` action flips `_fillMode` to `manual_static`, moves the row into *You provide*, and reveals the real editable control in place.
>
> **⚠ The single most dangerous detail in this project (§6a-2).** `FieldRow`'s onChange **must** write into the existing shared maps using the **question-ID key format** the `configuration` step uses today:
> ```ts
> setInputValues(prev => ({ ...prev, [String(question.id)]: value }));      // config_*, op_*
> setCredentialValues(prev => ({ ...prev, [String(question.id)]: value })); // cred_* / vault-keyed
> ```
> `handleBuild` (`:3449`, `:3562`) forwards these maps to `attach-inputs` / `attach-credentials`. If you invent a different key scheme (e.g. `nodeId::fieldName`), **everything still type-checks and the UI still looks correct, but the workflow saves with none of the user's values.** Add an explicit test asserting the key shape.
>
> Then deliver a **parity report** — this is the gate on Phase 5: does inline editing handle every field type `configuration` handles (text, number, select, textarea/JSON, **password**, credential rows)? If any type is unhandled, fix it before Phase 5. If you cannot, stop and report rather than deleting the step.
>
> **Phase 5 — delete `configuration` + `credentials` (designed in §6a-2).** Only proceed if the parity report is green. Per §6a-2, `handleBuild` needs **no rewiring** — both steps already read the same `ownershipQuestions` source, and `configuration` is merely a filtered second pass over the rows the user marked "You provide".
> 1. Delete the `configuration` render block (`:7220-7810`).
> 2. Point `proceedFromOwnershipStage` (`:5338`) straight at `handleBuild` instead of `setStep('configuration')`.
> 3. Remove `'configuration'` and `'credentials'` from the `WizardStep` union (`:239`) and from `workflow-generation-state.ts` (`mapWizardStepToState` / `mapStateToWizardStep`).
> 4. **Keep `manualConfigurationQuestions` (`:1420`)** — repurpose it from a render source into a *completeness signal* ("which fields still need a manual value") driving the field-ownership `Continue` gate. This is what catches a `manual_static` field whose row is toggled off.
> 5. Delete the one-question-at-a-time machinery: `currentQuestionIndex`, its clamping effect (`:1476-1484`), `manualConfigurationQuestionIdsKey`.
> 6. Retire `configurationPhaseUnlocked` / `configurationGateReady` — the latter is already hardcoded `true` (*"Always allow proceeding"*), so no guard is lost.
>
> **Phase 5 acceptance:** generate a workflow end to end, enter values only in field-ownership, save, and confirm in the DB (or via the workflow editor) that the user's values actually persisted onto the nodes. This is the real proof the key contract held.
>
> ---
>
> **Non-regression contract (§2.5) — verify after every phase.** Existing connection flows must keep working for manually-built workflows and all other use cases:
> - `components/connections/*` — **compose, never modify**. If a variant is needed, add an optional prop whose default preserves current behaviour.
> - `GET /api/workflows/:id/missing-items` — **additive only**; `useWorkflowConnectionStatus.ts:297` (the canvas gate) depends on its shape.
> - `executeNode()` (`worker/src/api/execute-workflow.ts:2650`) — **do not modify**; it serves full execution and the debug panel.
> - These tests must pass **unmodified**: `WorkflowConnectionGate.setup.test.tsx`, `WorkflowHeader.setup.test.tsx`, `useWorkflowConnectionStatus.test.ts`, `components/connections/__tests__/*`. Unlike the wizard tests these genuinely exercise their components, so they are trustworthy.
>
> **Verification per phase:**
> - `npx tsc --noEmit` and `npm run lint` in `ctrl_checks/` — both clean. In `worker/`, `npm run type-check`. tsc is your primary safety net for prop wiring in 0b.
> - Re-screenshot and diff against the 0a baseline after 0b (must be identical) and after Phase 1 (intentional change).
> - Manual non-regression after Phase 2: `/connections` page connect/disconnect, the canvas connection gate on a manually-built workflow, the per-node connection selector in the properties panel.
> - OAuth round-trip E2E after Phase 2: select several nodes, connect one via OAuth, confirm on return that **every prior selection survives** and the badge flipped.
> - **Never run `npm test` locally — it has crashed this machine.** Write tests; run them in CI or live.
>
> **Working rules:** commit after each phase with a clear message; never mix phases in one commit. If you discover the plan is wrong about something, trust the code, say so explicitly, and adjust rather than forcing the plan. If a phase cannot be completed safely, stop and report rather than partially landing it.
>
> **Stop condition — you are done when all of these hold:**
> 1. Phases 0a, 0b, 0c, 1, 2, 3, 4, 5 are complete and committed separately.
> 2. `tsc` and `lint` clean in both `ctrl_checks/` and `worker/`.
> 3. The non-regression tests listed above pass unmodified.
> 4. Post-0b screenshot is identical to the 0a baseline.
> 5. The Phase 4 parity report is delivered and green.
> 6. Phase 5 acceptance passed — a workflow built end to end persisted the user's field-ownership values.
> 7. You have **not** started Phase 6 or later.
>
> Then report: what landed, what you verified vs. could not verify, anything where the plan proved inaccurate, and the parity report. Do not continue past Phase 5.

### 8.2 Prompt B — Phases 6 → 8 (the first-run engine)

**Run only after Prompt A has landed and you have looked at it.** This is the phase set that executes nodes for real.

The five open decisions (§7) are **pre-answered below with the plan's recommendations**, so the run needs nothing from you. Change any line you disagree with before pasting — each is a one-line edit.

#### Goal (for `/goal`)

> Implement Phases 6, 7a, 7b and 8 of `FIELD_OWNERSHIP_VERIFIED_BUILD_PLAN.md`: the `firstRunClass` safety layer and fan-out cap, the provider-error guidance layer, single-node consented execution, and the chained first run with seeded execution #1. Phase 6 must land and be unit-tested before anything executes. Stop when Phase 8 is complete.

#### Prompt

> You are implementing the first-run execution engine for the CtrlChecks AI workflow wizard. **Read `FIELD_OWNERSHIP_VERIFIED_BUILD_PLAN.md` at the repo root in full first** — especially §2 (settled decisions), §6a (the `BuildRunState` model, which resolves gaps G1–G8), and §2.5 (the non-regression contract). Also read `CLAUDE.md`. Prompt A (Phases 0a–5) is already landed; this run implements Phases 6 → 8.
>
> **⚠ This code executes real operations — real emails sent, real Slack messages posted, real rows written.** Never test against a production workspace. Use a throwaway Slack channel and a test inbox. Phase 6 (the safety layer) **must land and be unit-tested before any code path can execute a node**.
>
> **Decisions — already made, do not ask:**
> - **G7 `runtime_ai` values:** do **not** freeze. The first run resolves them for real; record the sample value in the run log, keep the field `runtime_ai`, badge it *"Verified with a sample AI value; regenerates each run."*
> - **Q1 fan-out sample size:** fixed at **1** record. Display *"Ran with 1 of N — the full set runs when you execute the workflow."*
> - **Q2 destructive deny-list** (`firstRunClass: 'destructive'`): deletes/archives, payments/refunds, bulk overwrite/truncate. Everything unclassified defaults to `'write'` (never auto-runs).
> - **Q3 escape hatch:** yes — a user may save an unverified workflow, marked "unverified". A hard gate traps users behind dead third-party APIs.
> - **Q4 quota:** execution #1 is **recorded as a real execution but not billed** against the user's quota or Gemini wallet, since the product initiated it.
> - **Q7 provider interpreter priority:** Google (Sheets/Gmail/Drive), Slack, Notion first.
>
> **Phase 6 — safety layer (backend only, nothing executes).** Add `firstRunClass?: 'none' | 'read' | 'write' | 'destructive'` to `NodeOperationContract` (`worker/src/core/types/unified-node-contract.ts:389`), **defaulting to `'write'`** when absent. Populate per-node values in `generated-node-operation-contracts.ts` (hand-maintained despite its name — no generator writes it). Implement the fan-out sampler per §2.3. Unit tests must prove: unclassified → `'write'`; destructive never executes without `consented: true`; a 500-row read feeds exactly **1** record downstream. **Do not write any execution path in this phase.**
>
> **Phase 7a — guidance layer (§2.2, §3.10).** Build the provider-error → field interpreter. Key off the existing `_errorCode` / `_errorDetails` that `dynamic-node-executor.ts:1301` already returns, with substring fallback on `_error`; compose `buildRuntimeValidationGuidance()` (`worker/src/core/utils/runtime-validation-guidance.ts:102`) for the input-validation half; add a safe node-level fallback for unmapped errors. Audit the priority providers so they populate `error.code`. **Every failure must resolve to: what happened → why → what to do next → the field, editable inline.** No stack traces, no error codes, no red alerts, no toasts — technical detail goes behind a collapsed disclosure. The API status vocabulary is `passed | awaiting_consent | needs_attention` — never `failed`.
>
> **Phase 7b — single-node run.** Add `POST /api/workflow-build/run-node` (§4.2b) and implement the full `BuildRunState` model from §6a: Redis-backed (`wfbuild:{buildId}`, 2h TTL, server-authoritative), `userId` bound at creation with 403 on mismatch, per-build execution ceiling, `configHash`/`upstreamHash` cascade invalidation (G2), `idempotencyKey` dedupe (G3), resume on re-entry without auto re-running (G6). Execute via the shared `executeNode()` (`worker/src/api/execute-workflow.ts:2650`) — **call it, never modify it** (§2.5); all policy lives in the caller. Add the per-node Test action whose copy names the real effect and target (§2.1), and the trigger input panels (§4.4). Per-trigger badges per G8: `schedule` reads *"Configured — fires on schedule"*, not *"Verified"*.
>
> **Phase 8 — chained run.** Add `POST /api/workflow-build/run` streaming NDJSON (`x-stream-progress: true`, the pattern `/api/generate-workflow` already uses). **Reuse `shouldSkipNode()` from `unified-execution-engine.ts:245` with captured `ifElseResults`/`switchResults` (G1)** — a naive topological walk fires *both* branches of every `if_else`, meaning a real email *and* a real Slack message when only one should have gone. Untaken branches get `not_exercised`, not `passed`, and do not block `Continue`, which gates on "no node in `needs_attention`". Persist the `RunReport` as execution #1 (shape verified at `execute-workflow.ts:19398`). Add the "skip and open anyway" escape so a slow provider cannot trap the user.
>
> **Non-regression (§2.5), verify every phase:** `executeNode()` unmodified; `components/connections/*` composed not modified; `/missing-items` additive only; these tests pass unmodified — `WorkflowConnectionGate.setup.test.tsx`, `WorkflowHeader.setup.test.tsx`, `useWorkflowConnectionStatus.test.ts`, `components/connections/__tests__/*`.
>
> **Verification:** `npx tsc --noEmit` + `npm run lint` in `ctrl_checks/`, `npm run type-check` in `worker/`. **Never run `npm test` locally — it has crashed this machine**; run tests in CI or live. Required E2E, all against throwaway targets: (a) "read Sheets → post to Slack" produces exactly **one** message with logs seeded on the canvas; (b) a 50-row sheet into an email node sends exactly **one** email; (c) a bad spreadsheet ID produces a guidance card with next steps and an inline-editable field — no red error anywhere; (d) an `if_else` workflow fires exactly **one** branch.
>
> **Working rules:** commit per phase, never mix. Phase 6 lands before any execution path exists. If the plan is wrong, trust the code and say so. If a phase cannot be completed safely, stop and report rather than partially landing it.
>
> **Stop condition:** Phases 6, 7a, 7b, 8 complete and committed separately; tsc/lint clean; non-regression tests unmodified and passing; all four E2E scenarios verified. Then report what landed, what you verified vs. could not verify, and anything where the plan proved inaccurate.

---

### 8.3 Recommended before Phase 1 ships (§6c-D)

Two things are far cheaper to decide now than to retrofit: **telemetry** (drop-off at field-ownership, % of builds reaching all-verified, most-frequently-failing field per node type — this also prioritises §7's interpreter list) and **rollout** (feature flag vs. big-bang on the primary creation flow). Neither blocks implementation, but both get expensive after the flow is half-migrated.

---
