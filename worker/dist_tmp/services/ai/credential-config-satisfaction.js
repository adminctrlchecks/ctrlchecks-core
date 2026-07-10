"use strict";
/**
* Shared rules for "credential satisfied by node config" (no vault).
* Used by CredentialResolver and CredentialDiscoveryPhase — single source of truth.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidWebhookUrlInConfig = isValidWebhookUrlInConfig;
exports.isOAuthRefSatisfiedInConfig = isOAuthRefSatisfiedInConfig;
exports.isCredentialSatisfiedByNodeConfig = isCredentialSatisfiedByNodeConfig;
function isNonPlaceholderString(value) {
    if (typeof value !== 'string')
        return false;
    const t = value.trim();
    if (!t)
        return false;
    if (t.includes('{{ENV.') || t.includes('{{$json'))
        return false;
    return true;
}
/** Valid webhook URL in node config (mirrors credential-discovery-phase Slack checks). */
function isValidWebhookUrlInConfig(value) {
    if (!isNonPlaceholderString(value))
        return false;
    return value.startsWith('http');
}
/** OAuth: credentialId / credentialRef present and non-placeholder (mirrors discovery). */
function isOAuthRefSatisfiedInConfig(config) {
    const cid = String(config.credentialId ?? '').trim();
    const cref = String(config.credentialRef ?? '').trim();
    const ref = cid || cref;
    const lower = ref.toLowerCase();
    if (!ref || lower === 'none')
        return false;
    if (ref.includes('{{') || lower.includes('placeholder'))
        return false;
    return true;
}
/**
 * Returns true if the node's config satisfies the credential contract without vault access.
 */
function isCredentialSatisfiedByNodeConfig(node, contract) {
    const config = (node.data?.config || {});
    if (contract.type === 'oauth') {
        return isOAuthRefSatisfiedInConfig(config);
    }
    if (contract.type === 'webhook') {
        const field = contract.credentialFieldName || 'webhookUrl';
        if (isValidWebhookUrlInConfig(config[field]))
            return true;
        if (field !== 'webhook_url' && isValidWebhookUrlInConfig(config.webhook_url))
            return true;
        if (field !== 'webhookUrl' && isValidWebhookUrlInConfig(config.webhookUrl))
            return true;
        return false;
    }
    if (contract.type === 'api_key' || contract.type === 'token') {
        const field = contract.credentialFieldName;
        if (field) {
            const v = config[field];
            return isNonPlaceholderString(v);
        }
        return false;
    }
    return false;
}
