"use strict";
/**
 * Resolves the user intent string for a workflow run (AI input resolver, runtime_ai fill, templates).
 *
 * Priority (first non-empty trimmed string wins):
 * 1. Per-run override from execution payload (explicit run intent).
 * 2. `workflowRow.metadata.originalUserPrompt` — canonical build-time intent.
 * 3. `workflowRow.graph.metadata.originalUserPrompt` when top-level metadata omits it.
 * 4. Legacy row columns: `user_prompt`, then `description`, then `name`.
 * 5. Default: `Process workflow data`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWorkflowRuntimeIntent = resolveWorkflowRuntimeIntent;
function pickExecutionIntentOverride(executionInput) {
    if (executionInput == null || typeof executionInput !== 'object')
        return '';
    const x = executionInput;
    const v = x.inputData?.workflowIntent ||
        x.inputData?.description ||
        x.description ||
        x.workflowIntent ||
        x.userIntent ||
        x.user_prompt ||
        x.prompt ||
        x.body?.workflowIntent ||
        x.body?.userIntent ||
        x.body?.prompt ||
        x.payload?.workflowIntent ||
        x.data?.workflowIntent ||
        '';
    return String(v ?? '').trim();
}
function pickFromWorkflowRow(workflowRow) {
    if (!workflowRow || typeof workflowRow !== 'object')
        return '';
    const meta = String(workflowRow.metadata?.originalUserPrompt ?? '').trim();
    if (meta)
        return meta;
    const graphMeta = String(workflowRow.graph?.metadata?.originalUserPrompt ?? '').trim();
    if (graphMeta)
        return graphMeta;
    const col = workflowRow.user_prompt ||
        workflowRow.description ||
        workflowRow.name ||
        '';
    return String(col ?? '').trim();
}
/**
 * @param workflowRow Fresh DB workflow row (e.g. from `select('*')`) or undefined.
 * @param executionInput Resolved execution input for this run (request body input or resume payload).
 */
function resolveWorkflowRuntimeIntent(workflowRow, executionInput) {
    const fromInput = pickExecutionIntentOverride(executionInput);
    if (fromInput)
        return fromInput;
    const fromRow = pickFromWorkflowRow(workflowRow);
    if (fromRow)
        return fromRow;
    return 'Process workflow data';
}
