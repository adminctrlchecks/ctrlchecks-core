import { Request, Response } from 'express';
import { config } from '../core/config';
import { getDbClient } from '../core/database/aws-db-client';
import { normalizeExecutionStatus, normalizeExecutionTrigger } from '../core/execution/execution-db-enums';
import { logger } from '../core/logger';
import {
  buildDiscordExecutionInput,
  getDiscordWebhookUrl,
  isDiscordInteractionPing,
  isDiscordWebhookEventPayload,
  isDiscordWebhookEventPing,
  normalizeDiscordWebhookPayload,
  registerDiscordWebhook,
  shouldAcceptDiscordEvent,
  unregisterDiscordWebhook,
  validateDiscordSignature,
  type DiscordTriggerConfig,
  type NormalizedDiscordEvent,
} from '../services/discord/discord-trigger-service';

function getAuthenticatedUserId(req: Request): string {
  const id = (req as any).user?.id || req.body?.userId || req.query.user_id;
  if (!id || typeof id !== 'string') throw Object.assign(new Error('Authenticated user is required'), { statusCode: 401 });
  return id;
}

function nodeTypeOf(node: any): string {
  return String(node?.data?.type || node?.type || '').trim();
}

function nodeConfigOf(node: any): Record<string, unknown> {
  return (node?.data?.config || node?.config || {}) as Record<string, unknown>;
}

function workflowNodes(workflow: any): any[] {
  const candidates = [
    workflow?.nodes,
    workflow?.graph?.nodes,
    workflow?.definition?.nodes,
    workflow?.definition?.graph?.nodes,
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

async function loadWorkflow(workflowId: string) {
  const db = getDbClient();
  const { data: workflow, error } = await db
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();
  if (error || !workflow) {
    throw Object.assign(new Error('Workflow not found'), { statusCode: 404 });
  }
  const { isSetupPending } = await import('./workflow-setup-lifecycle');
  if (isSetupPending(workflow)) {
    throw Object.assign(new Error('Workflow not found'), { statusCode: 404 });
  }
  return workflow;
}

function findDiscordTriggerNode(workflow: any, nodeId: string): any {
  const node = workflowNodes(workflow).find((candidate) => String(candidate?.id || '') === nodeId);
  if (!node || nodeTypeOf(node) !== 'discord_trigger') {
    throw Object.assign(new Error('Discord Trigger node not found in this workflow.'), { statusCode: 404 });
  }
  return node;
}

function connectionIdOf(node: any, triggerConfig: DiscordTriggerConfig): string {
  const refs = {
    ...((node?.data?.connectionRefs || {}) as Record<string, unknown>),
    ...((node?.connectionRefs || {}) as Record<string, unknown>),
    ...(((triggerConfig as any).connectionRefs || {}) as Record<string, unknown>),
  };
  return String(
    triggerConfig.connectionId
      || (node?.data as any)?.connectionId
      || node?.connectionId
      || refs.discord_bot_token
      || refs.discord
      || '',
  );
}

async function markExecutionFailed(db: any, executionId: string, message: string) {
  await db.from('executions').update({
    status: normalizeExecutionStatus('failed'),
    finished_at: new Date().toISOString(),
    error: message.slice(0, 1000),
  }).eq('id', executionId);
}

async function startWorkflowExecution(input: {
  workflow: any;
  workflowId: string;
  nodeId: string;
  executionInput: Record<string, unknown>;
}) {
  const db = getDbClient();
  const startedAt = new Date().toISOString();
  const { data: execution, error } = await db
    .from('executions')
    .insert({
      workflow_id: input.workflowId,
      user_id: input.workflow.user_id,
      status: normalizeExecutionStatus('running'),
      trigger: normalizeExecutionTrigger('discord', 'webhook'),
      input: input.executionInput,
      logs: [],
      started_at: startedAt,
      metadata: {
        originalTrigger: 'discord',
        triggerNodeId: input.nodeId,
      },
    })
    .select()
    .single();

  if (error || !execution) {
    logger.error('[Discord Trigger] Execution creation error:', error);
    throw Object.assign(new Error('Failed to create workflow execution.'), { statusCode: 500 });
  }

  const executeUrl = config.publicBaseUrl
    ? `${String(config.publicBaseUrl).replace(/\/+$/, '')}/api/execute-workflow`
    : null;

  if (!executeUrl) {
    const message = 'PUBLIC_BASE_URL is required to execute Discord-triggered workflows.';
    await markExecutionFailed(db, execution.id, message);
    throw Object.assign(new Error(message), { statusCode: 500 });
  }

  fetch(executeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Discord-Execution': 'true',
      'X-Internal-Trigger-Execution': 'true',
    },
    body: JSON.stringify({
      workflowId: input.workflowId,
      executionId: execution.id,
      input: input.executionInput,
    }),
  }).then(async (response) => {
    if (response.ok) return;
    const details = await response.text().catch(() => '');
    const message = `Discord trigger handoff failed (${response.status}): ${details || response.statusText}`;
    logger.error('[Discord Trigger] Error triggering workflow execution:', message);
    await markExecutionFailed(db, execution.id, message);
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[Discord Trigger] Error triggering workflow execution:', err);
    await markExecutionFailed(db, execution.id, `Discord trigger handoff failed: ${message}`);
  });

  return execution;
}

