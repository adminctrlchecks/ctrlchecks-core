/**
 * deterministicGuidance — structural drift branch produces a dynamic, per-node/field
 * message instead of falling through to the generic catch-all.
 *
 * Run:
 *   cd worker && npx jest src/api/__tests__/ai-error-guidance.test.ts --runInBand
 */

import { describe, it, expect } from '@jest/globals';
import { deterministicGuidance } from '../ai-error-guidance';

describe('deterministicGuidance — structuralDrifts', () => {
  it('produces a dynamic per-node/field message instead of the generic fallback', () => {
    const result = deterministicGuidance({
      errorCode: 'TOPOLOGY_MUTATION_BLOCKED_CONFIGURING_INPUTS',
      errorMessage: 'Post-freeze structural config drift detected. Structure cannot be rewritten in this phase.',
      context: {
        structuralDrifts: [
          { nodeId: 'node-1', nodeLabel: 'Payment Status and Amount Submission Form', nodeType: 'form', field: 'fields', changedKeys: ['key'] },
        ],
      },
    });

    expect(result.title).not.toBe('One more thing to check');
    expect(result.description).toContain('Payment Status and Amount Submission Form');
    expect(result.description).toContain('Fields');
    expect(result.nextSteps.join(' ')).toContain('Payment Status and Amount Submission Form');
  });

  it('falls through to the generic catch-all when no structured context is present', () => {
    const result = deterministicGuidance({
      errorCode: 'TOPOLOGY_MUTATION_BLOCKED_CONFIGURING_INPUTS',
      errorMessage: 'Post-freeze structural config drift detected. Structure cannot be rewritten in this phase.',
      context: {},
    });

    expect(result.title).toBe('One more thing to check');
  });
});
