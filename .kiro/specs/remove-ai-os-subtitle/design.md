# Remove AI-OS Subtitle Bugfix Design

## Overview

The "AI-OS" branding text appears in two forms across the codebase: as a dynamic subtitle
rendered by the `AppBrand` component when `showSubtitle={true}` is passed, and as hardcoded
strings in several landing page components. The fix removes both forms — stripping the
`showSubtitle` prop and its conditional render from `AppBrand`, removing the prop from all
callers, and replacing every hardcoded "CtrlChecks AI-OS" string with "CtrlChecks".

## Glossary

- **Bug_Condition (C)**: Any render path that causes "AI-OS" text to appear in the UI
- **Property (P)**: The rendered output SHALL NOT contain the string "AI-OS" anywhere
- **Preservation**: All other UI content (logo, wordmark, nav links, form elements, footer links, etc.) must remain unchanged
- **AppBrand**: The component in `ctrl_checks/src/components/brand/AppBrand.tsx` that renders the CtrlChecks logo and wordmark
- **showSubtitle**: The boolean prop on `AppBrand` that conditionally renders the `<span>AI-OS</span>` subtitle
- **Hardcoded occurrence**: A string literal "CtrlChecks AI-OS" embedded directly in a component's JSX or data array

## Bug Details

### Bug Condition

The bug manifests in two distinct ways:

1. When `AppBrand` is rendered with `showSubtitle={true}` (or the shorthand `showSubtitle`), it renders `<span className="text-xs text-muted-foreground">AI-OS</span>` beneath the wordmark.
2. When landing page components render, they contain hardcoded string literals "CtrlChecks AI-OS" in JSX text nodes and data arrays.

**Formal Specification:**
```
FUNCTION isBugCondition(renderContext)
  INPUT: renderContext — a component render with its props and static content
  OUTPUT: boolean

  RETURN (
    renderContext.component === AppBrand AND renderContext.props.showSubtitle === true
  ) OR (
    renderContext.staticContent CONTAINS "AI-OS"
  )
END FUNCTION
```

### Examples

- `<AppBrand context="marketing" showSubtitle />` in Header.tsx → renders "AI-OS" beneath "CtrlChecks" in the nav bar
- `<AppBrand context="marketing" showSubtitle />` in SignIn.tsx → renders "AI-OS" on the sign-in page
- `"CtrlChecks AI-OS: Beta launch"` string in Hero.tsx → displays "AI-OS" in the announcement badge
- `"Explore CtrlChecks AI-OS during beta"` in Pricing.tsx plan description → displays "AI-OS" in the Free plan card
- `"CtrlChecks AI-OS"` in Footer.tsx brand link text → displays "AI-OS" in the footer
- `"CtrlChecks AI-OS beta"` in Testimonials.tsx paragraph → displays "AI-OS" in the early access section
- `"Why CtrlChecks AI-OS wins"` in WhyCtrlChecksSection.tsx → displays "AI-OS" in the why section

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `AppBrand` must continue to render the logo image and "CtrlChecks" wordmark for all non-minimal sizes
- `AppBrand` with `size="minimal"` must continue to render only the logo image with no text
- Header navigation links, theme toggle, and auth buttons must remain unchanged
- Footer links, social icons, and copyright text must remain unchanged
- Hero announcement badge, headline, description, and CTA buttons must remain unchanged (badge text changes to "CtrlChecks: Beta launch")
- Auth pages (SignIn, SignUp, ForgotPassword, ResetPassword) must continue to display the brand logo and all form elements
- Pricing plan descriptions, features, and CTA buttons must remain unchanged (only the "AI-OS" suffix is removed from descriptions)

**Scope:**
All content that does NOT contain "AI-OS" is completely unaffected by this fix. The fix is purely
subtractive — removing text and a prop — with no structural or behavioral changes to any component.

## Hypothesized Root Cause

The "AI-OS" text was intentionally added as part of an earlier branding decision and is now being
removed. There is no code defect in the traditional sense; the root cause is:

1. **Intentional but now-unwanted feature in AppBrand**: The `showSubtitle` prop and its conditional render were added deliberately and are now called from 7 locations.
2. **Hardcoded brand strings**: The "CtrlChecks AI-OS" string was copy-pasted into 5 landing page components without going through a shared constant, making it require individual updates.
3. **No centralized brand string constant**: The absence of a single source of truth for the brand name allowed the "AI-OS" suffix to proliferate across files independently.

## Correctness Properties

Property 1: Bug Condition - No AI-OS Text in Any Render

_For any_ component render where the bug condition holds (AppBrand rendered with showSubtitle, or
a component containing a hardcoded "AI-OS" string), the fixed code SHALL produce rendered output
that does NOT contain the text "AI-OS" anywhere in the DOM.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Non-AI-OS Content Unchanged

_For any_ component render where the bug condition does NOT hold (content that never contained
"AI-OS"), the fixed code SHALL produce exactly the same rendered output as the original code,
preserving all logos, wordmarks, navigation, form elements, links, and other UI content.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

**File**: `ctrl_checks/src/components/brand/AppBrand.tsx`

**Specific Changes**:
1. Remove `showSubtitle?: boolean` from the `AppBrandProps` interface
2. Remove `showSubtitle = false` from the destructured function parameters
3. Remove the `{showSubtitle && <span className="text-xs text-muted-foreground">AI-OS</span>}` conditional render

