import { awsClient } from '@/integrations/aws/client';
import { getBackendUrl } from './getBackendUrl';

/**
 * Run one node for real during setup.
 *
 * ⚠️ A `write` or `destructive` node genuinely sends the email / posts the message. The
 * server refuses to execute either without `consented: true`, so the first call for such
 * a node comes back `awaiting_consent` with copy naming the effect — the UI shows that
 * and only re-calls once the user agrees.
 */

export type RunNodeStatus = 'passed' | 'awaiting_consent' | 'needs_attention';

export interface RunGuidance {
  headline: string;
  why: string;
  nextSteps: string[];
  field?: { nodeId: string; fieldName?: string };
  technicalDetail?: string;
  severity: 'needs_attention' | 'info';
  isConnectionProblem?: boolean;
  source: 'input_validation' | 'provider' | 'fallback';
}

export interface RunNodeResult {
  buildId: string;
  nodeId: string;
  status: RunNodeStatus;
  firstRunClass: string;
  consentPrompt?: string;
  requiresStrongConfirmation?: boolean;
  output?: unknown;
  guidance?: RunGuidance;
  executionMs?: number;
  samplingNote?: string;
  deduped?: boolean;
  executionCount: number;
}

export async function runBuildNode(args: {
  buildId?: string;
  nodes: unknown[];
  edges: unknown[];
  nodeId: string;
  consented?: boolean;
}): Promise<RunNodeResult | null> {
  const token = (await awsClient.auth.getSession()).data.session?.access_token;
  if (!token) return null;

  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}/api/workflow-build/run-node`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(args),
    });
  } catch {
    return null;
  }

  try {
    // 429 (per-build ceiling) carries a guidance body, so it is parsed like a result.
    return (await response.json()) as RunNodeResult;
  } catch {
    return null;
  }
}

/**
 * Per-trigger honesty (§6a/G8): synthesising a timestamp proves nothing about a schedule
 * firing later, so a schedule trigger is never badged "Verified".
 */
export function badgeForNode(nodeType: string, status: RunNodeStatus): string {
  if (status !== 'passed') return '';
  if (nodeType === 'schedule' || nodeType === 'schedule_trigger' || nodeType === 'cron') {
    return 'Configured — fires on schedule';
  }
  return 'Verified';
}
