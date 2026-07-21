/**
 * Pure-function coverage for Smart Search's safety-critical piece: url
 * reconciliation (the mechanism that guarantees a model-hallucinated
 * url/target can never reach the user). No Gemini calls here.
 *
 * Run:
 *   cd worker && npx jest src/services/search/__tests__/search-generator.test.ts --runInBand
 */

import { describe, it, expect } from '@jest/globals';
import { reconcileResults, reconcileSuggestedActions } from '../search-generator';
import type { SearchCandidate, SearchResultItem, SearchSuggestedAction } from '../types';

const candidates: SearchCandidate[] = [
  { title: 'Templates', description: 'Ready-made workflow templates', type: 'page', url: '/templates', keywords: 'starter landing page' },
  { title: 'Billing & Subscription', description: 'Manage your plan', type: 'setting', url: '/subscriptions', keywords: 'billing plan' },
];

function makeResult(overrides: Partial<SearchResultItem> = {}): SearchResultItem {
  return {
    title: 'Templates',
    description: 'Ready-made workflow templates',
    type: 'article', // deliberately wrong — should be overwritten with the real type
    url: '/templates',
    reason: 'Matches "templates"',
    action_label: 'Open',
    ...overrides,
  };
}

describe('reconcileResults — url hallucination guard', () => {
  it('keeps a result whose url matches a real candidate', () => {
    const result = reconcileResults([makeResult()], candidates);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('/templates');
  });

  it('overwrites the model-claimed type with the candidate\'s real type', () => {
    const result = reconcileResults([makeResult({ type: 'article' })], candidates);
    expect(result[0].type).toBe('page'); // real type from the candidate, not the model's guess
  });

  it('drops a result whose url does not match any real candidate (hallucinated link)', () => {
    const result = reconcileResults([makeResult({ url: '/admin/delete-everything' })], candidates);
    expect(result).toHaveLength(0);
  });

  it('drops only the hallucinated result, keeping valid ones', () => {
    const result = reconcileResults(
      [makeResult(), makeResult({ url: '/fake/route', title: 'Fake' })],
      candidates,
    );
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('/templates');
  });

  it('caps results at 8 even if more are passed in', () => {
    const many = Array.from({ length: 12 }, () => makeResult());
    const result = reconcileResults(many, candidates);
    expect(result.length).toBeLessThanOrEqual(8);
  });
});

describe('reconcileSuggestedActions — target hallucination guard', () => {
  function makeAction(overrides: Partial<SearchSuggestedAction> = {}): SearchSuggestedAction {
    return { label: 'View billing', target: '/subscriptions', ...overrides };
  }

  it('keeps a suggested action whose target matches a real candidate', () => {
    const result = reconcileSuggestedActions([makeAction()], candidates);
    expect(result).toHaveLength(1);
  });

  it('drops a suggested action whose target does not match any real candidate', () => {
    const result = reconcileSuggestedActions([makeAction({ target: '/nonexistent' })], candidates);
    expect(result).toHaveLength(0);
  });
});
