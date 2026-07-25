import { describe, expect, it } from 'vitest';
import { isExpectedReadinessStatusCode } from '../readiness-status-codes';

describe('isExpectedReadinessStatusCode', () => {
  it('recognizes setup/readiness codes that should not be prominent reliability errors', () => {
    expect(isExpectedReadinessStatusCode('EXECUTION_MISSING_INPUTS')).toBe(true);
    expect(isExpectedReadinessStatusCode('execution_missing_credentials')).toBe(true);
    expect(isExpectedReadinessStatusCode('WORKFLOW_SETUP_PENDING')).toBe(true);
  });

  it('does not hide unexpected execution/reliability codes', () => {
    expect(isExpectedReadinessStatusCode('INTERNAL_ERROR')).toBe(false);
    expect(isExpectedReadinessStatusCode('RUN_ALREADY_ACTIVE')).toBe(false);
    expect(isExpectedReadinessStatusCode(undefined)).toBe(false);
  });
});
