import { getDbClient } from '../../core/database/aws-db-client';
import { sendExecutionCompleted, sendExecutionFailed, sendApprovalNeeded } from './email-service';
import { sendInAppExecutionCompleted, sendInAppExecutionFailed, sendInAppApprovalNeeded } from '../in-app-service';

interface DispatchParams {
  userId: string;
  workflowId: string;
  executionId: string;
  succeeded: boolean;
  error?: string;
}

/**
 * Fire-and-forget execution completion notifications via email + in-app.
 * Resolves workflow name from DB; never throws (notifications are best-effort).
 * Shared by execution-job-runner.ts and execute-workflow.ts.
 */
export function dispatchExecutionNotifications(params: DispatchParams): void {
  const { userId, workflowId, executionId, succeeded, error } = params;
  setImmediate(async () => {
    try {
      const db = await getDbClient();
      const { data: wfRow } = await db
        .from('workflows')
        .select('name')
        .eq('id', workflowId)
        .single();
      const workflowName = (wfRow as any)?.name ?? workflowId;
      if (succeeded) {
        await sendExecutionCompleted(userId, workflowName, executionId);
        await sendInAppExecutionCompleted(userId, workflowName, executionId);
      } else {
        await sendExecutionFailed(userId, workflowName, error ?? 'Unknown error');
        await sendInAppExecutionFailed(userId, workflowName, error ?? 'Unknown error');
      }
    } catch {
      // notifications are best-effort — never let errors surface
    }
  });
}

interface ApprovalNeededParams {
  workflowId: string;
  executionId: string;
  nodeId: string;
  approvalId: string;
  preview: Record<string, unknown>;
}

/**
 * Fire-and-forget "a workflow step needs your approval" notification via email + in-app.
 * Called from the approval gate in execute-workflow.ts when a node pauses for approval.
 */
export function sendApprovalNeededNotification(userId: string, params: ApprovalNeededParams): void {
  const { workflowId, executionId, approvalId } = params;
  setImmediate(async () => {
    try {
      const db = await getDbClient();
      const { data: wfRow } = await db
        .from('workflows')
        .select('name')
        .eq('id', workflowId)
        .single();
      const workflowName = (wfRow as any)?.name ?? workflowId;
      await sendApprovalNeeded(userId, workflowName, executionId, approvalId);
      await sendInAppApprovalNeeded(userId, workflowName, approvalId);
    } catch {
      // notifications are best-effort — never let errors surface
    }
  });
}
