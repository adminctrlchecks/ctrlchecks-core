"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideGoogleGemini = overrideGoogleGemini;
const ai_shared_1 = require("./ai-shared");
function overrideGoogleGemini(def, schema) {
    const base = (0, ai_shared_1.overrideAiNodeWithIntentAwareSelection)(def, schema);
    // Ensure the Properties panel shows a "Gemini API Key" connection picker
    // (not Google OAuth2) and links it to the gemini_api_key credential type.
    const requirements = (base.credentialSchema?.requirements ?? []).map((req) => req.provider === 'gemini'
        ? { ...req, credentialTypeId: 'gemini_api_key', authType: 'api_key', label: 'Gemini API Key' }
        : req);
    // If no gemini requirement was extracted (node has no apiKey field in inputSchema),
    // inject one explicitly so the Properties panel always shows the picker.
    const hasGemini = requirements.some((r) => r.provider === 'gemini');
    if (!hasGemini) {
        requirements.push({
            provider: 'gemini',
            category: 'api_key',
            required: false,
            description: 'Gemini API key — leave empty to use the server default',
            credentialTypeId: 'gemini_api_key',
            authType: 'api_key',
            label: 'Gemini API Key',
        });
    }
    return {
        ...base,
        credentialSchema: {
            ...(base.credentialSchema ?? { credentialFields: [] }),
            requirements,
        },
    };
}
