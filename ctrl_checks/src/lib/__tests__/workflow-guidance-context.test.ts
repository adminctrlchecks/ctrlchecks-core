import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/nodeSchemaService', () => ({
  nodeSchemaService: {
    fetchAllSchemas: vi.fn(),
  },
}));

import { nodeSchemaService, type NodeDefinition } from '@/services/nodeSchemaService';
import { buildWorkflowGuidanceContext } from '../workflow-guidance-context';

function makeSchema(): NodeDefinition {
  return {
    type: 'if_else',
    label: 'If/Else',
    category: 'logic',
    description: 'Branch on a condition',
    inputSchema: {
      // A real, user-owned value field that is required and empty — must be reported.
      compareValue: {
        type: 'string',
        description: 'Value to compare',
        required: true,
        ownership: 'value',
      },
      // A structural field (build-time owned, e.g. branch conditions) that is required
      // and empty — must NOT be reported as a missing user input, matching the backend's
      // discoverNodeInputs / isStructuralOwnership contract.
      conditions: {
        type: 'array',
        description: 'Branch conditions',
        required: true,
        ownership: 'structural',
      },
      // A credential field — already covered before this fix, kept for parity.
      apiKey: {
        type: 'string',
        description: 'API key',
        required: true,
        ownership: 'credential',
      },
    },
    outputSchema: {},
    requiredInputs: ['compareValue', 'conditions', 'apiKey'],
    outgoingPorts: ['true', 'false'],
    incomingPorts: ['default'],
    isBranching: true,
    defaultInputs: {},
  } as NodeDefinition;
}

describe('buildWorkflowGuidanceContext — structural field ownership', () => {
  beforeEach(() => {
    vi.mocked(nodeSchemaService.fetchAllSchemas).mockResolvedValue([makeSchema()]);
  });

  it('does not report structural or credential fields as missing inputs, only value fields', async () => {
    const nodes = [
      {
        id: 'node-1',
        type: 'custom',
        data: { type: 'if_else', label: 'If/Else', config: {} },
      },
    ];

    const result = await buildWorkflowGuidanceContext(nodes as any);

    const fieldNames = (result.missingInputs || []).map((i) => i.fieldName);
    expect(fieldNames).toContain('Compare Value');
    expect(fieldNames).not.toContain('Conditions');
    expect(fieldNames).not.toContain('Api Key');
  });
});
