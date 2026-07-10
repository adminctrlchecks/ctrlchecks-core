"use strict";
/**
 * ✅ CHAT TRIGGER NODE - Migrated to Registry
 *
 * Chat trigger extracts message from input.
 * Used for chat-based workflow triggers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideChatTrigger = overrideChatTrigger;
function overrideChatTrigger(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            // Prefer raw runtime payload (chat webhook/chat UI input), then resolved inputs.
            const sourceInput = context.rawInput ?? context.inputs ?? {};
            // Extract input object
            const inputObj = typeof sourceInput === 'object' && sourceInput !== null && !Array.isArray(sourceInput)
                ? sourceInput
                : {};
            // Extract message from input (chat API or manual execution)
            const message = inputObj.message ||
                inputObj.text ||
                inputObj.input ||
                (typeof sourceInput === 'string' ? sourceInput : '') ||
                '';
            const channel = (typeof inputObj.sessionId === 'string' && inputObj.sessionId) ||
                (typeof inputObj.channel === 'string' && inputObj.channel) ||
                '';
            // Return structured output so downstream nodes can reference trigger.message reliably.
            return {
                success: true,
                output: {
                    message,
                    channel,
                    sessionId: inputObj.sessionId || '',
                    trigger: inputObj.trigger || 'chat',
                    node_id: inputObj.node_id || '',
                    workflow_id: inputObj.workflow_id || '',
                    timestamp: inputObj.timestamp || new Date().toISOString(),
                    _chat: Boolean(inputObj._chat ?? true),
                },
            };
        },
    };
}
