/**
 * Email notification service using AWS SES.
 *
 * Guards:
 *  - SES_FROM_EMAIL must be set; otherwise all send calls are no-ops.
 *  - sendExecutionCompleted / sendExecutionFailed only fire when
 *    EXECUTION_EMAIL_NOTIFICATIONS=true.
 *
 * Delegation (Phase 2):
 *  - sendExecutionCompleted / sendExecutionFailed check shouldUseNotificationService(userId).
 *  - If canary routes to notification-service AND service returns non-null → done.
 *  - If service returns null (down/error) → fall through to local SES.
 *  - sendWelcomeEmail has no userId so is always local.
 *
 * The SES client is lazy-created on first use so startup is unaffected when
 * SES is unconfigured.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getDbClient } from '../../core/database/aws-db-client';
import {
  shouldUseNotificationService,
  sendEmailRemote,
} from '../notification-service-client';

let _sesClient: SESClient | null = null;

function getSesClient(): SESClient {
  // Read env at call time so tests can override process.env without module reload.
  const region = process.env.SES_REGION?.trim() || process.env.AWS_REGION || 'us-east-1';
  if (!_sesClient) {
    _sesClient = new SESClient({ region });
  }
  return _sesClient;
}

/** Reset cached SES client — for test isolation only. */
export function _resetSesClient(): void {
  _sesClient = null;
}

function isNotificationsEnabled(): boolean {
  return process.env.EXECUTION_EMAIL_NOTIFICATIONS === 'true';
}

function getFromEmail(): string {
  return process.env.SES_FROM_EMAIL?.trim() || '';
}

async function resolveUserEmail(userId: string): Promise<string | null> {
  try {
    const db = getDbClient();
    const { data, error } = await db.getUserById(userId);
    if (error || !data?.user?.email) return null;
    return (data.user.email as string) || null;
  } catch {
    return null;
  }
}

async function sendRaw(to: string, subject: string, html: string): Promise<void> {
  const fromEmail = getFromEmail();
  if (!fromEmail) {
    console.warn('[EmailService] SES_FROM_EMAIL not configured — skipping notification');
    return;
  }
  const client = getSesClient();
  await client.send(
    new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: html, Charset: 'UTF-8' } },
      },
      Source: fromEmail,
    })
  );
}

export async function sendExecutionCompleted(
  userId: string,
  workflowName: string,
  executionId: string
): Promise<void> {
  if (!isNotificationsEnabled() || !getFromEmail()) return;

  // Resolve email once — used by both canary and local paths
  const email = await resolveUserEmail(userId);
  if (!email) return;

  // Canary: delegate to notification-service when enabled
  if (shouldUseNotificationService(userId)) {
    const result = await sendEmailRemote(userId, {
      templateId: 'execution_completed',
      data: { workflowName, executionId },
      to: email,
    });
    if (result !== null) return;
    console.warn('[EmailService] notification-service fallback for user:', userId);
  }

  // Local SES path
  const safeWorkflowName = workflowName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeExecutionId = executionId.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const subject = `✅ Workflow "${safeWorkflowName}" completed`;
  const html = `
    <h2>Workflow completed successfully</h2>
    <p><strong>Workflow:</strong> ${safeWorkflowName}</p>
    <p><strong>Execution ID:</strong> ${safeExecutionId}</p>
    <p><a href="https://app.ctrlchecks.ai">View results in CtrlChecks →</a></p>
  `;

  await sendRaw(email, subject, html).catch((err) =>
    console.error('[EmailService] sendExecutionCompleted error:', err)
  );
}

export async function sendExecutionFailed(
  userId: string,
  workflowName: string,
  error: string
): Promise<void> {
  if (!isNotificationsEnabled() || !getFromEmail()) return;

  const email = await resolveUserEmail(userId);
  if (!email) return;

  // Canary: delegate to notification-service when enabled
  if (shouldUseNotificationService(userId)) {
    const result = await sendEmailRemote(userId, {
      templateId: 'execution_failed',
      data: { workflowName, error },
      to: email,
    });
    if (result !== null) return;
    console.warn('[EmailService] notification-service fallback for user:', userId);
  }

  // Local SES path
  const safeWorkflowName = workflowName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeError = error.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 500);

  const subject = `❌ Workflow "${safeWorkflowName}" failed`;
  const html = `
    <h2>Workflow execution failed</h2>
    <p><strong>Workflow:</strong> ${safeWorkflowName}</p>
    <p><strong>Error:</strong> ${safeError}</p>
    <p><a href="https://app.ctrlchecks.ai">Investigate in CtrlChecks →</a></p>
  `;

  await sendRaw(email, subject, html).catch((err) =>
    console.error('[EmailService] sendExecutionFailed error:', err)
  );
}

export async function sendApprovalNeeded(
  userId: string,
  workflowName: string,
  executionId: string,
  approvalId: string
): Promise<void> {
  if (!isNotificationsEnabled() || !getFromEmail()) return;

  const email = await resolveUserEmail(userId);
  if (!email) return;

  if (shouldUseNotificationService(userId)) {
    const result = await sendEmailRemote(userId, {
      templateId: 'approval_needed',
      data: { workflowName, executionId, approvalId },
      to: email,
    });
    if (result !== null) return;
    console.warn('[EmailService] notification-service fallback for user:', userId);
  }

  const safeWorkflowName = workflowName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const approvalUrl = `https://app.ctrlchecks.ai/approvals/${approvalId}`;

  const subject = `⏸ Approval needed — "${safeWorkflowName}"`;
  const html = `
    <h2>A workflow step needs your approval</h2>
    <p><strong>Workflow:</strong> ${safeWorkflowName}</p>
    <p>Execution has paused at a sensitive step and is waiting for you to approve or reject it before continuing.</p>
    <p><a href="${approvalUrl}">Review and respond →</a></p>
  `;

  await sendRaw(email, subject, html).catch((err) =>
    console.error('[EmailService] sendApprovalNeeded error:', err)
  );
}

// sendWelcomeEmail has no userId — canary routing not applicable; always local.
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  if (!getFromEmail()) return;

  const safeName = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const subject = 'Welcome to CtrlChecks!';
  const html = `
    <h2>Welcome, ${safeName}!</h2>
    <p>You can start building AI-powered workflows right away.</p>
    <p><a href="https://app.ctrlchecks.ai">Open CtrlChecks →</a></p>
  `;

  await sendRaw(email, subject, html).catch((err) =>
    console.error('[EmailService] sendWelcomeEmail error:', err)
  );
}
