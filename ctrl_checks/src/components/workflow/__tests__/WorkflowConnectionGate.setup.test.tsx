import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkflowConnectionGate } from '../WorkflowConnectionGate';

vi.mock('@/components/connections/ProviderLogo', () => ({
  ProviderLogo: ({ provider }: { provider: string }) => <span data-testid={`provider-${provider}`} />,
}));

describe('WorkflowConnectionGate setup panel', () => {
  it('groups provider rows and preserves child node operation reasons', () => {
    render(
      <MemoryRouter>
        <WorkflowConnectionGate
          workflowId="workflow-1"
          isLoading={false}
          onDismiss={vi.fn()}
          missingConnections={[
            {
              provider: 'provider_a',
              displayName: 'Provider A',
              nodes: ['node-1'],
              nodeId: 'node-1',
              nodeLabel: 'Create Record',
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
              nodeLabel: 'Update Record',
              operationLabel: 'Update',
              credentialTypeId: 'provider_a_oauth2',
              requiredScopes: ['records:update'],
              status: 'runtime_missing',
              action: 'reconnect',
              reason: 'Runtime token missing',
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Provider and account setup')).toBeTruthy();
    expect(screen.getAllByText('Provider A')).toHaveLength(1);
    expect(screen.getByText(/records:create, records:update/)).toBeTruthy();
    expect(screen.getByText('Create Record - Create')).toBeTruthy();
    expect(screen.getByText('Missing create permission')).toBeTruthy();
    expect(screen.getByText('Update Record - Update')).toBeTruthy();
    expect(screen.getByText('Runtime token missing')).toBeTruthy();
  });

  it('shows select guidance for multiple compatible saved accounts without destructive styling', () => {
    const { container } = render(
      <MemoryRouter>
        <WorkflowConnectionGate
          workflowId="workflow-1"
          isLoading={false}
          onDismiss={vi.fn()}
          missingConnections={[
            {
              provider: 'provider_a',
              displayName: 'Provider A',
              nodes: ['node-1'],
              nodeId: 'node-1',
              nodeLabel: 'Create Record',
              candidateConnectionIds: ['conn-1', 'conn-2'],
              status: 'invalid_ref',
              action: 'select_connection',
              reason: 'Multiple active connections exist',
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Select connection').length).toBeGreaterThan(0);
    expect(screen.getByText(/Multiple saved accounts match/)).toBeTruthy();
    expect(container.innerHTML).not.toContain('bg-destructive');
    expect(container.innerHTML).not.toContain('text-destructive');
  });

  it('lists missing and invalid input blockers with next actions', () => {
    render(
      <MemoryRouter>
        <WorkflowConnectionGate
          workflowId="workflow-1"
          isLoading={false}
          onDismiss={vi.fn()}
          missingConnections={[]}
          readiness={{
            ready: false,
            readinessIssues: [],
            missingCredentials: [],
            runtimeValidationIssues: [],
            missingConnections: [],
            raw: {},
            missingInputs: [{
              nodeId: 'node-1',
              nodeLabel: 'Message Node',
              operationLabel: 'Send',
              fieldLabel: 'Message',
              reason: 'Message is required',
            }],
            invalidInputs: [{
              nodeId: 'node-2',
              nodeLabel: 'Number Node',
              operationLabel: 'Calculate',
              fieldLabel: 'Amount',
              reason: 'Amount must be numeric',
            }],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Missing inputs')).toBeTruthy();
    expect(screen.getByText('Message Node - Send - Message')).toBeTruthy();
    expect(screen.getByText('Message is required')).toBeTruthy();
    expect(screen.getByText('Invalid inputs')).toBeTruthy();
    expect(screen.getByText('Number Node - Calculate - Amount')).toBeTruthy();
    expect(screen.getByText('Amount must be numeric')).toBeTruthy();
  });
});
