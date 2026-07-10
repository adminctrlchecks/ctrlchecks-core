"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideOllama = overrideOllama;
const ai_shared_1 = require("./ai-shared");
function overrideOllama(def, schema) {
    return (0, ai_shared_1.overrideAiNodeWithIntentAwareSelection)(def, schema);
}
