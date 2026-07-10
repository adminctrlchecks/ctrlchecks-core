"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideRenameKeys = overrideRenameKeys;
function normalizeMappings(mappingsRaw) {
    if (Array.isArray(mappingsRaw)) {
        const mappingsObj = {};
        for (const mapping of mappingsRaw) {
            if (mapping?.name !== undefined && mapping.name !== '') {
                mappingsObj[String(mapping.name)] = String(mapping.value ?? '');
            }
        }
        return mappingsObj;
    }
    if (!mappingsRaw || typeof mappingsRaw !== 'object')
        return {};
    return Object.fromEntries(Object.entries(mappingsRaw)
        .map(([from, to]) => [from, String(to ?? '')])
        .filter(([from, to]) => from !== '' && to !== ''));
}
function objectInput(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? { ...value }
        : {};
}
function overrideRenameKeys(def, _schema) {
    return {
        ...def,
        execute: async (context) => {
            const mappings = normalizeMappings(context.config?.mappings);
            const source = {
                ...objectInput(context.inputs),
                ...objectInput(context.rawInput),
            };
            const output = { ...source };
            for (const [from, to] of Object.entries(mappings)) {
                if (from in output) {
                    output[to] = output[from];
                    delete output[from];
                }
            }
            return { success: true, output };
        },
    };
}
