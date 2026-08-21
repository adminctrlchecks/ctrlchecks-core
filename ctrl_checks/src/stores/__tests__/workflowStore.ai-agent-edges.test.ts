import { describe, expect, it } from 'vitest';
import { useWorkflowStore } from '../workflowStore';

function node(id: string, type: string) {
  return {
    id,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      type,
      label: id,
      category: type === 'chat_trigger' ? 'triggers' : 'output',
      icon: 'Box',
      config: {},
    },
  } as any;
}

describe('workflowStore AI Agent edge normalization', () => {
  it('replaces legacy reply/output edges when connecting AI Agent Reply', () => {
    const store = useWorkflowStore.getState();
    store.resetWorkflow();

    useWorkflowStore.setState({
      nodes: [node('agent', 'ai_agent'), node('send', 'chat_send')],
      edges: [
        {
          id: 'old-output',
          source: 'agent',
          target: 'send',
          sourceHandle: 'output',
          targetHandle: 'input',
        } as any,
      ],
    });

    useWorkflowStore.getState().onConnect({
      source: 'agent',
      target: 'send',
      sourceHandle: 'success',
      targetHandle: 'input',
    });

    const edges = useWorkflowStore.getState().edges.filter((edge) => edge.source === 'agent');
    expect(edges).toHaveLength(1);
    expect(edges[0].sourceHandle).toBe('success');
  });

  it('keeps AI Agent Error separate from Reply', () => {
    const store = useWorkflowStore.getState();
    store.resetWorkflow();

    useWorkflowStore.setState({
      nodes: [node('agent', 'ai_agent'), node('send', 'chat_send'), node('err', 'log_output')],
      edges: [],
    });

    useWorkflowStore.getState().onConnect({
      source: 'agent',
      target: 'send',
      sourceHandle: 'reply',
      targetHandle: 'input',
    });
    useWorkflowStore.getState().onConnect({
      source: 'agent',
      target: 'err',
      sourceHandle: 'error',
      targetHandle: 'input',
    });

    const edges = useWorkflowStore.getState().edges.filter((edge) => edge.source === 'agent');
    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => edge.sourceHandle).sort()).toEqual(['error', 'success']);
  });
});
