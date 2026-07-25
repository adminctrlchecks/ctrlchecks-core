const EXPECTED_READINESS_STATUS_CODES = new Set([
  'EXECUTION_NOT_READY',
  'EXECUTION_MISSING_INPUTS',
  'EXECUTION_MISSING_CREDENTIALS',
  'WORKFLOW_NOT_CONFIRMED',
  'WORKFLOW_SETUP_PENDING',
  'WORKFLOW_NOT_READY',
]);

export function isExpectedReadinessStatusCode(code: unknown): boolean {
  return typeof code === 'string' && EXPECTED_READINESS_STATUS_CODES.has(code.toUpperCase());
}
