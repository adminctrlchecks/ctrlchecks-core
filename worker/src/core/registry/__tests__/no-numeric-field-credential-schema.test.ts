import { unifiedNodeRegistry } from '../unified-node-registry';

/**
 * Regression: the AI Agent's `maxTokens` field (a numeric response-length limit) was
 * classified as a `generic_token`/`bearer_token` credential purely because its name contains
 * "token" (field-help-metadata.ts's naive `f.includes('token')` rule). This made
 * `unifiedNodeRegistry.get('ai_agent').credentialSchema` synthesize a fake "requires
 * bearer_token" requirement — a node that has never needed any credential of its own then
 * failed live execution with "Connection ... is a google_oauth2 credential, but this node
 * requires bearer_token" the moment any stray connectionRef sat on the node.
 *
 * A credential (API key, bearer token, secret, password) is always textual. This test locks
 * in, across the ENTIRE live registry (not just ai_agent), that no number/boolean-typed field
 * is ever classified as credential-owned — so this class of bug cannot silently reappear for
 * any current or future node.
 */
describe('registry-wide: no numeric/boolean field is ever credential-owned', () => {
  it('ai_agent has no credentialSchema at all (it never needs its own connection)', () => {
    const definition = unifiedNodeRegistry.get('ai_agent');
    expect(definition).toBeDefined();
    expect(definition!.credentialSchema).toBeUndefined();
  });

  it('finds zero number/boolean credential-owned fields across every registered node type', () => {
    const offenders: string[] = [];
    for (const nodeType of unifiedNodeRegistry.getAllTypes()) {
      const definition = unifiedNodeRegistry.get(nodeType);
      for (const fieldName of definition?.credentialSchema?.credentialFields || []) {
        const field = definition?.inputSchema?.[fieldName];
        if (field && (field.type === 'number' || field.type === 'boolean')) {
          offenders.push(`${nodeType}.${fieldName} (type=${field.type})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('preserves the real, legitimate credential requirement for LLM provider nodes that also have maxTokens', () => {
    for (const nodeType of ['cohere', 'huggingface', 'mistral']) {
      const definition = unifiedNodeRegistry.get(nodeType);
      const credentialFields = definition?.credentialSchema?.credentialFields || [];
      // The real apiKey requirement must survive; only the maxTokens false positive is removed.
      expect(credentialFields).toContain('apiKey');
      expect(credentialFields).not.toContain('maxTokens');
    }
  });
});
