import { describe, it, expect, vi } from 'vitest';
import { invalidateAfterConnectionChange } from '../queryInvalidation';
import { QUERY_KEYS } from '../queryKeys';

describe('QUERY_KEYS', () => {
  it('connections key is ["connections"]', () => {
    expect(QUERY_KEYS.connections).toEqual(['connections']);
  });

  it('credentialTypes key is ["credential-types"]', () => {
    expect(QUERY_KEYS.credentialTypes).toEqual(['credential-types']);
  });

  it('workflowConnectionStatus key includes the workflow id', () => {
    expect(QUERY_KEYS.workflowConnectionStatus('wf-1')).toEqual(['workflow-connection-status', 'wf-1']);
  });

  it('workflowConnectionStatusRoot is the prefix of every per-workflow key', () => {
    expect(QUERY_KEYS.workflowConnectionStatusRoot).toEqual(['workflow-connection-status']);
  });
});

describe('invalidateAfterConnectionChange', () => {
  it('invalidates connections query', () => {
    const qc = { invalidateQueries: vi.fn() } as any;
    invalidateAfterConnectionChange(qc);
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.connections });
  });

  it('invalidates credential-types query', () => {
    const qc = { invalidateQueries: vi.fn() } as any;
    invalidateAfterConnectionChange(qc);
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.credentialTypes });
  });

  it('invalidates the specific workflow connection status when workflowId is provided', () => {
    const qc = { invalidateQueries: vi.fn() } as any;
    invalidateAfterConnectionChange(qc, 'wf-1');
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.workflowConnectionStatus('wf-1'),
    });
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(3);
  });

  it('invalidates all workflow connection status queries when workflowId is unknown', () => {
    const qc = { invalidateQueries: vi.fn() } as any;
    invalidateAfterConnectionChange(qc);
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.workflowConnectionStatusRoot,
    });
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(3);
  });
});
