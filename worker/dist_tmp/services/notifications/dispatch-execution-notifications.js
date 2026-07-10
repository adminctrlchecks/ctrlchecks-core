"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchExecutionNotifications = dispatchExecutionNotifications;
const aws_db_client_1 = require("../../core/database/aws-db-client");
const email_service_1 = require("./email-service");
const in_app_service_1 = require("../in-app-service");
/**
 * Fire-and-forget execution completion notifications via email + in-app.
 * Resolves workflow name from DB; never throws (notifications are best-effort).
 * Shared by execution-job-runner.ts and execute-workflow.ts.
 */
function dispatchExecutionNotifications(params) {
    const { userId, workflowId, executionId, succeeded, error } = params;
    setImmediate(async () => {
        try {
            const db = await (0, aws_db_client_1.getDbClient)();
            const { data: wfRow } = await db
                .from('workflows')
                .select('name')
                .eq('id', workflowId)
                .single();
            const workflowName = wfRow?.name ?? workflowId;
            if (succeeded) {
                await (0, email_service_1.sendExecutionCompleted)(userId, workflowName, executionId);
                await (0, in_app_service_1.sendInAppExecutionCompleted)(userId, workflowName, executionId);
            }
            else {
                await (0, email_service_1.sendExecutionFailed)(userId, workflowName, error ?? 'Unknown error');
                await (0, in_app_service_1.sendInAppExecutionFailed)(userId, workflowName, error ?? 'Unknown error');
            }
        }
        catch {
            // notifications are best-effort — never let errors surface
        }
    });
}
