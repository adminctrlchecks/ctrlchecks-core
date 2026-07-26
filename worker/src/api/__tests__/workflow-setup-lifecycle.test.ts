import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { runCommitSetupWorkflow, setupDraftWorkflowHandler } from '../workflow-setup-lifecycle';
import { getDbClient } from '../../core/database/aws-db-client';
import { requireAuthenticatedUser } from '../../core/utils/check-google-auth';
import { workflowLifecycleManager } from '../../services/workflow-lifecycle-manager';
import { subscriptionService } from '../../services/subscription-service';
import { geminiWalletService } from '../../services/ai/gemini-wallet-service';
import { getCacheRedisClient, invalidateWorkflowDbCache } from '../../middleware/redisGetCache';

jest.mock('../../core/database/aws-db-client', () => ({
  getDbClient: jest.fn(),
}));

jest.mock('../../core/utils/check-google-auth', () => ({
  requireAuthenticatedUser: jest.fn(),
}));

jest.mock('../../services/workflow-lifecycle-manager', () => ({
  workflowLifecycleManager: {
    validateExecutionReady: jest.fn(),
    discoverNodeInputs: jest.fn(),
  },
}));

jest.mock('../../services/subscription-service', () => ({
  subscriptionService: {
    ensureFreeSubscription: jest.fn(),
    canCreateWorkflow: jest.fn(),
    getSubscriptionUsage: jest.fn(),
    incrementWorkflowCount: jest.fn(),
  },
}));

jest.mock('../../services/ai/gemini-wallet-service', () => ({
  geminiWalletService: {
    isActive: jest.fn(),
  },
}));

jest.mock('../../middleware/redisGetCache', () => ({
  getCacheRedisClient: jest.fn(),
  invalidateWorkflowDbCache: jest.fn(),
}));

