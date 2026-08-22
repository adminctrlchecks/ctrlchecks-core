# Why "Blank" Doesn't Actually Mean Blank — Deep Root Cause Research

**Status: research only — no code changed.** This document exists to answer one question precisely: *is there a single, universal, permanent fix, or does this need to be patched node-by-node forever?*

**Short answer: there is a single universal fix. This is not a per-node problem — it is three specific, nameable gaps in the shared execution engine, and each has exactly one fix location that covers every node, present and future.**

---

## 1. The symptom, restated precisely

The user disabled (`Not configured`, toggle off) the Google Calendar tool's `description`, `Time Min`, `Time Max`, and `Q` fields in the Properties Panel. Execution still sent the literal text `"event"` for all four fields to Google's API, causing a 400. The user's question, exactly: *"we can't implement each and every node again and again... if it's blank, it should be blank... is there anything we can fix universally?"*

This looked, at first glance, like the same bug already fixed earlier this session (§2.5–2.8 of the end-to-end log: the AI model hallucinating a value like `spreadsheetId` or `range`). **It is not the same mechanism.** Tracing it live (see `worker/src/core/execution/dynamic-node-executor.ts:1723-1730` execution logs) showed these four fields were sourced as `static_config` — i.e. read directly from the node's own **persisted** configuration, not invented by the AI at runtime at all. That redirected the investigation to a different, deeper question: *why does the persisted config still contain a value for a field the user turned off?*

---

## 2. The three independent gaps, each traced to an exact line

### Gap A — Turning a field "off" never clears its stored value

`ctrl_checks/src/components/workflow/PropertiesPanel.tsx:779-788`:

```ts
const handleFieldEnabledChange = useCallback(
  (fieldKey: string, enabled: boolean) => {
    if (!selectedNodeId || !selectedNode) return;
    const current = (selectedNode.data.config?._fieldEnabled as Record<string, boolean> | undefined) ?? {};
    updateNodeConfig(selectedNodeId, {
      _fieldEnabled: { ...current, [fieldKey]: enabled },
    });
  },
  ...
);
```

This is the **entire** implementation of the toggle. It writes one key into a side-channel metadata object (`config._fieldEnabled`). It never touches `config[fieldKey]` itself. Whatever value was already stored there — from an earlier AI-generation pass, an earlier manual entry, a template import, anything — remains exactly as it was, permanently, underneath the "Not configured" label. The UI and the underlying data silently diverge the moment this toggle is used on a field that ever held a value.

### Gap B — Execution's config-resolution layer has never heard of `_fieldEnabled`

`worker/src/core/execution/dynamic-node-executor.ts:2258-2283` (`resolveInputsFromConfig`, the very first step of `resolveNodeInputsUniversalContract`, called at `dynamic-node-executor.ts:1723`):

```ts
function resolveInputsFromConfig(inputSchema, config, nodeOutputs) {
  const resolved = {};
  for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
    const configValue = config[fieldName];
    if (configValue === undefined || configValue === null) {
      if (fieldDef.default !== undefined) resolved[fieldName] = fieldDef.default;
      continue;
    }
    ...
    resolved[fieldName] = configValue;
  }
  return resolved;
}
```

This function — the foundation every other resolution step builds on — iterates the node's *entire* input schema and reads `config[fieldName]` unconditionally. It has no parameter, no check, no awareness of `config._fieldEnabled` at all. Confirmed by an exhaustive search: **only four files in the whole worker reference `_fieldEnabled`**, and this is not one of them:

```
src/api/attach-inputs.ts                       — writes the field when saving from certain UI flows
src/core/execution/runtime-field-contract.ts   — reads it, but only for one purpose (see below)
src/core/registry/unified-node-registry.ts     — reads it, for schema/UI field-list filtering
src/core/utils/attach-inputs-merge-guard.ts     — treats it as metadata to exclude from diffing
```

`runtime-field-contract.ts:114-117` is the one place that *does* check it:

```ts
function isFieldDisabledByOwner(fieldName, config) {
  const fieldEnabled = config?._fieldEnabled;
  return Boolean(fieldEnabled && typeof fieldEnabled === 'object' && fieldEnabled[fieldName] === false);
}
```

But its only caller, `fieldRequiredByContract` (line 119-127), uses it for exactly one decision: *"is this field required, for Check Setup / readiness-validation purposes?"* — i.e., whether to nag the user that a field is missing. **It has never been wired into whether the field's stored value is actually used at execution time.** `_fieldEnabled` is, today, purely a readiness/validation-UI concept. It has zero effect on what gets sent to a real API.

### Gap C — Even for fields with no persisted value at all, the write-back fallback ignores fill mode

This is the gap already partially closed this session (`worker/src/core/execution/runtime-input-handoff.ts`, commit `43ec8b9`), but only for **identity fields**. The underlying function, `buildFinalProviderConfig` (`runtime-input-handoff.ts:79-132`), has a second, still-open hole:

```ts
if (shouldOwn) {                       // fillMode === 'runtime_ai', correctly gated
  config[fieldName] = value;
  continue;
}
if (!Object.prototype.hasOwnProperty.call(config, fieldName) || isRuntimeEmptyValue(config[fieldName])) {
  config[fieldName] = value;           // ← runs regardless of fillMode
}
```

The fallback branch fires whenever the *config* value happens to be empty — it never checks whether the field's `effectiveFillModes[fieldName]` is `manual_static` (the user explicitly owns this field and left it blank on purpose). My earlier fix (§2.8 of the debug log) added a guard **only for fields matched by `isIdentityField()`** (spreadsheetId, sheetName, range, url, `*Id`, `*Key`, `*Token`, `*Secret`, `*Credential`). Every other field — `description`, `q`, `timeMin`, arbitrary future fields on arbitrary future nodes — still has zero protection here. If any upstream resolution step (the IntentRouter's embedding matcher, `guaranteeInputForSchema`, `applyCostFirstRuntimeFallbacks`) computes *any* candidate value for a blank non-identity field, this fallback writes it into config unconditionally.

