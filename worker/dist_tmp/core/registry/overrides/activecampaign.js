"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideActivecampaign = overrideActivecampaign;
const http_integration_utils_1 = require("./http-integration-utils");
function overrideActivecampaign(def, _schema) {
    const manualStatic = { default: 'manual_static', supportsRuntimeAI: false, supportsBuildtimeAI: false };
    const runtimeValue = { default: 'manual_static', supportsRuntimeAI: true, supportsBuildtimeAI: true };
    const inputSchema = {
        ...def.inputSchema,
        operation: {
            ...def.inputSchema.operation,
            ui: { ...(def.inputSchema.operation?.ui || {}), options: ['add', 'update', 'delete'].map((value) => ({ label: value.charAt(0).toUpperCase() + value.slice(1), value })) },
        },
        apiUrl: { type: 'string', description: 'ActiveCampaign API URL, e.g. https://account.api-us1.com', required: true, role: 'config', helpCategory: 'base_url', fillMode: manualStatic },
        apiKey: { type: 'string', description: 'ActiveCampaign API key', required: true, ownership: 'credential', role: 'config', helpCategory: 'api_key', fillMode: manualStatic },
        email: { type: 'string', description: 'Contact email address', required: false, role: 'recipient', fillMode: runtimeValue },
        firstName: { type: 'string', description: 'Contact first name', required: false, role: 'title_like', fillMode: runtimeValue },
        lastName: { type: 'string', description: 'Contact last name', required: false, role: 'title_like', fillMode: runtimeValue },
        data: { type: 'object', description: 'Raw ActiveCampaign contact payload override', required: false, role: 'raw_json', fillMode: runtimeValue },
    };
    return {
        ...def,
        inputSchema,
        requiredInputs: Array.from(new Set([...(def.requiredInputs || []), 'apiUrl', 'apiKey'])),
        credentialSchema: {
            requirements: [{ provider: 'activecampaign', category: 'api_key', required: true, description: 'ActiveCampaign API key' }],
            credentialFields: ['apiKey'],
        },
        execute: async (context) => {
            const inputs = (0, http_integration_utils_1.mergeContextInputs)(context);
            const operation = String(inputs.operation || 'add');
            const baseUrl = (0, http_integration_utils_1.stripTrailingSlash)(String(inputs.apiUrl || ''));
            const apiKey = String(inputs.apiKey || '');
            const headers = { 'Content-Type': 'application/json', 'Api-Token': apiKey };
            try {
                if (!baseUrl)
                    throw new Error('apiUrl is required');
                if (!apiKey)
                    throw new Error('apiKey is required');
                let output;
                if (operation === 'add') {
                    if (!inputs.email && !inputs.data?.email)
                        throw new Error('email is required for add');
                    output = await (0, http_integration_utils_1.integrationJsonRequest)(`${baseUrl}/api/3/contacts`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ contact: inputs.data || { email: inputs.email, firstName: inputs.firstName, lastName: inputs.lastName } }),
                    });
                }
                else if (operation === 'update') {
                    if (!inputs.contactId)
                        throw new Error('contactId is required for update');
                    output = await (0, http_integration_utils_1.integrationJsonRequest)(`${baseUrl}/api/3/contacts/${encodeURIComponent(String(inputs.contactId))}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ contact: inputs.data || { email: inputs.email, firstName: inputs.firstName, lastName: inputs.lastName } }),
                    });
                }
                else if (operation === 'delete') {
                    if (!inputs.contactId)
                        throw new Error('contactId is required for delete');
                    await (0, http_integration_utils_1.integrationJsonRequest)(`${baseUrl}/api/3/contacts/${encodeURIComponent(String(inputs.contactId))}`, { method: 'DELETE', headers });
                    output = { deleted: true, contactId: inputs.contactId };
                }
                else {
                    throw new Error(`Unsupported ActiveCampaign operation: ${operation}`);
                }
                return { success: true, output: { operation, data: output } };
            }
            catch (error) {
                return { success: false, error: { code: 'ACTIVECAMPAIGN_FAILED', message: error?.message || 'ActiveCampaign operation failed' } };
            }
        },
    };
}