describe('workflow setup lifecycle', () => {
  let selectedWorkflow: any;
  let updatedPayload: any;

  beforeEach(() => {
    selectedWorkflow = null;
    updatedPayload = null;
    jest.clearAllMocks();

    (requireAuthenticatedUser as jest.Mock).mockReturnValue('user-1');
    (workflowLifecycleManager.validateExecutionReady as any).mockResolvedValue({
      ready: false,
      errors: ['Missing required setup value before execution'],
      missingCredentials: [],
      structurallyValid: false,
      validationIssues: [],
    });
    (workflowLifecycleManager.discoverNodeInputs as any).mockReturnValue({
      inputs: [
        {
          nodeId: 'action-1',
          nodeType: 'javascript',
          fieldName: 'requiredField',
          required: true,
        },
      ],
    });
    (geminiWalletService.isActive as any).mockResolvedValue(false);
    (subscriptionService.ensureFreeSubscription as any).mockResolvedValue(undefined);
    (subscriptionService.canCreateWorkflow as any).mockResolvedValue(true);
    (subscriptionService.incrementWorkflowCount as any).mockResolvedValue(undefined);
    (subscriptionService.getSubscriptionUsage as any).mockResolvedValue({ workflowLimit: 5 });
    (getCacheRedisClient as any).mockResolvedValue(null);
    (invalidateWorkflowDbCache as any).mockResolvedValue(undefined);

    const db = {
      from: jest.fn(() => {
        const chain: any = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.single = jest.fn(async () => ({ data: selectedWorkflow, error: null }));
        chain.update = jest.fn((payload: any) => {
          updatedPayload = payload;
          return chain;
        });
        return chain;
      }),
    };
    (getDbClient as jest.Mock).mockReturnValue(db);
  });

  it('commits an editor-openable workflow when setup inputs are still missing', async () => {
    selectedWorkflow = {
      id: 'wf-1',
      user_id: 'user-1',
      setup_completed: false,
      metadata: { aiSetup: { pending: true } },
      nodes: [
        {
          id: 'trigger-1',
          type: 'manual_trigger',
          data: { label: 'Manual Trigger', type: 'manual_trigger', category: 'trigger', config: {} },
        },
        {
          id: 'action-1',
          type: 'javascript',
          data: { label: 'Generic Action', type: 'javascript', category: 'action', config: {} },
        },
      ],
      edges: [{ id: 'edge-1', source: 'trigger-1', target: 'action-1' }],
    };

    const result = await runCommitSetupWorkflow({ params: { workflowId: 'wf-1' } } as any);
    const body = result.body as any;

    expect(result.statusCode).toBe(200);
    expect(body).toMatchObject({
      success: true,
      workflowId: 'wf-1',
      ready: false,
      setupPending: true,
      inputsPending: true,
      credentialsPending: false,
      phase: 'configuring_inputs',
    });
    expect(updatedPayload).toMatchObject({
      status: 'active',
      phase: 'configuring_inputs',
      confirmed: true,
      setup_completed: true,
      setup_stage: 'inputs_pending',
    });
    expect(updatedPayload.metadata.aiSetup.pending).toBe(false);
    expect(updatedPayload.metadata.aiSetup.stage).toBe('inputs_pending');
    expect(updatedPayload.metadata.aiSetup.readiness.setupReadiness.missingInputs).toHaveLength(1);
  });

  it('creates a setup draft when execution/save validation still has unresolved setup fields', async () => {
    let insertedPayload: any;
    const db = {
      from: jest.fn(() => {
        const chain: any = {};
        chain.insert = jest.fn((payload: any) => {
          insertedPayload = payload;
          return chain;
        });
        chain.select = jest.fn(() => chain);
        chain.single = jest.fn(async () => ({ data: { id: 'draft-1', ...insertedPayload }, error: null }));
        return chain;
      }),
    };
    (getDbClient as jest.Mock).mockReturnValue(db);

    const res: any = {
      statusCode: 200,
      body: undefined,
      status: jest.fn((code: number) => {
        res.statusCode = code;
        return res;
      }),
      json: jest.fn((body: unknown) => {
        res.body = body;
        return res;
      }),
    };

    await setupDraftWorkflowHandler({
      body: {
        name: 'Draft with missing setup',
        nodes: [
          {
            id: 'trigger-1',
            type: 'manual_trigger',
            data: { label: 'Manual Trigger', type: 'manual_trigger', category: 'trigger', config: {} },
          },
          {
            id: 'condition-1',
            type: 'if_else',
            data: {
              label: 'Condition',
              type: 'if_else',
              category: 'logic',
              config: { _fillMode: { conditions: 'runtime_ai' } },
            },
          },
        ],
        edges: [{ id: 'edge-1', source: 'trigger-1', target: 'condition-1' }],
      },
    } as any, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(true);
    expect(res.body.validation.valid).toBe(true);
    expect(res.body.editorOpenReadiness.ready).toBe(true);
    expect(res.body.diagnostics.legacyValidation.valid).toBe(false);
    expect(insertedPayload.setup_completed).toBe(false);
  });

  it('blocks commit only when the graph is not safe to open', async () => {
    selectedWorkflow = {
      id: 'wf-2',
      user_id: 'user-1',
      setup_completed: false,
      metadata: { aiSetup: { pending: true } },
      nodes: [
        {
          id: 'trigger-1',
          type: 'manual_trigger',
          data: { label: 'Manual Trigger', type: 'manual_trigger', category: 'trigger', config: {} },
        },
      ],
      edges: [{ id: 'edge-1', source: 'trigger-1', target: 'missing-node' }],
    };

    const result = await runCommitSetupWorkflow({ params: { workflowId: 'wf-2' } } as any);
    const body = result.body as any;

    expect(result.statusCode).toBe(409);
    expect(body.code).toBe('WORKFLOW_EDITOR_OPEN_BLOCKED');
    expect(body.details.editorOpenReadiness.errors.some((e: string) => e.includes('references a missing node'))).toBe(
      true
    );
    expect(updatedPayload).toBeNull();
  });
});
