/**
 * Field Ownership Stage - resolves AI/user ownership through registry policy.
 *
 * This stage never fails; unknown nodes are omitted from both maps.
 */

import { unifiedNodeRegistry } from '../../../core/registry/unified-node-registry';
import { logger } from '../../../core/logger';
import type { Workflow } from '../../../core/types/ai-types';
import type { FieldFillMode } from '../../../core/types/unified-node-contract';
import {
  resolveFieldOwnershipPolicy,
  type FieldOwnershipPolicyMap,
} from '../../../core/utils/field-ownership-policy';

/** Legacy compatibility map: nodeId -> fieldName -> effective fill mode. */
export type FieldOwnershipMap = Record<string, Record<string, FieldFillMode>>;

export interface FieldOwnershipStageResult {
  ok: true;
  fieldOwnershipMap: FieldOwnershipMap;
  fieldOwnershipPolicyMap: FieldOwnershipPolicyMap;
  durationMs: number;
}

export async function runFieldOwnershipStage(
  workflow: Workflow,
  correlationId?: string,
): Promise<FieldOwnershipStageResult> {
  const startedAt = Date.now();
  logger.info({
    event: 'ai_pipeline_stage_start',
    stage: 'field_ownership',
    correlationId,
    inputSummary: `nodes=${workflow.nodes.length}`,
  });

  const fieldOwnershipMap: FieldOwnershipMap = {};
  const fieldOwnershipPolicyMap: FieldOwnershipPolicyMap = {};

  for (const node of workflow.nodes) {
    const nodeType = (node.data as any)?.type || node.type;
    const inputSchema = unifiedNodeRegistry.get(nodeType)?.inputSchema;
    if (!inputSchema) continue;

    const config =
      node.data?.config && typeof node.data.config === 'object'
        ? (node.data.config as Record<string, any>)
        : {};
    const nodeModes: Record<string, FieldFillMode> = {};
    const nodePolicies: FieldOwnershipPolicyMap[string] = {};

    for (const fieldName of Object.keys(inputSchema)) {
      const policy = resolveFieldOwnershipPolicy(nodeType, fieldName, config);
      if (!policy) continue;
      nodeModes[fieldName] = policy.fillMode;
      nodePolicies[fieldName] = policy;
    }

    if (Object.keys(nodeModes).length === 0) continue;

    fieldOwnershipMap[node.id] = nodeModes;
    fieldOwnershipPolicyMap[node.id] = nodePolicies;

    const normalizedFillModes: Record<string, string> =
      typeof config._fillMode === 'object' && config._fillMode !== null
        ? { ...(config._fillMode as Record<string, string>) }
        : {};
    for (const [fieldName, fillMode] of Object.entries(nodeModes)) {
      normalizedFillModes[fieldName] = fillMode;
    }
    node.data.config = { ...config, _fillMode: normalizedFillModes };
  }

  const durationMs = Date.now() - startedAt;
  const totalFields = Object.values(fieldOwnershipMap).reduce(
    (sum, fields) => sum + Object.keys(fields).length,
    0,
  );

  logger.info({
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
