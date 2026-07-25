import { describe, expect, it } from 'vitest';
import { getDebugFailureToast, isExpectedReadinessDebugError } from './DebugPanel';

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
});
