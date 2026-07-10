"use strict";
// Google Sheets API Helper
// Worker API handler
// Simplified version - full implementation available in functions/_shared/google-sheets.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleAccessToken = getGoogleAccessToken;
exports.executeGoogleSheetsOperation = executeGoogleSheetsOperation;
const config_1 = require("../core/config");
const token_encryption_1 = require("../core/utils/token-encryption");
const credential_resolver_1 = require("./credential-resolver");
/**
 * Get Google access token for a user
 * @param db - AWS RDS database client
 * @param userId - User ID or array of user IDs to try (in order)
 * @returns Access token or null if not found
 */
async function getGoogleAccessToken(db, userId, requiredScopes) {
    const userIds = Array.isArray(userId) ? userId : [userId];
    return (0, credential_resolver_1.resolveOAuthTokenString)('google', userIds, requiredScopes);
}
async function refreshGoogleToken(db, userId, refreshToken) {
    try {
        const clientId = config_1.config.googleOAuthClientId;
        const clientSecret = config_1.config.googleOAuthClientSecret;
        if (!clientId || !clientSecret) {
            // Return null instead of throwing - credentials not configured
            return null;
        }
        console.log('[Google OAuth] Refreshing token for user:', userId);
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
            console.error('[Google OAuth] Token refresh failed:', errorText);
            return null;
        }
        const tokenData = await response.json();
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        const updateData = {
            access_token: (0, token_encryption_1.encryptToken)(tokenData.access_token),
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
        };
        if (tokenData.refresh_token) {
            updateData.refresh_token = (0, token_encryption_1.encryptToken)(tokenData.refresh_token);
        }
        const { error: updateError } = await db
            .from('google_oauth_tokens')
            .update(updateData)
            .eq('user_id', userId);
        if (updateError) {
            console.error('[Google OAuth] Failed to update token in database:', updateError);
            return null;
        }
        console.log('[Google OAuth] Token refreshed successfully');
        return tokenData.access_token;
    }
    catch (error) {
        console.error('[Google OAuth] Error refreshing token:', error);
        return null;
    }
}
async function executeGoogleSheetsOperation(config) {
    // Simplified implementation
    // Full implementation would handle read/write/append operations
    // See functions/_shared/google-sheets.ts for complete implementation
    return {
        success: false,
        error: 'Google Sheets operation not fully implemented. See functions/_shared/google-sheets.ts for full implementation.',
    };
}
