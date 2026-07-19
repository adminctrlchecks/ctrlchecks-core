import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Slack trigger node catalog', () => {
  it('includes Slack Trigger with real-time Slack webhook fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'slack_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'eventTypes',
      'channelIds',
      'allowedUserIds',
      'commandFilter',
      'teamId',
      'signingSecret',
      'validateSignature',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('threadTs');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('responseUrl');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('slack_trigger')).toBe(true);
    expect(getIntegrationLogo('slack_trigger')).toBe('/integrations-logos/Slack.svg');
  });

  it('keeps Slack action fields available for same-channel thread replies', () => {
    const slack = NODE_TYPES.find((node) => node.type === 'slack_message');
    expect(slack).toBeTruthy();
    expect(slack?.defaultConfig.channel).toBe('{{$json.channelId}}');
    expect(slack?.configFields.some((field) => field.key === 'threadTs')).toBe(true);
    expect(slack?.configFields.find((field) => field.key === 'channel')?.placeholder).toBe('{{$json.channelId}}');
    expect(slack?.configFields.find((field) => field.key === 'threadTs')?.placeholder).toBe('{{$json.threadTs}}');
  });
});
