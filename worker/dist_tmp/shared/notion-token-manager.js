"use strict";
/**
 * Notion Token Manager
 *
 * Helper functions to retrieve and manage Notion OAuth tokens from the database.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotionAccessToken = getNotionAccessToken;
exports.getNotionTokenData = getNotionTokenData;
const credential_resolver_1 = require("./credential-resolver");
/**
 * Get Notion access token from DB
 * Tries multiple user IDs in order (workflow owner, then current user)
 */
async function getNotionAccessToken(db, userId) {
    if (!userId)
        return null;
    const userIds = Array.isArray(userId) ? userId : [userId];
    return (0, credential_resolver_1.resolveOAuthTokenString)('notion', userIds);
}
/**
 * Get full Notion token data (including metadata)
 */
async function getNotionTokenData(db, userId) {
    if (!userId) {
        return null;
    }
    const userIdsToTry = Array.isArray(userId) ? userId : [userId];
    for (const uid of userIdsToTry) {
        if (!uid)
            continue;
        try {
            const { data: tokenData, error } = await db
                .from('notion_oauth_tokens')
                .select('*')
                .eq('user_id', uid)
                .single();
            if (error || !tokenData) {
                continue;
            }
            return tokenData;
        }
        catch (error) {
            console.error(`[NotionTokenManager] Error fetching token data for user ${uid}:`, error);
            continue;
        }
    }
    return null;
}
