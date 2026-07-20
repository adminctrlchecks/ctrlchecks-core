import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideGoogleSheetsTrigger(
  def: UnifiedNodeDefinition,
  _schema: NodeSchema,
): UnifiedNodeDefinition {
  const structuralBuildtime = {
    default: 'buildtime_ai_once' as const,
    supportsRuntimeAI: false,
    supportsBuildtimeAI: true,
  };
  const manualStatic = {
    default: 'manual_static' as const,
    supportsRuntimeAI: false,
    supportsBuildtimeAI: false,
  };

  return {
    ...def,
    type: 'google_sheets_trigger',
    label: 'Google Sheets Trigger',
    category: 'triggers',
    description: 'Trigger workflows when rows are added or updated in a Google Sheet (polled every ~2 minutes; Google Sheets has no native push notification for cell changes)',
    icon: 'Table',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Google OAuth connection ID.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      spreadsheetId: {
        type: 'string',
        description: 'Google Sheets spreadsheet ID to watch.',
        required: true,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      sheetName: {
        type: 'string',
        description: 'Optional sheet/tab name. Defaults to the first sheet.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
      hasHeaderRow: {
        type: 'boolean',
        description: 'Whether the first row contains column headers, used to build the normalized row object.',
        required: false,
        default: true,
        ownership: 'structural',
        role: 'config',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'array',
        description: 'Row change types that can start this workflow.',
        required: false,
        default: ['row_added'],
        examples: ['row_added', 'row_updated'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      query: {
        type: 'string',
        description: 'Optional keyword filter matched against the row contents.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized Google Sheets row payload',
        schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            eventType: { type: 'string' },
            source: { type: 'string' },
            timestamp: { type: 'string' },
            spreadsheetId: { type: 'string' },
            sheetName: { type: 'string' },
            rowNumber: { type: 'number' },
            values: { type: 'array' },
            row: { type: 'object' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: ['spreadsheetId'],
    defaultConfig: () => ({
      hasHeaderRow: true,
      eventTypes: ['row_added'],
    }),
    validateConfig: (config: Record<string, unknown>) => {
      const errors: string[] = [];
      if (!String(config?.spreadsheetId || '').trim()) {
        errors.push('A Google Sheets spreadsheet ID is required.');
      }
      return { valid: errors.length === 0, errors };
    },
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
