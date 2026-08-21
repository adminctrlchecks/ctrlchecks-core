import { describe, expect, it } from 'vitest';
import { validateAndFixWorkflow } from '../workflowValidation';

describe('validateAndFixWorkflow preserveTopology', () => {
  it('does not drop extra triggers when preserveTopology is true', () => {
    const data = {
      nodes: [
        {
          id: 't1',
          type: 'custom',
          data: {
            label: 'A',
            type: 'chat_trigger',
            category: 'trigger',
            config: {},
          },
        },
        {
          id: 't2',
          type: 'custom',
          data: {
            label: 'B',
            type: 'chat_trigger',
            category: 'trigger',
            config: {},
          },
        },
      ],
      edges: [],
    };

    const without = validateAndFixWorkflow(data);
    const withPreserve = validateAndFixWorkflow(data, { preserveTopology: true });

    expect(without.nodes.length).toBeLessThan(data.nodes.length);
    expect(withPreserve.nodes.length).toBe(data.nodes.length);
  });

  it('does not fabricate sidecar-to-sidecar chain edges when linearizing an AI Agent workflow (live ee1c59d2 shape)', () => {
    // Regression: the load path runs validateAndFixWorkflow WITHOUT preserveTopology, so
    // linearization used to append the agent sidecars to the chain and wire them together
    // (ai_chat_model -> memory -> sheet -> sheet), which then read as "not reachable from
    // trigger" in Check Setup. Sidecars must stay attached to the agent, never chained.
    const node = (id: string, type: string, category: string, role?: string) => ({
      id,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: { label: id, type, category, config: {}, ...(role ? { agentAttachmentRole: role } : {}) },
    });
    const attEdge = (source: string, role: 'chat_model' | 'memory' | 'tool') => ({
      id: `edge_${source}_agent_${role}`,
      source,
      target: 'agent',
      sourceHandle: 'output',
      targetHandle: role,
      data: { agentAttachment: true, role },
    });
    const plain = (source: string, target: string) => ({
      id: `edge_${source}_${target}`,
      source,
      target,
      sourceHandle: 'output',
      targetHandle: 'input',
    });

    const data = {
      nodes: [
        node('trigger', 'chat_trigger', 'triggers'),
        node('agent', 'ai_agent', 'ai'),
        node('model', 'ai_chat_model', 'ai', 'chat_model'),
        node('memory', 'memory', 'ai', 'memory'),
        node('sheetA', 'google_sheets', 'google', 'tool'),
        node('sheetB', 'google_sheets', 'google', 'tool'),
        node('send', 'chat_send', 'output'),
      ],
      edges: [
        { id: 'e_trigger', source: 'trigger', target: 'agent', sourceHandle: 'output', targetHandle: 'userInput' },
        attEdge('model', 'chat_model'),
        attEdge('memory', 'memory'),
        attEdge('sheetA', 'tool'),
        attEdge('sheetB', 'tool'),
        // Spurious sidecar-to-sidecar chain that linearization must NOT keep/recreate.
        plain('model', 'memory'),
        plain('memory', 'sheetA'),
        plain('sheetA', 'sheetB'),
        { id: 'e_send', source: 'agent', target: 'send', sourceHandle: 'success', targetHandle: 'input' },
      ],
    };

    const fixed = validateAndFixWorkflow(data);

    // All 7 nodes preserved (sidecars are not dropped).
    expect(fixed.nodes.length).toBe(7);

    const sidecars = new Set(['model', 'memory', 'sheetA', 'sheetB']);
    // No edge runs purely between two sidecars.
    const sidecarChain = fixed.edges.filter(
      (e: any) => sidecars.has(e.source) && sidecars.has(e.target)
    );
    expect(sidecarChain).toEqual([]);

    // Each sidecar still attaches to the agent via its canonical role handle.
    for (const [src, role] of [['model', 'chat_model'], ['memory', 'memory'], ['sheetA', 'tool'], ['sheetB', 'tool']] as const) {
      const att = fixed.edges.find((e: any) => e.source === src && e.target === 'agent');
      expect(att, `attachment edge for ${src}`).toBeTruthy();
      expect(att.targetHandle).toBe(role);
    }
  });
});
