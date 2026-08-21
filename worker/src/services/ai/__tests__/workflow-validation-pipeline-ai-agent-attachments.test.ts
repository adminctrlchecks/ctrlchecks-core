import {
  FinalIntegrityValidationLayer,
  GraphConnectivityValidationLayer,
  workflowValidationPipeline,
} from '../workflow-validation-pipeline';
import { unifiedGraphOrchestrator } from '../../../core/orchestration/unified-graph-orchestrator';

const node = (id: string, type: string, category = 'ai') => ({
  id,
  type,
  data: {
    type,
    category,
    label: type,
    config: {},
  },
});

const attachmentEdge = (source: string, target: string, role: 'chat_model' | 'memory' | 'tool') => ({
  id: `${source}->${target}:${role}`,
  source,
  target,
  sourceHandle: 'output',
  targetHandle: role,
  data: { agentAttachment: true, role },
});

describe('AI Agent attachment validation pipeline', () => {
  it('does not treat AI Agent model, memory, and tool attachments as disconnected execution nodes', () => {
    const workflow = {
      nodes: [
        node('chat', 'chat_trigger', 'triggers'),
        node('agent', 'ai_agent'),
        node('model', 'ai_chat_model'),
        node('memory', 'memory'),
        node('read_sheet', 'google_sheets', 'google'),
        node('write_sheet', 'google_sheets', 'google'),
      ],
      edges: [
        { id: 'chat->agent', source: 'chat', target: 'agent', sourceHandle: 'output', targetHandle: 'userInput' },
        attachmentEdge('model', 'agent', 'chat_model'),
        attachmentEdge('memory', 'agent', 'memory'),
        attachmentEdge('read_sheet', 'agent', 'tool'),
        attachmentEdge('write_sheet', 'agent', 'tool'),
      ],
    };

    const result = workflowValidationPipeline.validateWorkflow(workflow as any);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.errors.join('\n')).not.toMatch(/disconnected|no input|orphan/i);
  });

  it('keeps AI Agent sidecar attachments out of unified graph structural errors', () => {
    const workflow = {
      nodes: [
        node('chat', 'chat_trigger', 'triggers'),
        node('agent', 'ai_agent'),
        node('model', 'ai_chat_model'),
        node('memory', 'memory'),
        node('sheet', 'google_sheets', 'google'),
      ],
      edges: [
        { id: 'chat->agent', source: 'chat', target: 'agent', sourceHandle: 'output', targetHandle: 'userInput' },
        attachmentEdge('model', 'agent', 'chat_model'),
        attachmentEdge('memory', 'agent', 'memory'),
        attachmentEdge('sheet', 'agent', 'tool'),
      ],
    };

    const result = unifiedGraphOrchestrator.validateWorkflow(workflow as any);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join('\n')).not.toMatch(/not in execution order|orphan/i);
  });

  it('validates live chatbot topology without treating model, memory, or tools as execution steps', () => {
    const workflow = {
      nodes: [
        node('chat', 'chat_trigger', 'triggers'),
        node('agent', 'ai_agent'),
        node('reply', 'chat_send', 'communication'),
        node('model', 'ai_chat_model'),
        node('memory', 'memory'),
        node('read_sheet', 'google_sheets', 'google'),
        node('write_sheet', 'google_sheets', 'google'),
      ],
      edges: [
        { id: 'chat->agent', source: 'chat', target: 'agent', sourceHandle: 'output', targetHandle: 'userInput' },
        { id: 'agent->reply', source: 'agent', target: 'reply', sourceHandle: 'success', targetHandle: 'input' },
        attachmentEdge('model', 'agent', 'chat_model'),
        attachmentEdge('memory', 'agent', 'memory'),
        attachmentEdge('read_sheet', 'agent', 'tool'),
        attachmentEdge('write_sheet', 'agent', 'tool'),
      ],
    };
    const context = {
      intent: {
        trigger: 'chat_trigger',
        actions: [],
        requires_credentials: [],
      },
      workflow,
    } as any;

    const graphResult = new GraphConnectivityValidationLayer().validate(context);
    const integrityResult = new FinalIntegrityValidationLayer().validate(context);

    expect(graphResult.valid).toBe(true);
    expect(integrityResult.valid).toBe(true);
    expect([...graphResult.errors, ...integrityResult.errors].join('\n')).not.toMatch(
      /not reachable from trigger|has no input connections|orphan/i
    );
  });
});
