import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Facebook Trigger integration contracts', () => {
  it('registers Facebook Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('facebook_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('facebook');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['facebook.receive', 'messenger.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('facebook_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      chatId: { type: 'string' },
      senderId: { type: 'string' },
      recipientId: { type: 'string' },
      pageId: { type: 'string' },
      text: { type: 'string' },
      messageId: { type: 'string' },
      commentId: { type: 'string' },
      postId: { type: 'string' },
      leadgenId: { type: 'string' },
      formId: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('keeps Facebook credential and connector available for trigger and reply nodes', () => {
    const credential = getCredentialType('facebook_oauth2');
    expect(credential?.provider).toBe('facebook');
    expect(credential?.requiredScopes).toEqual(expect.arrayContaining(['pages_messaging', 'pages_manage_metadata', 'leads_retrieval']));
    expect(credential?.testRequest?.url).toContain('/me/accounts');

    const connector = connectorRegistry.getConnector('facebook_oauth');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['facebook', 'facebook_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['facebook.receive', 'messenger.receive', 'messenger.send']));
  });
});
