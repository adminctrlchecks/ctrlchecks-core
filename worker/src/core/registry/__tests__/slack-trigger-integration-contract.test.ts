import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Slack Trigger integration contracts', () => {
  it('registers Slack Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('slack_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('slack');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['slack.receive', 'slack.command', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('slack_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      channelId: { type: 'string' },
      chatId: { type: 'string' },
      threadTs: { type: 'string' },
      messageTs: { type: 'string' },
      command: { type: 'string' },
      responseUrl: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('keeps Slack credential and connector available for trigger and reply nodes', () => {
    const credential = getCredentialType('slack_oauth2');
    expect(credential?.provider).toBe('slack');
    expect(credential?.oauth2?.defaultScopes).toEqual(expect.arrayContaining(['chat:write', 'app_mentions:read', 'commands']));
    expect(credential?.inputFields.map((field) => field.name)).toContain('signingSecret');
    expect(credential?.testRequest?.url).toContain('auth.test');

    const connector = connectorRegistry.getConnector('slack_oauth');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['slack_message', 'slack_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['slack.send', 'slack.receive', 'slack.interaction']));
  });
});
