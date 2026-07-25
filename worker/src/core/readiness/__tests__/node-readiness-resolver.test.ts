import { unifiedNodeRegistry } from '../../registry/unified-node-registry';
import { getOperationContractsForNode } from '../../operations/operation-contract-resolver';
import {
  buildCredentialReadinessIssues,
  buildNodeInputReadinessIssues,
  buildReadinessDetails,
  buildWorkflowReadinessIssues,
  readinessErrorCode,
} from '../node-readiness-resolver';

function node(overrides: Record<string, unknown> = {}) {
  return {
    id: 'supabase-1',
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      type: 'supabase',
      label: 'Supabase',
      category: 'database',
      config: {
        operation: 'insert',
        table: 'users',
        ...overrides,
      },
    },
  } as any;
}

describe('node readiness resolver', () => {
  it('reports Supabase Insert missing data as a missing input with no credential issue', () => {
    const issues = buildWorkflowReadinessIssues({
      nodes: [node()],
      credentials: [],
    });
    const details = buildReadinessDetails(issues);

    expect(readinessErrorCode(details.readinessIssues)).toBe('EXECUTION_MISSING_INPUTS');
    expect(details.missingCredentials).toHaveLength(0);
    expect(details.missingInputs).toHaveLength(1);
    expect(details.missingInputs[0]).toMatchObject({
      kind: 'missing_input',
      nodeId: 'supabase-1',
      nodeType: 'supabase',
      nodeLabel: 'Supabase',
      operation: 'insert',
      operationLabel: 'Insert',
      fieldKey: 'data',
      fieldLabel: 'Data',
    });
  });

  it('reports the same Supabase field for single-node debug readiness', () => {
    const issues = buildNodeInputReadinessIssues({ node: node() });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      kind: 'missing_input',
      nodeId: 'supabase-1',
      fieldKey: 'data',
      operation: 'insert',
    });
  });

  it('reports missing credentials only when a required credential is unsatisfied', () => {
    const issues = buildCredentialReadinessIssues({
      nodes: [node({ data: { email: 'a@example.com' } })],
      credentials: [{
        provider: 'supabase',
        type: 'api_key',
        vaultKey: 'supabase',
        displayName: 'Supabase',
        required: true,
        satisfied: false,
        nodeIds: ['supabase-1'],
      }],
    });

    expect(readinessErrorCode(issues)).toBe('EXECUTION_MISSING_CREDENTIALS');
    expect(issues[0]).toMatchObject({
      kind: 'missing_credential',
      nodeId: 'supabase-1',
      provider: 'supabase',
    });
  });

  it('reports both credential and input issues when both are missing', () => {
    const issues = buildWorkflowReadinessIssues({
      nodes: [node()],
      credentials: [{
        provider: 'supabase',
        type: 'api_key',
        vaultKey: 'supabase',
        displayName: 'Supabase',
        required: true,
        satisfied: false,
        nodeIds: ['supabase-1'],
      }],
    });

    expect(readinessErrorCode(issues)).toBe('EXECUTION_NOT_READY');
    expect(issues.some((issue) => issue.kind === 'missing_input' && issue.fieldKey === 'data')).toBe(true);
    expect(issues.some((issue) => issue.kind === 'missing_credential')).toBe(true);
  });

  it('reports invalid required input values with the same structured contract', () => {
    const issues = buildNodeInputReadinessIssues({
      node: node({ data: 'not-json' }),
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      kind: 'invalid_input',
      fieldKey: 'data',
      fieldType: 'object',
    });
  });
});

describe('all node operation readiness audit', () => {
  it('resolves every operation required field to a frontend field key and help text', () => {
    const failures: string[] = [];

    for (const nodeType of unifiedNodeRegistry.getAllTypes()) {
      const def = unifiedNodeRegistry.get(nodeType);
      if (!def) continue;

      for (const contract of getOperationContractsForNode(def)) {
        for (const fieldKey of contract.requiredFields) {
          const field = def.inputSchema[fieldKey];
          if (!field) {
            failures.push(`${nodeType}.${contract.operation}: missing inputSchema field "${fieldKey}"`);
            continue;
          }
          if (!field.description || !field.description.trim()) {
            failures.push(`${nodeType}.${contract.operation}.${fieldKey}: missing field description`);
          }
        }

        const nonSelectorRequired = contract.requiredFields.find((fieldKey) =>
          fieldKey !== 'operation' &&
          fieldKey !== 'resource' &&
          def.inputSchema[fieldKey]?.ownership !== 'credential'
        );
        if (!nonSelectorRequired) continue;

        const testNode = {
          id: `${nodeType}-audit`,
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            type: nodeType,
            label: def.label,
            category: def.category,
            config: {
              operation: contract.operation,
              ...(contract.resource ? { resource: contract.resource } : {}),
            },
          },
        } as any;
        const fillModes = contract.requiredFields.reduce((acc, fieldKey) => {
          acc[fieldKey] = 'manual_static';
          return acc;
        }, {} as Record<string, 'manual_static'>);
        const issue = buildNodeInputReadinessIssues({ node: testNode, fillModes })
          .find((candidate) => candidate.fieldKey === nonSelectorRequired);
        if (!issue) {
          failures.push(`${nodeType}.${contract.operation}.${nonSelectorRequired}: readiness issue not produced`);
          continue;
        }
        if (issue.fieldKey !== nonSelectorRequired || !def.inputSchema[issue.fieldKey]) {
          failures.push(`${nodeType}.${contract.operation}.${nonSelectorRequired}: unresolved frontend field key`);
        }
        if (!issue.fieldLabel || !issue.helpText) {
          failures.push(`${nodeType}.${contract.operation}.${nonSelectorRequired}: missing label/help text`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
