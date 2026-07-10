"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideAnthropicClaude = overrideAnthropicClaude;
const ai_shared_1 = require("./ai-shared");
function overrideAnthropicClaude(def, schema) {
    return (0, ai_shared_1.overrideAiNodeWithIntentAwareSelection)(def, schema);
}
