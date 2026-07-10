"use strict";
/**
 * In-app notification helpers for the worker.
 *
 * Delegates to notification-service via sendInAppRemote() when the user's
 * userId falls within the canary percent. Fire-and-forget only — never awaited
 * in the hot path, never throws.
 *
 * Phase 3: wired into execution-job-runner.ts alongside email-service.ts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInAppExecutionCompleted = sendInAppExecutionCompleted;
exports.sendInAppExecutionFailed = sendInAppExecutionFailed;
const notification_service_client_1 = require("./notification-service-client");
async function sendInAppExecutionCompleted(userId, workflowName, executionId) {
    if (!(0, notification_service_client_1.shouldUseNotificationService)(userId))
        return;
    await (0, notification_service_client_1.sendInAppRemote)(userId, {
        title: `Workflow "${workflowName}" completed`,
        message: `Execution ${executionId} completed successfully.`,
        type: 'execution_completed',
        link: `/executions/${executionId}`,
    }).catch(() => { });
}
async function sendInAppExecutionFailed(userId, workflowName, error) {
    if (!(0, notification_service_client_1.shouldUseNotificationService)(userId))
        return;
    await (0, notification_service_client_1.sendInAppRemote)(userId, {
        title: `Workflow "${workflowName}" failed`,
        message: error.slice(0, 200),
        type: 'execution_failed',
        link: null,
    }).catch(() => { });
}
