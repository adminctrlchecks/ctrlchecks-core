import { groundWorkflowTemplateReferences } from '../template-reference-grounding';
import { unifiedNodeRegistry } from '../../registry/unified-node-registry';

jest.mock('../../registry/unified-node-registry', () => ({
  unifiedNodeRegistry: {
    getEffectiveOutputSchema: jest.fn(),
    resolveAlias: (type: string) => type,
    get: () => ({}),
  },
}));

const mockedSchema = unifiedNodeRegistry.getEffectiveOutputSchema as jest.Mock;

function workflowWithActionConfig(config: Record<string, unknown>) {
  return {
    nodes: [
      {
        id: 'form1',
        type: 'form',
        data: { type: 'form', label: 'Payment Form', config: {} },
      },
      {
        id: 'switch1',
        type: 'switch',
        data: { type: 'switch', label: 'Route Payment', config: {} },
      },
      {
        id: 'action1',
        type: 'slack_message',
        data: { type: 'slack_message', label: 'Notify Team', config },
      },
    ],
    edges: [
      { source: 'form1', target: 'switch1' },
      { source: 'switch1', target: 'action1' },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSchema.mockImplementation((type: string) =>
    type === 'form'
      ? {
          properties: {
            email: { type: 'string' },
            amount: { type: 'number' },
            payment_status: { type: 'string' },
          },
        }
      : { properties: {} },
  );
});

describe('groundWorkflowTemplateReferences', () => {
  it('repairs generated references to the real upstream field names', () => {
    const workflow = workflowWithActionConfig({
      message:
        'Payment failed for {{$json.email}}. Status: {{$json.status}}. Amount: {{$json.amount}}',
      _fillMode: { message: 'buildtime_ai_once' },
    });

    const result = groundWorkflowTemplateReferences(workflow);
    const action = result.workflow.nodes.find((node) => node.id === 'action1')!;

    expect(action.data.config.message).toContain('{{$json.payment_status}}');
    expect(action.data.config.message).not.toContain('{{$json.status}}');
    expect(result.repairs).toEqual([
      {
        nodeId: 'action1',
        nodeType: 'slack_message',
        fieldName: 'message',
        from: 'status',
        to: 'payment_status',
      },
    ]);
    expect(result.deferredFields).toEqual([]);
  });

  it('defers ungrounded generated fields instead of saving invalid templates', () => {
    const workflow = workflowWithActionConfig({
      message: 'Order is {{$json.order_state}}',
      _fillMode: { message: 'buildtime_ai_once' },
    });

    const result = groundWorkflowTemplateReferences(workflow);
    const action = result.workflow.nodes.find((node) => node.id === 'action1')!;

    expect(action.data.config.message).toBeUndefined();
    expect(action.data.config._fillMode).toEqual({ message: 'manual_static' });
    expect(result.deferredFields).toEqual([
      {
        nodeId: 'action1',
        nodeType: 'slack_message',
        fieldName: 'message',
        invalidRefs: ['order_state'],
      },
    ]);
  });

  it('leaves nodes unchanged when no upstream shape is available', () => {
    mockedSchema.mockReturnValue({ properties: {} });
    const workflow = workflowWithActionConfig({
      message: 'Status: {{$json.status}}',
      _fillMode: { message: 'buildtime_ai_once' },
    });

    const result = groundWorkflowTemplateReferences(workflow);
    const action = result.workflow.nodes.find((node) => node.id === 'action1')!;

    expect(action.data.config.message).toBe('Status: {{$json.status}}');
    expect(result.repairs).toEqual([]);
    expect(result.deferredFields).toEqual([]);
  });
});
