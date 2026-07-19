import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Gmail trigger node catalog', () => {
  it('includes Gmail Trigger with Pub/Sub watch fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'gmail_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'pubsubTopic',
      'eventTypes',
      'labelIds',
      'query',
      'validateAuth',
      'audience',
      'validationSecret',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('threadId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('subject');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('gmail_trigger')).toBe(true);
    expect(getIntegrationLogo('gmail_trigger')).toBe('/integrations-logos/Gmail.svg');
  });

  it('keeps the Gmail action node available for replies', () => {
    const gmail = NODE_TYPES.find((node) => node.type === 'google_gmail');
    expect(gmail).toBeTruthy();
    expect(gmail?.category).toBe('google');
  });
});
