"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideMailchimp = overrideMailchimp;
const crypto_1 = __importDefault(require("crypto"));
const http_integration_utils_1 = require("./http-integration-utils");
function inferServerPrefix(apiKey, explicitPrefix) {
    const prefix = String(explicitPrefix || '').trim();
    if (prefix)
        return prefix;
    const suffix = apiKey.split('-').pop();
    if (!suffix || suffix === apiKey) {
        throw new Error('serverPrefix is required when the Mailchimp API key does not include a data-center suffix');
    }
    return suffix;
}
function subscriberHash(email) {
    return crypto_1.default.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
}
function overrideMailchimp(def, _schema) {
    const manualStatic = { default: 'manual_static', supportsRuntimeAI: false, supportsBuildtimeAI: false };
    const runtimeValue = { default: 'manual_static', supportsRuntimeAI: true, supportsBuildtimeAI: true };
    const operationOptions = ['subscribe', 'unsubscribe', 'send'].map((value) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        value,
    }));
    const inputSchema = {
        ...def.inputSchema,
        operation: {
            ...def.inputSchema.operation,
            ui: { ...(def.inputSchema.operation?.ui || {}), options: operationOptions },
        },
        apiKey: {
            type: 'string',
            description: 'Mailchimp Marketing API key',
            required: true,
            ownership: 'credential',
            role: 'config',
            helpCategory: 'api_key',
            fillMode: manualStatic,
        },
        serverPrefix: {
            type: 'string',
            description: 'Mailchimp data-center prefix, e.g. us21. Auto-detected from most API keys.',
            required: false,
            role: 'config',
            helpCategory: 'base_url',
            exampleValue: 'us21',
            fillMode: manualStatic,
        },
        listId: {
            ...def.inputSchema.listId,
            required: false,
            role: 'id',
        },
        email: {
            ...def.inputSchema.email,
            required: false,
            role: 'recipient',
            fillMode: { default: 'manual_static', supportsRuntimeAI: true, supportsBuildtimeAI: true },
        },
        mergeFields: {
            type: 'object',
            description: 'Mailchimp merge fields, e.g. { "FNAME": "Asha" }',
            required: false,
            role: 'raw_json',
            fillMode: { default: 'manual_static', supportsRuntimeAI: true, supportsBuildtimeAI: true },
        },
        campaignId: {
            type: 'string',
            description: 'Existing Mailchimp campaign ID to send',
            required: false,
            role: 'id',
            fillMode: manualStatic,
        },
        data: {
            type: 'object',
            description: 'Raw Mailchimp API payload override',
            required: false,
            role: 'raw_json',
            fillMode: runtimeValue,
        },
    };
    return {
        ...def,
        inputSchema,
        requiredInputs: Array.from(new Set([...(def.requiredInputs || []), 'apiKey'])),
        credentialSchema: {
            requirements: [{ provider: 'mailchimp', category: 'api_key', required: true, description: 'Mailchimp Marketing API key' }],
            credentialFields: ['apiKey'],
        },
        execute: async (context) => {
            const inputs = (0, http_integration_utils_1.mergeContextInputs)(context);
            const operation = String(inputs.operation || 'subscribe');
            const apiKey = String(inputs.apiKey || '').trim();
            try {
                if (!apiKey)
                    throw new Error('apiKey is required');
                const serverPrefix = inferServerPrefix(apiKey, inputs.serverPrefix);
                const baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0`;
                const headers = {
                    'Content-Type': 'application/json',
                    ...(0, http_integration_utils_1.basicAuthHeader)('ctrlchecks', apiKey),
                };
                let output;
                if (operation === 'subscribe') {
                    const listId = String(inputs.listId || '').trim();
                    const email = String(inputs.email || inputs.data?.email_address || inputs.data?.email || '').trim();
                    if (!listId)
                        throw new Error('listId is required for subscribe');
                    if (!email)
                        throw new Error('email is required for subscribe');
                    const body = inputs.data || {
                        email_address: email,
                        status_if_new: String(inputs.status || 'subscribed'),
                        status: String(inputs.status || 'subscribed'),
                        merge_fields: inputs.mergeFields || {},
                    };
                    output = await (0, http_integration_utils_1.integrationJsonRequest)(`${baseUrl}/lists/${encodeURIComponent(listId)}/members/${subscriberHash(email)}`, { method: 'PUT', headers, body: JSON.stringify(body) });
                }
                else if (operation === 'unsubscribe') {
                    const listId = String(inputs.listId || '').trim();
                    const email = String(inputs.email || inputs.data?.email_address || inputs.data?.email || '').trim();
                    if (!listId)
                        throw new Error('listId is required for unsubscribe');
                    if (!email)
                        throw new Error('email is required for unsubscribe');
                    output = await (0, http_integration_utils_1.integrationJsonRequest)(`${baseUrl}/lists/${encodeURIComponent(listId)}/members/${subscriberHash(email)}`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'unsubscribed', ...(inputs.data || {}) }) });
                }
                else if (operation === 'send') {
                    const campaignId = String(inputs.campaignId || '').trim();
                    if (!campaignId)
                        throw new Error('campaignId is required for send');
                    output = await (0, http_integration_utils_1.integrationJsonRequest)(`${baseUrl}/campaigns/${encodeURIComponent(campaignId)}/actions/send`, { method: 'POST', headers, body: JSON.stringify(inputs.data || {}) });
                }
                else {
                    throw new Error(`Unsupported Mailchimp operation: ${operation}`);
                }
                return { success: true, output: { operation, data: output } };
            }
            catch (error) {
                return { success: false, error: { code: 'MAILCHIMP_FAILED', message: error?.message || 'Mailchimp operation failed' } };
            }
        },
    };
}
