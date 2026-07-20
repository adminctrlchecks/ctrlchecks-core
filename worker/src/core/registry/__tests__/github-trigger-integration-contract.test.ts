import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('GitHub Trigger integration contracts', () => {
  it('registers GitHub Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('github_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('github');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['github.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('github_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      repository: { type: 'string' },
      action: { type: 'string' },
      issueNumber: { type: 'number' },
      prNumber: { type: 'number' },
      raw: { type: 'object' },
    });
  });

  it('reuses the existing GitHub Personal Access Token credential for the trigger', () => {
    const credential = getCredentialType('github_pat');
    expect(credential?.provider).toBe('github');

    const connector = connectorRegistry.getConnector('github_oauth');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['github', 'github_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['github.receive', 'trigger.webhook']));
  });

  it('does not collide with the existing GitHub action node', () => {
    const actionDef = unifiedNodeRegistry.get('github');
    expect(actionDef?.category).not.toBe('triggers');

    const triggerDef = unifiedNodeRegistry.get('github_trigger');
    expect(triggerDef?.category).toBe('triggers');
    expect(triggerDef?.type).toBe('github_trigger');
  });
});
