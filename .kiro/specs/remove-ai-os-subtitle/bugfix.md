# Bugfix Requirements Document

## Introduction

The "AI-OS" subtitle and branding text appears throughout the CtrlChecks UI — both as a dynamic subtitle rendered via the `AppBrand` component and as hardcoded strings in several landing page and auth components. The user wants this branding removed entirely from the UI.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the `AppBrand` component is rendered with `showSubtitle={true}` THEN the system displays an "AI-OS" subtitle beneath the "CtrlChecks" wordmark
1.2 WHEN the Header component renders THEN the system passes `showSubtitle` as true to `AppBrand`, causing "AI-OS" to appear in the navigation bar
1.3 WHEN the Footer component renders THEN the system displays hardcoded "CtrlChecks AI-OS" text in the brand section
1.4 WHEN the Hero component renders THEN the system displays hardcoded "CtrlChecks AI-OS: Beta launch" text in the announcement badge
1.5 WHEN the Pricing, Testimonials, or WhyCtrlChecksSection components render THEN the system displays hardcoded "CtrlChecks AI-OS" text within those sections
1.6 WHEN the SignIn, SignUp, ForgotPassword, ResetPassword, NotFound, or Privacy pages render THEN the system passes `showSubtitle={true}` to `AppBrand`, causing "AI-OS" to appear on those pages

### Expected Behavior (Correct)

2.1 WHEN the `AppBrand` component is rendered with any `showSubtitle` value THEN the system SHALL NOT display the "AI-OS" subtitle
2.2 WHEN the Header component renders THEN the system SHALL display the brand without the "AI-OS" subtitle
2.3 WHEN the Footer component renders THEN the system SHALL display "CtrlChecks" without the "AI-OS" suffix
2.4 WHEN the Hero component renders THEN the system SHALL display the announcement badge without the "AI-OS" text (e.g. "CtrlChecks: Beta launch")
2.5 WHEN the Pricing, Testimonials, or WhyCtrlChecksSection components render THEN the system SHALL display "CtrlChecks" without the "AI-OS" suffix
2.6 WHEN the SignIn, SignUp, ForgotPassword, ResetPassword, NotFound, or Privacy pages render THEN the system SHALL display the brand without the "AI-OS" subtitle

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the `AppBrand` component is rendered THEN the system SHALL CONTINUE TO display the CtrlChecks logo image and wordmark
3.2 WHEN the Header component renders THEN the system SHALL CONTINUE TO display all navigation links, theme toggle, and auth buttons correctly
3.3 WHEN the Footer component renders THEN the system SHALL CONTINUE TO display all footer links, social icons, and copyright text
3.4 WHEN the Hero component renders THEN the system SHALL CONTINUE TO display the announcement badge, headline, description, and CTA buttons
3.5 WHEN auth pages (SignIn, SignUp, ForgotPassword, ResetPassword) render THEN the system SHALL CONTINUE TO display the brand logo and all form elements correctly
3.6 WHEN the `AppBrand` component is rendered in `minimal` size THEN the system SHALL CONTINUE TO render only the logo image without any text
