import { describe, it, expect, vi, beforeEach } from 'vitest';

// 'reactflow' is not installed — only '@xyflow/react' is. Node/Edge are TypeScript
// types only; mock the module so vitest doesn't fail on the missing package.
vi.mock('reactflow', () => ({}));

// Stub normalizeIfElseConfig so tests focus on graphNormalizer logic, not
// condition normalization (already covered in ifElseConditions.test.ts).
vi.mock('../ifElseConditions', () => ({
  normalizeIfElseConfig: vi.fn((config: Record<string, unknown>) => ({
    ...config,
    _normalized: true,
  })),
}));

import { normalizeWorkflowGraph } from '../graphNormalizer';

// Minimal stand-ins for reactflow Node / Edge — only the fields used at runtime.
type TNode = { id: string; data?: Record<string, unknown>; [k: string]: unknown };
type TEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

function makeNode(id: string, type = 'some_action', config: Record<string, unknown> = {}): TNode {
  return { id, data: { type, config } };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): TEdge {
  return { id, source, target, sourceHandle, targetHandle };
}

function run(nodes: TNode[], edges: TEdge[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return normalizeWorkflowGraph(nodes as any, edges as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// empty graph
// ---------------------------------------------------------------------------

describe('normalizeWorkflowGraph — empty graph', () => {
  it('returns empty nodes, edges, errors, and warnings', () => {
    const result = run([], []);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// node config normalization
// ---------------------------------------------------------------------------

describe('normalizeWorkflowGraph — non-if_else node', () => {
  it('passes the node through unchanged (config untouched)', () => {
    const n = makeNode('n1', 'send_email', { to: 'a@b.com' });
    const result = run([n], []);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].data?.config).toEqual({ to: 'a@b.com' });
  });

  it('does not call normalizeIfElseConfig for non-if_else node', async () => {
    const { normalizeIfElseConfig } = await import('../ifElseConditions');
    run([makeNode('n1', 'http_request')], []);
    expect(normalizeIfElseConfig).not.toHaveBeenCalled();
  });
});

describe('normalizeWorkflowGraph — if_else node', () => {
  it('applies normalizeIfElseConfig to the node config', () => {
    const n = makeNode('n1', 'if_else', { condition: 'x > 0' });
    const result = run([n], []);
    expect(result.nodes[0].data?.config).toMatchObject({ _normalized: true });
  });

  it('calls normalizeIfElseConfig exactly once per if_else node', async () => {
    const { normalizeIfElseConfig } = await import('../ifElseConditions');
    run([makeNode('n1', 'if_else'), makeNode('n2', 'if_else')], []);
    expect(normalizeIfElseConfig).toHaveBeenCalledTimes(2);
  });

  it('handles an if_else node with no data property safely', () => {
    const n: TNode = { id: 'n1' }; // no data
    expect(() => run([n], [])).not.toThrow();
  });

  it('handles an if_else node with data.type but no config key', () => {
    const n: TNode = { id: 'n1', data: { type: 'if_else' } };
    const result = run([n], []);
    expect(result.nodes[0].data?.config).toMatchObject({ _normalized: true });
  });
});

// ---------------------------------------------------------------------------
// invalid edge removal
// ---------------------------------------------------------------------------

describe('normalizeWorkflowGraph — invalid edge removal', () => {
  it('removes edge whose target node does not exist', () => {
    const n = makeNode('n1');
    const e = makeEdge('e1', 'n1', 'MISSING');
    const result = run([n], [e]);
    expect(result.edges).toHaveLength(0);
    expect(result.warnings).toContain('Removed 1 invalid edge(s) referencing non-existent nodes');
  });

  it('removes edge whose source node does not exist', () => {
    const n = makeNode('n1');
    const e = makeEdge('e1', 'MISSING', 'n1');
    const result = run([n], [e]);
    expect(result.edges).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });

  it('keeps edges where both source and target exist', () => {
    const n1 = makeNode('n1');
    const n2 = makeNode('n2');
    const e = makeEdge('e1', 'n1', 'n2');
    const result = run([n1, n2], [e]);
    expect(result.edges).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });

  it('emits a single warning counting all removed invalid edges', () => {
    const n = makeNode('n1');
    const bad1 = makeEdge('e1', 'n1', 'X');
    const bad2 = makeEdge('e2', 'Y', 'n1');
    const result = run([n], [bad1, bad2]);
    expect(result.edges).toHaveLength(0);
    expect(result.warnings).toContain('Removed 2 invalid edge(s) referencing non-existent nodes');
  });
});

// ---------------------------------------------------------------------------
// edge deduplication
// ---------------------------------------------------------------------------

describe('normalizeWorkflowGraph — edge deduplication', () => {
  it('removes a duplicate edge with the same source/target/handles', () => {
    const n1 = makeNode('n1');
    const n2 = makeNode('n2');
    const e1 = makeEdge('e1', 'n1', 'n2', 'out', 'in');
    const e2 = makeEdge('e2', 'n1', 'n2', 'out', 'in'); // exact duplicate
    const result = run([n1, n2], [e1, e2]);
    expect(result.edges).toHaveLength(1);
    expect(result.warnings).toContain('Removed 1 duplicate edge(s)');
  });

  it('keeps edges with same source/target but different sourceHandle', () => {
    const n1 = makeNode('n1');
    const n2 = makeNode('n2');
    const e1 = makeEdge('e1', 'n1', 'n2', 'true', 'in');
    const e2 = makeEdge('e2', 'n1', 'n2', 'false', 'in');
    const result = run([n1, n2], [e1, e2]);
    expect(result.edges).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
  });

  it('treats null and undefined sourceHandle as the same "default" key', () => {
    const n1 = makeNode('n1');
    const n2 = makeNode('n2');
    const e1 = makeEdge('e1', 'n1', 'n2', null);
    const e2 = makeEdge('e2', 'n1', 'n2', undefined); // maps to 'default' same as null
    const result = run([n1, n2], [e1, e2]);
    expect(result.edges).toHaveLength(1);
    expect(result.warnings).toContain('Removed 1 duplicate edge(s)');
  });

  it('keeps the first occurrence when deduplicating', () => {
    const n1 = makeNode('n1');
    const n2 = makeNode('n2');
    const e1 = makeEdge('e1', 'n1', 'n2');
    const e2 = makeEdge('e2', 'n1', 'n2');
    const result = run([n1, n2], [e1, e2]);
    expect(result.edges[0].id).toBe('e1');
  });

  it('canonicalizes duplicate AI Agent reply aliases before save', () => {
    const trigger = makeNode('trigger', 'chat_trigger');
    const agent = makeNode('agent', 'ai_agent');
    const send = makeNode('send', 'chat_send');
    const result = run(
      [trigger, agent, send],
      [
        makeEdge('e1', 'trigger', 'agent', 'output', 'userInput'),
        makeEdge('e2', 'agent', 'send', 'success', 'input'),
        makeEdge('e3', 'agent', 'send', 'output', 'input'),
      ],
    );

    const replyEdges = result.edges.filter((edge) => edge.source === 'agent' && edge.target === 'send');
    expect(replyEdges).toHaveLength(1);
    expect(replyEdges[0].sourceHandle).toBe('success');
    expect(result.warnings).toContain('Removed 1 duplicate edge(s)');
  });

  it('keeps AI Agent reply and error as separate output handles', () => {
    const agent = makeNode('agent', 'ai_agent');
    const send = makeNode('send', 'chat_send');
    const err = makeNode('err', 'log_output');
    const result = run(
      [agent, send, err],
      [
        makeEdge('e1', 'agent', 'send', 'reply', 'input'),
        makeEdge('e2', 'agent', 'err', 'error', 'input'),
      ],
    );

    expect(result.edges).toHaveLength(2);
    expect(result.edges.find((edge) => edge.target === 'send')?.sourceHandle).toBe('success');
    expect(result.edges.find((edge) => edge.target === 'err')?.sourceHandle).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// combined scenarios
// ---------------------------------------------------------------------------

describe('normalizeWorkflowGraph — combined invalid + duplicate edges', () => {
  it('emits both warnings when there are invalid and duplicate edges', () => {
    const n1 = makeNode('n1');
    const n2 = makeNode('n2');
    const bad = makeEdge('e0', 'n1', 'MISSING');
    const dup1 = makeEdge('e1', 'n1', 'n2');
    const dup2 = makeEdge('e2', 'n1', 'n2');
    const result = run([n1, n2], [bad, dup1, dup2]);
    expect(result.edges).toHaveLength(1);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings.some((w) => w.includes('invalid'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('duplicate'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// errors array
// ---------------------------------------------------------------------------

describe('normalizeWorkflowGraph — errors array', () => {
  it('is always empty regardless of graph state', () => {
    const n = makeNode('n1');
    const badEdge = makeEdge('e1', 'n1', 'GONE');
    expect(run([], []).errors).toEqual([]);
    expect(run([n], [badEdge]).errors).toEqual([]);
    expect(run([n], []).errors).toEqual([]);
  });
});
