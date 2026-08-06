/**
 * Bug Condition Exploration Test — IntegrationsMarqueeSection Missing from Home Page
 *
 * Feature: vertical-logo-marquee bugfix
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * GOAL: Surface counterexamples that demonstrate the bug exists
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Bug Condition Analysis Functions
// ---------------------------------------------------------------------------

/**
 * Check if IntegrationsMarqueeSection is imported in Index.tsx
 */
function isIntegrationsMarqueeImported(indexFileContent: string): boolean {
  const importPattern = /(?:^|\n)\s*import.*IntegrationsMarqueeSection.*from.*@\/components\/landing\/IntegrationsMarqueeSection/;
  return importPattern.test(indexFileContent);
}

/**
 * Check if IntegrationsMarqueeSection JSX element is rendered in Index.tsx
 */
function isIntegrationsMarqueeRendered(indexFileContent: string): boolean {
  const jsxPattern = /(?:^|\n)\s*<IntegrationsMarqueeSection\s*\/>/;
  return jsxPattern.test(indexFileContent);
}

/**
 * Check if IntegrationsMarqueeSection is positioned between Hero and HowItWorks
 */
function isIntegrationsMarqueePositionedCorrectly(indexFileContent: string): boolean {
  // Look for the pattern: <Hero /> ... <IntegrationsMarqueeSection /> ... <HowItWorks />
  const heroToHowItWorksPattern = /<Hero\s*\/>([\s\S]*?)<HowItWorks\s*\/>/;
  const match = indexFileContent.match(heroToHowItWorksPattern);
  
  if (!match) return false;
  
  const contentBetween = match[1];
  return /<IntegrationsMarqueeSection\s*\/>/.test(contentBetween);
}

/**
 * Bug condition predicate from design document:
 * isBugCondition(input) where input.page === "home" 
 * AND IntegrationsMarqueeSection NOT imported in Index.tsx
 * AND IntegrationsMarqueeSection NOT rendered between Hero and HowItWorks
 */
function isBugCondition(indexFileContent: string): boolean {
  const notImported = !isIntegrationsMarqueeImported(indexFileContent);
  const notRendered = !isIntegrationsMarqueeRendered(indexFileContent);
  const notPositionedCorrectly = !isIntegrationsMarqueePositionedCorrectly(indexFileContent);
  
  return notImported || notRendered || notPositionedCorrectly;
}

// ---------------------------------------------------------------------------
// Test Data Setup
// ---------------------------------------------------------------------------

// Read the actual Index.tsx file content
const indexFilePath = join(process.cwd(), 'src/pages/Index.tsx');
let indexFileContent: string;

try {
  indexFileContent = readFileSync(indexFilePath, 'utf-8');
} catch (error) {
  throw new Error(`Failed to read Index.tsx file: ${error}`);
}

// ---------------------------------------------------------------------------
// Concrete Bug Condition Tests (EXPECTED TO FAIL on unfixed code)
// ---------------------------------------------------------------------------

describe('Bug Condition Exploration — IntegrationsMarqueeSection Missing from Home Page', () => {
  it('EXPECTED TO FAIL: IntegrationsMarqueeSection should be imported in Index.tsx', () => {
    // This test MUST FAIL on unfixed code to confirm the bug exists
    const isImported = isIntegrationsMarqueeImported(indexFileContent);
    
    expect(isImported).toBe(true); // This will FAIL on unfixed code
  });

  it('EXPECTED TO FAIL: IntegrationsMarqueeSection should be rendered in Index.tsx', () => {
    // This test MUST FAIL on unfixed code to confirm the bug exists
    const isRendered = isIntegrationsMarqueeRendered(indexFileContent);
    
    expect(isRendered).toBe(true); // This will FAIL on unfixed code
  });

  it('EXPECTED TO FAIL: IntegrationsMarqueeSection should be positioned between Hero and HowItWorks', () => {
    // This test MUST FAIL on unfixed code to confirm the bug exists
    const isPositionedCorrectly = isIntegrationsMarqueePositionedCorrectly(indexFileContent);
    
    expect(isPositionedCorrectly).toBe(true); // This will FAIL on unfixed code
  });

  it('EXPECTED TO FAIL: Bug condition should not be present (overall bug check)', () => {
    // This is the main bug condition test from the design document
    // It MUST FAIL on unfixed code to confirm the bug exists
    const bugExists = isBugCondition(indexFileContent);
    
    expect(bugExists).toBe(false); // This will FAIL on unfixed code (bugExists will be true)
  });
});

// ---------------------------------------------------------------------------
// Property-Based Bug Condition Tests
// ---------------------------------------------------------------------------

