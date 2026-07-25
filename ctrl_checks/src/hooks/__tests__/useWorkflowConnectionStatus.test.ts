/**
 * Tests for the /missing-items → workflow gate mapping.
 *
 * The hook must prefer the scope-aware `connectionReadiness` envelope when
 * present (so missing_scope / expired reasons survive to the UI) and fall
 * back to the legacy `credentials` array otherwise.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

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

import { awsClient } from '@/integrations/aws/client';
import { missingConnectionsFromResponse, useWorkflowConnectionStatus } from '../useWorkflowConnectionStatus';

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

  it('preserves multiple missing readiness rows for node-level guidance', () => {
    const result = missingConnectionsFromResponse({
      connectionReadiness: {
        missing: [
          { nodeId: 'n1', provider: 'google', status: 'missing' },
          { nodeId: 'n2', provider: 'google', status: 'missing', reason: 'No active credential' },
        ],
      },
    });

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.nodes[0])).toEqual(['n1', 'n2']);
    expect(result[1].reason).toBe('No active credential');
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

describe('useWorkflowConnectionStatus', () => {
  it('fetches readiness immediately on workflow load', async () => {
    vi.mocked(awsClient.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    } as any);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ connectionReadiness: { missing: [] }, credentials: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, { initialEntries: ['/workflow/wf-123'] }, children),
    );

    renderHook(() => useWorkflowConnectionStatus('wf-123'), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/api/workflows/wf-123/missing-items');
  });
});
