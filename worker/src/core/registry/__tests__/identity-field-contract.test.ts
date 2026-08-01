/**
 * Identity fields are never fabricated by build-time AI — a registry-wide contract.
 *
 * A made-up sentence is fine: a human spots it instantly. A made-up **identifier** is worse
 * than an empty field — it looks valid, passes every check, and then either fails at runtime
 * or silently targets the wrong resource. A generated workflow shipped with Google's own
 * documentation sample ID (`1BxiMVs0XRA5nFMdKvBdBipkAIAOk1YAMK784I6UMDVM`) written into a
 * trigger's payload, disagreeing with a *different* invented ID on the Sheets node.
 *
 * Before this contract, protection was hand-written field by field: of 197 fields carrying
 * `role: 'id'`, 125 were still build-time-AI fillable and 72 were blocked, with no principle
 * separating them. This sweeps the WHOLE registry, so a node added next year is covered with
 * no further work — and fails if anyone re-opens one.
 *
 * Scope: build-time GENERATION only. `supportsRuntimeAI` is deliberately untouched — a value
 * arriving from an upstream node at run time is *mapped*, not invented (plan §5.3, still an
 * open product question).
 */

import { unifiedNodeRegistry } from '../unified-node-registry';
import { applyIdentityFieldPolicy, isIdentityField } from '../identity-field-policy';
import type { NodeInputField } from '../../types/unified-node-contract';

type Field = NodeInputField & { fillMode?: { default?: string; supportsBuildtimeAI?: boolean; supportsRuntimeAI?: boolean } };

const isBuildtimeAiFillable = (field: Field): boolean =>
  field?.fillMode?.default === 'buildtime_ai_once' || field?.fillMode?.supportsBuildtimeAI === true;

function everyField(): Array<{ nodeType: string; fieldName: string; field: Field }> {
  const out: Array<{ nodeType: string; fieldName: string; field: Field }> = [];
  for (const nodeType of unifiedNodeRegistry.getAllTypes()) {
    const def = unifiedNodeRegistry.get(nodeType);
    for (const [fieldName, field] of Object.entries(def?.inputSchema ?? {})) {
      out.push({ nodeType, fieldName, field: field as Field });
    }
  }
  return out;
}

const fieldOf = (nodeType: string, fieldName: string): Field | undefined =>
  unifiedNodeRegistry.get(nodeType)?.inputSchema?.[fieldName] as Field | undefined;

