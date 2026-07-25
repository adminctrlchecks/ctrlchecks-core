import * as fs from 'fs';
import * as path from 'path';
import { getConnectionCatalog } from '../../../api/connections-catalog';
import { connectorRegistry } from '../../connectors/connector-registry';
import { CredentialResolver } from '../credential-resolver';
import { nodeLibrary } from '../../nodes/node-library';
import { getCredentialType } from '../../../credentials-system/credential-type-registry';
import { unifiedNodeRegistry } from '../../../core/registry/unified-node-registry';

const WORKER_SRC = path.resolve(__dirname, '../../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(WORKER_SRC, relPath), 'utf-8');
}

describe('connection runtime alignment', () => {
  it('has no two connectors claiming the same node type', () => {
    // getConnectorByNodeType() resolves by Map insertion order, so an overlap
    // silently makes one connector shadow another for every runtime credential
    // lookup instead of surfacing as an error (e.g. a generic 'database_connection'
    // catch-all previously shadowed the dedicated postgresql/mysql/mongodb/db connectors).
    const owner = new Map<string, string>();
    const collisions: string[] = [];

    for (const connector of connectorRegistry.getAllConnectors()) {
      for (const nodeType of connector.nodeTypes) {
        const existingOwnerId = owner.get(nodeType);
        if (existingOwnerId && existingOwnerId !== connector.id) {
          collisions.push(`'${nodeType}' claimed by both '${existingOwnerId}' and '${connector.id}'`);
        } else {
          owner.set(nodeType, connector.id);
        }
      }
    }

    expect(collisions).toEqual([]);
  });

  it('maps every connector node type to exactly one catalog entry by vaultKey', () => {
    const catalog = getConnectionCatalog();
    const catalogByVaultKey = new Map(catalog.map((entry) => [entry.vaultKey, entry]));

    for (const connector of connectorRegistry.getAllConnectors()) {
      const entry = catalogByVaultKey.get(connector.credentialContract.vaultKey);
      expect(entry).toBeDefined();
      for (const nodeType of connector.nodeTypes) {
        expect(entry?.nodeTypes).toContain(nodeType);
      }
    }
  });

  it('credential resolver reads contracts from ConnectorRegistry with the same vaultKey', () => {
    const resolver = new CredentialResolver(nodeLibrary);

    for (const connector of connectorRegistry.getAllConnectors()) {
      for (const nodeType of connector.nodeTypes) {
        const contracts = resolver.getCredentialContracts(nodeType);
        expect(contracts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              provider: connector.credentialContract.provider,
              type: connector.credentialContract.type,
              vaultKey: connector.credentialContract.vaultKey,
            }),
          ])
        );
      }
    }
  });

  it('all connector credential contracts resolve to known credential schemas', () => {
    const missing: string[] = [];
    const credentialTypeAliases: Record<string, string[]> = {
      aws: ['aws_s3_api_key'],
      bitbucket: ['bitbucket_app_password'],
      oracle_database: ['oracle_connection'],
      intuit: ['intuit_smes_connection'],
    };

    for (const connector of connectorRegistry.getAllConnectors()) {
      if (connector.nodeTypes.length === 0) continue;
      if (!connector.credentialContract.required) continue;
      const expectedTypeIds = [
        connector.credentialContract.vaultKey,
        ...(credentialTypeAliases[connector.credentialContract.vaultKey] || []),
        `${connector.credentialContract.vaultKey}_oauth2`,
        `${connector.credentialContract.vaultKey}_api_key`,
        `${connector.credentialContract.vaultKey}_api_token`,
        `${connector.credentialContract.vaultKey}_bot_token`,
        `${connector.credentialContract.vaultKey}_webhook`,
        `${connector.credentialContract.vaultKey}_token`,
        `${connector.credentialContract.vaultKey}_personal_access_token`,
        `${connector.credentialContract.vaultKey}_pat`,
        `${connector.credentialContract.vaultKey}_api`,
        `${connector.credentialContract.vaultKey}_credentials`,
        `${connector.credentialContract.vaultKey}_connection`,
      ];
      if (!expectedTypeIds.some((id) => getCredentialType(id))) {
        missing.push(`${connector.id}:${connector.credentialContract.vaultKey}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('unified node credential requirements reference known credential schemas', () => {
    const missing: string[] = [];

    for (const connector of connectorRegistry.getAllConnectors()) {
      for (const nodeType of connector.nodeTypes) {
        const definition = unifiedNodeRegistry.get(nodeType);
        for (const requirement of definition?.credentialSchema?.requirements || []) {
          const ids = [requirement.credentialTypeId, ...(requirement.credentialTypeIds || [])]
            .filter((id): id is string => typeof id === 'string' && id.length > 0);
          for (const id of ids) {
            if (!getCredentialType(id)) missing.push(`${nodeType}:${id}`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('manual credential catalog entries expose fields for non-dashboard OAuth contracts', () => {
    const catalog = getConnectionCatalog();
    const entriesByVaultKey = new Map(catalog.map((entry) => [entry.vaultKey, entry]));

    for (const connector of connectorRegistry.getAllConnectors()) {
      const entry = entriesByVaultKey.get(connector.credentialContract.vaultKey);
      expect(entry).toBeDefined();

      if (!entry?.oauthImplemented && connector.credentialContract.required) {
        expect(entry?.credentialFields.length).toBeGreaterThan(0);
      }
    }
  });

  it('runtime-sensitive generation paths do not use legacy credential systems', () => {
    const generationFiles = [
      'api/attach-inputs.ts',
      'api/attach-credentials.ts',
      'services/workflow-lifecycle-manager.ts',
      'services/ai/credential-discovery-phase.ts',
      'services/ai/credential-resolver.ts',
      'services/ai/tool-substitution-engine.ts',
      'services/ai/pipeline/workflow-generation-pipeline.ts',
      'services/ai/pipeline/backend-finalizer.ts',
    ];

    for (const file of generationFiles) {
      const source = read(file);
      expect(source).not.toContain(".from('credentials')");
      expect(source).not.toContain('.from("credentials")');
      expect(source).not.toMatch(/handled via navbar|navbar credentials|navbar button|integrated with Supabase/i);
    }
  });

  it('attach-inputs injects satisfied OAuth refs using vaultKey rather than scope-derived ids', () => {
    const source = read('api/attach-inputs.ts');
    expect(source).toContain('satisfiedCred.vaultKey');
    expect(source).not.toContain('`${satisfiedCred.provider}_${satisfiedCred.type}_${scopeSignature}`');
  });

  it('runtime injection keeps Supabase connection field aliases aligned', () => {
    const dynamicExecutor = read('core/execution/dynamic-node-executor.ts');
    const executeWorkflow = read('api/execute-workflow.ts');

    expect(dynamicExecutor).toContain("['projectUrl', 'url']");
    expect(dynamicExecutor).toContain("['token', 'serviceRoleKey']");
    expect(executeWorkflow).toContain("['projectUrl', 'url']");
    expect(executeWorkflow).toContain("['token', 'serviceRoleKey']");
  });
});
