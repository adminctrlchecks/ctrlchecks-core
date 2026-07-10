"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeLogOutputWithCache = executeLogOutputWithCache;
const typed_execution_context_1 = require("../typed-execution-context");
const typed_value_resolver_1 = require("../typed-value-resolver");
function getStringProperty(obj, key, defaultVal) {
    const v = obj[key];
    return typeof v === 'string' ? v : defaultVal;
}
/**
 * log_output / log execution without routing through executeNodeLegacy.
 * Config is expected to be template-resolved when produced by the registry adapter path.
 */
function executeLogOutputWithCache(config, input, nodeOutputs) {
    const message = getStringProperty(config, 'message', '');
    const level = getStringProperty(config, 'level', 'info');
    const execContext = (0, typed_execution_context_1.createExecutionContext)(input);
    Object.entries(nodeOutputs.getAll()).forEach(([nodeId, output]) => {
        (0, typed_execution_context_1.setNodeOutput)(execContext, nodeId, output);
    });
    // Restore lastOutput to current node's input so {{$json.field}} resolves correctly.
    // The setNodeOutput loop overwrites lastOutput with each previous node's output in
    // LRU iteration order, which is not guaranteed to be the immediate upstream node.
    execContext.lastOutput = input;
    const resolvedValue = (0, typed_value_resolver_1.resolveTypedValue)(message, execContext);
    let resolvedMessage;
    if (resolvedValue === null || resolvedValue === undefined) {
        resolvedMessage = String(resolvedValue);
    }
    else if (typeof resolvedValue === 'object') {
        try {
            resolvedMessage = JSON.stringify(resolvedValue, null, 2);
        }
        catch {
            resolvedMessage = String(resolvedValue);
        }
    }
    else {
        resolvedMessage = String(resolvedValue);
    }
    const logPrefix = `[LOG ${level.toUpperCase()}]`;
    switch (level) {
        case 'error':
            console.error(`${logPrefix} ${resolvedMessage}`);
            break;
        case 'warn':
            console.warn(`${logPrefix} ${resolvedMessage}`);
            break;
        case 'debug':
            console.debug(`${logPrefix} ${resolvedMessage}`);
            break;
        default:
            console.log(`${logPrefix} ${resolvedMessage}`);
    }
    return resolvedMessage;
}
