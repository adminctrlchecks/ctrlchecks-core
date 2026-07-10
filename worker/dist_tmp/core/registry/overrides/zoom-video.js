"use strict";
/**
 * ✅ ZOOM VIDEO NODE - Registry Override
 *
 * Creates and manages Zoom meetings via the Zoom API.
 * Delegates execution to the legacy executor which routes through execute-workflow.ts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideZoomVideo = overrideZoomVideo;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideZoomVideo(def, schema) {
    const inputSchema = {
        ...def.inputSchema,
        operation: def.inputSchema.operation
            ? {
                ...def.inputSchema.operation,
                ownership: 'structural',
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
            }
            : def.inputSchema.operation,
        accessToken: def.inputSchema.accessToken
            ? {
                ...def.inputSchema.accessToken,
                ownership: 'credential',
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: false,
                },
            }
            : def.inputSchema.accessToken,
        topic: def.inputSchema.topic
            ? {
                ...def.inputSchema.topic,
                ownership: 'value',
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: true,
                    supportsBuildtimeAI: true,
                },
                essentialForExecution: false,
            }
            : def.inputSchema.topic,
        duration: def.inputSchema.duration
            ? {
                ...def.inputSchema.duration,
                ownership: 'value',
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
            }
            : def.inputSchema.duration,
        startTime: def.inputSchema.startTime
            ? {
                ...def.inputSchema.startTime,
                ownership: 'value',
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
            }
            : def.inputSchema.startTime,
        meetingId: def.inputSchema.meetingId
            ? {
                ...def.inputSchema.meetingId,
                ownership: 'value',
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
            }
            : def.inputSchema.meetingId,
    };
    return {
        ...def,
        inputSchema,
        tags: Array.from(new Set([...(def.tags || []), 'communication', 'video_conferencing', 'zoom', 'meeting'])),
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
