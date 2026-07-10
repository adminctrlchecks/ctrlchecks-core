"use strict";
/**
 * ✅ LINKEDIN NODE - Migrated to Registry
 *
 * LinkedIn integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideLinkedin = overrideLinkedin;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideLinkedin(def, schema) {
    const operationOptions = [
        { label: 'Get My Profile', value: 'get_profile' },
        { label: 'Create Post', value: 'create_post' },
        { label: 'Create Post Media', value: 'create_post_media' },
        { label: 'Create Article', value: 'create_article' },
        { label: 'Delete Post', value: 'delete_post' },
    ];
    const operationContracts = [
        {
            operation: 'get_profile',
            label: 'Get My Profile',
            requiredFields: [],
            optionalFields: [],
            credentialProviders: ['linkedin'],
            outputFields: ['success', 'profile'],
            legacyAliases: ['get_me'],
            status: 'implemented',
        },
        {
            operation: 'create_post',
            label: 'Create Post',
            requiredFields: ['text'],
            optionalFields: ['personUrn', 'visibility'],
            credentialProviders: ['linkedin'],
            outputFields: ['success', 'postId'],
            legacyAliases: ['post'],
            status: 'implemented',
        },
        {
            operation: 'create_post_media',
            label: 'Create Post Media',
            requiredFields: ['mediaUrl'],
            optionalFields: ['text', 'personUrn', 'visibility'],
            credentialProviders: ['linkedin'],
            outputFields: ['success', 'postId', 'assetUrn'],
            legacyAliases: [],
            status: 'implemented',
        },
        {
            operation: 'create_article',
            label: 'Create Article',
            requiredFields: ['articleUrl'],
            optionalFields: ['text', 'personUrn', 'visibility'],
            credentialProviders: ['linkedin'],
            outputFields: ['success', 'postId'],
            legacyAliases: [],
            status: 'implemented',
        },
        {
            operation: 'delete_post',
            label: 'Delete Post',
            requiredFields: ['postId'],
            optionalFields: [],
            credentialProviders: ['linkedin'],
            outputFields: ['success', 'message'],
            legacyAliases: ['postUrn'],
            status: 'implemented',
        },
    ];
    return {
        ...def,
        credentialSchema: {
            requirements: [{
                    provider: 'linkedin',
                    category: 'oauth',
                    required: true,
                    description: 'LinkedIn OAuth connection',
                    credentialTypeId: 'linkedin_oauth2',
                    authType: 'oauth2',
                    label: 'LinkedIn Account',
                }],
            credentialFields: ['accessToken'],
        },
        inputSchema: {
            ...def.inputSchema,
            operation: {
                ...def.inputSchema.operation,
                default: 'create_post',
                ui: {
                    ...(def.inputSchema.operation?.ui || {}),
                    options: operationOptions,
                },
            },
        },
        operationContracts,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
