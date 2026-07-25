import distributedExecuteWorkflow from '../distributed-execute-workflow';

jest.mock('../../core/database/aws-db-client', () => ({
  getDbClient: jest.fn(),
}));

jest.mock('../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../services/workflow-lifecycle-manager', () => ({
  workflowLifecycleManager: {
    validateExecutionReady: jest.fn(),
    discoverNodeInputs: jest.fn(),
  },
}));

jest.mock('../../services/ai/credential-discovery-phase', () => ({
  credentialDiscoveryPhase: {
    discoverCredentials: jest.fn(),
  },
}));

jest.mock('../../core/readiness/workflow-readiness-aggregator', () => ({
  buildWorkflowReadinessEnvelope: jest.fn(),
  workflowReadinessResponseFields: jest.fn((readiness: any) => ({
    ready: readiness.ready,
    workflowId: readiness.workflowId,
    summary: readiness.summary,
    readinessIssues: readiness.readinessIssues,
    missingInputs: readiness.missingInputs,
    missingCredentials: readiness.missingCredentials,
    invalidInputs: readiness.invalidInputs,
    runtimeValidationIssues: readiness.runtimeValidationIssues,
    issues: readiness.issues,
    groupedIssues: readiness.groupedIssues,
    connectionReadiness: readiness.connectionReadiness,
  })),
}));

jest.mock('../workflow-setup-lifecycle', () => ({
  isSetupPending: jest.fn(() => false),
  setupPendingResponse: jest.fn((workflowId: string) => ({
    code: 'WORKFLOW_SETUP_PENDING',
    workflowId,
  })),
}));

const { getDbClient } = jest.requireMock('../../core/database/aws-db-client') as {
  getDbClient: jest.Mock;
};
const { workflowLifecycleManager } = jest.requireMock('../../services/workflow-lifecycle-manager') as {
  workflowLifecycleManager: {
    validateExecutionReady: jest.Mock;
    discoverNodeInputs: jest.Mock;
  };
};
const { credentialDiscoveryPhase } = jest.requireMock('../../services/ai/credential-discovery-phase') as {
  credentialDiscoveryPhase: {
    discoverCredentials: jest.Mock;
  };
};
const { buildWorkflowReadinessEnvelope } = jest.requireMock('../../core/readiness/workflow-readiness-aggregator') as {
  buildWorkflowReadinessEnvelope: jest.Mock;
};

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
  };
}

function workflow(nodes: any[], overrides: Record<string, unknown> = {}) {
  return {
    id: 'workflow-1',
    user_id: 'user-1',
    confirmed: true,
    status: 'active',
    phase: 'ready_for_execution',
    nodes,
    edges: [],
    ...overrides,
  };
}

function readiness(overrides: Record<string, unknown> = {}) {
  const readinessIssues = (overrides.readinessIssues as any[]) || [];
  const missingInputs = readinessIssues.filter((issue) => issue.kind === 'missing_input' || issue.kind === 'invalid_input');
  const missingCredentials = readinessIssues.filter((issue) => issue.kind === 'missing_credential');
  const invalidInputs = readinessIssues.filter((issue) => issue.kind === 'invalid_input');
  const runtimeValidationIssues = [...missingInputs, ...invalidInputs];
  const issues = Array.from(new Set(readinessIssues.map((issue) => issue.nodeId))).map((nodeId) => ({
    nodeId,
    nodeLabel: readinessIssues.find((issue) => issue.nodeId === nodeId)?.nodeLabel,
    nodeType: readinessIssues.find((issue) => issue.nodeId === nodeId)?.nodeType,
    missingFields: readinessIssues
      .filter((issue) => issue.nodeId === nodeId)
      .map((issue) => ({
        fieldName: issue.fieldKey || issue.provider || 'connection',
        fieldKey: issue.fieldKey || 'connection',
        friendlyLabel: issue.fieldLabel || issue.provider || 'Connection',
        fieldLabel: issue.fieldLabel || issue.provider || 'Connection',
        description: issue.reason || issue.message || '',
      })),
  }));
  return {
    ready: readinessIssues.length === 0,
    workflowId: 'workflow-1',
    code: readinessIssues.some((issue) => issue.kind === 'missing_credential') && missingInputs.length > 0
      ? 'EXECUTION_NOT_READY'
      : readinessIssues.some((issue) => issue.kind === 'missing_credential')
        ? 'EXECUTION_MISSING_CREDENTIALS'
        : readinessIssues.length > 0
          ? 'EXECUTION_MISSING_INPUTS'
          : null,
    readinessIssues,
    missingInputs,
    missingCredentials,
    invalidInputs,
    runtimeValidationIssues,
    missingInputsCount: missingInputs.length,
    missingCredentialsCount: missingCredentials.length,
    invalidInputsCount: invalidInputs.length,
    issues,
    groupedIssues: issues,
    summary: {
      totalNodes: 0,
      checkedNodes: 0,
      issueCount: readinessIssues.length,
      missingInputCount: missingInputs.length,
      missingCredentialCount: missingCredentials.length,
      invalidInputCount: invalidInputs.length,
      runtimeValidationIssueCount: runtimeValidationIssues.length,
    },
    ...overrides,
  };
}

