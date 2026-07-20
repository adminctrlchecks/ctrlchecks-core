# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - IntegrationsMarqueeSection Missing from Home Page
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when home page loads, IntegrationsMarqueeSection component is not present in DOM (from Bug Condition in design)
  - Test that IntegrationsMarqueeSection is not imported in Index.tsx
  - Test that IntegrationsMarqueeSection JSX element is not rendered between Hero and HowItWorks
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_
 
- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Landing Page Layout
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for existing landing page sections
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Test that Hero section renders correctly in current position
  - Test that HowItWorks section renders correctly in current position
  - Test that all other existing sections (WorkflowDemoSection, OpenCoreSection, etc.) render in correct order
  - Test that page layout and responsive behavior work correctly for existing sections
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Fix for missing IntegrationsMarqueeSection component

  - [ ] 3.1 Implement the fix
    - Add import statement for IntegrationsMarqueeSection to Index.tsx
    - Insert `<IntegrationsMarqueeSection />` component between `<Hero />` and `<HowItWorks />` in the JSX
    - Verify component is positioned correctly in the main element alongside other sections
    - _Bug_Condition: isBugCondition(input) where input.page === "home" AND IntegrationsMarqueeSection NOT imported AND NOT rendered between Hero and HowItWorks_
    - _Expected_Behavior: expectedBehavior(result) from design - IntegrationsMarqueeSection displays with animated logos between Hero and HowItWorks_
    - _Preservation: Preservation Requirements from design - all existing sections continue to render in current order with unchanged functionality_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - IntegrationsMarqueeSection Present on Home Page
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Landing Page Layout
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.