"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideChatModel = overrideChatModel;
/**
 * chat_model is an internal support node used to back AI agent nodes.
 * Mark it as internal so planners/builders can exclude it from "business workflow" topology decisions.
 */
function overrideChatModel(def, _schema) {
    return {
        ...def,
        tags: Array.from(new Set([...(def.tags || []), 'internal'])),
    };
}
