import { validateFinalWorkflow } from '../final-workflow-validator';
import { Workflow } from '../../../core/types/ai-types';

describe('FinalWorkflowValidator terminal sink behavior', () => {
  test('allows workflows to terminate at write-capable sinks like airtable (no "not connected to any output")', () => {
    const workflow = {
      id: 'wf_test_terminal_sink',
      name: 'terminal sink workflow',
      nodes: [
        {
          id: 't1',
          type: 'manual_trigger',
          position: { x: 0, y: 0 },
          data: { type: 'manual_trigger', label: 'Manual Trigger', category: 'trigger', config: {} },
        },
        {
          id: 'm1',
          type: 'ollama',
          position: { x: 200, y: 0 },
          data: { type: 'ollama', label: 'Ollama', category: 'ai', config: {} },
        },
        {
          id: 's1',
          type: 'airtable',
          position: { x: 400, y: 0 },
          data: {
            type: 'airtable',
            label: 'Airtable',
            category: 'database',
            config: { operation: 'create' },
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 't1',
          target: 'm1',
          type: 'default',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
        {
          id: 'e2',
          source: 'm1',
          target: 's1',
          type: 'default',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ],
    } as any as Workflow;

    const result = validateFinalWorkflow(workflow, 'store to CRM');
    expect(result.valid).toBe(true);
    expect(result.errors.join(' | ')).not.toMatch(/airtable.*not connected to any output/i);
  });

  test('does not treat AI Agent attachments as required execution inputs', () => {
    const workflow = {
      id: 'wf_test_ai_agent_attachments',
      name: 'ai agent attachment workflow',
      nodes: [
        {
          id: 'chat',
          type: 'chat_trigger',
          position: { x: 0, y: 0 },
          data: { type: 'chat_trigger', label: 'Chat Trigger', category: 'triggers', config: {} },
        },
        {
          id: 'agent',
          type: 'ai_agent',
          position: { x: 200, y: 0 },
          data: { type: 'ai_agent', label: 'AI Agent', category: 'ai', config: {} },
        },
        {
          id: 'reply',
          type: 'chat_send',
          position: { x: 400, y: 0 },
          data: { type: 'chat_send', label: 'Chat Send', category: 'output', config: {} },
        },
        {
          id: 'model',
          type: 'ai_chat_model',
          position: { x: 120, y: 180 },
          data: { type: 'ai_chat_model', label: 'AI Chat Model', category: 'ai', config: {}, agentAttachmentRole: 'chat_model' },
        },
        {
          id: 'memory',
          type: 'memory',
          position: { x: 240, y: 180 },
          data: { type: 'memory', label: 'Memory', category: 'ai', config: {}, agentAttachmentRole: 'memory' },
        },
        {
          id: 'read_sheet',
          type: 'google_sheets',
          position: { x: 360, y: 180 },
          data: { type: 'google_sheets', label: 'Google Sheets', category: 'google', config: {}, agentAttachmentRole: 'tool' },
        },
        {
          id: 'write_sheet',
          type: 'google_sheets',
          position: { x: 480, y: 180 },
          data: { type: 'google_sheets', label: 'Google Sheets', category: 'google', config: {}, agentAttachmentRole: 'tool' },
        },
      ],
      edges: [
        {
          id: 'chat->agent',
          source: 'chat',
          target: 'agent',
          type: 'default',
          sourceHandle: 'output',
          targetHandle: 'userInput',
        },
        {
          id: 'agent->reply',
          source: 'agent',
          target: 'reply',
          type: 'default',
          sourceHandle: 'success',
          targetHandle: 'input',
        },
        {
          id: 'model->agent',
          source: 'model',
          target: 'agent',
          type: 'default',
          sourceHandle: 'output',
          targetHandle: 'chat_model',
          data: { agentAttachment: true, role: 'chat_model' },
        },
        {
          id: 'memory->agent',
          source: 'memory',
          target: 'agent',
          type: 'default',
          sourceHandle: 'output',
          targetHandle: 'memory',
          data: { agentAttachment: true, role: 'memory' },
        },
        {
          id: 'read_sheet->agent',
          source: 'read_sheet',
          target: 'agent',
          type: 'default',
          sourceHandle: 'output',
          targetHandle: 'tool',
          data: { agentAttachment: true, role: 'tool' },
        },
        {
          id: 'write_sheet->agent',
          source: 'write_sheet',
          target: 'agent',
          type: 'default',
          sourceHandle: 'output',
          targetHandle: 'tool',
          data: { agentAttachment: true, role: 'tool' },
        },
      ],
    } as any as Workflow;

    const result = validateFinalWorkflow(workflow, 'answer chat questions with sheets');

    expect(result.errors.join(' | ')).not.toMatch(/not reachable from trigger|has no input connections/i);
    expect(result.details.orphanNodes).toEqual([]);
    expect(result.details.missingInputs).toEqual([]);
  });
});
