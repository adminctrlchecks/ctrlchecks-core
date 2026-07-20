import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Discord Trigger integration contracts', () => {
  it('registers Discord Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('discord_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('discord');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['discord.receive', 'discord.command', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('discord_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      channelId: { type: 'string' },
      chatId: { type: 'string' },
      messageId: { type: 'string' },
      command: { type: 'string' },
      interactionToken: { type: 'string' },
      applicationId: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('keeps Discord credential and connector available for trigger and reply nodes', () => {
    const credential = getCredentialType('discord_bot_token');
    expect(credential?.provider).toBe('discord');
    expect(credential?.inputFields.map((field) => field.name)).toEqual(expect.arrayContaining(['token', 'publicKey', 'applicationId']));
    expect(credential?.testRequest?.url).toContain('/users/@me');

    const connector = connectorRegistry.getConnector('discord_bot_token');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['discord', 'discord_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['discord.send', 'discord.receive', 'discord.interaction']));
  });
});
