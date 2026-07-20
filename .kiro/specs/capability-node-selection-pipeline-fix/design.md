# Capability Node Selection Pipeline Fix — Bugfix Design

## Overview

The capability-node-selection pipeline produces incorrect node suggestions when users describe conditional workflows. The system is **purely AI-driven**: the AI analyzes the user prompt against the node registry and selects nodes directly—no manual logic, no hardcoded mappings. However, the current implementation has five distinct defects that cause the AI to select wrong nodes (e.g., Workday instead of if_else/Gmail/Slack) with ~70% accuracy.

This design formalizes the bug condition, identifies root causes at the AI instruction level and fallback logic level, and proposes **universal, AI-driven fixes** that work for ALL conditional workflows, not just specific prompts.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when the AI pipeline selects semantically irrelevant nodes (e.g., Workday) instead of the correct nodes (if_else, Gmail, Slack) for a conditional workflow prompt
- **Property (P)**: The desired behavior when the bug condition holds — the AI must select nodes that match the user's explicit intent (form, if_else, Gmail, Slack) with high accuracy
- **Preservation**: Existing correct behavior that must remain unchanged — clean LLM responses, linear workflows, explicitly named destinations, registry validation, trigger injection
- **Intent Stage**: The AI stage in `intent-stage.ts` that extracts structured intent (trigger, actions, dataFlows) from the raw user prompt
- **Capability Selection Stage**: The AI stage in `capability-selection-stage.ts` that selects registry nodes for each action in the structured intent
- **Deterministic Fallback**: The rule-based fallback logic that activates when the AI LLM fails to return valid JSON
- **Node Registry**: The `unified-node-registry.ts` catalog that contains all available node types with metadata (keywords, categories, capabilities)
- **System Prompt**: The AI instructions in `system-prompt-builder.ts` that guide the LLM's behavior for each pipeline stage

## Bug Details

### Bug Condition

The bug manifests when a user describes a conditional workflow (e.g., "if age > 18, send Gmail; else send Slack"). The AI pipeline either corrupts the structured intent before node selection begins, or the node-scoring fallback selects semantically irrelevant nodes (Workday, Zoom Video, Amazon SES) instead of the correct nodes (form, if_else, Gmail, Slack).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type CapabilityPipelineInput
  OUTPUT: boolean
  
  RETURN (
    input.llmIntentResponse.hasMarkdownFences = true AND input.parsedIntent = null
    OR input.intentFallbackUsed = true AND input.actions.containsConditionalLanguage = true AND input.actions.length < 3
    OR input.capabilityFallbackUsed = true AND input.conditionalActionPhrase != null AND input.steps.hasIfElse = false
    OR input.selectedNode.isGenericEnterpriseNode = true AND input.stepIntentClass = 'communication'
    OR input.reconciliationAddedNode = true AND input.nodeNameNotInUserPrompt = true
  )
