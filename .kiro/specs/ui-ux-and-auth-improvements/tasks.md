# Implementation Plan: UI/UX and Auth Improvements

## Overview

Seven independent improvements across the React frontend and Node.js/Express backend. Tasks are ordered to deliver backend infrastructure first, then frontend changes, then AI/prompt improvements.

## Tasks

- [x] 1. Create DELETE /api/user/account backend endpoint
  - [x] 1.1 Create `worker/src/api/delete-account.ts` with the handler
    - Extract Bearer token from `Authorization` header; return 401 if missing
    - Call `supabase.auth.getUser(token)` to resolve caller's `user.id`
    - Call `supabase.auth.admin.deleteUser(user.id)` to delete only the caller's own account
    - Return `{ success: true }` on success or `{ error: string }` on failure with appropriate HTTP status
    - _Requirements: 1.4, 1.5, 1.8_

  - [x] 1.2 Write property test for delete endpoint — only deletes own account (P1)
    - **Property 1: Delete endpoint only deletes the authenticated user's own account**
    - Generate random user IDs; mock Supabase `getUser` and `admin.deleteUser`; assert `deleteUser` is called with the token's own `user.id` only
    - **Validates: Requirements 1.4**

  - [x] 1.3 Write property test for delete endpoint — full data removal (P2)
    - **Property 2: Delete endpoint removes both auth record and profile data**
    - Generate random users; mock Supabase; assert both auth and profile records are absent after a successful call
    - **Validates: Requirements 1.5**

  - [x] 1.4 Register the route in `worker/src/index.ts`
    - Add `import deleteAccountRoute from './api/delete-account'`
    - Register `app.delete('/api/user/account', asyncHandler(deleteAccountRoute))` on a route separate from `admin-users.ts`
    - _Requirements: 1.8_

- [x] 2. Add Delete Account UI to Profile.tsx
  - [x] 2.1 Add `deleting` state, `handleDeleteAccount` function, and AlertDialog UI
    - Import `Trash2` from lucide-react and `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` from `@/components/ui/alert-dialog`
    - Add `const [deleting, setDeleting] = useState(false)` state
    - Implement `handleDeleteAccount`: call `DELETE /api/user/account` with session JWT; on success call `signOut()` then `navigate('/')`; on error show destructive toast and leave session intact
    - In the Account card, render a `<AlertDialog>` triggered by a `variant="destructive"` Button labeled "Delete Account" alongside the existing Sign Out button
    - Dialog body must warn the action is permanent and require clicking a "Delete Account" confirm button
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7_

- [x] 3. Checkpoint — Ensure delete account tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Reposition Templates search bar inline with heading
  - [x] 4.1 Refactor the header block in `Templates.tsx` to a flex row
    - Replace the two-block layout (heading div + standalone Input) with a single `<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">`
    - Place the heading/description `<div>` on the left and the `<Input>` on the right with `className="max-w-md md:w-72"`
    - Remove the standalone `<Input>` block that currently sits below the heading
    - Preserve all `filteredTemplates` logic unchanged
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 Write property test for template search filtering (P3)
    - **Property 3: Template search filtering is preserved after layout change**
    - Generate random template lists and search strings; assert filtered output matches name/description case-insensitive contains check — identical before and after layout change
    - **Validates: Requirements 2.5**

- [x] 5. Fix Zoho connector button and card layout in ConnectionsPanel.tsx
  - [x] 5.1 Add `open` and `onOpenChange` props to `ZohoConnectionStatus.tsx`
    - Extend `ZohoConnectionStatusProps` with `open?: boolean` and `onOpenChange?: (open: boolean) => void`
    - When `open` prop is provided, use it to control `isDialogOpen` state (controlled mode); otherwise keep existing uncontrolled behavior
    - _Requirements: 3.3_

  - [x] 5.2 Update the Zoho card in `ConnectionsPanel.tsx` to own the Connect/Disconnect buttons
    - Add `isZohoDialogOpen` state to `ConnectionsPanel`
    - Render a `variant="default"` Connect button (matching all other cards) when Zoho is disconnected; clicking it sets `isZohoDialogOpen(true)`
    - Render a `variant="outline"` Disconnect button when Zoho is connected
    - Render `<ZohoConnectionStatus open={isZohoDialogOpen} onOpenChange={setIsZohoDialogOpen} compact={true} />` alongside the card to keep credential form logic inside `ZohoConnectionStatus`
    - Remove the ghost-style red "Connect Zoho" button that was previously rendered by `ZohoConnectionStatus` in non-compact mode
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.3 Write property test for uniform card layout structure (P4)
    - **Property 4: All connector cards share a uniform layout structure**
    - Parameterize over all 7 connector types; assert rendered DOM contains icon element, name label, status text, and action button within the same structural hierarchy
    - **Validates: Requirements 3.5**

