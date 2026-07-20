import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';

/**
 * GitHub repository-event trigger (push, issues, pull_request, release, issue_comment, ...).
 *
 * GitHub webhooks are registered per-repository via `POST /repos/{owner}/{repo}/hooks`
 * (a `PAT` or GitHub App installation token with `repo` / `admin:repo_hook` scope is
 * required) and unregistered via `DELETE /repos/{owner}/{repo}/hooks/{hook_id}`.
 * GitHub webhooks do not expire on a schedule, so no renewal scheduler is needed here
 * (same reasoning as Typeform/Tally).
 *
 * Signature: GitHub signs the raw request body with HMAC-SHA256 using the webhook's
 * configured secret and sends it as `X-Hub-Signature-256: sha256=<hex digest>`. This is
 * a stable, well-documented header (unlike Tally's ambiguous base64-vs-hex assumption)
 * so `validateGithubSignature` expects the `sha256=` prefix and hex encoding exactly.
 *
 * Event type comes from the `X-GitHub-Event` header (push, issues, pull_request,
 * release, issue_comment, ping, ...), not from the JSON payload. GitHub also sends a
 * `ping` event when a webhook is first created — this must be accepted with 200 and
 * must not start a workflow execution. `X-GitHub-Delivery` is a unique ID per delivery
 * attempt, used to build a stable `eventId`.
 */

export type NormalizedGithubEvent = {
  eventId: string;
  eventType: string;
  source: 'github';
  userId: string | null;
  username: string;
  text: string;
  timestamp: string;
  repository: string;
  action: string | null;
  ref: string | null;
  commits: unknown[] | null;
  issueNumber: number | null;
  issueTitle: string | null;
  issueUrl: string | null;
  prNumber: number | null;
  prTitle: string | null;
  prUrl: string | null;
  merged: boolean | null;
  releaseTag: string | null;
  releaseName: string | null;
  commentBody: string | null;
  commentUrl: string | null;
  raw: unknown;
};

export type GithubTriggerConfig = {
  connectionId?: string;
  owner?: string;
  repo?: string;
  eventTypes?: string | string[];
  webhookSecret?: string;
  query?: string;
};

export type GithubWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  owner?: string;
  repo?: string;
  error?: string;
};

type GithubWebhookState = {
  owner: string;
  repo: string;
  hookId: string;
  secret: string;
  userId: string;
  workflowId: string;
  nodeId: string;
};

const GITHUB_API_BASE = 'https://api.github.com';
// GitHub repository webhooks do not expire on a schedule — no renewal scheduler needed.
const STATE_TTL_SECONDS = 365 * 24 * 60 * 60;

const DEFAULT_EVENT_TYPES = ['push', 'issues', 'pull_request', 'release', 'issue_comment'];

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function header(req: Request, name: string): string {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : asString(value);
}

function timingEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function stateKey(workflowId: string, nodeId: string): string {
  return `github:webhook:${workflowId}:${nodeId}`;
}

async function getWebhookState(workflowId: string, nodeId: string): Promise<GithubWebhookState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GithubWebhookState;
  } catch {
    return null;
  }
}

