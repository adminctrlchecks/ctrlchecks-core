/**
 * ✅ WORKFLOW TRIGGER NODE - Migrated to Registry
 * 
 * Triggered by another workflow.
 * Returns payload from source workflow.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideWorkflowTrigger(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  return {
    ...def,
    execute: async (context) => {
      // context.input does not exist on NodeExecutionContext; the correct field is rawInput.
      const sourceInput = context.rawInput ?? context.inputs ?? {};

      // Extract input object
      const inputObj = typeof sourceInput === 'object' && sourceInput !== null && !Array.isArray(sourceInput)
        ? sourceInput as Record<string, unknown>
        : {};
      
      // ✅ OPTIMIZED: Workflow trigger - return clean output with just the payload from source workflow
      // When triggered from another workflow, return the actual payload passed, not metadata
      // Remove trigger metadata and return just the data
      const { trigger, workflow_id, source_workflow_id, executed_at, ...payload } = inputObj;
      return {
        success: true,
        output: payload && Object.keys(payload).length > 0 ? payload : {},
      };
    },
  };
}
