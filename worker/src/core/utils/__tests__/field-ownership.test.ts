import { describe, expect, it } from '@jest/globals';
import {
  classifyFieldOwnership,
  isCredentialOwnership,
  isStructuralOwnership,
} from '../field-ownership';

describe('classifyFieldOwnership', () => {
  it('returns value for webhook_url helpCategory (URL guard takes priority)', () => {
    expect(classifyFieldOwnership('webhookUrl', { helpCategory: 'webhook_url' })).toBe('value');
  });

  it('returns value for api_endpoint helpCategory', () => {
    expect(classifyFieldOwnership('endpoint', { helpCategory: 'api_endpoint' })).toBe('value');
  });

  it('returns credential for api_key helpCategory', () => {
    expect(classifyFieldOwnership('apiKey', { helpCategory: 'api_key' })).toBe('credential');
  });

  it('returns credential for private_key helpCategory', () => {
    expect(classifyFieldOwnership('privateKey', { helpCategory: 'private_key' })).toBe('credential');
  });

  it('never returns credential for a number field, even with a credential helpCategory (maxTokens regression)', () => {
    // Regression: ai_agent's `maxTokens` (a numeric response-length limit) was being classified
    // as helpCategory 'generic_token' purely because its name contains "token", which then
    // made classifyFieldOwnership return 'credential' — the registry believed the AI Agent
    // required a bearer_token connection for a field that's just an integer setting. A
    // credential (API key, bearer token, secret, password) is always textual; a number/boolean
    // field can never legitimately be one, regardless of what its helpCategory says.
    expect(classifyFieldOwnership('maxTokens', { helpCategory: 'generic_token', type: 'number' })).toBe('value');
    expect(classifyFieldOwnership('maxTokens', { helpCategory: 'bearer_token', type: 'number' })).toBe('value');
  });

  it('never returns credential for a boolean field with a credential helpCategory', () => {
    expect(classifyFieldOwnership('enableAuth', { helpCategory: 'api_key', type: 'boolean' })).toBe('value');
  });

  it('still returns credential for a string field with a credential helpCategory (no regression on real credentials)', () => {
    expect(classifyFieldOwnership('apiKey', { helpCategory: 'api_key', type: 'string' })).toBe('credential');
    expect(classifyFieldOwnership('botToken', { helpCategory: 'generic_token', type: 'string' })).toBe('credential');
  });

  it('still returns credential when type is unspecified (existing name/helpCategory-only contract preserved)', () => {
    expect(classifyFieldOwnership('apiKey', { helpCategory: 'api_key' })).toBe('credential');
  });

  it('returns value for role raw_json because payload shapes are user-editable config', () => {
    expect(classifyFieldOwnership('body', { role: 'raw_json' })).toBe('value');
  });

  it('returns value for role config because scalar settings are user-editable config', () => {
    expect(classifyFieldOwnership('settings', { role: 'config' })).toBe('value');
  });

  it('does not infer structural ownership only because runtime AI is disabled', () => {
    expect(
      classifyFieldOwnership('limit', { fillMode: { default: 'manual_static', supportsRuntimeAI: false } })
    ).toBe('value');
  });

  it('returns structural for operation selector roles', () => {
    expect(classifyFieldOwnership('action', { role: 'operation_selector' })).toBe('structural');
  });

  it('returns structural for fieldName "operation"', () => {
    expect(
      classifyFieldOwnership('operation', { fillMode: { default: 'manual_static', supportsRuntimeAI: false } })
    ).toBe('structural');
  });

  it('returns structural for fieldName "fields"', () => {
    expect(classifyFieldOwnership('fields', {})).toBe('structural');
  });

  it('returns structural for fieldName containing "condition"', () => {
    expect(classifyFieldOwnership('filterCondition', {})).toBe('structural');
  });

  it('returns structural for fieldName containing "schema"', () => {
    expect(classifyFieldOwnership('outputSchema', {})).toBe('structural');
  });

  it('returns value when no special attributes match', () => {
    expect(classifyFieldOwnership('message', {})).toBe('value');
  });
});

describe('isCredentialOwnership', () => {
  it('returns true when explicit ownership is credential', () => {
    expect(isCredentialOwnership('apiKey', { ownership: 'credential' })).toBe(true);
  });

  it('returns false when explicit ownership is value', () => {
    expect(isCredentialOwnership('apiKey', { ownership: 'value' })).toBe(false);
  });

  it('falls back to classification when ownership is absent', () => {
    expect(isCredentialOwnership('apiKey', { helpCategory: 'api_key' })).toBe(true);
    expect(isCredentialOwnership('message', {})).toBe(false);
  });
});

describe('isStructuralOwnership', () => {
  it('returns true when explicit ownership is structural', () => {
    expect(isStructuralOwnership('fields', { ownership: 'structural' })).toBe(true);
  });

  it('returns false when explicit ownership is credential', () => {
    expect(isStructuralOwnership('fields', { ownership: 'credential' })).toBe(false);
  });

  it('falls back to classification when ownership is absent', () => {
    expect(isStructuralOwnership('fields', {})).toBe(true);
    expect(isStructuralOwnership('message', {})).toBe(false);
  });
});
