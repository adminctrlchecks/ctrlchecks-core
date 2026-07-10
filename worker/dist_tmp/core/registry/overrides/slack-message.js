"use strict";
/**
 * ✅ SLACK MESSAGE NODE - Migrated to Registry
 *
 * Sends messages to Slack channels.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSlackMessage = overrideSlackMessage;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideSlackMessage(def, schema) {
    const inputSchema = {
        ...def.inputSchema,
        // Webhook URL is a config value (not an auth secret) — ownership='value' keeps it
        // in the node properties panel where the user can type it directly.
        // The field-ownership.ts URL guard (webhook_url helpCategory) already returns 'value'.
        webhookUrl: def.inputSchema.webhookUrl
            ? {
                ...def.inputSchema.webhookUrl,
                ownership: 'value',
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: false,
                },
            }
            : def.inputSchema.webhookUrl,
        channel: def.inputSchema.channel
            ? {
                ...def.inputSchema.channel,
                ownership: 'structural',
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: true,
                    supportsBuildtimeAI: true,
                },
            }
            : def.inputSchema.channel,
        // Canonical body: NodeLibrary documents `text` as alias for `message`; one strict requirement only.
        message: def.inputSchema.message
            ? {
                ...def.inputSchema.message,
                ownership: 'value',
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: true,
                    supportsBuildtimeAI: true,
                },
                role: 'long_body',
                essentialForExecution: true,
            }
            : def.inputSchema.message,
        text: def.inputSchema.text
            ? {
                ...def.inputSchema.text,
                ownership: 'value',
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: true,
                    supportsBuildtimeAI: true,
                },
                role: 'short_summary',
                aliasOf: 'message',
                essentialForExecution: false,
            }
            : def.inputSchema.text,
        blocks: def.inputSchema.blocks
            ? {
                ...def.inputSchema.blocks,
                ownership: 'structural',
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
                role: 'raw_json',
            }
            : def.inputSchema.blocks,
        username: def.inputSchema.username
            ? {
                ...def.inputSchema.username,
                ownership: 'value',
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
            }
            : def.inputSchema.username,
        iconEmoji: def.inputSchema.iconEmoji
            ? {
                ...def.inputSchema.iconEmoji,
                ownership: 'value',
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
            }
            : def.inputSchema.iconEmoji,
    };
    return {
        ...def,
        inputSchema,
        requiredInputs: (def.requiredInputs || []).filter((field) => field !== 'webhookUrl'),
        credentialSchema: {
            requirements: [
                {
                    provider: 'slack',
                    category: 'oauth',
                    required: false,
                    description: 'Slack OAuth bot token for chat.postMessage. Alternatively provide webhookUrl for Incoming Webhooks.',
                    credentialTypeId: 'slack_oauth2',
                },
            ],
            credentialFields: Array.from(new Set([...(def.credentialSchema?.credentialFields || []), 'accessToken', 'botToken'])),
        },
        tags: Array.from(new Set([...(def.tags || []), 'communication', 'output', 'slack'])),
        execute: async (context) => {
            // Use legacy executor for now (complex Slack API integration)
            // TODO: Port full Slack message logic to registry when time permits
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
