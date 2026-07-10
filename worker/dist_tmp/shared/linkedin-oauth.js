"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLinkedInAccessToken = getLinkedInAccessToken;
const credential_resolver_1 = require("./credential-resolver");
async function getLinkedInAccessToken(db, userId) {
    const userIds = Array.isArray(userId) ? userId : [userId];
    return (0, credential_resolver_1.resolveOAuthTokenString)('linkedin', userIds);
}