---

**Files**: `ctrl_checks/src/components/landing/Header.tsx`, `ctrl_checks/src/pages/SignIn.tsx`, `ctrl_checks/src/pages/SignUp.tsx`, `ctrl_checks/src/pages/ForgotPassword.tsx`, `ctrl_checks/src/pages/ResetPassword.tsx`, `ctrl_checks/src/pages/NotFound.tsx`, `ctrl_checks/src/pages/Privacy.tsx`

**Specific Changes**:
- Remove the `showSubtitle` prop from every `<AppBrand ... showSubtitle />` call (7 occurrences)

---

**File**: `ctrl_checks/src/components/landing/Footer.tsx`

**Specific Changes**:
- Change `CtrlChecks AI-OS` → `CtrlChecks` in the brand link `<span>` text

---

**File**: `ctrl_checks/src/components/landing/Hero.tsx`

**Specific Changes**:
- Change `"CtrlChecks AI-OS: Beta launch"` → `"CtrlChecks: Beta launch"` in the announcement badge

---

**File**: `ctrl_checks/src/components/landing/Pricing.tsx`

**Specific Changes**:
- Change `"Explore CtrlChecks AI-OS during beta"` → `"Explore CtrlChecks during beta"` in the Free plan description

---

**File**: `ctrl_checks/src/components/landing/Testimonials.tsx`

**Specific Changes**:
- Change `"CtrlChecks AI-OS beta"` → `"CtrlChecks beta"` in the paragraph text

---

**File**: `ctrl_checks/src/components/landing/WhyCtrlChecksSection.tsx`

**Specific Changes**:
- Change `"Why CtrlChecks AI-OS wins—and stays ahead"` → `"Why CtrlChecks wins—and stays ahead"` in the paragraph text

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first confirm the bug exists on unfixed code
by observing "AI-OS" in rendered output, then verify the fix removes all occurrences while
preserving all other content.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix.
Confirm that "AI-OS" text appears in each affected component.

**Test Plan**: Render each affected component and assert that "AI-OS" text IS present in the
output. These tests will pass on unfixed code (confirming the bug) and fail after the fix
(confirming the fix works — at which point they are inverted to fix-checking tests).

**Test Cases**:
1. **AppBrand subtitle test**: Render `<AppBrand showSubtitle />` and assert "AI-OS" is in the output (will pass on unfixed code)
2. **Header brand test**: Render `<Header />` and assert "AI-OS" is in the output (will pass on unfixed code)
3. **Footer brand text test**: Render `<Footer />` and assert "CtrlChecks AI-OS" is in the output (will pass on unfixed code)
4. **Hero badge test**: Render `<Hero />` and assert "CtrlChecks AI-OS: Beta launch" is in the output (will pass on unfixed code)
5. **Pricing description test**: Render `<Pricing />` and assert "CtrlChecks AI-OS" is in the output (will pass on unfixed code)

**Expected Counterexamples**:
- "AI-OS" text nodes are present in rendered DOM for all 7 `showSubtitle` call sites
- "AI-OS" string literals are present in rendered text for all 5 hardcoded occurrences

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces
output with no "AI-OS" text.

**Pseudocode:**
```
FOR ALL renderContext WHERE isBugCondition(renderContext) DO
  output := render_fixed(renderContext)
  ASSERT output DOES NOT CONTAIN "AI-OS"
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code
produces the same result as the original code.

**Pseudocode:**
```
FOR ALL renderContext WHERE NOT isBugCondition(renderContext) DO
  ASSERT render_original(renderContext) = render_fixed(renderContext)
END FOR
```

**Testing Approach**: Snapshot tests and targeted assertions are appropriate here because:
- The set of preserved content is well-defined and finite
- Each component has a small, stable set of non-AI-OS content to verify
- Snapshot diffs will immediately reveal any unintended changes

**Test Cases**:
1. **AppBrand logo preservation**: Verify logo image and "CtrlChecks" wordmark still render after fix
2. **AppBrand minimal preservation**: Verify `size="minimal"` still renders only the logo image
3. **Header nav preservation**: Verify all nav links, theme toggle, and auth buttons still render
4. **Footer content preservation**: Verify all footer links, social icons, and copyright text still render
5. **Hero content preservation**: Verify headline, description, and CTA buttons still render

### Unit Tests

- Test `AppBrand` renders no "AI-OS" text for any combination of props after fix
- Test `AppBrand` with `size="minimal"` renders only the logo image
- Test each landing page component renders no "AI-OS" text after fix
- Test each auth page renders no "AI-OS" text after fix

### Property-Based Tests

- Generate random valid `AppBrandProps` combinations and verify rendered output never contains "AI-OS"
- Generate random `AppBrandProps` with `size="minimal"` and verify only the logo image renders (no text)
- Verify that removing `showSubtitle` from `AppBrandProps` interface causes TypeScript to reject any future caller that tries to pass it

### Integration Tests

- Render the full landing page and assert no "AI-OS" text appears anywhere in the DOM
- Render each auth page and assert no "AI-OS" text appears while all form elements remain present
- Verify TypeScript compilation succeeds with no type errors after removing `showSubtitle` from the interface
