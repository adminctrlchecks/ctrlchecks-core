"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJsonColumn = isJsonColumn;
exports.prepareDbValue = prepareDbValue;
exports.preparePayload = preparePayload;
const JSON_COLUMN_MAP = {
    credential_vault: ['metadata'],
    executions: ['input', 'output', 'logs', 'metadata', 'result_data'],
    execution_steps: [
        'input_json',
        'output_json',
        'input_refs',
        'output_refs',
        'result_data',
        'state_snapshot',
        'checkpoint_data',
    ],
    templates: ['nodes', 'edges'],
    user_credentials: ['credentials'],
    workflow_versions: [
        'nodes_snapshot',
        'edges_snapshot',
        'inputs_snapshot',
        'changes',
        'definition_snapshot',
        'metadata',
    ],
    workflows: [
        'nodes',
        'edges',
        'viewport',
        'memory_config',
        'agent_config',
        'graph',
        'execution_state',
        'settings',
        'metadata',
    ],
    workflow_execution_events: ['event_data'],
    workflow_execution_logs: ['input_data', 'output_data', 'metadata'],
};
const JSON_COLUMNS = Object.fromEntries(Object.entries(JSON_COLUMN_MAP).map(([table, columns]) => [table, new Set(columns)]));
function isJsonColumn(table, column) {
    return JSON_COLUMNS[table]?.has(column) === true;
}
function prepareDbValue(table, column, value) {
    if (value === undefined)
        return null;
    if (!isJsonColumn(table, column))
        return value;
    if (value === null)
        return value;
    if (typeof value === 'string') {
        try {
            JSON.parse(value);
            return value;
        }
        catch {
            return JSON.stringify(value);
        }
    }
    return JSON.stringify(value);
}
function preparePayload(table, payload) {
    return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, prepareDbValue(table, key, value)]));
}
