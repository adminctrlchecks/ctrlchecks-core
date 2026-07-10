"use strict";
/**
 * Compatibility facade for older imports.
 *
 * Runtime credentials are resolved exclusively through services/credential-resolver.ts.
 * This file intentionally contains no credential-table queries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOAuthToken = resolveOAuthToken;
exports.resolveOAuthTokenString = resolveOAuthTokenString;
exports.resolveUserIdByEmail = resolveUserIdByEmail;
const db_pool_1 = require("../core/database/db-pool");
const credential_resolver_1 = require("../services/credential-resolver");
const credential_scope_registry_1 = require("../services/credential-scope-registry");
function ownerOnly(userIds) {
    const candidates = userIds.filter((id) => Boolean(id));
    if (candidates.length > 1 && candidates[0] !== candidates[1]) {
        console.info('[CredentialResolver] Ignoring current-user credential fallback; workflow owner credentials are isolated.', {
            workflowOwnerId: candidates[0],
            currentUserId: candidates[1],
        });
    }
    return candidates[0] || null;
}
async function resolveOAuthToken(provider, userIds, requiredScopes) {
    const userId = ownerOnly(userIds);
    if (!userId) {
        throw new Error(`Credential resolution requires a workflow owner user id for provider ${provider}`);
    }
    const credential = await (0, credential_resolver_1.resolveCredential)({
        userId,
        provider: (0, credential_scope_registry_1.normalizeProvider)(provider),
        requiredScopes: requiredScopes || [],
    });
    return {
        token: credential.accessToken,
        userId: credential.userId,
        source: 'unified_credentials',
    };
}
async function resolveOAuthTokenString(provider, userIds, requiredScopes) {
    const result = await resolveOAuthToken(provider, userIds, requiredScopes);
    return result.token;
}
async function resolveUserIdByEmail(email) {
    if (!email)
        return null;
    const rows = await (0, db_pool_1.queryAsService)(`SELECT id
       FROM users
      WHERE LOWER(email) = LOWER($1)
      ORDER BY created_at ASC
      LIMIT 1`, [email]);
    return rows[0]?.id || null;
}
