"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authInjectionEngine = exports.AuthInjectionEngine = void 0;
const url_1 = require("url");
const connection_service_1 = require("./connection-service");
const credential_type_registry_1 = require("./credential-type-registry");
function renderTemplate(template, values) {
    return template.replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g, (_, key, fallback) => {
        const value = values[key.trim()];
        return value === undefined || value === null || value === '' ? (fallback || '') : String(value);
    });
}
class AuthInjectionEngine {
    constructor(connections = connection_service_1.connectionService) {
        this.connections = connections;
    }
    async injectIntoRequest(context, request) {
        const connection = await this.connections.getDecryptedConnection(context.userId, context.connectionId);
        const definition = (0, credential_type_registry_1.getCredentialType)(connection.credentialTypeId);
        if (!definition)
            throw new Error(`Unknown credential type: ${connection.credentialTypeId}`);
        if (connection.status !== 'active') {
            throw new Error(`Connection is not available (status: ${connection.status}). Please reconnect.`);
        }
        const headers = { ...(request.headers || {}) };
        const url = new url_1.URL(request.url);
        for (const [key, value] of Object.entries(request.query || {})) {
            url.searchParams.set(key, value);
        }
        for (const rule of definition.injection) {
            if (rule.target === 'header' && rule.name) {
                headers[renderTemplate(rule.name, connection.credentials)] = renderTemplate(rule.valueTemplate, connection.credentials);
            }
            if (rule.target === 'query' && rule.name) {
                url.searchParams.set(renderTemplate(rule.name, connection.credentials), renderTemplate(rule.valueTemplate, connection.credentials));
            }
            if (rule.target === 'basic_auth') {
                const raw = renderTemplate(rule.valueTemplate, connection.credentials);
                headers.Authorization = `Basic ${Buffer.from(raw).toString('base64')}`;
            }
        }
        await this.connections.markUsed(context.userId, context.connectionId);
        return { ...request, url: url.toString(), headers };
    }
    async executeNodeRequest(context, request) {
        const injected = await this.injectIntoRequest(context, request);
        const response = await fetch(injected.url, {
            method: injected.method,
            headers: injected.headers,
            body: injected.body ? JSON.stringify(injected.body) : undefined,
        });
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.json() : await response.text();
        return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data,
        };
    }
}
exports.AuthInjectionEngine = AuthInjectionEngine;
exports.authInjectionEngine = new AuthInjectionEngine();
