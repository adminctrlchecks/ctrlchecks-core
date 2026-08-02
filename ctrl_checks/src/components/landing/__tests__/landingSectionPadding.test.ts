/**
 * Feature: ui-ux-and-auth-improvements
 * Property 6 (design): All remaining landing sections use reduced vertical padding
 *
 * Validates: Requirements 6.1, 6.2
 *
 * Static source analysis test — reads each component file and asserts that the
 * <section> element's className contains the expected reduced padding class and
 * does NOT contain the old large padding classes.
 */

import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";
import { describe, it, expect } from "vitest";

const LANDING_DIR = path.resolve(
  __dirname,
  ".." // ctrl_checks/src/components/landing
);

/**
 * Files that should use py-12.
 *
 * WorkflowDemoSection.tsx was merged into Hero.tsx (the demo now lives in the
 * first screen), so it is no longer listed. TrustSection.tsx and
 * TemplateShowcaseSection.tsx are mounted on the landing page and follow the
 * same padding rule.
 */
const PY12_FILES = [
  "HowItWorks.tsx",
  "TemplateShowcaseSection.tsx",
  "OpenCoreSection.tsx",
  "PluginsApiSection.tsx",
  "IndustryVerticalsSection.tsx",
  "TrustSection.tsx",
  "WhyCtrlChecksSection.tsx",
  "Features.tsx",
  "Pricing.tsx",
  "SubscriptionSection.tsx",
  "FaqSection.tsx",
  "CTA.tsx",
] as const;

/** Files that should use py-8 (already had smaller padding, proportionally reduced) */
const PY8_FILES = ["IntegrationsMarqueeSection.tsx"] as const;

type SectionEntry = {
  file: string;
  expectedPadding: "py-12" | "py-8";
};

const ALL_SECTIONS: SectionEntry[] = [
  ...PY12_FILES.map((f) => ({ file: f, expectedPadding: "py-12" as const })),
  ...PY8_FILES.map((f) => ({ file: f, expectedPadding: "py-8" as const })),
];

/**
 * Extract the className value(s) from <section ...> opening tags in source.
 * Returns an array of className strings found on section elements.
 */
function extractSectionClassNames(source: string): string[] {
  // Match <section ... className="..." ...> or <section ... className={`...`} ...>
  const classNames: string[] = [];

  // Match double-quoted className on section tags
  const doubleQuoteRe = /<section[^>]*\bclassName="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = doubleQuoteRe.exec(source)) !== null) {
    classNames.push(m[1]);
  }

  // Match template-literal className on section tags (e.g. className={`relative py-8 sm:py-10`})
  const templateLiteralRe = /<section[^>]*\bclassName=\{`([^`]*)`\}/g;
  while ((m = templateLiteralRe.exec(source)) !== null) {
    classNames.push(m[1]);
  }

  return classNames;
}

describe("Landing section reduced vertical padding (Property 6 / design)", () => {
  it("each landing section file has the correct reduced padding class", () => {
    // Use fast-check to parameterize over the section entries
    // fc.constantFrom picks one entry per run; with 100 iterations each entry is sampled multiple times
    fc.assert(
      fc.property(fc.constantFrom(...ALL_SECTIONS), (entry: SectionEntry) => {
        const filePath = path.join(LANDING_DIR, entry.file);
        const source = fs.readFileSync(filePath, "utf-8");

        const classNames = extractSectionClassNames(source);

        // There must be at least one <section> with a className
        expect(classNames.length).toBeGreaterThan(0);

        // Every section className must satisfy the padding constraints
        for (const cls of classNames) {
          // Must contain the expected reduced padding
          expect(cls).toContain(entry.expectedPadding);

          // Must NOT contain the old large padding classes
          expect(cls).not.toContain("py-24");
          expect(cls).not.toContain("py-32");
        }
      }),
      { numRuns: 100, verbose: true }
    );
  });

  it("py-12 files: section className contains py-12 and not py-24 or py-32", () => {
    fc.assert(
      fc.property(fc.constantFrom(...PY12_FILES), (file: string) => {
        const source = fs.readFileSync(path.join(LANDING_DIR, file), "utf-8");
        const classNames = extractSectionClassNames(source);

        expect(classNames.length).toBeGreaterThan(0);

        for (const cls of classNames) {
          expect(cls).toContain("py-12");
          expect(cls).not.toContain("py-24");
          expect(cls).not.toContain("py-32");
        }
      }),
      { numRuns: 100, verbose: false }
    );
  });

  it("IntegrationsMarqueeSection: section className contains py-8 and not py-24 or py-32", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PY8_FILES),
        (file: string) => {
          const source = fs.readFileSync(path.join(LANDING_DIR, file), "utf-8");
          const classNames = extractSectionClassNames(source);

          expect(classNames.length).toBeGreaterThan(0);

          for (const cls of classNames) {
            expect(cls).toContain("py-8");
            expect(cls).not.toContain("py-24");
            expect(cls).not.toContain("py-32");
          }
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });
});
