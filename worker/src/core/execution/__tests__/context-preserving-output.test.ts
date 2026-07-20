import { preserveOutputContextForDownstream } from '../context-preserving-output';

describe('preserveOutputContextForDownstream', () => {
  it('keeps upstream chat context while overlaying current node output', () => {
    const result = preserveOutputContextForDownstream(
      {
        _chat: true,
        sessionId: 'workflow_chat_trigger',
        workflow_id: 'workflow',
        node_id: 'chat_trigger',
        message: 'hello',
      },
      {
        response: 'Hello Shiva',
      }
    );

    expect(result).toEqual({
      _chat: true,
      sessionId: 'workflow_chat_trigger',
      workflow_id: 'workflow',
      node_id: 'chat_trigger',
      message: 'hello',
      response: 'Hello Shiva',
    });
  });

  it('lets the current node output win for ordinary field collisions', () => {
    const result = preserveOutputContextForDownstream(
      {
        sessionId: 'upstream-session',
        status: 200,
        body: { old: true },
      },
      {
        status: 404,
        body: null,
      }
    );

    expect(result).toMatchObject({
      sessionId: 'upstream-session',
      status: 404,
      body: null,
    });
  });

  it('restores important routing keys when the current output has empty placeholders', () => {
    const result = preserveOutputContextForDownstream(
      {
        sessionId: 'real-session',
        workflowId: 'workflow-1',
      },
      {
        sessionId: '',
        response: 'ok',
      }
    );

    expect(result).toMatchObject({
      sessionId: 'real-session',
      workflowId: 'workflow-1',
      response: 'ok',
    });
  });

  it('does not preserve system, routing, or sensitive upstream keys', () => {
    const result = preserveOutputContextForDownstream(
      {
        sessionId: 'safe-session',
        nodeId: 'internal-node-id',
        __routing: { branch: 'try' },
        condition: true,
        apiKey: 'secret',
        Authorization: 'Bearer secret',
        payload: 'keep',
      },
      {
        response: 'ok',
      }
    );

    expect(result).toEqual({
      sessionId: 'safe-session',
      payload: 'keep',
      response: 'ok',
    });
  });

  it('leaves error outputs untouched', () => {
    const output = {
      _error: 'Provider failed',
      _nodeType: 'ai_chat_model',
    };

    expect(
      preserveOutputContextForDownstream({ sessionId: 'chat-session' }, output)
    ).toBe(output);
  });

  it('leaves arrays and primitive outputs untouched for compatibility', () => {
    const arrayOutput = [{ id: 1 }];

    expect(
      preserveOutputContextForDownstream({ sessionId: 'chat-session' }, arrayOutput)
    ).toBe(arrayOutput);
    expect(
      preserveOutputContextForDownstream({ sessionId: 'chat-session' }, 'ok')
    ).toBe('ok');
  });
});
