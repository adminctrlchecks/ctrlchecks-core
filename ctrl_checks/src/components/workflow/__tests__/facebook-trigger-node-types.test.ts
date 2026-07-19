import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Facebook trigger node catalog', () => {
  it('includes Facebook Trigger with real-time Meta webhook fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'facebook_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'eventTypes',
      'pageId',
      'allowedSenderIds',
      'verifyToken',
      'validateSignature',
    ]);
    expect(trigger?.configFields.find((field) => field.key === 'verifyToken')?.type).toBe('text');
    const outputGuide = trigger?.usageGuide?.outputs.join(' ') || '';
    expect(outputGuide).toContain('eventType');
    expect(outputGuide).toContain('senderId');
    expect(outputGuide).toContain('commentId');
    expect(outputGuide).toContain('leadgenId');
    expect(outputGuide).toContain('sessionId');
    expect(outputGuide).toContain('_facebook');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('facebook_trigger')).toBe(true);
    expect(getIntegrationLogo('facebook_trigger')).toBe('/integrations-logos/facebook.svg');
  });

  it('keeps Facebook action fields available for Messenger and comment replies', () => {
    const facebook = NODE_TYPES.find((node) => node.type === 'facebook');
    expect(facebook).toBeTruthy();
    expect(facebook?.configFields.some((field) => field.key === 'recipientId')).toBe(true);
    expect(facebook?.configFields.some((field) => field.key === 'text')).toBe(true);
    expect(facebook?.configFields.some((field) => field.key === 'commentId')).toBe(true);
    expect(facebook?.configFields.some((field) => field.key === 'replyText')).toBe(true);
    const operation = facebook?.configFields.find((field) => field.key === 'operation');
    expect(operation?.options?.map((option) => option.value)).toEqual(expect.arrayContaining(['sendTextMessage', 'createComment']));
  });
});
