"use strict";
/**
 * Twitter Token Manager
 *
 * Helper functions to retrieve and manage Twitter OAuth tokens from the database.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTwitterAccessToken = getTwitterAccessToken;
exports.getTwitterTokenData = getTwitterTokenData;
const credential_resolver_1 = require("./credential-resolver");
/**
 * Get Twitter access token from DB
 * Tries multiple user IDs in order (workflow owner, then current user)
 */
async function getTwitterAccessToken(db, userId) {
    if (!userId)
        return null;
    const userIds = Array.isArray(userId) ? userId : [userId];
    return (0, credential_resolver_1.resolveOAuthTokenString)('twitter', userIds);
}
/**
 * Get full Twitter token data (including metadata)
 */
async function getTwitterTokenData(db, userId) {
    if (!userId) {
        return null;
    }
    const userIdsToTry = Array.isArray(userId) ? userId : [userId];
    for (const uid of userIdsToTry) {
        if (!uid)
            continue;
        try {
            const { data: tokenData, error } = await db
                .from('twitter_oauth_tokens')
                .select('*')
                .eq('user_id', uid)
                .single();
            if (error || !tokenData) {
                continue;
            }
            return tokenData;
        }
        catch (error) {
            console.error(`[TwitterTokenManager] Error fetching token data for user ${uid}:`, error);
            continue;
        }
    }
    return null;
}
