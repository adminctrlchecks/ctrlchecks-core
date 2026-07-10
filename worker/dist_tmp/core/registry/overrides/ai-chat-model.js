"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideAiChatModel = overrideAiChatModel;
const ai_shared_1 = require("./ai-shared");
function overrideAiChatModel(def, schema) {
    const baseDef = (0, ai_shared_1.overrideAiNodeWithIntentAwareSelection)(def, schema);
    // ✅ MIGRATED: Always use Gemini 3.5 Flash (uses GEMINI_API_KEY)
    // Provider/model selection removed - no longer needed
    const originalDefaultConfig = baseDef.defaultConfig;
    const fixedDefaultConfig = () => {
        const config = originalDefaultConfig();
        // Always use Gemini 3.5 Flash
        config.provider = 'gemini';
        config.model = 'gemini-3.5-flash';
        return config;
    };
    // Remove provider/model validation - they're always set to Gemini
    const originalValidateConfig = baseDef.validateConfig;
    const fixedValidateConfig = (config) => {
        // Ensure provider/model are set to Gemini (for backward compatibility)
        config.provider = 'gemini';
        config.model = 'gemini-3.5-flash';
        return originalValidateConfig(config);
    };
    return {
        ...baseDef,
        defaultConfig: fixedDefaultConfig,
        validateConfig: fixedValidateConfig,
    };
}
