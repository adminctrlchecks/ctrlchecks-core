"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeGoogleSheetsWriteValues = normalizeGoogleSheetsWriteValues;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseJsonLike(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return undefined;
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{'))
        return value;
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return value;
    }
}
function resolveMaybeString(value, resolveTemplate) {
    if (typeof value !== 'string')
        return value;
    let resolved = value;
    if (resolveTemplate) {
        try {
            resolved = resolveTemplate(value);
        }
        catch {
            resolved = value;
        }
    }
    if (typeof resolved === 'string') {
        return parseJsonLike(resolved);
    }
    return resolved;
}
function hasUsableRows(rows) {
    return rows.some((row) => row.some((cell) => cell !== undefined && cell !== null && String(cell).length > 0));
}
function objectToRow(value) {
    const ignoredKeys = new Set(['_error', '_trigger']);
    return Object.entries(value)
        .filter(([key]) => !ignoredKeys.has(key))
        .map(([, cell]) => cell);
}
function toRows(value, resolveTemplate) {
    const resolved = resolveMaybeString(value, resolveTemplate);
    if (resolved === undefined || resolved === null) {
        return [];
    }
    if (Array.isArray(resolved)) {
        if (resolved.length === 0)
            return [];
        if (resolved.every((row) => Array.isArray(row))) {
            return resolved;
        }
        if (resolved.every(isRecord)) {
            return resolved.map(objectToRow);
        }
        return [resolved];
    }
    if (isRecord(resolved)) {
        const nestedCandidates = [
            resolved.values,
            resolved.data,
            resolved.rows,
            resolved.items,
            isRecord(resolved.google_sheets) ? resolved.google_sheets.values : undefined,
            isRecord(resolved.google_sheets) ? resolved.google_sheets.rows : undefined,
        ];
        for (const candidate of nestedCandidates) {
            const rows = toRows(candidate, resolveTemplate);
            if (hasUsableRows(rows))
                return rows;
        }
        return [objectToRow(resolved)];
    }
    return [[resolved]];
}
function normalizeGoogleSheetsWriteValues({ values, data, fallbackInput, resolveTemplate, }) {
    const candidates = [data, values, fallbackInput];
    for (const candidate of candidates) {
        const rows = toRows(candidate, resolveTemplate);
        if (hasUsableRows(rows))
            return rows;
    }
    return [];
}
