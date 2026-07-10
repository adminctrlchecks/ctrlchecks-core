"use strict";
/**
 * Execution Event Logger
 *
 * Logs execution events to workflow_execution_events table for timeline/audit/debugging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logExecutionEvent = logExecutionEvent;
exports.getExecutionTimeline = getExecutionTimeline;
const CHECK_CONSTRAINT_VIOLATION = '23514';
function isMissingRelationError(error) {
    return (error?.message?.includes('does not exist') ||
        error?.message?.includes('relation') ||
        error?.code === '42P01');
}
function fallbackEventTypeForConstraint(eventType) {
    switch (eventType) {
        case 'NODE_SELF_VALIDATION':
            return 'NODE_FINISHED';
        case 'AUTONOMOUS_REMEDIATION':
            return 'NODE_RETRY';
        case 'WARNING':
            return 'RUN_STARTED';
        default:
            return null;
    }
}
async function insertExecutionEvent(db, executionId, workflowId, eventType, eventData, nodeId, nodeName, sequence) {
    return db
        .from('workflow_execution_events')
        .insert({
        execution_id: executionId,
        workflow_id: workflowId,
        event_type: eventType,
        event_data: eventData,
        node_id: nodeId,
        node_name: nodeName,
        sequence,
        created_at: new Date().toISOString(),
    })
        .select()
        .single();
}
/**
 * Log execution event.
 *
 * ⚠️ IMPORTANT:
 * This function is intentionally **best-effort** and MUST NOT throw.
 * Failing to write an execution log should never cause the workflow itself
 * to fail – it should only be surfaced via console logging.
 */
async function logExecutionEvent(db, executionId, workflowId, eventType, eventData = {}, nodeId, nodeName, sequence = 0) {
    try {
        let { data, error } = await insertExecutionEvent(db, executionId, workflowId, eventType, eventData, nodeId, nodeName, sequence);
        if (error?.code === CHECK_CONSTRAINT_VIOLATION) {
            const fallbackEventType = fallbackEventTypeForConstraint(eventType);
            if (fallbackEventType) {
                const fallback = await insertExecutionEvent(db, executionId, workflowId, fallbackEventType, {
                    ...eventData,
                    originalEventType: eventType,
                    downgradedForConstraint: true,
                }, nodeId, nodeName, sequence);
                data = fallback.data;
                error = fallback.error;
            }
        }
        if (error) {
            // ✅ CRITICAL: Log error details for debugging, but DO NOT throw.
            // Logging failures must not break workflow execution.
            console.error('[ExecutionEventLogger] ❌ Event insert failed:', {
                executionId,
                workflowId,
                eventType,
                error: error.message,
                errorCode: error.code,
                errorDetails: error.details,
                errorHint: error.hint,
                tableMissing: isMissingRelationError(error),
                constraintMismatch: error.code === CHECK_CONSTRAINT_VIOLATION,
            });
            return;
        }
        // ✅ TEMP: Structured logging for successful event insert
        if (process.env.ENABLE_EVENT_LOGGING === 'true') {
            console.log('[ExecutionEventLogger] ✅ Event logged:', {
                executionId,
                workflowId,
                eventType,
                eventId: data?.id,
            });
        }
    }
    catch (error) {
        // ✅ CRITICAL: Never throw from logger – callers should not fail because of this.
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[ExecutionEventLogger] ❌ Failed to log event:', {
            executionId,
            workflowId,
            eventType,
            error: errorMessage,
        });
        // Swallow the error to avoid impacting workflow execution.
        return;
    }
}
/**
 * Get execution timeline (all events for an execution)
 */
async function getExecutionTimeline(db, executionId) {
    try {
        const { data, error } = await db
            .from('workflow_execution_events')
            .select('*')
            .eq('execution_id', executionId)
            .order('created_at', { ascending: true })
            .order('sequence', { ascending: true });
        if (error) {
            console.error('[ExecutionEventLogger] Failed to get timeline:', error);
            return [];
        }
        return data || [];
    }
    catch (error) {
        console.error('[ExecutionEventLogger] Failed to get timeline:', error);
        return [];
    }
}
