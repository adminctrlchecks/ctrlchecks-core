import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideGoogleDriveTrigger(
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
    type: 'google_drive_trigger',
    label: 'Google Drive Trigger',
    category: 'triggers',
    description: 'Trigger workflows when files are created, updated, or deleted in Google Drive via push notification channels',
    icon: 'FolderOpen',
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
      folderId: {
        type: 'string',
        description: 'Optional Google Drive folder ID to filter changes to. Leave empty to watch the entire Drive.',
        required: false,
        ownership: 'value',
        role: 'id',
        fillMode: manualStatic,
      },
      eventTypes: {
        type: 'array',
        description: 'Drive change types that can start this workflow.',
        required: false,
        default: ['file_changed', 'file_deleted'],
        examples: ['file_changed', 'file_deleted'],
        ownership: 'structural',
        role: 'config',
        fillMode: structuralBuildtime,
      },
      query: {
        type: 'string',
        description: 'Optional keyword filter matched against the file name.',
        required: false,
        ownership: 'value',
        role: 'config',
        fillMode: manualStatic,
      },
    },
    outputSchema: {
      default: {
        name: 'default',
        description: 'Normalized Google Drive file change payload',
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
            fileId: { type: 'string' },
            name: { type: 'string' },
            mimeType: { type: 'string' },
            parents: { type: 'array' },
            modifiedTime: { type: 'string' },
            webViewLink: { type: 'string' },
            raw: { type: 'object' },
          },
        },
      },
    },
    requiredInputs: [],
    defaultConfig: () => ({
      eventTypes: ['file_changed', 'file_deleted'],
    }),
    validateConfig: () => ({ valid: true, errors: [] }),
    execute: async () => ({
      success: true,
      output: { triggered: false },
    }),
  };
}
