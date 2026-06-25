/**
 * Unit tests for executeWorkflowHandler.
 *
 * Scope: input-validation boundary only (lines 18454–18470 of execute-workflow.ts).
 * All external I/O (DB, registry, Gemini, Redis) is mocked.
 *
 * Heavy suite: NOT run locally. Run in live post-deploy:
 *   npx jest src/api/execute-workflow.test.ts --runInBand --no-coverage
 */

import { Request, Response } from 'express';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock DB client — must be declared before importing the handler (jest.mock hoists)
jest.mock('../core/database/aws-db-client', () => ({
  getDbClient: jest.fn(() => ({
    select: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockResolvedValue({ id: 'mock-exec-id' }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    rpc: jest.fn().mockResolvedValue({}),
  })),
}));

// Mock unified node registry
jest.mock('../core/registry/unified-node-registry', () => ({
  unifiedNodeRegistry: {
    get: jest.fn().mockReturnValue(null),
    has: jest.fn().mockReturnValue(false),
    resolveAlias: jest.fn((t: string) => t),
    getAllTypes: jest.fn().mockReturnValue([]),
  },
}));

// Mock logger to suppress output during tests
jest.mock('../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    workflow: jest.fn(),
    validation: jest.fn(),
  },
  createChildLogger: jest.fn(() => ({
    info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
  })),
  httpLogger: jest.fn((_req: any, _res: any, next: any) => next()),
}));

// Mock heavy service imports that load at module init time
jest.mock('../services/ai/gemini-wallet-service', () => ({
  geminiWalletService: { getWalletForUser: jest.fn().mockResolvedValue(null) },
}));
jest.mock('../memory', () => ({
  getMemoryManager: jest.fn(() => ({ store: jest.fn(), retrieve: jest.fn() })),
}));
jest.mock('../core/cache/lru-node-outputs-cache', () => ({
  LRUNodeOutputsCache: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
  })),
}));
jest.mock('../credentials-system/connection-service', () => ({
  connectionService: { getConnection: jest.fn().mockResolvedValue(null) },
}));
jest.mock('../services/workflow-executor/distributed/reliability/circuit-breaker', () => ({
  circuitBreakerManager: { getBreaker: jest.fn(() => ({ execute: jest.fn() })) },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: Record<string, unknown> = {}): Partial<Request> {
  return {
    body,
    headers: { authorization: 'Bearer test-token' },
    ip: '127.0.0.1',
    requestId: 'test-request-id',
    user: undefined,
  } as any;
}

function makeRes(): { status: jest.Mock; json: jest.Mock; res: Partial<Response> } {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json, locals: {} } as any;
  return { status, json, res };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('executeWorkflowHandler — input validation', () => {
  let handler: (req: Request, res: Response) => Promise<void>;

  beforeAll(async () => {
    // Import after mocks are registered
    const mod = await import('./execute-workflow');
    handler = mod.default;
  });

  afterEach(() => jest.clearAllMocks());

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('returns 400 when workflowId is missing from body', async () => {
    const req = makeReq({});
    const { status, json, res } = makeRes();

    await handler(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'workflowId is required' });
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('returns 400 when body is present but workflowId is explicitly null', async () => {
    const req = makeReq({ workflowId: null, input: { foo: 'bar' } });
    const { status, json, res } = makeRes();

    await handler(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'workflowId is required' });
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('passes workflowId validation when workflowId is a non-empty string', async () => {
    // Provide a valid workflowId — handler will proceed to DB lookup.
    // DB mock returns empty array (workflow not found), so we expect
    // a non-400 response (likely 404 or 500), confirming validation passed.
    const req = makeReq({ workflowId: 'wf-test-abc-123' });
    const { status, res } = makeRes();

    await handler(req as Request, res as Response);

    // The important assertion: NOT the 400 validation error
    const calledWith400 = (status as jest.Mock).mock.calls.some(([code]) => code === 400);
    expect(calledWith400).toBe(false);
  });
});
