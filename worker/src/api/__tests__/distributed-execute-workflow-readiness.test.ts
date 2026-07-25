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

jest.mock('../../services/execution-preflight', () => ({
  executionPreflight: jest.fn(),
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
const { executionPreflight } = jest.requireMock('../../services/execution-preflight') as {
  executionPreflight: jest.Mock;
};

function supabaseNode(
  id: string,
  label: string,
  config: Record<string, unknown>,
  connectionRefs?: Record<string, string>,
) {
  return {
    id,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      type: 'supabase',
      label,
      category: 'database',
      config,
      ...(connectionRefs ? { connectionRefs } : {}),
    },
  };
}

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

function workflow(nodes: any[]) {
  return {
    id: 'workflow-1',
    user_id: 'user-1',
    confirmed: true,
    status: 'active',
    phase: 'ready_for_execution',
    nodes,
    edges: [],
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

describe('distributedExecuteWorkflow readiness contract', () => {
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
    executionPreflight.mockResolvedValue({ ok: true, failures: [] });
  });

  it('returns missing Supabase Insert data, not credentials, when a saved connection is active', async () => {
    credentialDiscoveryPhase.discoverCredentials.mockResolvedValue({
      requiredCredentials: [{
        provider: 'supabase',
        type: 'api_key',
        vaultKey: 'supabase',
        displayName: 'Supabase',
        required: true,
        satisfied: true,
        nodeIds: ['supabase-1'],
        nodeTypes: ['supabase'],
      }],
      satisfiedCredentials: [{
        provider: 'supabase',
        type: 'api_key',
        vaultKey: 'supabase',
        displayName: 'Supabase',
        required: true,
        satisfied: true,
        nodeIds: ['supabase-1'],
        nodeTypes: ['supabase'],
      }],
      missingCredentials: [],
      allDiscovered: true,
      errors: [],
      warnings: [],
    });
    executionPreflight.mockResolvedValue({
      ok: false,
      failures: [{
        nodeId: 'supabase-1',
        nodeName: 'Supabase',
        nodeType: 'supabase',
        provider: 'supabase',
        requiredScopes: [],
        error: { message: 'Supabase is not connected' },
      }],
    });
    const row = workflow([
      supabaseNode(
        'supabase-1',
        'Supabase',
        { operation: 'insert', table: 'users' },
        { supabase_api_key: 'conn-active' },
      ),
    ]);

    const { status, body } = await run(row);

    expect(status).toHaveBeenCalledWith(400);
    expect(body.code).toBe('EXECUTION_MISSING_INPUTS');
    expect(body.details.readinessIssues).toHaveLength(1);
    expect(body.details.readinessIssues[0]).toMatchObject({
      kind: 'missing_input',
      nodeId: 'supabase-1',
      nodeType: 'supabase',
      operation: 'insert',
      operationLabel: 'Insert',
      fieldKey: 'data',
      fieldLabel: 'Data',
    });
    expect(body.details.missingCredentials).toEqual([]);
    expect(body.details.executionPreflightMissingCredentials).toEqual([]);
    expect(body.details.executionPreflightIgnoredCredentialsCount).toBe(1);
  });

  it('returns canonical credential guidance when the connection is truly missing', async () => {
    credentialDiscoveryPhase.discoverCredentials.mockResolvedValue({
      requiredCredentials: [],
      satisfiedCredentials: [],
      missingCredentials: [{
        provider: 'supabase',
        type: 'api_key',
        vaultKey: 'supabase',
        displayName: 'Supabase',
        required: true,
        satisfied: false,
        nodeIds: ['supabase-1'],
        nodeTypes: ['supabase'],
      }],
      allDiscovered: true,
      errors: [],
      warnings: [],
    });
    const row = workflow([
      supabaseNode('supabase-1', 'Supabase', {
        operation: 'insert',
        table: 'users',
        data: { name: 'Ada' },
      }),
    ]);

    const { status, body } = await run(row);

    expect(status).toHaveBeenCalledWith(400);
    expect(body.code).toBe('EXECUTION_MISSING_CREDENTIALS');
    expect(body.details.readinessIssues).toHaveLength(1);
    expect(body.details.readinessIssues[0]).toMatchObject({
      kind: 'missing_credential',
      nodeId: 'supabase-1',
      provider: 'supabase',
    });
    expect(body.details.missingInputs).toEqual([]);
  });

  it('includes both field and credential blockers without credential-first masking', async () => {
    credentialDiscoveryPhase.discoverCredentials.mockResolvedValue({
      requiredCredentials: [],
      satisfiedCredentials: [],
      missingCredentials: [{
        provider: 'supabase',
        type: 'api_key',
        vaultKey: 'supabase',
        displayName: 'Supabase',
        required: true,
        satisfied: false,
        nodeIds: ['supabase-1'],
        nodeTypes: ['supabase'],
      }],
      allDiscovered: true,
      errors: [],
      warnings: [],
    });
    const row = workflow([
      supabaseNode('supabase-1', 'Supabase', { operation: 'insert', table: 'users' }),
    ]);

    const { body } = await run(row);

    expect(body.code).toBe('EXECUTION_NOT_READY');
    expect(body.details.readinessIssues.some((issue: any) => issue.kind === 'missing_input')).toBe(true);
    expect(body.details.readinessIssues.some((issue: any) => issue.kind === 'missing_credential')).toBe(true);
  });

  it('lists every missing operation-aware field across nodes', async () => {
    const row = workflow([
      supabaseNode('supabase-1', 'Insert User', { operation: 'insert', table: 'users' }),
      supabaseNode('supabase-2', 'Insert Order', { operation: 'insert', table: 'orders' }),
    ]);

    const { body } = await run(row);

    expect(body.code).toBe('EXECUTION_MISSING_INPUTS');
    expect(body.details.readinessIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'supabase-1', fieldKey: 'data', operation: 'insert' }),
        expect.objectContaining({ nodeId: 'supabase-2', fieldKey: 'data', operation: 'insert' }),
      ]),
    );
    expect(body.details.issues).toHaveLength(2);
  });

  it('suppresses same-node preflight credential fallbacks for any node with concrete field blockers', async () => {
    executionPreflight.mockResolvedValue({
      ok: false,
      failures: [{
        nodeId: 'slack-1',
        nodeName: 'Slack Message',
        nodeType: 'slack_message',
        provider: 'slack',
        requiredScopes: ['chat:write'],
        error: { message: 'Slack is not connected' },
      }],
    });
    const row = workflow([
      workflowNode('slack-1', 'slack_message', 'Slack Message', {
        channel: '#alerts',
      }),
    ]);

    const { body } = await run(row);

    expect(body.code).toBe('EXECUTION_MISSING_INPUTS');
    expect(body.details.readinessIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'missing_input',
          nodeId: 'slack-1',
          nodeType: 'slack_message',
          fieldKey: 'message',
        }),
      ]),
    );
    expect(body.details.missingCredentials).toEqual([]);
    expect(body.details.executionPreflightMissingCredentials).toEqual([]);
    expect(body.details.executionPreflightIgnoredCredentialsCount).toBe(1);
  });

  it('merges executionPreflight credential failures into canonical readiness details when no concrete field blocker exists', async () => {
    executionPreflight.mockResolvedValue({
      ok: false,
      failures: [{
        nodeId: 'supabase-1',
        nodeName: 'Supabase',
        nodeType: 'supabase',
        provider: 'supabase',
        requiredScopes: [],
        error: { message: 'Supabase is not connected' },
      }],
    });
    const row = workflow([
      supabaseNode('supabase-1', 'Supabase', {
        operation: 'insert',
        table: 'users',
        data: { name: 'Ada' },
      }),
    ]);

    const { body } = await run(row);

    expect(body.code).toBe('EXECUTION_MISSING_CREDENTIALS');
    expect(body.details.readinessIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'missing_credential', provider: 'supabase' }),
      ]),
    );
    expect(body.details.executionPreflightMissingCredentials).toHaveLength(1);
  });
});
