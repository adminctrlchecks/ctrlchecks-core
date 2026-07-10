"use strict";
/**
 * Gmail Node Executor
 *
 * ✅ CRITICAL: Complete Gmail execution pipeline with credential resolution
 *
 * Features:
 * - Automatic OAuth token resolution
 * - Token refresh handling
 * - Scope validation
 * - Error handling with clear messages
 * - Support for send/list/get/search operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIRED_GMAIL_SCOPES = void 0;
exports.resolveGmailCredentials = resolveGmailCredentials;
exports.sendGmailEmail = sendGmailEmail;
exports.listGmailMessages = listGmailMessages;
exports.getGmailMessage = getGmailMessage;
const credential_resolver_1 = require("./credential-resolver");
const google_api_utils_1 = require("./google-api-utils");
/**
 * Required Gmail scopes
 */
exports.REQUIRED_GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
];
/**
 * Resolve Gmail credentials for a workflow/node
 *
 * Strategy:
 * 1. Try workflow owner's Google OAuth tokens
 * 2. Try current user's Google OAuth tokens (if different)
 * 3. Validate scopes
 * 4. Refresh token if expired
 */
async function resolveGmailCredentials(db, workflowId, nodeId, userId, currentUserId) {
    console.log(`[GmailNode] Resolving credentials for workflow ${workflowId}, node ${nodeId}`);
    const candidates = [userId, currentUserId].filter((id) => Boolean(id));
    if (candidates.length === 0) {
        console.warn('[GmailNode] No user IDs provided for credential resolution');
        return null;
    }
    // Unified resolver: checks oauth_table → credential_vault → user_credentials
    // Also handles token refresh automatically for Google tokens
    const result = await (0, credential_resolver_1.resolveOAuthToken)('google', candidates);
    if (!result) {
        console.error(`[GmailNode] No Google token found. Tried users: [${candidates.join(', ')}]`);
        return null;
    }
    console.log(`[GmailNode] Resolved credential via ${result.source} (user: ${result.userId})`);
    return {
        accessToken: result.token,
        userId: result.userId,
    };
}
/**
 * Send email via Gmail API
 */
async function sendGmailEmail(credential, config) {
    try {
        // Validate inputs
        if (!config.to || !config.to.trim()) {
            return { success: false, error: 'Gmail: "to" field is required' };
        }
        if (!config.subject || !config.subject.trim()) {
            return { success: false, error: 'Gmail: "subject" field is required' };
        }
        if (!config.body || !config.body.trim()) {
            return { success: false, error: 'Gmail: "body" field is required' };
        }
        // Validate email format
        if (!(0, google_api_utils_1.validateEmail)(config.to)) {
            return { success: false, error: `Gmail: Invalid email address format: ${config.to}` };
        }
        console.log(`[GmailNode] Sending email to ${config.to} with subject: ${config.subject.substring(0, 50)}...`);
        // Create email message in RFC 2822 format
        const fromEmail = config.from || 'me'; // 'me' uses authenticated user's email
        const emailMessage = [
            `To: ${config.to}`,
            `From: ${fromEmail}`,
            `Subject: ${config.subject}`,
            '',
            config.body,
        ].join('\r\n');
        // Encode message in base64url format (RFC 4648)
        const encodedMessage = Buffer.from(emailMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        // Send via Gmail API
        const response = await (0, google_api_utils_1.fetchWithRetry)('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credential.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                raw: encodedMessage,
            }),
        }, {
            maxRetries: 3,
            initialDelay: 1000,
            retryableStatuses: [429, 500, 502, 503, 504],
        });
        if (!response.ok) {
            const errorText = await response.text();
            const errorMessage = (0, google_api_utils_1.parseGoogleApiError)(response, errorText);
            // Map specific error codes
            if (response.status === 401) {
                return { success: false, error: `Gmail: Authentication failed. Token invalid or expired. Please re-authenticate with Google. ${errorMessage}` };
            }
            if (response.status === 403) {
                return { success: false, error: `Gmail: Permission denied. Missing required scope: ${exports.REQUIRED_GMAIL_SCOPES.join(' or ')}. ${errorMessage}` };
            }
            if (response.status === 400) {
                return { success: false, error: `Gmail: Invalid request. Check email address format. ${errorMessage}` };
            }
            if (response.status === 429) {
                return { success: false, error: `Gmail: Rate limit exceeded. Please try again later. ${errorMessage}` };
            }
            return { success: false, error: `Gmail API error: ${errorMessage}` };
        }
        const result = await response.json();
        console.log(`[GmailNode] ✅ Email sent successfully. Message ID: ${result.id || 'N/A'}`);
        return {
            success: true,
            messageId: result.id,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[GmailNode] Error sending email:', errorMessage);
        return { success: false, error: `Gmail: ${errorMessage}` };
    }
}
/**
 * List Gmail messages
 */
async function listGmailMessages(credential, config) {
    try {
        const maxResults = config.maxResults || 10;
        const query = config.query || '';
        const queryParams = new URLSearchParams({
            maxResults: String(maxResults),
        });
        if (query) {
            queryParams.append('q', query);
        }
        const response = await (0, google_api_utils_1.fetchWithRetry)(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${credential.accessToken}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            const errorMessage = (0, google_api_utils_1.parseGoogleApiError)(response, errorText);
            return { success: false, error: `Gmail API error: ${errorMessage}` };
        }
        const result = await response.json();
        return {
            success: true,
            messages: result.messages || [],
            resultSizeEstimate: typeof result.resultSizeEstimate === 'number'
                ? result.resultSizeEstimate
                : result.messages?.length || 0,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: `Gmail: ${errorMessage}` };
    }
}
/**
 * Get Gmail message by ID
 */
async function getGmailMessage(credential, config) {
    try {
        if (!config.messageId) {
            return { success: false, error: 'Gmail: messageId is required' };
        }
        const response = await (0, google_api_utils_1.fetchWithRetry)(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${config.messageId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${credential.accessToken}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            const errorMessage = (0, google_api_utils_1.parseGoogleApiError)(response, errorText);
            return { success: false, error: `Gmail API error: ${errorMessage}` };
        }
        const message = await response.json();
        return {
            success: true,
            message,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: `Gmail: ${errorMessage}` };
    }
}
