import { describe, it, expect, vi } from 'vitest';
import type { Node, Edge } from 'reactflow';
import { validateWorkflowGraph, computeExecutionOrderRank } from '../workflowGraphValidator';

vi.mock('reactflow', () => ({}));

function node(id: string, type: string, category?: string): Node {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: { type, category, label: id },
  } as Node;
}

function edge(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target } as Edge;
}

function agentAttachmentEdge(source: string, target: string, role: 'chat_model' | 'memory' | 'tool'): Edge {
  return {
    id: `${source}->${target}:${role}`,
    source,
    target,
    sourceHandle: 'output',
    targetHandle: role,
    data: { agentAttachment: true, role },
  } as Edge;
}

const trigger = () => node('t1', 'manual_trigger', 'triggers');
const action = (id = 'a1') => node(id, 'http_request');

// ─── validateWorkflowGraph ────────────────────────────────────────────────────

describe('validateWorkflowGraph', () => {
  it('returns NO_NODES error for empty nodes array', () => {
    const result = validateWorkflowGraph([], []);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'NO_NODES')).toBe(true);
  });

  it('returns NO_TRIGGER when no trigger node present', () => {
    const result = validateWorkflowGraph([action()], []);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'NO_TRIGGER')).toBe(true);
  });

  it('returns MULTIPLE_TRIGGERS when two trigger nodes present', () => {
    const t2 = node('t2', 'webhook', 'triggers');
    const result = validateWorkflowGraph([trigger(), t2], [edge('t1', 't2')]);
    expect(result.errors.some(e => e.code === 'MULTIPLE_TRIGGERS')).toBe(true);
  });

  it('recognizes trigger via category "triggers"', () => {
    const n = node('t1', 'custom_node', 'triggers');
    const result = validateWorkflowGraph([n], []);
    expect(result.errors.some(e => e.code === 'NO_TRIGGER')).toBe(false);
  });

  it('recognizes trigger via category "trigger"', () => {
    const n = node('t1', 'custom_node', 'trigger');
    const result = validateWorkflowGraph([n], []);
    expect(result.errors.some(e => e.code === 'NO_TRIGGER')).toBe(false);
  });

  it('recognizes trigger when type string contains "trigger"', () => {
    const n = node('t1', 'my_custom_trigger');
    const result = validateWorkflowGraph([n], []);
    expect(result.errors.some(e => e.code === 'NO_TRIGGER')).toBe(false);
  });

  it('recognizes "webhook" as a known trigger type', () => {
    const n = node('t1', 'webhook');
    const result = validateWorkflowGraph([n], []);
    expect(result.errors.some(e => e.code === 'NO_TRIGGER')).toBe(false);
  });

  it('single trigger with no other nodes is valid', () => {
    const result = validateWorkflowGraph([trigger()], []);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('linear trigger → action chain is valid', () => {
    const result = validateWorkflowGraph([trigger(), action()], [edge('t1', 'a1')]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('treats AI Agent model, memory, and tool attachments as sidecar edges', () => {
    const chatTrigger = node('chat', 'chat_trigger', 'triggers');
    const agent = node('agent', 'ai_agent', 'ai');
    const model = node('model', 'ai_chat_model', 'ai');
    const memory = node('memory', 'memory', 'ai');
    const readSheet = node('read_sheet', 'google_sheets', 'spreadsheets');
    const writeSheet = node('write_sheet', 'google_sheets', 'spreadsheets');

    const result = validateWorkflowGraph(
      [chatTrigger, agent, model, memory, readSheet, writeSheet],
      [
        { ...edge('chat', 'agent'), sourceHandle: 'output', targetHandle: 'userInput' },
        agentAttachmentEdge('model', 'agent', 'chat_model'),
        agentAttachmentEdge('memory', 'agent', 'memory'),
        agentAttachmentEdge('read_sheet', 'agent', 'tool'),
        agentAttachmentEdge('write_sheet', 'agent', 'tool'),
      ]
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('keeps legacy agentAttachment marker sidecars out of reachability even if a handle was damaged', () => {
    const result = validateWorkflowGraph(
      [trigger(), node('agent', 'ai_agent', 'ai'), node('memory', 'memory', 'ai')],
      [
        { ...edge('t1', 'agent'), sourceHandle: 'output', targetHandle: 'userInput' },
        {
          ...edge('memory', 'agent'),
          sourceHandle: 'output',
          targetHandle: 'input',
          data: { agentAttachment: true, role: 'memory' },
        } as Edge,
      ]
    );

    expect(result.errors.some(e => e.code === 'UNREACHABLE_NODE')).toBe(false);
    expect(result.errors.some(e => e.code === 'MULTIPLE_INCOMING')).toBe(false);
    expect(result.valid).toBe(true);
  });

  it('allows many tool attachments but rejects duplicate singleton attachments', () => {
    const result = validateWorkflowGraph(
      [
        trigger(),
        node('agent', 'ai_agent', 'ai'),
        node('model1', 'ai_chat_model', 'ai'),
        node('model2', 'ai_chat_model', 'ai'),
        node('tool1', 'google_sheets', 'spreadsheets'),
        node('tool2', 'notion', 'productivity'),
      ],
      [
        { ...edge('t1', 'agent'), sourceHandle: 'output', targetHandle: 'userInput' },
        agentAttachmentEdge('model1', 'agent', 'chat_model'),
        agentAttachmentEdge('model2', 'agent', 'chat_model'),
        agentAttachmentEdge('tool1', 'agent', 'tool'),
        agentAttachmentEdge('tool2', 'agent', 'tool'),
      ]
    );

    expect(result.errors.some(e => e.code === 'MULTIPLE_AGENT_MODELS')).toBe(true);
    expect(result.errors.some(e => e.code === 'MULTIPLE_INCOMING')).toBe(false);
    expect(result.errors.some(e => e.code === 'TOO_MANY_OUTGOING')).toBe(false);
  });

  it('allows AI Agent reply and error outputs as distinct semantic ports', () => {
    const chatTrigger = node('chat', 'chat_trigger', 'triggers');
    const agent = node('agent', 'ai_agent', 'ai');
    const chatSend = node('send', 'chat_send', 'output');
    const errorLog = node('err', 'log_output', 'output');

    const result = validateWorkflowGraph(
      [chatTrigger, agent, chatSend, errorLog],
      [
        { ...edge('chat', 'agent'), sourceHandle: 'output', targetHandle: 'userInput' },
        { ...edge('agent', 'send'), sourceHandle: 'success', targetHandle: 'input' },
        { ...edge('agent', 'err'), sourceHandle: 'error', targetHandle: 'input' },
      ]
    );

    expect(result.errors.some(e => e.code === 'TOO_MANY_OUTGOING' && e.nodeId === 'agent')).toBe(false);
  });

  it('allows chatbot agent flow with model, memory, tools, and Chat Send reply', () => {
    const chatTrigger = node('chat', 'chat_trigger', 'triggers');
    const agent = node('agent', 'ai_agent', 'ai');
    const model = node('model', 'ai_chat_model', 'ai');
    const memory = node('memory', 'memory', 'ai');
    const readSheet = node('read_sheet', 'google_sheets', 'google');
    const writeSheet = node('write_sheet', 'google_sheets', 'google');
    const chatSend = node('send', 'chat_send', 'output');

    const result = validateWorkflowGraph(
      [chatTrigger, agent, model, memory, readSheet, writeSheet, chatSend],
      [
        { ...edge('chat', 'agent'), sourceHandle: 'output', targetHandle: 'userInput' },
        agentAttachmentEdge('model', 'agent', 'chat_model'),
        agentAttachmentEdge('memory', 'agent', 'memory'),
        agentAttachmentEdge('read_sheet', 'agent', 'tool'),
        agentAttachmentEdge('write_sheet', 'agent', 'tool'),
        { ...edge('agent', 'send'), sourceHandle: 'success', targetHandle: 'input' },
      ],
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('keeps agent sidecars out of execution even when spurious sidecar-to-sidecar edges chain them (live ee1c59d2 shape)', () => {
    // Regression: a real chatbot workflow persisted canonical attachment edges AND a
    // parallel chain of plain "input" edges linking the sidecars to each other
    // (chat_model -> memory -> sheet -> sheet). That chain made every sidecar incident to
    // an execution edge, so they were wrongly kept in the execution graph and reported as
    // "not reachable from trigger" / "has no incoming edges".
    const chatTrigger = node('chat', 'chat_trigger', 'triggers');
    const agent = node('agent', 'ai_agent', 'ai');
    const model = node('model', 'ai_chat_model', 'ai');
    model.data = { ...model.data, agentAttachmentRole: 'chat_model' };
    const memory = node('memory', 'memory', 'ai');
    memory.data = { ...memory.data, agentAttachmentRole: 'memory' };
    const sheetA = node('sheetA', 'google_sheets', 'google');
    sheetA.data = { ...sheetA.data, agentAttachmentRole: 'tool' };
    const sheetB = node('sheetB', 'google_sheets', 'google');
    sheetB.data = { ...sheetB.data, agentAttachmentRole: 'tool' };
    const chatSend = node('send', 'chat_send', 'output');

    const result = validateWorkflowGraph(
      [chatTrigger, agent, model, memory, sheetA, sheetB, chatSend],
      [
        { ...edge('chat', 'agent'), sourceHandle: 'output', targetHandle: 'userInput' },
        // Canonical AI Agent attachment edges (what renders as dotted sidecars).
        agentAttachmentEdge('model', 'agent', 'chat_model'),
        agentAttachmentEdge('memory', 'agent', 'memory'),
        agentAttachmentEdge('sheetA', 'agent', 'tool'),
        agentAttachmentEdge('sheetB', 'agent', 'tool'),
        // Spurious plain execution edges chaining the sidecars together.
        { ...edge('model', 'memory'), sourceHandle: 'output', targetHandle: 'input' },
        { ...edge('memory', 'sheetA'), sourceHandle: 'output', targetHandle: 'input' },
        { ...edge('sheetA', 'sheetB'), sourceHandle: 'output', targetHandle: 'input' },
        { ...edge('agent', 'send'), sourceHandle: 'success', targetHandle: 'input' },
      ],
    );

    expect(result.errors.some(e => e.code === 'UNREACHABLE_NODE')).toBe(false);
    expect(result.errors.some(e => e.code === 'NO_INCOMING')).toBe(false);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('treats reversed AI Agent attachment edges as sidecars', () => {
    const chatTrigger = node('chat', 'chat_trigger', 'triggers');
    const agent = node('agent', 'ai_agent', 'ai');
    const sheet = node('sheet', 'google_sheets', 'google');
    const chatSend = node('send', 'chat_send', 'output');

    const result = validateWorkflowGraph(
      [chatTrigger, agent, sheet, chatSend],
      [
        { ...edge('chat', 'agent'), sourceHandle: 'output', targetHandle: 'userInput' },
        {
          ...edge('agent', 'sheet'),
          sourceHandle: 'tool',
          targetHandle: 'input',
          data: { agentAttachment: true, role: 'tool' },
        } as Edge,
        { ...edge('agent', 'send'), sourceHandle: 'success', targetHandle: 'input' },
      ],
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('infers AI Agent attachment edges from sidecar node metadata when handle was flattened', () => {
    const chatTrigger = node('chat', 'chat_trigger', 'triggers');
    const agent = node('agent', 'ai_agent', 'ai');
    const model = node('model', 'ai_chat_model', 'ai');
    model.data = { ...model.data, agentAttachmentRole: 'chat_model' };
    const chatSend = node('send', 'chat_send', 'output');

    const result = validateWorkflowGraph(
      [chatTrigger, agent, model, chatSend],
      [
        { ...edge('chat', 'agent'), sourceHandle: 'output', targetHandle: 'userInput' },
        {
          ...edge('model', 'agent'),
          sourceHandle: 'output',
          targetHandle: 'input',
        } as Edge,
        { ...edge('agent', 'send'), sourceHandle: 'success', targetHandle: 'input' },
      ],
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('keeps duplicate AI Agent reply outputs invalid', () => {
    const chatTrigger = node('chat', 'chat_trigger', 'triggers');
    const agent = node('agent', 'ai_agent', 'ai');
    const sendOne = node('send_one', 'chat_send', 'output');
    const sendTwo = node('send_two', 'chat_send', 'output');

    const result = validateWorkflowGraph(
      [chatTrigger, agent, sendOne, sendTwo],
      [
        { ...edge('chat', 'agent'), sourceHandle: 'output', targetHandle: 'userInput' },
        { ...edge('agent', 'send_one'), sourceHandle: 'success', targetHandle: 'input' },
        { ...edge('agent', 'send_two'), sourceHandle: 'output', targetHandle: 'input' },
      ]
    );

    expect(result.errors.some(e => e.code === 'TOO_MANY_OUTGOING' && e.nodeId === 'agent')).toBe(true);
  });

  it('unreachable node produces UNREACHABLE_NODE error and warning', () => {
    const orphan = node('orphan', 'http_request');
    const result = validateWorkflowGraph([trigger(), orphan], []);
    expect(result.errors.some(e => e.code === 'UNREACHABLE_NODE' && e.nodeId === 'orphan')).toBe(true);
    expect(result.warnings.some(w => w.includes('not reachable'))).toBe(true);
  });

  it('non-trigger node with no incoming edge produces NO_INCOMING error', () => {
    const a = action('a1');
    const b = action('a2');
    const result = validateWorkflowGraph([trigger(), a, b], [edge('t1', 'a1')]);
    expect(result.errors.some(e => e.code === 'NO_INCOMING' && e.nodeId === 'a2')).toBe(true);
  });

  it('multiple incoming on non-merge node in non-branching workflow → MULTIPLE_INCOMING', () => {
    const a1 = action('a1');
    const a2 = action('a2');
    const sink = action('sink');
    const result = validateWorkflowGraph(
      [trigger(), a1, a2, sink],
      [edge('t1', 'a1'), edge('t1', 'a2'), edge('a1', 'sink'), edge('a2', 'sink')]
    );
    expect(result.errors.some(e => e.code === 'MULTIPLE_INCOMING' && e.nodeId === 'sink')).toBe(true);
  });

  it('multiple incoming in branching workflow (all distinct sources) → no MULTIPLE_INCOMING', () => {
    const branch = node('branch', 'if_else');
    const left = action('left');
    const right = action('right');
    const sink = action('sink');
    const result = validateWorkflowGraph(
      [trigger(), branch, left, right, sink],
      [
        edge('t1', 'branch'),
        edge('branch', 'left'),
        edge('branch', 'right'),
        edge('left', 'sink'),
        edge('right', 'sink'),
      ]
    );
    expect(result.errors.some(e => e.code === 'MULTIPLE_INCOMING' && e.nodeId === 'sink')).toBe(false);
  });

  it('merge node with multiple incoming edges is allowed', () => {
    const a1 = action('a1');
    const a2 = action('a2');
    const merge = node('merge', 'merge');
    const result = validateWorkflowGraph(
      [trigger(), a1, a2, merge],
      [edge('t1', 'a1'), edge('t1', 'a2'), edge('a1', 'merge'), edge('a2', 'merge')]
    );
    expect(result.errors.some(e => e.code === 'MULTIPLE_INCOMING' && e.nodeId === 'merge')).toBe(false);
  });

  it('if_else with 0 outgoing edges emits a warning', () => {
    const ie = node('ie', 'if_else');
    const result = validateWorkflowGraph([trigger(), ie], [edge('t1', 'ie')]);
    expect(result.warnings.some(w => w.includes('If/Else') && w.includes('2 outgoing'))).toBe(true);
  });

  it('if_else with exactly 2 outgoing edges emits no warning about outgoing', () => {
    const ie = node('ie', 'if_else');
    const left = action('left');
    const right = action('right');
    const result = validateWorkflowGraph(
      [trigger(), ie, left, right],
      [edge('t1', 'ie'), edge('ie', 'left'), edge('ie', 'right')]
    );
    expect(result.warnings.some(w => w.includes('If/Else') && w.includes('outgoing'))).toBe(false);
  });

  it('switch with 0 outgoing edges emits a warning', () => {
    const sw = node('sw', 'switch');
    const result = validateWorkflowGraph([trigger(), sw], [edge('t1', 'sw')]);
    expect(result.warnings.some(w => w.includes('Switch') && w.includes('outgoing'))).toBe(true);
  });

  it('switch with multiple outgoing edges is allowed (no error)', () => {
    const sw = node('sw', 'switch');
    const c1 = action('c1');
    const c2 = action('c2');
    const c3 = action('c3');
    const result = validateWorkflowGraph(
      [trigger(), sw, c1, c2, c3],
      [edge('t1', 'sw'), edge('sw', 'c1'), edge('sw', 'c2'), edge('sw', 'c3')]
    );
    expect(result.errors.some(e => e.code === 'TOO_MANY_OUTGOING')).toBe(false);
    expect(result.warnings.some(w => w.includes('Switch') && w.includes('outgoing'))).toBe(false);
  });

  it('non-branching node with 2 outgoing edges → TOO_MANY_OUTGOING error', () => {
    const a = action('a1');
    const b = action('b1');
    const c = action('c1');
    const result = validateWorkflowGraph(
      [trigger(), a, b, c],
      [edge('t1', 'a1'), edge('a1', 'b1'), edge('a1', 'c1')]
    );
    expect(result.errors.some(e => e.code === 'TOO_MANY_OUTGOING' && e.nodeId === 'a1')).toBe(true);
  });

  it('detects a cycle and returns CYCLE_DETECTED error', () => {
    const a = action('a1');
    const b = action('a2');
    const result = validateWorkflowGraph(
      [trigger(), a, b],
      [edge('t1', 'a1'), edge('a1', 'a2'), edge('a2', 'a1')]
    );
    expect(result.errors.some(e => e.code === 'CYCLE_DETECTED')).toBe(true);
  });

  it('valid flag is false when errors exist, true when no errors', () => {
    const valid = validateWorkflowGraph([trigger()], []);
    expect(valid.valid).toBe(true);
    const invalid = validateWorkflowGraph([], []);
    expect(invalid.valid).toBe(false);
  });
});

// ─── computeExecutionOrderRank ────────────────────────────────────────────────

describe('computeExecutionOrderRank', () => {
  it('returns empty map for empty nodes array', () => {
    const rank = computeExecutionOrderRank([], []);
    expect(rank.size).toBe(0);
  });

  it('falls back to sequential index when no trigger present', () => {
    const nodes = [
      { id: 'a', data: { type: 'http_request' } },
      { id: 'b', data: { type: 'http_request' } },
    ];
    const rank = computeExecutionOrderRank(nodes, []);
    expect(rank.get('a')).toBe(0);
    expect(rank.get('b')).toBe(1);
  });

  it('assigns rank 0 to trigger, then BFS downstream', () => {
    const nodes = [
      { id: 't1', data: { type: 'manual_trigger', category: 'triggers' } },
      { id: 'a1', data: { type: 'http_request' } },
      { id: 'a2', data: { type: 'http_request' } },
    ];
    const edges = [
      { source: 't1', target: 'a1' },
      { source: 'a1', target: 'a2' },
    ];
    const rank = computeExecutionOrderRank(nodes, edges);
    expect(rank.get('t1')).toBe(0);
    expect(rank.get('a1')).toBe(1);
    expect(rank.get('a2')).toBe(2);
  });

  it('assigns rank 9999 to unreachable nodes', () => {
    const nodes = [
      { id: 't1', data: { type: 'manual_trigger', category: 'triggers' } },
      { id: 'orphan', data: { type: 'http_request' } },
    ];
    const rank = computeExecutionOrderRank(nodes, []);
    expect(rank.get('t1')).toBe(0);
    expect(rank.get('orphan')).toBe(9999);
  });

  it('does not rank AI Agent attachment nodes as execution steps', () => {
    const nodes = [
      { id: 'chat', data: { type: 'chat_trigger', category: 'triggers' } },
      { id: 'agent', data: { type: 'ai_agent' } },
      { id: 'model', data: { type: 'ai_chat_model' } },
      { id: 'sheet', data: { type: 'google_sheets' } },
    ];
    const rank = computeExecutionOrderRank(nodes, [
      { source: 'chat', target: 'agent', targetHandle: 'userInput' },
      { source: 'model', target: 'agent', targetHandle: 'chat_model' },
      { source: 'sheet', target: 'agent', targetHandle: 'tool' },
    ]);

    expect(rank.get('chat')).toBe(0);
    expect(rank.get('agent')).toBe(1);
    expect(rank.get('model')).toBe(9999);
    expect(rank.get('sheet')).toBe(9999);
  });

  it('produces stable sorted order for parallel branches', () => {
    const nodes = [
      { id: 't1', data: { type: 'manual_trigger', category: 'triggers' } },
      { id: 'b', data: { type: 'http_request' } },
      { id: 'a', data: { type: 'http_request' } },
    ];
    const edges = [
      { source: 't1', target: 'a' },
      { source: 't1', target: 'b' },
    ];
    const rank = computeExecutionOrderRank(nodes, edges);
    // targets are sorted alphabetically: 'a' < 'b'
    expect(rank.get('a')).toBeLessThan(rank.get('b')!);
  });

  it('handles null/undefined edge entries gracefully', () => {
    const nodes = [
      { id: 't1', data: { type: 'manual_trigger', category: 'triggers' } },
    ];
    const rank = computeExecutionOrderRank(nodes, [
      null as unknown as { source: string; target: string },
      undefined as unknown as { source: string; target: string },
    ]);
    expect(rank.get('t1')).toBe(0);
  });
});
