/**
 * ✅ ZOOM VIDEO NODE - Registry Override
 *
 * Creates and manages Zoom meetings via the Zoom API.
 * Delegates execution to the legacy executor which routes through execute-workflow.ts.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';

export function overrideZoomVideo(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  const inputSchema = {
    ...def.inputSchema,
    operation: def.inputSchema.operation
      ? {
          ...def.inputSchema.operation,
          ownership: 'structural' as const,
          fillMode: {
            default: 'buildtime_ai_once' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
        }
      : def.inputSchema.operation,
    topic: def.inputSchema.topic
      ? {
          ...def.inputSchema.topic,
          ownership: 'value' as const,
          fillMode: {
            default: 'buildtime_ai_once' as const,
            supportsRuntimeAI: true,
            supportsBuildtimeAI: true,
          },
          essentialForExecution: false,
        }
      : def.inputSchema.topic,
    duration: def.inputSchema.duration
      ? {
          ...def.inputSchema.duration,
          ownership: 'value' as const,
          fillMode: {
            default: 'manual_static' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
        }
      : def.inputSchema.duration,
    startTime: def.inputSchema.startTime
      ? {
          ...def.inputSchema.startTime,
          ownership: 'value' as const,
          fillMode: {
            default: 'manual_static' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
        }
      : def.inputSchema.startTime,
    meetingId: def.inputSchema.meetingId
      ? {
          ...def.inputSchema.meetingId,
          ownership: 'value' as const,
          fillMode: {
            default: 'manual_static' as const,
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
          },
        }
      : def.inputSchema.meetingId,
  };

  return {
    ...def,
    inputSchema,
    credentialSchema: {
      requirements: [
        {
          provider: 'zoom',
          category: 'oauth',
          required: true,
          description: 'Zoom OAuth2 connection used to create and manage meetings.',
          credentialTypeId: 'zoom_oauth2',
          credentialTypeIds: ['zoom_oauth2'],
          authType: 'oauth2',
          label: 'Zoom OAuth2',
          testable: true,
          requiredScopes: [
            'meeting:write:meeting',
            'meeting:read:meeting',
            'meeting:read:list_meetings',
            'user:read:user',
          ],
        },
      ],
      credentialFields: [],
    },
    tags: Array.from(
      new Set([...(def.tags || []), 'communication', 'video_conferencing', 'zoom', 'meeting'])
    ),
    execute: async (context) => {
      return await executeViaLegacyExecutor({ context, schema });
    },
  };
}
