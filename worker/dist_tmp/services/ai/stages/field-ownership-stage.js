"use strict";
/**
 * Field Ownership Stage - resolves AI/user ownership through registry policy.
 *
 * This stage never fails; unknown nodes are omitted from both maps.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFieldOwnershipStage = runFieldOwnershipStage;
const unified_node_registry_1 = require("../../../core/registry/unified-node-registry");
const logger_1 = require("../../../core/logger");
const field_ownership_policy_1 = require("../../../core/utils/field-ownership-policy");
async function runFieldOwnershipStage(workflow, correlationId) {
    const startedAt = Date.now();
    logger_1.logger.info({
        event: 'ai_pipeline_stage_start',
        stage: 'field_ownership',
        correlationId,
        inputSummary: `nodes=${workflow.nodes.length}`,
    });
    const fieldOwnershipMap = {};
    const fieldOwnershipPolicyMap = {};
    for (const node of workflow.nodes) {
        const nodeType = node.data?.type || node.type;
        const inputSchema = unified_node_registry_1.unifiedNodeRegistry.get(nodeType)?.inputSchema;
        if (!inputSchema)
            continue;
        const config = node.data?.config && typeof node.data.config === 'object'
            ? node.data.config
            : {};
        const nodeModes = {};
        const nodePolicies = {};
        for (const fieldName of Object.keys(inputSchema)) {
            const policy = (0, field_ownership_policy_1.resolveFieldOwnershipPolicy)(nodeType, fieldName, config);
            if (!policy)
                continue;
            nodeModes[fieldName] = policy.fillMode;
            nodePolicies[fieldName] = policy;
        }
        if (Object.keys(nodeModes).length === 0)
            continue;
        fieldOwnershipMap[node.id] = nodeModes;
        fieldOwnershipPolicyMap[node.id] = nodePolicies;
        const normalizedFillModes = typeof config._fillMode === 'object' && config._fillMode !== null
            ? { ...config._fillMode }
            : {};
        for (const [fieldName, fillMode] of Object.entries(nodeModes)) {
            normalizedFillModes[fieldName] = fillMode;
        }
        node.data.config = { ...config, _fillMode: normalizedFillModes };
    }
    const durationMs = Date.now() - startedAt;
    const totalFields = Object.values(fieldOwnershipMap).reduce((sum, fields) => sum + Object.keys(fields).length, 0);
    logger_1.logger.info({
        event: 'ai_pipeline_stage_end',
        stage: 'field_ownership',
        correlationId,
        outputSummary: `nodes=${Object.keys(fieldOwnershipMap).length}, fields=${totalFields}`,
        durationMs,
    });
    return {
        ok: true,
        fieldOwnershipMap,
        fieldOwnershipPolicyMap,
        durationMs,
    };
}
