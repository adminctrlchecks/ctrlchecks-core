import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Trello Trigger integration contracts', () => {
  it('registers Trello Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('trello_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('trello');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['trello.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('trello_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      boardId: { type: 'string' },
      cardId: { type: 'string' },
      commentText: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('reuses the existing Trello API key/token credential and includes the app secret required for webhook signatures', () => {
    const credential = getCredentialType('trello_api_key');
    expect(credential?.provider).toBe('trello');
    expect(credential?.authType).toBe('query_auth');
    expect(credential?.inputFields.map((f) => f.name)).toEqual(expect.arrayContaining(['apiKey', 'token', 'appSecret']));
    expect(credential?.maskFields).toEqual(expect.arrayContaining(['apiKey', 'token', 'appSecret']));

    const connector = connectorRegistry.getConnector('trello');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['trello', 'trello_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['trello.receive', 'trigger.webhook']));
  });

  it('maps trello_trigger to the same trello_api_key credential as the trello action node', () => {
    const triggerDef = unifiedNodeRegistry.get('trello_trigger');
    const actionDef = unifiedNodeRegistry.get('trello');
    expect(triggerDef).toBeTruthy();
    expect(actionDef).toBeTruthy();
  });

  it('does not collide with the existing Trello action node', () => {
    const actionDef = unifiedNodeRegistry.get('trello');
    expect(actionDef?.category).not.toBe('triggers');

    const triggerDef = unifiedNodeRegistry.get('trello_trigger');
    expect(triggerDef?.category).toBe('triggers');
    expect(triggerDef?.type).toBe('trello_trigger');
  });
});
