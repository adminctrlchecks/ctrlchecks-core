/**
 * Node Inspector Metadata Tests
 *
 * Verifies the universal description fallback chain and node-type
 * normalization used by the Properties panel.
 */

import { describe, it, expect } from 'vitest';
import {
  NODE_DESCRIPTION_FALLBACK,
  isMeaningfulNodeDescription,
  normalizeNodeTypeForLookup,
  getUsageGuideForType,
  resolveNodeDescription,
  stripDocDescriptionBoilerplate,
} from '../node-inspector-metadata';

describe('normalizeNodeTypeForLookup', () => {
  it('passes canonical types through unchanged', () => {
    expect(normalizeNodeTypeForLookup('google_gmail')).toBe('google_gmail');
    expect(normalizeNodeTypeForLookup('if_else')).toBe('if_else');
  });

  it('maps legacy aliases to the canonical type', () => {
    expect(normalizeNodeTypeForLookup('csv_processor')).toBe('csv');
  });

  it('handles non-string and empty input safely', () => {
    expect(normalizeNodeTypeForLookup(undefined)).toBe('');
    expect(normalizeNodeTypeForLookup(null)).toBe('');
    expect(normalizeNodeTypeForLookup('  slack_message  ')).toBe('slack_message');
  });
});

describe('isMeaningfulNodeDescription', () => {
  it('rejects empty or whitespace-only descriptions', () => {
    expect(isMeaningfulNodeDescription('', { nodeType: 'x' })).toBe(false);
    expect(isMeaningfulNodeDescription('   ', { nodeType: 'x' })).toBe(false);
    expect(isMeaningfulNodeDescription(undefined, { nodeType: 'x' })).toBe(false);
  });

  it('rejects descriptions that merely repeat the node name', () => {
    // The exact bug: nodeTypes.ts has description "Gmail" for google_gmail (display name "Gmail")
    expect(isMeaningfulNodeDescription('Gmail', { nodeType: 'google_gmail', displayName: 'Gmail' })).toBe(false);
    expect(isMeaningfulNodeDescription('If/Else', { nodeType: 'if_else', displayName: 'If/Else' })).toBe(false);
    expect(isMeaningfulNodeDescription('google_gmail', { nodeType: 'google_gmail' })).toBe(false);
  });

  it('accepts real descriptions', () => {
    expect(
      isMeaningfulNodeDescription('Send, list, get, or search Gmail messages.', {
        nodeType: 'google_gmail',
        displayName: 'Gmail',
      })
    ).toBe(true);
  });
});

describe('stripDocDescriptionBoilerplate', () => {
  it('removes the generated "Use this node when…registry." suffix', () => {
    const raw =
      'Send, list, get, and search Gmail messages via Google OAuth. Use this node when a workflow needs Gmail behavior with schema-driven inputs from the CtrlChecks node registry.';
    expect(stripDocDescriptionBoilerplate(raw)).toBe(
      'Send, list, get, and search Gmail messages via Google OAuth.'
    );
  });

  it('leaves descriptions without the suffix untouched', () => {
    const raw = 'Route execution to the true or false branch by evaluating one or more conditions.';
    expect(stripDocDescriptionBoilerplate(raw)).toBe(raw);
  });
});

describe('resolveNodeDescription', () => {
  it('prefers the backend schema description when meaningful', () => {
    expect(
      resolveNodeDescription({
        nodeType: 'google_gmail',
        displayName: 'Gmail',
        backendDescription: 'Send, list, get, or search Gmail messages.',
        legacyDescription: 'Gmail',
      })
    ).toBe('Send, list, get, or search Gmail messages.');
  });

  it('falls back to docs-content when backend and legacy descriptions are weak', () => {
    const resolved = resolveNodeDescription({
      nodeType: 'google_gmail',
      displayName: 'Gmail',
      backendDescription: 'Gmail',
      legacyDescription: 'Gmail',
    });
    // docs manifest: "Send, list, get, and search Gmail messages via Google OAuth. …"
    expect(resolved).toContain('Gmail messages');
    expect(resolved).not.toBe('Gmail');
    expect(resolved).not.toContain('CtrlChecks node registry');
  });

  it('resolves through legacy aliases', () => {
    const resolved = resolveNodeDescription({ nodeType: 'csv_processor', displayName: 'CSV' });
    // Resolves the csv docs/guide entry rather than falling through to the fallback
    expect(resolved).not.toBe(NODE_DESCRIPTION_FALLBACK);
  });

  it('returns the safe fallback when nothing is available', () => {
    expect(
      resolveNodeDescription({ nodeType: 'definitely_not_a_node', displayName: 'Nope' })
    ).toBe(NODE_DESCRIPTION_FALLBACK);
  });

  it('uses the usage guide overview before a weak legacy description', () => {
    const resolved = resolveNodeDescription({
      nodeType: 'if_else',
      displayName: 'If/Else',
      legacyDescription: 'If/Else',
    });
    expect(resolved).not.toBe('If/Else');
    expect(resolved.length).toBeGreaterThan(20);
  });
});

describe('getUsageGuideForType', () => {
  it('returns guides for canonical types and aliases', () => {
    expect(getUsageGuideForType('if_else')?.overview).toBeTruthy();
    expect(getUsageGuideForType('form')?.overview).toBeTruthy();
    expect(getUsageGuideForType('google_gmail')?.overview).toBeTruthy();
    expect(getUsageGuideForType('slack_message')?.overview).toBeTruthy();
  });

  it('returns undefined for unknown types without throwing', () => {
    expect(getUsageGuideForType('definitely_not_a_node')).toBeUndefined();
    expect(getUsageGuideForType(undefined)).toBeUndefined();
  });
});
