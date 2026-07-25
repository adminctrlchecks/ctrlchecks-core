import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkflowHeader from '../WorkflowHeader';

const storeState = {
  workflowId: 'workflow-1',
  workflowName: 'Setup Workflow',
  setWorkflowName: vi.fn(),
  isDirty: true,
  nodes: [],
  edges: [],
};

vi.mock('@/stores/workflowStore', () => ({
  useWorkflowStore: () => storeState,
}));

vi.mock('../WebhookSettings', () => ({
  default: () => null,
}));

vi.mock('../ScheduleSettings', () => ({
  default: () => null,
}));

vi.mock('@/components/brand/AppBrand', () => ({
  AppBrand: () => <span />,
}));

vi.mock('@/integrations/aws/client', () => ({
  awsClient: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  },
}));

describe('WorkflowHeader setup check actions', () => {
  it('replaces Save & Run with Check Setup', () => {
    render(
      <MemoryRouter>
        <WorkflowHeader
          onSave={vi.fn()}
          onRun={vi.fn()}
          onCheckSetup={vi.fn()}
          setupReadyForRun={false}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Save & Run')).toBeNull();
    expect(screen.getByText('Check Setup')).toBeTruthy();
  });

  it('runs Check Setup and keeps Run disabled until setup is ready', () => {
    const onCheckSetup = vi.fn();
    const onRun = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <WorkflowHeader
          onSave={vi.fn()}
          onRun={onRun}
          onCheckSetup={onCheckSetup}
          setupReadyForRun={false}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Check Setup'));
    expect(onCheckSetup).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Run/ })).toHaveProperty('disabled', true);

    rerender(
      <MemoryRouter>
        <WorkflowHeader
          onSave={vi.fn()}
          onRun={onRun}
          onCheckSetup={onCheckSetup}
          setupReadyForRun
        />
      </MemoryRouter>,
    );

    const runButton = screen.getByRole('button', { name: /Run/ });
    expect(runButton).toHaveProperty('disabled', false);
    fireEvent.click(runButton);
    expect(onRun).toHaveBeenCalledWith(false);
  });
});
