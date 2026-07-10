import { Request, Response } from 'express';
import { getDbClient } from '../core/database/aws-db-client';
import { config } from '../core/config';
import { logger } from '../core/logger';
import type { AuthenticatedRequest } from '../core/middleware/subscription-auth';
import { recordAuditEvent } from '../core/audit/audit-log-service';
import {
  getNodeApprovalById,
  listPendingApprovalsForUser,
  resolveNodeApproval,
} from '../services/execution/node-approval-service';

/** GET /api/execution-node-approvals — list the current user's pending approvals. */
export async function listApprovals(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    }
    const approvals = await listPendingApprovalsForUser(req.user.id);
    return res.json({ success: true, approvals });
  } catch (error: any) {
    logger.error('[NodeApproval] Failed to list approvals:', error);
    return res.status(500).json({ error: 'Failed to list approvals', message: error?.message });
  }
}

/** POST /api/execution-node-approvals/:id/respond — approve or reject a pending node approval. */
export async function respondToApproval(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    }

    const { id } = req.params;
    const { approved, reason } = req.body as { approved?: boolean; reason?: string };
    if (approved === undefined) {
      return res.status(400).json({ error: 'approved (boolean) is required' });
    }

    const approval = await getNodeApprovalById(id);
    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    if (approval.user_id !== req.user.id && req.user.role !== 'admin') {
      logger.warn(`[NodeApproval] 🚫 Ownership check failed - user ${req.user.id} attempted to respond to approval ${id} owned by ${approval.user_id}`);
      return res.status(403).json({ error: 'Forbidden', code: 'NOT_APPROVAL_OWNER' });
    }

    if (approval.status !== 'pending') {
      return res.status(409).json({ error: `Approval already ${approval.status}`, status: approval.status });
    }

    const updated = await resolveNodeApproval(id, approved, req.user.id, reason);

    recordAuditEvent({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: approved ? 'workflow.node_approval.approved' : 'workflow.node_approval.rejected',
      resourceType: 'workflow_node',
      resourceId: updated.node_id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { executionId: updated.execution_id, workflowId: updated.workflow_id, reason },
    });

    if (!approved) {
      const db = getDbClient();
      await db.from('executions').update({
        status: 'failed',
        error: `Rejected by ${req.user.email} at ${new Date().toISOString()}${reason ? `: ${reason}` : ''}`,
      }).eq('id', updated.execution_id);

      return res.json({ success: true, status: 'rejected', approval: updated });
    }

    // Approved — resume the paused execution from the same node, mirroring form-trigger.ts's resume call.
    const db = getDbClient();
    const { data: execution, error: execError } = await db
      .from('executions')
      .select('*')
      .eq('id', updated.execution_id)
      .single();

    if (execError || !execution) {
      logger.error('[NodeApproval] Could not load execution to resume:', execError);
      return res.status(500).json({ error: 'Approved, but failed to load execution to resume', details: execError?.message });
    }

    await db.from('executions').update({ status: 'running', waiting_for_node_id: null }).eq('id', updated.execution_id);

    const executeUrl = `${config.publicBaseUrl}/api/execute-workflow`;
    fetch(executeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Approval-Execution': 'true',
      },
      body: JSON.stringify({
        workflowId: updated.workflow_id,
        executionId: updated.execution_id,
        input: execution.input || {},
      }),
    }).catch((err) => {
      logger.error('[NodeApproval] Failed to resume workflow execution:', err);
    });

    return res.json({ success: true, status: 'approved', approval: updated });
  } catch (error: any) {
    logger.error('[NodeApproval] Failed to respond to approval:', error);
    return res.status(500).json({ error: 'Internal server error', message: error?.message });
  }
}
