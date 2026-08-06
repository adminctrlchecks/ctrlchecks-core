import { URL } from 'url';
import type { RuntimeExecutionContext, RuntimeRequest } from './types';
import { ConnectionService, connectionService } from './connection-service';
import { getCredentialType } from './credential-type-registry';

function renderTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g, (_, key: string, fallback: string) => {
    const value = values[key.trim()];
    return value === undefined || value === null || value === '' ? (fallback || '') : String(value);
  });
}

function renderRuntimeValue(value: unknown, values: Record<string, unknown>): unknown {
  if (typeof value === 'string') return renderTemplate(value, values);
  if (Array.isArray(value)) return value.map((item) => renderRuntimeValue(item, values));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        renderTemplate(key, values),
        renderRuntimeValue(nested, values),
      ]),
    );
  }
  return value;
}

export class AuthInjectionEngine {
  constructor(private readonly connections: ConnectionService = connectionService) {}

  async injectIntoRequest(context: RuntimeExecutionContext, request: RuntimeRequest): Promise<RuntimeRequest> {
    const connection = await this.connections.getDecryptedConnection(context.userId, context.connectionId);
    const definition = getCredentialType(connection.credentialTypeId);
    if (!definition) throw new Error(`Unknown credential type: ${connection.credentialTypeId}`);

    if (connection.status !== 'active') {
      throw new Error(`Connection is not available (status: ${connection.status}). Please reconnect.`);
    }

    const headers = renderRuntimeValue(request.headers || {}, connection.credentials) as Record<string, string>;
    const query = renderRuntimeValue(request.query || {}, connection.credentials) as Record<string, string>;
    const body = renderRuntimeValue(request.body, connection.credentials);
    const url = new URL(renderTemplate(request.url, connection.credentials));
    for (const [key, value] of Object.entries(query)) {
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
    return { ...request, url: url.toString(), headers, body };
  }

  async executeNodeRequest(context: RuntimeExecutionContext, request: RuntimeRequest): Promise<{
    status: number;
    headers: Record<string, string>;
    data: unknown;
  }> {
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

export const authInjectionEngine = new AuthInjectionEngine();
