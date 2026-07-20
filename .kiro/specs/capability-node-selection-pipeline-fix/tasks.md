# Implementation Tasks

## Task 1: Write Bug Condition Exploration Property Test

Write a property-based test that explores the bug condition on UNFIXED code to surface counterexamples demonstrating the five pipeline defects.

**Acceptance Criteria:**
- Test simulates the conditional workflow prompt: "Create an autonomous workflow where a user submits details through a form including age. If age > 18, mark the user as eligible and send a confirmation email via Gmail. If age ≤ 18, mark as not eligible and send a notification message via Slack."
- Test calls the UNFIXED `POST /api/capability-selection/analyze` endpoint
- Test asserts that the result SHOULD contain: form, if_else, gmail, slack
- Test asserts that the result SHOULD NOT contain: workday, zoom_video, amazon_ses
- Test FAILS on unfixed code, surfacing counterexamples (e.g., Workday selected instead of Gmail/Slack)
- Test documents the counterexamples found (which wrong nodes were selected)

**References:**
- Bugfix Requirements: Section 1 (Current Behavior), Section 2 (Expected Behavior)
- Design: Bug Condition section, Exploratory Bug Condition Checking section

**Files to Modify:**
- Create: `worker/src/services/ai/stages/__tests__/capability-selection-bug-exploration.test.ts`

---

## Task 2: Enhance System Prompt with Service Name Preservation Rule

Add explicit AI instruction to preserve service names verbatim when the user explicitly names a service (e.g., "send via Gmail" → must select `google_gmail`, not a generic email node).

**Acceptance Criteria:**
- System prompt includes new section: "CRITICAL RULE — PRESERVE SERVICE NAMES VERBATIM"
- Rule explicitly maps common service names to node types: Gmail → google_gmail, Slack → slack_message, Twitter → twitter
- Rule instructs AI to NEVER substitute a generic alternative when user named a specific service
- Rule is added to the capability selection stage prompt (not intent stage)

**References:**
- Bugfix Requirements: 2.1, 2.4, 2.5
- Design: Fix Implementation section, system-prompt-builder.ts changes

**Files to Modify:**
- `worker/src/services/ai/system-prompt-builder.ts` (function: `buildCapabilitySelectionPrompt()`)

---

## Task 3: Enhance System Prompt with Conditional Logic Detection Rule

Add explicit AI instruction to detect conditional logic patterns and emit if_else or switch steps.

**Acceptance Criteria:**
- System prompt includes new section: "CRITICAL RULE — DETECT CONDITIONAL LOGIC"
- Rule lists conditional keywords: if, else, when, otherwise, based on, depending on, route by, check condition
- Rule lists conditional operators: >, <, ≤, ≥, ==, !=
- Rule lists conditional patterns: "if X then Y else Z", "when X do Y", "route based on X"
- Rule instructs AI to use if_else for binary conditions, switch for multi-case conditions (3+ options)
- Rule is added to the capability selection stage prompt (not intent stage)

**References:**
- Bugfix Requirements: 2.2, 2.3, 2.4
- Design: Fix Implementation section, system-prompt-builder.ts changes

**Files to Modify:**
- `worker/src/services/ai/system-prompt-builder.ts` (function: `buildCapabilitySelectionPrompt()`)

---

## Task 4: Enhance System Prompt with Specificity Penalty Rule

Add explicit AI instruction to prefer domain-specific nodes over generic enterprise nodes for communication-intent steps.

**Acceptance Criteria:**
- System prompt includes new section: "CRITICAL RULE — PREFER DOMAIN-SPECIFIC NODES"
- Rule instructs AI to prioritize nodes in the "communication" category (Gmail, Slack, Telegram) for communication steps
- Rule instructs AI to deprioritize nodes in the "data" or "enterprise" category (Workday, Salesforce, SAP) for communication steps
- Rule instructs AI that generic keywords (data, api, integration) should NOT boost a node's score for communication steps
- Rule is added to the capability selection stage prompt (not intent stage)

**References:**
- Bugfix Requirements: 2.5
- Design: Fix Implementation section, system-prompt-builder.ts changes

**Files to Modify:**
- `worker/src/services/ai/system-prompt-builder.ts` (function: `buildCapabilitySelectionPrompt()`)

---

## Task 5: Enhance Markdown Fence Stripping

Improve the `stripMarkdownFences()` function to handle all markdown fence variations (nested fences, fences with language tags, fences with extra whitespace).

