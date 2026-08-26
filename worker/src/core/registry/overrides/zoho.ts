/**
 * ✅ ZOHO NODE - Migrated to Registry
 * 
 * Zoho CRM integration.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';

const manualStatic = {
  default: 'manual_static' as const,
  supportsRuntimeAI: false,
  supportsBuildtimeAI: true,
};

const runtimeValue = {
  default: 'runtime_ai' as const,
  supportsRuntimeAI: true,
  supportsBuildtimeAI: true,
};

const apiDomainOptions = [
  { label: 'India', value: 'https://www.zohoapis.in' },
  { label: 'United States', value: 'https://www.zohoapis.com' },
  { label: 'Europe', value: 'https://www.zohoapis.eu' },
  { label: 'Australia', value: 'https://www.zohoapis.com.au' },
  { label: 'China', value: 'https://www.zohoapis.com.cn' },
  { label: 'Japan', value: 'https://www.zohoapis.jp' },
];

const resourceOptions = [
  { label: 'Leads', value: 'Leads' },
  { label: 'Contacts', value: 'Contacts' },
  { label: 'Accounts', value: 'Accounts' },
  { label: 'Deals', value: 'Deals' },
  { label: 'Campaigns', value: 'Campaigns' },
  { label: 'Tasks', value: 'Tasks' },
  { label: 'Events', value: 'Events' },
  { label: 'Calls', value: 'Calls' },
  { label: 'Products', value: 'Products' },
  { label: 'Quotes', value: 'Quotes' },
  { label: 'Sales Orders', value: 'Sales_Orders' },
  { label: 'Invoices', value: 'Invoices' },
];

const operationOptions = [
  { label: 'Create', value: 'create' },
  { label: 'Delete', value: 'delete' },
  { label: 'Get', value: 'get' },
  { label: 'Search', value: 'search' },
  { label: 'Update', value: 'update' },
];

const operationContracts: UnifiedNodeDefinition['operationContracts'] = [
  {
    operation: 'create',
    label: 'Create',
    requiredFields: ['resource', 'operation', 'data'],
    optionalFields: ['apiDomain'],
    credentialProviders: ['zoho'],
    outputFields: ['data'],
    legacyAliases: [],
    status: 'implemented',
    firstRunClass: 'write',
  },
  {
    operation: 'delete',
    label: 'Delete',
    requiredFields: ['resource', 'operation', 'recordId'],
    optionalFields: ['apiDomain'],
    credentialProviders: ['zoho'],
    outputFields: ['data'],
    legacyAliases: [],
    status: 'implemented',
    firstRunClass: 'destructive',
  },
  {
    operation: 'get',
    label: 'Get',
    requiredFields: ['resource', 'operation', 'recordId'],
    optionalFields: ['apiDomain'],
    credentialProviders: ['zoho'],
    outputFields: ['data'],
    legacyAliases: [],
    status: 'implemented',
    firstRunClass: 'read',
  },
  {
    operation: 'search',
    label: 'Search',
    requiredFields: ['resource', 'operation', 'criteria'],
    optionalFields: ['apiDomain'],
    credentialProviders: ['zoho'],
    outputFields: ['data'],
    legacyAliases: [],
    status: 'implemented',
    firstRunClass: 'read',
  },
  {
    operation: 'update',
    label: 'Update',
    requiredFields: ['resource', 'operation', 'recordId', 'data'],
    optionalFields: ['apiDomain'],
    credentialProviders: ['zoho'],
    outputFields: ['data'],
    legacyAliases: [],
    status: 'implemented',
    firstRunClass: 'write',
  },
];

export function overrideZoho(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  return {
    ...def,
    inputSchema: {
      ...def.inputSchema,
      apiDomain: {
        type: 'string',
        description: 'Zoho CRM API data-center domain. Use India for accounts connected through accounts.zoho.in.',
        required: false,
        default: 'https://www.zohoapis.in',
        examples: ['https://www.zohoapis.in'],
        role: 'config',
        ownership: 'structural',
        fillMode: manualStatic,
        ui: { options: apiDomainOptions },
      },
      resource: {
        ...def.inputSchema.resource,
        type: def.inputSchema.resource?.type || 'string',
        description: def.inputSchema.resource?.description || 'Zoho CRM module',
        required: true,
        default: def.inputSchema.resource?.default || 'Contacts',
        role: 'type_selector',
        ownership: 'structural',
        fillMode: manualStatic,
        ui: { options: resourceOptions },
      },
      operation: {
        ...def.inputSchema.operation,
        type: def.inputSchema.operation?.type || 'string',
        description: def.inputSchema.operation?.description || 'Zoho CRM operation',
        required: true,
        default: def.inputSchema.operation?.default || 'get',
        role: 'operation_selector',
        ownership: 'structural',
        fillMode: manualStatic,
        ui: { options: operationOptions },
      },
      recordId: {
        ...def.inputSchema.recordId,
        type: def.inputSchema.recordId?.type || 'string',
        description: def.inputSchema.recordId?.description || 'Zoho CRM record ID',
        required: false,
        role: 'id',
        ownership: 'value',
        fillMode: runtimeValue,
        ui: { visibleIf: { field: 'operation', equals: ['get', 'update', 'delete'] } },
      },
      criteria: {
        ...def.inputSchema.criteria,
        type: def.inputSchema.criteria?.type || 'string',
        description: def.inputSchema.criteria?.description || 'Zoho CRM search criteria',
        required: false,
        role: 'query',
        ownership: 'value',
        fillMode: runtimeValue,
        ui: { visibleIf: { field: 'operation', equals: 'search' } },
      },
      data: {
        ...def.inputSchema.data,
        type: def.inputSchema.data?.type || 'object',
        description: def.inputSchema.data?.description || 'Zoho CRM record payload for create and update operations',
        required: false,
        role: 'raw_json',
        ownership: 'value',
        fillMode: runtimeValue,
        ui: { visibleIf: { field: 'operation', equals: ['create', 'update'] } },
      },
    },
    requiredInputs: ['resource', 'operation'],
    credentialSchema: {
      requirements: [{
        provider: 'zoho',
        category: 'oauth',
        required: true,
        description: 'Zoho CRM OAuth connection',
        credentialTypeId: 'zoho_oauth2',
        authType: 'oauth2' as const,
        label: 'Zoho CRM OAuth2',
      }],
      credentialFields: ['accessToken', 'refreshToken', 'apiDomain', 'region'],
    },
    operationContracts,
    execute: async (context) => {
      return await executeViaLegacyExecutor({ context, schema });
    },
  };
}
