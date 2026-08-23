import type { UnifiedNodeDefinition } from '../../types/unified-node-contract';
import type { NodeSchema } from '../../../services/nodes/node-library';
import { overrideAiNodeWithIntentAwareSelection } from './ai-shared';
import { normalizeGeminiModel } from '../../../services/ai/gemini-models';

// ai_chat_model is Gemini-only (this node is widely used as a generic standalone "run one AI
// call" step across generated workflows — 'ai', 'ai_service', and legacy 'ollama' all alias to
// it — so it is NOT safe to open it up to other providers here; that blast radius is much
// bigger than the AI Agent's Chat Model sidecar slot). It previously force-overwrote
// config.model to 'gemini-3.5-flash' on every run, silently discarding whichever Gemini
// variant (Flash / Pro Preview / Flash-Lite) the user actually picked in the Model dropdown.
// Now it honors that selection via normalizeGeminiModel() — the single source of truth for
// valid/alias Gemini model names (worker/src/services/ai/gemini-models.ts) — instead of a
// second hardcoded copy of the model list here.

export function overrideAiChatModel(def: UnifiedNodeDefinition, schema: NodeSchema): UnifiedNodeDefinition {
  const baseDef = overrideAiNodeWithIntentAwareSelection(def, schema);

  const originalDefaultConfig = baseDef.defaultConfig;
  const fixedDefaultConfig = () => {
    const config = originalDefaultConfig();
    config.provider = 'gemini';
    config.model = normalizeGeminiModel(config.model);
    return config;
  };

  const originalValidateConfig = baseDef.validateConfig;
  const fixedValidateConfig = (config: Record<string, any>) => {
    // Gemini-only: pin the provider, but honor whichever supported Gemini model was selected.
    config.provider = 'gemini';
    config.model = normalizeGeminiModel(config.model);
    return originalValidateConfig(config);
  };

  return {
    ...baseDef,
    defaultConfig: fixedDefaultConfig,
    validateConfig: fixedValidateConfig,
  };
}

