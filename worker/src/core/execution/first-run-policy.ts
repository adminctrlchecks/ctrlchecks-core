/**
 * First-run policy — the safety layer for build-time node execution (plan Phase 6).
 *
 * **This module contains no execution path.** It answers "may this run automatically?"
 * and "was consent given?"; the caller does the running. Phase 6 lands before any
 * execution code exists precisely so the answer is available before it can be needed.
 */

import { unifiedNodeRegistry } from '../registry/unified-node-registry';
import {
  classifyOperationVerb,
  lookupFirstRunOverride,
  lookupNodeDefaultClass,
  type FirstRunClass,
} from '../registry/first-run-classification';

export type { FirstRunClass };

/** The safe default. An unclassified operation is treated as consequential. */
export const DEFAULT_FIRST_RUN_CLASS: FirstRunClass = 'write';

/**
 * Thrown when a `write` or `destructive` operation is attempted without explicit consent.
 * Callers turn this into `status: 'awaiting_consent'` — never an error dialog.
 */
export class ConsentRequiredError extends Error {
  readonly code = 'CONSENT_REQUIRED';
  constructor(
    readonly nodeType: string,
    readonly operation: string | undefined,
    readonly firstRunClass: FirstRunClass
  ) {
    super(`${nodeType}${operation ? `.${operation}` : ''} requires explicit consent before running.`);
    this.name = 'ConsentRequiredError';
  }
}

function contractClassFor(nodeType: string, operation?: string): FirstRunClass | undefined {
  const def = unifiedNodeRegistry.get(nodeType);
  const contracts = (def as { operationContracts?: Array<Record<string, unknown>> } | undefined)
    ?.operationContracts;
  if (!Array.isArray(contracts)) return undefined;
  const match = contracts.find(
    (c) => String(c?.operation ?? '') === String(operation ?? '')
  );
  const value = match?.firstRunClass;
  return typeof value === 'string' ? (value as FirstRunClass) : undefined;
}

/**
 * What running this node/operation would do to the outside world.
 *
 * Resolution order — first hit wins:
 *   1. `firstRunClass` on the node's own operation contract
 *   2. a per-node override for this operation
 *   3. the node-level default (triggers, logic, transforms)
 *   4. the operation verb
 *   5. `'write'`
 *
 * Never returns undefined, and never defaults to `'none'`.
 */
export function resolveFirstRunClass(nodeType: string, operation?: string): FirstRunClass {
  return (
    contractClassFor(nodeType, operation) ??
    lookupFirstRunOverride(nodeType, operation) ??
    lookupNodeDefaultClass(nodeType) ??
    classifyOperationVerb(operation ?? '') ??
    DEFAULT_FIRST_RUN_CLASS
  );
}

/** True when the class may run automatically once its inputs are complete. */
export function canAutoRun(firstRunClass: FirstRunClass): boolean {
  return firstRunClass === 'none' || firstRunClass === 'read';
}

/** True when the user must explicitly consent before this runs. */
export function requiresConsent(firstRunClass: FirstRunClass): boolean {
  return firstRunClass === 'write' || firstRunClass === 'destructive';
}

/** True when the class warrants a stronger confirmation and no auto-advance (§2.1). */
export function requiresStrongConfirmation(firstRunClass: FirstRunClass): boolean {
  return firstRunClass === 'destructive';
}

/**
 * Gate a run. Throws `ConsentRequiredError` unless consent was given explicitly.
 *
 * `consented` must be exactly `true`: truthy values like `'yes'` or `1` are rejected, so
 * a loosely-typed request body cannot accidentally authorise a real side effect.
 */
export function assertConsent(
  nodeType: string,
  operation: string | undefined,
  firstRunClass: FirstRunClass,
  consented: unknown
): void {
  if (!requiresConsent(firstRunClass)) return;
  if (consented === true) return;
  throw new ConsentRequiredError(nodeType, operation, firstRunClass);
}

/** Non-throwing form, for callers building a response rather than guarding a call. */
export function isRunPermitted(
  firstRunClass: FirstRunClass,
  consented: unknown
): boolean {
  if (!requiresConsent(firstRunClass)) return true;
  return consented === true;
}
