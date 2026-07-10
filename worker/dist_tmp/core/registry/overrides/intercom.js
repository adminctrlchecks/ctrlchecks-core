"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideIntercom = overrideIntercom;
const http_integration_utils_1 = require("./http-integration-utils");
function overrideIntercom(def, _schema) {
    const manualStatic = { default: 'manual_static', supportsRuntimeAI: false, supportsBuildtimeAI: false };
    const runtimeValue = { default: 'manual_static', supportsRuntimeAI: true, supportsBuildtimeAI: true };
    const operationOptions = ['send', 'get', 'list'].map((value) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        value,
    }));
    const inputSchema = {
        ...def.inputSchema,
        operation: {
            ...def.inputSchema.operation,
            ui: { ...(def.inputSchema.operation?.ui || {}), options: operationOptions },
        },
        accessToken: {
            type: 'string',
            description: 'Intercom OAuth access token',
            required: true,
            ownership: 'credential',
            role: 'config',
            helpCategory: 'oauth_token',
            fillMode: manualStatic,
        },
        conversationId: {
            ...def.inputSchema.conversationId,
            required: false,
            role: 'id',
        },
        message: {
            type: 'string',
            description: 'Message body for the conversation reply',
            required: false,
            role: 'long_body',
            fillMode: { default: 'manual_static', supportsRuntimeAI: true, supportsBuildtimeAI: true },
        },
        adminId: {
            type: 'string',
            description: 'Intercom admin ID used when replying as an admin',
            required: false,
            role: 'id',
            fillMode: manualStatic,
        },
        perPage: {
            type: 'number',
            description: 'Number of conversations to list',
            required: false,
            default: 20,
            role: 'config',
            fillMode: manualStatic,
        },
        startingAfter: {
            type: 'string',
            description: 'Pagination cursor for listing conversations',
            required: false,
            role: 'id',
            fillMode: manualStatic,
        },
        data: {
            type: 'object',
            description: 'Raw Intercom API payload override',
            required: false,
            role: 'raw_json',
            fillMode: runtimeValue,
        },
    };
    return {
        ...def,
        inputSchema,
        requiredInputs: Array.from(new Set([...(def.requiredInputs || []), 'accessToken'])),
        credentialSchema: {
            requirements: [{ provider: 'intercom', category: 'oauth', required: true, description: 'Intercom OAuth access token' }],
            credentialFields: ['accessToken'],
        },
        execute: async (context) => {
            const inputs = (0, http_integration_utils_1.mergeContextInputs)(context);
            const operation = String(inputs.operation || 'list');
            const accessToken = String(inputs.accessToken || '').trim();
            const headers = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Intercom-Version': String(inputs.apiVersion || '2.11'),
                ...(0, http_integration_utils_1.authHeaderFromToken)(accessToken),
            };
            try {
                if (!accessToken)
                    throw new Error('accessToken is required');
                let output;
                if (operation === 'list') {
                    const params = new URLSearchParams({ per_page: String(inputs.perPage || 20) });
                    if (inputs.startingAfter)
                        params.set('starting_after', String(inputs.startingAfter));
                    output = await (0, http_integration_utils_1.integrationJsonRequest)(`https://api.intercom.io/conversations?${params.toString()}`, { headers });
                }
                else if (operation === 'get') {
                    const conversationId = String(inputs.conversationId || '').trim();
                    if (!conversationId)
                        throw new Error('conversationId is required for get');
                    output = await (0, http_integration_utils_1.integrationJsonRequest)(`https://api.intercom.io/conversations/${encodeURIComponent(conversationId)}`, { headers });
                }
                else if (operation === 'send') {
                    const conversationId = String(inputs.conversationId || '').trim();
                    const message = String(inputs.message || inputs.body || '').trim();
                    const adminId = String(inputs.adminId || '').trim();
                    if (!conversationId)
                        throw new Error('conversationId is required for send');
                    if (!message && !inputs.data)
                        throw new Error('message is required for send');
                    if (!adminId && !inputs.data)
                        throw new Error('adminId is required for admin conversation replies');
                    output = await (0, http_integration_utils_1.integrationJsonRequest)(`https://api.intercom.io/conversations/${encodeURIComponent(conversationId)}/reply`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(inputs.data || {
                            message_type: 'comment',
                            type: 'admin',
                            admin_id: adminId,
                            body: message,
                        }),
                    });
                }
                else {
                    throw new Error(`Unsupported Intercom operation: ${operation}`);
                }
                return { success: true, output: { operation, data: output } };
            }
            catch (error) {
                return { success: false, error: { code: 'INTERCOM_FAILED', message: error?.message || 'Intercom operation failed' } };
            }
        },
    };
}
