/**
 * PropertiesPanel Universal Inspector Tests
 *
 * Covers the Properties panel rendering contract:
 * - Description prefers the richest available source (never a bare label)
 * - Nodes without renderable fields show an explicit "no configuration" state
 * - The header renders a single close (X) control, no duplicates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PropertiesPanel from '../PropertiesPanel';
import { nodeSchemaService, type NodeDefinition } from '@/services/nodeSchemaService';
import { useWorkflowStore } from '@/stores/workflowStore';

vi.mock('@/stores/workflowStore', () => ({
  useWorkflowStore: vi.fn(),
}));
vi.mock('@/services/nodeSchemaService', () => ({
  nodeSchemaService: { fetchSchemaByType: vi.fn() },
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/hooks/useRole', () => ({
  useRole: () => ({ role: 'admin' }),
}));
vi.mock('@/stores/expressionDropStore', () => ({
  useExpressionDropStore: () => ({ pendingExpression: null, clearPendingExpression: vi.fn() }),
}));
vi.mock('@/lib/queryInvalidation', () => ({
  invalidateAfterConnectionChange: vi.fn(),
}));
vi.mock('@/components/docs/NodeHelpButton', () => ({
  NodeHelpButton: () => null,
}));
vi.mock('@/integrations/aws/client', () => ({
  awsClient: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    channel: vi.fn(),
    removeChannel: vi.fn(),
    from: vi.fn(),
  },
}));

// Radix ScrollArea needs ResizeObserver, which jsdom does not provide
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || ResizeObserverStub;

function mockStore(nodeType: string, overrides: Record<string, unknown> = {}) {
  (useWorkflowStore as any).mockReturnValue({
    selectedNode: {
      id: 'node1',
      type: 'custom',
      data: { type: nodeType, label: nodeType, config: {} },
    },
    selectNode: vi.fn(),
    updateNodeConfig: vi.fn(),
    deleteSelectedNode: vi.fn(),
    workflowId: 'workflow1',
    nodes: [],
    edges: [],
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    setIsDirty: vi.fn(),
    setAiEditedNodeIds: vi.fn(),
    clearAiEditedNodeHighlight: vi.fn(),
    workflowPhase: 'configure',
    ...overrides,
  });
}

function renderPanel(props: { onClose?: () => void } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PropertiesPanel {...props} />
    </QueryClientProvider>
  );
}

const gmailSchema: NodeDefinition = {
  type: 'google_gmail',
  label: 'Gmail',
  category: 'communication',
  description: 'Send, list, get, or search Gmail messages. Automate email operations in your workflows.',
  inputSchema: {},
  outputSchema: {},
  requiredInputs: [],
  outgoingPorts: ['output'],
  incomingPorts: ['input'],
  isBranching: false,
  defaultInputs: {},
};

describe('PropertiesPanel description fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the rich backend description instead of the bare legacy label', async () => {
    mockStore('google_gmail');
    (nodeSchemaService.fetchSchemaByType as any).mockResolvedValue(gmailSchema);

    renderPanel();

    await waitFor(() => {
      // The old bug: Description rendered the legacy nodeTypes.ts description, a bare "Gmail"
      expect(
        screen.getByText(/Send, list, get, or search Gmail messages/)
      ).toBeTruthy();
    });
  });

  it('falls back to docs/usage-guide text when there is no backend schema', async () => {
    mockStore('google_gmail');
    (nodeSchemaService.fetchSchemaByType as any).mockResolvedValue(null);

    renderPanel();

    await waitFor(() => {
      // docs-content manifest description (boilerplate stripped) or usage guide overview —
      // anything but the bare "Gmail" label
      expect(screen.getByText(/Gmail messages/)).toBeTruthy();
    });
  });
});

describe('PropertiesPanel no-configuration state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an explicit message when the schema defines no configurable fields', async () => {
    mockStore('google_gmail');
    (nodeSchemaService.fetchSchemaByType as any).mockResolvedValue(gmailSchema);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('no-config-message')).toBeTruthy();
    });
    expect(screen.getByText(/No configuration required for this node/)).toBeTruthy();
  });

  it('shows the message for unknown node types instead of an empty section', async () => {
    mockStore('mystery_node');
    (nodeSchemaService.fetchSchemaByType as any).mockResolvedValue(null);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId('no-config-message')).toBeTruthy();
    });
  });
});

describe('PropertiesPanel header close controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a single close button when onClose is provided (no duplicate X)', async () => {
    mockStore('google_gmail');
    (nodeSchemaService.fetchSchemaByType as any).mockResolvedValue(gmailSchema);

    renderPanel({ onClose: vi.fn() });

    await waitFor(() => {
      expect(screen.getAllByLabelText('Close panel')).toHaveLength(1);
    });
    expect(screen.queryByLabelText('Deselect node')).toBeNull();
  });

  it('keeps the deselect button when there is no panel close handler', async () => {
    mockStore('google_gmail');
    (nodeSchemaService.fetchSchemaByType as any).mockResolvedValue(gmailSchema);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByLabelText('Deselect node')).toBeTruthy();
    });
    expect(screen.queryByLabelText('Close panel')).toBeNull();
  });
});
