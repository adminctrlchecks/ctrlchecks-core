/**
 * ✅ SALESFORCE NODE - Migrated to Registry
 * 
 * Salesforce CRM integration.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { readAcknowledgedHttpResponse } from '../../http/acknowledged-response';
import { mergeAuthoritativeInputs } from '../../execution/runtime-input-handoff';

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

async function salesforceFetch(args: {
  instanceUrl: string;
  accessToken: string;
  apiVersion: string;
  path: string;
  init?: RequestInit;
}): Promise<any> {
  const url = `${trimSlash(args.instanceUrl)}/services/data/${args.apiVersion}${args.path}`;
  const response = await fetch(url, {
    ...(args.init || {}),
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      'Content-Type': 'application/json',
      ...((args.init?.headers || {}) as Record<string, string>),
    },
  });
  const parsed = await readAcknowledgedHttpResponse(response);
  const payload = parsed.data;
  if (!response.ok) {
    const message = Array.isArray(payload)
      ? payload.map((e) => e.message).filter(Boolean).join('; ')
      : payload?.message || parsed.rawText || `Salesforce API error ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export function overrideSalesforce(
  def: UnifiedNodeDefinition,
  _schema: NodeSchema
): UnifiedNodeDefinition {
  const manualStatic = {
    default: 'manual_static' as const,
    supportsRuntimeAI: false,
    supportsBuildtimeAI: false,
  };
  const structuralBuildtime = {
    default: 'buildtime_ai_once' as const,
    supportsRuntimeAI: false,
    supportsBuildtimeAI: true,
  };
  const OPERATIONS_NEEDING_RESOURCE = [
    'get', 'create', 'update', 'delete', 'upsert',
    'bulkCreate', 'bulkUpdate', 'bulkDelete', 'bulkUpsert',
  ];

  const inputSchema = {
    ...def.inputSchema,
    // Base schema (node-library.json) marks `resource` unconditionally required, but execute()
    // below only actually needs it for non-query/search operations. Mirror the same
    // required-only-for-certain-operations pattern already used by Zoom's `meetingId` field
    // (see overrides/zoom-video or its input schema) instead of blocking Query/Search runs.
    resource: {
      ...def.inputSchema.resource,
      required: false,
      ui: {
        ...(def.inputSchema.resource?.ui || {}),
        requiredIf: { field: 'operation', equals: OPERATIONS_NEEDING_RESOURCE },
      },
    },
    instanceUrl: {
      ...def.inputSchema.instanceUrl,
      required: true,
      // 'credential' (not 'value'): instanceUrl comes from the OAuth connection's stored
      // instance_url (see the instance_url -> instanceUrl alias in dynamic-node-executor.ts),
      // exactly like accessToken below. Marking it 'value' made the readiness gate
      // (services/ai/unified-readiness.ts, which excludes only ownershipClass === 'credential'
      // fields from its "you must fill this in" check) treat it as a manual field the user
      // has to type in, even though a valid connection already supplies it.
      ownership: 'credential' as const,
      role: 'config' as const,
      helpCategory: 'base_url' as const,
      fillMode: manualStatic,
    },
    accessToken: {
      ...def.inputSchema.accessToken,
      required: true,
      ownership: 'credential' as const,
      role: 'config' as const,
      helpCategory: 'oauth_token' as const,
      fillMode: manualStatic,
    },
    operation: {
      ...def.inputSchema.operation,
      ownership: 'structural' as const,
      role: 'operation_selector' as const,
      fillMode: structuralBuildtime,
      ui: {
        ...(def.inputSchema.operation?.ui || {}),
        options: [
          'query',
          'search',
          'get',
          'create',
          'update',
          'delete',
          'upsert',
          'bulkCreate',
          'bulkUpdate',
          'bulkDelete',
          'bulkUpsert',
        ].map((value) => ({ label: value.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), value })),
      },
    },
  };

  return {
    ...def,
    inputSchema,
    // `resource` is deliberately excluded here even though the base schema (node-library.json)
    // marks it required: execute() below only actually needs it for non-query/search operations
    // (`if (!resource && !['query','search'].includes(operation))`). Leaving the blanket
    // requirement in place blocked Query/Search runs from ever passing the readiness gate.
    requiredInputs: Array.from(
      new Set([...(def.requiredInputs || []).filter((f) => f !== 'resource'), 'operation', 'instanceUrl', 'accessToken']),
    ),
    credentialSchema: {
      requirements: [
        {
          provider: 'salesforce',
          category: 'oauth',
          required: true,
          description: 'Salesforce OAuth access token',
        },
      ],
      credentialFields: ['accessToken'],
    },
    execute: async (context) => {
      const inputs = mergeAuthoritativeInputs(context);
      const instanceUrl = String(inputs.instanceUrl || '').trim();
      const accessToken = String(inputs.accessToken || '').trim();
      const apiVersion = String(inputs.apiVersion || 'v59.0').trim();
      const operation = String(inputs.operation || 'query');
      const resource = String(inputs.resource === 'custom' ? inputs.customObject : inputs.resource || '').trim();

      try {
        if (!instanceUrl) throw new Error('instanceUrl is required');
        if (!accessToken) throw new Error('accessToken is required');
        if (!resource && !['query', 'search'].includes(operation)) throw new Error('resource is required');

        let output: any;
        switch (operation) {
          case 'query': {
            const soql = String(inputs.soql || '').trim();
            if (!soql) throw new Error('soql is required for query');
            output = await salesforceFetch({
              instanceUrl,
              accessToken,
              apiVersion,
              path: `/query?q=${encodeURIComponent(soql)}`,
            });
            break;
          }
          case 'search': {
            const sosl = String(inputs.sosl || '').trim();
            if (!sosl) throw new Error('sosl is required for search');
            output = await salesforceFetch({
              instanceUrl,
              accessToken,
              apiVersion,
              path: `/search/?q=${encodeURIComponent(sosl)}`,
            });
            break;
          }
          case 'get': {
            if (!inputs.id) throw new Error('id is required for get');
            output = await salesforceFetch({
              instanceUrl,
              accessToken,
              apiVersion,
              path: `/sobjects/${encodeURIComponent(resource)}/${encodeURIComponent(String(inputs.id))}`,
            });
            break;
          }
          case 'create': {
            output = await salesforceFetch({
              instanceUrl,
              accessToken,
              apiVersion,
              path: `/sobjects/${encodeURIComponent(resource)}`,
              init: { method: 'POST', body: JSON.stringify(inputs.fields || {}) },
            });
            break;
          }
          case 'update': {
            if (!inputs.id) throw new Error('id is required for update');
            output = await salesforceFetch({
              instanceUrl,
              accessToken,
              apiVersion,
              path: `/sobjects/${encodeURIComponent(resource)}/${encodeURIComponent(String(inputs.id))}`,
              init: { method: 'PATCH', body: JSON.stringify(inputs.fields || {}) },
            });
            break;
          }
          case 'delete': {
            if (!inputs.id) throw new Error('id is required for delete');
            await salesforceFetch({
              instanceUrl,
              accessToken,
              apiVersion,
              path: `/sobjects/${encodeURIComponent(resource)}/${encodeURIComponent(String(inputs.id))}`,
              init: { method: 'DELETE' },
            });
            output = { deleted: true, id: inputs.id };
            break;
          }
          case 'upsert': {
            if (!inputs.externalIdField || !inputs.externalIdValue) {
              throw new Error('externalIdField and externalIdValue are required for upsert');
            }
            output = await salesforceFetch({
              instanceUrl,
              accessToken,
              apiVersion,
              path: `/sobjects/${encodeURIComponent(resource)}/${encodeURIComponent(String(inputs.externalIdField))}/${encodeURIComponent(String(inputs.externalIdValue))}`,
              init: { method: 'PATCH', body: JSON.stringify(inputs.fields || {}) },
            });
            break;
          }
          case 'bulkCreate':
          case 'bulkUpdate':
          case 'bulkUpsert': {
            const records = Array.isArray(inputs.records) ? inputs.records : [];
            if (records.length === 0) throw new Error('records array is required for bulk operations');
            const method = operation === 'bulkCreate' ? 'POST' : operation === 'bulkUpdate' ? 'PATCH' : 'PATCH';
            const path = operation === 'bulkUpsert'
              ? `/composite/sobjects/${encodeURIComponent(resource)}/${encodeURIComponent(String(inputs.externalIdField || 'Id'))}`
              : `/composite/sobjects`;
            output = await salesforceFetch({
              instanceUrl,
              accessToken,
              apiVersion,
              path,
              init: {
                method,
                body: JSON.stringify({
                  allOrNone: false,
                  records: records.map((record: any) => ({ attributes: { type: resource }, ...record })),
                }),
              },
            });
            break;
          }
          case 'bulkDelete': {
            const records = Array.isArray(inputs.records) ? inputs.records : [];
            const ids = records.map((r: any) => r?.Id || r?.id).filter(Boolean);
            if (ids.length === 0) throw new Error('records with Id values are required for bulkDelete');
            output = [];
            for (const id of ids) {
              await salesforceFetch({
                instanceUrl,
                accessToken,
                apiVersion,
                path: `/sobjects/${encodeURIComponent(resource)}/${encodeURIComponent(String(id))}`,
                init: { method: 'DELETE' },
              });
              output.push({ id, deleted: true });
            }
            break;
          }
          default:
            throw new Error(`Unsupported Salesforce operation: ${operation}`);
        }
        return { success: true, output: { operation, resource, data: output } };
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'SALESFORCE_OPERATION_FAILED',
            message: error?.message || 'Salesforce operation failed',
            details: { operation, resource },
          },
        };
      }
    },
  };
}
