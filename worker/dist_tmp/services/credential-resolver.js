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
exports.credentialResolver = void 0;
exports.__setCredentialQueryForTests = __setCredentialQueryForTests;
exports.resolveCredential = resolveCredential;
exports.resolveCredentialDryRun = resolveCredentialDryRun;
exports.upsertUnifiedCredential = upsertUnifiedCredential;
exports.formatCredentialError = formatCredentialError;
const db_pool_1 = require("../core/database/db-pool");
const token_encryption_1 = require("../core/utils/token-encryption");
const credential_errors_1 = require("./credential-errors");
const credential_scope_registry_1 = require("./credential-scope-registry");
const user_id_normalizer_1 = require("./user-id-normalizer");
const credential_type_registry_1 = require("../credentials-system/credential-type-registry");
const FIVE_MINUTES_MS = 5 * 60 * 1000;
let queryCredentials = db_pool_1.queryAsService;
function __setCredentialQueryForTests(query) {
    queryCredentials = query || db_pool_1.queryAsService;
}
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function isDbUnavailableError(error) {
    return error instanceof db_pool_1.DbUnavailableError || error?.code === 'DB_UNAVAILABLE';
}
async function canRecoverDbCircuit(error) {
    if (!isDbUnavailableError(error))
        return false;
    if (queryCredentials !== db_pool_1.queryAsService)
        return false;
    return (0, db_pool_1.isDatabaseReachable)().catch(() => false);
}
async function queryCredentialStore(sql, params, context) {
    try {
        return await queryCredentials(sql, params);
    }
    catch (error) {
        if (await canRecoverDbCircuit(error)) {
            try {
                return await queryCredentials(sql, params);
            }
            catch (retryError) {
                throw new credential_errors_1.CredentialStorageError({
                    ...context,
                    causeMessage: getErrorMessage(retryError),
                });
            }
        }
        throw new credential_errors_1.CredentialStorageError({
            ...context,
            causeMessage: getErrorMessage(error),
        });
    }
}
function safeDecryptToken(value) {
    if (!value)
        return null;
    return (0, token_encryption_1.decryptToken)(value);
}
function normalizeProviderScopes(provider, scopes = []) {
    return (0, credential_scope_registry_1.requiredScopesForProvider)(provider, scopes);
}
function getOAuthDefinition(provider) {
    const normalized = (0, credential_scope_registry_1.normalizeProvider)(provider);
    return credential_type_registry_1.credentialTypeDefinitions.find((definition) => (definition.provider === normalized &&
        definition.authType === 'oauth2' &&
        definition.oauth2))?.oauth2;
}
async function refreshCredential(row, requiredScopes, action) {
    const provider = (0, credential_scope_registry_1.normalizeProvider)(row.provider);
    const refreshToken = safeDecryptToken(row.refresh_token);
    const context = { userId: row.user_id, provider, requiredScopes, action, resolverStep: 'refresh' };
    if (!refreshToken) {
        await markCredentialInactive(row.id, context);
        await deleteConnectionByUnifiedCredentialId(row.id, row.user_id);
        throw new credential_errors_1.CredentialExpiredError(context);
    }
    const oauth = getOAuthDefinition(provider);
    if (!oauth) {
        await markCredentialInactive(row.id, context);
        await deleteConnectionByUnifiedCredentialId(row.id, row.user_id);
        throw new credential_errors_1.CredentialRefreshError({ ...context, causeMessage: 'No OAuth refresh configuration found' });
    }
    const clientId = process.env[oauth.clientIdEnv];
    const clientSecret = process.env[oauth.clientSecretEnv];
    if (!clientId || !clientSecret) {
        throw new credential_errors_1.CredentialRefreshError({ ...context, causeMessage: 'OAuth client env vars are missing' });
    }
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
    });
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (oauth.tokenAuthMethod === 'basic') {
        headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
    }
    else {
        body.set('client_secret', clientSecret);
    }
    const response = await fetch(oauth.tokenUrl, { method: 'POST', headers, body });
    if (!response.ok) {
        await markCredentialInactive(row.id, context);
        await deleteConnectionByUnifiedCredentialId(row.id, row.user_id);
        throw new credential_errors_1.CredentialExpiredError({ ...context, causeMessage: await response.text().catch(() => response.statusText) });
    }
    const tokenResponse = await response.json();
    const accessToken = String(tokenResponse.access_token || '');
    if (!accessToken) {
        await markCredentialInactive(row.id, context);
        await deleteConnectionByUnifiedCredentialId(row.id, row.user_id);
        throw new credential_errors_1.CredentialRefreshError({ ...context, causeMessage: 'Refresh response did not include access_token' });
    }
    const expiresAt = tokenResponse.expires_in
        ? new Date(Date.now() + Number(tokenResponse.expires_in) * 1000)
        : null;
    const nextRefreshToken = tokenResponse.refresh_token ? String(tokenResponse.refresh_token) : refreshToken;
    await queryCredentialStore(`UPDATE unified_credentials
        SET access_token = $1,
            refresh_token = $2,
            expires_at = $3,
            raw_token_blob = $4,
            is_active = true,
            updated_at = NOW()
      WHERE id = $5`, [
        (0, token_encryption_1.encryptToken)(accessToken),
        nextRefreshToken ? (0, token_encryption_1.encryptToken)(nextRefreshToken) : null,
        expiresAt ? expiresAt.toISOString() : null,
        { encrypted: true, value: (0, token_encryption_1.encryptToken)(JSON.stringify(tokenResponse)) },
        row.id,
    ], context);
    return {
        id: row.id,
        userId: row.user_id,
        provider,
        scopes: (0, credential_scope_registry_1.splitScopeSet)(row.scope_set),
        accessToken,
        refreshToken: nextRefreshToken,
        expiresAt,
        source: row.source,
    };
}
async function markCredentialInactive(id, context) {
    await queryCredentialStore(`UPDATE unified_credentials SET is_active = false, updated_at = NOW() WHERE id = $1`, [id], context);
}
async function deleteConnectionByUnifiedCredentialId(ucId, userId) {
    try {
        const rows = await queryCredentialStore(`SELECT c.id
       FROM connections c
       JOIN unified_credentials uc ON uc.user_id = c.user_id AND uc.provider = c.provider
       WHERE uc.id = $1 AND c.user_id = $2 AND c.status <> 'revoked'
       LIMIT 1`, [ucId, userId], { userId, provider: '', requiredScopes: [], resolverStep: 'delete_by_uc_id' });
        if (rows[0]) {
            const { connectionService } = await Promise.resolve().then(() => __importStar(require('../credentials-system/connection-service')));
            await connectionService.deleteConnection(userId, rows[0].id);
        }
    }
    catch {
        // Best-effort — do not surface deletion errors to the caller
    }
}
async function resolveCredential(input) {
    const provider = (0, credential_scope_registry_1.normalizeProvider)(input.provider);
    const userId = await (0, user_id_normalizer_1.normalizeCredentialUserId)(input.userId);
    const requiredScopes = normalizeProviderScopes(provider, input.requiredScopes);
    const context = { userId, provider, requiredScopes, action: input.action, resolverStep: 'unified_credentials' };
    const rows = await queryCredentialStore(`SELECT id, user_id, provider, scope_set, access_token, refresh_token, expires_at, source, updated_at
       FROM unified_credentials
      WHERE user_id = $1
        AND provider = $2
        AND is_active = true
      ORDER BY cardinality(string_to_array(scope_set, '+')) DESC, updated_at DESC
      LIMIT 20`, [userId, provider], context);
    const availableScopes = Array.from(new Set(rows.flatMap((row) => (0, credential_scope_registry_1.splitScopeSet)(row.scope_set))));
    const row = rows.find((candidate) => (0, credential_scope_registry_1.scopesCover)((0, credential_scope_registry_1.splitScopeSet)(candidate.scope_set), requiredScopes));
    if (!row) {
        if (rows.length > 0)
            throw new credential_errors_1.CredentialMissingScopeError(context, availableScopes);
        throw new credential_errors_1.CredentialNotFoundError(context);
    }
    const accessToken = safeDecryptToken(row.access_token);
    if (!accessToken)
        throw new credential_errors_1.CredentialNotFoundError({ ...context, resolverStep: 'access_token' });
    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    const isExpiring = expiresAt ? expiresAt.getTime() <= Date.now() + FIVE_MINUTES_MS : false;
    if (isExpiring)
        return refreshCredential(row, requiredScopes, input.action);
    return {
        id: row.id,
        userId,
        provider,
        scopes: (0, credential_scope_registry_1.splitScopeSet)(row.scope_set),
        accessToken,
        refreshToken: safeDecryptToken(row.refresh_token),
        expiresAt,
        source: row.source,
    };
}
async function resolveCredentialDryRun(input) {
    const credential = await resolveCredential({ ...input, dryRun: true });
    return {
        id: credential.id,
        userId: credential.userId,
        provider: credential.provider,
        scopes: credential.scopes,
        expiresAt: credential.expiresAt,
        source: credential.source,
    };
}
async function upsertUnifiedCredential(input) {
    const userId = await (0, user_id_normalizer_1.normalizeCredentialUserId)(input.userId, input.email);
    const provider = (0, credential_scope_registry_1.normalizeProvider)(input.provider);
    const scopes = normalizeProviderScopes(provider, input.scopes);
    const set = (0, credential_scope_registry_1.scopeSet)(scopes);
    const expiresAt = input.expiresAt instanceof Date ? input.expiresAt.toISOString() : input.expiresAt || null;
    const rawTokenBlob = input.rawTokenBlob
        ? { encrypted: true, value: (0, token_encryption_1.encryptToken)(JSON.stringify(input.rawTokenBlob)) }
        : null;
    const context = { userId, provider, requiredScopes: scopes, resolverStep: 'upsertUnifiedCredential' };
    const rows = await queryCredentialStore(`INSERT INTO unified_credentials (
        user_id, provider, scope_set, access_token, refresh_token, expires_at, raw_token_blob, source, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      ON CONFLICT (user_id, provider, scope_set)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, unified_credentials.refresh_token),
        expires_at = EXCLUDED.expires_at,
        raw_token_blob = EXCLUDED.raw_token_blob,
        source = EXCLUDED.source,
        is_active = true,
        updated_at = NOW()
      RETURNING id`, [
        userId,
        provider,
        set,
        (0, token_encryption_1.encryptToken)(input.accessToken),
        input.refreshToken ? (0, token_encryption_1.encryptToken)(input.refreshToken) : null,
        expiresAt,
        rawTokenBlob,
        input.source,
    ], context);
    const id = rows[0]?.id;
    if (!id) {
        throw new credential_errors_1.CredentialStorageError({ ...context, causeMessage: 'No credential id returned from upsert' });
    }
    return id;
}
function formatCredentialError(error, action) {
    if (error && typeof error === 'object' && 'toJSON' in error && typeof error.toJSON === 'function') {
        return { ...error.toJSON(), action: action || error.context?.action };
    }
    return {
        error: 'CredentialError',
        action,
        message: error instanceof Error ? error.message : String(error),
    };
}
exports.credentialResolver = {
    resolveCredential,
    resolveCredentialDryRun,
    upsertUnifiedCredential,
};
