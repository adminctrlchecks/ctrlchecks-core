import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Stripe Trigger integration contracts', () => {
  it('registers Stripe Trigger as a trigger node with normalized payment output fields', () => {
    const schema = nodeLibrary.getSchema('stripe_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('stripe');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['stripe.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('stripe_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      objectId: { type: 'string' },
      customerId: { type: 'string' },
      paymentIntentId: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('reuses the existing Stripe secret key credential', () => {
    const credential = getCredentialType('stripe_api_key');
    expect(credential?.provider).toBe('stripe');
    expect(credential?.authType).toBe('bearer_token');
    expect(credential?.inputFields.map((field) => field.name)).toEqual(expect.arrayContaining(['token']));
    expect(credential?.maskFields).toEqual(expect.arrayContaining(['token']));

    const connector = connectorRegistry.getConnector('stripe');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['stripe', 'stripe_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['stripe.receive', 'trigger.webhook']));
  });

  it('maps stripe_trigger to the same Stripe credential as the Stripe action node', () => {
    const triggerDef = unifiedNodeRegistry.get('stripe_trigger');
    const actionDef = unifiedNodeRegistry.get('stripe');
    expect(triggerDef).toBeTruthy();
    expect(actionDef).toBeTruthy();
  });

  it('does not collide with the existing Stripe action node', () => {
    const actionDef = unifiedNodeRegistry.get('stripe');
    expect(actionDef?.category).not.toBe('triggers');

    const triggerDef = unifiedNodeRegistry.get('stripe_trigger');
    expect(triggerDef?.category).toBe('triggers');
    expect(triggerDef?.type).toBe('stripe_trigger');
  });
});
