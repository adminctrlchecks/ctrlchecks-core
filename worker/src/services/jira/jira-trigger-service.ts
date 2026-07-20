import { randomUUID, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import { retrieveCredential } from '../../core/utils/credential-retriever';
import { getRedisClient } from '../../shared/redis-client';

/**
 * Jira Cloud issue/comment event trigger (issue created/updated/deleted,
 * comment created/updated/deleted, plus a generic fallback for other webhook events).
 *
 * Credential model: reuses the existing `jira_api_key` credential type (Basic Auth —
 * Atlassian account email + API token, resolved against a site domain), the same
 * credential already used by the pre-existing `jira` action node. This is NOT OAuth2 —
 * Jira Cloud's simplest, most common self-service auth model is an API token generated
 * at https://id.atlassian.com/manage-profile/security/api-tokens, sent as
 * `Authorization: Basic base64(email:apiToken)`.
 *
 * Webhook registration model — explicitly MANUAL, not automatic-by-API:
 * Jira Cloud's REST webhook registration endpoint (`POST /rest/api/3/webhook`, the
 * "dynamic webhooks" API) is scoped to Connect apps and OAuth 2.0 (3LO) apps — Atlassian's
 * own docs describe it as an operation "for apps" and point OAuth 2.0 (3LO) apps at the
 * same dynamic-webhooks operations. A plain Basic-Auth API-token user credential (the
 * `jira_api_key` credential type used here) cannot call that endpoint on its own behalf.
 * Because of that, this trigger follows the same manual-setup pattern already used for
 * Slack/Discord/Microsoft Teams: it generates the exact webhook URL (with a per-node
 * secret embedded as a query parameter) and returns `manualSetupRequired: true`. The user
 * (a Jira site admin) must paste that URL into Jira's own webhook UI — either the global
 * "System > WebHooks" admin page (System WebHooks, available to Jira admins) or a
 * project-level "Automation for Jira" rule using the "Send web request" action (available
 * to project admins without full site-admin rights). Do not assume automatic self-service
 * registration works for this credential model.
 *
 * Webhook validation — explicitly NOT HMAC/JWT: Jira webhook payloads carry no signature
 * of any kind. The practical, widely-used validation approach (and the one implemented
 * here) is a per-node secret embedded directly in the webhook URL itself, either as a
 * `?secret=...` query parameter (works with Jira's built-in WebHooks admin page, which
 * only accepts a URL — no custom headers) or, for setups that do support custom headers
 * (e.g. an Automation for Jira "Send web request" action), an `X-Jira-Webhook-Secret`
 * header. Validation is a constant-time string compare against the stored secret.
 */

export type JiraEventType =
  | 'jira:issue_created'
  | 'jira:issue_updated'
  | 'jira:issue_deleted'
  | 'comment_created'
  | 'comment_updated'
  | 'comment_deleted'
  | string;

export type NormalizedJiraEvent = {
  eventId: string;
  eventType: string;
  source: 'jira';
  userId: string | null;
  username: string | null;
  text: string;
  timestamp: string;
  siteUrl: string | null;
  cloudId: string | null;
  issueKey: string | null;
  issueId: string | null;
  issueSummary: string | null;
  issueUrl: string | null;
  issueType: string | null;
  issueStatus: string | null;
  projectKey: string | null;
  commentBody: string | null;
  commentUrl: string | null;
  raw: unknown;
};

export type JiraTriggerConfig = {
  connectionId?: string;
  siteUrl?: string;
  projectKey?: string;
  eventTypes?: string | string[];
  secretToken?: string;
  jql?: string;
  query?: string;
};

export type JiraWebhookRegistrationStatus = {
  nodeId: string;
  success: boolean;
  webhookUrl?: string;
  siteUrl?: string;
  projectKey?: string;
  manualSetupRequired?: boolean;
  verifiedConnection?: boolean;
  error?: string;
};

type JiraWebhookState = {
  siteUrl: string;
  projectKey: string;
  secret: string;
  userId: string;
  workflowId: string;
  nodeId: string;
};

// Jira webhooks configured via the admin UI / Automation for Jira do not expire — no
// renewal scheduler is needed. Keep state around indefinitely (mirrors GitLab/GitHub).
const STATE_TTL_SECONDS = 365 * 24 * 60 * 60;

const DEFAULT_EVENT_TYPES = ['jira:issue_created', 'jira:issue_updated', 'comment_created'];

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function header(req: Request, name: string): string {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : asString(value);
}

function queryParam(req: Request, name: string): string {
  const value = (req.query || {})[name];
  return Array.isArray(value) ? asString(value[0]) : asString(value);
}

function timingEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeSiteUrl(siteUrl: string | undefined): string {
  const trimmed = asString(siteUrl);
  if (!trimmed) return '';
  const withScheme = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, '');
}

