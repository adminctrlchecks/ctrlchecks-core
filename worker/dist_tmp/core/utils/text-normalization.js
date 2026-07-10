"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDiacritics = removeDiacritics;
/**
 * Remove diacritic marks from a string while preserving base characters.
 *
 * Example: "Crème Brûlée" -> "Creme Brulee"
 */
function removeDiacritics(input) {
    if (typeof input !== 'string' || !input) {
        return '';
    }
    // Normalize to "decomposed" form and strip combining diacritical marks.
    return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
exports.default = {
    removeDiacritics,
};
