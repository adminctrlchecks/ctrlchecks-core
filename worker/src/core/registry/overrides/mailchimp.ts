import crypto from 'crypto';
import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { basicAuthHeader, integrationJsonRequest, mergeContextInputs } from './http-integration-utils';

function inferServerPrefix(apiKey: string, explicitPrefix?: string): string {
  const prefix = String(explicitPrefix || '').trim();
  if (prefix) return prefix;
  const suffix = apiKey.split('-').pop();
  if (!suffix || suffix === apiKey) {
    throw new Error('serverPrefix is required when the Mailchimp API key does not include a data-center suffix');
  }
  return suffix;
}

function subscriberHash(email: string): string {
  return crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
}

export function overrideMailchimp(def: UnifiedNodeDefinition, _schema: NodeSchema): UnifiedNodeDefinition {
  const manualStatic = { default: 'manual_static' as const, supportsRuntimeAI: false, supportsBuildtimeAI: false };
  const runtimeValue = { default: 'manual_static' as const, supportsRuntimeAI: true, supportsBuildtimeAI: true };
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
      type: 'string' as const,
      description: 'Mailchimp Marketing API key',
      required: true,
      ownership: 'credential' as const,
      role: 'config' as const,
      helpCategory: 'api_key' as const,
      fillMode: manualStatic,
    },
    serverPrefix: {
      type: 'string' as const,
      description: 'Mailchimp data-center prefix, e.g. us21. Auto-detected from most API keys.',
      required: false,
      role: 'config' as const,
      helpCategory: 'base_url' as const,
      exampleValue: 'us21',
      fillMode: manualStatic,
    },
    listId: {
      ...def.inputSchema.listId,
      required: false,
      role: 'id' as const,
    },
    email: {
      ...def.inputSchema.email,
      required: false,
      role: 'recipient' as const,
      fillMode: { default: 'manual_static' as const, supportsRuntimeAI: true, supportsBuildtimeAI: true },
    },
    mergeFields: {
      type: 'object' as const,
      description: 'Mailchimp merge fields, e.g. { "FNAME": "Asha" }',
      required: false,
      role: 'raw_json' as const,
      fillMode: { default: 'manual_static' as const, supportsRuntimeAI: true, supportsBuildtimeAI: true },
    },
    campaignId: {
      type: 'string' as const,
      description: 'Existing Mailchimp campaign ID to send',
      required: false,
      role: 'id' as const,
      fillMode: manualStatic,
    },
    data: {
      type: 'object' as const,
      description: 'Raw Mailchimp API payload override',
      required: false,
      role: 'raw_json' as const,
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
      const inputs = mergeContextInputs(context);
      const operation = String(inputs.operation || 'subscribe');
      const apiKey = String(inputs.apiKey || '').trim();
      try {
        if (!apiKey) throw new Error('apiKey is required');
        const serverPrefix = inferServerPrefix(apiKey, inputs.serverPrefix);
        const baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0`;
        const headers = {
          'Content-Type': 'application/json',
          ...basicAuthHeader('ctrlchecks', apiKey),
        };

        let output: any;
        if (operation === 'subscribe') {
          const listId = String(inputs.listId || '').trim();
          const email = String(inputs.email || inputs.data?.email_address || inputs.data?.email || '').trim();
          if (!listId) throw new Error('listId is required for subscribe');
          if (!email) throw new Error('email is required for subscribe');
          // inputs.data defaults to {} (an empty object), which is truthy in JS — `inputs.data ||
          // {...}` always picked that empty default over the real email_address/status payload
          // below, so Mailchimp received a genuinely empty body no matter what Email/List Id the
          // user filled in. Only use inputs.data as an override when it actually has content.
          const hasDataOverride = inputs.data && typeof inputs.data === 'object' && Object.keys(inputs.data).length > 0;
          const body = hasDataOverride ? inputs.data : {
            email_address: email,
            status_if_new: String(inputs.status || 'subscribed'),
            status: String(inputs.status || 'subscribed'),
            merge_fields: inputs.mergeFields || {},
          };
          output = await integrationJsonRequest(
            `${baseUrl}/lists/${encodeURIComponent(listId)}/members/${subscriberHash(email)}`,
            { method: 'PUT', headers, body: JSON.stringify(body) },
          );
        } else if (operation === 'unsubscribe') {
          const listId = String(inputs.listId || '').trim();
          const email = String(inputs.email || inputs.data?.email_address || inputs.data?.email || '').trim();
          if (!listId) throw new Error('listId is required for unsubscribe');
          if (!email) throw new Error('email is required for unsubscribe');
          output = await integrationJsonRequest(
            `${baseUrl}/lists/${encodeURIComponent(listId)}/members/${subscriberHash(email)}`,
            { method: 'PATCH', headers, body: JSON.stringify({ status: 'unsubscribed', ...(inputs.data || {}) }) },
          );
        } else if (operation === 'send') {
          const campaignId = String(inputs.campaignId || '').trim();
          if (!campaignId) throw new Error('campaignId is required for send');
          output = await integrationJsonRequest(
            `${baseUrl}/campaigns/${encodeURIComponent(campaignId)}/actions/send`,
            { method: 'POST', headers, body: JSON.stringify(inputs.data || {}) },
          );
        } else {
          throw new Error(`Unsupported Mailchimp operation: ${operation}`);
        }

        // Curated summary up front — a raw Mailchimp member object has 30+ internal fields
        // (ip_opt, gravatar-style fields, sms_subscription_status, a dozen _links entries, ...)
        // that bury the handful most workflows actually reference downstream.
        const summary = output && typeof output === 'object' && !Array.isArray(output) && 'email_address' in output
          ? {
              memberId: (output as any).id,
              email: (output as any).email_address,
              status: (output as any).status,
              listId: (output as any).list_id,
            }
          : {};
        return { success: true, output: { operation, ...summary, data: output } };
      } catch (error: any) {
        return { success: false, error: { code: 'MAILCHIMP_FAILED', message: error?.message || 'Mailchimp operation failed' } };
      }
    },
  };
}
