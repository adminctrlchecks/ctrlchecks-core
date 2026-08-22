import {
  buildFinalProviderConfig,
  createProviderExecutionContext,
  mergeAuthoritativeInputs,
  validateRuntimeInputHandoff,
} from '../runtime-input-handoff';
import type { NodeInputSchema, RuntimeInputSource } from '../../types/unified-node-contract';
import type { NormalizedOperationContract } from '../../operations/operation-contract-resolver';
import { unifiedNodeRegistry } from '../../registry/unified-node-registry';
import { resolveFieldPolicyForNode } from '../../operations/field-policy-resolver';
import { buildEffectiveFillModes } from '../../utils/fill-mode-resolver';

describe('runtime-input-handoff', () => {
  const inputSchema: NodeInputSchema = {
    operation: { type: 'string', description: 'operation', required: false },
    recipientEmails: {
      type: 'string',
      description: 'recipients',
      required: false,
      fillMode: { default: 'runtime_ai', supportsRuntimeAI: true },
      runtimeContract: {
        role: 'recipient',
        requiredWhen: [{ field: 'operation', equals: 'send' }],
        validation: { format: 'email_list' },
      },
    },
    subject: {
      type: 'string',
      description: 'subject',
      required: false,
      fillMode: { default: 'runtime_ai', supportsRuntimeAI: true },
      runtimeContract: { role: 'subject', validation: { format: 'non_empty' } },
    },
  };

  it('runtime_ai final values override stale static config before provider execution', () => {
    const inputSources: Record<string, RuntimeInputSource> = {
      operation: 'static_config',
      recipientEmails: 'runtime_ai',
      subject: 'runtime_ai',
    };

    const { config } = buildFinalProviderConfig({
      baseConfig: {
        operation: 'send',
        recipientEmails: 'v',
        subject: '',
      },
      finalResolvedInputs: {
        operation: 'send',
        recipientEmails: 'vusalashivakumar@gmail.com',
        subject: 'Application submitted successfully',
      },
      inputSources,
      inputSchema,
      effectiveFillModes: {
        operation: 'manual_static',
        recipientEmails: 'runtime_ai',
        subject: 'runtime_ai',
      },
    });

    expect(config.recipientEmails).toBe('vusalashivakumar@gmail.com');
    expect(config.subject).toBe('Application submitted successfully');
  });

  it('never lets a resolved value populate a static identity field (range / spreadsheetId)', () => {
    const sheetSchema: NodeInputSchema = {
      operation: { type: 'string', description: 'op', required: false },
      spreadsheetId: { type: 'string', description: 'id', required: false },
      sheetName: { type: 'string', description: 'tab', required: false },
      range: { type: 'string', description: 'range', required: false },
      values: { type: 'array', description: 'rows', required: false },
    };

    const { config, appliedFields } = buildFinalProviderConfig({
      baseConfig: { operation: 'read', spreadsheetId: '15uvo', sheetName: 'Business_Knowledge', range: '' },
      // The runtime resolution inferred junk for the identity fields (operation value "read"
      // leaking into range; a human name into spreadsheetId). These must be ignored.
      finalResolvedInputs: { range: 'read', spreadsheetId: 'Business Knowledge', values: [['x']] },
      inputSources: { range: 'static_config', spreadsheetId: 'static_config', values: 'runtime_ai' },
      inputSchema: sheetSchema,
      effectiveFillModes: {
        operation: 'manual_static',
        spreadsheetId: 'manual_static',
        sheetName: 'manual_static',
        range: 'manual_static',
        values: 'runtime_ai',
      },
    });

    expect(config.range).toBe('');                         // stays empty → node reads all cells
    expect(config.spreadsheetId).toBe('15uvo');            // keeps the user's configured id
    expect(config.values).toEqual([['x']]);                // non-identity data still applied
    expect(appliedFields).not.toContain('range');
    expect(appliedFields).not.toContain('spreadsheetId');
  });

  it('allows a resolved value on an identity field explicitly set to runtime_ai (opt-in)', () => {
    const sheetSchema: NodeInputSchema = {
      spreadsheetId: {
        type: 'string',
        description: 'id',
        required: false,
        fillMode: { default: 'runtime_ai', supportsRuntimeAI: true },
      },
    };

    const { config } = buildFinalProviderConfig({
      baseConfig: { spreadsheetId: '' },
      finalResolvedInputs: { spreadsheetId: 'abc123' },
      inputSources: { spreadsheetId: 'runtime_ai' },
      inputSchema: sheetSchema,
      effectiveFillModes: { spreadsheetId: 'runtime_ai' },
    });

    expect(config.spreadsheetId).toBe('abc123');
  });

  it('blocks when a runtime-owned value is resolved but not delivered to provider config', () => {
    const result = validateRuntimeInputHandoff({
      nodeId: 'gmail_1',
      nodeType: 'google_gmail',
      finalResolvedInputs: {
        operation: 'send',
        recipientEmails: 'vusalashivakumar@gmail.com',
      },
      providerConfig: {
        operation: 'send',
        recipientEmails: 'v',
      },
      inputSources: {
        operation: 'static_config',
        recipientEmails: 'runtime_ai',
      },
      inputSchema,
      effectiveFillModes: {
        operation: 'manual_static',
        recipientEmails: 'runtime_ai',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('recipientEmails');
    expect(result.audit.find((entry) => entry.fieldName === 'recipientEmails')?.handoffStatus).toBe('missing');
  });

  it('shared adapter merge gives finalResolvedInputs precedence over stale config', () => {
    const merged = mergeAuthoritativeInputs({
      config: {
        recipientEmails: 'v',
        subject: 'old subject',
        operation: 'send',
      },
      inputs: {
        recipientEmails: 'input@example.com',
      },
      finalResolvedInputs: {
        recipientEmails: 'vusalashivakumar@gmail.com',
        subject: 'Application submitted successfully',
      },
    });

    expect(merged.recipientEmails).toBe('vusalashivakumar@gmail.com');
    expect(merged.subject).toBe('Application submitted successfully');
    expect(merged.operation).toBe('send');
  });

  it('creates a standard provider context from final resolved runtime inputs', () => {
    const providerContext = createProviderExecutionContext({
      finalResolvedInputs: {
        recipientEmails: ['vusalashivakumar@gmail.com'],
        subject: 'Application submitted successfully',
      },
      inputs: {
        recipientEmails: 'stale@example.com',
      },
      resolvedInputSources: {
        recipientEmails: 'runtime_ai',
        subject: 'runtime_ai',
      },
      fieldContracts: inputSchema,
      operation: 'send',
      rawUpstreamInput: { name: 'Vusala Shiva kumar' },
      lineageContext: { workflowIntent: 'send confirmation email' },
    });

    expect(providerContext.finalResolvedInputs.recipientEmails).toEqual(['vusalashivakumar@gmail.com']);
    expect(providerContext.resolvedInputSources.subject).toBe('runtime_ai');
    expect(providerContext.operation).toBe('send');
    expect(providerContext.fieldContracts?.subject?.runtimeContract?.role).toBe('subject');
  });

  it('accepts empty provider-default fields during runtime handoff', () => {
    const operationContract: NormalizedOperationContract = {
      operation: 'append',
      label: 'Append',
      requiredFields: ['operation', 'spreadsheetId', 'sheetName'],
      optionalFields: ['range', 'outputFormat'],
      forbiddenFields: [],
      conditionallyRequiredFields: [],
      payloadGroups: [{ name: 'writePayload', anyOf: ['values', 'data'], required: true }],
      emptyValuePolicy: { range: 'provider_default' },
      providerDefaultFields: ['range'],
      fieldSourcePolicy: {},
      runtimeAiPolicy: {},
      activeFields: ['operation', 'spreadsheetId', 'sheetName', 'range', 'values', 'data'],
      credentialProviders: ['google'],
      outputFields: ['default'],
      legacyAliases: [],
      status: 'implemented',
      diagnostics: [],
      generated: false,
    };

    const result = validateRuntimeInputHandoff({
      nodeId: 'sheets_1',
      nodeType: 'google_sheets',
      finalResolvedInputs: {
        operation: 'append',
        spreadsheetId: 'sheet_123',
        sheetName: 'job',
        range: '',
        values: [['Vusala Shiva kumar', 15, 'vusalashivakumar@gmail.com']],
      },
      providerConfig: {
        operation: 'append',
        spreadsheetId: 'sheet_123',
        sheetName: 'job',
        range: '',
        values: [['Vusala Shiva kumar', 15, 'vusalashivakumar@gmail.com']],
      },
      inputSources: {
        operation: 'static_config',
        spreadsheetId: 'static_config',
        sheetName: 'static_config',
        range: 'deterministic_runtime',
        values: 'deterministic_runtime',
      },
      inputSchema: {
        operation: { type: 'string', description: 'operation', required: true },
        spreadsheetId: { type: 'string', description: 'spreadsheet', required: true },
        sheetName: { type: 'string', description: 'sheet name', required: true },
        range: {
          type: 'string',
          description: 'range',
          required: false,
          fillMode: { default: 'runtime_ai', supportsRuntimeAI: true },
          runtimeContract: { role: 'range', validation: { format: 'a1_range', allowEmpty: true } },
        },
        values: {
          type: 'array',
          description: 'values',
          required: false,
          fillMode: { default: 'runtime_ai', supportsRuntimeAI: true },
          runtimeContract: { role: 'row_values', validation: { format: 'row_values' } },
        },
      },
      effectiveFillModes: {
        operation: 'manual_static',
        spreadsheetId: 'manual_static',
        sheetName: 'manual_static',
        range: 'runtime_ai',
        values: 'runtime_ai',
      },
      operationContract,
    });

    expect(result.valid).toBe(true);
    expect(result.audit.find((entry) => entry.fieldName === 'range')?.handoffStatus)
      .toBe('accepted_empty_provider_default');
  });

  it('ignores inactive Gmail sheet fallback fields during manual-recipient send handoff', () => {
    const definition = unifiedNodeRegistry.get('google_gmail');
    expect(definition).toBeDefined();

    const baseConfig = {
      operation: 'send',
      recipientSource: 'manual_entry',
      recipientEmails: 'vusalashivakumar@gmail.com',
      subject: 'Daily summary',
      body: 'Here is the summary.',
      spreadsheetId: '',
      sheetName: 'Sheet1',
      range: '',
    };
    const fieldPolicy = resolveFieldPolicyForNode(definition!, baseConfig);
    const finalResolvedInputs = {
      ...baseConfig,
      range: '',
    };
    const inputSources: Record<string, RuntimeInputSource> = {
      operation: 'static_config',
      recipientSource: 'static_config',
      recipientEmails: 'static_config',
      subject: 'runtime_ai',
      body: 'runtime_ai',
      spreadsheetId: 'deterministic_runtime',
      sheetName: 'deterministic_runtime',
      range: 'deterministic_runtime',
    };
    const effectiveFillModes = {
      operation: 'manual_static' as const,
      recipientSource: 'manual_static' as const,
      recipientEmails: 'manual_static' as const,
      subject: 'runtime_ai' as const,
      body: 'runtime_ai' as const,
      spreadsheetId: 'manual_static' as const,
      sheetName: 'manual_static' as const,
      range: 'manual_static' as const,
    };

    const { config: providerConfig } = buildFinalProviderConfig({
      baseConfig,
      finalResolvedInputs,
      inputSources,
      inputSchema: definition!.inputSchema,
      effectiveFillModes,
      fieldPolicy,
    });

    expect(providerConfig).not.toHaveProperty('spreadsheetId');
    expect(providerConfig).not.toHaveProperty('sheetName');
    expect(providerConfig).not.toHaveProperty('range');

    const result = validateRuntimeInputHandoff({
      nodeId: 'gmail_1',
      nodeType: 'google_gmail',
      finalResolvedInputs,
      providerConfig,
      inputSources,
      inputSchema: definition!.inputSchema,
      effectiveFillModes,
      operationContract: fieldPolicy.operationContract,
      fieldPolicy,
    });

    expect(result.valid).toBe(true);
    expect(result.audit.find((entry) => entry.fieldName === 'range')?.handoffStatus)
      .toBe('not_applicable');
  });

  it('ignores HTTP GET body handoff when body is a stale runtime_ai field', () => {
    const definition = unifiedNodeRegistry.get('http_request');
    expect(definition).toBeDefined();

    const baseConfig = {
      url: 'https://example.com/api/items',
      method: 'GET',
      body: {},
      _fillMode: { body: 'runtime_ai' },
    };
    const effectiveFillModes = buildEffectiveFillModes(definition!.inputSchema, baseConfig);
    const fieldPolicy = resolveFieldPolicyForNode(definition!, baseConfig, effectiveFillModes);

    expect(fieldPolicy.fields.body.active).toBe(false);
    expect(resolveFieldPolicyForNode(definition!, { ...baseConfig, method: 'POST' }, effectiveFillModes)
      .fields.body.active).toBe(true);

    const finalResolvedInputs = {
      url: 'https://example.com/api/items',
      method: 'GET',
      body: {},
    };
    const inputSources: Record<string, RuntimeInputSource> = {
      url: 'static_config',
      method: 'static_config',
      body: 'runtime_ai',
    };
    const { config: providerConfig } = buildFinalProviderConfig({
      baseConfig,
      finalResolvedInputs,
      inputSources,
      inputSchema: definition!.inputSchema,
      effectiveFillModes,
      fieldPolicy,
    });

    expect(providerConfig).not.toHaveProperty('body');

    const result = validateRuntimeInputHandoff({
      nodeId: 'http_1',
      nodeType: 'http_request',
      finalResolvedInputs,
      providerConfig,
      inputSources,
      inputSchema: definition!.inputSchema,
      effectiveFillModes,
      operationContract: fieldPolicy.operationContract,
      fieldPolicy,
    });

    expect(result.valid).toBe(true);
    expect(result.audit.find((entry) => entry.fieldName === 'body')?.handoffStatus)
      .toBe('not_applicable');
  });

  it('ignores empty optional runtime-owned alias fields during handoff', () => {
    const operationContract: NormalizedOperationContract = {
      operation: 'get',
      resource: 'product',
      label: 'Get Product',
      requiredFields: ['resource', 'operation', 'id'],
      optionalFields: ['productId', 'orderId', 'customerId', 'data', 'limit'],
      forbiddenFields: [],
      conditionallyRequiredFields: [],
      payloadGroups: [],
      emptyValuePolicy: {},
      providerDefaultFields: [],
      fieldSourcePolicy: {},
      runtimeAiPolicy: {},
      activeFields: ['resource', 'operation', 'id', 'productId', 'orderId', 'customerId', 'data', 'limit'],
      credentialProviders: ['shopify'],
      outputFields: ['default'],
      legacyAliases: [],
      status: 'implemented',
      diagnostics: [],
      generated: false,
    };

    const result = validateRuntimeInputHandoff({
      nodeId: 'shopify_1',
      nodeType: 'shopify',
      finalResolvedInputs: {
        resource: 'product',
        operation: 'get',
        id: '7502207975509',
        productId: '',
        orderId: '',
        customerId: '',
      },
      providerConfig: {
        resource: 'product',
        operation: 'get',
        id: '7502207975509',
      },
      inputSources: {
        resource: 'static_config',
        operation: 'static_config',
        id: 'static_config',
        productId: 'runtime_ai',
        orderId: 'runtime_ai',
        customerId: 'runtime_ai',
      },
      inputSchema: {
        resource: { type: 'string', description: 'resource', required: true },
        operation: { type: 'string', description: 'operation', required: true },
        id: { type: 'string', description: 'id', required: true },
        productId: { type: 'string', description: 'product id', required: false },
        orderId: { type: 'string', description: 'order id', required: false },
        customerId: { type: 'string', description: 'customer id', required: false },
      },
      effectiveFillModes: {
        resource: 'manual_static',
        operation: 'manual_static',
        id: 'manual_static',
        productId: 'runtime_ai',
        orderId: 'runtime_ai',
        customerId: 'runtime_ai',
      },
      operationContract,
    });

    expect(result.valid).toBe(true);
    expect(result.audit.find((entry) => entry.fieldName === 'productId')?.handoffStatus)
      .toBe('not_applicable');
    expect(result.audit.find((entry) => entry.fieldName === 'orderId')?.handoffStatus)
      .toBe('not_applicable');
    expect(result.audit.find((entry) => entry.fieldName === 'customerId')?.handoffStatus)
      .toBe('not_applicable');
  });
});
