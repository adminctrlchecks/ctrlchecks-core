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
exports.connectionService = exports.ConnectionService = exports.ConnectionApiError = void 0;
const crypto_1 = require("crypto");
const db_pool_1 = require("../core/database/db-pool");
const secret_crypto_1 = require("./secret-crypto");
const credential_type_registry_1 = require("./credential-type-registry");
class ConnectionApiError extends Error {
    constructor(statusCode, code, message) {
        super(message);
        this.name = 'ConnectionApiError';
        this.statusCode = statusCode;
        this.code = code;
    }
}
exports.ConnectionApiError = ConnectionApiError;
function mapConnection(row) {
    const status = row.status;
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        credentialTypeId: row.credential_type_id,
        provider: row.provider,
        authType: row.auth_type,
        status,
        metadata: row.metadata || {},
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        replacedByConnectionId: row.replaced_by_connection_id,
        externalAccountId: row.external_account_id,
        externalAccountEmail: row.external_account_email,
        lastTestedAt: row.last_tested_at,
        lastUsedAt: row.last_used_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function normalizeCredentialPayload(definition, credentials) {
    if (definition.id !== 'openai_api_key')
        return credentials;
    const token = typeof credentials.token === 'string' && credentials.token.trim()
        ? credentials.token.trim()
        : typeof credentials.apiKey === 'string' && credentials.apiKey.trim()
            ? credentials.apiKey.trim()
            : credentials.token;
    const normalized = { ...credentials, token };
    delete normalized.apiKey;
    return normalized;
}
function shouldRefreshConnection(connection, definition) {
    if (!definition.refresh?.enabled || !definition.oauth2 || !connection.expiresAt)
        return false;
    const expiresAtMs = new Date(connection.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs))
        return false;
    const refreshBeforeMs = Math.max(0, definition.refresh.refreshBeforeSeconds || 0) * 1000;
    return expiresAtMs <= Date.now() + refreshBeforeMs;
}
class ConnectionService {
    listCredentialTypes() {
        return credential_type_registry_1.credentialTypeDefinitions.map((definition) => ({
            ...definition,
            inputFields: definition.inputFields.map((field) => ({ ...field })),
            guide: {
                ...definition.guide,
                prerequisites: [...definition.guide.prerequisites],
                steps: [...definition.guide.steps],
                securityNotes: [...definition.guide.securityNotes],
                fieldGuides: Object.fromEntries(Object.entries(definition.guide.fieldGuides).map(([name, guide]) => [
                    name,
                    { ...guide, notes: guide.notes ? [...guide.notes] : undefined },
                ])),
            },
        }));
    }
    async listConnections(userId) {
        const expiredRows = await (0, db_pool_1.queryAsService)(`SELECT id FROM connections
       WHERE user_id = $1
         AND (
           status = 'expired'
           OR (status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW())
         )`, [userId]);
        for (const row of expiredRows) {
            await this.deleteConnection(userId, row.id);
        }
        const rows = await (0, db_pool_1.queryAsService)(`SELECT id, user_id, name, credential_type_id, provider, auth_type, status, metadata,
              expires_at, last_tested_at, last_used_at, created_at, updated_at
       FROM connections
       WHERE user_id = $1
         AND status <> 'revoked'
       ORDER BY updated_at DESC`, [userId]);
        return rows
            .map(mapConnection)
            .filter((connection) => {
            const metadata = connection.metadata || {};
            return metadata.walletManaged !== true && metadata.hiddenFromConnections !== true;
        });
    }
    async findCanonicalConnection(userId, credentialTypeId) {
        const rows = await (0, db_pool_1.queryAsService)(`SELECT id, user_id, name, credential_type_id, provider, auth_type, status, metadata,
              expires_at, revoked_at, replaced_by_connection_id, external_account_id,
              external_account_email, last_tested_at, last_used_at, created_at, updated_at
       FROM connections
       WHERE user_id = $1
         AND credential_type_id = $2
         AND status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY
         last_used_at DESC NULLS LAST,
         updated_at DESC NULLS LAST
       LIMIT 1`, [userId, credentialTypeId]);
        return rows[0] ? mapConnection(rows[0]) : null;
    }
    async findCanonicalConnectionByProvider(userId, provider, authTypes) {
        const normalizedProvider = provider.trim().toLowerCase();
        if (!normalizedProvider)
            return null;
        const params = [userId, normalizedProvider];
        let authTypeFilter = '';
        if (authTypes?.length) {
            params.push(authTypes);
            authTypeFilter = `AND auth_type = ANY($3::text[])`;
        }
        const rows = await (0, db_pool_1.queryAsService)(`SELECT id, user_id, name, credential_type_id, provider, auth_type, status, metadata,
              expires_at, revoked_at, replaced_by_connection_id, external_account_id,
              external_account_email, last_tested_at, last_used_at, created_at, updated_at
       FROM connections
       WHERE user_id = $1
         AND provider = $2
         AND status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())
         ${authTypeFilter}
       ORDER BY
         last_used_at DESC NULLS LAST,
         updated_at DESC NULLS LAST
       LIMIT 1`, params);
        return rows[0] ? mapConnection(rows[0]) : null;
    }
    async createConnection(input) {
        const definition = (0, credential_type_registry_1.getCredentialType)(input.credentialTypeId);
        if (!definition)
            throw new Error(`Unknown credential type: ${input.credentialTypeId}`);
        const normalizedCredentials = normalizeCredentialPayload(definition, input.credentials);
        this.validateCredentials(definition, normalizedCredentials);
        const id = (0, crypto_1.randomUUID)();
        const rows = await (0, db_pool_1.queryAsService)(`INSERT INTO connections (
           id, user_id, name, credential_type_id, provider, auth_type, encrypted_credentials,
           status, metadata, expires_at, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8::jsonb, $9, NOW(), NOW())
         RETURNING id, user_id, name, credential_type_id, provider, auth_type, status, metadata,
                   expires_at, revoked_at, replaced_by_connection_id, external_account_id,
                   external_account_email, last_tested_at, last_used_at, created_at, updated_at`, [
            id,
            input.userId,
            input.name,
            definition.id,
            definition.provider,
            definition.authType,
            (0, secret_crypto_1.encryptJson)(normalizedCredentials),
            JSON.stringify(input.metadata || {}),
            input.expiresAt || null,
        ]);
        await this.audit(input.userId, id, 'connection.created', { credentialTypeId: definition.id });
        return mapConnection(rows[0]);
    }
    async updateConnection(userId, id, patch) {
        const existing = await this.getDecryptedConnection(userId, id);
        if (existing.status === 'revoked') {
            throw new ConnectionApiError(410, 'CONNECTION_REVOKED', 'Connection has been disconnected.');
        }
        const definition = (0, credential_type_registry_1.getCredentialType)(existing.credentialTypeId);
        if (!definition)
            throw new Error(`Unknown credential type: ${existing.credentialTypeId}`);
        const credentials = normalizeCredentialPayload(definition, patch.credentials ? { ...existing.credentials, ...patch.credentials } : existing.credentials);
        this.validateCredentials(definition, credentials);
        const rows = await (0, db_pool_1.queryAsService)(`UPDATE connections
       SET name = COALESCE($3, name),
           encrypted_credentials = $4,
           metadata = COALESCE($5::jsonb, metadata),
           status = COALESCE($6, status),
           expires_at = $7,
           external_account_id = COALESCE($8, external_account_id),
           external_account_email = COALESCE($9, external_account_email),
           updated_at = NOW()
       WHERE user_id = $1 AND id = $2
       RETURNING id, user_id, name, credential_type_id, provider, auth_type, status, metadata,
                 expires_at, revoked_at, replaced_by_connection_id, external_account_id,
                 external_account_email, last_tested_at, last_used_at, created_at, updated_at`, [
            userId,
            id,
            patch.name || null,
            (0, secret_crypto_1.encryptJson)(credentials),
            patch.metadata ? JSON.stringify(patch.metadata) : null,
            patch.status || null,
            patch.expiresAt === undefined ? existing.expiresAt : patch.expiresAt,
            patch.externalAccountId || null,
            patch.externalAccountEmail || null,
        ]);
        if (!rows[0])
            throw new Error('Connection not found');
        await this.audit(userId, id, 'connection.updated', { fields: Object.keys(patch) });
        return mapConnection(rows[0]);
    }
    async deleteConnection(userId, id) {
        // Fetch provider before deleting so we know what to clean up
        const rows = await (0, db_pool_1.queryAsService)(`SELECT provider FROM connections WHERE user_id = $1 AND id = $2 LIMIT 1`, [userId, id]);
        const provider = rows[0]?.provider;
        await (0, db_pool_1.queryAsService)(`DELETE FROM connections WHERE user_id = $1 AND id = $2`, [userId, id]);
        if (provider) {
            await Promise.allSettled([
                // unified_credentials (primary credential store for new OAuth flow)
                (0, db_pool_1.queryAsService)(`DELETE FROM unified_credentials WHERE user_id = $1 AND provider = $2`, [userId, provider]),
                // credential_vault (used by workflow execution via credential-retriever)
                (0, db_pool_1.queryAsService)(`DELETE FROM credential_vault WHERE user_id = $1 AND key = $2`, [userId, provider]),
                // user_credentials (legacy key-value store)
                (0, db_pool_1.queryAsService)(`DELETE FROM user_credentials WHERE user_id = $1 AND service = $2`, [userId, provider]),
                // provider-specific legacy token tables
                ...this.legacyTokenCleanup(userId, provider),
            ]);
        }
        await this.audit(userId, id, 'connection.deleted', { provider });
    }
    legacyTokenCleanup(userId, provider) {
        const noop = () => Promise.resolve();
        const del = (sql, params) => (0, db_pool_1.queryAsService)(sql, params).catch(noop);
        const cleanups = [];
        if (provider === 'google') {
            cleanups.push(del(`DELETE FROM google_oauth_tokens WHERE user_id = $1`, [userId]), del(`DELETE FROM social_tokens WHERE user_id = $1 AND provider = 'google'`, [userId]));
        }
        if (provider === 'linkedin') {
            cleanups.push(del(`DELETE FROM linkedin_oauth_tokens WHERE user_id = $1`, [userId]));
        }
        if (provider === 'notion') {
            cleanups.push(del(`DELETE FROM notion_oauth_tokens WHERE user_id = $1`, [userId]));
        }
        if (provider === 'twitter') {
            cleanups.push(del(`DELETE FROM twitter_oauth_tokens WHERE user_id = $1`, [userId]));
        }
        if (provider === 'instagram') {
            cleanups.push(del(`DELETE FROM instagram_oauth_tokens WHERE user_id = $1`, [userId]), del(`DELETE FROM facebook_oauth_tokens WHERE user_id = $1`, [userId]));
        }
        if (provider === 'salesforce') {
            cleanups.push(del(`DELETE FROM salesforce_oauth_tokens WHERE user_id = $1`, [userId]));
        }
        if (provider === 'facebook') {
            cleanups.push(del(`DELETE FROM facebook_oauth_tokens WHERE user_id = $1`, [userId]), del(`DELETE FROM social_tokens WHERE user_id = $1 AND provider = 'facebook'`, [userId]));
        }
        if (provider === 'whatsapp') {
            cleanups.push(del(`DELETE FROM whatsapp_oauth_tokens WHERE user_id = $1`, [userId]), del(`DELETE FROM facebook_oauth_tokens WHERE user_id = $1`, [userId]));
        }
        if (provider === 'zoho') {
            cleanups.push(del(`DELETE FROM zoho_oauth_tokens WHERE user_id = $1`, [userId]));
        }
        return cleanups;
    }
    async getDecryptedConnection(userId, id) {
        const rows = await (0, db_pool_1.queryAsService)(`SELECT id, user_id, name, credential_type_id, provider, auth_type, encrypted_credentials, status,
              metadata, expires_at, revoked_at, replaced_by_connection_id, external_account_id,
              external_account_email, last_tested_at, last_used_at, created_at, updated_at
       FROM connections
       WHERE user_id = $1 AND id = $2
       LIMIT 1`, [userId, id]);
        if (!rows[0])
            throw new Error('Connection not found');
        const mapped = mapConnection(rows[0]);
        if (mapped.status === 'revoked') {
            throw new ConnectionApiError(410, 'CONNECTION_REVOKED', 'Connection has been disconnected.');
        }
        const connection = { ...mapped, credentials: (0, secret_crypto_1.decryptJson)(rows[0].encrypted_credentials) };
        if (connection.status === 'revoked') {
            throw new ConnectionApiError(410, 'CONNECTION_REVOKED', 'Connection has been disconnected.');
        }
        return connection;
    }
    async markUsed(userId, id) {
        await (0, db_pool_1.queryAsService)(`UPDATE connections SET last_used_at = NOW() WHERE user_id = $1 AND id = $2`, [userId, id]);
    }
    async testConnection(userId, id) {
        const connection = await this.getDecryptedConnection(userId, id);
        const definition = (0, credential_type_registry_1.getCredentialType)(connection.credentialTypeId);
        if (!definition?.testRequest)
            return { ok: true, status: 200, message: 'No test request configured' };
        if (shouldRefreshConnection(connection, definition)) {
            const { oauthService } = await Promise.resolve().then(() => __importStar(require('./oauth-service')));
            await oauthService.refreshConnection(userId, id);
        }
        if (connection.status === 'error') {
            await (0, db_pool_1.queryAsService)(`UPDATE connections SET status = 'active', updated_at = NOW() WHERE user_id = $1 AND id = $2`, [userId, id]);
        }
        const { AuthInjectionEngine } = await Promise.resolve().then(() => __importStar(require('./execution-auth')));
        const authInjection = new AuthInjectionEngine(this);
        const request = await authInjection.injectIntoRequest({ userId, nodeId: 'connection-test', nodeType: 'connection-test', connectionId: id }, {
            method: definition.testRequest.method,
            url: definition.testRequest.url,
            headers: definition.testRequest.headers,
            query: definition.testRequest.query,
            body: definition.testRequest.body,
        });
        let response;
        const executeTestRequest = (runtimeRequest) => fetch(runtimeRequest.url, {
            method: runtimeRequest.method,
            headers: runtimeRequest.headers,
            body: runtimeRequest.body ? JSON.stringify(runtimeRequest.body) : undefined,
        });
        try {
            response = await executeTestRequest(request);
            if ((response.status === 401 || response.status === 403) && definition.refresh?.enabled && definition.oauth2) {
                const { oauthService } = await Promise.resolve().then(() => __importStar(require('./oauth-service')));
                await oauthService.refreshConnection(userId, id);
                const refreshedRequest = await authInjection.injectIntoRequest({ userId, nodeId: 'connection-test', nodeType: 'connection-test', connectionId: id }, {
                    method: definition.testRequest.method,
                    url: definition.testRequest.url,
                    headers: definition.testRequest.headers,
                    query: definition.testRequest.query,
                    body: definition.testRequest.body,
                });
                response = await executeTestRequest(refreshedRequest);
            }
        }
        catch {
            if (definition.id === 'openai_api_key') {
                return { ok: false, status: 503, message: 'OpenAI could not be reached.' };
            }
            throw new ConnectionApiError(503, 'CONNECTION_TEST_NETWORK_ERROR', 'Connection provider could not be reached.');
        }
        const successStatuses = definition.testRequest.successStatus || [200, 201, 204];
        const ok = successStatuses.includes(response.status);
        await (0, db_pool_1.queryAsService)(`UPDATE connections SET status = $3, last_tested_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND id = $2`, [userId, id, ok ? 'active' : 'error']);
        await this.audit(userId, id, 'connection.tested', { ok, status: response.status });
        if (definition.id === 'openai_api_key' && !ok) {
            const message = response.status === 401 || response.status === 403
                ? 'OpenAI rejected this API key.'
                : 'OpenAI could not be reached.';
            return { ok, status: response.status, message };
        }
        return { ok, status: response.status, message: ok ? 'Connection test succeeded' : 'Connection test failed' };
    }
    mask(connection) {
        return { ...connection, credentials: (0, secret_crypto_1.maskSecrets)(connection.credentials) };
    }
    validateCredentials(definition, credentials) {
        for (const field of definition.validation.requiredFields) {
            if (credentials[field] === undefined || credentials[field] === null || credentials[field] === '') {
                throw new Error(`${field} is required`);
            }
        }
        for (const group of definition.validation.mutuallyExclusiveFields || []) {
            const present = group.filter((field) => credentials[field]);
            if (present.length > 1)
                throw new Error(`${present.join(', ')} are mutually exclusive`);
        }
    }
    async audit(userId, connectionId, action, details) {
        await (0, db_pool_1.queryAsService)(`INSERT INTO workflow_execution_logs (
         id, workflow_id, execution_id, correlation_id, node_id, node_name, event, level, metadata, created_at
       )
       VALUES ($1, 'credentials', $2, $2, $3, 'Credential System', $4, 'info', $5::jsonb, NOW())`, [(0, crypto_1.randomUUID)(), connectionId, userId, action, JSON.stringify({ connectionId, userId, ...details })]).catch(() => { });
    }
}
exports.ConnectionService = ConnectionService;
exports.connectionService = new ConnectionService();