- [x] 6. Fix connector card hover effect in ConnectionsPanel.tsx
  - [x] 6.1 Apply hover scale only to outermost card container; remove group-hover from children
    - Ensure each connector card container has `transition-transform hover:scale-[1.02]` and no `group` class
    - Remove any `group-hover:` classes from child elements (icon, name, status, buttons) across all connector cards
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.2 Write property test for hover scale uniformity (P6)
    - **Property 6: Hover scale is applied uniformly to all connector cards**
    - Parameterize over all 7 connector types; simulate hover; assert same `hover:scale-[1.02]` class on outermost container
    - **Validates: Requirements 4.3**

  - [x] 6.3 Write property test for hover no credentials change (P5)
    - **Property 5: Hover does not affect credentials visibility for any connector card**
    - Parameterize over all 7 connector types; simulate hover; assert no visibility, opacity, background, or highlight change on any credentials/sensitive field elements
    - **Validates: Requirements 4.2**

- [x] 7. Remove BusinessValueSection and TrustSection from Index.tsx
  - [x] 7.1 Delete the two component usages and their imports from `Index.tsx`
    - Remove `import { BusinessValueSection } from "@/components/landing/BusinessValueSection"`
    - Remove `import { TrustSection } from "@/components/landing/TrustSection"`
    - Remove `<BusinessValueSection />` and `<TrustSection />` from the JSX render tree
    - Verify all other sections remain in their current order
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. Reduce vertical padding across all landing section components
  - [x] 8.1 Update `py-24 sm:py-32` → `py-12 sm:py-16` in 11 section files
    - Apply the change to: `HowItWorks.tsx`, `WorkflowDemoSection.tsx`, `OpenCoreSection.tsx`, `PluginsApiSection.tsx`, `IndustryVerticalsSection.tsx`, `WhyCtrlChecksSection.tsx`, `Features.tsx`, `Pricing.tsx`, `SubscriptionSection.tsx`, `FaqSection.tsx`, `CTA.tsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 8.2 Update `py-16 sm:py-20` → `py-8 sm:py-10` in `IntegrationsMarqueeSection.tsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 8.3 Write property test for reduced padding on all remaining sections (P6/design)
    - **Property 6 (design): All remaining landing sections use reduced vertical padding**
    - For every `<section>` in the 12 updated components, assert `className` contains `py-12` (or `py-8` for IntegrationsMarqueeSection) and does NOT contain `py-24` or `py-32`
    - **Validates: Requirements 6.1, 6.2**

- [x] 9. Checkpoint — Ensure all frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Improve AI workflow summary generation in workflow-builder.ts
  - [x] 10.1 Add `deriveSummaryFromPrompt` private helper to `AgenticWorkflowBuilder`
    - Implement `private deriveSummaryFromPrompt(userPrompt: string): string` that extracts up to 12 words from the prompt, title-cases each word, and returns the joined string; return `"Custom Workflow"` for empty input
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 10.2 Write property test for fallback summaries not static (P8)
    - **Property 8: Fallback summaries are derived from the prompt, not static templates**
    - Generate random prompts; assert `deriveSummaryFromPrompt` output ≠ `"Minimal fallback workflow for: {prompt}"` and ≠ `"Conditional fallback workflow for: {prompt}"`, and contains words from the prompt
    - **Validates: Requirements 7.3, 7.4**

  - [x] 10.3 Write property test for summary length and title-case invariants (P9)
    - **Property 9: All generated workflow summaries satisfy length and title-case invariants**
    - Generate random prompts; assert `deriveSummaryFromPrompt` output has 5–15 words and every word begins with an uppercase letter
    - **Validates: Requirements 7.5**

  - [x] 10.4 Replace static fallback summary strings in `generateMinimalFallbackWorkflow` and `generateConditionalBranchingFallbackWorkflow`
    - Replace `"Minimal fallback workflow for: ${userPrompt}"` with `this.deriveSummaryFromPrompt(userPrompt)`
    - Replace `"Conditional fallback workflow for: ${userPrompt}"` with `this.deriveSummaryFromPrompt(userPrompt)`
    - _Requirements: 7.3, 7.4_

  - [x] 10.5 Add summary instruction to the Gemini system prompt in `planWorkflowWithGemini`
    - Locate the `systemPrompt` / `systemPromptBuilder.build()` call inside `planWorkflowWithGemini`
    - Append the instruction block specifying: `summary` must be 5–15 words, title-case, include primary integration names and core action verb, and must NOT use generic labels like "Workflow", "Automation", or "Process"
    - Include an example: `"Sync Gmail Attachments to Google Sheets Daily"`
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 10.6 Write property test for summary containing prompt-relevant terms (P7)
    - **Property 7: Generated workflow summary contains prompt-relevant terms**
    - Generate prompts containing known integration names (e.g. "Gmail", "Slack"); assert `deriveSummaryFromPrompt` output contains at least one of those terms
    - **Validates: Requirements 7.1, 7.2**

  - [x] 10.7 Write property test for semantically different prompts producing different summaries (P10)
    - **Property 10: Semantically different prompts produce different summaries**
    - Generate pairs of distinct prompts describing different integrations or actions; assert `deriveSummaryFromPrompt` returns different strings for each
    - **Validates: Requirements 7.6**

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (TypeScript) with a minimum of 100 iterations per property
- Tasks 1–3 (backend endpoint) and tasks 4–9 (frontend) are independent and can be worked in parallel
- Task 10 (workflow-builder) is fully independent of all other tasks
