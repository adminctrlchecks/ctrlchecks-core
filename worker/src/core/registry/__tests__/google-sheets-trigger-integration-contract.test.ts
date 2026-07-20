import { connectorRegistry } from '../../../services/connectors/connector-registry';
import { nodeLibrary } from '../../../services/nodes/node-library';
import { unifiedNodeRegistry } from '../unified-node-registry';

describe('Google Sheets Trigger integration contracts', () => {
  it('registers Google Sheets Trigger as a trigger node with normalized output fields', () => {
    const schema = nodeLibrary.getSchema('google_sheets_trigger');
    expect(schema).toBeTruthy();
    expect(schema?.category).toBe('triggers');
    expect(schema?.providers).toContain('google_sheets');
    expect(schema?.capabilities).toEqual(expect.arrayContaining(['google_sheets.receive', 'trigger.poll']));

    const def = unifiedNodeRegistry.get('google_sheets_trigger');
    expect(def?.category).toBe('triggers');
    expect(def?.outputSchema.default.schema.properties).toMatchObject({
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      spreadsheetId: { type: 'string' },
      sheetName: { type: 'string' },
      rowNumber: { type: 'number' },
      row: { type: 'object' },
      raw: { type: 'object' },
    });
  });

  it('keeps the Google OAuth connector available for the Sheets trigger', () => {
    const connector = connectorRegistry.getConnector('google_sheets');
    expect(connector?.nodeTypes).toEqual(expect.arrayContaining(['google_sheets_trigger', 'google_sheets']));
    expect(connector?.capabilities).toEqual(expect.arrayContaining(['google_sheets.receive', 'trigger.poll']));
  });
});
