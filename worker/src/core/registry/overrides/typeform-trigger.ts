import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideTypeformTrigger(
  def: UnifiedNodeDefinition,
  _schema: NodeSchema,
): UnifiedNodeDefinition {
  const manualStatic = {
    default: 'manual_static' as const,
    supportsRuntimeAI: false,
    supportsBuildtimeAI: false,
  };

  return {
    ...def,
    type: 'typeform_trigger',
    label: 'Typeform Trigger',
    category: 'triggers',
    description: 'Trigger workflows on new Typeform form responses',
    icon: 'FileText',
    version: '1.0.0',
    isBranching: false,
    incomingPorts: [],
    outgoingPorts: ['default'],
    inputSchema: {
      connectionId: {
        type: 'string',
        description: 'Optional saved Typeform connection ID.',
        required: false,
        ownership: 'credential',
        role: 'id',
        fillMode: manualStatic,
      },
      formId: {
        type: 'string',
        description: 'Typeform form ID to receive responses from.',
        required: true,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      query: {
        type: 'string',
        description: 'Optional keyword filter matched against the response answers.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized Typeform response payload',
        schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            eventType: { type: 'string' },
            source: { type: 'string' },
            timestamp: { type: 'string' },
            formId: { type: 'string' },
            responseId: { type: 'string' },
            answers: { type: 'object' },
            hidden: { type: 'object' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: ['formId'],
    defaultConfig: () => ({}),
    validateConfig: (config: Record<string, unknown>) => {
      const errors: string[] = [];
      if (!String(config?.formId || '').trim()) {
        errors.push('A Typeform form ID is required.');
      }
      return { valid: errors.length === 0, errors };
    },
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
