"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInputControlMetadata = getInputControlMetadata;
const schema_field_control_1 = require("./schema-field-control");
function toOptions(options) {
    if (!Array.isArray(options) || options.length === 0) {
        return undefined;
    }
    return options
        .filter((opt) => opt && opt.value !== undefined && opt.value !== null)
        .map((opt) => ({
        label: String(opt.label ?? opt.value),
        value: String(opt.value),
    }));
}
function getInputControlMetadata(fieldName, fieldDef) {
    const description = fieldDef?.description || fieldName;
    const widget = fieldDef?.ui?.widget;
    const explicitOptions = toOptions(fieldDef?.ui?.options);
    if (widget === 'textarea' || widget === 'multi_email') {
        return { inputType: 'textarea', placeholder: description, uiWidget: widget };
    }
    if (widget === 'json') {
        return { inputType: 'textarea', placeholder: description, uiWidget: widget };
    }
    if (widget === 'date') {
        return { inputType: 'date', placeholder: 'YYYY-MM-DD', uiWidget: widget };
    }
    if ((0, schema_field_control_1.shouldUseSelectForExplicitOptions)(fieldName, { options: explicitOptions })) {
        return {
            inputType: 'select',
            options: explicitOptions,
            placeholder: `Select ${fieldName}`,
            uiWidget: widget,
        };
    }
    if (fieldDef?.type === 'number') {
        return { inputType: 'number', placeholder: description, uiWidget: widget };
    }
    if (fieldDef?.type === 'boolean') {
        return {
            inputType: 'select',
            options: [
                { label: 'True', value: 'true' },
                { label: 'False', value: 'false' },
            ],
            placeholder: description,
            uiWidget: widget,
        };
    }
    if (fieldDef?.type === 'array' || fieldDef?.type === 'object' || fieldDef?.type === 'json') {
        return { inputType: 'textarea', placeholder: description, uiWidget: widget };
    }
    const keyLower = fieldName.toLowerCase();
    if (keyLower.includes('password') ||
        keyLower.includes('secret') ||
        keyLower.includes('api_key') ||
        keyLower.includes('apikey') ||
        keyLower.includes('token')) {
        return { inputType: 'password', placeholder: description, uiWidget: widget };
    }
    if (fieldDef?.role === 'long_body') {
        return { inputType: 'textarea', placeholder: description, uiWidget: widget };
    }
    return { inputType: 'text', placeholder: description, uiWidget: widget };
}