---

## 3. Why this reads as "the same issue as Sheets `range`" but isn't, quite

Both are instances of the same **family** of bug — "a field the user did not knowingly set ends up carrying a value it shouldn't" — but they are different mechanisms requiring different fixes:

| | Sheets `range="read"` (fixed, §2.8) | Calendar `description/timeMin/timeMax/q="event"` (this doc) |
|---|---|---|
| Where the bad value came from | Runtime fuzzy/embedding resolver **inferring** a plausible-looking wrong value for an empty field | A value **already sitting in persisted config** from an earlier state, surviving under a "disabled" flag the execution layer never checks |
| Which gap | Gap C (write-back fallback, now closed *for identity fields only*) | Gap A + Gap B (toggle-off doesn't clear data; resolution doesn't check the disabled flag) |
| Why the earlier fix didn't catch this one | `description`/`q`/`timeMin`/`timeMax` are not identity fields — `isIdentityField()` correctly does not flag them, so Gap C's identity-only guard was never supposed to apply here | N/A — this is a different code path entirely (Gap A/B fire before Gap C is ever reached) |

My answer of "yes" when the user asked "is this the same issue as range?" was directionally right (same *family*, same underlying principle violated: *blank should mean blank*) but mechanically imprecise — worth correcting here since the fix locations are different.

---

## 4. The permanent, universal fix (not implemented — for review)

Three independent, small, structural changes — each one applies to **every node, every field, forever**, with no per-node work required ever again:

### Fix A — Make the toggle authoritative, not cosmetic
When `handleFieldEnabledChange(fieldKey, false)` fires, also clear `config[fieldKey]` (or move it to a shadow key like `config._disabledValues[fieldKey]` if the value should be recoverable when re-enabled, rather than destroyed). Either way, "off" must mean the live `config[fieldKey]` is gone, not hidden.

### Fix B — Teach the resolution engine what "disabled" means (the single highest-leverage change)
Add one check at the very top of `resolveInputsFromConfig` (`dynamic-node-executor.ts:2258`): before reading `config[fieldName]`, call the existing `isFieldDisabledByOwner(fieldName, config)` (already implemented in `runtime-field-contract.ts`, just not imported here) and, if true, treat the field exactly as if it were `undefined` — same branch as "not present, use default if any." One function, one new branch, and every node that has ever used or ever will use the field-enable toggle is protected, retroactively, without touching a single node's code.

### Fix C — Extend Gap C's guard from "identity fields only" to "respect fillMode always"
Generalize the existing `buildFinalProviderConfig` guard (`runtime-input-handoff.ts:99-112`) so the fallback branch also requires `effectiveFillModes[fieldName]` to be `runtime_ai` or `buildtime_ai_once` before writing a resolved value into a blank config slot — not just for identity-classified fields, for *all* fields. This is a one-line condition widening, and it closes the class of bug entirely rather than field-name-pattern by field-name-pattern.

None of these three requires knowing anything about Google Calendar, Google Sheets, or any specific provider. They operate purely on `fillMode` / `_fieldEnabled`, which are universal, registry-level concepts every node already has by construction.

---

## 5. The separate, honest limit: this does not (and cannot) replace API-specific documentation

The user also asked a second, related but distinct question: *shouldn't the system have proper documentation of how each node/operation actually works, so the AI Agent gets it right?*

That's a real, separate need — and the three fixes above don't cover it. They guarantee **the user's stated intent is respected** (blank stays blank, forever, universally). They do **not** guarantee **the AI's chosen values are valid against the target API's own rules** — that's a different problem, and it's the one behind the Google Calendar `orderBy`/`singleEvents` bug fixed earlier this session (`worker/src/shared/google-calendar-executor.ts`, commit `fbbd672`): two *independently defaulted, provider-mandated-interdependent* parameters, not a blank-field issue at all.

There is no single universal fix for *that* class — API interdependency rules are inherently per-provider, undocumented in our codebase, and only discoverable by hitting them or reading each provider's real reference docs. The realistic, honest path there (already recommended in the end-to-end log, §"Recommendation") is a **process**, not a one-time patch: when a live 400/422 surfaces from any node, check that operation's code for two-or-more independently-defaulted parameters — that pattern is now a known, fast, five-minute diagnostic, not a mystery, precisely because of the work already done this session. It will never be fully front-loaded across all 178 nodes and every provider's evolving API; it is caught reactively, cheaply, each time it's hit.

---

## 6. Summary table

| Gap | Layer | File:Line | Status |
|---|---|---|---|
| A — toggle doesn't clear value | Frontend UI | `PropertiesPanel.tsx:779-788` | Open, not fixed |
| B — resolution ignores disabled flag | Worker execution engine | `dynamic-node-executor.ts:2258-2283` | Open, not fixed |
| C — write-back fallback ignores fillMode for non-identity fields | Worker execution engine | `runtime-input-handoff.ts:122-131` | Partially fixed (identity fields only, commit `43ec8b9`) |
| Provider API interdependency rules (separate class) | Per-node business logic | e.g. `google-calendar-executor.ts` | Not universally fixable; process-based |

**Recommendation: implement Fix B first.** It is the one change that, on its own, makes "the user turned a field off" an unbreakable guarantee at execution time for every node that exists today and every node added in the future — which is exactly the "don't make me implement this node-by-node again" outcome asked for. Fix A closes the same hole from the data-hygiene side (so the stale value doesn't even linger). Fix C is the smaller, independent generalization of work already half-done this session.
