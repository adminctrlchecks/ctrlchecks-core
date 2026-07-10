import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { getAuthoritativeInputs } from '../../execution/runtime-input-handoff';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';

export function overrideAiAgent(def: UnifiedNodeDefinition, schema: NodeSchema): UnifiedNodeDefinition {
  const nextInputSchema = { ...def.inputSchema };
  const userInputDef = nextInputSchema.userInput || {
    type: 'string',
    description: 'User input or prompt for the AI agent',
    required: false,
  };

  nextInputSchema.userInput = { ...userInputDef, required: false };

  return {
    ...def,
    inputSchema: nextInputSchema,
    // Make AI Agent work as a normal AI service node: only text input is needed at runtime.
    requiredInputs: [],
    execute: async (context) => {
      const authoritativeInputs = getAuthoritativeInputs(context);
      const raw = context.rawInput;
      const rawObj = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
        ? raw as Record<string, unknown>
        : {};

      const resolvedUserInput =
        (typeof authoritativeInputs.userInput === 'string' && authoritativeInputs.userInput) ||
        (typeof rawObj.message === 'string' && rawObj.message) ||
        (typeof rawObj.text === 'string' && rawObj.text) ||
        (typeof rawObj.input === 'string' && rawObj.input) ||
        (typeof raw === 'string' ? raw : '') ||
        '';

      const mergedInputs = {
        ...authoritativeInputs,
        userInput: resolvedUserInput,
      };

      return await executeViaLegacyExecutor({
        context: {
          ...context,
          inputs: mergedInputs,
        },
        schema,
      });
    },
  };
}
