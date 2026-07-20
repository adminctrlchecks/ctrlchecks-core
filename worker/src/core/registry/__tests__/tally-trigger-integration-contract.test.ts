import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Tally Trigger integration contracts', () => {
  it('registers Tally Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('tally_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('tally');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['tally.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('tally_trigger');
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

  it('keeps the Tally credential/connector available for the trigger', () => {
    const credential = getCredentialType('tally_token');
    expect(credential?.provider).toBe('tally');

    const connector = connectorRegistry.getConnector('tally');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['tally_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['tally.receive', 'trigger.webhook']));
  });

  it('does not collide with the existing Tally ERP action node', () => {
    const erpDef = unifiedNodeRegistry.get('tally');
    expect(erpDef?.category).toBe('crm');

    const triggerDef = unifiedNodeRegistry.get('tally_trigger');
    expect(triggerDef?.category).toBe('triggers');
    expect(triggerDef?.type).toBe('tally_trigger');
  });
});
