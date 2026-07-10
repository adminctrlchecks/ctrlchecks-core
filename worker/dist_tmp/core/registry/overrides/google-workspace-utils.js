"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleTokenForContext = getGoogleTokenForContext;
exports.googleApiRequest = googleApiRequest;
exports.googleApiRequestWithAcknowledgement = googleApiRequestWithAcknowledgement;
exports.mergedInputs = mergedInputs;
const google_sheets_1 = require("../../../shared/google-sheets");
const google_api_utils_1 = require("../../../shared/google-api-utils");
const runtime_input_handoff_1 = require("../../execution/runtime-input-handoff");
const acknowledged_response_1 = require("../../http/acknowledged-response");
async function getGoogleTokenForContext(context, requiredScopes) {
    const authoritativeInputs = (0, runtime_input_handoff_1.getAuthoritativeInputs)(context);
    const directToken = String(authoritativeInputs.accessToken || context.config?.accessToken || '').trim();
    if (directToken)
        return directToken;
    const userIdsToTry = [];
    if (context.userId)
        userIdsToTry.push(context.userId);
    if (context.currentUserId && context.currentUserId !== context.userId) {
        userIdsToTry.push(context.currentUserId);
    }
    const token = userIdsToTry.length > 0
        ? await (0, google_sheets_1.getGoogleAccessToken)(context.db, userIdsToTry, requiredScopes)
        : null;
    if (!token) {
        throw new Error('Google OAuth token not found. Connect a Google account before running this node.');
    }
    return token;
}
async function googleApiRequest(url, accessToken, init = {}) {
    const result = await googleApiRequestWithAcknowledgement(url, accessToken, init);
    return result.data;
}
async function googleApiRequestWithAcknowledgement(url, accessToken, init = {}) {
    const response = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(init.headers || {}),
        },
    });
    const parsed = await (0, acknowledged_response_1.readAcknowledgedHttpResponse)(response, { binaryForNonText: true });
    if (!response.ok) {
        const errorText = parsed.rawText || (typeof parsed.data === 'string' ? parsed.data : JSON.stringify(parsed.data || ''));
        throw new Error((0, google_api_utils_1.parseGoogleApiError)(response, errorText));
    }
    return parsed;
}
function mergedInputs(context) {
    return (0, runtime_input_handoff_1.mergeAuthoritativeInputs)(context);
}
