import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@xyflow/react', () => ({}));

vi.mock('@/components/workflow/nodeTypes', () => ({
  NODE_TYPES: [
    { type: 'manual_trigger', label: 'Manual Trigger', category: 'trigger', icon: 'Play' },
    { type: 'schedule', label: 'Schedule', category: 'trigger', icon: 'Clock' },
    { type: 'http_request', label: 'HTTP Request', category: 'action', icon: 'Globe' },
    { type: 'switch', label: 'Switch', category: 'logic', icon: 'GitBranch' },
    { type: 'ai_agent', label: 'AI Agent', category: 'ai', icon: 'Bot' },
    { type: 'ai_chat_model', label: 'AI Chat Model', category: 'ai', icon: 'Sparkles' },
  ],
}));

import {
  coerceReactFlowPosition,
  normalizeBackendNode,
  normalizeBackendEdge,
  normalizeBackendWorkflow,
  enforceFrontendRenderContract,
  validateNodeTypesRegistered,
  getRequiredNodeTypes,
} from '../node-type-normalizer';

// ─── coerceReactFlowPosition ───────────────────────────────────────────────

describe('coerceReactFlowPosition', () => {
  it('returns null for null input', () => {
    expect(coerceReactFlowPosition(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(coerceReactFlowPosition(undefined)).toBeNull();
  });

  it('returns null for a non-object primitive', () => {
    expect(coerceReactFlowPosition('string')).toBeNull();
    expect(coerceReactFlowPosition(42)).toBeNull();
  });

  it('returns { x, y } for numeric x and y', () => {
    expect(coerceReactFlowPosition({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
  });

  it('coerces string x and y to numbers', () => {
    expect(coerceReactFlowPosition({ x: '15', y: '30' })).toEqual({ x: 15, y: 30 });
  });

  it('returns null when x is Infinity', () => {
    expect(coerceReactFlowPosition({ x: Infinity, y: 10 })).toBeNull();
  });

  it('returns null when y is a non-numeric string', () => {
    expect(coerceReactFlowPosition({ x: 10, y: 'abc' })).toBeNull();
  });

  it('returns null when y is missing', () => {
    expect(coerceReactFlowPosition({ x: 10 })).toBeNull();
  });

  it('returns null when position is an empty object', () => {
    expect(coerceReactFlowPosition({})).toBeNull();
  });
});

// ─── normalizeBackendNode ──────────────────────────────────────────────────

describe('normalizeBackendNode', () => {
  it('maps manual_trigger to its dedicated frontend type', () => {
    const node = { id: 'n1', data: { type: 'manual_trigger' }, position: { x: 0, y: 0 } };
    const result = normalizeBackendNode(node);
    expect(result.type).toBe('manual_trigger');
    expect((result.data as any).type).toBe('manual_trigger');
  });

  it('maps unknown type to custom', () => {
    const node = { id: 'n2', data: { type: 'http_request' }, position: { x: 0, y: 0 } };
    const result = normalizeBackendNode(node);
    expect(result.type).toBe('custom');
    expect((result.data as any).type).toBe('http_request');
  });

  it('applies legacy alias csv_processor → csv for NODE_TYPE_MAP lookup (data.type overwritten by spread)', () => {
    // The alias resolves 'csv_processor' → 'csv' for frontendType/label lookups,
    // but backendNode.data spread re-applies data.type after, so data.type stays 'csv_processor'.
    const node = { id: 'n3', data: { type: 'csv_processor' }, position: { x: 0, y: 0 } };
    const result = normalizeBackendNode(node);
    // data.type is overwritten by the spread of backendNode.data
    expect((result.data as any).type).toBe('csv_processor');
    // The React Flow component type uses 'csv' for the NODE_TYPE_MAP → 'custom'
    expect(result.type).toBe('custom');
  });

  it('uses data.config when present', () => {
    const node = {
      id: 'n4',
      data: { type: 'schedule', config: { interval: '1h' } },
      position: { x: 0, y: 0 },
    };
    const result = normalizeBackendNode(node);
    expect((result.data as any).config).toEqual({ interval: '1h' });
  });

  it('falls back to node.config when data.config is absent', () => {
    const node = {
      id: 'n5',
      data: { type: 'schedule' },
      config: { interval: '2h' },
      position: { x: 0, y: 0 },
    };
    const result = normalizeBackendNode(node);
    expect((result.data as any).config).toEqual({ interval: '2h' });
  });

  it('parses JSON array strings in config', () => {
    const node = {
      id: 'n6',
      data: { type: 'http_request', config: { headers: '["a","b"]' } },
      position: { x: 0, y: 0 },
    };
    const result = normalizeBackendNode(node);
    expect((result.data as any).config.headers).toEqual(['a', 'b']);
  });

  it('parses JSON object strings in config', () => {
    const node = {
      id: 'n7',
      data: { type: 'http_request', config: { body: '{"key":"val"}' } },
      position: { x: 0, y: 0 },
    };
    const result = normalizeBackendNode(node);
    expect((result.data as any).config.body).toEqual({ key: 'val' });
  });

  it('keeps non-JSON string config values as-is', () => {
    const node = {
      id: 'n8',
      data: { type: 'http_request', config: { url: 'https://example.com' } },
      position: { x: 0, y: 0 },
    };
    const result = normalizeBackendNode(node);
    expect((result.data as any).config.url).toBe('https://example.com');
  });

  it('falls back to { x: 0, y: 0 } when position is missing', () => {
    const node = { id: 'n9', data: { type: 'http_request' } };
    const result = normalizeBackendNode(node);
    expect(result.position).toEqual({ x: 0, y: 0 });
  });

  it('uses label from NODE_TYPES when data.label is absent', () => {
    const node = { id: 'n10', data: { type: 'manual_trigger' }, position: { x: 0, y: 0 } };
    const result = normalizeBackendNode(node);
    expect((result.data as any).label).toBe('Manual Trigger');
  });

  it('uses type as label fallback when not in NODE_TYPES', () => {
    const node = { id: 'n11', data: { type: 'unknown_type' }, position: { x: 0, y: 0 } };
    const result = normalizeBackendNode(node);
    expect((result.data as any).label).toBe('unknown_type');
  });
});

// ─── normalizeBackendEdge ──────────────────────────────────────────────────

describe('normalizeBackendEdge', () => {
  it('maps sourceOutput to sourceHandle', () => {
    const edge = { id: 'e1', source: 'n1', target: 'n2', sourceOutput: 'out' };
    const result = normalizeBackendEdge(edge);
    expect(result.sourceHandle).toBe('out');
  });

  it('maps targetInput to targetHandle', () => {
    const edge = { id: 'e2', source: 'n1', target: 'n2', targetInput: 'in' };
    const result = normalizeBackendEdge(edge);
    expect(result.targetHandle).toBe('in');
  });

  it('prefers explicit sourceHandle over sourceOutput', () => {
    const edge = { id: 'e3', source: 'n1', target: 'n2', sourceHandle: 'explicit', sourceOutput: 'fallback' };
    const result = normalizeBackendEdge(edge);
    expect(result.sourceHandle).toBe('explicit');
  });

  it('defaults sourceHandle to output when nothing provided and type not a branch', () => {
    const edge = { id: 'e4', source: 'n1', target: 'n2', type: 'default' };
    const result = normalizeBackendEdge(edge);
    expect(result.sourceHandle).toBe('output');
  });

  it('infers branch sourceHandle for type=true', () => {
    const edge = { id: 'e5', source: 'n1', target: 'n2', type: 'true' };
    const result = normalizeBackendEdge(edge);
    expect(result.sourceHandle).toBe('true');
  });

  it('infers branch sourceHandle for type=false', () => {
    const edge = { id: 'e6', source: 'n1', target: 'n2', type: 'false' };
    const result = normalizeBackendEdge(edge);
    expect(result.sourceHandle).toBe('false');
  });

  it('infers branch sourceHandle for type=case_X', () => {
    const edge = { id: 'e7', source: 'n1', target: 'n2', type: 'case_1' };
    const result = normalizeBackendEdge(edge);
    expect(result.sourceHandle).toBe('case_1');
  });

  it('defaults targetHandle to input when nothing provided', () => {
    const edge = { id: 'e8', source: 'n1', target: 'n2' };
    const result = normalizeBackendEdge(edge);
    expect(result.targetHandle).toBe('input');
  });

  it('generates a fallback id when id is missing', () => {
    const edge = { source: 'n1', target: 'n2' };
    const result = normalizeBackendEdge(edge);
    expect(result.id).toBeTruthy();
    expect(typeof result.id).toBe('string');
  });

  it('preserves data field when present', () => {
    const edge = { id: 'e9', source: 'n1', target: 'n2', data: { label: 'yes' } };
    const result = normalizeBackendEdge(edge);
    expect(result.data).toEqual({ label: 'yes' });
  });
});

// ─── normalizeBackendWorkflow ──────────────────────────────────────────────

describe('normalizeBackendWorkflow', () => {
  it('normalizes all nodes and edges', () => {
    const wf = {
      nodes: [
        { id: 'n1', data: { type: 'manual_trigger' }, position: { x: 0, y: 0 } },
        { id: 'n2', data: { type: 'http_request' }, position: { x: 200, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };
    const result = normalizeBackendWorkflow(wf);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0].type).toBe('manual_trigger');
  });

  it('maps ai_agent targetHandle from input → userInput', () => {
    const wf = {
      nodes: [
        { id: 'n1', data: { type: 'http_request' }, position: { x: 0, y: 0 } },
        { id: 'n2', data: { type: 'ai_agent' }, position: { x: 200, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', targetHandle: 'input' }],
    };
    const result = normalizeBackendWorkflow(wf);
    expect(result.edges[0].targetHandle).toBe('userInput');
  });

  it('restores AI Agent attachment targetHandle from sidecar metadata on reload', () => {
    const wf = {
      nodes: [
        {
          id: 'model',
          data: { type: 'ai_chat_model', agentAttachmentRole: 'chat_model' },
          position: { x: 0, y: 0 },
        },
        { id: 'agent', data: { type: 'ai_agent' }, position: { x: 200, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'model', target: 'agent', sourceHandle: 'output', targetHandle: 'input' }],
    };
    const result = normalizeBackendWorkflow(wf);
    expect(result.edges[0]).toMatchObject({
      source: 'model',
      target: 'agent',
      sourceHandle: 'output',
      targetHandle: 'chat_model',
      data: { agentAttachment: true, role: 'chat_model' },
    });
  });

  it('does not remap targetHandle for non-ai_agent targets', () => {
    const wf = {
      nodes: [
        { id: 'n1', data: { type: 'manual_trigger' }, position: { x: 0, y: 0 } },
        { id: 'n2', data: { type: 'http_request' }, position: { x: 200, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', targetHandle: 'input' }],
    };
    const result = normalizeBackendWorkflow(wf);
    expect(result.edges[0].targetHandle).toBe('input');
  });

  it('self-heals an ai_agent execution edge with a legacy "output" sourceHandle to "success" (live ee1c59d2 shape)', () => {
    // Regression: the AI Agent -> Chat Send edge was persisted with sourceHandle "output"
    // (a generic default written by a backend edge-repair path, not the agent's real
    // 'success'/'error' ports). On load this rendered from the hidden legacy 'output' handle,
    // which sits at the same position as the "Tools" attachment handle — visually making the
    // reply edge look connected to Tools even though it logically targeted Chat Send.
    const wf = {
      nodes: [
        { id: 'agent', data: { type: 'ai_agent' }, position: { x: 0, y: 0 } },
        { id: 'send', data: { type: 'chat_send' }, position: { x: 200, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'agent', target: 'send', sourceHandle: 'output', targetHandle: 'input' }],
    };
    const result = normalizeBackendWorkflow(wf);
    expect(result.edges[0].sourceHandle).toBe('success');
    expect(result.edges[0].targetHandle).toBe('input');
  });

  it('preserves the "error" sourceHandle on an ai_agent execution edge', () => {
    const wf = {
      nodes: [
        { id: 'agent', data: { type: 'ai_agent' }, position: { x: 0, y: 0 } },
        { id: 'errlog', data: { type: 'log_output' }, position: { x: 200, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'agent', target: 'errlog', sourceHandle: 'error', targetHandle: 'input' }],
    };
    const result = normalizeBackendWorkflow(wf);
    expect(result.edges[0].sourceHandle).toBe('error');
  });

  it('does not touch sourceHandle on an ai_agent attachment edge (agent as attachment source)', () => {
    // Sanity: the self-heal must only apply to genuine execution edges, never to attachment
    // edges (already handled by the earlier attachmentRole branch).
    const wf = {
      nodes: [
        { id: 'agent', data: { type: 'ai_agent' }, position: { x: 0, y: 0 } },
        { id: 'sheet', data: { type: 'google_sheets', agentAttachmentRole: 'tool' }, position: { x: 200, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'sheet', target: 'agent', sourceHandle: 'output', targetHandle: 'tool' }],
    };
    const result = normalizeBackendWorkflow(wf);
    expect(result.edges[0]).toMatchObject({
      sourceHandle: 'output',
      targetHandle: 'tool',
      data: { agentAttachment: true, role: 'tool' },
    });
  });

  it('maps positional case_1 handle to semantic value for switch source', () => {
    const wf = {
      nodes: [
        {
          id: 'sw',
          data: { type: 'switch', config: { cases: [{ value: 'foo' }, { value: 'bar' }] } },
          position: { x: 0, y: 0 },
        },
        { id: 'n1', data: { type: 'http_request' }, position: { x: 200, y: 0 } },
        { id: 'n2', data: { type: 'http_request' }, position: { x: 200, y: 100 } },
      ],
      edges: [
        { id: 'e1', source: 'sw', target: 'n1', sourceHandle: 'case_1', type: 'case_1' },
        { id: 'e2', source: 'sw', target: 'n2', sourceHandle: 'case_2', type: 'case_2' },
      ],
    };
    const result = normalizeBackendWorkflow(wf);
    expect(result.edges[0].sourceHandle).toBe('foo');
    expect(result.edges[1].sourceHandle).toBe('bar');
  });
});

// ─── enforceFrontendRenderContract ────────────────────────────────────────

describe('enforceFrontendRenderContract', () => {
  it('produces the same output as normalizeBackendWorkflow (delegates)', () => {
    const wf = {
      nodes: [{ id: 'n1', data: { type: 'http_request' }, position: { x: 10, y: 20 } }],
      edges: [],
    };
    const direct = normalizeBackendWorkflow(wf);
    const enforced = enforceFrontendRenderContract(wf);
    expect(enforced).toEqual(direct);
  });
});

// ─── validateNodeTypesRegistered ──────────────────────────────────────────

describe('validateNodeTypesRegistered', () => {
  it('returns valid=true when all nodes use a registered React Flow type', () => {
    const nodes = [
      { id: 'n1', type: 'custom', data: { type: 'http_request' }, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'manual_trigger', data: { type: 'manual_trigger' }, position: { x: 0, y: 0 } },
    ];
    const result = validateNodeTypesRegistered(nodes as any);
    expect(result.valid).toBe(true);
    expect(result.missingTypes).toHaveLength(0);
  });

  it('returns valid=false and populates missingTypes for unknown React Flow types', () => {
    const nodes = [
      { id: 'n1', type: 'unknown_component', data: { type: 'http_request' }, position: { x: 0, y: 0 } },
    ];
    const result = validateNodeTypesRegistered(nodes as any);
    expect(result.valid).toBe(false);
    expect(result.missingTypes).toContain('unknown_component');
  });

  it('adds a warning when actual node type is absent from NODE_TYPES registry', () => {
    const nodes = [
      { id: 'n1', type: 'custom', data: { type: 'totally_unknown_node' }, position: { x: 0, y: 0 } },
    ];
    const result = validateNodeTypesRegistered(nodes as any);
    expect(result.warnings.some(w => w.includes('totally_unknown_node'))).toBe(true);
  });

  it('includes warnings for both missing React Flow type and missing actual type', () => {
    const nodes = [
      { id: 'n1', type: 'bad_component', data: { type: 'also_unknown' }, position: { x: 0, y: 0 } },
    ];
    const result = validateNodeTypesRegistered(nodes as any);
    expect(result.missingTypes).toContain('bad_component');
    expect(result.warnings.some(w => w.includes('also_unknown'))).toBe(true);
  });
});

// ─── getRequiredNodeTypes ──────────────────────────────────────────────────

describe('getRequiredNodeTypes', () => {
  it('excludes custom type', () => {
    const nodes = [
      { id: 'n1', type: 'custom', data: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'custom', data: {}, position: { x: 0, y: 0 } },
    ];
    const result = getRequiredNodeTypes(nodes as any);
    expect(result).not.toContain('custom');
    expect(result).toHaveLength(0);
  });

  it('includes non-custom types deduped', () => {
    const nodes = [
      { id: 'n1', type: 'manual_trigger', data: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'form', data: {}, position: { x: 0, y: 0 } },
      { id: 'n3', type: 'manual_trigger', data: {}, position: { x: 0, y: 0 } },
    ];
    const result = getRequiredNodeTypes(nodes as any);
    expect(result).toContain('manual_trigger');
    expect(result).toContain('form');
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(getRequiredNodeTypes([])).toHaveLength(0);
  });
});
