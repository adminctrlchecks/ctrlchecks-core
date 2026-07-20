import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('GitLab Trigger integration contracts', () => {
  it('registers GitLab Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('gitlab_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('gitlab');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['gitlab.receive', 'trigger.webhook']));

    const def = unifiedNodeRegistry.get('gitlab_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      projectId: { type: 'string' },
      action: { type: 'string' },
      issueIid: { type: 'number' },
      mrIid: { type: 'number' },
      raw: { type: 'object' },
    });
  });

  it('reuses the existing GitLab Personal Access Token credential for the trigger (not a new/parallel credential)', () => {
    const credential = getCredentialType('gitlab_pat');
    expect(credential?.provider).toBe('gitlab');
    expect(credential?.authType).toBe('bearer_token');

    const connector = connectorRegistry.getConnector('gitlab');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['gitlab', 'gitlab_trigger']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['gitlab.receive', 'trigger.webhook']));
  });

  it('does not collide with the existing GitLab action node', () => {
    const actionDef = unifiedNodeRegistry.get('gitlab');
    expect(actionDef?.category).not.toBe('triggers');

    const triggerDef = unifiedNodeRegistry.get('gitlab_trigger');
    expect(triggerDef?.category).toBe('triggers');
    expect(triggerDef?.type).toBe('gitlab_trigger');
  });
});
