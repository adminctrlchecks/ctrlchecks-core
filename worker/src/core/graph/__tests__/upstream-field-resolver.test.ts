/**
 * Upstream field resolution (Phase 3).
 *
 * The walk was extracted verbatim from property-population-stage.ts; these tests pin the
 * behaviour that extraction had to preserve, plus the node attribution that was added.
 */

import { extractJsonFieldRefs, resolveUpstreamFields } from '../upstream-field-resolver';
import { unifiedNodeRegistry } from '../../registry/unified-node-registry';

/*
 * `get` / `resolveAlias` back the shared node-type resolution the walk now uses; the identity
 * implementations keep these tests about the WALK, with the schema mock still driving shape.
 */
jest.mock('../../registry/unified-node-registry', () => ({
  unifiedNodeRegistry: {
    getEffectiveOutputSchema: jest.fn(),
    resolveAlias: (type: string) => type,
    get: () => ({}),
  },
}));

const mockedSchema = unifiedNodeRegistry.getEffectiveOutputSchema as jest.Mock;

function graph(nodes: Array<{ id: string; type: string; label?: string }>, edges: Array<[string, string]>) {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: { type: n.type, label: n.label ?? n.type, config: {} },
    })),
    edges: edges.map(([source, target]) => ({ source, target })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('extractJsonFieldRefs', () => {
  it('finds bare and braced references', () => {
    expect(extractJsonFieldRefs('{{$json.email}}')).toEqual(['email']);
    expect(extractJsonFieldRefs('$json.name')).toEqual(['name']);
  });

  it('walks nested arrays and objects', () => {
    const value = { to: '{{$json.email}}', rows: [['{{$json.name}}', '{{$json.age}}']] };
    expect(extractJsonFieldRefs(value).sort()).toEqual(['age', 'email', 'name']);
  });

  it('returns nothing for values with no references', () => {
    expect(extractJsonFieldRefs('a literal value')).toEqual([]);
    expect(extractJsonFieldRefs(42)).toEqual([]);
    expect(extractJsonFieldRefs(null)).toEqual([]);
  });
});

describe('resolveUpstreamFields', () => {
  it('attributes each field to the node that declares it', () => {
    mockedSchema.mockImplementation((type: string) =>
      type === 'form'
        ? { properties: { email: { type: 'string' }, name: { type: 'string' } } }
        : { properties: {} },
    );

    const g = graph(
      [
        { id: 'n1', type: 'form', label: 'Signup Form' },
        { id: 'n2', type: 'gmail', label: 'Send Email' },
      ],
      [['n1', 'n2']],
    );

    const result = resolveUpstreamFields(g, 'n2');
    expect(result.names).toEqual(new Set(['email', 'name']));
    expect(result.fields.every((f) => f.producedByNodeId === 'n1')).toBe(true);
    expect(result.fields[0].producedByNodeLabel).toBe('Signup Form');
  });

  it('walks through a node that declares no shape and is not dynamic', () => {
    // if_else declares nothing and does not transform the payload, so the walk continues.
    mockedSchema.mockImplementation((type: string) =>
      type === 'form' ? { properties: { email: { type: 'string' } } } : { properties: {} },
    );

    const g = graph(
      [
        { id: 'n1', type: 'form', label: 'Form' },
        { id: 'n2', type: 'if_else', label: 'Branch' },
        { id: 'n3', type: 'slack', label: 'Slack' },
      ],
      [
        ['n1', 'n2'],
        ['n2', 'n3'],
      ],
    );

    const result = resolveUpstreamFields(g, 'n3');
    expect(result.names.has('email')).toBe(true);
    expect(result.fields[0].producedByNodeId).toBe('n1');
  });

  it('stops at a dynamic node rather than guessing past it', () => {
    mockedSchema.mockImplementation((type: string) => {
      if (type === 'code') return { dynamic: true, properties: {} };
      if (type === 'form') return { properties: { email: { type: 'string' } } };
      return { properties: {} };
    });

    const g = graph(
      [
        { id: 'n1', type: 'form' },
        { id: 'n2', type: 'code' },
        { id: 'n3', type: 'slack' },
      ],
      [
        ['n1', 'n2'],
        ['n2', 'n3'],
      ],
    );

    const result = resolveUpstreamFields(g, 'n3');
    expect(result.fields).toEqual([]);
  });

  it('lets the nearest declaring node win a duplicated field name', () => {
    mockedSchema.mockImplementation((type: string) => {
      if (type === 'transform') return { properties: { email: { type: 'string' } } };
      if (type === 'form') return { properties: { email: { type: 'string' } } };
      return { properties: {} };
    });

    const g = graph(
      [
        { id: 'n1', type: 'form', label: 'Form' },
        { id: 'n2', type: 'transform', label: 'Transform' },
        { id: 'n3', type: 'slack', label: 'Slack' },
      ],
      [
        ['n1', 'n2'],
        ['n2', 'n3'],
      ],
    );

    const result = resolveUpstreamFields(g, 'n3');
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].producedByNodeId).toBe('n2');
  });

  it('returns nothing for a node with no upstream edges', () => {
    mockedSchema.mockReturnValue({ properties: {} });
    const g = graph([{ id: 'n1', type: 'manual_trigger' }], []);
    expect(resolveUpstreamFields(g, 'n1').fields).toEqual([]);
  });

  it('terminates on a cycle', () => {
    mockedSchema.mockReturnValue({ properties: {} });
    const g = graph(
      [
        { id: 'n1', type: 'a' },
        { id: 'n2', type: 'b' },
      ],
      [
        ['n1', 'n2'],
        ['n2', 'n1'],
      ],
    );
    expect(() => resolveUpstreamFields(g, 'n1')).not.toThrow();
  });
});
