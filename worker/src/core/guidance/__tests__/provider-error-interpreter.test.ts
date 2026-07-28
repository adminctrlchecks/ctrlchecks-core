/**
 * Provider error → field guidance (Phase 7a).
 *
 * The contract under test (plan §2.2): every failure resolves to
 * what happened → why → what to do next → the field, editable inline.
 * No stack traces, no error codes, no "failed" in anything the user reads.
 */

import {
  buildFallbackGuidance,
  composeGuidance,
  guidanceFromOutput,
  hasError,
  interpretProviderError,
} from '../provider-error-interpreter';

describe('vocabulary — never says "failed"', () => {
  const samples = [
    { nodeId: 'n1', nodeType: 'slack', errorCode: 'channel_not_found', error: 'channel_not_found' },
    { nodeId: 'n1', nodeType: 'google_sheets', error: 'Requested entity was not found.' },
    { nodeId: 'n1', nodeType: 'notion', errorCode: 'object_not_found', error: 'Could not find database' },
    { nodeId: 'n1', nodeType: 'mystery_node', error: 'kaboom' },
  ];

  it.each(samples)('keeps user-facing copy free of failure/error jargon (%#)', (input) => {
    const g = interpretProviderError(input);
    const userFacing = [g.headline, g.why, ...g.nextSteps].join(' ').toLowerCase();
    expect(userFacing).not.toContain('failed');
    expect(userFacing).not.toContain('exception');
    expect(userFacing).not.toContain('stack');
    expect(userFacing).not.toMatch(/\b[45]\d{2}\b/); // no bare HTTP status codes
    expect(g.severity).toBe('needs_attention');
  });

  it('keeps raw provider text out of the headline and only in technicalDetail', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'slack',
      errorCode: 'channel_not_found',
      error: 'SlackAPIError: channel_not_found at Object.<anonymous> (/app/x.js:1:1)',
    });
    expect(g.headline).not.toContain('SlackAPIError');
    expect(g.technicalDetail).toContain('SlackAPIError');
  });

  it('always supplies all four parts of the contract', () => {
    for (const input of samples) {
      const g = interpretProviderError(input);
      expect(g.headline.length).toBeGreaterThan(0);
      expect(g.why.length).toBeGreaterThan(0);
      expect(g.nextSteps.length).toBeGreaterThan(0);
      expect(g.field?.nodeId).toBe('n1');
    }
  });
});

describe('Slack', () => {
  it('maps channel_not_found to the channel field', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'slack',
      errorCode: 'channel_not_found',
      error: 'channel_not_found',
    });
    expect(g.field?.fieldName).toBe('channel');
    expect(g.headline).toMatch(/couldn't be found/i);
    expect(g.source).toBe('provider');
  });

  it('distinguishes not_in_channel from channel_not_found', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'slack',
      errorCode: 'not_in_channel',
      error: 'not_in_channel',
    });
    expect(g.field?.fieldName).toBe('channel');
    expect(g.nextSteps.join(' ')).toMatch(/invite/i);
  });

  it('treats missing_scope as a connection problem, not a field problem', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'slack',
      errorCode: 'missing_scope',
      error: 'missing_scope',
    });
    expect(g.isConnectionProblem).toBe(true);
    expect(g.field?.fieldName).toBeUndefined();
  });

  it('resolves from the message alone when no structured code is present', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'slack',
      error: 'Slack responded with channel_not_found',
    });
    expect(g.field?.fieldName).toBe('channel');
    expect(g.source).toBe('provider');
  });
});

describe('real-world message formats — the substring fallback earning its place', () => {
  // execute-workflow.ts:13236 throws exactly this shape, and §2.5 forbids modifying that
  // file to add a structured code. The machine-readable code is inside the message, so
  // the substring fallback (§3.10) is what makes these resolve.
  it('resolves the real Slack error string thrown by the execution engine', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'slack',
      error: 'Slack API error: 404 Not Found - channel_not_found',
    });
    expect(g.source).toBe('provider');
    expect(g.field?.fieldName).toBe('channel');
  });

  it('does not let an embedded HTTP status hijack a Slack mapping', () => {
    // 404 appears in the text but Slack has no 404 rule; the code must still win.
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'slack',
      error: 'Slack API error: 404 Not Found - not_in_channel',
    });
    expect(g.nextSteps.join(' ')).toMatch(/invite/i);
  });

  it('resolves a Slack scope error from the engine string', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'slack',
      error: 'Slack API error: 403 Forbidden - missing_scope',
    });
    expect(g.isConnectionProblem).toBe(true);
  });
});