**Acceptance Criteria:**
- Function successfully strips markdown fences from LLM responses: ` ```json\n{...}\n``` `, ` ```\n{...}\n``` `, ` ``` {...} ``` `
- Function handles nested fences (fences within fences)
- Function handles fences with language tags (json, typescript, javascript)
- Function handles fences with extra whitespace before/after
- Function returns the clean JSON string without fences
- Unit tests verify all fence variations are handled correctly

**References:**
- Bugfix Requirements: 1.1, 2.1
- Design: Fix Implementation section, intent-stage.ts changes (Bug 1)

**Files to Modify:**
- `worker/src/services/ai/stages/intent-stage.ts` (function: `stripMarkdownFences()`)
- Create: `worker/src/services/ai/stages/__tests__/intent-stage-markdown-fence.test.ts`

---

## Task 6: Enhance Deterministic Intent Fallback with Conditional Detection

Update `buildDeterministicIntent()` to detect conditional keywords and split conditional prompts into discrete actions that preserve the conditional structure.

**Acceptance Criteria:**
- Function detects conditional language in the prompt using `containsConditionalLanguage()` helper
- For conditional prompts, function splits on conditional keywords (if, when, else, otherwise) instead of commas/semicolons
- Function extracts discrete actions: "check if [condition]", "[true action]", "[false action]"
- Function preserves the conditional structure (does not merge conditional actions into one oversized phrase)
- For non-conditional prompts, function continues to use existing comma/semicolon splitting logic
- Unit tests verify conditional prompts are split correctly

**References:**
- Bugfix Requirements: 1.2, 2.2
- Design: Fix Implementation section, intent-stage.ts changes (Bug 2)

**Files to Modify:**
- `worker/src/services/ai/stages/intent-stage.ts` (function: `buildDeterministicIntent()`, helper: `extractActionPhrases()`)
- Create: `worker/src/services/ai/stages/__tests__/intent-stage-conditional-fallback.test.ts`

---

## Task 7: Enhance Conditional Language Detection

Update `containsConditionalLanguage()` helper to detect more conditional patterns (comparison operators, conditional phrases).

**Acceptance Criteria:**
- Function detects conditional keywords: if, when, else, otherwise, condition, conditional, route based on, branch
- Function detects comparison operators: <=, >=, ==, !=, <, >, ≤, ≥ (including Unicode)
- Function detects conditional phrases: check if, verify if, based on whether, depending on, route by, approve or reject
- Function returns true if any pattern is detected, false otherwise
- Unit tests verify all patterns are detected correctly

**References:**
- Bugfix Requirements: 1.2, 1.4, 2.2, 2.4
- Design: Fix Implementation section, intent-stage.ts changes (Bug 2)

**Files to Modify:**
- `worker/src/services/ai/stages/intent-stage.ts` (function: `containsConditionalLanguage()`)
- Create: `worker/src/services/ai/stages/__tests__/conditional-language-detection.test.ts`

---

## Task 8: Enhance Deterministic Steps Fallback with Conditional Action Detection

Update `buildDeterministicStepsFromIntent()` to recognize conditional actions and emit if_else steps.

**Acceptance Criteria:**
- Function uses enhanced `containsConditionalAction()` helper to detect conditional actions
- For conditional actions, function emits an if_else step with `intentClass: 'logic'`
- Function only emits ONE logic step per workflow (avoids duplicates)
- Function verifies if_else node type exists in the registry before emitting
- For non-conditional actions, function continues to use existing logic
- Unit tests verify if_else step is emitted for conditional actions

**References:**
- Bugfix Requirements: 1.4, 2.4
- Design: Fix Implementation section, capability-selection-stage.ts changes (Bug 3)

**Files to Modify:**
- `worker/src/services/ai/stages/capability-selection-stage.ts` (function: `buildDeterministicStepsFromIntent()`)
- Create: `worker/src/services/ai/stages/__tests__/capability-selection-conditional-fallback.test.ts`

---

## Task 9: Enhance Conditional Action Detection

Update `containsConditionalAction()` helper to detect more conditional patterns (comparison operators, conditional phrases).

**Acceptance Criteria:**
- Function detects conditional keywords: if, when, else, otherwise, condition, conditional, route, switch, branch, check
- Function detects comparison operators: <=, >=, ==, !=, <, >, ≤, ≥ (including Unicode)
- Function detects conditional phrases: check if, verify if, based on whether, depending on, route by, approve or reject
- Function returns true if any pattern is detected, false otherwise
- Unit tests verify all patterns are detected correctly

**References:**
- Bugfix Requirements: 1.4, 2.4
- Design: Fix Implementation section, capability-selection-stage.ts changes (Bug 3)

**Files to Modify:**
- `worker/src/services/ai/stages/capability-selection-stage.ts` (function: `containsConditionalAction()`)
- Create: `worker/src/services/ai/stages/__tests__/conditional-action-detection.test.ts`

