"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUuid = isUuid;
exports.normalizeCredentialUserId = normalizeCredentialUserId;
const db_pool_1 = require("../core/database/db-pool");
const credential_errors_1 = require("./credential-errors");
// Match Postgres' UUID input shape. Existing AWS/Cognito user IDs in this app
// can be UUID-shaped without RFC version/variant bits, and Postgres accepts them.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value) {
    return Boolean(value && UUID_RE.test(value));
}
async function normalizeCredentialUserId(userId, email) {
    if (isUuid(userId))
        return userId;
    const context = { userId, provider: 'identity', requiredScopes: [], resolverStep: 'normalizeUserId' };
    const linkRows = await (0, db_pool_1.queryAsService)(`SELECT canonical_user_id
       FROM identity_links
      WHERE linked_user_id = $1
      LIMIT 1`, [userId]);
    if (isUuid(linkRows[0]?.canonical_user_id))
        return linkRows[0].canonical_user_id;
    if (email) {
        const profileRows = await (0, db_pool_1.queryAsService)(`SELECT user_id
         FROM profiles
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`, [email]);
        if (isUuid(profileRows[0]?.user_id))
            return profileRows[0].user_id;
    }
    throw new credential_errors_1.CredentialUserIdError(context);
}
