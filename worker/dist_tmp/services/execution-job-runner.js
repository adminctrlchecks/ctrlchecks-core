"use strict";
/**
 * Execution Job Runner
 *
 * Handles the full lifecycle of a single execution job:
 *   1. Mark execution as 'running' in the DB
 *   2. Publish 'running' WS event via Redis bridge
 *   3. Call execute-workflow handler
 *   4. Mark execution as 'success' or 'failed' in the DB
 *   5. Publish terminal WS event
 *
 * Called by ExecutionQueue.executeJob() so the queue logic stays
 * focused on scheduling/retry, not DB or WS concerns.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExecutionJob = runExecutionJob;
const aws_db_client_1 = require("../core/database/aws-db-client");
const ws_redis_bridge_1 = require("./ws-redis-bridge");
/**
 * Run a single execution job end-to-end.
 * Throws on unrecoverable errors; returns a result object otherwise.
 */
async function runExecutionJob(job) {
    const startedAt = Date.now();
    const db = (0, aws_db_client_1.getDbClient)();
    // ── 1. Mark execution as running ─────────────────────────────────────────
    try {
        await db
            .from('executions')
            .update({ status: 'running', current_node: null })
            .eq('id', job.executionId);
    }
    catch (dbErr) {
        console.warn(`[JobRunner] Could not update execution ${job.executionId} to running:`, dbErr);
    }
    await (0, ws_redis_bridge_1.publishExecutionEvent)(job.executionId, {
        type: 'EXECUTION_UPDATE',
        data: { executionId: job.executionId, status: 'running', progress: 0, currentStep: null },
    }).catch(() => { });
    // ── 2. Execute workflow ───────────────────────────────────────────────────
    let executionResult = null;
    let executionError;
    let responseStatus = 200;
    const executeWorkflowHandler = (await Promise.resolve().then(() => __importStar(require('../api/execute-workflow')))).default;
    const req = {
        body: {
            workflowId: job.workflowId,
            executionId: job.executionId,
            input: job.input,
            useQueue: false,
        },
        headers: {
            authorization: job.metadata?.authToken ? `Bearer ${job.metadata.authToken}` : undefined,
            ...(job.metadata?.headers || {}),
        },
    };
    const res = {
        statusCode: 200,
        status(code) { responseStatus = code; return this; },
        json(data) {
            executionResult = data;
            if (responseStatus >= 400)
                executionError = data?.error || data?.message || 'Execution failed';
            return this;
        },
        send(data) {
            executionResult = data;
            if (responseStatus >= 400)
                executionError = typeof data === 'string' ? data : (data?.error || 'Execution failed');
            return this;
        },
    };
    try {
        await executeWorkflowHandler(req, res);
    }
    catch (err) {
        executionError = err?.message || String(err);
    }
    // ── 3. Determine outcome ──────────────────────────────────────────────────
    const durationMs = Date.now() - startedAt;
    const succeeded = !executionError && responseStatus < 400;
    const finalStatus = succeeded ? 'success' : 'failed';
    // ── 4. Persist terminal state to DB ──────────────────────────────────────
    try {
        await db
            .from('executions')
            .update({
            status: finalStatus,
            duration_ms: durationMs,
            error: executionError ?? null,
            current_node: null,
            finished_at: new Date().toISOString(),
        })
            .eq('id', job.executionId);
    }
    catch (dbErr) {
        console.warn(`[JobRunner] Could not update execution ${job.executionId} to ${finalStatus}:`, dbErr);
    }
    // ── 5. Publish terminal WS event ─────────────────────────────────────────
    await (0, ws_redis_bridge_1.publishExecutionEvent)(job.executionId, {
        type: 'EXECUTION_UPDATE',
        data: {
            executionId: job.executionId,
            status: finalStatus,
            progress: succeeded ? 100 : 0,
            durationMs,
            error: executionError ?? null,
        },
    }).catch(() => { });
    console.log(`[JobRunner] ${finalStatus.toUpperCase()}: execution ${job.executionId} (${durationMs}ms)`);
    // Notifications are dispatched inside execute-workflow.ts terminal path,
    // which is called by this runner — no dispatch needed here.
    return {
        status: finalStatus,
        durationMs,
        error: executionError,
        result: executionResult,
    };
}
