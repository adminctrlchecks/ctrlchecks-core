import { describe, expect, it } from 'vitest';
import { NODE_TYPES } from '../nodeTypes';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { BACKEND_SUPPORTED_NODE_OPERATIONS } from '../backendSupportedNodeOperations';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('WhatsApp trigger node catalog', () => {
  it('includes WhatsApp Trigger with real-time webhook fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'whatsapp_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'eventTypes',
      'phoneNumberId',
      'allowedWaIds',
      'verifyToken',
      'validateSignature',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('chatId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('raw');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('whatsapp_trigger')).toBe(true);
    expect(getIntegrationLogo('whatsapp_trigger')).toBe('/integrations-logos/Whatsapp-Cloude.svg');
  });

  it('includes WhatsApp action defaults for replying to the same chat', () => {
    const whatsapp = NODE_TYPES.find((node) => node.type === 'whatsapp');
    expect(whatsapp).toBeTruthy();
    const operationField = whatsapp?.configFields.find((field) => field.key === 'operation');
    expect(operationField?.options?.map((option) => option.value)).toEqual([
      'sendText',
      'sendMedia',
      'sendLocation',
      'sendContact',
      'sendTemplate',
      'sendInteractiveButtons',
      'sendInteractiveList',
      'sendInteractiveCTA',
      'markAsRead',
    ]);
    expect(whatsapp?.configFields.find((field) => field.key === 'to')?.placeholder).toBe('{{$json.chatId}}');
    expect(whatsapp?.configFields.find((field) => field.key === 'text')?.placeholder).toContain('$json.aiResponse');
    expect(BACKEND_SUPPORTED_NODE_OPERATIONS.whatsapp).toContain('sendText');
  });
});
