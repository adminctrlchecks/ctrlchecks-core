/**
 * ✅ INTERVAL TRIGGER NODE - Migrated to Registry
 * 
 * Recurring interval trigger.
 * Returns execution timestamp.
 */

import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideInterval(
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
      
      // ✅ OPTIMIZED: Interval trigger - return clean output with just timestamp
      // Interval triggers run at recurring intervals, return execution timestamp
      return {
        success: true,
        output: {
          executed_at: new Date().toISOString(),
          ...(inputObj && Object.keys(inputObj).length > 0 ? inputObj : {}),
        },
      };
    },
  };
}
