/**
 * Nested upstream fields are addressable (plan RC-4).
 *
 * The walk read `effective.properties` at the TOP LEVEL only. `manual_trigger` declares
 * `timestamp`, `triggerType`, `inputData` — so a `spreadsheetId` living inside `inputData` was
 * invisible, and the best reference the resolver could ever offer downstream was
 * `{{$json.inputData}}`, never `{{$json.inputData.spreadsheetId}}`.
 *
 * With no usable reference, the Sheets node had nothing to link to and asked the user for a
 * value the node above already carried — the "why is it asking me again?" complaint.
 *
 * Deliberately against the REAL registry: the nested shape comes from the upstream node's
 * INSTANCE CONFIG, exactly as `form`'s output shape already comes from `config.fields`. A
 * mocked schema would prove nothing about that.
 */

import { resolveUpstreamFields } from '../upstream-field-resolver';

const edges = [{ source: 'trigger_1', target: 'sheets_1' }];

function graphWithTriggerConfig(config: Record<string, unknown>) {
  return {
    nodes: [
      {
        id: 'trigger_1',
        type: 'manual_trigger',
        data: { type: 'manual_trigger', label: 'Manual Trigger', config },
      },
      {
        id: 'sheets_1',
        type: 'google_sheets',
        data: { type: 'google_sheets', label: 'Sheets', config: {} },
      },
    ],
    edges,
  };
}

describe('resolveUpstreamFields — nested object properties', () => {
  it('offers a nested identifier as an addressable path', () => {
    const result = resolveUpstreamFields(
      graphWithTriggerConfig({ inputData: { spreadsheetId: '', sheetName: '', submittedBy: 'Ada' } }),
      'sheets_1',
    );

    expect(result.names.has('inputData.spreadsheetId')).toBe(true);
    expect(result.names.has('inputData.sheetName')).toBe(true);

    const nested = result.fields.find((f) => f.name === 'inputData.spreadsheetId');
    expect(nested?.producedByNodeId).toBe('trigger_1');
    expect(nested?.producedByNodeType).toBe('manual_trigger');
    expect(nested?.producedByNodeLabel).toBe('Manual Trigger');
  });

  it('keeps every top-level field it already offered', () => {
    const result = resolveUpstreamFields(
      graphWithTriggerConfig({ inputData: { spreadsheetId: '' } }),
      'sheets_1',
    );

    // manual_trigger's declared output schema.
    expect(result.names.has('timestamp')).toBe(true);
    expect(result.names.has('triggerType')).toBe(true);
    expect(result.names.has('inputData')).toBe(true);
  });

  it('adds nothing when the upstream node carries no object config', () => {
    const result = resolveUpstreamFields(graphWithTriggerConfig({}), 'sheets_1');
    expect([...result.names].some((n) => n.includes('.'))).toBe(false);
  });

  it('describes nested values by their runtime type', () => {
    const result = resolveUpstreamFields(
      graphWithTriggerConfig({ inputData: { retries: 3, dryRun: true, note: 'hello' } }),
      'sheets_1',
    );
    const byName = new Map(result.fields.map((f) => [f.name, f]));
    expect(byName.get('inputData.retries')?.type).toBe('number');
    expect(byName.get('inputData.dryRun')?.type).toBe('boolean');
    expect(byName.get('inputData.note')?.type).toBe('string');
  });

  /**
   * The field-plan endpoint is called on a wizard debounce, so an unbounded walk over a large
   * generated JSON blob would be felt on every keystroke.
   */
  it('is depth-bounded rather than descending forever', () => {
    let deep: Record<string, unknown> = { spreadsheetId: 'x' };
    for (let i = 0; i < 30; i++) deep = { level: deep };

    const result = resolveUpstreamFields(graphWithTriggerConfig({ inputData: deep }), 'sheets_1');
    const deepest = Math.max(...[...result.names].map((n) => n.split('.').length));
    expect(deepest).toBeLessThanOrEqual(4);
  });

  it('terminates on a cyclic config instead of hanging', () => {
    const cyclic: Record<string, unknown> = { spreadsheetId: 'x' };
    cyclic.self = cyclic;
    expect(() => resolveUpstreamFields(graphWithTriggerConfig({ inputData: cyclic }), 'sheets_1')).not.toThrow();
  });

  it('does not treat an array config value as a set of addressable keys', () => {
    const result = resolveUpstreamFields(
      graphWithTriggerConfig({ inputData: { rows: [{ id: 1 }, { id: 2 }] } }),
      'sheets_1',
    );
    expect(result.names.has('inputData.rows')).toBe(true);
    expect([...result.names].some((n) => n.startsWith('inputData.rows.'))).toBe(false);
  });
});
