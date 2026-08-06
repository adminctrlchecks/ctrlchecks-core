import { classifyExecutionOutcome } from '../execution-outcome';

describe('execution outcome classifier', () => {
  it('treats empty list outputs as completed results', () => {
    const outcome = classifyExecutionOutcome({
      nodeType: 'shopify',
      nodeName: 'Shopify',
      config: { operation: 'list', resource: 'product' },
      output: { items: [] },
    });

    expect(outcome.kind).toBe('completed');
    expect(outcome.reason).toBe('empty_result');
    expect(outcome.source).toBe('provider');
    expect(outcome.severity).toBe('success');
  });

  it('classifies not-found id lookups as expected user-data stops', () => {
    const outcome = classifyExecutionOutcome({
      nodeId: 'sf-1',
      nodeType: 'salesforce',
      nodeName: 'Salesforce',
      config: { operation: 'get', resource: 'Account', id: '001-missing' },
      output: {
        _error: 'The requested resource does not exist',
        _errorCode: 'SALESFORCE_OPERATION_FAILED',
        _errorDetails: { operation: 'get', resource: 'Account' },
      },
    });

    expect(outcome.kind).toBe('stopped_expected');
    expect(outcome.reason).toBe('not_found');
    expect(outcome.source).toBe('user_data');
    expect(outcome.severity).toBe('warning');
    expect(outcome.retryable).toBe(false);
    expect(outcome.userMessage).toBe('Salesforce could not find this Account record.');
    expect(outcome.nextSteps.join(' ')).toContain('Query/List');
  });

  it('classifies missing required inputs as configuration guidance', () => {
    const outcome = classifyExecutionOutcome({
      nodeType: 'shopify',
      nodeName: 'Shopify',
      output: {
        _error: 'Shopify update: id is required',
        _validationErrors: ['id is required'],
      },
    });

    expect(outcome.kind).toBe('needs_configuration');
    expect(outcome.reason).toBe('missing_required_input');
    expect(outcome.source).toBe('user_config');
  });

  it('classifies provider validation errors as configuration guidance', () => {
    const outcome = classifyExecutionOutcome({
      nodeId: 'shopify-1',
      nodeType: 'shopify',
      nodeName: 'Shopify',
      config: {
        resource: 'product',
        operation: 'create',
        data: {
          title: 'CtrlChecks Test Product 11',
          status: 'draft11',
        },
      },
      output: {
        _error: 'Shopify create failed (422)',
        _errorDetails: {
          errors: {
            status: ["isn't valid. Set the status as active, draft, or archived."],
          },
        },
      },
    });

    expect(outcome.kind).toBe('needs_configuration');
    expect(outcome.reason).toBe('invalid_input');
    expect(outcome.source).toBe('user_config');
    expect(outcome.userMessage).toBe('Shopify rejected the Product status "draft11".');
    expect(outcome.nextSteps.join(' ')).toContain('active, draft, or archived');
  });

  it('classifies expired credentials as connection guidance', () => {
    const outcome = classifyExecutionOutcome({
      nodeType: 'salesforce',
      nodeName: 'Salesforce',
      config: { operation: 'create', resource: 'Account' },
      output: {
        _error: 'Session expired or invalid',
        _nodeType: 'salesforce',
        _errorCode: 'SALESFORCE_OPERATION_FAILED',
        _errorDetails: { operation: 'create', resource: 'Account' },
      },
    });

    expect(outcome.kind).toBe('needs_connection');
    expect(outcome.reason).toBe('auth_expired');
    expect(outcome.source).toBe('connection');
    expect(outcome.userMessage).toBe('Salesforce needs a refreshed connection before this step can run.');
  });

  it('classifies rate limits and provider 5xx as retryable provider unavailable', () => {
    const rateLimit = classifyExecutionOutcome({
      nodeType: 'shopify',
      nodeName: 'Shopify',
      output: { _error: 'Shopify list failed (429)' },
    });
    const provider5xx = classifyExecutionOutcome({
      nodeType: 'slack',
      nodeName: 'Slack',
      output: { _error: 'Slack API error 503: unavailable' },
    });

    expect(rateLimit.kind).toBe('provider_unavailable');
    expect(rateLimit.reason).toBe('rate_limit');
    expect(rateLimit.retryable).toBe(true);
    expect(provider5xx.kind).toBe('provider_unavailable');
    expect(provider5xx.reason).toBe('provider_5xx');
    expect(provider5xx.retryable).toBe(true);
  });

  it('keeps registry and contract bugs as system errors', () => {
    const outcome = classifyExecutionOutcome({
      nodeType: 'made_up_node',
      nodeName: 'Broken Node',
      output: {
        _error: '[DynamicExecutor] Integrity error: Canonical node type not found in registry',
      },
    });

    expect(outcome.kind).toBe('system_error');
    expect(outcome.source).toBe('ctrlchecks');
    expect(outcome.severity).toBe('error');
  });
});
