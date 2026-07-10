"use strict";
/**
 * ✅ VERCEL NODE - Migrated to Registry
 *
 * Deploys projects to Vercel and manages deployments.
 * Supports two operations: deploy and list_deployments.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideVercel = overrideVercel;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideVercel(def, schema) {
    const inputSchema = {
        ...def.inputSchema,
        // Operation: determines which Vercel API operation to perform
        operation: def.inputSchema.operation
            ? {
                ...def.inputSchema.operation,
                ownership: 'structural',
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
                role: 'config',
            }
            : def.inputSchema.operation,
        // ProjectName: required for deploy operation, optional for list_deployments
        projectName: def.inputSchema.projectName
            ? {
                ...def.inputSchema.projectName,
                ownership: 'value',
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: true,
                    supportsBuildtimeAI: true,
                },
                role: 'id',
                essentialForExecution: false,
            }
            : def.inputSchema.projectName,
        // Token: Vercel API token for authentication
        token: def.inputSchema.token
            ? {
                ...def.inputSchema.token,
                ownership: 'credential',
                fillMode: {
                    default: 'manual_static',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: false,
                },
                role: 'config',
                essentialForExecution: true,
            }
            : def.inputSchema.token,
    };
    return {
        ...def,
        inputSchema,
        // ✅ TASK 10: Credential Resolution and Preflight Checks
        // Requirements 4.1, 4.2, 4.5, 8.5: Integrate with credential-preflight-check.ts
        credentialSchema: {
            requirements: [
                {
                    provider: 'vercel',
                    category: 'api_key',
                    required: true,
                    description: 'Vercel API token for deployment and management operations',
                    scopes: ['deployments:read', 'deployments:write'],
                },
            ],
            credentialFields: ['token'],
        },
        tags: Array.from(new Set([...(def.tags || []), 'devops', 'deployment', 'vercel'])),
        execute: async (context) => {
            // Use legacy executor for Vercel API integration
            // The legacy executor handles all Vercel operations (deploy, list_deployments)
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
