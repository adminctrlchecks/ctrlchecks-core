import { enforceRuntimeFieldContracts } from '../runtime-field-contract';
import type { NodeInputSchema } from '../../types/unified-node-contract';

describe('runtime-field-contract', () => {
  it('repairs row values from upstream object payload', () => {
    const inputSchema: NodeInputSchema = {
      operation: {
        type: 'string',
        description: 'operation',
        required: false,
        runtimeContract: { protected: true },
      },
      values: {
        type: 'array',
        description: 'rows',
        required: false,
        runtimeContract: {
          requiredWhen: [{ field: 'operation', equals: 'append' }],
          requiredGroup: 'write_payload',
          validation: { format: 'row_values' },
          repair: ['object_to_row_values'],
        },
      },
      data: {
        type: 'object',
        description: 'data',
        required: false,
        runtimeContract: {
          requiredWhen: [{ field: 'operation', equals: 'append' }],
          requiredGroup: 'write_payload',
          validation: { format: 'object_payload' },
        },
      },
    };

    const result = enforceRuntimeFieldContracts(
      { operation: 'append', values: [] },
      { operation: 'static_config', values: 'static_config' },
      {
        inputSchema,
        config: { operation: 'append' },
        effectiveFillModes: { operation: 'manual_static', values: 'runtime_ai', data: 'runtime_ai' },
        upstreamPayload: {
          name: 'Vusala Shiva kumar',
          age: 15,
          gmailAddress: 'vusalashivakumar@gmail.com',
          resumeLink: 'https://drive.example/resume',
        },
      }
    );

    expect(result.errors).toEqual([]);
    expect(result.resolvedInputs.values).toEqual([
      ['Vusala Shiva kumar', 15, 'vusalashivakumar@gmail.com', 'https://drive.example/resume'],
    ]);
    expect(result.inputSources.values).toBe('deterministic_runtime');
  });

  it('clears invalid optional A1 ranges before execution', () => {
    const inputSchema: NodeInputSchema = {
      range: {
        type: 'string',
        description: 'range',
        required: false,
        runtimeContract: {
          validation: { format: 'a1_range', allowEmpty: true },
          repair: ['clear_invalid_optional'],
        },
      },
    };

    const result = enforceRuntimeFieldContracts(
      { range: 'https://drive.google.com/file/d/resume/view' },
      { range: 'static_config' },
      {
        inputSchema,
        config: {},
        effectiveFillModes: { range: 'manual_static' },
        upstreamPayload: {},
      }
    );

    expect(result.errors).toEqual([]);
    expect(result.resolvedInputs.range).toBe('');
    expect(result.inputSources.range).toBe('deterministic_runtime');
  });

  it('extracts recipient emails from workflow lineage', () => {
    const inputSchema: NodeInputSchema = {
      recipientEmails: {
        type: 'string',
        description: 'emails',
        required: false,
        role: 'recipient',
        runtimeContract: {
          requiredWhen: [{ field: 'operation', equals: 'send' }],
          validation: { format: 'email_list' },
          repair: ['extract_email'],
        },
      },
      operation: { type: 'string', description: 'operation', required: false },
    };

    const result = enforceRuntimeFieldContracts(
      { operation: 'send', recipientEmails: 'v' },
      { operation: 'static_config', recipientEmails: 'static_config' },
      {
        inputSchema,
        config: { operation: 'send' },
        effectiveFillModes: { operation: 'manual_static', recipientEmails: 'runtime_ai' },
        upstreamPayload: { _error: 'upstream failed' },
        allOutputs: {
          trigger: { gmailAddress: 'vusalashivakumar@gmail.com' },
        },
      }
    );

    expect(result.errors).toEqual([]);
    expect(result.resolvedInputs.recipientEmails).toEqual(['vusalashivakumar@gmail.com']);
  });

  it('does not allow static config to satisfy required runtime_ai fields', () => {
    const inputSchema: NodeInputSchema = {
      operation: { type: 'string', description: 'operation', required: false },
      recipientEmails: {
        type: 'string',
        description: 'emails',
        required: false,
        role: 'recipient',
        runtimeContract: {
          requiredWhen: [{ field: 'operation', equals: 'send' }],
          validation: { format: 'email_list' },
        },
      },
    };

    const result = enforceRuntimeFieldContracts(
      { operation: 'send', recipientEmails: 'someone@example.com' },
      { operation: 'static_config', recipientEmails: 'static_config' },
      {
        inputSchema,
        config: { operation: 'send' },
        effectiveFillModes: { operation: 'manual_static', recipientEmails: 'runtime_ai' },
        upstreamPayload: { email: 'runtime@example.com' },
      }
    );

    expect(result.errors.some((error) => error.includes('static_config'))).toBe(true);
  });

  it('blocks missing function code when code contract is required', () => {
    const inputSchema: NodeInputSchema = {
      description: { type: 'string', description: 'description', required: true },
      code: {
        type: 'string',
        description: 'code',
        required: false,
        runtimeContract: {
          requiredWhen: [{ field: 'description', notEquals: '' }],
          validation: { format: 'code' },
        },
      },
    };

    const result = enforceRuntimeFieldContracts(
      { description: 'Transform form data', code: '' },
      { description: 'static_config', code: 'runtime_ai' },
      {
        inputSchema,
        config: { description: 'Transform form data' },
        effectiveFillModes: { description: 'manual_static', code: 'runtime_ai' },
        upstreamPayload: { name: 'Vusala Shiva kumar' },
      }
    );

    expect(result.errors.some((error) => error.includes('code'))).toBe(true);
  });

  it('self-heals an optional field holding a stale/corrupted value, with no per-field opt-in required', () => {
    // Regression test: a Mailgun node's persisted config had `replyTo: "manual"` —
    // a stray fill-mode label that leaked into the field's content at some point in
    // the past. `replyTo` is optional and has no explicit `runtimeContract.repair`,
    // so this must self-heal generically rather than requiring every node to opt in.
    const inputSchema: NodeInputSchema = {
      from: { type: 'string', description: 'from', required: true },
      to: { type: 'string', description: 'to', required: true },
      replyTo: { type: 'string', description: 'reply-to', required: false },
    };

    const result = enforceRuntimeFieldContracts(
      { from: 'noreply@example.com', to: 'user@example.com', replyTo: 'manual' },
      { from: 'static_config', to: 'static_config', replyTo: 'static_config' },
      {
        inputSchema,
        config: { from: 'noreply@example.com', to: 'user@example.com', replyTo: 'manual' },
        effectiveFillModes: { from: 'manual_static', to: 'manual_static', replyTo: 'manual_static' },
        upstreamPayload: {},
      }
    );

    expect(result.errors).toEqual([]);
    expect(result.resolvedInputs.replyTo).toBe('');
    expect(result.warnings.some((w) => w.includes('replyTo'))).toBe(true);
  });

  it('clears reserved-vocabulary values on optional fields with no declared format at all', () => {
    // Regression test: the first fix only caught `replyTo` because its field name
    // happens to match the email-format heuristic. `cc`, `bcc`, `html`, `tags`, and
    // `template` have no format validator at all, so a stray "manual" in any of
    // them sailed straight through to the Mailgun API as literal content — e.g.
    // `cc: "manual"` produced "cc parameter is not a valid address" from Mailgun.
    // These must self-heal generically, not just the ones with format checks.
    const inputSchema: NodeInputSchema = {
      from: { type: 'string', description: 'from', required: true },
      to: { type: 'string', description: 'to', required: true },
      cc: { type: 'string', description: 'cc', required: false },
      bcc: { type: 'string', description: 'bcc', required: false },
      html: { type: 'string', description: 'html', required: false },
      tags: { type: 'string', description: 'tags', required: false },
      template: { type: 'string', description: 'template', required: false },
      text: { type: 'string', description: 'text', required: false },
    };

    const config = {
      from: 'noreply@example.com',
      to: 'user@example.com',
      cc: 'manual',
      bcc: 'manual',
      html: 'manual',
      tags: 'manual',
      template: 'manual',
      text: 'Real message body',
    };

    const result = enforceRuntimeFieldContracts(
      { ...config },
      {
        from: 'static_config',
        to: 'static_config',
        cc: 'static_config',
        bcc: 'static_config',
        html: 'static_config',
        tags: 'static_config',
        template: 'static_config',
        text: 'static_config',
      },
      {
        inputSchema,
        config,
        effectiveFillModes: {
          from: 'manual_static',
          to: 'manual_static',
          cc: 'manual_static',
          bcc: 'manual_static',
          html: 'manual_static',
          tags: 'manual_static',
          template: 'manual_static',
          text: 'manual_static',
        },
        upstreamPayload: {},
      }
    );

    expect(result.errors).toEqual([]);
    expect(result.resolvedInputs.cc).toBe('');
    expect(result.resolvedInputs.bcc).toBe('');
    expect(result.resolvedInputs.html).toBe('');
    expect(result.resolvedInputs.tags).toBe('');
    expect(result.resolvedInputs.template).toBe('');
    expect(result.resolvedInputs.text).toBe('Real message body');
  });

  it('still hard-fails when a REQUIRED field fails format validation', () => {
    const inputSchema: NodeInputSchema = {
      to: { type: 'string', description: 'to', required: true },
    };

    const result = enforceRuntimeFieldContracts(
      { to: 'manual' },
      { to: 'static_config' },
      {
        inputSchema,
        config: { to: 'manual' },
        effectiveFillModes: { to: 'manual_static' },
        upstreamPayload: {},
      }
    );

    expect(result.errors.some((error) => error.includes('to'))).toBe(true);
    expect(result.resolvedInputs.to).toBe('manual');
  });
});
