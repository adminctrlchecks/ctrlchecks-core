"use strict";
/**
 * Credential Retriever Utility
 *
 * Helper functions for nodes to retrieve credentials from the vault during execution.
 *
 * Features:
 * - Automatic decryption
 * - Access control validation
 * - Never logs secrets
 * - Supports workflow-specific and user-level credentials
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveCredential = retrieveCredential;
exports.retrieveCredentialWithMetadata = retrieveCredentialWithMetadata;
exports.credentialExists = credentialExists;
const credential_vault_1 = require("../../services/credential-vault");
const connection_service_1 = require("../../credentials-system/connection-service");
const credential_type_registry_1 = require("../../credentials-system/credential-type-registry");
const CONNECTION_SECRET_AUTH_TYPES = [
    'api_key',
    'bearer_token',
    'basic_auth',
    'custom_header',
    'query_auth',
];
const PROVIDER_ALIASES_BY_KEY = {
    discord_webhook: ['discord'],
    microsoft_teams: ['microsoft'],
    supabase: ['db'],
    api_key: ['generic'],
    bearer_token: ['generic'],
    basic_auth: ['generic'],
};
const CREDENTIAL_TYPE_SUFFIXES = [
    'api_key',
    'api_token',
    'bot_token',
    'app_password',
    'webhook',
    'credentials',
    'connection',
    'token',
    'pat',
    'api',
];
const SECRET_VALUE_KEYS = [
    'apiToken',
    'apiKey',
    'token',
    'secretKey',
    'accessToken',
    'authToken',
    'botToken',
    'appPassword',
    'password',
    'url',
    'value',
];
function unique(values) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
function stripCredentialSuffix(key) {
    for (const suffix of CREDENTIAL_TYPE_SUFFIXES) {
        const marker = `_${suffix}`;
        if (key.endsWith(marker) && key.length > marker.length) {
            return key.slice(0, -marker.length);
        }
    }
    return key;
}
function credentialTypeCandidatesForKey(key) {
    const normalized = key.trim().toLowerCase();
    const base = stripCredentialSuffix(normalized);
    const bases = unique([normalized, base]);
    const candidates = bases.flatMap((item) => [
        item,
        `${item}_api_key`,
        `${item}_api_token`,
        `${item}_bot_token`,
        `${item}_app_password`,
        `${item}_webhook`,
        `${item}_credentials`,
        `${item}_connection`,
        `${item}_token`,
        `${item}_pat`,
        `${item}_api`,
    ]);
    return unique(candidates).filter((credentialTypeId) => {
        const definition = (0, credential_type_registry_1.getCredentialType)(credentialTypeId);
        return !!definition && CONNECTION_SECRET_AUTH_TYPES.includes(definition.authType);
    });
}
function providerCandidatesForKey(key) {
    const normalized = key.trim().toLowerCase();
    const base = stripCredentialSuffix(normalized);
    return unique([
        ...(PROVIDER_ALIASES_BY_KEY[normalized] || []),
        ...(PROVIDER_ALIASES_BY_KEY[base] || []),
        normalized,
        base,
    ]);
}
function legacyCredentialValueFromConnection(connection) {
    const credentials = connection.credentials || {};
    const stringEntries = Object.entries(credentials)
        .filter((entry) => typeof entry[1] === 'string' && entry[1].trim().length > 0);
    if (stringEntries.length === 1) {
        return stringEntries[0][1].trim();
    }
    const secretEntries = SECRET_VALUE_KEYS
        .map((key) => [key, credentials[key]])
        .filter((entry) => typeof entry[1] === 'string' && entry[1].trim().length > 0);
    if (secretEntries.length === 1 && stringEntries.length === 1) {
        return secretEntries[0][1].trim();
    }
    return JSON.stringify(credentials);
}
async function retrieveConnectionCredential(context, key) {
    const userId = typeof context.userId === 'string' ? context.userId.trim() : '';
    if (!userId)
        return null;
    for (const credentialTypeId of credentialTypeCandidatesForKey(key)) {
        const record = await connection_service_1.connectionService.findCanonicalConnection(userId, credentialTypeId);
        if (!record)
            continue;
        const connection = await connection_service_1.connectionService.getDecryptedConnection(userId, record.id);
        return {
            value: legacyCredentialValueFromConnection(connection),
            metadata: {
                source: 'connections',
                connectionId: connection.id,
                credentialTypeId: connection.credentialTypeId,
                provider: connection.provider,
            },
        };
    }
    for (const provider of providerCandidatesForKey(key)) {
        const record = await connection_service_1.connectionService.findCanonicalConnectionByProvider(userId, provider, CONNECTION_SECRET_AUTH_TYPES);
        if (!record)
            continue;
        const connection = await connection_service_1.connectionService.getDecryptedConnection(userId, record.id);
        return {
            value: legacyCredentialValueFromConnection(connection),
            metadata: {
                source: 'connections',
                connectionId: connection.id,
                credentialTypeId: connection.credentialTypeId,
                provider: connection.provider,
            },
        };
    }
    return null;
}
/**
 * Retrieve credential for node execution
 *
 * @param context - Access context (userId, workflowId, nodeId, nodeType)
 * @param key - Credential key (e.g., 'google_oauth_gmail', 'openai_api_key')
 * @returns Decrypted credential value or null if not found
 */
async function retrieveCredential(context, key) {
    try {
        const vault = (0, credential_vault_1.getCredentialVault)();
        const value = await vault.retrieve(context, key);
        if (value)
            return value;
        const connectionCredential = await retrieveConnectionCredential(context, key);
        return connectionCredential?.value || null;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CredentialRetriever] Failed to retrieve credential ${key}:`, errorMessage);
        try {
            const connectionCredential = await retrieveConnectionCredential(context, key);
            return connectionCredential?.value || null;
        }
        catch {
            return null;
        }
    }
}
/**
 * Retrieve credential with metadata
 *
 * @param context - Access context
 * @param key - Credential key
 * @returns Credential value and metadata or null if not found
 */
async function retrieveCredentialWithMetadata(context, key) {
    try {
        const vault = (0, credential_vault_1.getCredentialVault)();
        const result = await vault.retrieveWithMetadata(context, key);
        if (result)
            return result;
        return await retrieveConnectionCredential(context, key);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CredentialRetriever] Failed to retrieve credential ${key}:`, errorMessage);
        try {
            return await retrieveConnectionCredential(context, key);
        }
        catch {
            return null;
        }
    }
}
/**
 * Check if credential exists
 *
 * @param context - Access context
 * @param key - Credential key
 * @returns True if credential exists
 */
async function credentialExists(context, key) {
    try {
        const vault = (0, credential_vault_1.getCredentialVault)();
        const exists = await vault.exists(context, key);
        if (exists)
            return true;
        return !!(await retrieveConnectionCredential(context, key));
    }
    catch (error) {
        console.error(`[CredentialRetriever] Failed to check credential ${key}:`, error);
        try {
            return !!(await retrieveConnectionCredential(context, key));
        }
        catch {
            return false;
        }
    }
}
