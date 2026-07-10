"use strict";
/**
 * ✅ TWILIO NODE - Migrated to Registry
 *
 * Twilio SMS/voice integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideTwilio = overrideTwilio;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideTwilio(def, schema) {
    return {
        ...def,
        credentialSchema: {
            requirements: [{
                    provider: 'twilio',
                    category: 'api_key',
                    required: true,
                    description: 'Twilio Account SID + Auth Token',
                    credentialTypeId: 'twilio_api_key',
                    authType: 'basic_auth',
                    label: 'Twilio API Key',
                }],
            credentialFields: ['accountSid', 'authToken'],
        },
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
