import { buildWorkflowReadinessEnvelope } from '../workflow-readiness-aggregator';
import { getWorkflowConnectionReadiness } from '../../../services/workflow-connection-readiness';

jest.mock('../../../services/workflow-connection-readiness', () => ({
  getWorkflowConnectionReadiness: jest.fn(),
}));

const mockedGetConnectionReadiness = getWorkflowConnectionReadiness as jest.MockedFunction<typeof getWorkflowConnectionReadiness>;

function workflowNode(
  id: string,
  nodeType: string,
  label: string,
  config: Record<string, unknown>,
) {
  return {
    id,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      type: nodeType,
      label,
      config,
    },
  } as any;
}

describe('workflow readiness aggregator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetConnectionReadiness.mockResolvedValue({
      workflowId: 'workflow-1',
      ready: true,
      rows: [],
      missing: [],
      summary: {
        requiredCount: 0,
        readyCount: 0,
        missingCount: 0,
        invalidRefCount: 0,
        runtimeMissingCount: 0,
        missingScopeCount: 0,
        expiredCount: 0,
        revokedCount: 0,
        errorCount: 0,
      },
    });
  });

  it('aggregates every operation-aware missing field across different nodes', async () => {
    const readiness = await buildWorkflowReadinessEnvelope({
      workflowId: 'workflow-1',
      userId: 'user-1',
      nodes: [
        workflowNode('message-1', 'slack_message', 'Team Update', { channel: '#ops' }),
        workflowNode('mail-1', 'google_gmail', 'Customer Email', { operation: 'send' }),
      ],
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.code).toBe('EXECUTION_MISSING_INPUTS');
    expect(readiness.missingCredentials).toEqual([]);
    expect(readiness.readinessIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'missing_input',
          nodeId: 'message-1',
          nodeType: 'slack_message',
          fieldKey: 'message',
        }),
        expect.objectContaining({
          kind: 'missing_input',
          nodeId: 'mail-1',
          nodeType: 'google_gmail',
          operation: 'send',
          operationLabel: 'Send Email',
          fieldKey: 'subject',
        }),
      ]),
    );
    expect(readiness.groupedIssues).toHaveLength(2);
    expect(readiness.summary).toMatchObject({
      totalNodes: 2,
      checkedNodes: 2,
      issueCount: readiness.readinessIssues.length,
      missingCredentialCount: 0,
    });
  });

  it('converts connection runtime states into canonical credential issues without hiding field issues', async () => {
    mockedGetConnectionReadiness.mockResolvedValue({
      workflowId: 'workflow-1',
      ready: false,
      rows: [],
      missing: [{
        workflowId: 'workflow-1',
        nodeId: 'external-1',
        nodeType: 'external_service',
        nodeLabel: 'External Action',
        operation: 'create',
        operationLabel: 'Create',
        provider: 'external',
        providerLabel: 'External',
        credentialTypeId: 'external_oauth2',
        credentialLabel: 'External OAuth2',
        authType: 'oauth2',
        requiredScopes: ['records:create'],
        status: 'runtime_missing',
        action: 'reconnect',
        source: 'connections',
        connectionId: '11111111-1111-4111-8111-111111111111',
        connectionName: 'Saved External',
        reason: 'A saved connection exists, but its runtime token is missing.',
        checkedAt: '2026-01-01T00:00:00.000Z',
      }],
      summary: {
        requiredCount: 1,
        readyCount: 0,
        missingCount: 0,
        invalidRefCount: 0,
        runtimeMissingCount: 1,
        missingScopeCount: 0,
        expiredCount: 0,
        revokedCount: 0,
        errorCount: 0,
      },
    });

    const readiness = await buildWorkflowReadinessEnvelope({
      workflowId: 'workflow-1',
      userId: 'user-1',
      nodes: [
        workflowNode('message-1', 'slack_message', 'Team Update', { channel: '#ops' }),
      ],
    });

    expect(readiness.code).toBe('EXECUTION_NOT_READY');
    expect(readiness.missingInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'message-1', fieldKey: 'message' }),
      ]),
    );
    expect(readiness.missingCredentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'external-1',
          provider: 'external',
          status: 'runtime_missing',
          action: 'reconnect',
          connectionName: 'Saved External',
        }),
      ]),
    );
  });
});
