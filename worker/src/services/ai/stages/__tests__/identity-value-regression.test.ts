/**
 * The incident, as a regression test.
 *
 * A generated `form → Switch → Gmail → Sheets` workflow shipped with this, AI-filled, in
 * `manual_trigger.inputData`:
 *
 *   { "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBipkAIAOk1YAMK784I6UMDVM",
 *     "sheetName": "Sheet1", "range": "A1:D100" }
 *
 * That ID is Google's own documentation sample. Meanwhile the Sheets node asked the user to
 * type a spreadsheet ID and offered a *different* fake one as its example — so the workflow
 * held two invented identifiers that disagreed with each other.
 *
 * Deliberately against the REAL registry: `inputData` has to stay AI-fillable (it is
 * `role: 'raw_json'`, and the trigger payload is a legitimate thing for the AI to shape),
 * which is exactly why the per-field guard cannot close this and a structural pass must.
 */

jest.mock('../../gemini-orchestrator', () => ({
  geminiOrchestrator: { processRequest: jest.fn(async () => '{}') },
}));
jest.mock('../property-population-stage-client', () => ({
  runPropertyPopulationJsonRemote: jest.fn(),
}));

import { runPropertyPopulationStage } from '../property-population-stage';
import { runPropertyPopulationJsonRemote } from '../property-population-stage-client';

const mockRemote = runPropertyPopulationJsonRemote as jest.Mock;

/** The exact value observed in the shipped workflow. */
const GOOGLE_DOC_SAMPLE_ID = '1BxiMVs0XRA5nFMdKvBdBipkAIAOk1YAMK784I6UMDVM';

const workflow = () => ({
  nodes: [
    {
      id: 'trigger_1',
      type: 'manual_trigger',
      data: { label: 'Manual Trigger', type: 'manual_trigger', category: 'trigger', config: {} },
    },
  ],
  edges: [],
});

/** Trigger already holds the spreadsheet id; Sheets sits downstream of it. */
const triggerThenSheets = () => ({
  nodes: [
    {
      id: 'trigger_1',
      type: 'manual_trigger',
      data: {
        label: 'Manual Trigger',
        type: 'manual_trigger',
        category: 'trigger',
        config: { inputData: { spreadsheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz' } },
      },
    },
    {
      id: 'sheets_1',
      type: 'google_sheets',
      data: { label: 'Sheets', type: 'google_sheets', category: 'data', config: {} },
    },
  ],
  edges: [{ source: 'trigger_1', target: 'sheets_1' }],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRemote.mockImplementation(async (params: { purpose: string }) =>
    params.purpose === 'property_population'
      ? {
          ok: true,
          durationMs: 5,
          values: {
            inputData: {
              spreadsheetId: GOOGLE_DOC_SAMPLE_ID,
              sheetName: 'Sheet1',
              range: 'A1:D100',
              submittedBy: 'Ada Lovelace',
            },
          },
        }
      : { ok: true, durationMs: 5, values: {} },
  );
});

describe('generated trigger payloads carry no fabricated identifier', () => {
  it('strips the fabricated spreadsheetId the model wrote into manual_trigger.inputData', async () => {
    const result = await runPropertyPopulationStage({
      workflow: workflow() as never,
      userIntent: 'When I run this manually, email the leads from my spreadsheet.',
      structuralPrompt: 'manual_trigger -> google_sheets',
      correlationId: 'identity-value-regression',
    });

    const config = result.workflow.nodes[0].data.config as Record<string, any>;

    expect(JSON.stringify(config)).not.toContain(GOOGLE_DOC_SAMPLE_ID);
    expect(config.inputData.spreadsheetId).toBe('');
    expect(config.inputData.sheetName).toBe('');
    expect(config.inputData.range).toBe('');
  });

  it('keeps the non-identifier content of the same payload', async () => {
    const result = await runPropertyPopulationStage({
      workflow: workflow() as never,
      userIntent: 'When I run this manually, email the leads from my spreadsheet.',
      structuralPrompt: 'manual_trigger -> google_sheets',
    });

    const config = result.workflow.nodes[0].data.config as Record<string, any>;
    expect(config.inputData.submittedBy).toBe('Ada Lovelace');
  });

  /**
   * The other half of the goal: reusing what an upstream node already carries is general and
   * must keep working. Only *inventing* a value that targets a real resource is dangerous.
   */
  it('accepts a MAPPED spreadsheetId on a node whose field is closed to build-time AI', async () => {
    mockRemote.mockImplementation(async (params: { purpose: string }) =>
      params.purpose === 'property_population'
        ? { ok: true, durationMs: 5, values: { spreadsheetId: '{{$json.inputData.spreadsheetId}}' } }
        : { ok: true, durationMs: 5, values: {} },
    );

    const result = await runPropertyPopulationStage({
      workflow: triggerThenSheets() as never,
      userIntent: 'Read the sheet the trigger points at.',
      structuralPrompt: 'manual_trigger -> google_sheets',
    });

    const sheets = result.workflow.nodes[1].data.config as Record<string, any>;
    expect(sheets.spreadsheetId).toBe('{{$json.inputData.spreadsheetId}}');
  });

  it('still refuses an INVENTED spreadsheetId literal on that same field', async () => {
    mockRemote.mockImplementation(async (params: { purpose: string }) =>
      params.purpose === 'property_population'
        ? { ok: true, durationMs: 5, values: { spreadsheetId: GOOGLE_DOC_SAMPLE_ID } }
        : { ok: true, durationMs: 5, values: {} },
    );

    const result = await runPropertyPopulationStage({
      workflow: triggerThenSheets() as never,
      userIntent: 'Read my spreadsheet.',
      structuralPrompt: 'manual_trigger -> google_sheets',
    });

    const sheets = result.workflow.nodes[1].data.config as Record<string, any>;
    expect(sheets.spreadsheetId ?? '').not.toBe(GOOGLE_DOC_SAMPLE_ID);
  });

  it('refuses a reference to something no upstream node produces', async () => {
    mockRemote.mockImplementation(async (params: { purpose: string }) =>
      params.purpose === 'property_population'
        ? { ok: true, durationMs: 5, values: { spreadsheetId: '{{$json.nothingProducesThis}}' } }
        : { ok: true, durationMs: 5, values: {} },
    );

    const result = await runPropertyPopulationStage({
      workflow: triggerThenSheets() as never,
      userIntent: 'Read my spreadsheet.',
      structuralPrompt: 'manual_trigger -> google_sheets',
    });

    const sheets = result.workflow.nodes[1].data.config as Record<string, any>;
    expect(sheets.spreadsheetId ?? '').not.toBe('{{$json.nothingProducesThis}}');
  });

  it('leaves an upstream reference in place — mapped is not invented', async () => {
    mockRemote.mockImplementation(async (params: { purpose: string }) =>
      params.purpose === 'property_population'
        ? { ok: true, durationMs: 5, values: { inputData: { spreadsheetId: '{{$json.spreadsheetId}}' } } }
        : { ok: true, durationMs: 5, values: {} },
    );

    const result = await runPropertyPopulationStage({
      workflow: workflow() as never,
      userIntent: 'Pass the spreadsheet through from the previous step.',
      structuralPrompt: 'manual_trigger -> google_sheets',
    });

    const config = result.workflow.nodes[0].data.config as Record<string, any>;
    expect(config.inputData.spreadsheetId).toBe('{{$json.spreadsheetId}}');
  });
});
