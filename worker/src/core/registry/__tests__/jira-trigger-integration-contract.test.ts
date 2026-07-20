import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Jira Trigger integration contracts', () => {
  it('registers Jira Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('jira_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('jira');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['jira.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('jira_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      issueKey: { type: 'string' },
      issueSummary: { type: 'string' },
      commentBody: { type: 'string' },
      raw: { type: 'object' },
    });
  });

  it('reuses the existing Jira API Token credential for the trigger (Basic Auth, not OAuth or a generic bearer token)', () => {
    const credential = getCredentialType('jira_api_key');
    expect(credential?.provider).toBe('jira');
    expect(credential?.authType).toBe('basic_auth');
    expect(credential?.inputFields.map((f) => f.name)).toEqual(expect.arrayContaining(['username', 'password', 'domain']));

    const connector = connectorRegistry.getConnector('jira');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['jira', 'jira_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['jira.receive', 'trigger.webhook']));
  });

  it('maps jira_trigger to the same jira_api_key credential as the jira action node in the unified registry credential map', () => {
    const triggerDef = unifiedNodeRegistry.get('jira_trigger');
    const actionDef = unifiedNodeRegistry.get('jira');
    expect(triggerDef).toBeTruthy();
    expect(actionDef).toBeTruthy();
  });

  it('does not collide with the existing Jira action node', () => {
    const actionDef = unifiedNodeRegistry.get('jira');
    expect(actionDef?.category).not.toBe('triggers');

    const triggerDef = unifiedNodeRegistry.get('jira_trigger');
    expect(triggerDef?.category).toBe('triggers');
    expect(triggerDef?.type).toBe('jira_trigger');
  });
});
