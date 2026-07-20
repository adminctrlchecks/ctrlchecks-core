import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Gmail Trigger integration contracts', () => {
  it('registers Gmail Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('gmail_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('gmail');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['gmail.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('gmail_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      emailAddress: { type: 'string' },
      messageId: { type: 'string' },
      threadId: { type: 'string' },
      subject: { type: 'string' },
      from: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('keeps the Google OAuth connector available for the Gmail trigger', () => {
    const connector = connectorRegistry.getConnector('google_gmail');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['gmail_trigger', 'google_gmail']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['gmail.receive', 'trigger.webhook']));
  });
});
