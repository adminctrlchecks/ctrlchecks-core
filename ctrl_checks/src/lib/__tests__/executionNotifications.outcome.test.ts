import { classifyExecutionResult } from '../executionNotifications';

describe('classifyExecutionResult outcome metadata', () => {
  it('uses stopped outcome metadata instead of node_error', () => {
    expect(classifyExecutionResult({
      id: 'exec-1',
      status: 'success',
      logs: [{
        nodeId: 'sf-1',
        nodeName: 'Salesforce',
        status: 'stopped',
        outcome: {
          kind: 'stopped_expected',
          reason: 'not_found',
          source: 'user_data',
          severity: 'warning',
          retryable: false,
          userMessage: 'Salesforce could not find this Account record.',
          nextSteps: ['Verify the record exists.'],
        },
      }],
    })).toBe('stopped_expected');
  });

  it('uses final output outcome metadata when logs are unavailable', () => {
    expect(classifyExecutionResult({
      id: 'exec-2',
      status: 'success',
      logs: null,
      output: {
        outcome: {
          kind: 'needs_connection',
          reason: 'auth_expired',
          source: 'connection',
          severity: 'warning',
          retryable: false,
          userMessage: 'Google Sheets needs a refreshed connection.',
          nextSteps: ['Reconnect Google Sheets.'],
        },
      },
    })).toBe('needs_connection');
  });
});
