import { describe, expect, it } from 'vitest';
import { getDebugFailureToast, getNodeOutputFailure, isExpectedReadinessDebugError } from './DebugPanel';

describe('DebugPanel readiness failures', () => {
  it('suppresses destructive toast data for expected readiness/configuration errors', () => {
    const error = {
      success: false,
      code: 'EXECUTION_MISSING_INPUTS',
      message: 'This node needs configuration before it can run.',
      details: {
        readinessIssues: [{
          kind: 'missing_input',
          nodeLabel: 'Supabase',
          operationLabel: 'Insert',
          fieldKey: 'data',
          fieldLabel: 'Data',
        }],
      },
    };

    expect(isExpectedReadinessDebugError(error)).toBe(true);
    expect(getDebugFailureToast(error)).toBeNull();
  });

  it('still returns a destructive toast shape for unexpected execution failures', () => {
    const toast = getDebugFailureToast({
      success: false,
      code: 'NODE_EXECUTION_FAILED',
      message: 'Provider returned a 500',
    });

    expect(toast).toMatchObject({
      title: 'Execution Failed',
      description: 'Provider returned a 500',
      variant: 'destructive',
    });
  });

  it('does not misread a successful node output as a failure just because it has a "message" field', () => {
    // Regression test: Mailgun's success response includes `message: "Queued.
    // Thank you."` as a confirmation string. With no dedicated `error`/`_error`
    // field, the generic fallback previously treated any `message` string as an
    // error, flipping a successful send into a red "Execution Failed" toast.
    const output = {
      success: true,
      messageId: '<abc123@sandbox.mailgun.org>',
      message: 'Queued. Thank you.',
      mailgun: { id: '<abc123@sandbox.mailgun.org>', message: 'Queued. Thank you.' },
    };

    expect(getNodeOutputFailure(output)).toBeNull();
  });

  it('still detects a real failure reported only via a bare "message" field', () => {
    const output = { message: 'Invalid API key' };
    expect(getNodeOutputFailure(output)).not.toBeNull();
  });

  it('treats an explicit success/ok signal as authoritative even with status text present', () => {
    expect(getNodeOutputFailure({ ok: true, message: 'All good' })).toBeNull();
    expect(getNodeOutputFailure({ status: 'success', message: 'All good' })).toBeNull();
  });
});
