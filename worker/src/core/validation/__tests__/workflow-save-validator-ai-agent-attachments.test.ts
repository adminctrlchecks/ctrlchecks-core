import { describe, expect, it } from '@jest/globals';
import { validateEditorOpenReadiness } from '../workflow-save-validator';

describe('workflow-save-validator AI Agent attachments', () => {
  it('allows editor open for AI Agent sidecar attachments', () => {
    const nodes: any[] = [
      { id: 'chat', type: 'chat_trigger', data: { label: 'Chat', type: 'chat_trigger', category: 'triggers', config: {} } },
      { id: 'agent', type: 'ai_agent', data: { label: 'AI Agent', type: 'ai_agent', category: 'ai', config: {} } },
      { id: 'model', type: 'ai_chat_model', data: { label: 'Model', type: 'ai_chat_model', category: 'ai', config: {} } },
      { id: 'memory', type: 'memory', data: { label: 'Memory', type: 'memory', category: 'ai', config: {} } },
      { id: 'read_sheet', type: 'google_sheets', data: { label: 'Read Sheet', type: 'google_sheets', category: 'spreadsheets', config: {} } },
      { id: 'write_sheet', type: 'google_sheets', data: { label: 'Write Sheet', type: 'google_sheets', category: 'spreadsheets', config: {} } },
    ];
    const edges: any[] = [
      { id: 'e-chat-agent', source: 'chat', target: 'agent', sourceHandle: 'output', targetHandle: 'userInput' },
      { id: 'e-model-agent', source: 'model', target: 'agent', sourceHandle: 'output', targetHandle: 'chat_model' },
      { id: 'e-memory-agent', source: 'memory', target: 'agent', sourceHandle: 'output', targetHandle: 'memory' },
      { id: 'e-read-agent', source: 'read_sheet', target: 'agent', sourceHandle: 'output', targetHandle: 'tool' },
      { id: 'e-write-agent', source: 'write_sheet', target: 'agent', sourceHandle: 'output', targetHandle: 'tool' },
    ];

    const editorOpen = validateEditorOpenReadiness(nodes as any, edges as any);

    expect(editorOpen.ready).toBe(true);
    expect(editorOpen.errors).toEqual([]);
  });
});
