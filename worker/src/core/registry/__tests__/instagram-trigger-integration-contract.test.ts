import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';
import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';

describe('Instagram Trigger integration contracts', () => {
  it('registers Instagram Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('instagram_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('instagram');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['instagram.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('instagram_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      chatId: { type: 'string' },
      senderId: { type: 'string' },
      recipientId: { type: 'string' },
      instagramBusinessAccountId: { type: 'string' },
      text: { type: 'string' },
      messageId: { type: 'string' },
      commentId: { type: 'string' },
      mediaId: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('keeps Instagram credential and connector available for trigger and action nodes', () => {
    const credential = getCredentialType('instagram_oauth2');
    expect(credential?.provider).toBe('instagram');
    expect(credential?.requiredScopes).toEqual(expect.arrayContaining(['instagram_manage_messages', 'instagram_manage_comments']));
    expect(credential?.testRequest?.url).toContain('graph.facebook.com');

    const connector = connectorRegistry.getConnector('instagram_oauth');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['instagram', 'instagram_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['instagram.post', 'instagram.receive', 'instagram.comment']));
  });
});
