"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports._resetSesClient = _resetSesClient;
exports.sendExecutionCompleted = sendExecutionCompleted;
exports.sendExecutionFailed = sendExecutionFailed;
exports.sendWelcomeEmail = sendWelcomeEmail;
const client_ses_1 = require("@aws-sdk/client-ses");
const aws_db_client_1 = require("../../core/database/aws-db-client");
const notification_service_client_1 = require("../notification-service-client");
let _sesClient = null;
function getSesClient() {
    // Read env at call time so tests can override process.env without module reload.
    const region = process.env.SES_REGION?.trim() || process.env.AWS_REGION || 'us-east-1';
    if (!_sesClient) {
        _sesClient = new client_ses_1.SESClient({ region });
    }
    return _sesClient;
}
/** Reset cached SES client — for test isolation only. */
function _resetSesClient() {
    _sesClient = null;
}
function isNotificationsEnabled() {
    return process.env.EXECUTION_EMAIL_NOTIFICATIONS === 'true';
}
function getFromEmail() {
    return process.env.SES_FROM_EMAIL?.trim() || '';
}
async function resolveUserEmail(userId) {
    try {
        const db = (0, aws_db_client_1.getDbClient)();
        const { data, error } = await db.getUserById(userId);
        if (error || !data?.user?.email)
            return null;
        return data.user.email || null;
    }
    catch {
        return null;
    }
}
async function sendRaw(to, subject, html) {
    const fromEmail = getFromEmail();
    if (!fromEmail) {
        console.warn('[EmailService] SES_FROM_EMAIL not configured — skipping notification');
        return;
    }
    const client = getSesClient();
    await client.send(new client_ses_1.SendEmailCommand({
        Destination: { ToAddresses: [to] },
        Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
        Source: fromEmail,
    }));
}
async function sendExecutionCompleted(userId, workflowName, executionId) {
    if (!isNotificationsEnabled() || !getFromEmail())
        return;
    // Resolve email once — used by both canary and local paths
    const email = await resolveUserEmail(userId);
    if (!email)
        return;
    // Canary: delegate to notification-service when enabled
    if ((0, notification_service_client_1.shouldUseNotificationService)(userId)) {
        const result = await (0, notification_service_client_1.sendEmailRemote)(userId, {
            templateId: 'execution_completed',
            data: { workflowName, executionId },
            to: email,
        });
        if (result !== null)
            return;
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
    await sendRaw(email, subject, html).catch((err) => console.error('[EmailService] sendExecutionCompleted error:', err));
}
async function sendExecutionFailed(userId, workflowName, error) {
    if (!isNotificationsEnabled() || !getFromEmail())
        return;
    const email = await resolveUserEmail(userId);
    if (!email)
        return;
    // Canary: delegate to notification-service when enabled
    if ((0, notification_service_client_1.shouldUseNotificationService)(userId)) {
        const result = await (0, notification_service_client_1.sendEmailRemote)(userId, {
            templateId: 'execution_failed',
            data: { workflowName, error },
            to: email,
        });
        if (result !== null)
            return;
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
    await sendRaw(email, subject, html).catch((err) => console.error('[EmailService] sendExecutionFailed error:', err));
}
// sendWelcomeEmail has no userId — canary routing not applicable; always local.
async function sendWelcomeEmail(email, name) {
    if (!getFromEmail())
        return;
    const safeName = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const subject = 'Welcome to CtrlChecks!';
    const html = `
    <h2>Welcome, ${safeName}!</h2>
    <p>You can start building AI-powered workflows right away.</p>
    <p><a href="https://app.ctrlchecks.ai">Open CtrlChecks →</a></p>
  `;
    await sendRaw(email, subject, html).catch((err) => console.error('[EmailService] sendWelcomeEmail error:', err));
}
