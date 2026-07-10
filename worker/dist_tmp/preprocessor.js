"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessPrompt = preprocessPrompt;
const text_normalization_1 = require("./core/utils/text-normalization");
/**
 * Preprocess user prompt before sending to the Planner Agent.
 *
 * Responsibilities:
 * - Normalize casing
 * - Expand common abbreviations (gsheet -> Google Sheets, hs -> HubSpot)
 * - Remove filler words
 * - Standardize verbs
 * - Remove punctuation noise
 */
function preprocessPrompt(raw) {
    if (!raw || typeof raw !== 'string') {
        return '';
    }
    // Basic normalization
    let text = (0, text_normalization_1.removeDiacritics)(raw).trim();
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ');
    // Lowercase for rule-based passes
    let lower = text.toLowerCase();
    // Expand common abbreviations (operate on lower, but preserve later casing)
    const abbreviationMap = {
        gsheet: 'google sheets',
        'g sheet': 'google sheets',
        gdocs: 'google docs',
        hs: 'hubspot',
        crm: 'crm',
    };
    Object.entries(abbreviationMap).forEach(([abbr, full]) => {
        const pattern = new RegExp(`\\b${abbr}\\b`, 'g');
        lower = lower.replace(pattern, full);
    });
    // Remove common filler words
    const fillerWords = [
        'hey',
        'hi',
        'hello',
        'pls',
        'please',
        'can you',
        'can u',
        'could you',
        'could u',
        'just',
        'kind of',
        'sort of',
        'like',
    ];
    for (const filler of fillerWords) {
        const pattern = new RegExp(`\\b${filler}\\b`, 'g');
        lower = lower.replace(pattern, ' ');
    }
    // Standardize verbs (get/fetch -> read)
    const verbMap = [
        { pattern: /\b(get|fetch|grab|pull)\b/g, replacement: 'read' },
        { pattern: /\bsend out\b/g, replacement: 'send' },
        { pattern: /\bstore\b/g, replacement: 'store' },
    ];
    for (const rule of verbMap) {
        lower = lower.replace(rule.pattern, rule.replacement);
    }
    // Remove punctuation noise while keeping basic separators
    lower = lower.replace(/[^\w\s@./:-]+/g, ' ');
    // Collapse whitespace again
    lower = lower.replace(/\s+/g, ' ').trim();
    // Re-capitalize service names for better LLM recognition
    const capitalizationMap = {
        'google sheets': 'Google Sheets',
        'google sheet': 'Google Sheets',
        hubspot: 'HubSpot',
        gmail: 'Gmail',
        'google calendar': 'Google Calendar',
    };
    let processed = lower;
    Object.entries(capitalizationMap).forEach(([rawToken, pretty]) => {
        const pattern = new RegExp(`\\b${rawToken}\\b`, 'gi');
        processed = processed.replace(pattern, pretty);
    });
    return processed;
}
exports.default = {
    preprocessPrompt,
};
