import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { getAuthoritativeInputs } from '../../execution/runtime-input-handoff';
import { executeViaLegacyExecutor } from '../unified-node-registry-legacy-adapter';
import { isAgentAttachmentHandle } from '../../execution/agent/agent-types';
import { runAgent } from '../../execution/agent/agent-executor';
import { getAttachedNodeForHandle } from '../../execution/agent/tool-manifest';

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
    outputSchema: {
      ...def.outputSchema,
      success: {
        name: 'success',
        description: 'Successful AI Agent result',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            output: { type: 'string' },
            response_text: { type: 'string' },
            iterations: { type: 'number' },
            toolCalls: { type: 'array' },
          },
        },
      },
      error: {
        name: 'error',
        description: 'Structured AI Agent error',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
            error_flag: { type: 'boolean' },
            error_message: { type: 'string' },
          },
        },
      },
      output: def.outputSchema.default || {
        name: 'output',
        description: 'Legacy success output',
        schema: { type: 'object', properties: {} },
      },
    },
    incomingPorts: ['userInput', 'input', 'chat_model', 'memory', 'tool'],
    outgoingPorts: ['success', 'error', 'output'],
    allowsMultipleInputs: true,
    requiredInputs: [],
    execute: async (context) => {
      const graph = (context as any).agentGraph;
      const hasAttachedTools = graph && Array.isArray(graph.edges)
        ? graph.edges.some((edge: any) =>
            edge?.target === context.nodeId &&
            isAgentAttachmentHandle(edge?.targetHandle) &&
            (edge?.targetHandle === 'tool')
          )
        : false;

      if (hasAttachedTools) {
        return runAgent(context);
      }

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

      // An attached Chat Model sidecar must win here too, not just in runAgent()'s tool
      // loop above. Without this, an agent with a Chat Model attached but no Tool attached
      // (a very common "just answer with GPT-4o/Claude, no tools" setup) silently falls
      // through to this legacy path and ignores the sidecar entirely, using the node's own
      // inline `model`/`apiKey` (or the Gemini default) instead — the same class of gap
      // already fixed once for a different legacy path (see git history: "Fix the SECOND
      // resolution pipeline"). Reuses agent-executor.ts's own lookup helper so there's one
      // definition of "how to find the attached Chat Model node", not two.
      const chatModelNode = graph && Array.isArray(graph.nodes) && Array.isArray(graph.edges)
        ? getAttachedNodeForHandle(context.nodeId, graph, 'chat_model')
        : undefined;
      const chatModelConfig = (chatModelNode?.data?.config || {}) as Record<string, unknown>;
      const configOverrides: Record<string, unknown> = {};
      if (typeof chatModelConfig.model === 'string' && chatModelConfig.model.trim()) {
        configOverrides.model = chatModelConfig.model;
      }
      if (typeof chatModelConfig.apiKey === 'string' && chatModelConfig.apiKey.trim()) {
        configOverrides.apiKey = chatModelConfig.apiKey;
      }

      return await executeViaLegacyExecutor({
        context: {
          ...context,
          inputs: mergedInputs,
          config: { ...context.config, ...configOverrides },
        },
        schema,
      });
    },
  };
}
