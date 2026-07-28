/**
 * First-run safety layer (Phase 6).
 *
 * The plan mandates three proofs before ANY execution path may exist:
 *   1. an unclassified operation resolves to 'write' (never auto-runs)
 *   2. destructive never executes without consented === true
 *   3. a 500-row read feeds exactly ONE record downstream  (see fanout-sampler.test.ts)
 */

import {
  ConsentRequiredError,
  DEFAULT_FIRST_RUN_CLASS,
  assertConsent,
  canAutoRun,
  isRunPermitted,
  requiresConsent,
  requiresStrongConfirmation,
  resolveFirstRunClass,
} from '../first-run-policy';

jest.mock('../../registry/unified-node-registry', () => ({
  unifiedNodeRegistry: { get: jest.fn(() => undefined) },
}));

describe('PROOF 1 — unclassified defaults to write, never none', () => {
  it('defaults an unknown node type with an unknown operation to write', () => {
    expect(resolveFirstRunClass('some_brand_new_node', 'frobnicate')).toBe('write');
  });

  it('defaults a known node with an unrecognised operation to write', () => {
    expect(resolveFirstRunClass('google_sheets', 'frobnicate')).toBe('write');
  });

  it('defaults when no operation is supplied at all', () => {
    expect(resolveFirstRunClass('some_unknown_node')).toBe('write');
  });

  it('exposes write as the documented default', () => {
    expect(DEFAULT_FIRST_RUN_CLASS).toBe('write');
  });

  it('never silently resolves an unknown operation to none', () => {
    for (const op of ['frobnicate', 'wibble', '', 'do_the_thing']) {
      expect(resolveFirstRunClass('mystery_node', op)).not.toBe('none');
    }
  });
});

describe('PROOF 2 — destructive never runs without explicit consent', () => {
  it('throws for destructive without consent', () => {
    expect(() => assertConsent('db', 'delete', 'destructive', undefined)).toThrow(
      ConsentRequiredError
    );
    expect(() => assertConsent('db', 'delete', 'destructive', false)).toThrow(ConsentRequiredError);
  });

  it('rejects truthy-but-not-true values, so a loose body cannot authorise a side effect', () => {
    for (const sloppy of ['true', 'yes', 1, {}, [], 'on']) {
      expect(() => assertConsent('db', 'delete', 'destructive', sloppy)).toThrow(
        ConsentRequiredError
      );
      expect(isRunPermitted('destructive', sloppy)).toBe(false);
    }
  });

  it('permits destructive only for exactly true', () => {
    expect(() => assertConsent('db', 'delete', 'destructive', true)).not.toThrow();
    expect(isRunPermitted('destructive', true)).toBe(true);
  });

  it('gates write the same way', () => {
    expect(() => assertConsent('google_gmail', 'send', 'write', undefined)).toThrow(
      ConsentRequiredError
    );
    expect(() => assertConsent('google_gmail', 'send', 'write', true)).not.toThrow();
  });

  it('never gates none or read', () => {
    expect(() => assertConsent('math', 'add', 'none', undefined)).not.toThrow();
    expect(() => assertConsent('google_sheets', 'read', 'read', undefined)).not.toThrow();
    expect(isRunPermitted('none', undefined)).toBe(true);
    expect(isRunPermitted('read', undefined)).toBe(true);
  });

  it('carries the context needed to explain the pause', () => {
    try {
      assertConsent('slack', 'send', 'write', undefined);
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ConsentRequiredError;
      expect(e.code).toBe('CONSENT_REQUIRED');
      expect(e.nodeType).toBe('slack');
      expect(e.operation).toBe('send');
      expect(e.firstRunClass).toBe('write');
    }
  });
});

describe('classification resolution order', () => {
  it('classifies triggers, logic and transforms as none', () => {
    for (const nodeType of ['manual_trigger', 'webhook', 'if_else', 'switch', 'code', 'filter']) {
      expect(resolveFirstRunClass(nodeType)).toBe('none');
    }
  });

  it('classifies reads as read', () => {
    expect(resolveFirstRunClass('google_sheets', 'read')).toBe('read');
    expect(resolveFirstRunClass('google_gmail', 'list')).toBe('read');
    expect(resolveFirstRunClass('mongodb', 'find')).toBe('read');
    expect(resolveFirstRunClass('db', 'select')).toBe('read');
  });

  it('classifies sends, creates and appends as write', () => {
    expect(resolveFirstRunClass('google_gmail', 'send')).toBe('write');
    expect(resolveFirstRunClass('google_sheets', 'append')).toBe('write');
    expect(resolveFirstRunClass('mongodb', 'insertOne')).toBe('write');
  });

  it('classifies the settled deny-list as destructive', () => {
    expect(resolveFirstRunClass('db', 'delete')).toBe('destructive');
    expect(resolveFirstRunClass('mongodb', 'deleteOne')).toBe('destructive');
    expect(resolveFirstRunClass('hubspot', 'batchDelete')).toBe('destructive');
    expect(resolveFirstRunClass('chargebee', 'cancel_subscription')).toBe('destructive');
    expect(resolveFirstRunClass('stripe', 'refund')).toBe('destructive');
    expect(resolveFirstRunClass('mailchimp', 'unsubscribe')).toBe('destructive');
  });

  it('reads HTTP semantics from the verb, not the node name', () => {
    expect(resolveFirstRunClass('http_request', 'GET')).toBe('read');
    expect(resolveFirstRunClass('http_request', 'POST')).toBe('write');
    expect(resolveFirstRunClass('http_request', 'PUT')).toBe('write');
    expect(resolveFirstRunClass('http_request', 'DELETE')).toBe('destructive');
  });

  it('lets a per-node override win over the generic verb', () => {
    // 'cancel' is on the destructive verb list, but cancelling a CI build is not data loss.
    expect(resolveFirstRunClass('jenkins', 'cancel')).toBe('write');
  });

  it('catches compound destructive names by prefix', () => {
    expect(resolveFirstRunClass('contentful', 'delete_entry')).toBe('destructive');
    expect(resolveFirstRunClass('some_node', 'delete_everything_now')).toBe('destructive');
  });
});

describe('policy predicates', () => {
  it('allows only none and read to auto-run', () => {
    expect(canAutoRun('none')).toBe(true);
    expect(canAutoRun('read')).toBe(true);
    expect(canAutoRun('write')).toBe(false);
    expect(canAutoRun('destructive')).toBe(false);
  });

  it('requires consent for exactly write and destructive', () => {
    expect(requiresConsent('none')).toBe(false);
    expect(requiresConsent('read')).toBe(false);
    expect(requiresConsent('write')).toBe(true);
    expect(requiresConsent('destructive')).toBe(true);
  });

  it('reserves the stronger confirmation for destructive', () => {
    expect(requiresStrongConfirmation('destructive')).toBe(true);
    expect(requiresStrongConfirmation('write')).toBe(false);
  });
});
