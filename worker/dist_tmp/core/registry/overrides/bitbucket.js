"use strict";
/**
 * ✅ BITBUCKET NODE - Migrated to Registry
 *
 * Bitbucket integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideBitbucket = overrideBitbucket;
const http_integration_utils_1 = require("./http-integration-utils");
function overrideBitbucket(def, _schema) {
    const manualStatic = { default: 'manual_static', supportsRuntimeAI: false, supportsBuildtimeAI: false };
    const buildtimeValue = { default: 'buildtime_ai_once', supportsRuntimeAI: false, supportsBuildtimeAI: true };
    const inputSchema = {
        ...def.inputSchema,
        operation: {
            ...def.inputSchema.operation,
            ui: {
                ...(def.inputSchema.operation?.ui || {}),
                options: ['read', 'create', 'update', 'delete'].map((value) => ({ label: value.charAt(0).toUpperCase() + value.slice(1), value })),
            },
        },
        workspace: { type: 'string', description: 'Bitbucket workspace', required: false, role: 'id', fillMode: buildtimeValue },
        repoSlug: { type: 'string', description: 'Bitbucket repository slug', required: false, role: 'id', fillMode: buildtimeValue },
        username: { type: 'string', description: 'Bitbucket username', required: false, ownership: 'credential', role: 'config', fillMode: manualStatic },
        appPassword: { type: 'string', description: 'Bitbucket app password', required: false, ownership: 'credential', role: 'config', fillMode: manualStatic },
        accessToken: { type: 'string', description: 'Bitbucket OAuth access token', required: false, ownership: 'credential', role: 'config', fillMode: manualStatic },
    };
    return {
        ...def,
        inputSchema,
        credentialSchema: {
            requirements: [{ provider: 'bitbucket', category: 'credential', required: true, description: 'Bitbucket app password or OAuth access token' }],
            credentialFields: ['username', 'appPassword', 'accessToken'],
        },
        execute: async (context) => {
            const inputs = (0, http_integration_utils_1.mergeContextInputs)(context);
            const operation = String(inputs.operation || 'read');
            const repoParts = String(inputs.repo || '').split('/');
            const workspace = String(inputs.workspace || repoParts[0] || '').trim();
            const repoSlug = String(inputs.repoSlug || repoParts[1] || '').trim();
            const headers = {
                'Content-Type': 'application/json',
                ...(inputs.accessToken
                    ? { Authorization: `Bearer ${inputs.accessToken}` }
                    : (0, http_integration_utils_1.basicAuthHeader)(String(inputs.username || ''), String(inputs.appPassword || ''))),
            };
            try {
                if (!workspace)
                    throw new Error('workspace is required');
                let output;
                if (operation === 'read') {
                    const url = repoSlug
                        ? `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}`
                        : `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}`;
                    output = await (0, http_integration_utils_1.integrationJsonRequest)(url, { headers });
                }
                else if (operation === 'create' || operation === 'update') {
                    if (!repoSlug)
                        throw new Error('repoSlug is required');
                    output = await (0, http_integration_utils_1.integrationJsonRequest)(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}`, {
                        method: operation === 'create' ? 'POST' : 'PUT',
                        headers,
                        body: JSON.stringify(inputs.data || { scm: 'git', is_private: inputs.isPrivate ?? true, description: inputs.description }),
                    });
                }
                else if (operation === 'delete') {
                    if (!repoSlug)
                        throw new Error('repoSlug is required');
                    await (0, http_integration_utils_1.integrationJsonRequest)(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}`, {
                        method: 'DELETE',
                        headers,
                    });
                    output = { deleted: true, workspace, repoSlug };
                }
                else {
                    throw new Error(`Unsupported Bitbucket operation: ${operation}`);
                }
                return { success: true, output: { operation, data: output } };
            }
            catch (error) {
                return { success: false, error: { code: 'BITBUCKET_FAILED', message: error?.message || 'Bitbucket operation failed' } };
            }
        },
    };
}
