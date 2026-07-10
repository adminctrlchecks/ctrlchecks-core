"use strict";
/**
 * Registry-driven alias fields: copy canonical → alias before strict runtime_ai validation.
 * See NodeInputField.aliasOf in unified-node-contract.ts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyInputAliasesFromSchema = applyInputAliasesFromSchema;
const fill_mode_resolver_1 = require("../utils/fill-mode-resolver");
function applyInputAliasesFromSchema(resolvedInputs, inputSchema) {
    const filled = [];
    // Canonical → alias (e.g. Slack: copy filled `message` into empty `text`)
    for (const [fieldName, def] of Object.entries(inputSchema)) {
        const aliasOf = def?.aliasOf;
        if (!aliasOf || typeof aliasOf !== 'string')
            continue;
        if ((0, fill_mode_resolver_1.isMeaningfulStaticValue)(resolvedInputs[fieldName]))
            continue;
        const canonical = resolvedInputs[aliasOf];
        if (!(0, fill_mode_resolver_1.isMeaningfulStaticValue)(canonical))
            continue;
        resolvedInputs[fieldName] = canonical;
        filled.push(fieldName);
    }
    // Alias → canonical when canonical is empty (e.g. runtime AI mapped plain text to `text` first; `message` is essential)
    for (const [fieldName, def] of Object.entries(inputSchema)) {
        const aliasOf = def?.aliasOf;
        if (!aliasOf || typeof aliasOf !== 'string')
            continue;
        if (!(0, fill_mode_resolver_1.isMeaningfulStaticValue)(resolvedInputs[fieldName]))
            continue;
        if ((0, fill_mode_resolver_1.isMeaningfulStaticValue)(resolvedInputs[aliasOf]))
            continue;
        resolvedInputs[aliasOf] = resolvedInputs[fieldName];
        filled.push(aliasOf);
    }
    return filled;
}