END FUNCTION
```

### Examples

- **Example 1 (Conditional workflow)**: User prompt: "Create an autonomous workflow where a user submits details through a form including age. If age > 18, mark the user as eligible and send a confirmation email via Gmail. If age ≤ 18, mark as not eligible and send a notification message via Slack."
  - **Expected**: form → if_else → Gmail (true branch) / Slack (false branch)
  - **Actual**: form → Workday → Zoom Video → Amazon SES
  - **Bug**: AI selects generic enterprise nodes instead of explicitly named services

- **Example 2 (Intent parse failure)**: LLM returns ` ```json\n{"intent": "...", ...}\n``` ` (markdown fences)
  - **Expected**: System strips fences and parses JSON successfully
  - **Actual**: `stripMarkdownFences()` fails, system logs `INVALID_LLM_RESPONSE`, falls back to `buildDeterministicIntent()`
  - **Bug**: Markdown fence stripping is incomplete

- **Example 3 (Deterministic intent fallback)**: `buildDeterministicIntent()` splits prompt on commas/semicolons
  - **Expected**: Discrete actions like "check age condition", "send Gmail", "send Slack"
  - **Actual**: Single oversized action "Create an autonomous workflow where a user submits details through a form including age"
  - **Bug**: Conditional language not detected, prompt not split correctly

- **Example 4 (Deterministic steps fallback)**: `buildDeterministicStepsFromIntent()` processes action phrase "if age > 18, send Gmail"
  - **Expected**: Emit `if_else` step with `intentClass: 'logic'`
  - **Actual**: No `if_else` step emitted, conditional pattern not recognized
  - **Bug**: `containsConditionalAction()` does not detect all conditional patterns

- **Edge case (Reconciliation over-generation)**: `reconcileDestinationCoverage()` infers Workday from `dataFlows[].to: "HR system"`
  - **Expected**: Only add nodes explicitly named in user prompt
  - **Actual**: Adds Workday even though user never mentioned it
  - **Bug**: Reconciliation uses AI-inferred dataFlows instead of verbatim prompt text

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Clean LLM responses (no markdown fences) must continue to parse successfully on the first attempt
- Linear workflows (no conditional logic) must continue to produce linear step lists with no if_else or switch step
- Explicitly named destinations (e.g., "send to Gmail", "notify via Slack") must continue to produce a capability step for that service
- Registry validation must continue to discard any candidate node type that does not exist in the unifiedNodeRegistry
- Trigger step injection must continue to prepend the correct trigger step when the AI omits it
- Container deduplication must continue to keep only the first occurrence of containers with the same single candidate node type

**Scope:**
All inputs that do NOT involve conditional workflows or AI pipeline failures should be completely unaffected by this fix. This includes:
- Simple linear workflows (e.g., "fetch from Sheets, send via Gmail")
- Workflows with explicitly named services (no ambiguity)
- Workflows where the AI LLM returns clean, valid JSON on the first attempt

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Incomplete Markdown Fence Stripping (Bug 1.1)**: The `stripMarkdownFences()` function in `intent-stage.ts` does not handle all markdown fence variations (e.g., nested fences, fences with language tags, fences with extra whitespace). When the LLM wraps JSON in ` ```json ... ``` `, the system fails to parse it even after calling `stripMarkdownFences()`.

2. **Deterministic Intent Fallback Too Coarse (Bug 1.2)**: The `buildDeterministicIntent()` function in `intent-stage.ts` splits the prompt on commas and semicolons, but does not detect conditional keywords (if, else, when, ≤, >) to split the prompt into discrete actions. This produces oversized action phrases that lose the conditional structure.

3. **Deterministic Steps Fallback Missing Conditional Detection (Bug 1.4)**: The `buildDeterministicStepsFromIntent()` function in `capability-selection-stage.ts` does not recognize all conditional patterns. The `containsConditionalAction()` helper only checks for keywords like "if", "when", "else", but does not detect comparison operators (>, <, ≤, ≥, ==, !=) or phrases like "check condition", "route based on", "branch".

4. **Node Scoring Too Broad (Bug 1.5)**: The `scoreDefinitionForStep()` function in `capability-selection-stage.ts` assigns high scores to nodes with generic keywords (e.g., Workday matches "data", "api", "integration"). The specificity penalty (line 858-860) is too weak: it only subtracts 5 points when more than half of matched tokens are generic. This allows generic enterprise nodes to outscore domain-specific nodes (Gmail, Slack) for communication-intent steps.

5. **Reconciliation Over-Generation (Bug 1.6)**: The `reconcileDestinationCoverage()` function in `capability-selection-stage.ts` infers destination nodes from `intent.dataFlows[].to`, `intent.dataFlows[].dataDescription`, and regex patterns on the intent text. These dataFlows are AI-inferred and may name generic services (e.g., "email service", "HR system") that resolve to unrelated nodes (Amazon SES, Workday). The function should only add nodes explicitly mentioned in the verbatim user prompt.

## Correctness Properties

Property 1: Bug Condition - Correct Nodes Selected for Conditional Form Workflow

_For any_ user prompt describing a conditional workflow with explicitly named services (e.g., "if age > 18, send via Gmail; else send via Slack"), the fixed capability-selection pipeline SHALL select the correct nodes (form, if_else, Gmail, Slack) and SHALL NOT select semantically irrelevant nodes (Workday, Zoom Video, Amazon SES).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Non-Conditional Workflow Behavior

_For any_ user prompt that does NOT describe a conditional workflow (linear workflows, simple integrations), the fixed capability-selection pipeline SHALL produce exactly the same node selection as the original pipeline, preserving all existing correct behavior for non-conditional workflows.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **AI Instruction Problem (System Prompt)**: The system prompt in `system-prompt-builder.ts` does not explicitly instruct the AI to:
   - Preserve service names verbatim (e.g., "send via Gmail" → must select `google_gmail`, not a generic email node)
   - Detect conditional language and emit `if_else` or `switch` steps
   - Prioritize domain-specific nodes over generic enterprise nodes

2. **Fallback Logic Problem (Deterministic Code)**: The deterministic fallback logic in `intent-stage.ts` and `capability-selection-stage.ts` is too coarse:
   - `buildDeterministicIntent()` does not split conditional prompts into discrete actions
   - `buildDeterministicStepsFromIntent()` does not recognize all conditional patterns
   - `scoreDefinitionForStep()` does not apply strong enough specificity penalties to generic nodes

3. **Registry Access Problem (Node Metadata)**: The node registry metadata may not provide enough signal for the AI to distinguish between:
   - Generic enterprise nodes (Workday, Zoom Video) with broad keywords
   - Domain-specific communication nodes (Gmail, Slack) with specific keywords

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `worker/src/services/ai/system-prompt-builder.ts`

**Function**: `buildCapabilitySelectionPrompt()`

**Specific Changes**:
1. **Add Service Name Preservation Rule**: Add explicit instruction to the system prompt:
   ```
   ## CRITICAL RULE — PRESERVE SERVICE NAMES VERBATIM
   When the user explicitly names a service (e.g., "send via Gmail", "notify via Slack", "post to Twitter"),
   you MUST select that exact service's node type from the catalog.
   - "Gmail" → google_gmail
   - "Slack" → slack_message
   - "Twitter" → twitter
   NEVER substitute a generic alternative (e.g., "email" → amazon_ses) when the user named a specific service.
   ```

2. **Add Conditional Logic Detection Rule**: Add explicit instruction to detect conditional workflows:
   ```
   ## CRITICAL RULE — DETECT CONDITIONAL LOGIC
   When the user describes conditional logic (if/else, switch, branching), you MUST emit a logic step:
   - Keywords: "if", "else", "when", "otherwise", "based on", "depending on", "route by", "check condition"
   - Operators: >, <, ≤, ≥, ==, !=
   - Patterns: "if X then Y else Z", "when X do Y", "route based on X"
   For binary conditions (true/false), use if_else. For multi-case conditions (3+ options), use switch.
   ```

3. **Add Specificity Penalty Rule**: Add explicit instruction to prefer domain-specific nodes:
   ```
   ## CRITICAL RULE — PREFER DOMAIN-SPECIFIC NODES
   When selecting nodes for communication-intent steps (send, notify, message, email):
   - Prioritize nodes in the "communication" category (Gmail, Slack, Telegram)
   - Deprioritize nodes in the "data" or "enterprise" category (Workday, Salesforce, SAP)
   - Generic keywords (data, api, integration) should NOT boost a node's score for communication steps
   ```

**File**: `worker/src/services/ai/stages/intent-stage.ts`

**Function**: `buildDeterministicIntent()`

**Specific Changes**:
1. **Detect Conditional Language Before Splitting**: Add conditional detection to `extractActionPhrases()`:
   ```typescript
   function extractActionPhrases(prompt: string): string[] {
     // NEW: Check if prompt contains conditional language
     if (!containsConditionalLanguage(prompt)) {
       // Existing logic: split on commas/semicolons
       return prompt
         .split(/(?:\b(?:and then|then|after that|afterwards)\b|[,;])/i)
         .map((part) => part.trim())
         .filter((part) => part.length > 0)
         .slice(0, 12);
     }
     
     // NEW: For conditional prompts, split on conditional keywords
     const actions: string[] = [];
     const segments = prompt
       .replace(/\b(else|otherwise)\b/gi, '\n$1')
       .replace(/\b(if|when)\b/gi, '\n$1')
       .split(/(?:[.;]|\r?\n)+/)
       .map((part) => part.trim())
       .filter(Boolean);
     
     // Extract condition and actions from each segment
     for (const segment of segments) {
       const conditional = segment.match(/^(if|when)\s+([\s\S]*?)(?:,\s*([\s\S]+))?$/i);
       if (conditional) {
         const condition = normalizeFallbackAction(conditional[2]);
         if (condition) actions.push(`check if ${condition}`);
         addActionParts(conditional[3] || '');
         continue;
       }
       
       const alternative = segment.match(/^(else|otherwise)\s*,?\s*([\s\S]+)$/i);
       if (alternative) {
         addActionParts(alternative[2]);
         continue;
       }
       
       addActionParts(segment);
     }
     
     return actions
       .filter((action, index, all) => all.findIndex((other) => other.toLowerCase() === action.toLowerCase()) === index)
       .slice(0, 12);
   }
   ```

2. **Enhance Conditional Detection**: Update `containsConditionalLanguage()` to detect more patterns:
   ```typescript
   function containsConditionalLanguage(value: string): boolean {
     // Check for comparison operators (including Unicode)
     if (/[\u2264\u2265]/.test(value)) return true;
     
     // Check for conditional keywords and operators
     return /\b(if|when|else|otherwise|condition|conditional|route based on|branch)\b|(?:<=|>=|==|!=|[<>]|\u2264|\u2265)/i.test(value);
   }
   ```

**File**: `worker/src/services/ai/stages/capability-selection-stage.ts`

**Function**: `buildDeterministicStepsFromIntent()`

**Specific Changes**:
1. **Enhance Conditional Action Detection**: Update `containsConditionalAction()` to detect more patterns:
   ```typescript
   function containsConditionalAction(action: string): boolean {
     const raw = String(action || '');
     const text = normalizeText(raw);
     
     // Check for conditional keywords
     const hasKeywords = /\b(if|when|else|otherwise|condition|conditional|route|switch|branch|check)\b/.test(text);
     
     // Check for comparison operators (including Unicode)
     const hasOperators = /(?:<=|>=|==|!=|[<>]|\u2264|\u2265)/.test(raw);
     
     // Check for conditional phrases
     const hasPhrases = /\b(check if|verify if|based on whether|depending on|route by|approve or reject)\b/.test(text);
     
     return hasKeywords || hasOperators || hasPhrases;
   }
   ```

2. **Emit if_else Step for Conditional Actions**: Update the logic step emission in `buildDeterministicStepsFromIntent()`:
   ```typescript
   intent.actions.forEach((action, index) => {
     if (isActionCoveredByTrigger(action, intent.triggerType)) return;

     const intentClass = inferIntentClassForAction(action);
     if (intentClass === 'logic') {
       // NEW: Only emit one logic step per workflow (avoid duplicates)
       if (hasDeterministicLogicStep) return;
       
       const logicType = unifiedNodeRegistry.resolveAlias('if_else') || 'if_else';
       if (!unifiedNodeRegistry.get(logicType)) return;
       
       steps.push({
         stepId: `action_${index + 1}`,
         stepText: action,
         intentClass,
         candidateNodeTypes: [logicType],
         defaultSuggestedNodeType: logicType,
         selectionPolicy: { multiSelectAllowed: false, required: true },
         confidence: 0.82,
         ambiguous: false,
         reason: 'Conditional action mapped to If/Else logic',
       });
       hasDeterministicLogicStep = true;
       return;
     }
     
     // ... rest of the function
   });
   ```

**File**: `worker/src/services/ai/stages/capability-selection-stage.ts`

**Function**: `scoreDefinitionForStep()`

**Specific Changes**:
1. **Strengthen Specificity Penalty**: Update the generic keyword penalty:
   ```typescript
   // OLD: Weak penalty (only -5 when >50% generic)
   const genericKeywordMatches = matchedTokens.filter((token) => GENERIC_SELECTION_TOKENS.has(token)).length;
   if (matchedTokens.length > 0 && genericKeywordMatches > matchedTokens.length / 2) {
     score -= 5;
   }
   
   // NEW: Strong penalty (scale with generic ratio)
   const genericKeywordMatches = matchedTokens.filter((token) => GENERIC_SELECTION_TOKENS.has(token)).length;
   if (matchedTokens.length > 0) {
     const genericRatio = genericKeywordMatches / matchedTokens.length;
     if (genericRatio > 0.3) {
       // Penalty scales from -10 (30% generic) to -20 (100% generic)
       score -= Math.floor(10 + (genericRatio - 0.3) * 14);
     }
   }
   ```

2. **Add Category Mismatch Penalty**: Add penalty when node category doesn't match intent class:
   ```typescript
   // NEW: Penalize category mismatch for communication steps
   if (step.intentClass === 'communication' && category === 'data_source') {
     score -= 8;
   }
   
   // NEW: Penalize enterprise nodes for communication steps
   if (step.intentClass === 'communication' && (def.category === 'data' || def.category === 'enterprise')) {
     score -= 12;
   }
   ```

**File**: `worker/src/services/ai/stages/capability-selection-stage.ts`

**Function**: `reconcileDestinationCoverage()`

**Specific Changes**:
1. **Gate on Verbatim Prompt Text**: Update `collectDestinationCoverageTargets()` to only use the original prompt:
   ```typescript
   function collectDestinationCoverageTargets(intent: StructuredIntent): DestinationCoverageTarget[] {
     const targets: DestinationCoverageTarget[] = [];
     const seen = new Set<string>();

     // Use the verbatim user prompt so service names like "Gmail" and "Slack" are
     // always present, regardless of how the AI summarised the intent field.
     const promptText = intent.originalPrompt || intent.intent;

     const addTarget = (
       rawText: string,
       source: string,
       fallbackStepText?: string,
     ) => {
       const candidate = resolveDestinationNode(rawText, intent);
       if (!candidate || seen.has(candidate.nodeType)) return;
       
       // NEW: Gate on the original prompt — not the AI-summarised intent string.
       if (!isNodeExplicitlyMentioned(candidate.nodeType, promptText)) return;
       
       const def = unifiedNodeRegistry.get(candidate.nodeType);
       targets.push({
         nodeType: candidate.nodeType,
         stepText: fallbackStepText || buildDestinationStepText(def?.label || candidate.nodeType),
         confidence: Math.max(0.8, Math.min(1, candidate.score / 30)),
         reason: `Destination coverage inferred from ${source}`,
         source,
       });
       seen.add(candidate.nodeType);
     };

     // NEW: Only scan phrases that appear verbatim in the user's original prompt.
     // dataFlows entries are AI-inferred and may name generic services (e.g.
     // "email service") that resolve to unrelated nodes — skip them entirely.
     for (const phrase of extractDestinationPhrases(promptText)) {
       addTarget(phrase, 'prompt.destination_phrase');
     }

     return targets;
   }
   ```

2. **Add Explicit Mention Check**: Add helper function to verify node is mentioned in prompt:
   ```typescript
   function isNodeExplicitlyMentioned(nodeType: string, promptText: string): boolean {
     const def = unifiedNodeRegistry.get(nodeType);
     const phrases = explicitMentionPhrasesForNode(nodeType, def);
     return phrases.some((phrase) => containsNormalizedPhrase(promptText, phrase));
   }

   function explicitMentionPhrasesForNode(
     nodeType: string,
     def: NonNullable<ReturnType<typeof unifiedNodeRegistry.get>> | undefined,
   ): string[] {
     const base = [
       nodeType,
       nodeType.replace(/_/g, ' '),
       def?.label || '',
     ];
     
     // Service-specific aliases
     const serviceAliases: Record<string, string[]> = {
       google_gmail: ['gmail', 'google gmail', 'email', 'mail'],
       slack_message: ['slack', 'slack message'],
       slack_webhook: ['slack', 'slack webhook'],
       amazon_ses: ['amazon ses', 'aws ses', 'ses'],
       zoom_video: ['zoom', 'zoom video', 'zoom meeting', 'video call'],
       workday: ['workday'],
     };
     
     return [...base, ...(serviceAliases[nodeType] || [])]
       .map(normalizeText)
       .filter((phrase, index, all) => phrase.length > 1 && all.indexOf(phrase) === index);
   }

   function containsNormalizedPhrase(text: string, phrase: string): boolean {
     const normalizedText = ` ${normalizeText(text)} `;
     const normalizedPhrase = normalizeText(phrase);
     return normalizedPhrase.length > 1 && normalizedText.includes(` ${normalizedPhrase} `);
   }
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the conditional workflow prompt and assert that the correct nodes (form, if_else, Gmail, Slack) are selected. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Conditional Form Workflow Test**: Simulate the prompt "Create an autonomous workflow where a user submits details through a form including age. If age > 18, mark the user as eligible and send a confirmation email via Gmail. If age ≤ 18, mark as not eligible and send a notification message via Slack." (will fail on unfixed code)
2. **Markdown Fence Test**: Simulate LLM response wrapped in ` ```json ... ``` ` (will fail on unfixed code)
3. **Deterministic Intent Fallback Test**: Force intent stage to use `buildDeterministicIntent()` and verify it splits conditional prompts correctly (will fail on unfixed code)
4. **Deterministic Steps Fallback Test**: Force capability stage to use `buildDeterministicStepsFromIntent()` and verify it emits `if_else` step (will fail on unfixed code)
5. **Node Scoring Test**: Verify that Gmail/Slack score higher than Workday/Zoom for communication-intent steps (will fail on unfixed code)
6. **Reconciliation Test**: Verify that Workday is NOT added when user never mentioned it (will fail on unfixed code)