describe('Property 1: Bug Condition - IntegrationsMarqueeSection Display', () => {
  /**
   * P1-A: Import statement detection is consistent
   * 
   * **Validates: Requirements 1.1, 1.2**
   */
  it('property: import detection correctly identifies IntegrationsMarqueeSection imports', () => {
    // Test with known import patterns
    const validImports = [
      'import { IntegrationsMarqueeSection } from "@/components/landing/IntegrationsMarqueeSection";',
      'import {IntegrationsMarqueeSection} from "@/components/landing/IntegrationsMarqueeSection";',
      'import { IntegrationsMarqueeSection } from "@/components/landing/IntegrationsMarqueeSection"',
    ];

    const invalidImports = [
      'import { SomeOtherComponent } from "@/components/landing/SomeOther";',
      '// import { IntegrationsMarqueeSection } from "@/components/landing/IntegrationsMarqueeSection";',
      'const IntegrationsMarqueeSection = null;',
    ];

    validImports.forEach(importStatement => {
      expect(isIntegrationsMarqueeImported(importStatement)).toBe(true);
    });

    invalidImports.forEach(importStatement => {
      expect(isIntegrationsMarqueeImported(importStatement)).toBe(false);
    });
  });

  /**
   * P1-B: JSX element detection is consistent
   * 
   * **Validates: Requirements 1.1, 1.2**
   */
  it('property: JSX detection correctly identifies IntegrationsMarqueeSection elements', () => {
    const validJSX = [
      '<IntegrationsMarqueeSection />',
      '<IntegrationsMarqueeSection/>',
      '<IntegrationsMarqueeSection />',
      '  <IntegrationsMarqueeSection />  ',
    ];

    const invalidJSX = [
      '<SomeOtherComponent />',
      '// <IntegrationsMarqueeSection />',
      '{/* <IntegrationsMarqueeSection /> */}',
      'IntegrationsMarqueeSection',
    ];

    validJSX.forEach(jsx => {
      expect(isIntegrationsMarqueeRendered(jsx)).toBe(true);
    });

    invalidJSX.forEach(jsx => {
      expect(isIntegrationsMarqueeRendered(jsx)).toBe(false);
    });
  });

  /**
   * P1-C: Position detection correctly identifies placement between Hero and HowItWorks
   * 
   * **Validates: Requirements 2.1, 2.2**
   */
  it('property: position detection correctly identifies IntegrationsMarqueeSection between Hero and HowItWorks', () => {
    const correctPositioning = `
      <main>
        <Hero />
        <IntegrationsMarqueeSection />
        <HowItWorks />
      </main>
    `;

    const incorrectPositioning = [
      `<main><HowItWorks /><IntegrationsMarqueeSection /><Hero /></main>`,
      `<main><Hero /><HowItWorks /></main>`,
      `<main><IntegrationsMarqueeSection /><Hero /><HowItWorks /></main>`,
    ];

    expect(isIntegrationsMarqueePositionedCorrectly(correctPositioning)).toBe(true);

    incorrectPositioning.forEach(positioning => {
      expect(isIntegrationsMarqueePositionedCorrectly(positioning)).toBe(false);
    });
  });

  /**
   * P1-D: Bug condition accurately reflects the combination of all issues
   * 
   * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
   */
  it('property: bug condition is true when any required element is missing', () => {
    // Test cases where bug condition should be true (bug exists)
    const buggyScenarios = [
      // Missing import
      `
        const Index = () => {
          return (
            <main>
              <Hero />
              <IntegrationsMarqueeSection />
              <HowItWorks />
            </main>
          );
        };
      `,
      // Missing JSX element
      `
        import { IntegrationsMarqueeSection } from "@/components/landing/IntegrationsMarqueeSection";
        const Index = () => {
          return (
            <main>
              <Hero />
              <HowItWorks />
            </main>
          );
        };
      `,
      // Wrong position
      `
        import { IntegrationsMarqueeSection } from "@/components/landing/IntegrationsMarqueeSection";
        const Index = () => {
          return (
            <main>
              <IntegrationsMarqueeSection />
              <Hero />
              <HowItWorks />
            </main>
          );
        };
      `,
    ];

    buggyScenarios.forEach(scenario => {
      expect(isBugCondition(scenario)).toBe(true);
    });

    // Test case where bug condition should be false (no bug)
    const fixedScenario = `
      import { IntegrationsMarqueeSection } from "@/components/landing/IntegrationsMarqueeSection";
      const Index = () => {
        return (
          <main>
            <Hero />
            <IntegrationsMarqueeSection />
            <HowItWorks />
          </main>
        );
      };
    `;

    expect(isBugCondition(fixedScenario)).toBe(false);
  });
});
