/**
 * Tests for the /missing-items → workflow gate mapping.
 *
 * The hook must prefer the scope-aware `connectionReadiness` envelope when
 * present (so missing_scope / expired reasons survive to the UI) and fall
 * back to the legacy `credentials` array otherwise.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock modules the hook file imports at module scope
vi.mock('@/integrations/aws/client', () => ({
  awsClient: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/config/endpoints', () => ({
  ENDPOINTS: {
    itemBackend: 'http://localhost:3000',
  },
}));

import { missingConnectionsFromResponse } from '../useWorkflowConnectionStatus';

describe('missingConnectionsFromResponse', () => {
  it('falls back to legacy credentials when no readiness envelope exists', () => {
    const result = missingConnectionsFromResponse({
      credentials: [
        { provider: 'google', displayName: 'Google', nodes: ['n1'], satisfied: false },
        { provider: 'slack', displayName: 'Slack', nodes: ['n2'], satisfied: true },
      ],
    });

    expect(result).toEqual([
      { provider: 'google', displayName: 'Google', nodes: ['n1'] },
    ]);
  });

  it('prefers readiness missing rows and preserves status/reason', () => {
    const result = missingConnectionsFromResponse({
      connectionReadiness: {
        missing: [
          {
            nodeId: 'n1',
            provider: 'google',
            status: 'missing_scope',
            reason: 'Missing Gmail send permission',
          },
        ],
      },
      // Legacy array says satisfied — readiness wins
      credentials: [{ provider: 'google', displayName: 'Google', nodes: ['n1'], satisfied: true }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      provider: 'google',
      status: 'missing_scope',
      reason: 'Missing Gmail send permission',
      nodes: ['n1'],
    });
  });

  it('returns empty when readiness reports everything ready', () => {
    const result = missingConnectionsFromResponse({
      connectionReadiness: { missing: [] },
      credentials: [{ provider: 'google', displayName: 'Google', nodes: ['n1'], satisfied: true }],
    });

    expect(result).toEqual([]);
  });

  it('groups multiple missing readiness rows by provider', () => {
    const result = missingConnectionsFromResponse({
      connectionReadiness: {
        missing: [
          { nodeId: 'n1', provider: 'google', status: 'missing' },
          { nodeId: 'n2', provider: 'google', status: 'missing', reason: 'No active credential' },
        ],
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].nodes).toEqual(['n1', 'n2']);
    expect(result[0].reason).toBe('No active credential');
  });

  it('keeps legacy-only missing providers not covered by readiness (api keys)', () => {
    const result = missingConnectionsFromResponse({
      connectionReadiness: {
        missing: [{ nodeId: 'n1', provider: 'google', status: 'missing' }],
      },
      credentials: [
        { provider: 'google', displayName: 'Google', nodes: ['n1'], satisfied: false },
        { provider: 'openai', displayName: 'OpenAI', nodes: ['n2'], satisfied: false },
      ],
    });

    expect(result.map((r) => r.provider).sort()).toEqual(['google', 'openai']);
  });
});
