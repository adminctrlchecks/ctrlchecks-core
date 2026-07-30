/**
 * POST /api/workflow-build/field-plan — against the REAL registry.
 *
 * Deliberately unmocked. The frontend suite feeds the card a hand-written plan with correct
 * field names, which proves the display logic and nothing about how the plan is produced.
 * That blind spot let a real defect ship: saved workflows call the Gmail node `gmail`, the
 * registry's `get()` accepts canonical types only, so the lookup missed and the endpoint
 * returned an entry with five EMPTY groups. The UI dutifully rendered three empty sections
 * and swept every field into its leftover bucket — which read as a grouping bug, not a
 * lookup failure.
 *
 * These tests exercise the lookup itself, which is the only place that class of bug lives.
 */

import type { Response } from 'express';
import fieldPlan from '../field-plan';

jest.mock('../../../core/database/db-client', () => ({ getDbClient: () => ({}) }));

interface PlanNode {
  nodeId: string;
  nodeType: string;
  operation?: string;
  unresolvedNodeType?: string;
  diagnostics: string[];
  groups: Record<string, Array<{ fieldName: string; required: boolean }>>;
}

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

async function planFor(nodes: unknown[]) {
  const res = mockRes();
  await fieldPlan(
    { user: { id: 'user-1' }, body: { nodes, edges: [] } } as never,
    res,
  );
  return res.body as { nodes: PlanNode[] };
}

const allFieldNames = (node: PlanNode) =>
  Object.values(node.groups).flatMap((fields) => fields.map((f) => f.fieldName));

describe('field-plan — registry lookup', () => {
  it('plans a node referenced by its canonical type', async () => {
    const body = await planFor([
      { id: 'n1', type: 'google_gmail', data: { config: { operation: 'send' } } },
    ]);
    const node = body.nodes[0];

    expect(node.diagnostics).toEqual([]);
    expect(node.operation).toBe('send');
    expect(allFieldNames(node)).toEqual(expect.arrayContaining(['subject', 'body']));
  });

  /**
   * The regression this file exists for. `gmail` is an alias the registry knows about and
   * `get()` deliberately refuses to translate; the endpoint has to resolve it first.
   */
  it('plans a node referenced by an alias, exactly as the canonical one', async () => {
    const [aliased, canonical] = await Promise.all([
      planFor([{ id: 'n1', type: 'gmail', data: { config: { operation: 'send' } } }]),
      planFor([{ id: 'n1', type: 'google_gmail', data: { config: { operation: 'send' } } }]),
    ]);

    expect(aliased.nodes[0].diagnostics).toEqual([]);
    expect(aliased.nodes[0].groups).toEqual(canonical.nodes[0].groups);
  });

  it('never returns an entry with every group empty for a node it resolved', async () => {
    // The exact shape of the bug: no error, no diagnostic, and nothing in any bucket, so
    // the card renders three empty sections and looks merely mis-grouped.
    const body = await planFor([
      { id: 'n1', type: 'gmail', data: { config: { operation: 'send' } } },
    ]);
    const node = body.nodes[0];

    expect(node.diagnostics).toEqual([]);
    expect(allFieldNames(node).length).toBeGreaterThan(0);
  });

  it('marks the fields the chosen operation requires', async () => {
    const body = await planFor([
      { id: 'n1', type: 'gmail', data: { config: { operation: 'send' } } },
    ]);
    const required = Object.values(body.nodes[0].groups)
      .flat()
      .filter((f) => f.required)
      .map((f) => f.fieldName);

    expect(required).toEqual(expect.arrayContaining(['subject', 'body']));
  });

  it('reports a genuinely unknown type by the name that was sent', async () => {
    const body = await planFor([{ id: 'n1', type: 'not_a_real_node', data: {} }]);

    expect(body.nodes[0].unresolvedNodeType).toBe('not_a_real_node');
    expect(body.nodes[0].diagnostics).toHaveLength(1);
    expect(body.nodes[0].diagnostics[0]).toContain('not_a_real_node');
  });

  /**
   * The shape a stored workflow actually has. `type` is React Flow's RENDERER key —
   * `'custom'` for every node on the canvas — and the business type lives in `data.type`.
   * Reading `type` first resolved every node in a saved workflow to `'custom'`, a type no
   * registry will ever know, and the whole graph came back with empty groups.
   */
  it('prefers data.type over the React Flow renderer type', async () => {
    const body = await planFor([
      { id: 'n1', type: 'custom', data: { type: 'google_gmail', config: { operation: 'send' } } },
    ]);
    const node = body.nodes[0];

    expect(node.unresolvedNodeType).toBeUndefined();
    expect(node.nodeType).toBe('google_gmail');
    expect(allFieldNames(node)).toEqual(expect.arrayContaining(['subject', 'body']));
  });

  it('resolves an alias sitting behind the renderer type', async () => {
    const body = await planFor([
      { id: 'n1', type: 'custom', data: { type: 'gmail', config: { operation: 'send' } } },
    ]);

    expect(body.nodes[0].unresolvedNodeType).toBeUndefined();
    expect(allFieldNames(body.nodes[0]).length).toBeGreaterThan(0);
  });

  /**
   * `generated_runtime_contract` means the node declared no explicit operation contract so a
   * default was derived — a healthy node. It must not read as a failure: gating the UI on
   * `diagnostics.length` stripped the three sections from nodes that had resolved perfectly.
   */
  it('does not mark a node unresolved just because it carries an informational diagnostic', async () => {
    const body = await planFor([{ id: 'n1', type: 'custom', data: { type: 'form' } }]);
    const node = body.nodes[0];

    expect(node.unresolvedNodeType).toBeUndefined();
    expect(node.diagnostics.length).toBeGreaterThan(0);
    expect(allFieldNames(node)).toEqual(expect.arrayContaining(['formTitle', 'fields']));
  });

  it('reads the type from data.type when the node carries none at the top level', async () => {
    const body = await planFor([
      { id: 'n1', data: { type: 'gmail', config: { operation: 'send' } } },
    ]);

    expect(body.nodes[0].diagnostics).toEqual([]);
    expect(allFieldNames(body.nodes[0]).length).toBeGreaterThan(0);
  });
});
