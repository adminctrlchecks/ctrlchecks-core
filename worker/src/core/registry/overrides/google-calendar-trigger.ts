import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideGoogleCalendarTrigger(
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
    type: 'google_calendar_trigger',
    label: 'Google Calendar Trigger',
    category: 'triggers',
    description: 'Trigger workflows on new, updated, or cancelled Google Calendar events via push notification channels',
    icon: 'Calendar',
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
      calendarId: {
        type: 'string',
        description: 'Calendar ID to watch. Use "primary" for the connected account\'s main calendar.',
        required: false,
        default: 'primary',
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'array',
        description: 'Calendar change types that can start this workflow.',
        required: false,
        default: ['event_changed', 'event_cancelled'],
        examples: ['event_changed', 'event_cancelled'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      query: {
        type: 'string',
        description: 'Optional keyword filter matched against the event title and description.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized Google Calendar event payload',
        schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            eventType: { type: 'string' },
            source: { type: 'string' },
            userId: { type: 'string' },
            username: { type: 'string' },
            text: { type: 'string' },
            timestamp: { type: 'string' },
            calendarId: { type: 'string' },
            eventIdRaw: { type: 'string' },
            subject: { type: 'string' },
            organizer: { type: 'string' },
            start: { type: 'string' },
            end: { type: 'string' },
            attendees: { type: 'array' },
            htmlLink: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({
      calendarId: 'primary',
      eventTypes: ['event_changed', 'event_cancelled'],
    }),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
