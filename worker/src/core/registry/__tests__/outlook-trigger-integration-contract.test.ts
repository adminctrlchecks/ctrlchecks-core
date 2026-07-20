import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Outlook Trigger integration contracts', () => {
  it('registers Outlook Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('outlook_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('outlook');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['outlook.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('outlook_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      subject: { type: 'string' },
      from: { type: 'string' },
      conversationId: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('keeps the Microsoft OAuth connector available for the Outlook trigger', () => {
    const connector = connectorRegistry.getConnector('outlook_oauth');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['outlook_trigger', 'outlook']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['outlook.receive', 'trigger.webhook']));
    expect(connector?.credentialContract.scopes).toEqual(expect.arrayContaining([
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Calendars.Read',
    ]));
  });
});
