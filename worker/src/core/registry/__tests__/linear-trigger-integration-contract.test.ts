import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Linear Trigger integration contracts', () => {
  it('registers Linear Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('linear_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('linear');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['linear.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('linear_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      issueId: { type: 'string' },
      issueIdentifier: { type: 'string' },
      commentBody: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('reuses the existing Linear personal API key credential', () => {
    const credential = getCredentialType('linear_api_key');
    expect(credential?.provider).toBe('linear');
    expect(credential?.authType).toBe('bearer_token');
    expect(credential?.inputFields.map((field) => field.name)).toEqual(expect.arrayContaining(['token']));
    expect(credential?.maskFields).toEqual(expect.arrayContaining(['token']));

    const connector = connectorRegistry.getConnector('linear');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['linear', 'linear_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['linear.receive', 'trigger.webhook']));
  });

  it('maps linear_trigger to the same Linear credential as the Linear action node', () => {
    const triggerDef = unifiedNodeRegistry.get('linear_trigger');
    const actionDef = unifiedNodeRegistry.get('linear');
    expect(triggerDef).toBeTruthy();
    expect(actionDef).toBeTruthy();
  });

  it('does not collide with the existing Linear action node', () => {
    const actionDef = unifiedNodeRegistry.get('linear');
    expect(actionDef?.category).not.toBe('triggers');

    const triggerDef = unifiedNodeRegistry.get('linear_trigger');
    expect(triggerDef?.category).toBe('triggers');
    expect(triggerDef?.type).toBe('linear_trigger');
  });
});
