/**
 * Guidance — the shape every build-time failure resolves to (plan §2.2).
 *
 * The contract is: **what happened → why → what to do next → the field, editable inline.**
 *
 * Deliberate vocabulary rules, enforced by tests:
 * - severity is `needs_attention`, never `failed` / `error`
 * - `headline` is plain language, never a status code or exception text
 * - raw provider text lives ONLY in `technicalDetail`, which the UI renders behind a
 *   collapsed disclosure — no stack traces, no red alerts, no toasts
 */

export type GuidanceSeverity = 'needs_attention' | 'info';

export interface GuidanceFieldRef {
  nodeId: string;
  /** The field the user should edit. Omitted when the problem is not a field's fault. */
  fieldName?: string;
}

export interface Guidance {
  /** What happened, in the user's terms. One sentence, no jargon. */
  headline: string;
  /** Why it happened. */
  why: string;
  /** Concrete next steps, most likely fix first. */
  nextSteps: string[];
  /**
   * The field to focus, when the problem is attributable to one. Absent when the cause
   * is a connection or the node as a whole — pointing at a field the user cannot fix
   * is worse than pointing at nothing.
   */
  field?: GuidanceFieldRef;
  /** Raw provider/system text. Rendered only behind a collapsed disclosure. */
  technicalDetail?: string;
  severity: GuidanceSeverity;
  /** True when the fix is to connect or reconnect an account, not to edit a value. */
  isConnectionProblem?: boolean;
  /** Which interpreter produced this, for telemetry and debugging. */
  source: 'input_validation' | 'provider' | 'fallback';
}

export interface ProviderErrorInput {
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  /** `_error` from the executor output. */
  error?: unknown;
  /** `_errorCode` — structured where the node override sets one. */
  errorCode?: unknown;
  /** `_errorDetails` — provider payload where available. */
  errorDetails?: unknown;
  /** The node's resolved config, used to name the offending value back to the user. */
  config?: Record<string, unknown>;
  /** Full executor output, for the input-validation half. */
  output?: unknown;
}

/**
 * A single provider mapping. `match` is checked against the structured code first and the
 * message text second, so nodes that only throw strings still resolve.
 */
export interface ProviderErrorMapping {
  /** Structured codes this rule claims, compared case-insensitively. */
  codes?: string[];
  /** Substrings of the error message this rule claims, compared case-insensitively. */
  messageIncludes?: string[];
  /** HTTP statuses this rule claims. */
  statuses?: number[];
  /** Field this error points at. Omit when it is a connection problem. */
  fieldName?: string;
  headline: string;
  why: string;
  nextSteps: string[];
  isConnectionProblem?: boolean;
}

export interface ProviderInterpreter {
  /** Node types this interpreter serves. */
  nodeTypes: string[];
  provider: string;
  mappings: ProviderErrorMapping[];
}
