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
import {
  groupWorkflowConnectionIssues,
  missingConnectionsFromResponse,
  useWorkflowConnectionStatus,
  workflowSetupStatusFromResponse,
} from '../useWorkflowConnectionStatus';

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
            credentialTypeId: 'google_oauth2',
            status: 'missing_scope',
            requiredScopes: ['https://www.googleapis.com/auth/gmail.send'],
            connectionId: 'conn-1',
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
      credentialTypeId: 'google_oauth2',
      status: 'missing_scope',
      requiredScopes: ['https://www.googleapis.com/auth/gmail.send'],
      connectionId: 'conn-1',
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

describe('workflowSetupStatusFromResponse', () => {
  it('keeps the full unified readiness envelope for the setup panel', () => {
    const status = workflowSetupStatusFromResponse({
      ready: false,
      connectionReadiness: {
        missing: [{ nodeId: 'n1', provider: 'provider_a', status: 'missing', reason: 'No active connection' }],
      },
      missingInputs: [{ nodeId: 'n2', nodeLabel: 'Node Two', fieldLabel: 'Message', reason: 'Message is required' }],
      invalidInputs: [{ nodeId: 'n3', nodeLabel: 'Node Three', fieldLabel: 'Count', reason: 'Must be a number' }],
    });

    expect(status.ready).toBe(false);
    expect(status.missingConnections).toHaveLength(1);
    expect(status.missingInputs[0]).toMatchObject({ nodeLabel: 'Node Two', fieldLabel: 'Message' });
    expect(status.invalidInputs[0]).toMatchObject({ nodeLabel: 'Node Three', fieldLabel: 'Count' });
  });
});

describe('groupWorkflowConnectionIssues', () => {
  it('does not crash when a cached readiness object is passed instead of an array', () => {
    const groups = groupWorkflowConnectionIssues({
      ready: false,
      missingConnections: [
        { provider: 'provider_a', displayName: 'Provider A', nodes: ['node-1'] },
      ],
    });

    expect(groups).toEqual([]);
  });

  it('groups rows by provider requirement and unions required coverage', () => {
    const groups = groupWorkflowConnectionIssues([
      {
        provider: 'provider_a',
        displayName: 'Provider A',
        nodes: ['node-1'],
        nodeId: 'node-1',
        nodeLabel: 'First node',
        operationLabel: 'Create',
        credentialTypeId: 'provider_a_oauth2',
        requiredScopes: ['records:create'],
        status: 'missing_scope',
        action: 'reconnect',
        reason: 'Missing create permission',
      },
      {
        provider: 'provider_a',
        displayName: 'Provider A',
        nodes: ['node-2'],
        nodeId: 'node-2',
        nodeLabel: 'Second node',
        operationLabel: 'Update',
        credentialTypeId: 'provider_a_oauth2',
        requiredScopes: ['records:update'],
        status: 'runtime_missing',
        action: 'reconnect',
        reason: 'Runtime credential missing',
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].issues.map((issue) => issue.nodeId)).toEqual(['node-1', 'node-2']);
    expect(groups[0].requiredScopes.sort()).toEqual(['records:create', 'records:update']);
  });

  it('keeps multiple compatible saved accounts as select-connection guidance', () => {
    const groups = groupWorkflowConnectionIssues([
      {
        provider: 'provider_a',
        displayName: 'Provider A',
        nodes: ['node-1'],
        nodeId: 'node-1',
        credentialTypeId: 'provider_a_oauth2',
        candidateConnectionIds: ['conn-1', 'conn-2'],
        status: 'invalid_ref',
        action: 'select_connection',
        reason: 'Multiple active connections exist',
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      action: 'select_connection',
      candidateConnectionIds: ['conn-1', 'conn-2'],
    });
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

  it('refetches readiness when the same workflow is reopened', async () => {
    vi.mocked(awsClient.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    } as any);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ready: true, connectionReadiness: { missing: [] }, credentials: [] }),
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

    const first = renderHook(() => useWorkflowConnectionStatus('wf-123'), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    first.unmount();

    renderHook(() => useWorkflowConnectionStatus('wf-123'), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('fetches readiness for a switched workflow id', async () => {
    vi.mocked(awsClient.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    } as any);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ready: true, connectionReadiness: { missing: [] }, credentials: [] }),
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

    const { rerender } = renderHook(({ workflowId }) => useWorkflowConnectionStatus(workflowId), {
      wrapper,
      initialProps: { workflowId: 'wf-123' },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender({ workflowId: 'wf-456' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:3000/api/workflows/wf-456/missing-items');
  });
});
