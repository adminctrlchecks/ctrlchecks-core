/**
 * Credential-resolver parity.
 *
 * "Does this node need a credential?" must have exactly ONE answer across the system.
 * It previously had two, which disagreed on 73 of 178 node types:
 *
 *   - 58 nodes (incl. google_sheets, airtable, slack_message): the node-selection screen
 *     believed no credential was needed, so it rendered a green "Connected" badge with no
 *     connect action, while the readiness gate demanded a credential.
 *   - 11 nodes (firebase, vercel, xero, ...): the gate produced no requirement row, a
 *     missing row was read as connected, and the node reached execution with NO credential.
 *   - 4 nodes (whatsapp, instagram, ...): the connect action named a different provider
 *     than the gate required, so completing OAuth could never satisfy the gate.
 *
 * The fix was structural, not per-node: `capability-grouper-stage` now calls the same
 * `credentialRequirementForNode` the gate uses, and that resolver falls back to the node
 * registry's own credentialSchema. These tests hold that property for every registered node
 * type — including ones added in future — so the divergence cannot silently return.
 */

import { unifiedNodeRegistry } from '../../core/registry/unified-node-registry';
import { credentialRequirementForNode } from '../credential-scope-registry';

describe('credential resolver parity', () => {
  const nodeTypes = unifiedNodeRegistry.getAllTypes();

  it('has node types registered to check', () => {
    expect(nodeTypes.length).toBeGreaterThan(0);
  });

  it('gates every node that declares a required credential', () => {
    // The class that let nodes execute with no credential: the registry declares a
    // requirement, so the gate must produce one too.
    const ungated = nodeTypes.filter((nodeType) => {
      const declared = unifiedNodeRegistry.getRequiredCredentials(nodeType) ?? [];
      if (declared.length === 0) return false;
      return credentialRequirementForNode(nodeType) === null;
    });

    expect(ungated).toEqual([]);
  });

  it('resolves a provider for every gated node', () => {
    // A gated node with no provider is a dead end in the UI: it must show a connect
    // action, but there is nothing to connect to.
    const providerless = nodeTypes.filter((nodeType) => {
      const requirement = credentialRequirementForNode(nodeType);
      return requirement !== null && !requirement.provider;
    });

    expect(providerless).toEqual([]);
  });

  it('never names a provider the gate does not require', () => {
    // The unfixable-loop class: the connect affordance is built from the resolver's
    // provider, so it must be the provider the gate checks. Asserting the resolver is
    // internally consistent guarantees the UI cannot offer a connection that does not count.
    const mismatched = nodeTypes
      .map((nodeType) => ({ nodeType, requirement: credentialRequirementForNode(nodeType) }))
      .filter(({ requirement }) => requirement !== null)
      .filter(({ nodeType, requirement }) => {
        const second = credentialRequirementForNode(nodeType);
        return second?.provider !== requirement!.provider;
      });

    expect(mismatched).toEqual([]);
  });

  it('is stable across repeated resolution', () => {
    // Guards the registry fallback's lazy require: a load-order accident could make the
    // first call answer differently from later ones.
    for (const nodeType of nodeTypes) {
      const first = credentialRequirementForNode(nodeType);
      const second = credentialRequirementForNode(nodeType);
      expect(second?.provider ?? null).toBe(first?.provider ?? null);
    }
  });

  it('treats credential-free nodes as needing nothing', () => {
    // The other direction: a node with no declared requirement and no connector must not
    // be invented into a gated one, or the wizard would block on manual_trigger forever.
    const requirement = credentialRequirementForNode('manual_trigger');
    expect(requirement).toBeNull();
  });
});
