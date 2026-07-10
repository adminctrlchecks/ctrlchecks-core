"use strict";
// Zoho OAuth 2.0 Token Manager
// Handles token retrieval, refresh, and region-specific endpoints
Object.defineProperty(exports, "__esModule", { value: true });
exports.getZohoTokenEndpoint = getZohoTokenEndpoint;
exports.getZohoApiBaseUrl = getZohoApiBaseUrl;
exports.getZohoAccessToken = getZohoAccessToken;
exports.refreshZohoToken = refreshZohoToken;
exports.getZohoCredentials = getZohoCredentials;
const config_1 = require("../core/config");
const credential_resolver_1 = require("./credential-resolver");
/**
 * Get Zoho region-specific token endpoint
 */
function getZohoTokenEndpoint(region) {
    const endpoints = {
        US: 'https://accounts.zoho.com/oauth/v2/token',
        EU: 'https://accounts.zoho.eu/oauth/v2/token',
        IN: 'https://accounts.zoho.in/oauth/v2/token',
        AU: 'https://accounts.zoho.com.au/oauth/v2/token',
        CN: 'https://accounts.zoho.com.cn/oauth/v2/token',
        JP: 'https://accounts.zoho.jp/oauth/v2/token',
    };
    return endpoints[region];
}
/**
 * Get Zoho region-specific API base URL
 */
function getZohoApiBaseUrl(region) {
    const baseUrls = {
        US: 'https://www.zohoapis.com',
        EU: 'https://www.zohoapis.eu',
        IN: 'https://www.zohoapis.in',
        AU: 'https://www.zohoapis.com.au',
        CN: 'https://www.zohoapis.com.cn',
        JP: 'https://www.zohoapis.jp',
    };
    return baseUrls[region];
}
/**
 * Get Zoho access token for a user
 * @param db - AWS RDS database client
 * @param userId - User ID or array of user IDs to try (in order)
 * @param region - Zoho region (defaults to US)
 * @returns Access token or null if not found
 */
async function getZohoAccessToken(db, userId, region = 'US') {
    const userIds = Array.isArray(userId) ? userId : [userId];
    return (0, credential_resolver_1.resolveOAuthTokenString)('zoho', userIds);
}
/**
 * Refresh Zoho OAuth token
 * @param db - AWS RDS database client
 * @param userId - User ID
 * @param refreshToken - Refresh token
 * @param region - Zoho region
 * @returns New access token or null if refresh failed
 */
async function refreshZohoToken(db, userId, refreshToken, region = 'US') {
    try {
        // Get client credentials from config or node config
        // For now, we'll need to get these from the node config or environment
        // In a real implementation, these might be stored per-user or globally
        const clientId = config_1.config.zohoOAuthClientId || process.env.ZOHO_OAUTH_CLIENT_ID;
        const clientSecret = config_1.config.zohoOAuthClientSecret || process.env.ZOHO_OAUTH_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            // Return null instead of throwing - credentials not configured
            console.warn('[Zoho OAuth] Client credentials not configured - cannot refresh token');
            return null;
        }
        console.log(`[Zoho OAuth] Refreshing token for user ${userId} in region ${region}`);
        const tokenEndpoint = getZohoTokenEndpoint(region);
        const response = await fetch(tokenEndpoint, {
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
            console.error('[Zoho OAuth] Token refresh failed:', errorText);
            return null;
        }
        const tokenData = await response.json();
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        const updateData = {
            access_token: tokenData.access_token,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
            region: region,
        };
        if (tokenData.refresh_token) {
            updateData.refresh_token = tokenData.refresh_token;
        }
        const { error: updateError } = await db
            .from('zoho_oauth_tokens')
            .update(updateData)
            .eq('user_id', userId)
            .eq('region', region);
        if (updateError) {
            console.error('[Zoho OAuth] Failed to update token in database:', updateError);
            return null;
        }
        console.log('[Zoho OAuth] Token refreshed successfully');
        return tokenData.access_token;
    }
    catch (error) {
        console.error('[Zoho OAuth] Error refreshing token:', error);
        return null;
    }
}
/**
 * Get Zoho credentials from node config or database
 * This function handles credentials that might be passed directly from node config
 * or retrieved from the database
 */
async function getZohoCredentials(db, nodeConfig, userId, currentUserId) {
    // First, try to get credentials from node config (if provided directly)
    const configAccessToken = nodeConfig.accessToken;
    const configRefreshToken = nodeConfig.refreshToken;
    const configClientId = nodeConfig.clientId;
    const configClientSecret = nodeConfig.clientSecret;
    const configRegion = nodeConfig.region || 'US';
    // If all credentials are in config, use them
    if (configAccessToken && configRefreshToken && configClientId && configClientSecret) {
        return {
            accessToken: configAccessToken,
            refreshToken: configRefreshToken,
            clientId: configClientId,
            clientSecret: configClientSecret,
            region: configRegion,
        };
    }
    // Otherwise, try to get from database
    if (userId || currentUserId) {
        const userIdsToTry = [];
        if (userId) {
            userIdsToTry.push(...(Array.isArray(userId) ? userId : [userId]));
        }
        if (currentUserId && !userIdsToTry.includes(currentUserId)) {
            userIdsToTry.push(currentUserId);
        }
        for (const uid of userIdsToTry) {
            const { data: tokenData } = await db
                .from('zoho_oauth_tokens')
                .select('access_token, refresh_token, region')
                .eq('user_id', uid)
                .eq('region', configRegion)
                .single();
            if (tokenData) {
                const clientId = config_1.config.zohoOAuthClientId || process.env.ZOHO_OAUTH_CLIENT_ID;
                const clientSecret = config_1.config.zohoOAuthClientSecret || process.env.ZOHO_OAUTH_CLIENT_SECRET;
                if (clientId && clientSecret && tokenData.access_token && tokenData.refresh_token) {
                    // Try to get a fresh token
                    const freshToken = await getZohoAccessToken(db, uid, tokenData.region || configRegion);
                    if (freshToken) {
                        return {
                            accessToken: freshToken,
                            refreshToken: tokenData.refresh_token,
                            clientId,
                            clientSecret,
                            region: tokenData.region || configRegion,
                        };
                    }
                }
            }
        }
    }
    return null;
}
