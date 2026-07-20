import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Typeform Trigger integration contracts', () => {
  it('registers Typeform Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('typeform_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('typeform');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['typeform.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('typeform_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      formId: { type: 'string' },
      responseId: { type: 'string' },
      answers: { type: 'object' },
      raw: { type: 'object' },
    });
  });

  it('keeps the Typeform credential/connector available for the trigger', () => {
    const credential = getCredentialType('typeform_token');
    expect(credential?.provider).toBe('typeform');

    const connector = connectorRegistry.getConnector('typeform');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['typeform_trigger', 'typeform']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['typeform.receive', 'trigger.webhook']));
  });
});
