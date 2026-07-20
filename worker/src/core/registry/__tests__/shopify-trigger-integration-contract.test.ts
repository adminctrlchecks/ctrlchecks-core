import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Shopify Trigger integration contracts', () => {
  it('registers Shopify Trigger as a trigger node with normalized commerce output fields', () => {
    const schema = nodeLibrary.getSchema('shopify_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('shopify');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['shopify.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('shopify_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      topic: { type: 'string' },
      orderId: { type: 'string' },
      customerId: { type: 'string' },
      productId: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('reuses the existing Shopify Admin API credential with masked token and webhook secret fields', () => {
    const credential = getCredentialType('shopify_api_key');
    expect(credential?.provider).toBe('shopify');
    expect(credential?.authType).toBe('bearer_token');
    expect(credential?.inputFields.map((field) => field.name)).toEqual(expect.arrayContaining(['storeUrl', 'token', 'clientSecret']));
    expect(credential?.maskFields).toEqual(expect.arrayContaining(['token', 'clientSecret']));

    const connector = connectorRegistry.getConnector('shopify');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['shopify', 'shopify_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['shopify.receive', 'trigger.webhook']));
  });

  it('maps shopify_trigger to the same Shopify credential as the Shopify action node', () => {
    const triggerDef = unifiedNodeRegistry.get('shopify_trigger');
    const actionDef = unifiedNodeRegistry.get('shopify');
    expect(triggerDef).toBeTruthy();
    expect(actionDef).toBeTruthy();
  });

  it('does not collide with the existing Shopify action node', () => {
    const actionDef = unifiedNodeRegistry.get('shopify');
    expect(actionDef?.category).not.toBe('triggers');

    const triggerDef = unifiedNodeRegistry.get('shopify_trigger');
    expect(triggerDef?.category).toBe('triggers');
    expect(triggerDef?.type).toBe('shopify_trigger');
  });
});
