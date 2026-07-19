import { describe, expect, it } from 'vitest';
import { NODE_TYPES } from '../nodeTypes';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { BACKEND_SUPPORTED_NODE_OPERATIONS } from '../backendSupportedNodeOperations';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Instagram trigger node catalog', () => {
  it('includes Instagram Trigger with real-time Meta webhook fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'instagram_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'eventTypes',
      'instagramBusinessAccountId',
      'allowedSenderIds',
      'verifyToken',
      'validateSignature',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('senderId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('commentId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('raw');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('instagram_trigger')).toBe(true);
    expect(getIntegrationLogo('instagram_trigger')).toBe('/integrations-logos/Instagram.svg');
  });

  it('keeps Instagram action fields available for replies and comment routing', () => {
    const instagram = NODE_TYPES.find((node) => node.type === 'instagram');
    expect(instagram).toBeTruthy();
    expect(BACKEND_SUPPORTED_NODE_OPERATIONS.instagram).toEqual(expect.arrayContaining(['sendText', 'reply', 'replyDM']));
    expect(instagram?.configFields.some((field) => field.key === 'recipientId')).toBe(true);
    expect(instagram?.configFields.some((field) => field.key === 'commentId')).toBe(true);
  });
});
