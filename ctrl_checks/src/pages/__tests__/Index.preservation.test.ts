/**
 * Preservation Property Tests — Existing Landing Page Layout
 *
 * Feature: vertical-logo-marquee bugfix
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 *
 * IMPORTANT: Follow observation-first methodology
 * These tests observe behavior on UNFIXED code for existing landing page sections
 * and write property-based tests capturing observed behavior patterns from Preservation Requirements
 * 
 * EXPECTED OUTCOME: Tests PASS (this confirms baseline behavior to preserve)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Preservation Analysis Functions
// ---------------------------------------------------------------------------

/**
 * Check if Hero section is imported and rendered correctly
 */
function isHeroSectionPreserved(indexFileContent: string): boolean {
  const heroImported = /import.*Hero.*from.*@\/components\/landing\/Hero/.test(indexFileContent);
  const heroRendered = /<Hero\s*\/>/.test(indexFileContent);
  return heroImported && heroRendered;
}

/**
 * Check if HowItWorks section is imported and rendered correctly
 */
function isHowItWorksSectionPreserved(indexFileContent: string): boolean {
  const howItWorksImported = /import.*HowItWorks.*from.*@\/components\/landing\/HowItWorks/.test(indexFileContent);
  const howItWorksRendered = /<HowItWorks\s*\/>/.test(indexFileContent);
  return howItWorksImported && howItWorksRendered;
}

/**
 * Check if all other existing sections are preserved
 */
function areOtherSectionsPreserved(indexFileContent: string): boolean {
  // WorkflowDemoSection was merged into Hero (the demo is now the first screen),
  // so it is no longer a standalone section on the page.
  const expectedSections = [
    'TemplateShowcaseSection',
    'OpenCoreSection',
    'PluginsApiSection',
    'IndustryVerticalsSection',
    'TrustSection',
    'WhyCtrlChecksSection',
    'Pricing',
    'FaqSection',
    'CTA'
  ];

  return expectedSections.every(section => {
    const importPattern = new RegExp(`import.*${section}.*from.*@/components/landing/${section}`);
    const jsxPattern = new RegExp(`<${section}\\s*\\/>`);
    return importPattern.test(indexFileContent) && jsxPattern.test(indexFileContent);
  });
}

/**
 * Check if Header and Footer are preserved
 */
function areHeaderFooterPreserved(indexFileContent: string): boolean {
  const headerImported = /import.*Header.*from.*@\/components\/landing\/Header/.test(indexFileContent);
  const headerRendered = /<Header\s*\/>/.test(indexFileContent);
  const footerImported = /import.*Footer.*from.*@\/components\/landing\/Footer/.test(indexFileContent);
  const footerRendered = /<Footer\s*\/>/.test(indexFileContent);
  
  return headerImported && headerRendered && footerImported && footerRendered;
}

/**
 * Check if the main structure and layout components are preserved
 */
function isMainStructurePreserved(indexFileContent: string): boolean {
  // Check for main structural elements
  const hasMainElement = /<main[^>]*>/.test(indexFileContent);
  const hasLandingLightPillarBackground = /LandingLightPillarBackground/.test(indexFileContent);
  const hasRelativeDiv = /<div className="relative min-h-screen">/.test(indexFileContent);
  
  return hasMainElement && hasLandingLightPillarBackground && hasRelativeDiv;
}

/**
 * Check if the section ordering is preserved (Hero should come before HowItWorks)
 */
function isSectionOrderingPreserved(indexFileContent: string): boolean {
  const heroIndex = indexFileContent.indexOf('<Hero />');
  const howItWorksIndex = indexFileContent.indexOf('<HowItWorks />');
  
  // Hero should come before HowItWorks
  return heroIndex !== -1 && howItWorksIndex !== -1 && heroIndex < howItWorksIndex;
}

/**
 * Extract the current section order from the Index.tsx file
 */
