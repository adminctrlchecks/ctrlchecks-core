import { randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';

/**
 * GitLab project-event trigger (push, issue, merge request, note/comment, tag push,
 * pipeline, release, ...).
 *
 * Unlike GitHub/Slack/Discord, GitLab does NOT sign webhook deliveries with an HMAC
 * digest. Instead, GitLab echoes back a plain shared "Secret Token" (configured when
 * the webhook is created) on every delivery via the `X-Gitlab-Token` header. Validation
 * is a constant-time string compare against the stored secret — there is no digest to
 * recompute. Do not treat this as HMAC.
 *
 * Webhooks are registered per-project via `POST /api/v4/projects/:id/hooks` (a PAT or
 * OAuth token with `api` scope is required) and unregistered via
 * `DELETE /api/v4/projects/:id/hooks/:hook_id`. GitLab webhooks do not expire on a
 * schedule, so no renewal scheduler is needed here (same reasoning as GitHub/Typeform/Tally).
 *
 * GitLab PATs can be sent either via the `PRIVATE-TOKEN` header (GitLab's own
 * convention) or via `Authorization: Bearer <token>` (supported since GitLab 13.x for
 * REST API compatibility with OAuth-style clients). This service uses `Authorization:
 * Bearer`, matching the credential injection template already defined for the
 * `gitlab_pat` credential type and the existing `gitlab` action node's proven-working
 * implementation in `execute-workflow.ts` — both already exercise this header in
 * production, so a second convention is not introduced here.
 *
 * Event type comes from the JSON payload's `object_kind` field (push, tag_push, issue,
 * note, merge_request, pipeline, release, ...), not from a header. GitLab does not send
 * an automatic "ping" test event when a webhook is created (unlike GitHub) — the user
 * manually triggers a "Test" send from the GitLab UI, which delivers a real sample event
 * with the real `object_kind`, so no ping special-case is needed.
 */

export type NormalizedGitlabEvent = {
  eventId: string;
  eventType: string;
  source: 'gitlab';
  userId: string | null;
  username: string | null;
  text: string;
  timestamp: string;
  projectId: string | null;
  projectName: string | null;
  action: string | null;
  ref: string | null;
  commits: unknown[] | null;
  issueIid: number | null;
  issueTitle: string | null;
  issueUrl: string | null;
  mrIid: number | null;
  mrTitle: string | null;
  mrUrl: string | null;
  mrState: string | null;
  noteBody: string | null;
  noteUrl: string | null;
  raw: unknown;
};

export type GitlabTriggerConfig = {
  connectionId?: string;
  baseUrl?: string;
  projectId?: string;
  eventTypes?: string | string[];
  secretToken?: string;
  query?: string;
};

export type GitlabWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  projectId?: string;
  error?: string;
};

type GitlabWebhookState = {
  projectId: string;
  baseUrl: string;
  hookId: string;
  secret: string;
  userId: string;
  workflowId: string;
  nodeId: string;
};

const DEFAULT_BASE_URL = 'https://gitlab.com';
// GitLab project webhooks do not expire on a schedule — no renewal scheduler needed.
const STATE_TTL_SECONDS = 365 * 24 * 60 * 60;

const DEFAULT_EVENT_TYPES = ['push', 'issue', 'merge_request', 'note'];

// Maps our normalized event-type names to the boolean flags GitLab's hook creation API expects.
const EVENT_TYPE_TO_HOOK_FIELD: Record<string, string> = {
  push: 'push_events',
  tag_push: 'tag_push_events',
  issue: 'issues_events',
  merge_request: 'merge_requests_events',
  note: 'note_events',
  pipeline: 'pipeline_events',
  job: 'job_events',
  release: 'releases_events',
};

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

function normalizeBaseUrl(baseUrl: string | undefined): string {
  const trimmed = asString(baseUrl) || DEFAULT_BASE_URL;
  return trimmed.replace(/\/+$/, '');
}

function stateKey(workflowId: string, nodeId: string): string {
  return `gitlab:webhook:${workflowId}:${nodeId}`;
}

async function getWebhookState(workflowId: string, nodeId: string): Promise<GitlabWebhookState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GitlabWebhookState;
  } catch {
    return null;
  }
}

