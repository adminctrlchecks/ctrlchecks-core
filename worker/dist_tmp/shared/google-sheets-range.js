"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveGoogleSheetsConfigString = resolveGoogleSheetsConfigString;
exports.quoteGoogleSheetName = quoteGoogleSheetName;
exports.isValidA1Range = isValidA1Range;
exports.buildGoogleSheetsRange = buildGoogleSheetsRange;
const EXPLICIT_TEMPLATE_RE = /\{\{|\$json\.|json\.|input\./;
const A1_RANGE_RE = /^(?:[A-Za-z]+\d+(?::[A-Za-z]+\d+)?|[A-Za-z]+(?::[A-Za-z]+)?|\d+(?::\d+)?)$/;
function resolveGoogleSheetsConfigString(value, resolveTemplate) {
    const trimmed = value.trim();
    if (!trimmed)
        return '';
    if (!EXPLICIT_TEMPLATE_RE.test(trimmed)) {
        return trimmed;
    }
    const resolved = resolveTemplate(trimmed);
    return String(resolved ?? '').trim();
}
function quoteGoogleSheetName(sheetName) {
    const trimmed = sheetName.trim();
    if (!trimmed)
        return '';
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed))
        return trimmed;
    return `'${trimmed.replace(/'/g, "''")}'`;
}
function isValidA1Range(range) {
    const trimmed = range.trim();
    if (!trimmed)
        return true;
    const rangePart = trimmed.includes('!') ? trimmed.split('!').pop() || '' : trimmed;
    return A1_RANGE_RE.test(rangePart.trim());
}
function buildGoogleSheetsRange(params) {
    const sheetName = (params.sheetName || '').trim();
    const range = (params.range || '').trim();
    const operation = (params.operation || '').trim().toLowerCase();
    if ((operation === 'write' || operation === 'update') && !range) {
        throw new Error('Range is required for write/update operations');
    }
    if (range && !isValidA1Range(range)) {
        throw new Error(`Invalid range "${range}". Use A1 notation like A1:D100, A:C, or 2:10. Put the tab name in Sheet Name, not in Range.`);
    }
    if (range.includes('!'))
        return range;
    if (sheetName && range)
        return `${quoteGoogleSheetName(sheetName)}!${range}`;
    if (sheetName)
        return quoteGoogleSheetName(sheetName);
    return range;
}