---

## Task 10: Strengthen Node Scoring Specificity Penalty

Update `scoreDefinitionForStep()` to apply stronger specificity penalties to nodes with generic keyword matches.

**Acceptance Criteria:**
- Function calculates generic keyword ratio: `genericMatches / totalMatches`
- For generic ratio > 0.3, function applies scaled penalty: `-10` to `-20` points (scales linearly from 30% to 100% generic)
- Old penalty (flat -5 when >50% generic) is replaced with new scaled penalty
- Function continues to use existing scoring logic for non-generic matches
- Unit tests verify generic nodes (Workday, Zoom) score lower than domain-specific nodes (Gmail, Slack) for communication steps

**References:**
- Bugfix Requirements: 1.5, 2.5
- Design: Fix Implementation section, capability-selection-stage.ts changes (Bug 4)

**Files to Modify:**
- `worker/src/services/ai/stages/capability-selection-stage.ts` (function: `scoreDefinitionForStep()`)
- Create: `worker/src/services/ai/stages/__tests__/node-scoring-specificity.test.ts`

---

## Task 11: Add Category Mismatch Penalty to Node Scoring

Update `scoreDefinitionForStep()` to penalize nodes whose category doesn't match the step's intent class.

**Acceptance Criteria:**
- For communication-intent steps, function applies -8 penalty to data_source category nodes
- For communication-intent steps, function applies -12 penalty to data/enterprise category nodes
- Function continues to use existing scoring logic for category matches
- Unit tests verify enterprise nodes (Workday, Salesforce) score lower than communication nodes (Gmail, Slack) for communication steps

**References:**
- Bugfix Requirements: 1.5, 2.5
- Design: Fix Implementation section, capability-selection-stage.ts changes (Bug 4)

**Files to Modify:**
- `worker/src/services/ai/stages/capability-selection-stage.ts` (function: `scoreDefinitionForStep()`)
- Create: `worker/src/services/ai/stages/__tests__/node-scoring-category-mismatch.test.ts`

---

## Task 12: Gate Reconciliation on Verbatim Prompt Text

Update `reconcileDestinationCoverage()` to only add destination nodes that are explicitly mentioned in the user's original prompt (not AI-inferred dataFlows).

**Acceptance Criteria:**
- Function uses `intent.originalPrompt` (verbatim user text) instead of `intent.intent` (AI-summarized)
- Function only scans destination phrases from the original prompt (not dataFlows metadata)
- Function calls `isNodeExplicitlyMentioned()` to verify node is mentioned in prompt before adding
- Function does NOT add nodes inferred from `dataFlows[].to` or `dataFlows[].dataDescription`
- Unit tests verify Workday is NOT added when user never mentioned it

**References:**
- Bugfix Requirements: 1.6, 2.6
- Design: Fix Implementation section, capability-selection-stage.ts changes (Bug 5)

**Files to Modify:**
- `worker/src/services/ai/stages/capability-selection-stage.ts` (function: `reconcileDestinationCoverage()`, helper: `collectDestinationCoverageTargets()`)
- Create: `worker/src/services/ai/stages/__tests__/reconciliation-verbatim-prompt.test.ts`

---

## Task 13: Add Explicit Mention Check Helper

Create `isNodeExplicitlyMentioned()` helper function to verify a node is mentioned in the user's original prompt.

**Acceptance Criteria:**
- Function takes `nodeType` and `promptText` as parameters
- Function retrieves node definition from registry
- Function generates explicit mention phrases using `explicitMentionPhrasesForNode()` helper
- Function checks if any phrase appears in the prompt using `containsNormalizedPhrase()` helper
- Function returns true if node is explicitly mentioned, false otherwise
- Unit tests verify Gmail/Slack are detected when mentioned, Workday is not detected when not mentioned

**References:**
- Bugfix Requirements: 2.6
- Design: Fix Implementation section, capability-selection-stage.ts changes (Bug 5)

**Files to Modify:**
- `worker/src/services/ai/stages/capability-selection-stage.ts` (function: `isNodeExplicitlyMentioned()`)
- Create: `worker/src/services/ai/stages/__tests__/explicit-mention-check.test.ts`

---

## Task 14: Add Explicit Mention Phrases Helper

Create `explicitMentionPhrasesForNode()` helper function to generate all possible phrases that indicate a node is explicitly mentioned.

**Acceptance Criteria:**
- Function takes `nodeType` and `nodeDef` as parameters
- Function generates base phrases: node type, node type with spaces, node label
- Function includes service-specific aliases: gmail → ["gmail", "google gmail", "email", "mail"], slack → ["slack", "slack message"]
- Function normalizes all phrases and removes duplicates
- Function returns array of normalized phrases
- Unit tests verify all aliases are generated correctly

