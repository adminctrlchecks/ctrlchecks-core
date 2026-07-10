"use strict";
/**
 * ✅ TWITTER NODE - Migrated to Registry
 *
 * Twitter/X integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideTwitter = overrideTwitter;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
const operationContracts = [
    {
        resource: 'tweet',
        operation: 'create',
        label: 'Create Tweet',
        requiredFields: ['resource', 'operation', 'text'],
        optionalFields: ['tweetId', 'query', 'accessToken', 'credentialId'],
        credentialProviders: ['twitter'],
        outputFields: ['data', 'success'],
        legacyAliases: [],
        status: 'implemented',
    },
    {
        resource: 'tweet',
        operation: 'get',
        label: 'Get Tweet',
        requiredFields: ['resource', 'operation', 'tweetId'],
        optionalFields: ['text', 'query', 'accessToken', 'credentialId'],
        credentialProviders: ['twitter'],
        outputFields: ['data'],
        legacyAliases: [],
        status: 'implemented',
    },
    {
        resource: 'tweet',
        operation: 'delete',
        label: 'Delete Tweet',
        requiredFields: ['resource', 'operation', 'tweetId'],
        optionalFields: ['text', 'query', 'accessToken', 'credentialId'],
        credentialProviders: ['twitter'],
        outputFields: ['data', 'success'],
        legacyAliases: [],
        status: 'implemented',
    },
    {
        resource: 'user',
        operation: 'get',
        label: 'Get User',
        requiredFields: ['resource', 'operation'],
        optionalFields: ['tweetId', 'text', 'query', 'accessToken', 'credentialId'],
        credentialProviders: ['twitter'],
        outputFields: ['data'],
        legacyAliases: [],
        status: 'implemented',
    },
    {
        resource: 'user',
        operation: 'getMe',
        label: 'Get My Profile',
        requiredFields: ['resource', 'operation'],
        optionalFields: ['tweetId', 'text', 'query', 'accessToken', 'credentialId'],
        credentialProviders: ['twitter'],
        outputFields: ['data'],
        legacyAliases: [],
        status: 'implemented',
    },
    {
        resource: 'search',
        operation: 'recent',
        label: 'Search Recent Tweets',
        requiredFields: ['resource', 'operation', 'query'],
        optionalFields: ['tweetId', 'text', 'accessToken', 'credentialId'],
        credentialProviders: ['twitter'],
        outputFields: ['data'],
        legacyAliases: ['searchRecent'],
        status: 'implemented',
    },
];
const resourceOptions = [
    { label: 'Tweet', value: 'tweet' },
    { label: 'User', value: 'user' },
    { label: 'Search', value: 'search' },
];
function overrideTwitter(def, schema) {
    return {
        ...def,
        credentialSchema: {
            requirements: [{
                    provider: 'twitter',
                    category: 'oauth',
                    required: true,
                    description: 'Twitter/X OAuth connection',
                    credentialTypeId: 'twitter_oauth2',
                    authType: 'oauth2',
                    label: 'Twitter/X Account',
                }],
            credentialFields: ['accessToken'],
        },
        inputSchema: {
            ...def.inputSchema,
            resource: {
                ...def.inputSchema.resource,
                type: 'string',
                required: true,
                default: 'tweet',
                ui: {
                    ...(def.inputSchema.resource?.ui || {}),
                    options: resourceOptions,
                },
            },
        },
        operationContracts,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
