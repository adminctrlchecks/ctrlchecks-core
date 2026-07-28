/**
 * Provider error → field guidance (plan §2.2, Phase 7a).
 *
 * Turns whatever a provider threw into: **what happened → why → what to do next → the
 * field, editable inline.** Never surfaces a status code, a stack trace or the word
 * "failed" to the user.
 *
 * Input is better than §2.2 feared (§3.10): `dynamic-node-executor.ts` already returns
 * `{ _error, _errorCode, _errorDetails, _nodeType }`, so a structured code is available
 * wherever a node override sets one. Coverage is uneven, so resolution is layered:
 *
 *   1. `buildRuntimeValidationGuidance` — a missing required input explains a failure
 *      better than whatever the provider said about it, so it wins
 *   2. structured `_errorCode` match
 *   3. HTTP status match (from `_errorDetails` or the message)
 *   4. substring match on the message text — for nodes that throw bare strings
 *   5. a node-level fallback that attributes nothing to any field
 *
 * This module never throws: it always returns a Guidance.
 */

import { buildRuntimeValidationGuidance } from '../utils/runtime-validation-guidance';
import { googleInterpreter } from './interpreters/google';
import { slackInterpreter } from './interpreters/slack';
import { notionInterpreter } from './interpreters/notion';
import type {
  Guidance,
  ProviderErrorInput,
  ProviderErrorMapping,
  ProviderInterpreter,
} from './types';

const INTERPRETERS: ProviderInterpreter[] = [googleInterpreter, slackInterpreter, notionInterpreter];

const byNodeType = new Map<string, ProviderInterpreter>();
for (const interpreter of INTERPRETERS) {
  for (const nodeType of interpreter.nodeTypes) byNodeType.set(nodeType, interpreter);
}

function text(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.description;
    if (typeof message === 'string') return message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Pull an HTTP status out of the details payload, the code, or the message. */
function extractStatus(input: ProviderErrorInput): number | undefined {
  const details = input.errorDetails as Record<string, unknown> | undefined;
  for (const candidate of [details?.status, details?.statusCode, details?.code, input.errorCode]) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n >= 100 && n < 600) return n;
  }
  const match = /\b(4\d{2}|5\d{2})\b/.exec(text(input.error));
  return match ? Number(match[1]) : undefined;
}

function matches(mapping: ProviderErrorMapping, code: string, message: string, status?: number): boolean {
  if (code && mapping.codes?.some((c) => c.toLowerCase() === code)) return true;
  if (status !== undefined && mapping.statuses?.includes(status)) return true;
  if (message && mapping.messageIncludes?.some((m) => message.includes(m.toLowerCase()))) return true;
  return false;
}

/**
 * Node-level fallback for an error no interpreter claims.
 *
 * **Attributes nothing to any field.** Guessing would put the user's cursor in the wrong
 * box, which is worse than admitting we do not know.
 */
export function buildFallbackGuidance(input: ProviderErrorInput): Guidance {
  const label = input.nodeLabel || input.nodeType || 'this step';
  const raw = text(input.error);
  return {
    headline: `${label} didn't complete.`,
    why: 'The service returned something we do not have specific guidance for yet, so we cannot point at one field with confidence.',
    nextSteps: [
      'Check the values in this step, especially any IDs or names copied from the service.',
      'Confirm the connected account can reach the item this step refers to.',
      'Test the step again — some services fail briefly under load.',
    ],
    field: { nodeId: input.nodeId },
    technicalDetail: raw || undefined,
    severity: 'needs_attention',
    source: 'fallback',
  };
}

/** Interpret a provider error. Never throws; falls back rather than guessing a field. */
export function interpretProviderError(input: ProviderErrorInput): Guidance {
  try {
    const interpreter = byNodeType.get(input.nodeType);
    if (!interpreter) return buildFallbackGuidance(input);

    const code = String(input.errorCode ?? '').trim().toLowerCase();
    const message = text(input.error).toLowerCase();
    const status = extractStatus(input);

    // Structured code first, then status, then substring — most specific signal wins.
    const mapping =
      interpreter.mappings.find((m) => code && m.codes?.some((c) => c.toLowerCase() === code)) ??
      interpreter.mappings.find((m) => status !== undefined && m.statuses?.includes(status)) ??
      interpreter.mappings.find((m) => matches(m, code, message, status));

    if (!mapping) return buildFallbackGuidance(input);

    return {
      headline: mapping.headline,
      why: mapping.why,
      nextSteps: [...mapping.nextSteps],
      field: mapping.fieldName
        ? { nodeId: input.nodeId, fieldName: mapping.fieldName }
        : { nodeId: input.nodeId },
      technicalDetail: text(input.error) || undefined,
      severity: 'needs_attention',
      isConnectionProblem: mapping.isConnectionProblem,
      source: 'provider',
    };
  } catch {
    // An interpreter bug must never become the user's problem.
    return buildFallbackGuidance(input);
  }
}

/**
 * The composed entry point: input-validation guidance first, provider interpretation
 * second.
 *
 * A missing required input is a better explanation than whatever the provider said about
 * it — "you haven't filled in the channel yet" beats "channel_not_found".
 */
export function composeGuidance(input: ProviderErrorInput): Guidance {
  try {
    const validation = buildRuntimeValidationGuidance({
      nodeId: input.nodeId,
      nodeType: input.nodeType,
      nodeLabel: input.nodeLabel,
      output: input.output ?? {},
    });

    const firstIssue = validation.runtimeValidationIssues?.[0];
    if (firstIssue) {
      return {
        headline: `${firstIssue.fieldLabel || firstIssue.fieldName} still needs a value.`,
        why:
          firstIssue.reason ||
          'This step cannot run until the field has a value it can use.',
        nextSteps: [
          `Enter a value for ${firstIssue.fieldLabel || firstIssue.fieldName}.`,
          'If it should come from an earlier step, check that step produced the data.',
        ],
        field: { nodeId: input.nodeId, fieldName: firstIssue.fieldName },
        severity: 'needs_attention',
        source: 'input_validation',
      };
    }
  } catch {
    // Fall through to provider interpretation.
  }

  return interpretProviderError(input);
}

/** True when the output carries an error worth interpreting. */
export function hasError(output: unknown): boolean {
  if (!output || typeof output !== 'object') return false;
  return Boolean((output as Record<string, unknown>)._error);
}

/** Build guidance straight from an executor output payload. */
export function guidanceFromOutput(args: {
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  config?: Record<string, unknown>;
  output: unknown;
}): Guidance {
  const output = (output_ => (output_ && typeof output_ === 'object' ? (output_ as Record<string, unknown>) : {}))(
    args.output
  );
  return composeGuidance({
    nodeId: args.nodeId,
    nodeType: args.nodeType,
    nodeLabel: args.nodeLabel,
    config: args.config,
    error: output._error,
    errorCode: output._errorCode,
    errorDetails: output._errorDetails,
    output,
  });
}
