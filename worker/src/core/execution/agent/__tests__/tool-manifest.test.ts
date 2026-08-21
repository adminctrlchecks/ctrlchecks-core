import fs from 'fs';
import path from 'path';
import type { INodeRegistry, UnifiedNodeDefinition } from '../../../types/unified-node-contract';
import type { WorkflowNode } from '../../../types/ai-types';
import {
  buildToolManifest,
  getAttachedToolNodes,
  validateToolArgs,
} from '../tool-manifest';
import { shouldBlockForApproval } from '../agent-guardrails';
import { sanitizeToolResult } from '../result-sanitizer';

function makeNode(id: string, type: string, config: Record<string, unknown> = {}): WorkflowNode {
  return {
    id,
    type,
    data: {
      label: id,
      type,
      category: 'action',
      config,
    },
  };
}

function makeDefinition(partial: Partial<UnifiedNodeDefinition>): UnifiedNodeDefinition {
  return {
    type: partial.type || 'future_tool',
    label: partial.label || 'Future Tool',
    category: partial.category || 'action',
    description: partial.description || 'Future tool description',
    version: '1.0.0',
    inputSchema: partial.inputSchema || {
      query: { type: 'string', description: 'Search query', required: true },
      apiKey: { type: 'string', description: 'API key', required: true, ownership: 'credential' },
    },
    outputSchema: { default: { name: 'default', description: 'Output', schema: { type: 'object' } } },
    requiredInputs: partial.requiredInputs || ['query'],
    defaultConfig: () => ({}),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({ success: true, output: {} }),
    incomingPorts: ['input'],
    outgoingPorts: ['output'],
    isBranching: false,
    operationContracts: partial.operationContracts,
    aiSelectionCriteria: partial.aiSelectionCriteria,
    ...(partial as Record<string, unknown>),
  } as UnifiedNodeDefinition;
}

function makeRegistry(definitions: UnifiedNodeDefinition[]): INodeRegistry {
  const byType = new Map(definitions.map((definition) => [definition.type, definition]));
  return {
    get: (nodeType: string) => byType.get(nodeType),
    getInputSchema: (nodeType: string) => byType.get(nodeType)?.inputSchema,
    getAllTypes: () => Array.from(byType.keys()),
  } as INodeRegistry;
}