async function setWebhookState(state: GithubWebhookState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWebhookState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export function getGithubWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register GitHub webhooks.');
  return `${baseUrl}/api/github/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
}

function parseCredentialValue(value: string | null): Record<string, any> {
  if (!value) return {};
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return { value: trimmed };
  try {
    return JSON.parse(trimmed);
  } catch {
    return { value: trimmed };
  }
}

async function resolveGithubToken(userId: string): Promise<string> {
  for (const key of ['github_pat', 'github']) {
    const stored = await retrieveCredential({ userId }, key).catch(() => null);
    if (!stored) continue;
    const parsed = parseCredentialValue(stored);
    const token =
      asString(parsed.token) ||
      asString(parsed.apiKey) ||
      asString(parsed.access_token) ||
      asString(parsed.value) ||
      asString(stored);
    if (token) return token;
  }
  throw new Error('No active GitHub connection found. Save a GitHub Personal Access Token (or connect via OAuth) in Connections first.');
}

async function githubApiFetch(token: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = json?.message || response.statusText;
    throw Object.assign(new Error(`GitHub API error (${response.status}): ${message}`), { statusCode: response.status });
  }
  return json;
}

export function validateGithubSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const provided = signatureHeader.slice('sha256='.length);
  const computed = createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingEqualString(provided, computed);
}

export function getGithubSignatureHeader(req: Request): string {
  return header(req, 'x-hub-signature-256');
}

export function getGithubEventHeader(req: Request): string {
  return header(req, 'x-github-event');
}

export function getGithubDeliveryHeader(req: Request): string {
  return header(req, 'x-github-delivery');
}

function eventTypesList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((v) => asString(v).toLowerCase()).filter(Boolean);
  const str = asString(value);
  if (!str) return [];
  return str
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Normalizes a GitHub webhook delivery into a common event shape.
 * Returns null for the `ping` event (handled specially by the caller — accepted with
 * 200 OK but never used to trigger a workflow execution).
 */
export function normalizeGithubEvent(githubEvent: string, deliveryId: string, payload: any): NormalizedGithubEvent | null {
  const rawEvent = asString(githubEvent).toLowerCase();
  if (!rawEvent || rawEvent === 'ping') return null;

  const action = asString(payload?.action) || null;
  const eventType = action ? `${rawEvent}.${action}` : rawEvent;
  const repository = asString(payload?.repository?.full_name);
  const sender = payload?.sender || {};
  const username = asString(sender?.login);
  const userId = sender?.id !== undefined && sender?.id !== null ? String(sender.id) : null;
  const timestamp = new Date().toISOString();

  const base = {
    eventId: asString(deliveryId) || randomUUID(),
    eventType,
    source: 'github' as const,
    userId,
    username,
    timestamp,
    repository,
    action,
    ref: null as string | null,
    commits: null as unknown[] | null,
    issueNumber: null as number | null,
    issueTitle: null as string | null,
    issueUrl: null as string | null,
    prNumber: null as number | null,
    prTitle: null as string | null,
    prUrl: null as string | null,
    merged: null as boolean | null,
    releaseTag: null as string | null,
    releaseName: null as string | null,
    commentBody: null as string | null,
    commentUrl: null as string | null,
    raw: payload,
  };

  switch (rawEvent) {
    case 'push': {
      const commits = Array.isArray(payload?.commits) ? payload.commits : [];
      const lastCommitMessage = commits.length ? asString(commits[commits.length - 1]?.message) : '';
      return {
        ...base,
        eventType: 'push',
        ref: asString(payload?.ref) || null,
        commits,
        text: lastCommitMessage || `Push to ${repository}`,
      };
    }
    case 'issues': {
      const issue = payload?.issue || {};
      return {
        ...base,
        issueNumber: typeof issue?.number === 'number' ? issue.number : null,
        issueTitle: asString(issue?.title) || null,
        issueUrl: asString(issue?.html_url) || null,
        text: asString(issue?.title) || `Issue ${action || 'event'} on ${repository}`,
      };
    }
    case 'pull_request': {
      const pr = payload?.pull_request || {};
      return {
        ...base,
        prNumber: typeof pr?.number === 'number' ? pr.number : null,
        prTitle: asString(pr?.title) || null,
        prUrl: asString(pr?.html_url) || null,
        merged: typeof pr?.merged === 'boolean' ? pr.merged : null,
        ref: asString(pr?.head?.ref) || null,
        text: asString(pr?.title) || `Pull request ${action || 'event'} on ${repository}`,
      };
    }
    case 'release': {
      const release = payload?.release || {};
      return {
        ...base,
        releaseTag: asString(release?.tag_name) || null,
        releaseName: asString(release?.name) || null,
        text: asString(release?.name) || asString(release?.tag_name) || `Release ${action || 'event'} on ${repository}`,
      };
    }
    case 'issue_comment': {
      const comment = payload?.comment || {};
      const issue = payload?.issue || {};
      return {
        ...base,
        issueNumber: typeof issue?.number === 'number' ? issue.number : null,
        issueTitle: asString(issue?.title) || null,
        issueUrl: asString(issue?.html_url) || null,
        commentBody: asString(comment?.body) || null,
        commentUrl: asString(comment?.html_url) || null,
        text: asString(comment?.body) || `Comment ${action || 'event'} on ${repository}`,
      };
    }
    default: {
      // Other supported GitHub event types (star, fork, pull_request_review, ...) still
      // get a normalized envelope with the shared base fields, just without
      // type-specific extras.
      return {
        ...base,
        text: `${rawEvent}${action ? `.${action}` : ''} on ${repository}`,
      };
    }
  }
}

export function shouldAcceptGithubEvent(
  normalized: NormalizedGithubEvent,
  triggerConfig: GithubTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const configuredEventTypes = eventTypesList(triggerConfig.eventTypes);
  if (configuredEventTypes.length) {
    const rawEvent = normalized.eventType.split('.')[0].toLowerCase();
    const matchesRawEvent = configuredEventTypes.includes(rawEvent);
    const matchesFullType = configuredEventTypes.includes(normalized.eventType.toLowerCase());
    if (!matchesRawEvent && !matchesFullType) {
      return { accepted: false, reason: `Ignored GitHub event type "${normalized.eventType}" not in the configured event types.` };
    }
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query && !normalized.text.toLowerCase().includes(query)) {
    return { accepted: false, reason: 'Ignored GitHub event not matching the configured query filter.' };
  }

  return { accepted: true };
}

export function buildGithubExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedGithubEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'github',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `github_${input.workflowId}_${input.normalized.eventId}`,
    _github: true,
  };
}

export async function validateGithubWebhookSecret(
  workflowId: string,
  nodeId: string,
  rawBody: Buffer,
  signatureHeader: string,
): Promise<boolean> {
  const state = await getWebhookState(workflowId, nodeId);
  if (!state) return false;
  return validateGithubSignature(rawBody, signatureHeader, state.secret);
}

export async function registerGithubWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  owner: string;
  repo: string;
  eventTypes?: string | string[];
}): Promise<{ success: true; webhookUrl: string; owner: string; repo: string; hookId: string }> {
  const owner = asString(input.owner);
  const repo = asString(input.repo);
  if (!owner || !repo) {
    throw Object.assign(new Error('A GitHub repository owner and name are required.'), { statusCode: 400 });
  }
  const token = await resolveGithubToken(input.userId);
  const webhookUrl = getGithubWebhookUrl(input.workflowId, input.nodeId);

  const existing = await getWebhookState(input.workflowId, input.nodeId);
  const secret = existing?.secret || randomUUID();

  const events = eventTypesList(input.eventTypes);
  const resolvedEvents = events.length ? events : DEFAULT_EVENT_TYPES;

  // If a webhook already exists for this node, remove it first so re-saving the
  // workflow doesn't leave duplicate GitHub webhooks on the same repository.
  if (existing?.hookId && existing.owner === owner && existing.repo === repo) {
    await githubApiFetch(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks/${encodeURIComponent(existing.hookId)}`, {
      method: 'DELETE',
    }).catch((error) => {
      logger.warn('[GitHub Trigger] Failed to remove previous webhook before re-registering (continuing):', error);
    });
  }

  const response = await githubApiFetch(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: resolvedEvents,
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
    }),
  });

  const hookId = response?.id !== undefined && response?.id !== null ? String(response.id) : '';

  await setWebhookState({
    owner,
    repo,
    hookId,
    secret,
    userId: input.userId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, webhookUrl, owner, repo, hookId };
}

