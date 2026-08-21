import {
  normalizeWorkflowForSave,
  validateWorkflowForSave,
} from '../workflow-save-validator';

describe('AI Agent attachment save normalization', () => {
  it('canonicalizes reversed AI Agent attachment edges before save validation', () => {
    const nodes: any[] = [
      { id: 't1', type: 'manual_trigger', data: { label: 'Trigger', type: 'manual_trigger', category: 'trigger', config: {} } },
      { id: 'agent', type: 'ai_agent', data: { label: 'AI Agent', type: 'ai_agent', category: 'ai', config: {} } },
      { id: 'tool1', type: 'noop', data: { label: 'Tool', type: 'noop', category: 'utility', config: {} } },
      {
        id: 'send',
        type: 'chat_send',
        data: {
          label: 'Chat Send',
          type: 'chat_send',
          category: 'output',
          config: {
            message: '{{$json.response_text || $json.output || $json.message}}',
            sessionId: '{{$json.sessionId}}',
          },
        },
      },
    ];
    const edges: any[] = [
      { id: 'e1', source: 't1', target: 'agent', sourceHandle: 'output', targetHandle: 'userInput' },
      {
        id: 'e2',
        source: 'agent',
        target: 'tool1',
        sourceHandle: 'tool',
        targetHandle: 'input',
        data: { agentAttachment: true, role: 'tool' },
      },
      { id: 'e3', source: 'agent', target: 'send', sourceHandle: 'success', targetHandle: 'input' },
    ];

    const normalized = normalizeWorkflowForSave(nodes as any, edges as any);

    expect(normalized.edges).toContainEqual(expect.objectContaining({
      id: 'e2',
      source: 'tool1',
      target: 'agent',
      sourceHandle: 'output',
      targetHandle: 'tool',
      data: expect.objectContaining({ agentAttachment: true, role: 'tool' }),
    }));
    expect(validateWorkflowForSave(normalized.nodes as any, normalized.edges as any).canSave).toBe(true);
  });
});
