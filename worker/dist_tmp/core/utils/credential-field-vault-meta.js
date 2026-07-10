"use strict";
/**
 * Maps a node's credential-owned config field to the vault key used by
 * credential discovery and attach-credentials (connector registry is source of truth).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCredentialVaultMetaForField = getCredentialVaultMetaForField;
exports.getPrimaryCredentialFieldForNode = getPrimaryCredentialFieldForNode;
const connector_registry_1 = require("../../services/connectors/connector-registry");
const node_library_1 = require("../../services/nodes/node-library");
/**
 * Returns vault metadata when this field is the connector's primary credential field
 * for attach-credentials / filterCredentialQuestions matching.
 */
function getCredentialVaultMetaForField(nodeType, fieldName) {
    const canonical = typeof node_library_1.nodeLibrary.getCanonicalType === 'function'
        ? node_library_1.nodeLibrary.getCanonicalType(nodeType)
        : nodeType;
    const connector = connector_registry_1.connectorRegistry.getConnectorByNodeType(canonical);
    if (!connector)
        return undefined;
    const cc = connector.credentialContract;
    const fl = fieldName.toLowerCase();
    if (cc.credentialFieldName) {
        if (fieldName !== cc.credentialFieldName)
            return undefined;
    }
    else {
        switch (cc.type) {
            case 'webhook':
                if (!fl.includes('webhook') && !fl.includes('webhookurl'))
                    return undefined;
                break;
            case 'oauth':
                if (!fl.includes('credential') &&
                    fl !== 'credentialid' &&
                    fl !== 'credential_id') {
                    return undefined;
                }
                break;
            case 'token':
            case 'api_key':
            case 'basic_auth':
                if (!fl.includes('api') &&
                    !fl.includes('token') &&
                    !fl.includes('key') &&
                    !fl.includes('secret') &&
                    !fl.includes('password') &&
                    !fl.includes('auth')) {
                    return undefined;
                }
                break;
            default:
                return undefined;
        }
    }
    const vk = String(cc.vaultKey || '').trim();
    if (!vk)
        return undefined;
    return { vaultKey: vk, credentialId: vk };
}
function getPrimaryCredentialFieldForNode(nodeType) {
    const canonical = typeof node_library_1.nodeLibrary.getCanonicalType === 'function'
        ? node_library_1.nodeLibrary.getCanonicalType(nodeType)
        : nodeType;
    const connector = connector_registry_1.connectorRegistry.getConnectorByNodeType(canonical);
    if (!connector)
        return undefined;
    const cc = connector.credentialContract;
    const fieldName = cc.credentialFieldName ||
        (cc.type === 'webhook' ? 'webhookUrl' : cc.type === 'api_key' ? 'apiKey' : cc.type === 'oauth' ? 'credentialId' : 'credential');
    const vk = String(cc.vaultKey || '').trim();
    if (!vk)
        return undefined;
    return {
        fieldName,
        vaultKey: vk,
        credentialId: vk,
        displayName: cc.displayName,
    };
}
