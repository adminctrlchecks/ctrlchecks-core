/**
 * Identity keys must not be fabricated INSIDE object values either (plan RC-3).
 *
 * The per-field guard is per FIELD. `manual_trigger.inputData` is one field — `role: 'raw_json'`,
 * `supportsBuildtimeAI: true` — so the AI may fill it, and it filled it with an object
 * *containing* a `spreadsheetId`. Nothing inspected keys inside an object value. A perfect
 * Phase 2 fix therefore still leaves this open: block `spreadsheetId` as a field, and the model
 * writes it as a JSON key instead.
 *
 * Prompt guidance alone is not enough — a model told "don't invent IDs" will still sometimes
 * invent one — so this is a structural pass over generated values. The guarantee does not
 * depend on model compliance.
 *
 * The fixture is the value actually observed in a generated workflow: Google's own
 * documentation sample spreadsheet ID.
 */

import { sanitizeIdentityValues } from '../identity-value-sanitizer';

/** The exact value a generated `manual_trigger.inputData` shipped with. */
const GOOGLE_DOC_SAMPLE_ID = '1BxiMVs0XRA5nFMdKvBdBipkAIAOk1YAMK784I6UMDVM';

describe('sanitizeIdentityValues', () => {
  it('clears the fabricated spreadsheetId from a trigger payload, keeping the rest', () => {
    const result = sanitizeIdentityValues({
      spreadsheetId: GOOGLE_DOC_SAMPLE_ID,
      sheetName: 'Sheet1',
      range: 'A1:D100',
      customerName: 'Ada Lovelace',
    });

    expect(result.changed).toBe(true);
    expect(result.strippedKeys.sort()).toEqual(['range', 'sheetName', 'spreadsheetId']);
    expect(result.value).toEqual({
      spreadsheetId: '',
      sheetName: '',
      range: '',
      customerName: 'Ada Lovelace',
    });
  });

  it('never leaves the observed fabricated identifier anywhere in the value', () => {
    const result = sanitizeIdentityValues({
      nested: { deeper: [{ documentId: GOOGLE_DOC_SAMPLE_ID }] },
    });
    expect(JSON.stringify(result.value)).not.toContain(GOOGLE_DOC_SAMPLE_ID);
  });

  it('walks nested objects and arrays', () => {
    const result = sanitizeIdentityValues({
      rows: [
        { taskId: 'abc123', title: 'Write the report' },
        { taskId: 'def456', title: 'Send it' },
      ],
      meta: { workspace: { teamId: 'T0001' } },
    });

    expect((result.value as any).rows[0].taskId).toBe('');
    expect((result.value as any).rows[0].title).toBe('Write the report');
    expect((result.value as any).meta.workspace.teamId).toBe('');
  });

  it('leaves non-identity keys completely alone', () => {
    const input = { subject: 'Weekly summary', body: 'Hello {{$json.name}}', count: 42, valid: true, width: 300 };
    const result = sanitizeIdentityValues(input);
    expect(result.changed).toBe(false);
    expect(result.value).toEqual(input);
  });

  /** A template reference is *mapped* from upstream, not invented — it must survive. */
  it('keeps a template reference in an identity key', () => {
    const result = sanitizeIdentityValues({ spreadsheetId: '{{$json.spreadsheetId}}', listId: '$json.listId' });
    expect(result.changed).toBe(false);
    expect(result.value).toEqual({ spreadsheetId: '{{$json.spreadsheetId}}', listId: '$json.listId' });
  });

  it('leaves an already-empty identity key alone', () => {
    const result = sanitizeIdentityValues({ spreadsheetId: '', documentId: null });
    expect(result.changed).toBe(false);
    expect(result.strippedKeys).toEqual([]);
  });

  it('is bounded: a cyclic value terminates instead of hanging', () => {
    const cyclic: Record<string, unknown> = { taskId: 'abc' };
    cyclic.self = cyclic;
    expect(() => sanitizeIdentityValues(cyclic)).not.toThrow();
    expect((sanitizeIdentityValues(cyclic).value as any).taskId).toBe('');
  });

  it('is bounded: stops descending past the depth limit rather than walking forever', () => {
    let deep: Record<string, unknown> = { spreadsheetId: GOOGLE_DOC_SAMPLE_ID };
    for (let i = 0; i < 40; i++) deep = { level: deep };
    expect(() => sanitizeIdentityValues(deep)).not.toThrow();
  });

  it('passes scalars and null through untouched', () => {
    for (const scalar of ['a string', 42, true, null, undefined]) {
      const result = sanitizeIdentityValues(scalar);
      expect(result.changed).toBe(false);
      expect(result.value).toEqual(scalar);
    }
  });

  /**
   * §5.2 is unsettled: whether a trigger should carry these keys AT ALL is the user's call.
   * Clearing the value — rather than deleting the key — is safe under either answer, so this
   * pass must not delete.
   */
  it('clears values without removing keys, so the §5.2 decision stays open', () => {
    const result = sanitizeIdentityValues({ spreadsheetId: GOOGLE_DOC_SAMPLE_ID });
    expect(Object.keys(result.value as object)).toEqual(['spreadsheetId']);
  });
});
