"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuthenticatedUser = requireAuthenticatedUser;
exports.requireGoogleAuth = requireGoogleAuth;
const aws_db_client_1 = require("../database/aws-db-client");
const identity_resolver_1 = require("../database/identity-resolver");
const error_codes_1 = require("./error-codes");
/**
 * Check if request has a valid authenticated user.
 * Returns the CANONICAL user ID (resolves across OAuth providers with same email).
 * Throws UNAUTHORIZED otherwise.
 */
async function requireAuthenticatedUser(req) {
    // Fast path: authenticateUser middleware (subscription-auth.ts) already resolved the user
    // via the proven Cognito verifier + Admin API email lookup. Use it when available.
    const preAuthed = req.user;
    if (preAuthed?.id) {
        const canonicalId = await (0, identity_resolver_1.resolveCanonicalUserId)(preAuthed.id, preAuthed.email || '').catch(() => preAuthed.id);
        return canonicalId;
    }
    const db = (0, aws_db_client_1.getDbClient)();
    const authHeader = req.headers.authorization;
    let userId;
    let email;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        if (token) {
            const { data: { user }, error } = await db.auth.getUser(token);
            if (!error && user) {
                userId = user.id;
                email = user.email || '';
            }
        }
    }
    if (!userId) {
        throw (0, error_codes_1.createError)(error_codes_1.ErrorCode.UNAUTHORIZED, 'Authentication required', { hint: 'Please sign in to continue' });
    }
    // Resolve canonical ID so all providers with the same email map to the same DB row
    const canonicalId = await (0, identity_resolver_1.resolveCanonicalUserId)(userId, email || '').catch(() => userId);
    return canonicalId;
}
/**
 * Check if user has Google OAuth connected.
 * Returns the canonical user ID if Google is connected, throws error otherwise.
 */
async function requireGoogleAuth(req) {
    const db = (0, aws_db_client_1.getDbClient)();
    const userId = await requireAuthenticatedUser(req);
    const { data: googleTokenData, error: googleError } = await db
        .from('google_oauth_tokens')
        .select('id, expires_at')
        .eq('user_id', userId)
        .maybeSingle();
    const now = new Date();
    let googleConnected = false;
    if (!googleError && googleTokenData) {
        const expiresAt = googleTokenData.expires_at ? new Date(googleTokenData.expires_at) : null;
        googleConnected = expiresAt ? expiresAt > now : true;
    }
    if (!googleConnected) {
        throw (0, error_codes_1.createError)(error_codes_1.ErrorCode.GOOGLE_AUTH_REQUIRED, 'Google account connection required', {
            hint: 'Please connect your Google account to create or run workflows',
            recoverable: true,
        });
    }
    return userId;
}
