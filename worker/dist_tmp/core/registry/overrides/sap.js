"use strict";
/**
 * ✅ SAP NODE - Registry Override
 *
 * SAP ERP/CRM integration via OData v2/v4 and REST APIs.
 * Supports SAP S/4HANA, SAP Business One, and SAP ECC.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSap = overrideSap;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideSap(def, schema) {
    return {
        ...def,
        tags: [...(def.tags || []), 'erp', 'enterprise', 'sap', 'odata'],
        inputSchema: {
            ...def.inputSchema,
            operation: def.inputSchema.operation
                ? {
                    ...def.inputSchema.operation,
                    ownership: 'structural',
                    fillMode: {
                        default: 'buildtime_ai_once',
                        supportsRuntimeAI: false,
                        supportsBuildtimeAI: true,
                    },
                }
                : def.inputSchema.operation,
            endpoint: def.inputSchema.endpoint
                ? {
                    ...def.inputSchema.endpoint,
                    ownership: 'structural',
                    fillMode: {
                        default: 'buildtime_ai_once',
                        supportsRuntimeAI: true,
                        supportsBuildtimeAI: true,
                    },
                }
                : def.inputSchema.endpoint,
            payload: def.inputSchema.payload
                ? {
                    ...def.inputSchema.payload,
                    ownership: 'value',
                    fillMode: {
                        default: 'buildtime_ai_once',
                        supportsRuntimeAI: true,
                        supportsBuildtimeAI: true,
                    },
                }
                : def.inputSchema.payload,
            baseUrl: def.inputSchema.baseUrl
                ? {
                    ...def.inputSchema.baseUrl,
                    ownership: 'value',
                    fillMode: {
                        default: 'manual_static',
                        supportsRuntimeAI: false,
                        supportsBuildtimeAI: false,
                    },
                }
                : def.inputSchema.baseUrl,
            accessToken: def.inputSchema.accessToken
                ? {
                    ...def.inputSchema.accessToken,
                    ownership: 'credential',
                    fillMode: {
                        default: 'manual_static',
                        supportsRuntimeAI: false,
                        supportsBuildtimeAI: false,
                    },
                }
                : def.inputSchema.accessToken,
            username: def.inputSchema.username
                ? {
                    ...def.inputSchema.username,
                    ownership: 'credential',
                    fillMode: {
                        default: 'manual_static',
                        supportsRuntimeAI: false,
                        supportsBuildtimeAI: false,
                    },
                }
                : def.inputSchema.username,
            password: def.inputSchema.password
                ? {
                    ...def.inputSchema.password,
                    ownership: 'credential',
                    fillMode: {
                        default: 'manual_static',
                        supportsRuntimeAI: false,
                        supportsBuildtimeAI: false,
                    },
                }
                : def.inputSchema.password,
        },
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