**Expected Counterexamples**:
- Workday, Zoom Video, Amazon SES are selected instead of Gmail, Slack
- No `if_else` step is emitted for conditional prompts
- Markdown fences cause JSON parse failure
- Deterministic fallback produces oversized action phrases
- Generic enterprise nodes outscore domain-specific communication nodes

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := runCapabilitySelectionPipeline_fixed(input)
  ASSERT result.steps.some(s => s.intentClass = 'trigger' AND s.candidateNodeTypes.includes('form'))
  ASSERT result.steps.some(s => s.intentClass = 'logic' AND s.candidateNodeTypes.includes('if_else'))
  ASSERT result.steps.some(s => s.intentClass = 'communication' AND s.candidateNodeTypes.includes('gmail'))
  ASSERT result.steps.some(s => s.intentClass = 'communication' AND s.candidateNodeTypes.includes('slack'))
  ASSERT NOT result.steps.some(s => s.candidateNodeTypes.includes('workday'))
  ASSERT NOT result.steps.some(s => s.candidateNodeTypes.includes('zoom_video'))
  ASSERT NOT result.steps.some(s => s.candidateNodeTypes.includes('amazon_ses'))
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT runCapabilitySelectionPipeline_original(input) = runCapabilitySelectionPipeline_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for linear workflows and explicitly named services, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Linear Workflow Preservation**: Verify that "fetch from Sheets, send via Gmail" continues to produce form → google_sheets → google_gmail
2. **Explicit Service Preservation**: Verify that "send via Gmail" continues to select google_gmail (not amazon_ses)
3. **Clean LLM Response Preservation**: Verify that clean JSON responses (no markdown fences) continue to parse on first attempt
4. **Trigger Injection Preservation**: Verify that workflows without a trigger step continue to get a trigger prepended
5. **Registry Validation Preservation**: Verify that unregistered node types continue to be discarded

### Unit Tests

- Test markdown fence stripping for all fence variations (` ```json ... ``` `, ` ``` ... ``` `, nested fences)
- Test conditional language detection for all patterns (if/else, when, operators, phrases)
- Test deterministic intent fallback for conditional prompts (verify discrete actions)
- Test deterministic steps fallback for conditional actions (verify if_else step emission)
- Test node scoring for communication-intent steps (verify Gmail/Slack outscore Workday/Zoom)
- Test reconciliation for nodes not mentioned in prompt (verify Workday is NOT added)

### Property-Based Tests

- Generate random conditional workflow prompts and verify correct nodes are selected
- Generate random linear workflow prompts and verify behavior is unchanged
- Generate random LLM responses (with/without markdown fences) and verify parsing succeeds
- Generate random node registry configurations and verify scoring is consistent

### Integration Tests

- Test full pipeline flow for conditional workflow prompt (intent → capability → validation)
- Test full pipeline flow for linear workflow prompt (verify preservation)
- Test full pipeline flow with LLM failures (verify fallback logic works correctly)
