"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSetVariable = overrideSetVariable;
function resolveJsonTemplates(template, json) {
    return template.replace(/\{\{\s*\$json\.([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => {
        const keys = path.split('.');
        let val = json;
        for (const k of keys) {
            val = val?.[k];
        }
        return val !== undefined && val !== null ? String(val) : '';
    });
}
function overrideSetVariable(def, _schema) {
    return {
        ...def,
        execute: async (context) => {
            const cfg = context.config;
            const rawInput = (context.rawInput &&
                typeof context.rawInput === 'object' &&
                !Array.isArray(context.rawInput)) ? context.rawInput : {};
            const inputObj = context.inputs ?? {};
            const keepSource = cfg.keepSource === true || cfg.keepSource === 'true';
            // Handle values as [{name, value}] array (UI format)
            if (Array.isArray(cfg.values) && cfg.values.length > 0) {
                const result = keepSource ? { ...inputObj } : {};
                for (const entry of cfg.values) {
                    const varName = String(entry?.name ?? '');
                    if (!varName)
                        continue;
                    const rawValue = entry?.value ?? '';
                    result[varName] = typeof rawValue === 'string'
                        ? resolveJsonTemplates(rawValue, rawInput)
                        : rawValue;
                }
                return { success: true, output: result };
            }
            const varName = String(cfg.name ?? '');
            if (!varName) {
                return { success: false, error: { code: 'SET_VARIABLE_CONFIG_INVALID', message: 'name is required' } };
            }
            const rawValue = cfg.value ?? '';
            const value = typeof rawValue === 'string'
                ? resolveJsonTemplates(rawValue, rawInput)
                : rawValue;
            return { success: true, output: { ...(keepSource ? inputObj : {}), [varName]: value } };
        },
    };
}
