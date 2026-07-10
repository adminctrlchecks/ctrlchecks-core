"use strict";
/**
 * Social Token Manager
 *
 * Unified token management for all social media providers.
 * Handles token retrieval, storage, and refresh with encryption.
 *
 * Supports providers: github, facebook, twitter, linkedin, google
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderToken = getProviderToken;
exports.saveProviderToken = saveProviderToken;
exports.refreshProviderToken = refreshProviderToken;
exports.deleteProviderToken = deleteProviderToken;
exports.hasProviderToken = hasProviderToken;
const token_encryption_1 = require("../core/utils/token-encryption");
const credential_resolver_1 = require("./credential-resolver");
/**
 * Get provider token for a user
 * Automatically handles token refresh if expired
 *
 * @param db - AWS RDS database client
 * @param userId - User ID (or array of user IDs to try in order)
 * @param provider - Social media provider
 * @returns Access token or null if not found
 */
async function getProviderToken(db, userId, provider) {
    const userIds = Array.isArray(userId) ? userId : [userId];
    return (0, credential_resolver_1.resolveOAuthTokenString)(provider, userIds);
}
/**
 * Save provider token for a user
 * Tokens are encrypted before storage
 *
 * @param db - AWS RDS database client
 * @param userId - User ID
 * @param provider - Social media provider
 * @param tokenData - Token data to save
 */
async function saveProviderToken(db, userId, provider, tokenData) {
    try {
        // Encrypt tokens before storage
        const encryptedTokens = (0, token_encryption_1.encryptTokens)({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
        });
        const { error } = await db
            .from('social_tokens')
            .upsert({
            user_id: userId,
            provider,
            access_token: encryptedTokens.access_token,
            refresh_token: encryptedTokens.refresh_token,
            token_type: tokenData.token_type || 'Bearer',
            expires_at: tokenData.expires_at || null,
            scope: tokenData.scope || null,
            provider_user_id: tokenData.provider_user_id || null,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,provider',
        });
        if (error) {
            throw new Error(`Failed to save ${provider} token: ${error.message}`);
        }
        console.log(`[Social Token] ✅ Saved ${provider} token for user ${userId}`);
    }
    catch (error) {
        console.error(`[Social Token] Error saving ${provider} token:`, error);
        throw error;
    }
}
/**
 * Refresh provider token
 *
 * @param db - AWS RDS database client
 * @param userId - User ID
 * @param provider - Social media provider
 * @param refreshToken - Refresh token (already decrypted)
 * @returns New access token or null if refresh failed
 */
async function refreshProviderToken(db, userId, provider, refreshToken) {
    try {
        // Import provider-specific refresh functions
        let newTokenData = null;
        switch (provider) {
            case 'github':
                // GitHub tokens don't expire, but we can refresh if needed
                // For now, return null (no refresh needed)
                return null;
            case 'facebook':
                newTokenData = await refreshFacebookToken(refreshToken);
                break;
            case 'twitter':
                // Twitter OAuth 1.0a doesn't use refresh tokens
                return null;
            case 'linkedin':
                newTokenData = await refreshLinkedInToken(refreshToken);
                break;
            case 'google':
                newTokenData = await refreshGoogleToken(refreshToken);
                break;
            default:
                console.warn(`[Social Token] Refresh not supported for provider: ${provider}`);
                return null;
        }
        if (!newTokenData) {
            return null;
        }
        // Save refreshed token
        await saveProviderToken(db, userId, provider, newTokenData);
        return newTokenData.access_token;
    }
    catch (error) {
        console.error(`[Social Token] Error refreshing ${provider} token:`, error);
        return null;
    }
}
/**
 * Refresh Facebook token
 */
async function refreshFacebookToken(refreshToken) {
    const clientId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    if (!clientId || !clientSecret) {
        console.warn('[Social Token] Facebook OAuth credentials not configured');
        return null;
    }
    try {
        const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'fb_exchange_token',
                client_id: clientId,
                client_secret: clientSecret,
                fb_exchange_token: refreshToken,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Social Token] Facebook token refresh failed:', errorText);
            return null;
        }
        const data = await response.json();
        const expiresAt = data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : null;
        return {
            access_token: data.access_token,
            token_type: data.token_type || 'Bearer',
            expires_at: expiresAt,
        };
    }
    catch (error) {
        console.error('[Social Token] Facebook token refresh error:', error);
        return null;
    }
}
/**
 * Refresh LinkedIn token
 */
async function refreshLinkedInToken(refreshToken) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        console.warn('[Social Token] LinkedIn OAuth credentials not configured');
        return null;
    }
    try {
        const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Social Token] LinkedIn token refresh failed:', errorText);
            return null;
        }
        const data = await response.json();
        const expiresAt = data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : null;
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token || null,
            token_type: data.token_type || 'Bearer',
            expires_at: expiresAt,
        };
    }
    catch (error) {
        console.error('[Social Token] LinkedIn token refresh error:', error);
        return null;
    }
}
/**
 * Refresh Google token
 */
async function refreshGoogleToken(refreshToken) {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        console.warn('[Social Token] Google OAuth credentials not configured');
        return null;
    }
    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Social Token] Google token refresh failed:', errorText);
            return null;
        }
        const data = await response.json();
        const expiresAt = data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : null;
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token || null,
            token_type: data.token_type || 'Bearer',
            expires_at: expiresAt,
        };
    }
    catch (error) {
        console.error('[Social Token] Google token refresh error:', error);
        return null;
    }
}
/**
 * Delete provider token for a user
 */
async function deleteProviderToken(db, userId, provider) {
    try {
        const { error } = await db
            .from('social_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('provider', provider);
        if (error) {
            throw new Error(`Failed to delete ${provider} token: ${error.message}`);
        }
        console.log(`[Social Token] ✅ Deleted ${provider} token for user ${userId}`);
    }
    catch (error) {
        console.error(`[Social Token] Error deleting ${provider} token:`, error);
        throw error;
    }
}
/**
 * Check if user has a connected provider
 */
async function hasProviderToken(db, userId, provider) {
    try {
        const { data, error } = await db
            .from('social_tokens')
            .select('id')
            .eq('user_id', userId)
            .eq('provider', provider)
            .single();
        return !error && !!data;
    }
    catch (error) {
        return false;
    }
}