function extractSectionOrder(indexFileContent: string): string[] {
  const sectionPattern = /<(\w+)\s*\/>/g;
  const sections: string[] = [];
  let match;
  
  while ((match = sectionPattern.exec(indexFileContent)) !== null) {
    sections.push(match[1]);
  }
  
  return sections;
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

// Capture the current section order for preservation
const currentSectionOrder = extractSectionOrder(indexFileContent);

// ---------------------------------------------------------------------------
// Concrete Preservation Tests (EXPECTED TO PASS on unfixed code)
// ---------------------------------------------------------------------------

describe('Preservation — Existing Landing Page Layout', () => {
  it('EXPECTED TO PASS: Hero section should be preserved', () => {
    // This test MUST PASS on unfixed code to confirm baseline behavior
    const isPreserved = isHeroSectionPreserved(indexFileContent);
    
    expect(isPreserved).toBe(true); // This should PASS on unfixed code
  });

  it('EXPECTED TO PASS: HowItWorks section should be preserved', () => {
    // This test MUST PASS on unfixed code to confirm baseline behavior
    const isPreserved = isHowItWorksSectionPreserved(indexFileContent);
    
    expect(isPreserved).toBe(true); // This should PASS on unfixed code
  });

  it('EXPECTED TO PASS: All other existing sections should be preserved', () => {
    // This test MUST PASS on unfixed code to confirm baseline behavior
    const arePreserved = areOtherSectionsPreserved(indexFileContent);
    
    expect(arePreserved).toBe(true); // This should PASS on unfixed code
  });

  it('EXPECTED TO PASS: Header and Footer should be preserved', () => {
    // This test MUST PASS on unfixed code to confirm baseline behavior
    const arePreserved = areHeaderFooterPreserved(indexFileContent);
    
    expect(arePreserved).toBe(true); // This should PASS on unfixed code
  });

  it('EXPECTED TO PASS: Main structure and layout should be preserved', () => {
    // This test MUST PASS on unfixed code to confirm baseline behavior
    const isPreserved = isMainStructurePreserved(indexFileContent);
    
    expect(isPreserved).toBe(true); // This should PASS on unfixed code
  });

  it('EXPECTED TO PASS: Section ordering should be preserved (Hero before HowItWorks)', () => {
    // This test MUST PASS on unfixed code to confirm baseline behavior
    const isPreserved = isSectionOrderingPreserved(indexFileContent);
    
    expect(isPreserved).toBe(true); // This should PASS on unfixed code
  });

  it('EXPECTED TO PASS: Current section order should be documented', () => {
    // Document the current section order for preservation
    console.log('Current section order:', currentSectionOrder);
    
    // Verify we have the expected sections in some order
    expect(currentSectionOrder).toContain('Hero');
    expect(currentSectionOrder).toContain('HowItWorks');
    expect(currentSectionOrder.length).toBeGreaterThan(5); // Should have multiple sections
  });
});

// ---------------------------------------------------------------------------
// Property-Based Preservation Tests
// ---------------------------------------------------------------------------

describe('Property 2: Preservation - Existing Landing Page Layout', () => {
  /**
   * P2-A: Hero section preservation is consistent
   * 
   * **Validates: Requirements 3.2**
   */
  it('property: Hero section import and rendering detection is consistent', () => {
    // Test with various Hero section patterns
    const validHeroPatterns = [
      `import { Hero } from "@/components/landing/Hero";\n<Hero />`,
      `import {Hero} from "@/components/landing/Hero";\n<Hero/>`,
      `import { Hero } from "@/components/landing/Hero";\n  <Hero />  `,
    ];

    const invalidHeroPatterns = [
      `import { SomeOther } from "@/components/landing/Other";\n<Hero />`, // Missing Hero import
      `import { Hero } from "@/components/landing/Hero";\n<SomeOther />`, // Missing Hero JSX
      `// import { Hero } from "@/components/landing/Hero";\n<SomeOther />`, // Both commented/missing
    ];

    validHeroPatterns.forEach(pattern => {
      expect(isHeroSectionPreserved(pattern)).toBe(true);
    });

    invalidHeroPatterns.forEach(pattern => {
      expect(isHeroSectionPreserved(pattern)).toBe(false);
    });
  });

  /**
   * P2-B: Section ordering preservation is consistent
   * 
   * **Validates: Requirements 3.2**
   */
  it('property: section ordering detection correctly identifies Hero before HowItWorks', () => {
    const correctOrderings = [
      `<main><Hero /><HowItWorks /></main>`,
      `<main><Hero /><SomeOther /><HowItWorks /></main>`,
      `<main>  <Hero />  <HowItWorks />  </main>`,
    ];

    const incorrectOrderings = [
      `<main><HowItWorks /><Hero /></main>`,
      `<main><SomeOther /></main>`, // Missing both
      `<main><Hero /></main>`, // Missing HowItWorks
    ];

    correctOrderings.forEach(ordering => {
      expect(isSectionOrderingPreserved(ordering)).toBe(true);
    });

    incorrectOrderings.forEach(ordering => {
      expect(isSectionOrderingPreserved(ordering)).toBe(false);
    });
  });

  /**
   * P2-C: Main structure preservation is consistent
   * 
   * **Validates: Requirements 3.3**
   */
  it('property: main structure detection correctly identifies required layout elements', () => {
    const validStructures = [
      `<div className="relative min-h-screen"><LandingLightPillarBackground /><main></main></div>`,
      `<div className="relative min-h-screen">
        <LandingLightPillarBackground />
        <main className="bg-transparent">
        </main>
      </div>`,
    ];

    const invalidStructures = [
      `<div><main></main></div>`, // Missing required classes and background
      `<div className="relative min-h-screen"><main></main></div>`, // Missing background
      `<LandingLightPillarBackground /><main></main>`, // Missing wrapper div
    ];

    validStructures.forEach(structure => {
      expect(isMainStructurePreserved(structure)).toBe(true);
    });

    invalidStructures.forEach(structure => {
      expect(isMainStructurePreserved(structure)).toBe(false);
    });
  });

  /**
   * P2-D: Section order extraction is consistent and complete
   * 
   * **Validates: Requirements 3.1, 3.2**
   */
  it('property: section order extraction correctly identifies all JSX elements', () => {
    const testContent = `
      <main>
        <Hero />
        <HowItWorks />
        <TemplateShowcaseSection />
        <Pricing />
      </main>
    `;

    const extractedOrder = extractSectionOrder(testContent);

    expect(extractedOrder).toEqual(['Hero', 'HowItWorks', 'TemplateShowcaseSection', 'Pricing']);
    expect(extractedOrder).toHaveLength(4);
  });

  /**
   * P2-E: All existing sections are properly detected
   * 
   * **Validates: Requirements 3.1, 3.2**
   */
  it('property: other sections preservation correctly identifies all expected sections', () => {
    // Create a mock content with all expected sections
    const allSectionsContent = `
      import { TemplateShowcaseSection } from "@/components/landing/TemplateShowcaseSection";
      import { OpenCoreSection } from "@/components/landing/OpenCoreSection";
      import { PluginsApiSection } from "@/components/landing/PluginsApiSection";
      import { IndustryVerticalsSection } from "@/components/landing/IndustryVerticalsSection";
      import { TrustSection } from "@/components/landing/TrustSection";
      import { WhyCtrlChecksSection } from "@/components/landing/WhyCtrlChecksSection";
      import { Pricing } from "@/components/landing/Pricing";
      import { FaqSection } from "@/components/landing/FaqSection";
      import { CTA } from "@/components/landing/CTA";

      <main>
        <TemplateShowcaseSection />
        <OpenCoreSection />
        <PluginsApiSection />
        <IndustryVerticalsSection />
        <TrustSection />
        <WhyCtrlChecksSection />
        <Pricing />
        <FaqSection />
        <CTA />
      </main>
    `;

    expect(areOtherSectionsPreserved(allSectionsContent)).toBe(true);

    // Test with missing section - remove both import and JSX
    const missingSectionContent = allSectionsContent
      .replace('import { Pricing } from "@/components/landing/Pricing";', '')
      .replace('<Pricing />', '');
    
    // Debug: log what we're testing
    console.log('Testing missing section detection...');
    console.log('Result:', areOtherSectionsPreserved(missingSectionContent));
    
    expect(areOtherSectionsPreserved(missingSectionContent)).toBe(false);
  });

  /**
   * P2-F: Current baseline behavior is captured and preserved
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  it('property: current Index.tsx file satisfies all preservation requirements', () => {
    // This is the master preservation test - it should PASS on unfixed code
    // and continue to PASS after the fix is applied
    
    expect(isHeroSectionPreserved(indexFileContent)).toBe(true);
    expect(isHowItWorksSectionPreserved(indexFileContent)).toBe(true);
    expect(areOtherSectionsPreserved(indexFileContent)).toBe(true);
    expect(areHeaderFooterPreserved(indexFileContent)).toBe(true);
    expect(isMainStructurePreserved(indexFileContent)).toBe(true);
    expect(isSectionOrderingPreserved(indexFileContent)).toBe(true);
    
    // Verify we have a reasonable number of sections
    expect(currentSectionOrder.length).toBeGreaterThanOrEqual(8);
    
    // Verify Hero comes before HowItWorks in the current order
    const heroIndex = currentSectionOrder.indexOf('Hero');
    const howItWorksIndex = currentSectionOrder.indexOf('HowItWorks');
    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(howItWorksIndex).toBeGreaterThanOrEqual(0);
    expect(heroIndex).toBeLessThan(howItWorksIndex);
  });
});