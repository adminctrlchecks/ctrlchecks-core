# Requirements Document

## Introduction

This feature covers seven targeted UI/UX and functional improvements to the workflow automation platform. The changes span the frontend (React/TypeScript) and backend (Node.js/Express worker), addressing account management, layout polish, connector consistency, homepage spacing, and AI-generated workflow title quality.

## Glossary

- **Profile_Page**: The React page at `ctrl_checks/src/pages/Profile.tsx` where users manage their account and connections.
- **Delete_Account_Endpoint**: A new backend REST endpoint (separate from the admin-only endpoint in `admin-users.ts`) that allows an authenticated user to permanently delete their own account.
- **Templates_Page**: The React page at `ctrl_checks/src/pages/Templates.tsx` that lists workflow templates.
- **Connections_Panel**: The React component at `ctrl_checks/src/components/ConnectionsPanel.tsx` that renders connector cards in a popover.
- **Zoho_Connector**: The Zoho integration card rendered via `ZohoConnectionStatus.tsx` inside the Connections_Panel.
- **Connector_Card**: An individual integration card (e.g. Google, LinkedIn, Zoho) rendered inside the Connections_Panel.
- **Index_Page**: The landing page at `ctrl_checks/src/pages/Index.tsx`.
- **BusinessValueSection**: The React component at `ctrl_checks/src/components/landing/BusinessValueSection.tsx`.
- **TrustSection**: The React component at `ctrl_checks/src/components/landing/TrustSection.tsx`.
- **Workflow_Builder**: The AI pipeline in `worker/src/services/ai/workflow-builder.ts` that generates workflows from user prompts.
- **PlannedWorkflow**: The intermediate data structure produced by Gemini planning, containing a `summary` field and an ordered list of steps.
- **Workflow_Title**: The human-readable name assigned to a generated workflow, derived from the `PlannedWorkflow.summary` field.
- **Landing_Section**: Any `<section>` element rendered as a direct child of `<main>` in the Index_Page (e.g. Hero, HowItWorks, Features, Pricing, etc.).

---

## Requirements

### Requirement 1: Delete Account

**User Story:** As a registered user, I want to permanently delete my account from the Profile page, so that I can remove all my data from the platform without needing admin intervention.

#### Acceptance Criteria

1. THE Profile_Page SHALL display a "Delete Account" button in the Account section alongside the existing "Sign Out" button.
2. WHEN the user clicks "Delete Account", THE Profile_Page SHALL present a confirmation dialog requiring the user to explicitly confirm the destructive action before proceeding.
3. WHEN the user confirms account deletion, THE Profile_Page SHALL call the Delete_Account_Endpoint with the authenticated user's JWT.
4. THE Delete_Account_Endpoint SHALL authenticate the requesting user via the Authorization header and SHALL only permit a user to delete their own account.
5. WHEN the Delete_Account_Endpoint receives a valid authenticated request, THE Delete_Account_Endpoint SHALL permanently delete the user's Supabase Auth record and all associated profile data.
6. WHEN account deletion succeeds, THE Profile_Page SHALL sign the user out and redirect them to the home page.
7. IF the Delete_Account_Endpoint returns an error, THEN THE Profile_Page SHALL display a descriptive error toast and leave the user's session intact.
8. THE Delete_Account_Endpoint SHALL be registered on a route separate from the admin-only endpoint in `admin-users.ts` (e.g. `DELETE /api/user/account`).

---

### Requirement 2: Templates Search Bar Repositioning

**User Story:** As a user browsing templates, I want the search bar to appear inline with the "Workflow Templates" heading, so that the layout is more compact and the template grid has more vertical space.

#### Acceptance Criteria

1. THE Templates_Page SHALL render the "Workflow Templates" heading and the search `<Input>` element in the same horizontal row.
2. THE Templates_Page SHALL position the heading on the left side of the header row and the search input on the right side.
3. THE Templates_Page SHALL remove the search input from its current standalone block position below the heading block.
4. WHILE the viewport is narrower than the `md` Tailwind breakpoint, THE Templates_Page SHALL stack the heading and search input vertically to preserve readability on small screens.
5. THE Templates_Page SHALL preserve all existing search filtering behavior — filtering templates by name and description — after the repositioning.

---

### Requirement 3: Zoho Connector Button Fix

**User Story:** As a user on the Connections panel, I want the Zoho connector to display the same styled "Connect" button as other connectors, so that the UI is visually consistent.

#### Acceptance Criteria

