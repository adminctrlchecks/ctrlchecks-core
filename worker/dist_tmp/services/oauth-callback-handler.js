"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOAuthCallback = handleOAuthCallback;
const credential_scope_registry_1 = require("./credential-scope-registry");
const credential_resolver_1 = require("./credential-resolver");
function parseReturnedScopes(tokenResponse, fallbackScopes) {
    if (Array.isArray(tokenResponse.scopes))
        return tokenResponse.scopes;
    if (Array.isArray(tokenResponse.scope))
        return tokenResponse.scope;
    if (typeof tokenResponse.scope === 'string') {
        return tokenResponse.scope
            .split(/[,\s]+/)
            .map((scope) => scope.trim())
            .filter(Boolean);
    }
    return fallbackScopes;
}
function expiresAtFromToken(tokenResponse) {
    if (tokenResponse.expires_at)
        return tokenResponse.expires_at;
    if (tokenResponse.expires_in) {
        const seconds = Number(tokenResponse.expires_in);
        if (Number.isFinite(seconds) && seconds > 0) {
            return new Date(Date.now() + seconds * 1000).toISOString();
        }
    }
    return null;
}
async function handleOAuthCallback(input) {
    const provider = (0, credential_scope_registry_1.normalizeProvider)(input.provider);
    const requiredScopes = (0, credential_scope_registry_1.requiredScopesForProvider)(provider, input.requiredScopes);
    const returnedScopes = parseReturnedScopes(input.tokenResponse, requiredScopes);
    const accessToken = input.tokenResponse.access_token || input.tokenResponse.accessToken;
    const refreshToken = input.tokenResponse.refresh_token || input.tokenResponse.refreshToken || null;
    if (!accessToken || typeof accessToken !== 'string') {
        throw new Error(`${provider} connection failed: OAuth provider did not return an access token.`);
    }
    if (!(0, credential_scope_registry_1.scopesCover)(returnedScopes, requiredScopes)) {
        const missing = requiredScopes.filter((s) => !returnedScopes.includes(s));
        console.warn(`[OAuthCallback] ⚠️ ${provider} granted partial scopes — missing: ${missing.join(', ')}. Storing anyway; execution will fail if those scopes are needed.`);
    }
    const credentialId = await (0, credential_resolver_1.upsertUnifiedCredential)({
        userId: input.userId,
        email: input.email,
        provider,
        scopes: returnedScopes.length > 0 ? returnedScopes : requiredScopes,
        accessToken,
        refreshToken: typeof refreshToken === 'string' ? refreshToken : null,
        expiresAt: expiresAtFromToken(input.tokenResponse),
        rawTokenBlob: {
            ...input.tokenResponse,
            normalized_scope_set: (0, credential_scope_registry_1.scopeSet)(returnedScopes.length > 0 ? returnedScopes : requiredScopes),
        },
        source: input.source,
    });
    return { credentialId, scopes: returnedScopes.length > 0 ? returnedScopes : requiredScopes };
}
