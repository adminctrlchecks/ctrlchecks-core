import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';

describe('Error trigger node catalog', () => {
  it('keeps Error Trigger as a zero-config sidecar trigger with runtime output guidance', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'error_trigger');

    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.defaultConfig).toEqual({});
    expect(trigger?.configFields).toEqual([]);
    expect(trigger?.usageGuide?.inputs.join(' ')).toContain('No setup fields');
    expect(trigger?.usageGuide?.overview).toContain('failure handler');
    expect(trigger?.usageGuide?.outputs).toEqual([
      'failed_node',
      'error_message',
      'error_type',
      'error_stack',
      'node_output',
    ]);
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('error_trigger')).toBe(true);
  });

  it('keeps common alert and log nodes available after Error Trigger', () => {
    const logOutput = NODE_TYPES.find((node) => node.type === 'log_output');
    const slackMessage = NODE_TYPES.find((node) => node.type === 'slack_message');

    expect(logOutput).toBeTruthy();
    expect(logOutput?.category).toBe('output');
    expect(slackMessage).toBeTruthy();
    expect(slackMessage?.category).toBe('output');
  });
});
