import type { AgentRunContext, AgentToolDescriptor } from '../agent-types';
import { executeAttachedTool } from '../tool-adapter';

const executeNodeMock = jest.fn<Promise<{ ok: boolean }>, unknown[]>(async () => ({ ok: true }));

jest.mock('../../../../api/execute-workflow', () => ({
  executeNode: (...args: unknown[]) => executeNodeMock(...args),
}));

describe('tool-adapter', () => {
  beforeEach(() => {
    executeNodeMock.mockClear();
  });

  it('executes attached tools through executeNode and preserves connectionRefs', async () => {
    const descriptor = {
      toolId: 'tool-1',
      functionName: 'future_tool_tool_1',
      nodeId: 'tool-1',
      nodeType: 'future_tool',
      label: 'Future Tool',
      description: 'Tool',
      parameters: {},
      required: [],
      firstRunClass: 'read',
      node: {
        id: 'tool-1',
        type: 'future_tool',
        data: {
          label: 'Future Tool',
          type: 'future_tool',
          category: 'action',
          config: {
            connectionRefs: { future_provider: 'conn-1' },
            query: 'default',
          },
        },
      },
    } as AgentToolDescriptor;

    const context = {
      nodeOutputs: {},
      db: {},
      workflowId: 'workflow-1',
      userId: 'owner-1',
      currentUserId: 'actor-1',
    } as AgentRunContext;

    const result = await executeAttachedTool(descriptor, { query: 'from model' }, context);

    expect(result).toEqual({ ok: true });
    expect(executeNodeMock).toHaveBeenCalledTimes(1);
    const [nodeArg, inputArg, , , workflowId, userId, currentUserId] =
      executeNodeMock.mock.calls[0] as [
        { data: { config: Record<string, unknown>; connectionRefs?: Record<string, unknown> } },
        Record<string, unknown>,
        unknown,
        unknown,
        string,
        string,
        string,
      ];
    expect(inputArg).toEqual({ query: 'from model' });
    expect(workflowId).toBe('workflow-1');
    expect(userId).toBe('owner-1');
    expect(currentUserId).toBe('actor-1');
    expect(nodeArg.data.config).toMatchObject({
      query: 'from model',
      connectionRefs: { future_provider: 'conn-1' },
    });
    expect(nodeArg.data.connectionRefs).toEqual({ future_provider: 'conn-1' });
  });

  it('never lets the model override configured identity fields (spreadsheetId/sheetName)', async () => {
    const descriptor = {
      toolId: 'sheet-1',
      functionName: 'google_sheets_sheet_1',
      nodeId: 'sheet-1',
      nodeType: 'google_sheets',
      label: 'Google Sheets',
      description: 'Read a sheet',
      parameters: {},
      required: [],
      firstRunClass: 'read',
      node: {
        id: 'sheet-1',
        type: 'google_sheets',
        data: {
          label: 'Google Sheets',
          type: 'google_sheets',
          category: 'google',
          config: {
            spreadsheetId: '15uvopMfFpFaMjjSjldJ6F9vUp7lME2eEyA0_BcTbShw',
            sheetName: 'Business_Knowledge',
            operation: 'read',
          },
        },
      },
    } as AgentToolDescriptor;

    const context = { nodeOutputs: {}, db: {}, workflowId: 'wf', userId: 'u', currentUserId: 'a' } as AgentRunContext;

    // The model hallucinates a human-readable spreadsheetId/sheetName from the system prompt.
    await executeAttachedTool(
      descriptor,
      { spreadsheetId: 'Business Knowledge', sheetName: 'Business Knowledge', values: [['x']] },
      context,
    );

    const [nodeArg] = executeNodeMock.mock.calls[0] as [
      { data: { config: Record<string, unknown> } },
    ];
    // Identity fields keep the configured values; the fabricated ones are ignored.
    expect(nodeArg.data.config.spreadsheetId).toBe('15uvopMfFpFaMjjSjldJ6F9vUp7lME2eEyA0_BcTbShw');
    expect(nodeArg.data.config.sheetName).toBe('Business_Knowledge');
    // Non-identity data the model supplies still flows through.
    expect(nodeArg.data.config.values).toEqual([['x']]);
  });
});
