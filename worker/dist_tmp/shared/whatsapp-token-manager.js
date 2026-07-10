"use strict";
/**
 * WhatsApp Token Manager
 *
 * Helper functions to retrieve and manage WhatsApp/Facebook OAuth tokens from the database.
 * WhatsApp uses Facebook OAuth tokens with WhatsApp Business API permissions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWhatsAppAccessToken = getWhatsAppAccessToken;
exports.getWhatsAppBusinessAccountId = getWhatsAppBusinessAccountId;
exports.getWhatsAppTokenData = getWhatsAppTokenData;
const credential_resolver_1 = require("./credential-resolver");
/**
 * Get WhatsApp/Facebook access token from DB
 * Tries multiple user IDs in order (workflow owner, then current user)
 *
 * Note: WhatsApp uses Facebook OAuth tokens with WhatsApp permissions.
 * The token should have permissions: whatsapp_business_messaging,
 * whatsapp_business_management, whatsapp_business_profile
 */
async function getWhatsAppAccessToken(db, userId) {
    if (!userId)
        return null;
    const userIds = Array.isArray(userId) ? userId : [userId];
    return (0, credential_resolver_1.resolveOAuthTokenString)('whatsapp', userIds);
}
/**
 * Get WhatsApp Business Account ID (WABA ID) from phone number ID
 * This is required for template management and some other operations
 */
async function getWhatsAppBusinessAccountId(accessToken, phoneNumberId) {
    try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}?fields=whatsapp_business_account&access_token=${accessToken}`);
        if (!response.ok) {
            console.error('[WhatsAppTokenManager] Failed to fetch phone number details');
            return null;
        }
        const data = await response.json();
        if (data.whatsapp_business_account?.id) {
            return data.whatsapp_business_account.id;
        }
        return null;
    }
    catch (error) {
        console.error('[WhatsAppTokenManager] Error getting WhatsApp Business Account ID:', error);
        return null;
    }
}
/**
 * Get full WhatsApp token data (including metadata)
 */
async function getWhatsAppTokenData(db, userId) {
    if (!userId) {
        return null;
    }
    const userIdsToTry = Array.isArray(userId) ? userId : [userId];
    for (const uid of userIdsToTry) {
        if (!uid)
            continue;
        try {
            // Try whatsapp_oauth_tokens first
            const { data: whatsappTokenData, error: whatsappError } = await db
                .from('whatsapp_oauth_tokens')
                .select('*')
                .eq('user_id', uid)
                .single();
            if (!whatsappError && whatsappTokenData) {
                return whatsappTokenData;
            }
            // Fall back to facebook_oauth_tokens
            const { data: facebookTokenData, error: facebookError } = await db
                .from('facebook_oauth_tokens')
                .select('*')
                .eq('user_id', uid)
                .single();
            if (!facebookError && facebookTokenData) {
                return facebookTokenData;
            }
        }
        catch (error) {
            console.error(`[WhatsAppTokenManager] Error fetching token data for user ${uid}:`, error);
            continue;
        }
    }
    return null;
}