1. WHEN the Zoho account is not connected, THE Connections_Panel SHALL render a blue "Connect" button for the Zoho_Connector card using the same `variant="default"` Button component used by other connector cards (Google, LinkedIn, GitHub, etc.).
2. THE Connections_Panel SHALL remove the ghost-style red "Connect Zoho" text button that currently appears in the Zoho_Connector card when disconnected.
3. WHEN the "Connect" button for Zoho is clicked, THE Connections_Panel SHALL open the Zoho credentials dialog (the existing `ZohoConnectionStatus` dialog flow) to collect OAuth credentials.
4. WHEN the Zoho account is connected, THE Connections_Panel SHALL render the same "Disconnect" button pattern used by other connector cards.
5. THE Connections_Panel SHALL display the Zoho connector card with the same layout structure (icon, name, status text, action button) as all other connector cards.

---

### Requirement 4: Connector Card Hover Effect Fix

**User Story:** As a user hovering over connector cards, I want only the card to scale up on hover — without revealing or highlighting the credentials section — so that the hover state is not confusing.

#### Acceptance Criteria

1. WHEN a user hovers over a Connector_Card, THE Connections_Panel SHALL apply a scale-up CSS transform to the card container only.
2. WHEN a user hovers over a Connector_Card, THE Connections_Panel SHALL NOT change the visibility, opacity, background, or highlight state of any credentials or sensitive fields within the card.
3. THE Connections_Panel SHALL ensure that the hover scale effect is applied uniformly to all connector cards (Google, LinkedIn, GitHub, Facebook, Notion, Twitter, Zoho).
4. WHEN the user's cursor leaves a Connector_Card, THE Connections_Panel SHALL return the card to its default (non-scaled) state.

---

### Requirement 5: Homepage Section Removal

**User Story:** As a visitor to the homepage, I want a cleaner landing page without the "Immediate Business Value" and "Trusted Enterprise Readiness" sections, so that the page is more focused and less cluttered.

#### Acceptance Criteria

1. THE Index_Page SHALL NOT render the BusinessValueSection component.
2. THE Index_Page SHALL NOT render the TrustSection component.
3. THE Index_Page SHALL preserve the rendering order and behavior of all other landing page sections (Hero, IntegrationsMarqueeSection, HowItWorks, WorkflowDemoSection, OpenCoreSection, PluginsApiSection, IndustryVerticalsSection, WhyCtrlChecksSection, Features, Pricing, SubscriptionSection, FaqSection, CTA, Footer).
4. THE Index_Page SHALL remove the import statements for BusinessValueSection and TrustSection after the components are removed from the render tree.

---

### Requirement 6: Homepage Section Spacing Reduction

**User Story:** As a visitor to the homepage, I want the sections to flow naturally without excessive gaps between them, so that I can read the content without scrolling through large empty spaces.

#### Acceptance Criteria

1. EACH Landing_Section on the Index_Page SHALL use a vertical padding of `py-12 sm:py-16` (48px / 64px) instead of the current `py-24 sm:py-32` (96px / 128px).
2. THE spacing reduction SHALL be applied uniformly to all remaining Landing_Sections: Hero (if applicable), IntegrationsMarqueeSection, HowItWorks, WorkflowDemoSection, OpenCoreSection, PluginsApiSection, IndustryVerticalsSection, WhyCtrlChecksSection, Features, Pricing, SubscriptionSection, FaqSection, and CTA.
3. THE internal layout and content of each Landing_Section SHALL remain unchanged — only the outer vertical padding of the `<section>` element is reduced.
4. THE spacing change SHALL be applied directly to each section component file so that the reduced spacing is consistent regardless of where the component is used.

---

### Requirement 7: AI Workflow Heading Uniqueness

**User Story:** As a user who generates AI workflows, I want each generated workflow to have a unique, descriptive title that reflects the specific intent of my request, so that I can easily identify and distinguish workflows in my list.

#### Acceptance Criteria

1. WHEN the Workflow_Builder generates a PlannedWorkflow via Gemini, THE Workflow_Builder SHALL produce a `summary` field that is specific to the user's prompt — describing the concrete action, data sources, and integrations involved — rather than a generic label such as "Workflow" or "Automation".
2. THE Workflow_Builder SHALL include the primary integration names (e.g. "Gmail", "Google Sheets", "Slack") and the core action verb (e.g. "sync", "notify", "summarize") in the generated `summary` when those details are present in the user's prompt.
3. WHEN the Workflow_Builder falls back to the minimal rule-based fallback workflow, THE Workflow_Builder SHALL set the `metadata.summary` to a descriptive string derived from the user's prompt rather than the static string `"Minimal fallback workflow for: {userPrompt}"`.
4. WHEN the Workflow_Builder falls back to the conditional branching fallback workflow, THE Workflow_Builder SHALL set the `metadata.summary` to a descriptive string derived from the user's prompt rather than the static string `"Conditional fallback workflow for: {userPrompt}"`.
5. FOR ALL generated workflows, the `metadata.summary` SHALL be 5 to 15 words in length and SHALL use title-case formatting.
6. WHEN two workflows are generated from semantically different user prompts, THE Workflow_Builder SHALL produce different `metadata.summary` values for each workflow (uniqueness property).
