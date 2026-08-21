import { splitAgentAttachmentEdges } from '../agent-attachment-edges';

/**
 * Regression for live workflow ee1c59d2-0e73-4ad1-ab75-4191461e578c.
 *
 * The persisted graph carried correct canonical AI Agent attachment edges
 * (chat_model / memory / tool -> ai_agent) AND a parallel chain of plain "input"
 * execution edges linking the sidecars to each other
 * (ai_chat_model -> memory -> google_sheets -> google_sheets).
 *
 * That chain made every sidecar incident to an execution edge, so the previous
 * split logic kept them inside the execution graph — the frontend Check Setup then
 * reported "not reachable from trigger" / "has no incoming edges" for each sidecar.
 */
describe('splitAgentAttachmentEdges — spurious sidecar-to-sidecar chain', () => {
  const nodes: any[] = [
    { id: 'chat_trigger_x', type: 'custom', data: { type: 'chat_trigger', label: 'Chat Trigger', category: 'triggers' } },
    { id: 'ai_agent_x', type: 'custom', data: { type: 'ai_agent', label: 'AI Agent', category: 'ai' } },
    { id: 'ai_chat_model_x', type: 'custom', data: { type: 'ai_chat_model', label: 'AI Chat Model', category: 'ai', agentAttachmentRole: 'chat_model' } },
    { id: 'memory_x', type: 'custom', data: { type: 'memory', label: 'Memory', category: 'ai', agentAttachmentRole: 'memory' } },
    { id: 'sheet_a', type: 'custom', data: { type: 'google_sheets', label: 'Google Sheets', category: 'google', agentAttachmentRole: 'tool' } },
    { id: 'sheet_b', type: 'custom', data: { type: 'google_sheets', label: 'Google Sheets', category: 'google', agentAttachmentRole: 'tool' } },
    { id: 'chat_send_x', type: 'custom', data: { type: 'chat_send', label: 'Chat Send', category: 'output' } },
  ];

  const edges: any[] = [
    { id: 'e_trigger', source: 'chat_trigger_x', target: 'ai_agent_x', sourceHandle: 'output', targetHandle: 'userInput' },
    // Canonical attachment edges
    { id: 'e_model', source: 'ai_chat_model_x', target: 'ai_agent_x', sourceHandle: 'output', targetHandle: 'chat_model', data: { role: 'chat_model', agentAttachment: true } },
    { id: 'e_memory', source: 'memory_x', target: 'ai_agent_x', sourceHandle: 'output', targetHandle: 'memory', data: { role: 'memory', agentAttachment: true } },
    { id: 'e_toolA', source: 'sheet_a', target: 'ai_agent_x', sourceHandle: 'output', targetHandle: 'tool', data: { role: 'tool', agentAttachment: true } },
    { id: 'e_toolB', source: 'sheet_b', target: 'ai_agent_x', sourceHandle: 'output', targetHandle: 'tool', data: { role: 'tool', agentAttachment: true } },
    // Spurious sidecar-to-sidecar execution chain
    { id: 'e_chain1', source: 'ai_chat_model_x', target: 'memory_x', sourceHandle: 'output', targetHandle: 'input' },
    { id: 'e_chain2', source: 'memory_x', target: 'sheet_a', sourceHandle: 'output', targetHandle: 'input' },
    { id: 'e_chain3', source: 'sheet_a', target: 'sheet_b', sourceHandle: 'output', targetHandle: 'input' },
    // Agent success output
    { id: 'e_send', source: 'ai_agent_x', target: 'chat_send_x', sourceHandle: 'success', targetHandle: 'input' },
  ];

  it('excludes the sidecars from the execution graph and drops the spurious chain', () => {
    const { executionNodes, executionEdges, attachmentEdges, attachmentOnlyNodeIds } =
      splitAgentAttachmentEdges(nodes, edges);

    const execNodeIds = executionNodes.map((n) => n.id).sort();
    expect(execNodeIds).toEqual(['ai_agent_x', 'chat_send_x', 'chat_trigger_x']);

    const execEdgeIds = executionEdges.map((e) => e.id).sort();
    expect(execEdgeIds).toEqual(['e_send', 'e_trigger']);

    expect(attachmentEdges.map((e) => e.id).sort()).toEqual(['e_memory', 'e_model', 'e_toolA', 'e_toolB']);

    expect([...attachmentOnlyNodeIds].sort()).toEqual(['ai_chat_model_x', 'memory_x', 'sheet_a', 'sheet_b']);
  });
});
