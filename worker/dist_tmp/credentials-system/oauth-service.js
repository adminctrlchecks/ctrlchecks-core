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
exports.oauthService = exports.OAuthService = void 0;
const crypto_1 = __importStar(require("crypto"));
const db_pool_1 = require("../core/database/db-pool");
const connection_service_1 = require("./connection-service");
const credential_type_registry_1 = require("./credential-type-registry");
const oauth_callback_handler_1 = require("../services/oauth-callback-handler");
function base64Url(bytes = 32) {
    return crypto_1.default.randomBytes(bytes).toString('base64url');
}
function oauthClient(definition) {
    if (!definition.oauth2)
        throw new Error('Credential type is not OAuth2');
    const clientId = process.env[definition.oauth2.clientIdEnv];
    const clientSecret = process.env[definition.oauth2.clientSecretEnv];
    if (!clientId || !clientSecret) {
        throw new Error(`OAuth provider ${definition.provider} is missing ${definition.oauth2.clientIdEnv}/${definition.oauth2.clientSecretEnv}`);
    }
    return { clientId, clientSecret, redirectUri: (0, credential_type_registry_1.getRedirectUri)(definition) };
}
class OAuthService {
    async start(input) {
        const definition = (0, credential_type_registry_1.getCredentialType)(input.credentialTypeId);
        if (!definition?.oauth2)
            throw new Error(`OAuth2 credential type not found: ${input.credentialTypeId}`);
        if (input.connectionId) {
            const existing = await connection_service_1.connectionService.getDecryptedConnection(input.userId, input.connectionId);
            if (existing.credentialTypeId !== definition.id) {
                const error = new Error('Connection does not match requested credential type');
                error.statusCode = 400;
                error.code = 'CONNECTION_TYPE_MISMATCH';
                throw error;
            }
        }
        const { clientId, redirectUri } = oauthClient(definition);
        const state = base64Url(24);
        const verifier = base64Url(48);
        const challenge = crypto_1.default.createHash('sha256').update(verifier).digest('base64url');
        const scopes = input.scopes?.length ? input.scopes : definition.oauth2.defaultScopes;
        await (0, db_pool_1.queryAsService)(`INSERT INTO oauth_states (
         id, user_id, provider, credential_type_id, connection_id, state_hash, code_verifier,
         redirect_uri, scopes, return_to, expires_at, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, NOW() + INTERVAL '10 minutes', NOW())`, [
            (0, crypto_1.randomUUID)(),
            input.userId,
            definition.provider,
            definition.id,
            input.connectionId || null,
            crypto_1.default.createHash('sha256').update(state).digest('hex'),
            verifier,
            redirectUri,
            JSON.stringify(scopes),
            input.returnTo || null,
        ]);
        const url = new URL(definition.oauth2.authorizationUrl);
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('state', state);
        if (scopes.length)
            url.searchParams.set('scope', scopes.join(definition.oauth2.scopeSeparator || ' '));
        if (definition.oauth2.pkce !== false) {
            url.searchParams.set('code_challenge', challenge);
            url.searchParams.set('code_challenge_method', 'S256');
        }
        if (definition.oauth2.accessType)
            url.searchParams.set('access_type', definition.oauth2.accessType);
        if (definition.oauth2.prompt)
            url.searchParams.set('prompt', definition.oauth2.prompt);
        for (const [key, value] of Object.entries(definition.oauth2.authParams || {})) {
            url.searchParams.set(key, value);
        }
        return { authorizationUrl: url.toString(), state };
    }
    async callback(input) {
        const stateHash = crypto_1.default.createHash('sha256').update(input.state).digest('hex');
        const rows = await (0, db_pool_1.queryAsService)(`SELECT *
       FROM oauth_states
       WHERE state_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()
       LIMIT 1`, [stateHash]);
        const state = rows[0];
        if (!state)
            throw new Error('Invalid or expired OAuth state');
        const definition = (0, credential_type_registry_1.getCredentialType)(state.credential_type_id);
        if (!definition?.oauth2)
            throw new Error('OAuth state references an unknown credential type');
        console.info(`[OAuth callback] credTypeId=${state.credential_type_id} provider=${definition.provider} redirect_uri=${state.redirect_uri} pkce=${definition.oauth2.pkce} tokenAuthMethod=${definition.oauth2.tokenAuthMethod ?? 'body'} codeVerifierLen=${String(state.code_verifier ?? '').length}`);
        // Exchange the code BEFORE marking the state consumed.
        // If the exchange fails (e.g. invalid_grant), the state remains unconsumed for diagnostics.
        // The authorization code is single-use at the provider level regardless.
        const token = await this.exchangeCode(definition, input.code, state.code_verifier, state.redirect_uri);
        await (0, db_pool_1.queryAsService)(`UPDATE oauth_states SET consumed_at = NOW() WHERE id = $1`, [state.id]);
        const scopes = Array.isArray(state.scopes) ? state.scopes : JSON.parse(state.scopes || '[]');
        const result = await (0, oauth_callback_handler_1.handleOAuthCallback)({
            provider: definition.provider,
            userId: state.user_id,
            tokenResponse: { ...token, scopes },
            requiredScopes: definition.requiredScopes || definition.oauth2.defaultScopes,
            source: 'generic_oauth',
        });
        const connection = await this.persistConnectionFromCallback({
            userId: state.user_id,
            connectionId: state.connection_id,
            definition,
            token,
            scopes: result.scopes,
            unifiedCredentialId: result.credentialId,
        });
        return { connectionId: connection.id, returnTo: state.return_to };
    }
    async refreshConnection(userId, connectionId) {
        const connection = await connection_service_1.connectionService.getDecryptedConnection(userId, connectionId);
        const definition = (0, credential_type_registry_1.getCredentialType)(connection.credentialTypeId);
        if (!definition?.oauth2)
            throw new Error('Connection is not OAuth2');
        const refreshToken = String(connection.credentials.refresh_token || '');
        if (!refreshToken) {
            await connection_service_1.connectionService.deleteConnection(userId, connectionId).catch(() => { });
            throw new Error('OAuth connection has no refresh token');
        }
        const { clientId, clientSecret } = oauthClient(definition);
        const useBasicAuth = definition.oauth2.tokenAuthMethod === 'basic';
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            ...(!useBasicAuth && { client_id: clientId, client_secret: clientSecret }),
        });
        const refreshHeaders = {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        if (useBasicAuth) {
            refreshHeaders.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
        }
        const response = await fetch(definition.oauth2.tokenUrl, {
            method: 'POST',
            headers: refreshHeaders,
            body: params,
        });
        const payload = await response.json();
        if (!response.ok) {
            await connection_service_1.connectionService.deleteConnection(userId, connectionId).catch(() => { });
            throw new Error(`OAuth refresh failed: ${JSON.stringify(payload)}`);
        }
        const expiresAt = typeof payload.expires_in === 'number'
            ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
            : connection.expiresAt;
        await connection_service_1.connectionService.updateConnection(userId, connectionId, {
            credentials: { ...connection.credentials, ...this.normalizeTokenPayload(payload), refresh_token: payload.refresh_token || refreshToken },
            status: 'active',
            expiresAt,
            metadata: { ...connection.metadata, refreshedAt: new Date().toISOString() },
        });
    }
    async exchangeCode(definition, code, verifier, redirectUri) {
        const { clientId, clientSecret } = oauthClient(definition);
        const useBasicAuth = definition.oauth2?.tokenAuthMethod === 'basic';
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            // RFC 6749 §2.3: MUST NOT use more than one auth method per request.
            // When using HTTP Basic auth, credentials are in the Authorization header — do not also send client_id in the body.
            ...(!useBasicAuth && { client_id: clientId }),
        });
        if (definition.oauth2?.pkce !== false) {
            params.set('code_verifier', verifier);
        }
        const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        if (useBasicAuth) {
            headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
        }
        else {
            params.set('client_secret', clientSecret);
        }
        // Diagnostic logging — shows exact request params sent to provider's token endpoint.
        const diagParams = {};
        for (const [k, v] of params.entries())
            diagParams[k] = k === 'code_verifier' ? `${v.slice(0, 8)}…` : v;
        console.info(`[OAuth exchangeCode] provider=${definition.provider} tokenUrl=${definition.oauth2.tokenUrl}`);
        console.info(`[OAuth exchangeCode] params=${JSON.stringify(diagParams)}`);
        console.info(`[OAuth exchangeCode] useBasicAuth=${useBasicAuth} hasAuthHeader=${!!headers.Authorization} hasPkce=${params.has('code_verifier')}`);
        const response = await fetch(definition.oauth2.tokenUrl, { method: 'POST', headers, body: params });
        const payload = await response.json();
        console.info(`[OAuth exchangeCode] response status=${response.status} body=${JSON.stringify(payload)}`);
        if (!response.ok)
            throw new Error(`OAuth token exchange failed: ${JSON.stringify(payload)}`);
        return payload;
    }
    normalizeTokenPayload(payload) {
        return Object.fromEntries(Object.entries({
            ...payload,
            access_token: payload.access_token,
            refresh_token: payload.refresh_token,
            token_type: payload.token_type || 'Bearer',
            obtained_at: new Date().toISOString(),
        }).filter(([, value]) => value !== undefined));
    }
    expiresAtFromToken(payload) {
        if (typeof payload.expires_at === 'string')
            return payload.expires_at;
        const seconds = Number(payload.expires_in);
        return Number.isFinite(seconds) && seconds > 0
            ? new Date(Date.now() + seconds * 1000).toISOString()
            : null;
    }
    extractExternalAccount(payload) {
        const explicitId = payload.account_id || payload.user_id || payload.sub;
        const explicitEmail = payload.email;
        if (typeof explicitId === 'string' || typeof explicitEmail === 'string') {
            return {
                id: typeof explicitId === 'string' ? explicitId : undefined,
                email: typeof explicitEmail === 'string' ? explicitEmail : undefined,
            };
        }
        const idToken = typeof payload.id_token === 'string' ? payload.id_token : '';
        const parts = idToken.split('.');
        if (parts.length < 2)
            return {};
        try {
            const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            return {
                id: typeof claims.sub === 'string' ? claims.sub : undefined,
                email: typeof claims.email === 'string' ? claims.email : undefined,
            };
        }
        catch {
            return {};
        }
    }
    async persistConnectionFromCallback(input) {
        const credentials = this.normalizeTokenPayload(input.token);
        const expiresAt = this.expiresAtFromToken(input.token);
        const external = this.extractExternalAccount(input.token);
        const metadata = {
            oauth: {
                scopes: input.scopes,
                unifiedCredentialId: input.unifiedCredentialId,
                connectedAt: new Date().toISOString(),
            },
        };
        if (input.connectionId) {
            const existing = await connection_service_1.connectionService.getDecryptedConnection(input.userId, input.connectionId);
            if (existing.credentialTypeId !== input.definition.id) {
                const error = new Error('OAuth state does not match the target connection');
                error.statusCode = 400;
                error.code = 'CONNECTION_TYPE_MISMATCH';
                throw error;
            }
            return connection_service_1.connectionService.updateConnection(input.userId, input.connectionId, {
                credentials,
                status: 'active',
                expiresAt,
                metadata: { ...existing.metadata, ...metadata },
                externalAccountId: external.id,
                externalAccountEmail: external.email,
            });
        }
        return connection_service_1.connectionService.createConnection({
            userId: input.userId,
            name: `${input.definition.displayName} Connection`,
            credentialTypeId: input.definition.id,
            credentials,
            expiresAt,
            metadata,
        });
    }
}
exports.OAuthService = OAuthService;
exports.oauthService = new OAuthService();