function stateKey(workflowId: string, nodeId: string): string {
  return `jira:webhook:${workflowId}:${nodeId}`;
}

async function getWebhookState(workflowId: string, nodeId: string): Promise<JiraWebhookState | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(stateKey(workflowId, nodeId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JiraWebhookState;
  } catch {
    return null;
  }
}

async function setWebhookState(state: JiraWebhookState): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(stateKey(state.workflowId, state.nodeId), JSON.stringify(state), 'EX', STATE_TTL_SECONDS);
}

async function deleteWebhookState(workflowId: string, nodeId: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(stateKey(workflowId, nodeId));
}

/**
 * Builds the webhook URL for a Jira Trigger node, with the per-node secret embedded as a
 * `secret` query parameter. Jira's built-in WebHooks admin page only accepts a plain URL
 * (no custom header configuration), so the secret must travel in the URL itself for that
 * setup path to work; an `X-Jira-Webhook-Secret` header is also accepted for setups that
 * do support custom headers (e.g. Automation for Jira).
 */
export function getJiraWebhookUrl(workflowId: string, nodeId: string, secret?: string): string {
  const baseUrl = String(config.publicBaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is required to register Jira webhooks.');
  const path = `${baseUrl}/api/jira/webhook/${encodeURIComponent(workflowId)}/${encodeURIComponent(nodeId)}`;
  return secret ? `${path}?secret=${encodeURIComponent(secret)}` : path;
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

export type ResolvedJiraCredential = { email: string; apiToken: string; siteUrl: string };

// Reuses the existing `jira_api_key` credential (Basic Auth: email + API token + domain)
// already mapped to the `jira` action node, rather than introducing a parallel credential
// shape for the trigger. Falls back to the legacy `jira` vault key for older connections.
export async function resolveJiraCredential(userId: string, configuredSiteUrl?: string): Promise<ResolvedJiraCredential> {
  for (const key of ['jira_api_key', 'jira']) {
    const stored = await retrieveCredential({ userId }, key).catch(() => null);
    if (!stored) continue;
    const parsed = parseCredentialValue(stored);
    const email = asString(parsed.username) || asString(parsed.email);
    const apiToken = asString(parsed.password) || asString(parsed.apiToken) || asString(parsed.token);
    const domain = asString(parsed.domain) || asString(parsed.baseUrl) || asString(configuredSiteUrl);
    if (email && apiToken && domain) {
      return { email, apiToken, siteUrl: normalizeSiteUrl(domain) };
    }
  }
  throw new Error('No active Jira connection found. Save your Jira email + API token in Connections first.');
}

async function verifyJiraAuth(credential: ResolvedJiraCredential): Promise<boolean> {
  const auth = Buffer.from(`${credential.email}:${credential.apiToken}`).toString('base64');
  const response = await fetch(`${credential.siteUrl}/rest/api/3/myself`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Jira credential verification failed (${response.status}): ${response.statusText}`);
  }
  return true;
}

export function validateJiraSecret(provided: string, secret: string): boolean {
  if (!provided || !secret) return false;
  return timingEqualString(provided, secret);
}

export function getJiraSecretFromRequest(req: Request): string {
  return header(req, 'x-jira-webhook-secret') || queryParam(req, 'secret');
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

function extractSiteUrlFromSelf(selfUrl: string): string | null {
  const trimmed = asString(selfUrl);
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Normalizes a Jira Cloud webhook delivery into a common event shape, keyed off the
 * payload's `webhookEvent` field (e.g. `jira:issue_created`, `comment_created`).
 * Returns null only when the payload has no recognizable `webhookEvent` at all.
 */
export function normalizeJiraEvent(payload: any): NormalizedJiraEvent | null {
  const webhookEvent = asString(payload?.webhookEvent);
  if (!webhookEvent) return null;

  const issue = payload?.issue || {};
  const fields = issue?.fields || {};
  const issueKey = asString(issue?.key) || null;
  const issueId = issue?.id !== undefined && issue?.id !== null ? String(issue.id) : null;
  const issueSummary = asString(fields?.summary) || null;
  const issueType = asString(fields?.issuetype?.name) || null;
  const issueStatus = asString(fields?.status?.name) || null;
  const projectKey = asString(fields?.project?.key) || null;

  const siteUrl = extractSiteUrlFromSelf(asString(issue?.self)) || extractSiteUrlFromSelf(asString(payload?.comment?.self));
  const issueUrl = siteUrl && issueKey ? `${siteUrl}/browse/${issueKey}` : null;

  const comment = payload?.comment || {};
  const commentAuthor = comment?.author || payload?.user || {};
  const commentBody = typeof comment?.body === 'string'
    ? comment.body
    : (comment?.body ? JSON.stringify(comment.body) : null);
  const commentUrl = asString(comment?.self) || null;

  const eventUser = payload?.user || commentAuthor || {};
  const userId = asString(eventUser?.accountId) || null;
  const username = asString(eventUser?.displayName) || asString(eventUser?.emailAddress) || null;

  const timestampMs = typeof payload?.timestamp === 'number' ? payload.timestamp : Date.now();
  const timestamp = new Date(timestampMs).toISOString();

  const base = {
    eventId: randomUUID(),
    eventType: webhookEvent,
    source: 'jira' as const,
    userId,
    username,
    timestamp,
    siteUrl,
    cloudId: null as string | null,
    issueKey,
    issueId,
    issueSummary,
    issueUrl,
    issueType,
    issueStatus,
    projectKey,
    commentBody: null as string | null,
    commentUrl: null as string | null,
    raw: payload,
  };

  switch (webhookEvent) {
    case 'jira:issue_created':
      return { ...base, eventId: issueId || base.eventId, text: issueSummary || `Issue ${issueKey || ''} created` };
    case 'jira:issue_updated':
      return { ...base, eventId: issueId || base.eventId, text: issueSummary || `Issue ${issueKey || ''} updated` };
    case 'jira:issue_deleted':
      return { ...base, eventId: issueId || base.eventId, text: issueSummary || `Issue ${issueKey || ''} deleted` };
    case 'comment_created':
    case 'comment_updated':
    case 'comment_deleted':
      return {
        ...base,
        eventId: asString(comment?.id) || base.eventId,
        commentBody,
        commentUrl,
        text: commentBody || `Comment ${webhookEvent.replace('comment_', '')} on ${issueKey || 'issue'}`,
      };
    default:
      // Generic fallback for any other Jira webhook event kind (e.g. worklog_*,
      // sprint_*, board_*, project_*) — still returns a normalized envelope with the
      // shared base fields so downstream nodes can consume $json predictably.
      return {
        ...base,
        text: issueSummary || `${webhookEvent} event${projectKey ? ` on ${projectKey}` : ''}`,
      };
  }
}

export function shouldAcceptJiraEvent(
  normalized: NormalizedJiraEvent,
  triggerConfig: JiraTriggerConfig,
): { accepted: true } | { accepted: false; reason: string } {
  const configuredEventTypes = eventTypesList(triggerConfig.eventTypes);
  if (configuredEventTypes.length && !configuredEventTypes.includes(normalized.eventType.toLowerCase())) {
    return { accepted: false, reason: `Ignored Jira event type "${normalized.eventType}" not in the configured event types.` };
  }

  const configuredProjectKey = asString(triggerConfig.projectKey).toUpperCase();
  if (configuredProjectKey && normalized.projectKey && normalized.projectKey.toUpperCase() !== configuredProjectKey) {
    return { accepted: false, reason: `Ignored Jira event for project "${normalized.projectKey}", trigger is scoped to "${configuredProjectKey}".` };
  }

  const query = asString(triggerConfig.query).toLowerCase();
  if (query && !normalized.text.toLowerCase().includes(query)) {
    return { accepted: false, reason: 'Ignored Jira event not matching the configured query filter.' };
  }

  return { accepted: true };
}

export function buildJiraExecutionInput(input: {
  workflowId: string;
  nodeId: string;
  normalized: NormalizedJiraEvent;
}): Record<string, unknown> {
  return {
    ...input.normalized,
    trigger: 'jira',
    workflow_id: input.workflowId,
    node_id: input.nodeId,
    sessionId: `jira_${input.workflowId}_${input.normalized.eventId}`,
    _jira: true,
  };
}

export async function validateJiraWebhookSecret(
  workflowId: string,
  nodeId: string,
  provided: string,
): Promise<boolean> {
  const state = await getWebhookState(workflowId, nodeId);
  if (!state) return false;
  return validateJiraSecret(provided, state.secret);
}

/**
 * Generates (or reuses) the webhook URL + secret for a Jira Trigger node and stores that
 * state in Redis. Does NOT call any Jira API to register a webhook — Jira Cloud's dynamic
 * webhooks REST endpoint is restricted to Connect/OAuth-2.0-app credentials, which the
 * `jira_api_key` Basic Auth credential used here is not. The caller (a Jira site admin)
 * must paste the returned `webhookUrl` into Jira's own webhook UI. Optionally verifies the
 * saved Jira credential works by calling `GET /rest/api/3/myself`.
 */
export async function registerJiraWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  siteUrl?: string;
  projectKey?: string;
  secretToken?: string;
}): Promise<{
  success: true;
  webhookUrl: string;
  siteUrl: string;
  projectKey: string;
  manualSetupRequired: true;
  verifiedConnection: boolean;
}> {
  const credential = await resolveJiraCredential(input.userId, input.siteUrl);
  const verifiedConnection = await verifyJiraAuth(credential).then(() => true).catch((error) => {
    logger.warn('[Jira Trigger] Unable to verify Jira connection during registration:', error);
    return false;
  });

  const existing = await getWebhookState(input.workflowId, input.nodeId);
  const secret = asString(input.secretToken) || existing?.secret || randomUUID();
  const projectKey = asString(input.projectKey).toUpperCase();

  await setWebhookState({
    siteUrl: credential.siteUrl,
    projectKey,
    secret,
    userId: input.userId,
    workflowId: input.workflowId,
    nodeId: input.nodeId,
  });

  return {
    success: true,
    webhookUrl: getJiraWebhookUrl(input.workflowId, input.nodeId, secret),
    siteUrl: credential.siteUrl,
    projectKey,
    manualSetupRequired: true,
    verifiedConnection,
  };
}

export async function unregisterJiraWebhook(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
}): Promise<{ success: true; manualSetupRequired: true }> {
  // Nothing was registered against the Jira API (manual setup), so unregistering only
  // clears local state — same as Slack/Discord/Teams. The user must remove the webhook
  // from Jira's own admin UI if they no longer want deliveries.
  await deleteWebhookState(input.workflowId, input.nodeId);
  return { success: true, manualSetupRequired: true };
}

function workflowNodes(workflow: any): any[] {
  const candidates = [workflow?.nodes, workflow?.graph?.nodes, workflow?.definition?.nodes, workflow?.definition?.graph?.nodes];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): JiraTriggerConfig {
  return (node?.data?.config || node?.config || {}) as JiraTriggerConfig;
}

export async function autoRegisterJiraWebhooksForWorkflow(input: {
  userId: string;
  workflow: any;
}): Promise<JiraWebhookRegistrationStatus[]> {
  if (!input.workflow || input.workflow.status !== 'active') return [];
  const workflowId = asString(input.workflow.id);
  if (!workflowId) return [];
  const triggers = workflowNodes(input.workflow).filter((node) => nodeTypeOf(node) === 'jira_trigger');
  const results: JiraWebhookRegistrationStatus[] = [];

  for (const node of triggers) {
    const nodeId = asString(node?.id);
    if (!nodeId) continue;
    const triggerConfig = nodeConfigOf(node);
    try {
      const result = await registerJiraWebhook({
        userId: input.userId,
        workflowId,
        nodeId,
        siteUrl: triggerConfig.siteUrl,
        projectKey: triggerConfig.projectKey,
        secretToken: triggerConfig.secretToken,
      });
      results.push({
        nodeId,
        success: true,
        webhookUrl: result.webhookUrl,
        siteUrl: result.siteUrl,
        projectKey: result.projectKey,
        manualSetupRequired: result.manualSetupRequired,
        verifiedConnection: result.verifiedConnection,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Jira Trigger] Auto webhook registration failed:', { workflowId, nodeId, error: message });
      results.push({ nodeId, success: false, error: message });
    }
  }

  return results;
}

export { getWebhookState as getJiraWebhookState };
