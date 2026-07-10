"use strict";
/**
 * ✅ ODOO NODE - Migrated to Registry
 *
 * Odoo ERP integration node.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideOdoo = overrideOdoo;
const odooNode_1 = require("../../../services/database/odooNode");
const runtime_input_handoff_1 = require("../../execution/runtime-input-handoff");
function overrideOdoo(def, schema) {
    const manualStatic = {
        default: 'manual_static',
        supportsRuntimeAI: false,
        supportsBuildtimeAI: false,
    };
    const buildtime = {
        default: 'buildtime_ai_once',
        supportsRuntimeAI: false,
        supportsBuildtimeAI: true,
    };
    const inputSchema = {
        ...def.inputSchema,
        url: {
            type: 'string',
            description: 'Odoo base URL, for example https://yourcompany.odoo.com',
            required: true,
            ownership: 'value',
            role: 'config',
            helpCategory: 'base_url',
            fillMode: manualStatic,
            examples: ['https://yourcompany.odoo.com'],
        },
        db: {
            type: 'string',
            description: 'Odoo database name',
            required: true,
            ownership: 'value',
            role: 'config',
            fillMode: manualStatic,
        },
        username: {
            type: 'string',
            description: 'Odoo username or login email',
            required: true,
            ownership: 'credential',
            role: 'credential',
            fillMode: manualStatic,
        },
        password: {
            type: 'string',
            description: 'Odoo password or API key',
            required: true,
            ownership: 'credential',
            role: 'credential',
            helpCategory: 'generic_credential',
            fillMode: manualStatic,
        },
        operation: {
            ...def.inputSchema.operation,
            ui: {
                ...(def.inputSchema.operation?.ui || {}),
                options: [
                    { label: 'Get Records', value: 'getRecords' },
                    { label: 'Create Record', value: 'createRecord' },
                    { label: 'Update Record', value: 'updateRecord' },
                    { label: 'Delete Record', value: 'deleteRecord' },
                    { label: 'Execute Method', value: 'executeMethod' },
                ],
            },
            fillMode: buildtime,
            ownership: 'structural',
        },
    };
    return {
        ...def,
        inputSchema,
        requiredInputs: Array.from(new Set([...(def.requiredInputs || []), 'url', 'db', 'username', 'password'])),
        credentialSchema: {
            requirements: [
                {
                    provider: 'odoo',
                    category: 'credential',
                    required: true,
                    description: 'Odoo username and password/API key',
                },
            ],
            credentialFields: ['username', 'password'],
        },
        execute: async (context) => {
            const inputs = (0, runtime_input_handoff_1.mergeAuthoritativeInputs)(context);
            const result = await (0, odooNode_1.runOdooNode)({ ...context, inputs });
            if (result?.success === false) {
                return {
                    success: false,
                    error: {
                        code: 'ODOO_OPERATION_FAILED',
                        message: result?.error?.message || 'Odoo operation failed',
                        details: result,
                    },
                };
            }
            return { success: true, output: result };
        },
    };
}