function hasInteractionResponse(events: NormalizedDiscordEvent[]): boolean {
  return events.some((event) => Boolean(event.interactionToken) || event.eventType === 'slash_command' || event.eventType.startsWith('interaction.'));
}

export async function discordWebhookInfoHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }
    await loadWorkflow(workflowId).then((workflow) => findDiscordTriggerNode(workflow, nodeId));
    return res.json({
      success: true,
      webhookUrl: getDiscordWebhookUrl(workflowId, nodeId),
      message: 'Use this URL for Discord Interactions Endpoint URL and Webhook Events URL.',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function discordWebhookHandler(req: Request, res: Response) {
  try {
    const workflowId = String(req.params.workflowId || '');
    const nodeId = String(req.params.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }

    const workflow = await loadWorkflow(workflowId);
    const node = findDiscordTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as DiscordTriggerConfig;
    const connectionId = connectionIdOf(node, triggerConfig);

    if (!await validateDiscordSignature(req, { userId: workflow.user_id, connectionId, triggerConfig })) {
      return res.status(401).json({ error: 'Invalid Discord request signature.' });
    }

    if (isDiscordInteractionPing(req.body)) {
      return res.status(200).json({ type: 1 });
    }

    if (isDiscordWebhookEventPing(req.body)) {
      return res.status(204).end();
    }

    if (workflow.status !== 'active') {
      return res.status(400).json({ error: 'Workflow is not active.' });
    }

    const normalizedEvents = normalizeDiscordWebhookPayload(req.body || {});
    const acceptedEvents = normalizedEvents.filter((event) => shouldAcceptDiscordEvent(event, triggerConfig).accepted);

    if (acceptedEvents.length === 0) {
      if (hasInteractionResponse(normalizedEvents)) {
        return res.status(200).json({
          type: 4,
          data: {
            content: 'No matching CtrlChecks workflow trigger is active for this Discord event.',
            flags: 64,
          },
        });
      }
      return isDiscordWebhookEventPayload(req.body)
        ? res.status(204).end()
        : res.json({
            success: true,
            ignored: true,
            receivedEvents: normalizedEvents.length,
            message: 'Discord webhook received, no events matched this trigger.',
          });
    }

    const executions = [];
    for (const normalized of acceptedEvents) {
      const executionInput = buildDiscordExecutionInput({ workflowId, nodeId, normalized });
      const execution = await startWorkflowExecution({ workflow, workflowId, nodeId, executionInput });
      executions.push(execution);
    }

    if (hasInteractionResponse(acceptedEvents)) {
      return res.status(200).json({ type: 5 });
    }

    if (isDiscordWebhookEventPayload(req.body)) {
      return res.status(204).end();
    }

    return res.json({
      success: true,
      executionIds: executions.map((execution) => execution.id),
      status: 'running',
      message: 'Discord webhook received, workflow execution started.',
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Discord Trigger] Webhook error:', error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function discordRegisterWebhookHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workflowId = String(req.body?.workflowId || '');
    const nodeId = String(req.body?.nodeId || '');
    if (!workflowId || !nodeId) {
      return res.status(400).json({ error: 'workflowId and nodeId are required.' });
    }

    const workflow = await loadWorkflow(workflowId);
    if (workflow.user_id && workflow.user_id !== userId) {
      return res.status(403).json({ error: 'You do not have access to this workflow.' });
    }

    const node = findDiscordTriggerNode(workflow, nodeId);
    const triggerConfig = nodeConfigOf(node) as DiscordTriggerConfig;
    const result = await registerDiscordWebhook({
      userId,
      workflowId,
      nodeId,
      connectionId: String(req.body?.connectionId || triggerConfig.connectionId || ''),
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}

export async function discordUnregisterWebhookHandler(req: Request, res: Response) {
  try {
    const userId = getAuthenticatedUserId(req);
    const result = await unregisterDiscordWebhook({
      userId,
      connectionId: String(req.body?.connectionId || ''),
    });
    return res.json(result);
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({ error: message });
  }
}
