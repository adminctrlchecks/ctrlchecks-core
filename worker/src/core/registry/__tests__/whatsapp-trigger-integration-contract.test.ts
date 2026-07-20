import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';
import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';

describe('WhatsApp Trigger integration contracts', () => {
  it('registers WhatsApp Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('whatsapp_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('whatsapp');

    const def = unifiedNodeRegistry.get('whatsapp_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      chatId: { type: 'string' },
      from: { type: 'string' },
      waId: { type: 'string' },
      text: { type: 'string' },
      messageId: { type: 'string' },
      phoneNumberId: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('keeps WhatsApp credential and connector available for trigger and action nodes', () => {
    const credential = getCredentialType('whatsapp_api_key');
    expect(credential?.provider).toBe('whatsapp');
    expect(credential?.testRequest?.url).toContain('{{phoneNumberId}}');

    const connector = connectorRegistry.getConnector('whatsapp_cloud');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['whatsapp', 'whatsapp_cloud', 'whatsapp_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['whatsapp.send', 'whatsapp.receive']));
  });
});
