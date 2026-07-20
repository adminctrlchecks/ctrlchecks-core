# Remove AI-OS Subtitle - Tasks

## Tasks

- [x] 1. Remove showSubtitle from AppBrand component
  - [x] 1.1 Remove `showSubtitle?: boolean` from `AppBrandProps` interface in `ctrl_checks/src/components/brand/AppBrand.tsx`
  - [x] 1.2 Remove `showSubtitle = false` from the destructured function parameters
  - [x] 1.3 Remove the `{showSubtitle && <span className="text-xs text-muted-foreground">AI-OS</span>}` conditional render block

- [x] 2. Remove showSubtitle prop from all callers
  - [x] 2.1 Remove `showSubtitle` from `<AppBrand>` in `ctrl_checks/src/components/landing/Header.tsx`
  - [x] 2.2 Remove `showSubtitle` from `<AppBrand>` in `ctrl_checks/src/pages/SignIn.tsx`
  - [x] 2.3 Remove `showSubtitle` from `<AppBrand>` in `ctrl_checks/src/pages/SignUp.tsx`
  - [x] 2.4 Remove `showSubtitle` from `<AppBrand>` in `ctrl_checks/src/pages/ForgotPassword.tsx`
  - [x] 2.5 Remove `showSubtitle` from `<AppBrand>` in `ctrl_checks/src/pages/ResetPassword.tsx`
  - [x] 2.6 Remove `showSubtitle` from `<AppBrand>` in `ctrl_checks/src/pages/NotFound.tsx`
  - [x] 2.7 Remove `showSubtitle` from `<AppBrand>` in `ctrl_checks/src/pages/Privacy.tsx`

- [x] 3. Replace hardcoded "CtrlChecks AI-OS" strings in landing components
  - [x] 3.1 Change `CtrlChecks AI-OS` → `CtrlChecks` in the brand link span in `ctrl_checks/src/components/landing/Footer.tsx`
  - [x] 3.2 Change `CtrlChecks AI-OS: Beta launch` → `CtrlChecks: Beta launch` in the announcement badge in `ctrl_checks/src/components/landing/Hero.tsx`
  - [x] 3.3 Change `Explore CtrlChecks AI-OS during beta` → `Explore CtrlChecks during beta` in the Free plan description in `ctrl_checks/src/components/landing/Pricing.tsx`
  - [x] 3.4 Change `CtrlChecks AI-OS beta` → `CtrlChecks beta` in the paragraph text in `ctrl_checks/src/components/landing/Testimonials.tsx`
  - [x] 3.5 Change `Why CtrlChecks AI-OS wins—and stays ahead` → `Why CtrlChecks wins—and stays ahead` in `ctrl_checks/src/components/landing/WhyCtrlChecksSection.tsx`

- [x] 4. Verify TypeScript compilation
  - [x] 4.1 Run TypeScript type-check on all modified files to confirm no type errors after removing the `showSubtitle` prop from the interface and all callers