function mockDb(workflowRow: any) {
  const query = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: workflowRow, error: null }),
  };
  const db = {
    from: jest.fn(() => query),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  };
  getDbClient.mockReturnValue(db);
  return db;
}

function mockResponse() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return {
    res: { status, json } as any,
    status,
    json,
  };
}

async function run(workflowRow: any) {
  mockDb(workflowRow);
  const { res, status, json } = mockResponse();
  await distributedExecuteWorkflow(
    {
      body: { workflowId: workflowRow.id, input: {} },
      headers: { authorization: 'Bearer token' },
    } as any,
    res,
  );
  return { status, json, body: json.mock.calls[0]?.[0] };
}

describe('distributedExecuteWorkflow canonical workflow readiness contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    workflowLifecycleManager.validateExecutionReady.mockResolvedValue({
      ready: true,
      errors: [],
      missingCredentials: [],
      validationIssues: [],
    });
    workflowLifecycleManager.discoverNodeInputs.mockReturnValue({ inputs: [] });
    credentialDiscoveryPhase.discoverCredentials.mockResolvedValue({
      requiredCredentials: [],
      satisfiedCredentials: [],
      missingCredentials: [],
      allDiscovered: true,
      errors: [],
      warnings: [],
    });
    buildWorkflowReadinessEnvelope.mockResolvedValue(readiness());
  });

  it('returns every operation-aware missing field across the workflow', async () => {
    buildWorkflowReadinessEnvelope.mockResolvedValue(readiness({
      readinessIssues: [
        {
          kind: 'missing_input',
          code: 'NODE_MISSING_INPUT',
          nodeId: 'node-1',
          nodeType: 'service_action',
          nodeLabel: 'Create Record',
          operation: 'create',
          operationLabel: 'Create',
          fieldKey: 'payload',
          fieldLabel: 'Payload',
          message: 'Payload is required for Create.',
        },
        {
          kind: 'missing_input',
          code: 'NODE_MISSING_INPUT',
          nodeId: 'node-2',
          nodeType: 'message_action',
          nodeLabel: 'Send Message',
          operation: 'send',
          operationLabel: 'Send',
          fieldKey: 'message',
          fieldLabel: 'Message',
          message: 'Message is required for Send.',
        },
      ],
    }));

    const { status, body } = await run(workflow([
      workflowNode('node-1', 'service_action', 'Create Record', { operation: 'create' }),
      workflowNode('node-2', 'message_action', 'Send Message', { operation: 'send' }),
    ]));

    expect(status).toHaveBeenCalledWith(400);
    expect(body.code).toBe('EXECUTION_MISSING_INPUTS');
    expect(body.readinessIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'node-1', operationLabel: 'Create', fieldLabel: 'Payload' }),
        expect.objectContaining({ nodeId: 'node-2', operationLabel: 'Send', fieldLabel: 'Message' }),
      ]),
    );
    expect(body.details.groupedIssues).toHaveLength(2);
    expect(body.details.missingCredentials).toEqual([]);
  });

  it('returns missing connection guidance only when the canonical issue is credential-related', async () => {
    buildWorkflowReadinessEnvelope.mockResolvedValue(readiness({
      readinessIssues: [{
        kind: 'missing_credential',
        code: 'NODE_MISSING_CREDENTIAL',
        nodeId: 'node-1',
        nodeType: 'service_action',
        nodeLabel: 'Create Record',
        operation: 'create',
        operationLabel: 'Create',
        provider: 'external',
        credentialType: 'oauth2',
        status: 'missing',
        action: 'connect',
        message: 'Create Record needs External OAuth.',
        reason: 'No active connection was found.',
      }],
    }));

    const { status, body } = await run(workflow([
      workflowNode('node-1', 'service_action', 'Create Record', { operation: 'create', payload: {} }),
    ]));

    expect(status).toHaveBeenCalledWith(400);
    expect(body.code).toBe('EXECUTION_MISSING_CREDENTIALS');
    expect(body.missingInputs).toEqual([]);
    expect(body.missingCredentials[0]).toMatchObject({
      nodeId: 'node-1',
      provider: 'external',
      status: 'missing',
      action: 'connect',
    });
  });

  it('does not overwrite field blockers with generic credential guidance while phase is not ready', async () => {
    buildWorkflowReadinessEnvelope.mockResolvedValue(readiness({
      readinessIssues: [{
        kind: 'missing_input',
        code: 'NODE_MISSING_INPUT',
        nodeId: 'node-1',
        nodeType: 'message_action',
        nodeLabel: 'Send Message',
        operation: 'send',
        operationLabel: 'Send',
        fieldKey: 'message',
        fieldLabel: 'Message',
        message: 'Message is required for Send.',
      }],
    }));

    const { status, body } = await run(workflow([
      workflowNode('node-1', 'message_action', 'Send Message', { operation: 'send' }),
    ], { phase: 'draft', status: 'draft' }));

    expect(status).toHaveBeenCalledWith(400);
    expect(body.code).toBe('EXECUTION_MISSING_INPUTS');
    expect(body.message).toContain('Send Message.Message');
    expect(body.missingCredentials).toEqual([]);
    expect(body.details.readinessIssues[0]).toMatchObject({
      nodeId: 'node-1',
      fieldLabel: 'Message',
    });
  });
});
