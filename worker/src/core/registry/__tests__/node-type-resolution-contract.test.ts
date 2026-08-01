/**
 * Node-type resolution — one contract, every site that reads a node's type.
 *
 * React Flow stores the RENDERER type in `node.type` (`'custom'` for nearly every node) and
 * the business type in `node.data.type`. `unifiedNodeRegistry.get()` is deliberately strict:
 * canonical names only, no alias translation. Read the type wrongly and the registry lookup
 * misses — and every site here fails SILENTLY when it does:
 *
 *   - upstream-field-resolver: contributes no fields, so downstream nodes are asked for a
 *     value their upstream already carries ("why is it asking me again?")
 *   - property-population-stage: `continue`s past the node, so the AI never configures it
 *   - run-node / run: 400 "Unknown node type "custom""
 *   - field-plan: an entry with five empty groups, which reads as a grouping bug
 *
 * These tests use the REAL registry deliberately. The existing suites for three of these
 * sites mock `unifiedNodeRegistry`, which is precisely why this class of bug survived them:
 * a mocked `get()` resolves whatever the test hands it.
 */

import { resolveNodeType, nodeTypeOf } from '../node-type-resolution';
import { unifiedNodeRegistry } from '../unified-node-registry';
import { resolveUpstreamFields } from '../../graph/upstream-field-resolver';
import { runPropertyPopulationStage } from '../../../services/ai/stages/property-population-stage';
import runNode from '../../../api/workflow-build/run-node';
import { nodeTypeOf as runNodeTypeOf } from '../../../api/workflow-build/run';
import { executeNode } from '../../../api/execute-workflow';
import { __resetMemoryStore } from '../../execution/build-run-state';
import type { Response } from 'express';

jest.mock('../../database/db-client', () => ({ getDbClient: () => ({}) }));
jest.mock('../../../api/execute-workflow', () => ({ executeNode: jest.fn() }));
jest.mock('../../../services/ai/stages/property-population-stage-client', () => ({
  runPropertyPopulationJsonRemote: jest.fn(async () => null),
}));
jest.mock('../../../services/ai/gemini-orchestrator', () => ({
  geminiOrchestrator: { processRequest: jest.fn(async () => '{}') },
}));

const mockedExecute = executeNode as jest.MockedFunction<typeof executeNode>;

/** A node exactly as the frontend normalizer emits it (node-type-normalizer.ts:103-118). */
function canvasNode(businessType: string, id: string, config: Record<string, unknown> = {}) {
  return {
    id,
    type: 'custom',
    data: { type: businessType, label: businessType, category: 'utility', config },
  };
}

/** A node exactly as the server emits it (capability-selection/generate.ts:122-135). */
function serverNode(businessType: string, id: string, config: Record<string, unknown> = {}) {
  return {
    id,
    type: businessType,
    data: { type: businessType, label: businessType, category: 'utility', config },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetMemoryStore();
  mockedExecute.mockResolvedValue({ rows: [{ id: 1 }] } as never);
});

// ─── The helper itself ───────────────────────────────────────────────────────

describe('resolveNodeType', () => {
  it('resolves the business type out of a canvas node whose type is "custom"', () => {
    const result = resolveNodeType(canvasNode('google_gmail', 'n1'));
    expect(result.nodeType).toBe('google_gmail');
    expect(result.definition).toBeDefined();
    expect(result.resolved).toBe(true);
  });

  it('resolves a server-shaped node, where the business type is in `type`', () => {
    const result = resolveNodeType(serverNode('google_sheets', 'n1'));
    expect(result.nodeType).toBe('google_sheets');
    expect(result.resolved).toBe(true);
  });

  it('translates an alias in either position, because get() will not', () => {
    expect(unifiedNodeRegistry.get('gmail')).toBeUndefined(); // strict, by design

    expect(resolveNodeType(canvasNode('gmail', 'n1')).nodeType).toBe('google_gmail');
    expect(resolveNodeType({ id: 'n2', type: 'gmail' } as never).nodeType).toBe('google_gmail');
  });

  it('prefers the business type when both positions hold a resolvable type', () => {
    const node = { id: 'n1', type: 'google_sheets', data: { type: 'google_gmail' } };
    expect(resolveNodeType(node as never).nodeType).toBe('google_gmail');
  });

  it('reports an unresolvable type as it arrived, so a reader can act on it', () => {
    const result = resolveNodeType(canvasNode('totally_unknown_node', 'n1'));
    expect(result.resolved).toBe(false);
    expect(result.definition).toBeUndefined();
    expect(result.nodeType).toBe('totally_unknown_node');
    expect(result.rawNodeType).toBe('totally_unknown_node');
  });

  it('survives a node with no type at all', () => {
    const result = resolveNodeType({ id: 'n1' } as never);
    expect(result.resolved).toBe(false);
    expect(result.nodeType).toBe('');
    expect(nodeTypeOf({ id: 'n1' } as never)).toBe('');
  });

  it('never returns "custom" as a node type', () => {
    for (const node of [canvasNode('google_gmail', 'n1'), canvasNode('manual_trigger', 'n2')]) {
      expect(resolveNodeType(node).nodeType).not.toBe('custom');
      expect(nodeTypeOf(node)).not.toBe('custom');
    }
  });
});

