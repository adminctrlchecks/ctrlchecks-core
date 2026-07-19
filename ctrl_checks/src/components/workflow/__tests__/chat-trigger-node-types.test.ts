import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';

describe('Chat trigger node catalog', () => {
  it('keeps Chat Trigger as a zero-config visual trigger with runtime output guidance', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'chat_trigger');

    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.defaultConfig).toEqual({});
    expect(trigger?.configFields).toEqual([]);
    expect(trigger?.usageGuide?.inputs.join(' ')).toContain('No setup fields');
    expect(trigger?.usageGuide?.inputs.join(' ')).toContain('not enforced as visual filters');
    expect(trigger?.usageGuide?.outputs).toEqual([
      'message',
      'channel',
      'sessionId',
      'trigger',
      'node_id',
      'workflow_id',
      'timestamp',
      '_chat',
    ]);
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('chat_trigger')).toBe(true);
  });

  it('keeps Chat Send available for replying to the same chat session', () => {
    const chatSend = NODE_TYPES.find((node) => node.type === 'chat_send');

    expect(chatSend).toBeTruthy();
    expect(chatSend?.category).toBe('output');
    expect(chatSend?.configFields.map((field) => field.key)).toContain('message');
    expect(chatSend?.configFields.map((field) => field.key)).toContain('sessionId');
  });
});