describe('Google', () => {
  it('maps a 404 to the spreadsheet ID', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'google_sheets',
      errorCode: 404,
      error: 'Requested entity was not found.',
    });
    expect(g.field?.fieldName).toBe('spreadsheetId');
    expect(g.nextSteps.join(' ')).toMatch(/\/d\/ and \/edit/);
  });

  it('maps a bad range to the range field, not the spreadsheet', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'google_sheets',
      error: 'Unable to parse range: NoSuchTab!A1:D10',
    });
    expect(g.field?.fieldName).toBe('range');
  });

  it('attributes insufficient scope to the connection, never to a field', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'google_gmail',
      errorCode: 403,
      error: 'Request had insufficient authentication scopes.',
    });
    expect(g.isConnectionProblem).toBe(true);
    expect(g.field?.fieldName).toBeUndefined();
    expect(g.nextSteps.join(' ')).toMatch(/reconnect/i);
  });

  it('reads a status out of errorDetails', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'google_sheets',
      errorDetails: { status: 429 },
      error: 'something',
    });
    expect(g.headline).toMatch(/slow down/i);
  });
});

describe('Notion', () => {
  it('explains that "not found" is usually a sharing problem', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'notion',
      errorCode: 'object_not_found',
      error: 'Could not find database with ID abc',
    });
    expect(g.headline).toMatch(/sharing/i);
    expect(g.nextSteps.join(' ')).toMatch(/Connections/);
  });

  it('maps a validation error to the properties field', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'notion',
      errorCode: 'validation_error',
      error: 'body failed validation',
    });
    expect(g.field?.fieldName).toBe('properties');
  });
});

describe('fallback — safe when nothing matches', () => {
  it('attributes an unknown node to the node, never to a field', () => {
    const g = interpretProviderError({
      nodeId: 'n9',
      nodeType: 'some_exotic_node',
      nodeLabel: 'Exotic Step',
      error: 'ECONNRESET',
    });
    expect(g.source).toBe('fallback');
    expect(g.field?.nodeId).toBe('n9');
    expect(g.field?.fieldName).toBeUndefined();
    expect(g.headline).toContain('Exotic Step');
  });

  it('falls back for a known provider with an unrecognised error', () => {
    const g = interpretProviderError({
      nodeId: 'n1',
      nodeType: 'slack',
      errorCode: 'something_brand_new',
      error: 'something_brand_new',
    });
    expect(g.source).toBe('fallback');
    expect(g.field?.fieldName).toBeUndefined();
  });

  it('never throws, whatever it is handed', () => {
    const nasty: unknown[] = [undefined, null, 0, '', [], { weird: Symbol('x') }];
    for (const error of nasty) {
      expect(() =>
        interpretProviderError({ nodeId: 'n1', nodeType: 'slack', error })
      ).not.toThrow();
    }
  });

  it('extracts a message from an Error instance', () => {
    const g = buildFallbackGuidance({
      nodeId: 'n1',
      nodeType: 'x',
      error: new Error('boom'),
    });
    expect(g.technicalDetail).toBe('boom');
  });
});

describe('composeGuidance — input validation wins over the provider', () => {
  it('explains a missing input rather than the downstream provider error', () => {
    const g = composeGuidance({
      nodeId: 'n1',
      nodeType: 'slack',
      nodeLabel: 'Post to Slack',
      errorCode: 'channel_not_found',
      error: 'channel_not_found',
      output: {
        _error: 'channel_not_found',
        _runtimeInputAudit: [{ field: 'channel', valid: false, errors: ['channel is required'] }],
      },
    });
    expect(g.source).toBe('input_validation');
    expect(g.field?.fieldName).toBe('channel');
    expect(g.headline).toMatch(/needs a value/i);
  });

  it('uses the provider interpreter when inputs are fine', () => {
    const g = composeGuidance({
      nodeId: 'n1',
      nodeType: 'slack',
      errorCode: 'channel_not_found',
      error: 'channel_not_found',
      output: { _error: 'channel_not_found' },
    });
    expect(g.source).toBe('provider');
  });
});

describe('guidanceFromOutput', () => {
  it('reads the executor output shape directly', () => {
    const g = guidanceFromOutput({
      nodeId: 'n1',
      nodeType: 'google_sheets',
      nodeLabel: 'Read Sheet',
      output: {
        _error: 'Requested entity was not found.',
        _errorCode: 404,
        _nodeType: 'google_sheets',
      },
    });
    expect(g.field?.fieldName).toBe('spreadsheetId');
  });

  it('tolerates a non-object output', () => {
    expect(() =>
      guidanceFromOutput({ nodeId: 'n1', nodeType: 'slack', output: 'not an object' })
    ).not.toThrow();
  });
});

describe('hasError', () => {
  it('detects an error payload', () => {
    expect(hasError({ _error: 'boom' })).toBe(true);
  });

  it('rejects a clean output', () => {
    expect(hasError({ rows: [] })).toBe(false);
    expect(hasError(null)).toBe(false);
    expect(hasError('string')).toBe(false);
  });
});