describe('AI Agent tool manifest', () => {
  it('builds tools from attached registry nodes and strips credentials', () => {
    const registry = makeRegistry([
      makeDefinition({
        type: 'future_tool',
        operationContracts: [{
          operation: 'default',
          label: 'Default',
          requiredFields: ['query'],
          optionalFields: [],
          credentialProviders: [],
          outputFields: [],
          status: 'implemented',
          firstRunClass: 'read',
        }],
      }),
    ]);

    const manifest = buildToolManifest({
      attachedNodes: [makeNode('tool-1', 'future_tool')],
      registry,
      agentNodeType: 'agent_under_test',
    });

    expect(manifest).toHaveLength(1);
    expect(manifest[0].nodeType).toBe('future_tool');
    expect(manifest[0].parameters).toMatchObject({
      type: 'object',
      properties: { query: expect.any(Object) },
      required: ['query'],
      additionalProperties: false,
    });
    expect((manifest[0].parameters.properties as Record<string, unknown>).apiKey).toBeUndefined();
  });

  it('emits items for array parameters so Gemini function-calling accepts the schema', () => {
    // Regression: a Google Sheets tool exposing an array `values` field produced
    // { type: 'array' } with no items, which Gemini rejects with a 400
    // ("...function_declarations[0].parameters.properties[values].items: missing field").
    const registry = makeRegistry([
      makeDefinition({
        type: 'array_tool',
        inputSchema: {
          values: { type: 'array', description: 'Row values to write', required: true },
          range: { type: 'string', description: 'A1 range', required: false },
        },
        requiredInputs: ['values'],
      }),
    ]);

    const manifest = buildToolManifest({
      attachedNodes: [makeNode('tool-array', 'array_tool')],
      registry,
      agentNodeType: 'agent_under_test',
    });

    const properties = manifest[0].parameters.properties as Record<string, Record<string, unknown>>;
    expect(properties.values.type).toBe('array');
    expect(properties.values.items).toEqual({ type: 'string' });
    // Non-array fields must not gain a spurious items key.
    expect(properties.range.items).toBeUndefined();
  });

  it('adds operation + target to the description so identical tools are distinguishable', () => {
    const registry = makeRegistry([makeDefinition({ type: 'google_sheets', label: 'Google Sheets', category: 'google' })]);
    const readNode = makeNode('read', 'google_sheets', { operation: 'read', sheetName: 'Business_Knowledge' });
    const writeNode = makeNode('write', 'google_sheets', { operation: 'append', sheetName: 'Customer_Leads' });

    const manifest = buildToolManifest({ attachedNodes: [readNode, writeNode], registry, agentNodeType: 'agent_under_test' });

    const read = manifest.find((t) => t.nodeId === 'read')!;
    const write = manifest.find((t) => t.nodeId === 'write')!;
    expect(read.description).toContain('Configured operation: read');
    expect(read.description).toContain('Configured sheetName: Business_Knowledge');
    expect(write.description).toContain('Configured operation: append');
    expect(write.description).toContain('Configured sheetName: Customer_Leads');
    // The two tools now carry distinct descriptions.
    expect(read.description).not.toBe(write.description);
  });

  it('excludes triggers, internal nodes, and the agent itself by metadata', () => {
    const registry = makeRegistry([
      makeDefinition({ type: 'triggerish', category: 'trigger' }),
      makeDefinition({ type: 'internalish', category: 'action', internalOnly: true } as Partial<UnifiedNodeDefinition>),
      makeDefinition({ type: 'agent_under_test', category: 'ai' }),
      makeDefinition({ type: 'usable', category: 'action' }),
    ]);

    const manifest = buildToolManifest({
      attachedNodes: [
        makeNode('a', 'triggerish'),
        makeNode('b', 'internalish'),
        makeNode('c', 'agent_under_test'),
        makeNode('d', 'usable'),
      ],
      registry,
      agentNodeType: 'agent_under_test',
    });

    expect(manifest.map((tool) => tool.nodeType)).toEqual(['usable']);
  });

  it('discovers future attached nodes without agent-code changes', () => {
    const registry = makeRegistry([makeDefinition({ type: 'brand_new_registry_node' })]);
    const attached = getAttachedToolNodes('agent-1', {
      nodes: [makeNode('agent-1', 'agent_under_test'), makeNode('new-1', 'brand_new_registry_node')],
      edges: [{ id: 'e1', source: 'new-1', target: 'agent-1', targetHandle: 'tool' }],
    });
    const manifest = buildToolManifest({ attachedNodes: attached, registry, agentNodeType: 'agent_under_test' });
    expect(manifest).toHaveLength(1);
    expect(manifest[0].nodeType).toBe('brand_new_registry_node');
  });

  it('rejects missing, unknown, and invalid arguments', () => {
    const [descriptor] = buildToolManifest({
      attachedNodes: [makeNode('tool-1', 'future_tool')],
      registry: makeRegistry([makeDefinition({ type: 'future_tool' })]),
      agentNodeType: 'agent_under_test',
    });

    expect(validateToolArgs(descriptor, {}).valid).toBe(false);
    expect(validateToolArgs(descriptor, { query: 'x', extra: true }).valid).toBe(false);
    expect(validateToolArgs(descriptor, { query: 'x' }).valid).toBe(true);
  });

  it('treats omitted firstRunClass as write for approval guardrails', () => {
    const [descriptor] = buildToolManifest({
      attachedNodes: [makeNode('tool-1', 'future_tool')],
      registry: makeRegistry([makeDefinition({ type: 'future_tool' })]),
      agentNodeType: 'agent_under_test',
    });

    expect(descriptor.firstRunClass).toBe('write');
    expect(shouldBlockForApproval(descriptor.firstRunClass, 'write_and_destructive')).toBe(true);
  });

  it('sanitizes secrets and caps tool results', () => {
    const result = sanitizeToolResult({
      ok: true,
      accessToken: 'raw-token',
      nested: { password: 'raw-password' },
      body: 'x'.repeat(2000),
    }, 1000);

    expect(result.text).toContain('[REDACTED]');
    expect(result.text).not.toContain('raw-token');
    expect(result.text).not.toContain('raw-password');
    expect(result.truncated).toBe(true);
  });

  it('keeps the agent module free of node-type hardcoding', () => {
    const agentDir = path.resolve(__dirname, '..');
    const files = fs.readdirSync(agentDir)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => fs.readFileSync(path.join(agentDir, file), 'utf8').replace(/agentNodeType/g, ''));
    const source = files.join('\n');

    expect(source).not.toMatch(/ai_agent/);
    expect(source).not.toMatch(/nodeType\s*===\s*['"]/);
    expect(source).not.toMatch(/switch\s*\(\s*nodeType\s*\)/);
  });
});