**References:**
- Bugfix Requirements: 2.6
- Design: Fix Implementation section, capability-selection-stage.ts changes (Bug 5)

**Files to Modify:**
- `worker/src/services/ai/stages/capability-selection-stage.ts` (function: `explicitMentionPhrasesForNode()`)
- Create: `worker/src/services/ai/stages/__tests__/explicit-mention-phrases.test.ts`

---

## Task 15: Add Normalized Phrase Containment Helper

Create `containsNormalizedPhrase()` helper function to check if a normalized phrase appears in text.

**Acceptance Criteria:**
- Function takes `text` and `phrase` as parameters
- Function normalizes both text and phrase using `normalizeText()`
- Function checks if phrase appears as a whole word in text (not substring match)
- Function returns true if phrase is found, false otherwise
- Unit tests verify whole-word matching works correctly (e.g., "gmail" matches "send via Gmail" but not "gmailbox")

**References:**
- Bugfix Requirements: 2.6
- Design: Fix Implementation section, capability-selection-stage.ts changes (Bug 5)

**Files to Modify:**
- `worker/src/services/ai/stages/capability-selection-stage.ts` (function: `containsNormalizedPhrase()`)
- Create: `worker/src/services/ai/stages/__tests__/normalized-phrase-containment.test.ts`

---

## Task 16: Write Fix Checking Property Test

Write a property-based test that verifies the fix works correctly for all inputs where the bug condition holds.

**Acceptance Criteria:**
- Test simulates the conditional workflow prompt on FIXED code
- Test asserts that result contains: form, if_else, gmail, slack
- Test asserts that result does NOT contain: workday, zoom_video, amazon_ses
- Test PASSES on fixed code
- Test uses property-based testing to generate variations of conditional prompts
- Test documents that the fix resolves all five pipeline defects

**References:**
- Bugfix Requirements: Section 2 (Expected Behavior)
- Design: Fix Checking section

**Files to Modify:**
- Create: `worker/src/services/ai/stages/__tests__/capability-selection-fix-checking.test.ts`

---

## Task 17: Write Preservation Checking Property Tests

Write property-based tests that verify existing correct behavior is unchanged for non-conditional workflows.

**Acceptance Criteria:**
- Test verifies linear workflows continue to produce linear step lists (no if_else or switch)
- Test verifies explicitly named services continue to be selected correctly (Gmail → google_gmail, not amazon_ses)
- Test verifies clean LLM responses (no markdown fences) continue to parse on first attempt
- Test verifies trigger injection continues to work when AI omits trigger
- Test verifies registry validation continues to discard unregistered node types
- Test verifies container deduplication continues to work correctly
- Tests use property-based testing to generate many test cases automatically
- Tests PASS on both unfixed and fixed code (behavior unchanged)

**References:**
- Bugfix Requirements: Section 3 (Unchanged Behavior)
- Design: Preservation Checking section

**Files to Modify:**
- Create: `worker/src/services/ai/stages/__tests__/capability-selection-preservation.test.ts`

---

## Task 18: Write Integration Test for Full Pipeline Flow

Write an integration test that verifies the full pipeline flow (intent → capability → validation) for conditional workflows.

**Acceptance Criteria:**
- Test calls the full `POST /api/capability-selection/analyze` endpoint
- Test simulates the conditional workflow prompt
- Test verifies intent stage produces discrete actions (not oversized phrases)
- Test verifies capability stage produces correct steps (form, if_else, gmail, slack)
- Test verifies validation stage accepts the result (no structural errors)
- Test PASSES on fixed code

**References:**
- Bugfix Requirements: All sections
- Design: Integration Tests section

**Files to Modify:**
- Create: `worker/src/services/ai/stages/__tests__/capability-selection-integration.test.ts`

---

## Task 19: Update Documentation

Update the capability-selection pipeline documentation to reflect the new behavior and fixes.

**Acceptance Criteria:**
- Documentation explains the five pipeline defects and how they were fixed
- Documentation explains the system prompt enhancements (service name preservation, conditional logic detection, specificity penalty)
- Documentation explains the fallback logic enhancements (conditional detection, if_else emission, specificity penalties, reconciliation gating)
- Documentation includes examples of conditional workflows and expected node selections
- Documentation includes troubleshooting guide for common issues

**References:**
- Bugfix Requirements: All sections
- Design: All sections

**Files to Modify:**
- Create: `worker/docs/capability-selection-pipeline-fixes.md`
