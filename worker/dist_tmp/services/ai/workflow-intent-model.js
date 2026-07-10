"use strict";
/**
 * Versioned first-generation intent artifact: collected inputs and optional branch hints.
 * Drives structural alignment with form / if_else configs — no per-workflow hardcoding.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_INTENT_MODEL_VERSION = void 0;
exports.buildWorkflowIntentModel = buildWorkflowIntentModel;
exports.formatWorkflowIntentModelDigest = formatWorkflowIntentModelDigest;
exports.mergeWorkflowIntentModelMetadata = mergeWorkflowIntentModelMetadata;
const intent_extraction_1 = require("./intent-extraction");
exports.WORKFLOW_INTENT_MODEL_VERSION = 1;
function buildWorkflowIntentModel(workflow, intentText) {
    const keys = (0, intent_extraction_1.deriveOrderedFieldKeysForForm)(intentText, workflow);
    const collectedInputs = keys.map((key) => ({
        key,
        labelHint: (0, intent_extraction_1.toTitleLabel)(key),
        typeHint: (0, intent_extraction_1.inferFieldTypeFromKey)(key),
    }));
    return {
        version: exports.WORKFLOW_INTENT_MODEL_VERSION,
        builtAt: new Date().toISOString(),
        collectedInputs,
    };
}
/** One-line summary for structured plan / UI (registry keys only, no node hardcoding). */
function formatWorkflowIntentModelDigest(model) {
    if (!model.collectedInputs?.length)
        return '';
    const parts = model.collectedInputs.map((i) => `${i.key} (${i.labelHint})`);
    return `Collected inputs aligned to form/conditions: ${parts.join(', ')}.`;
}
function mergeWorkflowIntentModelMetadata(workflow, model) {
    if (!workflow) {
        return { nodes: [], edges: [], metadata: { workflowIntentModel: model } };
    }
    return {
        ...workflow,
        metadata: {
            ...(workflow.metadata || {}),
            workflowIntentModel: model,
        },
    };
}