describe('identity fields — registry-wide contract', () => {
  it('leaves NO identity field fillable by build-time AI, anywhere in the registry', () => {
    const offenders = everyField()
      .filter(({ fieldName, field }) => isIdentityField(fieldName, field) && isBuildtimeAiFillable(field))
      .map(({ nodeType, fieldName, field }) => `${nodeType}.${fieldName} (role=${field.role}, default=${field.fillMode?.default}, supportsBuildtimeAI=${field.fillMode?.supportsBuildtimeAI})`);

    expect(offenders).toEqual([]);
  });

  it('blocks every field the registry itself marks role: "id"', () => {
    const offenders = everyField()
      .filter(({ fieldName, field }) => field.role === 'id' && isBuildtimeAiFillable(field) && !isIdentityField(fieldName, field))
      .map(({ nodeType, fieldName }) => `${nodeType}.${fieldName}`);

    // Any survivor here is an exception, and an exception must be justified in the policy
    // module as data with a comment — never left as an unexplained divergence.
    expect(offenders).toEqual(['chat_model.provider', 'langchain.provider']);
  });

  /** The named examples from the plan — each was measured fabricatable before this contract. */
  it.each([
    ['google_doc', 'documentId'],
    ['salesforce', 'id'],
    ['salesforce', 'externalIdField'],
    ['salesforce', 'externalIdValue'],
    ['microsoft_dynamics', 'id'],
    ['clickup', 'listId'],
    ['clickup', 'taskId'],
    ['clickup', 'spaceId'],
    ['clickup', 'folderId'],
    ['clickup', 'teamId'],
    ['execute_workflow', 'workflowId'],
    ['google_sheets', 'spreadsheetId'],
    ['google_sheets', 'sheetName'],
    ['google_sheets', 'range'],
    ['notion', 'databaseId'],
    ['airtable', 'baseId'],
  ])('%s.%s cannot be invented at build time', (nodeType, fieldName) => {
    const field = fieldOf(nodeType, fieldName);
    expect(field).toBeDefined();
    expect(isBuildtimeAiFillable(field as Field)).toBe(false);
  });

  /**
   * §2.2 — the operation selector landed on 2026-07-30 and makes `operation`/`action`/`method`
   * AI-fillable on all 79 nodes that have one. The dead rule this contract replaces also
   * matched `method`; wiring it up naively would re-break Gmail.
   */
  it('never touches an operation selector', () => {
    const selectors = everyField().filter(({ field }) => field.role === 'operation_selector');
    expect(selectors.length).toBeGreaterThan(50);

    const broken = selectors
      .filter(({ field }) => field.fillMode?.supportsBuildtimeAI !== true)
      .map(({ nodeType, fieldName }) => `${nodeType}.${fieldName}`);
    expect(broken).toEqual([]);
  });

  /** The §5.1 hazard: a sloppy match locks the AI out of fields it should be filling. */
  it.each([
    ['google_gmail', 'subject'],
    ['google_gmail', 'body'],
    ['cache_get', 'key'],
    ['cache_set', 'key'],
    ['chat_model', 'provider'],
  ])('%s.%s is still AI-fillable', (nodeType, fieldName) => {
    const field = fieldOf(nodeType, fieldName);
    expect(field).toBeDefined();
    expect(isBuildtimeAiFillable(field as Field)).toBe(true);
  });

  it('matches on whole names, so "valid", "paid", "hidden" and "width" are not identifiers', () => {
    for (const name of ['valid', 'paid', 'hidden', 'width', 'validate', 'candidate']) {
      expect(isIdentityField(name, { type: 'string' } as Field)).toBe(false);
    }
    for (const name of ['spreadsheetId', 'apiKey', 'accessToken', 'documentId', 'range']) {
      expect(isIdentityField(name, { type: 'string' } as Field)).toBe(true);
    }
  });
});

describe('applyIdentityFieldPolicy', () => {
  const schemaWith = (field: Partial<Field>) =>
    ({ type: 'node', inputSchema: { spreadsheetId: { type: 'string', ...field } } } as never);

  it('turns a buildtime_ai_once identity field into manual_static', () => {
    const out = applyIdentityFieldPolicy(
      schemaWith({ fillMode: { default: 'buildtime_ai_once', supportsBuildtimeAI: true } }),
    );
    expect(out.inputSchema.spreadsheetId.fillMode?.default).toBe('manual_static');
    expect(out.inputSchema.spreadsheetId.fillMode?.supportsBuildtimeAI).toBe(false);
  });

  /**
   * §5.3 — blocking AI *generation* of an ID is right; blocking AI *runtime* is a different
   * question, because a value arriving from an upstream node is mapped, not invented. Until
   * that product call is made, this policy must not silently decide it.
   */
  it('leaves supportsRuntimeAI alone', () => {
    const out = applyIdentityFieldPolicy(
      schemaWith({ fillMode: { default: 'manual_static', supportsBuildtimeAI: true, supportsRuntimeAI: true } }),
    );
    expect(out.inputSchema.spreadsheetId.fillMode?.supportsRuntimeAI).toBe(true);
    expect(out.inputSchema.spreadsheetId.fillMode?.supportsBuildtimeAI).toBe(false);
  });

  it('leaves a non-identity field completely untouched', () => {
    const input = { type: 'node', inputSchema: { subject: { type: 'string', role: 'title_like', fillMode: { default: 'buildtime_ai_once', supportsBuildtimeAI: true } } } } as never;
    const out = applyIdentityFieldPolicy(input);
    expect(out.inputSchema.subject.fillMode?.default).toBe('buildtime_ai_once');
    expect(out.inputSchema.subject.fillMode?.supportsBuildtimeAI).toBe(true);
  });
});
