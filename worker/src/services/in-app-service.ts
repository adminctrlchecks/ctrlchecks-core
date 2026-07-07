/**
 * In-app notification helpers for the worker.
 *
 * Delegates to notification-service via sendInAppRemote() when the user's
 * userId falls within the canary percent. Fire-and-forget only — never awaited
 * in the hot path, never throws.
 *
 * Phase 3: wired into execution-job-runner.ts alongside email-service.ts.
 */

import { shouldUseNotificationService, sendInAppRemote } from './notification-service-client';

export async function sendInAppExecutionCompleted(
  userId: string,
  workflowName: string,
  executionId: string,
): Promise<void> {
  if (!shouldUseNotificationService(userId)) return;
  await sendInAppRemote(userId, {
    title: `Workflow "${workflowName}" completed`,
    message: `Execution ${executionId} completed successfully.`,
    type: 'execution_completed',
    link: `/executions/${executionId}`,
  }).catch(() => { /* fire-and-forget */ });
}

export async function sendInAppExecutionFailed(
  userId: string,
  workflowName: string,
  error: string,
): Promise<void> {
  if (!shouldUseNotificationService(userId)) return;
  await sendInAppRemote(userId, {
    title: `Workflow "${workflowName}" failed`,
    message: error.slice(0, 200),
    type: 'execution_failed',
    link: null,
  }).catch(() => { /* fire-and-forget */ });
}

export async function sendInAppApprovalNeeded(
  userId: string,
  workflowName: string,
  approvalId: string,
): Promise<void> {
  if (!shouldUseNotificationService(userId)) return;
  await sendInAppRemote(userId, {
    title: `Approval needed — "${workflowName}"`,
    message: 'A workflow step is paused, waiting for your approval before it continues.',
    type: 'approval_needed',
    link: `/approvals/${approvalId}`,
  }).catch(() => { /* fire-and-forget */ });
}
