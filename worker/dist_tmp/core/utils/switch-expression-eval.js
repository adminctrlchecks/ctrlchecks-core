"use strict";
/**
 * Switch-only expression evaluation for legacy execute path.
 * Supports simple field paths ({{$json.response}}) and lightweight JS in {{ ... }} for routing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateSwitchRoutingExpression = evaluateSwitchRoutingExpression;
const typed_execution_context_1 = require("../execution/typed-execution-context");
const typed_value_resolver_1 = require("../execution/typed-value-resolver");
function looksLikeJavaScriptExpression(expression) {
    return /(?:[!=<>]=?|&&|\|\||[+\-*/%]|\[|\]|\b(?:true|false|null|undefined)\b|['"])/.test(expression);
}
function buildInputAlias(json, variables) {
    const item = { json };
    const base = {
        item,
        json,
        first: () => item,
        all: () => [item],
    };
    const existing = variables.$input;
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
        return { ...base, ...existing };
    }
    return base;
}
/**
 * Evaluate Switch `expression` config against the current execution context.
 * Used only by the `switch` case in execute-workflow legacy executor.
 */
function evaluateSwitchRoutingExpression(expression, context) {
    const trimmed = (expression || '').trim();
    if (!trimmed) {
        return null;
    }
    const single = trimmed.match(/^\{\{([^}]+)\}\}$/);
    const inner = single ? single[1].trim() : trimmed;
    if (single && (0, typed_value_resolver_1.isBareFieldPathString)(inner) && !inner.startsWith('$input.')) {
        return (0, typed_execution_context_1.getContextValue)(context, inner);
    }
    const resolved = (0, typed_value_resolver_1.resolveTypedValue)(expression, context);
    if (resolved !== null && resolved !== undefined && resolved !== '') {
        return resolved;
    }
    if (single && (inner.startsWith('$input.') || /[?:()]/.test(inner) || looksLikeJavaScriptExpression(inner))) {
        try {
            const $json = context.variables.$json ??
                context.variables.json ??
                (context.lastOutput && typeof context.lastOutput === 'object' && !Array.isArray(context.lastOutput)
                    ? context.lastOutput
                    : {});
            const json = $json;
            const input = context.variables;
            const $input = buildInputAlias($json, context.variables);
            const fn = new Function('$json', 'json', 'input', '$input', `return (${inner});`);
            return fn($json, json, input, $input);
        }
        catch {
            return null;
        }
    }
    return resolved;
}
