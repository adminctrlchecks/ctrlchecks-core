import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Microsoft Teams Trigger integration contracts', () => {
  it('registers Microsoft Teams Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('microsoft_teams_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('microsoft_teams');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['teams.receive', 'teams.reply', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('microsoft_teams_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      text: { type: 'string' },
      tenantId: { type: 'string' },
      teamId: { type: 'string' },
      channelId: { type: 'string' },
      conversationId: { type: 'string' },
      serviceUrl: { type: 'string' },
      replyToId: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('keeps Microsoft Teams bot credential and connector available for trigger and replies', () => {
    const credential = getCredentialType('microsoft_teams_bot');
    expect(credential?.provider).toBe('microsoft_teams');
    expect(credential?.inputFields.map((field) => field.name)).toEqual(expect.arrayContaining(['appId', 'appPassword', 'validationSecret']));

    const connector = connectorRegistry.getConnector('microsoft_teams_bot');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['microsoft_teams_trigger', 'microsoft_teams']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['teams.receive', 'teams.reply', 'trigger.webhook']));
  });
});
