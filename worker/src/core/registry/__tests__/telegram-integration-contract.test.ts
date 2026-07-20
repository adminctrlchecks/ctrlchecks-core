import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';
import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';

describe('Telegram integration contracts', () => {
  it('registers Telegram Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('telegram_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('telegram');

    const def = unifiedNodeRegistry.get('telegram_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      chatId: { type: 'string' },
      messageId: { type: 'number' },
      text: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('declares Telegram action operations and required fields', () => {
    const schema = nodeLibrary.getSchema('telegram');
    const operations = new Map(schema?.operationContracts?.map((contract) => [contract.operation, contract]));

    expect(operations.get('send_message')?.requiredFields).toEqual(['chatId', 'message']);
    expect(operations.get('send_photo')?.requiredFields).toEqual(['chatId', 'mediaUrl']);
    expect(operations.get('edit_message')?.requiredFields).toEqual(['chatId', 'editMessageId', 'message']);
    expect(operations.get('send_message')?.outputFields).toEqual(['success', 'operation', 'chatId', 'messageId', 'data', 'raw']);
  });

  it('keeps Telegram Bot Token credential and connector available for trigger and action nodes', () => {
    const credential = getCredentialType('telegram_bot_token');
    expect(credential?.provider).toBe('telegram');
    expect(credential?.testRequest?.url).toBe('https://api.telegram.org/bot{{apiKey}}/getMe');

    const connector = connectorRegistry.getConnector('telegram_bot');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['telegram', 'telegram_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['telegram.send', 'telegram.receive']));
  });
});
