"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideJenkins = overrideJenkins;
const http_integration_utils_1 = require("./http-integration-utils");
function jobPath(jobName) {
    return jobName
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => `job/${encodeURIComponent(part)}`)
        .join('/');
}
async function readJenkinsPayload(response) {
    const text = await response.text();
    if (!text)
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
async function jenkinsRequest(url, init, expectJson = false) {
    const response = await fetch(url, init);
    const payload = await readJenkinsPayload(response);
    if (!response.ok) {
        const message = payload?.message || payload?.detail || (typeof payload === 'string' ? payload : '') || `Jenkins API error ${response.status}`;
        throw new Error(message);
    }
    if (expectJson)
        return payload;
    return {
        status: response.status,
        location: response.headers.get('location') || undefined,
        data: payload,
    };
}
async function getCrumb(baseUrl, headers) {
    try {
        const payload = await jenkinsRequest(`${baseUrl}/crumbIssuer/api/json`, { headers }, true);
        if (payload?.crumbRequestField && payload?.crumb) {
            return { [payload.crumbRequestField]: payload.crumb };
        }
    }
    catch {
        // Many Jenkins installations disable crumbs for API-token requests.
    }
    return {};
}
function overrideJenkins(def, _schema) {
    const manualStatic = { default: 'manual_static', supportsRuntimeAI: false, supportsBuildtimeAI: false };
    const operationOptions = ['build', 'status', 'cancel'].map((value) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        value,
    }));
    const inputSchema = {
        ...def.inputSchema,
        operation: {
            ...def.inputSchema.operation,
            ui: { ...(def.inputSchema.operation?.ui || {}), options: operationOptions },
        },
        baseUrl: {
            type: 'string',
            description: 'Jenkins base URL, e.g. https://jenkins.example.com',
            required: true,
            role: 'config',
            helpCategory: 'base_url',
            fillMode: manualStatic,
        },
        username: {
            type: 'string',
            description: 'Jenkins username',
            required: true,
            ownership: 'credential',
            role: 'config',
            helpCategory: 'generic_credential',
            fillMode: manualStatic,
        },
        apiToken: {
            type: 'string',
            description: 'Jenkins API token',
            required: true,
            ownership: 'credential',
            role: 'config',
            helpCategory: 'api_key',
            fillMode: manualStatic,
        },
        jobName: {
            ...def.inputSchema.jobName,
            required: false,
            role: 'id',
        },
        buildNumber: {
            type: 'string',
            description: 'Build number for status or cancel operations',
            required: false,
            role: 'id',
            fillMode: manualStatic,
        },
        parameters: {
            type: 'object',
            description: 'Jenkins build parameters for parameterized jobs',
            required: false,
            role: 'raw_json',
            fillMode: { default: 'manual_static', supportsRuntimeAI: true, supportsBuildtimeAI: true },
        },
    };
    return {
        ...def,
        inputSchema,
        requiredInputs: Array.from(new Set([...(def.requiredInputs || []), 'baseUrl', 'username', 'apiToken'])),
        credentialSchema: {
            requirements: [{ provider: 'jenkins', category: 'api_key', required: true, description: 'Jenkins username and API token' }],
            credentialFields: ['username', 'apiToken'],
        },
        execute: async (context) => {
            const inputs = (0, http_integration_utils_1.mergeContextInputs)(context);
            const operation = String(inputs.operation || 'build');
            const baseUrl = (0, http_integration_utils_1.stripTrailingSlash)(String(inputs.baseUrl || inputs.url || '').trim());
            const username = String(inputs.username || '').trim();
            const apiToken = String(inputs.apiToken || '').trim();
            const name = String(inputs.jobName || '').trim();
            try {
                if (!baseUrl)
                    throw new Error('baseUrl is required');
                if (!username)
                    throw new Error('username is required');
                if (!apiToken)
                    throw new Error('apiToken is required');
                if (!name)
                    throw new Error('jobName is required');
                const path = jobPath(name);
                if (!path)
                    throw new Error('jobName is required');
                const authHeaders = (0, http_integration_utils_1.basicAuthHeader)(username, apiToken);
                const postHeaders = { ...authHeaders, ...(await getCrumb(baseUrl, authHeaders)) };
                let output;
                if (operation === 'build') {
                    const parameters = inputs.parameters && typeof inputs.parameters === 'object' ? inputs.parameters : {};
                    const hasParameters = Object.keys(parameters).length > 0;
                    if (hasParameters) {
                        const body = new URLSearchParams();
                        Object.entries(parameters).forEach(([key, value]) => body.set(key, String(value)));
                        output = await jenkinsRequest(`${baseUrl}/${path}/buildWithParameters`, {
                            method: 'POST',
                            headers: { ...postHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
                            body,
                        });
                    }
                    else {
                        output = await jenkinsRequest(`${baseUrl}/${path}/build`, { method: 'POST', headers: postHeaders });
                    }
                }
                else if (operation === 'status') {
                    const buildRef = inputs.buildNumber ? encodeURIComponent(String(inputs.buildNumber)) : 'lastBuild';
                    output = await jenkinsRequest(`${baseUrl}/${path}/${buildRef}/api/json`, { headers: authHeaders }, true);
                }
                else if (operation === 'cancel') {
                    const buildNumber = String(inputs.buildNumber || '').trim();
                    if (!buildNumber)
                        throw new Error('buildNumber is required for cancel');
                    output = await jenkinsRequest(`${baseUrl}/${path}/${encodeURIComponent(buildNumber)}/stop`, { method: 'POST', headers: postHeaders });
                }
                else {
                    throw new Error(`Unsupported Jenkins operation: ${operation}`);
                }
                return { success: true, output: { operation, jobName: name, data: output } };
            }
            catch (error) {
                return { success: false, error: { code: 'JENKINS_FAILED', message: error?.message || 'Jenkins operation failed' } };
            }
        },
    };
}
