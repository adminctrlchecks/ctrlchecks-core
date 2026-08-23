import type { NodeExecutionContext, UnifiedNodeDefinition } from '../../../types/unified-node-contract';

const legacyOutput = {
  response_text: 'legacy answer',
  response_json: null,
  confidence_score: 0.8,
  used_tools: [],
  memory_written: false,
  error_flag: false,
  error_message: null,
};

function loadSubject() {
  jest.resetModules();
  const legacyPath = require.resolve('../../unified-node-registry-legacy-adapter');
  const agentPath = require.resolve('../../../execution/agent/agent-executor');
  jest.doMock(legacyPath, () => ({
    executeViaLegacyExecutor: jest.fn(async () => ({ success: true, output: legacyOutput })),
  }));
  jest.doMock(agentPath, () => ({
    runAgent: jest.fn(async () => ({ success: true, output: { response_text: 'agent answer' } })),
  }));
  const subject = require('../ai-agent');
  return {
    overrideAiAgent: subject.overrideAiAgent as typeof import('../ai-agent').overrideAiAgent,
    executeViaLegacyExecutor: jest.requireMock(legacyPath).executeViaLegacyExecutor as jest.Mock,
    runAgent: jest.requireMock(agentPath).runAgent as jest.Mock,
  };
}

function baseDefinition(): UnifiedNodeDefinition {
  return {
    type: 'ai_agent',
    label: 'AI Agent',
    category: 'ai',
    description: 'Agent',
    version: '1.0.0',
    inputSchema: {},
    outputSchema: { default: { name: 'default', description: 'Default', schema: { type: 'object' } } },
    requiredInputs: ['userInput'],
    defaultConfig: () => ({}),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({ success: true, output: {} }),
    incomingPorts: ['input'],
    outgoingPorts: ['output'],
    isBranching: false,
  };
}

function context(extra: Record<string, unknown> = {}): NodeExecutionContext {
  return {
    nodeId: 'agent-1',
    nodeType: 'ai_agent',
    config: {},
    inputs: { userInput: 'hello' },
    rawInput: { message: 'hello' },
    upstreamOutputs: new Map(),
    workflowId: 'workflow-1',
    db: {},
    ...extra,
  } as NodeExecutionContext;
}

describe('overrideAiAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves zero-tool legacy output parity', async () => {
    const { overrideAiAgent, executeViaLegacyExecutor, runAgent } = loadSubject();
    const definition = overrideAiAgent(baseDefinition(), { type: 'ai_agent', label: 'AI Agent', category: 'ai', description: 'Agent' } as any);
    const result = await definition.execute(context({
      agentGraph: {
        nodes: [{ id: 'agent-1', type: 'ai_agent', data: { label: 'AI Agent', type: 'ai_agent', category: 'ai', config: {} } }],
        edges: [],
      },
    }));

    expect(runAgent).not.toHaveBeenCalled();
    expect(executeViaLegacyExecutor).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, output: legacyOutput });
  });

  it('routes to the tool loop when a tool handle is attached', async () => {
    const { overrideAiAgent, runAgent } = loadSubject();
    const definition = overrideAiAgent(baseDefinition(), { type: 'ai_agent', label: 'AI Agent', category: 'ai', description: 'Agent' } as any);
    const result = await definition.execute(context({
      agentGraph: {
        nodes: [
          { id: 'agent-1', type: 'ai_agent', data: { label: 'AI Agent', type: 'ai_agent', category: 'ai', config: {} } },
          { id: 'tool-1', type: 'future_tool', data: { label: 'Future', type: 'future_tool', category: 'action', config: {} } },
        ],
        edges: [{ id: 'e1', source: 'tool-1', target: 'agent-1', targetHandle: 'tool' }],
      },
    }));

    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, output: { response_text: 'agent answer' } });
  });

  it('honors an attached Chat Model sidecar even when no tool is attached', async () => {
    const { overrideAiAgent, executeViaLegacyExecutor, runAgent } = loadSubject();
    const definition = overrideAiAgent(baseDefinition(), { type: 'ai_agent', label: 'AI Agent', category: 'ai', description: 'Agent' } as any);
    await definition.execute(context({
      config: { model: 'gemini-3.5-flash' }, // inline field — must be overridden by the sidecar
      agentGraph: {
        nodes: [
          { id: 'agent-1', type: 'ai_agent', data: { label: 'AI Agent', type: 'ai_agent', category: 'ai', config: {} } },
          { id: 'model-1', type: 'openai_gpt', data: { label: 'OpenAI GPT', type: 'openai_gpt', category: 'ai', config: { model: 'gpt-4o', apiKey: 'sk-test-123' } } },
        ],
        edges: [{ id: 'e1', source: 'model-1', target: 'agent-1', targetHandle: 'chat_model' }],
      },
    }));

    // No tool attached, so this must NOT go through the tool loop.
    expect(runAgent).not.toHaveBeenCalled();
    expect(executeViaLegacyExecutor).toHaveBeenCalledTimes(1);
    const passedContext = (executeViaLegacyExecutor.mock.calls[0][0] as { context: NodeExecutionContext }).context;
    expect(passedContext.config).toMatchObject({ model: 'gpt-4o', apiKey: 'sk-test-123' });
  });

  it('leaves the inline model/apiKey untouched when no Chat Model sidecar is attached', async () => {
    const { overrideAiAgent, executeViaLegacyExecutor } = loadSubject();
    const definition = overrideAiAgent(baseDefinition(), { type: 'ai_agent', label: 'AI Agent', category: 'ai', description: 'Agent' } as any);
    await definition.execute(context({
      config: { model: 'gemini-3.1-pro-preview' },
      agentGraph: {
        nodes: [{ id: 'agent-1', type: 'ai_agent', data: { label: 'AI Agent', type: 'ai_agent', category: 'ai', config: {} } }],
        edges: [],
      },
    }));

    const passedContext = (executeViaLegacyExecutor.mock.calls[0][0] as { context: NodeExecutionContext }).context;
    expect(passedContext.config).toMatchObject({ model: 'gemini-3.1-pro-preview' });
    expect(passedContext.config).not.toHaveProperty('apiKey');
  });
});
