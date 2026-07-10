"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideHtml = overrideHtml;
const cheerio = __importStar(require("cheerio"));
const runtime_input_handoff_1 = require("../../execution/runtime-input-handoff");
function mergeInputs(context) {
    return (0, runtime_input_handoff_1.mergeAuthoritativeInputs)(context);
}
function overrideHtml(def, _schema) {
    const operationOptions = ['parse', 'extract', 'clean'].map((value) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        value,
    }));
    return {
        ...def,
        inputSchema: {
            ...def.inputSchema,
            operation: {
                ...def.inputSchema.operation,
                ui: { ...(def.inputSchema.operation?.ui || {}), options: operationOptions },
            },
            selector: {
                type: 'string',
                description: 'CSS selector used by extract. Omit to extract the whole document text.',
                required: false,
                role: 'config',
                fillMode: { default: 'buildtime_ai_once', supportsRuntimeAI: false, supportsBuildtimeAI: true },
            },
            attribute: {
                type: 'string',
                description: 'Optional attribute to extract from selected elements, e.g. href or src.',
                required: false,
                role: 'config',
                fillMode: { default: 'buildtime_ai_once', supportsRuntimeAI: false, supportsBuildtimeAI: true },
            },
        },
        execute: async (context) => {
            const inputs = mergeInputs(context);
            const operation = String(inputs.operation || 'parse');
            const html = String(inputs.html || inputs.content || '');
            try {
                if (!html.trim())
                    throw new Error('html is required');
                const $ = cheerio.load(html);
                if (operation === 'clean') {
                    $('script,style,noscript,iframe').remove();
                    return {
                        success: true,
                        output: {
                            operation,
                            html: $.html(),
                            text: $.root().text().replace(/\s+/g, ' ').trim(),
                        },
                    };
                }
                if (operation === 'extract') {
                    const selector = String(inputs.selector || 'body').trim() || 'body';
                    const attribute = String(inputs.attribute || '').trim();
                    const matches = $(selector)
                        .toArray()
                        .map((el) => {
                        const node = $(el);
                        return attribute
                            ? { value: node.attr(attribute) || '', text: node.text().trim(), html: node.html() || '' }
                            : { text: node.text().trim(), html: node.html() || '' };
                    });
                    return { success: true, output: { operation, selector, attribute: attribute || undefined, matches } };
                }
                if (operation === 'parse') {
                    const title = $('title').first().text().trim();
                    const headings = $('h1,h2,h3').toArray().map((el) => ({
                        tag: el.tagName.toLowerCase(),
                        text: $(el).text().trim(),
                    }));
                    const links = $('a[href]').toArray().map((el) => ({
                        text: $(el).text().trim(),
                        href: $(el).attr('href') || '',
                    }));
                    return {
                        success: true,
                        output: {
                            operation,
                            title,
                            text: $.root().text().replace(/\s+/g, ' ').trim(),
                            headings,
                            links,
                        },
                    };
                }
                throw new Error(`Unsupported HTML operation: ${operation}`);
            }
            catch (error) {
                return { success: false, error: { code: 'HTML_OPERATION_FAILED', message: error?.message || 'HTML operation failed' } };
            }
        },
    };
}
