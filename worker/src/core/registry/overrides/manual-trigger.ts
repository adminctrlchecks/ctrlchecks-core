/**
 * ✅ MANUAL TRIGGER NODE - Migrated to Registry
 * 
 * Simple trigger node that returns input as-is.
 * Used for manual workflow execution and testing.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideManualTrigger(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  return {
    ...def,
    execute: async (context) => {
      // context.input does not exist on NodeExecutionContext. Manual trigger's
      // test payload lives in config.inputData; fall back to rawInput/inputs
      // for consistency with the other trigger overrides.
      const sourceInput = context.config?.inputData ?? context.rawInput ?? context.inputs ?? {};

      // Extract input object
      const inputObj = typeof sourceInput === 'object' && sourceInput !== null && !Array.isArray(sourceInput)
        ? sourceInput as Record<string, unknown>
        : {};
      
      // ✅ OPTIMIZED: Return clean output - just the input data, no trigger metadata
      // Manual trigger is typically used for testing, so return input as-is
      const result = inputObj && Object.keys(inputObj).length > 0 ? inputObj : {};
      
      return {
        success: true,
        output: result,
      };
    },
  };
}
