"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideXml = overrideXml;
const fast_xml_parser_1 = require("fast-xml-parser");
const runtime_input_handoff_1 = require("../../execution/runtime-input-handoff");
function mergeInputs(context) {
    return (0, runtime_input_handoff_1.mergeAuthoritativeInputs)(context);
}
function readPath(value, path) {
    if (!path)
        return value;
    return path.split('.').filter(Boolean).reduce((current, part) => {
        if (current === undefined || current === null)
            return undefined;
        if (Array.isArray(current)) {
            const index = Number(part);
            return Number.isInteger(index) ? current[index] : current.map((item) => item?.[part]);
        }
        return current[part];
    }, value);
}
function overrideXml(def, _schema) {
    const operationOptions = ['parse', 'extract'].map((value) => ({
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
            path: {
                type: 'string',
                description: 'Dot path used by extract after XML is parsed, e.g. root.item.0.name.',
                required: false,
                role: 'config',
                fillMode: { default: 'buildtime_ai_once', supportsRuntimeAI: false, supportsBuildtimeAI: true },
            },
        },
        execute: async (context) => {
            const inputs = mergeInputs(context);
            const operation = String(inputs.operation || 'parse');
            const xml = String(inputs.xml || inputs.content || '');
            try {
                if (!xml.trim())
                    throw new Error('xml is required');
                const parser = new fast_xml_parser_1.XMLParser({
                    ignoreAttributes: false,
                    attributeNamePrefix: '@_',
                    textNodeName: '#text',
                });
                const parsed = parser.parse(xml);
                if (operation === 'parse') {
                    return { success: true, output: { operation, data: parsed } };
                }
                if (operation === 'extract') {
                    const path = String(inputs.path || '').trim();
                    return { success: true, output: { operation, path, value: readPath(parsed, path) } };
                }
                throw new Error(`Unsupported XML operation: ${operation}`);
            }
            catch (error) {
                return { success: false, error: { code: 'XML_OPERATION_FAILED', message: error?.message || 'XML operation failed' } };
            }
        },
    };
}