async function setWebhookState(state: GitlabWebhookState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWebhookState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

export function getGitlabWebhookUrl(workflowId: string, nodeId: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register GitLab webhooks.');
  return `${baseUrl}/api/gitlab/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
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

// Reuses the existing GitLab credential — the same `gitlab_pat` credential type (and
// legacy `gitlab` vault key) already mapped to the `gitlab` action node — rather than
// introducing a parallel credential shape for the trigger.
async function resolveGitlabToken(userId: string): Promise<string> {
  for (const key of ['gitlab_pat', 'gitlab']) {
    const stored = await retrieveCredential({ userId }, key).catch(() => null);
    if (!stored) continue;
    const parsed = parseCredentialValue(stored);
    const token =
      asString(parsed.token) ||
      asString(parsed.accessToken) ||
      asString(parsed.access_token) ||
      asString(parsed.value) ||
      asString(stored);
    if (token) return token;
  }
  throw new Error('No active GitLab connection found. Save a GitLab Personal Access Token (with "api" scope) in Connections first.');
}

async function gitlabApiFetch(token: string, baseUrl: string, path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/v4${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = json?.message || response.statusText;
    throw Object.assign(new Error(`GitLab API error (${response.status}): ${JSON.stringify(message)}`), { statusCode: response.status });
  }
  return json;
}

/**
 * Validates the plain shared-secret `X-Gitlab-Token` header GitLab sends on every
 * webhook delivery. This is NOT an HMAC signature — GitLab simply echoes back the
 * secret configured at hook-creation time, so validation is a constant-time string
 * compare against the stored secret.
 */
export function validateGitlabToken(headerToken: string, secret: string): boolean {
  if (!headerToken || !secret) return false;
  return timingEqualString(headerToken, secret);
}

export function getGitlabTokenHeader(req: Request): string {
  return header(req, 'x-gitlab-token');
}

export function getGitlabEventHeader(req: Request): string {
  return header(req, 'x-gitlab-event');
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
 * Normalizes a GitLab webhook delivery into a common event shape, keyed off the
 * payload's `object_kind` field. Returns null only when the payload has no
 * recognizable `object_kind` at all (not a real GitLab webhook delivery).
 */
export function normalizeGitlabEvent(payload: any): NormalizedGitlabEvent | null {
  const objectKind = asString(payload?.object_kind).toLowerCase();
  if (!objectKind) return null;

  const project = payload?.project || {};
  const projectId = project?.id !== undefined && project?.id !== null ? String(project.id) : null;
  const projectName = asString(project?.path_with_namespace) || asString(project?.name) || null;

  const user = payload?.user || {};
  const username = asString(user?.username) || asString(payload?.user_username) || asString(payload?.user_name) || null;
  const userIdRaw = user?.id ?? payload?.user_id;
  const userId = userIdRaw !== undefined && userIdRaw !== null ? String(userIdRaw) : null;

  const timestamp = new Date().toISOString();

  const base = {
    eventId: randomUUID(),
    eventType: objectKind,
    source: 'gitlab' as const,
    userId,
    username,
    timestamp,
    projectId,
    projectName,
    action: null as string | null,
    ref: null as string | null,
    commits: null as unknown[] | null,
    issueIid: null as number | null,
    issueTitle: null as string | null,
    issueUrl: null as string | null,
    mrIid: null as number | null,
    mrTitle: null as string | null,
    mrUrl: null as string | null,
    mrState: null as string | null,
    noteBody: null as string | null,
    noteUrl: null as string | null,
    raw: payload,
  };

  switch (objectKind) {
    case 'push': {
      const commits = Array.isArray(payload?.commits) ? payload.commits : [];
      const lastCommitMessage = commits.length ? asString(commits[commits.length - 1]?.message) : '';
      return {
        ...base,
        eventId: asString(payload?.after) || base.eventId,
        ref: asString(payload?.ref) || null,
        commits,
        text: lastCommitMessage || `Push to ${projectName || projectId || 'project'}`,
      };
    }
    case 'tag_push': {
      const commits = Array.isArray(payload?.commits) ? payload.commits : [];
      return {
        ...base,
        eventId: asString(payload?.after) || base.eventId,
        ref: asString(payload?.ref) || null,
        commits,
        text: `Tag push to ${projectName || projectId || 'project'}`,
      };
    }
    case 'issue': {
      const attrs = payload?.object_attributes || {};
      const action = asString(attrs?.action) || null;
      return {
        ...base,
        eventId: attrs?.id !== undefined && attrs?.id !== null ? String(attrs.id) : base.eventId,
        action,
        issueIid: typeof attrs?.iid === 'number' ? attrs.iid : null,
        issueTitle: asString(attrs?.title) || null,
        issueUrl: asString(attrs?.url) || null,
        text: asString(attrs?.title) || `Issue ${action || 'event'} on ${projectName || 'project'}`,
      };
    }
    case 'merge_request': {
      const attrs = payload?.object_attributes || {};
      const action = asString(attrs?.action) || null;
      return {
        ...base,
        eventId: attrs?.id !== undefined && attrs?.id !== null ? String(attrs.id) : base.eventId,
        action,
        mrIid: typeof attrs?.iid === 'number' ? attrs.iid : null,
        mrTitle: asString(attrs?.title) || null,
        mrUrl: asString(attrs?.url) || null,
        mrState: asString(attrs?.state) || null,
        ref: asString(attrs?.source_branch) || null,
        text: asString(attrs?.title) || `Merge request ${action || 'event'} on ${projectName || 'project'}`,
      };
    }
    case 'note': {
      const attrs = payload?.object_attributes || {};
      const noteableType = asString(attrs?.noteable_type).toLowerCase();
      const issue = payload?.issue || {};
      const mr = payload?.merge_request || {};
      return {
        ...base,
        eventId: attrs?.id !== undefined && attrs?.id !== null ? String(attrs.id) : base.eventId,
        noteBody: asString(attrs?.note) || null,
        noteUrl: asString(attrs?.url) || null,
        issueIid: noteableType === 'issue' && typeof issue?.iid === 'number' ? issue.iid : null,
        issueTitle: noteableType === 'issue' ? asString(issue?.title) || null : null,
        mrIid: noteableType === 'mergerequest' && typeof mr?.iid === 'number' ? mr.iid : null,
        mrTitle: noteableType === 'mergerequest' ? asString(mr?.title) || null : null,
        text: asString(attrs?.note) || `Comment on ${projectName || 'project'}`,
      };
    }
    case 'pipeline': {
      const attrs = payload?.object_attributes || {};
      return {
        ...base,
        eventId: attrs?.id !== undefined && attrs?.id !== null ? String(attrs.id) : base.eventId,
        ref: asString(attrs?.ref) || null,
        action: asString(attrs?.status) || null,
        text: `Pipeline ${asString(attrs?.status) || 'event'} on ${projectName || 'project'}`,
      };
    }
    case 'release': {
      // Release event fields are top-level, not nested under object_attributes.
      const action = asString(payload?.action) || null;
      return {
        ...base,
        eventId: payload?.id !== undefined && payload?.id !== null ? String(payload.id) : base.eventId,
        action,
        text: asString(payload?.name) || asString(payload?.tag) || `Release ${action || 'event'} on ${projectName || 'project'}`,
      };
    }
    default: {
      // Other GitLab event kinds (build/job, wiki_page, deployment, feature_flag, ...)
      // still get a normalized envelope with the shared base fields.
      return {
        ...base,
        text: `${objectKind} event on ${projectName || projectId || 'project'}`,
      };
    }
  }
}

export function shouldAcceptGitlabEvent(
  normalized: NormalizedGitlabEvent,
  triggerConfig: GitlabTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const configuredEventTypes = eventTypesList(triggerConfig.eventTypes);
  if (configuredEventTypes.length && !configuredEventTypes.includes(normalized.eventType.toLowerCase())) {
    return { accepted: false, reason: `Ignored GitLab event type "${normalized.eventType}" not in the configured event types.` };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query && !normalized.text.toLowerCase().includes(query)) {
    return { accepted: false, reason: 'Ignored GitLab event not matching the configured query filter.' };
  }

  return { accepted: true };
}

export function buildGitlabExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedGitlabEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'gitlab',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `gitlab_${input.workflowId}_${input.normalized.eventId}`,
    _gitlab: true,
  };
}

export async function validateGitlabWebhookSecret(
  workflowId: string,
  nodeId: string,
  headerToken: string,
): Promise<boolean> {
  const state = await getWebhookState(workflowId, nodeId);
  if (!state) return false;
  return validateGitlabToken(headerToken, state.secret);
}

export async function registerGitlabWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  baseUrl?: string;
  projectId: string;
  eventTypes?: string | string[];
}): Promise<{ success: true; webhookUrl: string; projectId: string; hookId: string; baseUrl: string }> {
  const projectId = asString(input.projectId);
  if (!projectId) {
    throw Object.assign(new Error('A GitLab project ID (or URL-encoded path) is required.'), { statusCode: 400 });
  }
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const token = await resolveGitlabToken(input.userId);
  const webhookUrl = getGitlabWebhookUrl(input.workflowId, input.nodeId);

  const existing = await getWebhookState(input.workflowId, input.nodeId);
  const secret = existing?.secret || randomUUID();

  const events = eventTypesList(input.eventTypes);
  const resolvedEvents = events.length ? events : DEFAULT_EVENT_TYPES;

  // If a webhook already exists for this node, remove it first so re-saving the
  // workflow doesn't leave duplicate GitLab webhooks on the same project.
  if (existing?.hookId && existing.projectId === projectId && existing.baseUrl === baseUrl) {
    await gitlabApiFetch(token, baseUrl, `/projects/${encodeURIComponent(projectId)}/hooks/${encodeURIComponent(existing.hookId)}`, {
      method: 'DELETE',
    }).catch((error) => {
      logger.warn('[GitLab Trigger] Failed to remove previous webhook before re-registering (continuing):', error);
    });
  }

  const hookFlags: Record<string, boolean> = {};
  for (const [eventType, field] of Object.entries(EVENT_TYPE_TO_HOOK_FIELD)) {
    hookFlags[field] = resolvedEvents.includes(eventType);
  }

  const response = await gitlabApiFetch(token, baseUrl, `/projects/${encodeURIComponent(projectId)}/hooks`, {
    method: 'POST',
    body: JSON.stringify({
      url: webhookUrl,
      token: secret,
      enable_ssl_verification: true,
      ...hookFlags,
    }),
  });

  const hookId = response?.id !== undefined && response?.id !== null ? String(response.id) : '';

  await setWebhookState({
    projectId,
    baseUrl,
    hookId,
    secret,
    userId: input.userId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return { success: true, webhookUrl, projectId, hookId, baseUrl };
}

export async function unregisterGitlabWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
}): Promise<{ success: true }> {
  const state = await getWebhookState(input.workflowId, input.nodeId);
  if (state?.hookId) {
    const token = await resolveGitlabToken(input.userId).catch(() => null);
    if (token) {
      await gitlabApiFetch(
        token,
        state.baseUrl,
        `/projects/${encodeURIComponent(state.projectId)}/hooks/${encodeURIComponent(state.hookId)}`,
        { method: 'DELETE' },
      ).catch((error) => {
        logger.warn('[GitLab Trigger] Webhook delete failed (continuing to clear local state):', error);
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

function nodeConfigOf(node: any): GitlabTriggerConfig {
  return (node?.data?.config || node?.config || {}) as GitlabTriggerConfig;
}

export async function autoRegisterGitlabWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<GitlabWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'gitlab_trigger');
  const results: GitlabWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    const projectId = asString(triggerConfig.projectId);
    if (!projectId) {
      results.push({ nodeId, success: false, error: 'A GitLab Project ID is required (set it on the GitLab Trigger node).' });
      continue;
    }
    try {
      const result = await registerGitlabWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        baseUrl: triggerConfig.baseUrl,
        projectId,
        eventTypes: triggerConfig.eventTypes,
      });
      results.push({ nodeId, success: true, webhookUrl: result.webhookUrl, projectId: result.projectId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[GitLab Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export { getWebhookState as getGitlabWebhookState };
