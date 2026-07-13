import type { UnifiedNodeDefinition, NodeExecutionContext, NodeExecutionResult } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';

export function overrideTimeout(def: UnifiedNodeDefinition, schema: NodeSchema): UnifiedNodeDefinition {
  return {
    ...def,
    outgoingPorts: ['default', 'success', 'timeout'],
    isBranching: true,
    execute: async (context: NodeExecutionContext): Promise<NodeExecutionResult> => {
      const limit = context.config?.limit;
      
      if (typeof limit !== 'number' || limit <= 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_CONFIG',
            message: 'Invalid timeout limit. Must be a positive number.',
          },
        };
      }

      // Get workflow start time set by the engine at the start of the run (execute-workflow.ts)
      const workflowStart = (global as any).currentWorkflowStartTime || (context as any).workflowStartTime || Date.now();
      const elapsed = Date.now() - workflowStart;
      const timedOut = elapsed > limit;

      return {
        success: true,
        output: {
          elapsedMs: elapsed,
          limitMs: limit, // named distinctly from the 'limit' config key — cleanOutputFromConfig strips output keys that shadow config keys
          timedOut,
          originalInput: context.rawInput,
          // __routing survives into downstream branch-skip logic (execute-workflow.ts reads this
          // from the raw output since NodeExecutionResult.metadata does not propagate past the executor).
          __routing: { branch: timedOut ? 'timeout' : 'success' },
        },
        metadata: {
          branch: timedOut ? 'timeout' : 'success',
        },
      };
    },
  };
}