// ─── Site 1: upstream attribution (the live bug) ─────────────────────────────

describe('resolveUpstreamFields — canvas-shaped graph', () => {
  const edges = [{ source: 'n1', target: 'n2' }];

  it('attributes upstream fields for a graph of canvas nodes', () => {
    const graph = {
      nodes: [canvasNode('manual_trigger', 'n1'), canvasNode('google_sheets', 'n2')],
      edges,
    };

    const result = resolveUpstreamFields(graph, 'n2');

    // manual_trigger declares timestamp / triggerType / inputData.
    expect(result.fields.length).toBeGreaterThan(0);
    expect(result.names.has('inputData')).toBe(true);
    expect(result.fields.every((f) => f.producedByNodeId === 'n1')).toBe(true);
    expect(result.fields[0].producedByNodeType).toBe('manual_trigger');
  });

  it('gives a canvas graph the same fields as the identical server-shaped graph', () => {
    const asCanvas = resolveUpstreamFields(
      { nodes: [canvasNode('manual_trigger', 'n1'), canvasNode('google_sheets', 'n2')], edges },
      'n2',
    );
    const asServer = resolveUpstreamFields(
      { nodes: [serverNode('manual_trigger', 'n1'), serverNode('google_sheets', 'n2')], edges },
      'n2',
    );

    expect([...asCanvas.names].sort()).toEqual([...asServer.names].sort());
  });

  it('resolves an aliased producer', () => {
    const result = resolveUpstreamFields(
      { nodes: [canvasNode('manual_trigger', 'n1'), canvasNode('gmail', 'n2')], edges },
      'n2',
    );
    expect(result.fields.length).toBeGreaterThan(0);
  });
});

// ─── Site 2: the AI build stage ──────────────────────────────────────────────

describe('property-population-stage — canvas-shaped workflow', () => {
  it('does not skip a canvas node, and asks the registry about its business type', async () => {
    const spy = jest.spyOn(unifiedNodeRegistry, 'getBuildValueContext');

    await runPropertyPopulationStage({
      workflow: {
        nodes: [canvasNode('manual_trigger', 'n1'), canvasNode('google_gmail', 'n2')],
        edges: [{ source: 'n1', target: 'n2' }],
      } as never,
      userIntent: 'email me when the form is submitted',
      structuralPrompt: 'manual_trigger -> google_gmail',
    });

    // A skipped node never reaches getBuildValueContext at all.
    const askedFor = spy.mock.calls.map((call) => call[0]);
    expect(askedFor).toContain('google_gmail');
    expect(askedFor).not.toContain('custom');
    spy.mockRestore();
  });
});

// ─── Site 3 & 4: the two build-run endpoints ─────────────────────────────────

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: any };
}

describe('run-node — canvas-shaped node', () => {
  it('runs a canvas node instead of rejecting it as an unknown type', async () => {
    const res = mockRes();
    const node = canvasNode('google_sheets', 'n1', { operation: 'read' });

    await runNode(
      { user: { id: 'user-1' }, body: { nodes: [node], edges: [], nodeId: 'n1' } } as never,
      res,
    );

    expect(res.body?.error).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(mockedExecute).toHaveBeenCalledTimes(1);
  });
});

describe('run — node type resolution', () => {
  it('resolves canvas, server and aliased shapes to the canonical type', () => {
    expect(runNodeTypeOf(canvasNode('google_gmail', 'n1') as never)).toBe('google_gmail');
    expect(runNodeTypeOf(serverNode('google_sheets', 'n2') as never)).toBe('google_sheets');
    expect(runNodeTypeOf(canvasNode('gmail', 'n3') as never)).toBe('google_gmail');
  });
});
