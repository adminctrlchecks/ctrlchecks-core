import { describe, expect, it } from 'vitest';
import { NODE_TYPES } from '../nodeTypes';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { BACKEND_SUPPORTED_NODE_OPERATIONS } from '../backendSupportedNodeOperations';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Telegram node catalog', () => {
  it('includes Telegram Trigger with chatbot-friendly fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'telegram_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'updateTypes',
      'allowedChatIds',
      'commandFilter',
      'secretToken',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('chatId');
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('raw');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('telegram_trigger')).toBe(true);
    expect(getIntegrationLogo('telegram_trigger')).toBe('/integrations-logos/Telegram.svg');
  });

  it('includes Telegram action operations and reply placeholders', () => {
    const telegram = NODE_TYPES.find((node) => node.type === 'telegram');
    expect(telegram).toBeTruthy();
    const operationField = telegram?.configFields.find((field) => field.key === 'operation');
    expect(operationField?.options?.map((option) => option.value)).toEqual(['send_message', 'send_photo', 'edit_message']);
    expect(telegram?.configFields.find((field) => field.key === 'chatId')?.placeholder).toBe('{{$json.chatId}}');
    expect(telegram?.configFields.find((field) => field.key === 'message')?.placeholder).toContain('$json.aiResponse');
    expect(BACKEND_SUPPORTED_NODE_OPERATIONS.telegram).toEqual(['send_message', 'send_photo', 'edit_message']);
  });
});
