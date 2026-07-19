import { describe, expect, it } from 'vitest';
import { BACKEND_SUPPORTED_NODE_TYPES } from '../backendSupportedNodeTypes';
import { NODE_TYPES } from '../nodeTypes';
import { getIntegrationLogo } from '@/lib/integrationLogos';

describe('Google Sheets trigger node catalog', () => {
  it('includes Google Sheets Trigger with polling fields', () => {
    const trigger = NODE_TYPES.find((node) => node.type === 'google_sheets_trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.category).toBe('triggers');
    expect(trigger?.configFields.map((field) => field.key)).toEqual([
      'spreadsheetId',
      'sheetName',
      'hasHeaderRow',
      'eventTypes',
      'query',
    ]);
    expect(trigger?.usageGuide?.outputs.join(' ')).toContain('rowNumber');
    expect(trigger?.usageGuide?.whenToUse).toContain('polls');
    expect(BACKEND_SUPPORTED_NODE_TYPES.has('google_sheets_trigger')).toBe(true);
    expect(getIntegrationLogo('google_sheets_trigger')).toBe('/integrations-logos/Google-Sheets.svg');
  });

  it('keeps the Google Sheets action node available for reads/writes', () => {
    const sheets = NODE_TYPES.find((node) => node.type === 'google_sheets');
    expect(sheets).toBeTruthy();
    expect(sheets?.category).toBe('google');
  });
});
