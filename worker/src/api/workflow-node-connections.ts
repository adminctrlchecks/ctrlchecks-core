import { Response } from 'express';
import type { AuthenticatedRequest } from '../core/middleware/subscription-auth';
import {
  deleteWorkflowNodeConnectionBinding,
  listWorkflowNodeConnectionBindings,
  upsertWorkflowNodeConnectionBinding,
} from '../services/workflow-node-connections';

function currentUserId(req: AuthenticatedRequest): string {
  const userId = req.user?.id;
  if (!userId) throw new Error('Authentication required');
  return userId;
}

function errorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Authentication')) return 401;
  if (message.includes('not found')) return 404;
  if (message.includes('mismatch')) return 400;
  return 500;
}

function errorPayload(error: unknown) {
  return {
    error: error instanceof Error ? error.message : String(error),
  };
}

export async function listWorkflowNodeConnectionsHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const bindings = await listWorkflowNodeConnectionBindings(
      currentUserId(req),
      req.params.workflowId,
    );
    res.json({ bindings });
  } catch (error) {
    res.status(errorStatus(error)).json(errorPayload(error));
  }
}

export async function upsertWorkflowNodeConnectionHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const binding = await upsertWorkflowNodeConnectionBinding({
      userId: currentUserId(req),
      workflowId: req.params.workflowId,
      nodeId: req.params.nodeId,
      nodeType: String(req.body.nodeType || ''),
      provider: String(req.body.provider || ''),
      credentialTypeId: typeof req.body.credentialTypeId === 'string'
        ? req.body.credentialTypeId
        : null,
      connectionId: String(req.body.connectionId || ''),
      role: typeof req.body.role === 'string' ? req.body.role : 'primary',
      metadata: req.body.metadata && typeof req.body.metadata === 'object'
        ? req.body.metadata
        : {},
    });
    res.json({ binding });
  } catch (error) {
    res.status(errorStatus(error)).json(errorPayload(error));
  }
}

export async function deleteWorkflowNodeConnectionHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    await deleteWorkflowNodeConnectionBinding({
      userId: currentUserId(req),
      workflowId: req.params.workflowId,
      nodeId: req.params.nodeId,
      provider: String(req.query.provider || req.body?.provider || ''),
      role: String(req.query.role || req.body?.role || 'primary'),
    });
    res.status(204).send();
  } catch (error) {
    res.status(errorStatus(error)).json(errorPayload(error));
  }
}
