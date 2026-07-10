"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_MODELS = exports.GEMINI_LITE_MODEL = exports.GEMINI_PRO_MODEL = exports.GEMINI_DEFAULT_MODEL = void 0;
exports.normalizeGeminiModel = normalizeGeminiModel;
exports.getGeminiFallbackModels = getGeminiFallbackModels;
exports.GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash';
exports.GEMINI_PRO_MODEL = 'gemini-3.1-pro-preview';
exports.GEMINI_LITE_MODEL = 'gemini-3.1-flash-lite';
exports.GEMINI_MODELS = [
    exports.GEMINI_DEFAULT_MODEL,
    exports.GEMINI_PRO_MODEL,
    exports.GEMINI_LITE_MODEL,
];
const GEMINI_MODEL_ALIASES = {
    'gemini-1.5-flash': exports.GEMINI_DEFAULT_MODEL,
    'gemini-2.5-flash': exports.GEMINI_DEFAULT_MODEL,
    'gemini-3.5-flash': exports.GEMINI_DEFAULT_MODEL,
    'gemini-3-flash': exports.GEMINI_DEFAULT_MODEL,
    'gemini-pro': exports.GEMINI_PRO_MODEL,
    'gemini-1.5-pro': exports.GEMINI_PRO_MODEL,
    'gemini-2.5-pro': exports.GEMINI_PRO_MODEL,
    'gemini-3.1-pro': exports.GEMINI_PRO_MODEL,
    'gemini-3.1-pro-preview': exports.GEMINI_PRO_MODEL,
    'gemini-2.0-flash-lite': exports.GEMINI_LITE_MODEL,
    'gemini-2.5-flash-lite': exports.GEMINI_LITE_MODEL,
    'gemini-3-flash-preview': exports.GEMINI_LITE_MODEL,
    'gemini-3.1-flash-lite': exports.GEMINI_LITE_MODEL,
    'gemini-3.1-flash-lite-preview': exports.GEMINI_LITE_MODEL,
};
function normalizeGeminiModel(model) {
    if (!model)
        return exports.GEMINI_DEFAULT_MODEL;
    return GEMINI_MODEL_ALIASES[model] || exports.GEMINI_DEFAULT_MODEL;
}
function getGeminiFallbackModels(primaryModel) {
    const primary = normalizeGeminiModel(primaryModel);
    return exports.GEMINI_MODELS.filter((model) => model !== primary);
}
