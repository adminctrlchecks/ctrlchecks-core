"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideAiAgent = overrideAiAgent;
const runtime_input_handoff_1 = require("../../execution/runtime-input-handoff");
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideAiAgent(def, schema) {
    const nextInputSchema = { ...def.inputSchema };
    const userInputDef = nextInputSchema.userInput || {
        type: 'string',
        description: 'User input or prompt for the AI agent',
        required: false,
    };
    const chatModelDef = nextInputSchema.chat_model || {
        type: 'object',
        description: 'Optional chat model configuration',
        required: false,
    };
    const memoryDef = nextInputSchema.memory || {
        type: 'object',
        description: 'Optional memory context',
        required: false,
    };
    const toolDef = nextInputSchema.tool || {
        type: 'object',
        description: 'Optional tool context',
        required: false,
    };
    nextInputSchema.userInput = { ...userInputDef, required: false };
    nextInputSchema.chat_model = {
        ...chatModelDef,
        required: false,
        default: chatModelDef.default || { provider: 'gemini', model: 'gemini-3.5-flash' },
        fillMode: {
            default: 'buildtime_ai_once',
            supportsRuntimeAI: false,
            supportsBuildtimeAI: true,
        },
    };
    nextInputSchema.memory = { ...memoryDef, required: false };
    nextInputSchema.tool = { ...toolDef, required: false };
    return {
        ...def,
        inputSchema: nextInputSchema,
        // Make AI Agent work as a normal AI service node: only text input is needed at runtime.
        requiredInputs: [],
        execute: async (context) => {
            const authoritativeInputs = (0, runtime_input_handoff_1.getAuthoritativeInputs)(context);
            const raw = context.rawInput;
            const rawObj = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
                ? raw
                : {};
            const resolvedUserInput = (typeof authoritativeInputs.userInput === 'string' && authoritativeInputs.userInput) ||
                (typeof rawObj.message === 'string' && rawObj.message) ||
                (typeof rawObj.text === 'string' && rawObj.text) ||
                (typeof rawObj.input === 'string' && rawObj.input) ||
                (typeof raw === 'string' ? raw : '') ||
                '';
            const mergedInputs = {
                ...authoritativeInputs,
                userInput: resolvedUserInput,
                chat_model: authoritativeInputs.chat_model || context.config?.chat_model || { provider: 'gemini', model: 'gemini-3.5-flash' },
            };
            // Keep memory/tool optional and disabled by default to avoid missing-field failures.
            const mergedConfig = {
                ...context.config,
                enableMemory: context.config?.enableMemory ?? false,
                enableTools: context.config?.enableTools ?? false,
            };
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({
                context: {
                    ...context,
                    config: mergedConfig,
                    inputs: mergedInputs,
                },
                schema,
            });
        },
    };
}
