/**
 * ✅ MERGE NODE - Real Execution Logic
 * 
 * Implements actual data merging from multiple sources:
 * - Combines outputs from multiple incoming paths (true/false branches, switch cases, etc.)
 * - Supports different merge modes (overwrite, append, deep_merge)
 * - Preserves all data from all sources
 */

import type { UnifiedNodeDefinition, NodeExecutionResult } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';

type MergeMode = 'overwrite' | 'append' | 'deep_merge';

function normalizeMergeMode(value: unknown): MergeMode {
  const raw = String(value || 'overwrite').toLowerCase();
  if (['append', 'concat', 'concatenate', 'multiples'].includes(raw)) return 'append';
  if (['deep_merge', 'deepmerge', 'deep-merge'].includes(raw)) return 'deep_merge';
  return 'overwrite';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMergeObjects(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const next = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = next[key];
    next[key] = isPlainObject(existing) && isPlainObject(value)
      ? deepMergeObjects(existing, value)
      : value;
  }
  return next;
}

function mergeUpstreamOutputs(outputs: Iterable<unknown>, mode: MergeMode): Record<string, unknown> {
  if (mode === 'append') {
    const items: unknown[] = [];
    for (const output of outputs) {
      if (Array.isArray(output)) {
        items.push(...output);
      } else if (isPlainObject(output) && Array.isArray(output.items)) {
        items.push(...output.items);
      } else if (output !== undefined) {
        items.push(output);
      }
    }
    return { items };
  }

  let merged: Record<string, unknown> = {};
  for (const output of outputs) {
    if (Array.isArray(output)) {
      merged.items = [...(Array.isArray(merged.items) ? merged.items : []), ...output];
      continue;
    }
    if (!isPlainObject(output)) continue;
    merged = mode === 'deep_merge'
      ? deepMergeObjects(merged, output)
      : { ...merged, ...output };
  }
  return merged;
}

export function overrideMerge(
  def: UnifiedNodeDefinition,
  schema: NodeSchema
): UnifiedNodeDefinition {
  return {
    ...def,
    // ✅ MERGE CAPABILITY FLAG: Merge nodes allow multiple inputs by design
    allowsMultipleInputs: true,
    execute: async (context): Promise<NodeExecutionResult> => {
      const mode = normalizeMergeMode(context.config?.mode);
      // ✅ REAL FUNCTIONALITY: Use legacy executor which has merge logic
      // The execution engine already merges multiple inputs in buildNodeInput(),
      // but the legacy executor can apply merge-specific modes (overwrite, append, deep_merge)
      
      const result = await executeViaLegacyExecutor({
        context,
        schema,
        hooks: {
          beforeExecute: (prepared) => {
            // ✅ CRITICAL: Merge node needs ALL upstream outputs combined
            // The execution engine's buildNodeInput() already merges multiple inputs,
            // but we ensure all upstream data is included
            
            const mergedInput = mergeUpstreamOutputs(context.upstreamOutputs.values(), mode);
            if (Object.keys(mergedInput).length === 0 && isPlainObject(prepared.executionInput)) {
              Object.assign(mergedInput, prepared.executionInput);
            }

            return { executionInput: mergedInput };
          },
        },
      });

      // ✅ REAL FUNCTIONALITY: Ensure merged output contains all data from all sources
      if (result.success && result.output) {
        const outObj = result.output as any;
        const inputObj = context.inputs as any;
        
        // Combine all input data (already merged by engine + our hooks)
        const finalOutput = {
          ...(typeof inputObj === 'object' && inputObj !== null ? inputObj : {}),
          ...(typeof outObj === 'object' && outObj !== null ? outObj : {}),
        };

        return { 
          success: true, 
          output: finalOutput,
          metadata: {
            merged: true,
            mergeMode: mode,
            sourceCount: context.upstreamOutputs.size,
          },
        };
      }

      return result;
    },
  };
}
