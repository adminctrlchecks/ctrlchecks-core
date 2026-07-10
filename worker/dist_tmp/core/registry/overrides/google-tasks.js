"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideGoogleTasks = overrideGoogleTasks;
const google_workspace_utils_1 = require("./google-workspace-utils");
function isValidDateOnly(datePart) {
    const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match)
        return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day);
}
function toGoogleTasksDueDate(value) {
    if (value === undefined || value === null)
        return undefined;
    const raw = String(value).trim();
    if (!raw)
        return undefined;
    // Runtime expressions may be resolved later by the workflow engine. Do not
    // mangle them into a date while they are still template strings.
    if (raw.includes('{{'))
        return raw;
    // Google Tasks stores only the calendar day. Preserve the user-entered day
    // from ISO/RFC3339 values instead of shifting it through UTC conversion.
    const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
    if (isoDate) {
        if (!isValidDateOnly(isoDate[1])) {
            throw new Error(`Invalid Google Tasks due date: ${raw}`);
        }
        return `${isoDate[1]}T00:00:00.000Z`;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('Google Tasks due date must be a calendar date, for example 2026-12-31');
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00.000Z`;
}
function compactTaskPayload(payload) {
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}
function firstNonEmptyString(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim())
            return value.trim();
        if (typeof value === 'number' || typeof value === 'boolean')
            return String(value);
    }
    return '';
}
function nested(obj, path) {
    if (!obj || typeof obj !== 'object')
        return undefined;
    let current = obj;
    for (const part of path.split('.')) {
        if (current === undefined || current === null)
            return undefined;
        current = current[part];
    }
    return current;
}
function resolveTaskId(inputs, context) {
    const configured = firstNonEmptyString(inputs.taskId);
    if (configured && !configured.includes('{{'))
        return configured;
    const candidates = [
        inputs.id,
        inputs.data?.id,
        inputs.data?.[0]?.data?.id,
        inputs.task?.id,
        nested(context.rawInput, 'id'),
        nested(context.rawInput, 'data.id'),
        nested(context.rawInput, 'data.0.data.id'),
        nested(context.rawInput, 'task.id'),
    ];
    context.upstreamOutputs?.forEach((output) => {
        candidates.push(nested(output, 'id'), nested(output, 'data.id'), nested(output, 'data.0.data.id'), nested(output, 'output.data.id'));
    });
    return firstNonEmptyString(...candidates);
}
function withGoogleTasksCompletionFields(payload) {
    const status = typeof payload.status === 'string' ? payload.status.trim() : '';
    if (status === 'completed' && !payload.completed) {
        return { ...payload, completed: new Date().toISOString() };
    }
    if (status === 'needsAction') {
        return { ...payload, completed: null };
    }
    return payload;
}
function overrideGoogleTasks(def, _schema) {
    const manualStatic = { default: 'manual_static', supportsRuntimeAI: false, supportsBuildtimeAI: false };
    const runtimeValue = { default: 'manual_static', supportsRuntimeAI: true, supportsBuildtimeAI: true };
    const buildtimeValue = { default: 'buildtime_ai_once', supportsRuntimeAI: false, supportsBuildtimeAI: true };
    const options = ['create', 'read', 'update', 'delete'].map((value) => ({ label: value.charAt(0).toUpperCase() + value.slice(1), value }));
    const inputSchema = {
        ...def.inputSchema,
        operation: { ...def.inputSchema.operation, ui: { ...(def.inputSchema.operation?.ui || {}), options } },
        taskListId: {
            type: 'string',
            description: 'Google Tasks task list ID. Use @default for the primary list.',
            required: false,
            default: '@default',
            role: 'id',
            fillMode: manualStatic,
        },
        title: { type: 'string', description: 'Task title', required: false, role: 'title_like', fillMode: runtimeValue },
        notes: { type: 'string', description: 'Task notes/details', required: false, role: 'long_body', fillMode: runtimeValue },
        due: {
            type: 'string',
            description: 'Due date for the task. Use a local calendar date such as 2026-12-31. Google Tasks records due dates at day level; time of day is not saved by the Google Tasks API.',
            required: false,
            role: 'config',
            fillMode: buildtimeValue,
            examples: ['2026-12-31'],
            ui: { widget: 'date' },
        },
        status: { type: 'string', description: 'Task status, for example needsAction or completed', required: false, role: 'config', fillMode: buildtimeValue },
    };
    return {
        ...def,
        inputSchema,
        credentialSchema: {
            requirements: [{ provider: 'google', category: 'oauth', required: true, description: 'Google OAuth with Tasks scope' }],
            credentialFields: ['accessToken'],
        },
        execute: async (context) => {
            const inputs = (0, google_workspace_utils_1.mergedInputs)(context);
            const operation = String(inputs.operation || 'read');
            const taskListId = encodeURIComponent(String(inputs.taskListId || '@default'));
            try {
                const accessToken = await (0, google_workspace_utils_1.getGoogleTokenForContext)(context, ['https://www.googleapis.com/auth/tasks']);
                let output;
                let acknowledgementStatus = 'not_required';
                if (operation === 'read') {
                    const taskId = resolveTaskId(inputs, context);
                    if (taskId) {
                        output = await (0, google_workspace_utils_1.googleApiRequest)(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${encodeURIComponent(taskId)}`, accessToken);
                    }
                    else {
                        output = await (0, google_workspace_utils_1.googleApiRequest)(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, accessToken);
                    }
                }
                else if (operation === 'create') {
                    if (!inputs.title)
                        throw new Error('title is required for create');
                    const due = toGoogleTasksDueDate(inputs.due ?? inputs.dueDate);
                    output = await (0, google_workspace_utils_1.googleApiRequest)(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, accessToken, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(compactTaskPayload({ title: inputs.title, notes: inputs.notes, due })),
                    });
                }
                else if (operation === 'update') {
                    const taskId = resolveTaskId(inputs, context);
                    if (!taskId)
                        throw new Error('taskId is required for update');
                    const due = toGoogleTasksDueDate(inputs.due ?? inputs.dueDate);
                    const payload = withGoogleTasksCompletionFields(compactTaskPayload({
                        title: inputs.title,
                        notes: inputs.notes,
                        due,
                        status: inputs.status,
                    }));
                    output = await (0, google_workspace_utils_1.googleApiRequest)(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${encodeURIComponent(taskId)}`, accessToken, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                }
                else if (operation === 'delete') {
                    const taskId = resolveTaskId(inputs, context);
                    if (!taskId)
                        throw new Error('taskId is required for delete');
                    const deleteAck = await (0, google_workspace_utils_1.googleApiRequestWithAcknowledgement)(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${encodeURIComponent(taskId)}`, accessToken, { method: 'DELETE' });
                    acknowledgementStatus = deleteAck.acknowledgementStatus;
                    output = { deleted: true, taskId };
                }
                else {
                    throw new Error(`Unsupported Google Tasks operation: ${operation}`);
                }
                return {
                    success: true,
                    output: { operation, data: output },
                    metadata: {
                        operationStatus: 'succeeded',
                        acknowledgementStatus,
                        persistenceStatus: 'saved',
                    },
                };
            }
            catch (error) {
                return { success: false, error: { code: 'GOOGLE_TASKS_FAILED', message: error?.message || 'Google Tasks operation failed' } };
            }
        },
    };
}