export async function unregisterGithubWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
}): Promise<{ success: true }> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (state?.hookId) {
    const token = await resolveGithubToken(input.userId).catch(() => null);
    if (token) {
      await githubApiFetch(
        token,
        `/repos/${encodeURIComponent(state.owner)}/${encodeURIComponent(state.repo)}/hooks/${encodeURIComponent(state.hookId)}`,
        { method: 'DELETE' },
      ).catch((error) => {
        logger.warn('[GitHub Trigger] Webhook delete failed (continuing to clear local state):', error);
      });
    }
  }

  await deleteWebhookState(input.workflowId, input.nodeId);
  return { success: true };
}

function workflowNodes(workflow: any): any[] {
  const candidates = [workflow?.nodes, workflow?.graph?.nodes, workflow?.definition?.nodes, workflow?.definition?.graph?.nodes];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): GithubTriggerConfig {
  return (node?.data?.config || node?.config || {}) as GithubTriggerConfig;
}

export async function autoRegisterGithubWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<GithubWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'github_trigger');
  const results: GithubWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    const owner = asString(triggerConfig.owner);
    const repo = asString(triggerConfig.repo);
    if (!owner || !repo) {
      results.push({ nodeId, success: false, error: 'Repository owner and name are required (set them on the GitHub Trigger node).' });
      continue;
    }
    try {
      const result = await registerGithubWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        owner,
        repo,
        eventTypes: triggerConfig.eventTypes,
      });
      results.push({ nodeId, success: true, webhookUrl: result.webhookUrl, owner: result.owner, repo: result.repo });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[GitHub Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export { getWebhookState as getGithubWebhookState };
