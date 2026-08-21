import { buildExecutionPlan } from '../unified-execution-engine';

describe('AI Agent attachment planning', () => {
  it('keeps attachment edges out of normal execution order', () => {
    const nodes = [
      { id: 'trigger-1', type: 'manual_trigger', data: { type: 'manual_trigger', category: 'triggers' } },
      { id: 'agent-1', type: 'ai_agent', data: { type: 'ai_agent', category: 'ai' } },
      { id: 'model-1', type: 'chat_model', data: { type: 'chat_model', category: 'ai' } },
      { id: 'memory-1', type: 'memory', data: { type: 'memory', category: 'ai' } },
      { id: 'tool-1', type: 'http_request', data: { type: 'http_request', category: 'http_api' } },
      { id: 'log-1', type: 'log_output', data: { type: 'log_output', category: 'output' } },
    ] as any[];
    const edges = [
      { id: 'e-trigger-agent', source: 'trigger-1', target: 'agent-1', sourceHandle: 'output', targetHandle: 'userInput' },
      { id: 'e-model-agent', source: 'model-1', target: 'agent-1', sourceHandle: 'output', targetHandle: 'chat_model' },
      { id: 'e-memory-agent', source: 'memory-1', target: 'agent-1', sourceHandle: 'output', targetHandle: 'memory' },
      { id: 'e-tool-agent', source: 'tool-1', target: 'agent-1', sourceHandle: 'output', targetHandle: 'tool' },
      { id: 'e-agent-log', source: 'agent-1', target: 'log-1', sourceHandle: 'success', targetHandle: 'input' },
    ] as any[];

    const plan = buildExecutionPlan(nodes, edges);

    expect(plan.validationErrors).toEqual([]);
    expect(plan.executionOrder.map((node) => node.id)).toEqual(['trigger-1', 'agent-1', 'log-1']);
    expect(plan.edges.map((edge) => edge.id)).toEqual(['e-trigger-agent', 'e-agent-log']);
  });

  it('recognizes marked attachment edges even when the target handle was normalized incorrectly', () => {
    const nodes = [
      { id: 'trigger-1', type: 'manual_trigger', data: { type: 'manual_trigger', category: 'triggers' } },
      { id: 'agent-1', type: 'ai_agent', data: { type: 'ai_agent', category: 'ai' } },
      { id: 'memory-1', type: 'memory', data: { type: 'memory', category: 'ai' } },
    ] as any[];
    const edges = [
      { id: 'e-trigger-agent', source: 'trigger-1', target: 'agent-1', sourceHandle: 'output', targetHandle: 'userInput' },
      {
        id: 'e-memory-agent',
        source: 'memory-1',
        target: 'agent-1',
        sourceHandle: 'output',
        targetHandle: 'input',
        data: { agentAttachment: true, role: 'memory' },
      },
    ] as any[];

    const plan = buildExecutionPlan(nodes, edges);

    expect(plan.validationErrors).toEqual([]);
    expect(plan.executionOrder.map((node) => node.id)).toEqual(['trigger-1', 'agent-1']);
    expect(plan.edges.map((edge) => edge.id)).toEqual(['e-trigger-agent']);
  });
});
