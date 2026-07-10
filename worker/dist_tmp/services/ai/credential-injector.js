"use strict";
/**
 * Credential Injector
 *
 * Injects credentials into workflow nodes after user provides them.
 * This is STEP 4 of the pipeline: Inject Credentials into Workflow
 *
 * Rules:
 * - After user provides credentials
 * - Inject credentials into node config
 * - Validate required fields exist
 * - Never allow workflow execution without credentials attached
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialInjector = exports.CredentialInjector = void 0;
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
const unified_node_type_normalizer_1 = require("../../core/utils/unified-node-type-normalizer");
const connector_registry_1 = require("../connectors/connector-registry");
class CredentialInjector {
    /**
     * Inject credentials into workflow
     */
    injectCredentials(workflow, credentials, requiredCredentials) {
        console.log(`[CredentialInjector] Injecting credentials into workflow`);
        const errors = [];
        const warnings = [];
        const updatedNodes = [];
        // Create a map of provider/vaultKey to credential data.
        const credentialMap = new Map();
        Object.entries(credentials).forEach(([provider, data]) => {
            credentialMap.set(provider.toLowerCase(), data);
        });
        // Inject credentials into each node
        workflow.nodes.forEach(node => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
            const requiredCredential = requiredCredentials.find(rc => rc.node_id === node.id || rc.node_type === nodeType);
            if (requiredCredential) {
                const vaultKey = this.getVaultKey(requiredCredential, nodeType);
                const credentialData = credentialMap.get((requiredCredential.vaultKey || '').toLowerCase()) ||
                    credentialMap.get(vaultKey.toLowerCase()) ||
                    credentialMap.get(requiredCredential.provider.toLowerCase());
                if (!credentialData) {
                    errors.push(`Missing credentials for ${requiredCredential.provider} (node: ${node.id})`);
                    updatedNodes.push(node); // Keep node without credentials (will fail validation)
                    return;
                }
                // Validate all required fields are present
                const missingFields = requiredCredential.fields.filter(field => !credentialData[field] || credentialData[field] === '');
                if (missingFields.length > 0) {
                    errors.push(`Missing credential fields for ${requiredCredential.provider} (node: ${node.id}): ${missingFields.join(', ')}`);
                    updatedNodes.push(node);
                    return;
                }
                // Inject credential ID into node config
                const updatedNode = this.injectCredentialIntoNode(node, requiredCredential.provider, credentialData, vaultKey);
                updatedNodes.push(updatedNode);
                console.log(`[CredentialInjector] ✅ Injected credentials for ${requiredCredential.provider} into node ${node.id}`);
            }
            else {
                // Node doesn't require credentials
                updatedNodes.push(node);
            }
        });
        // Validate all required credentials are injected
        const missingCredentials = requiredCredentials.filter(rc => {
            const credentialData = credentialMap.get((rc.vaultKey || '').toLowerCase()) ||
                credentialMap.get(this.getVaultKey(rc, rc.node_type || '').toLowerCase()) ||
                credentialMap.get(rc.provider.toLowerCase());
            return !credentialData || !this.validateCredentialFields(rc, credentialData);
        });
        if (missingCredentials.length > 0) {
            errors.push(`Missing credentials for: ${missingCredentials.map(rc => rc.provider).join(', ')}`);
        }
        const result = {
            success: errors.length === 0,
            workflow: {
                ...workflow,
                nodes: updatedNodes,
            },
            errors,
            warnings,
        };
        if (errors.length > 0) {
            console.error(`[CredentialInjector] ❌ Credential injection failed:`, errors);
        }
        else {
            console.log(`[CredentialInjector] ✅ All credentials injected successfully`);
        }
        return result;
    }
    /**
     * Inject credential into node config
     */
    injectCredentialIntoNode(node, provider, credentialData, vaultKey) {
        // Get node type to determine credential field name
        const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
        // Determine credential field name (usually 'credentialId' or provider-specific)
        const credentialField = this.getCredentialFieldName(nodeType, provider);
        // Update node config
        const updatedConfig = {
            ...(node.data?.config || {}),
            [credentialField]: credentialData, // Store credential data in config
            credentialId: vaultKey, // Stable dashboard/catalog/vault reference
        };
        return {
            ...node,
            data: {
                ...node.data,
                config: updatedConfig,
            },
        };
    }
    /**
     * Get credential field name for node type — registry-driven, no hardcoded map.
     */
    getCredentialFieldName(nodeType, provider) {
        const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
        const credFields = nodeDef?.credentialSchema?.credentialFields;
        if (credFields && credFields.length > 0)
            return credFields[0];
        return 'credentialId';
    }
    getVaultKey(credential, nodeType) {
        if (credential.vaultKey)
            return credential.vaultKey;
        const connector = nodeType ? connector_registry_1.connectorRegistry.getConnectorByNodeType(nodeType) : null;
        return connector?.credentialContract.vaultKey || credential.provider;
    }
    /**
     * Validate credential fields are present
     */
    validateCredentialFields(credential, credentialData) {
        return credential.fields.every(field => {
            const value = credentialData[field];
            return value !== undefined && value !== null && value !== '';
        });
    }
    /**
     * Check if workflow has all required credentials
     */
    hasAllCredentials(workflow, requiredCredentials) {
        const nodeCredentialMap = new Map();
        workflow.nodes.forEach(node => {
            const nodeType = (0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node);
            const requiredCredential = requiredCredentials.find(rc => rc.node_id === node.id || rc.node_type === nodeType);
            if (requiredCredential) {
                const hasCredential = this.nodeHasCredential(node, requiredCredential.provider);
                nodeCredentialMap.set(node.id, hasCredential);
            }
            else {
                nodeCredentialMap.set(node.id, true); // Node doesn't need credentials
            }
        });
        return Array.from(nodeCredentialMap.values()).every(hasCredential => hasCredential);
    }
    /**
     * Check if node has credential injected
     */
    nodeHasCredential(node, provider) {
        const config = node.data?.config || {};
        return !!(config.credentialId || config[this.getCredentialFieldName((0, unified_node_type_normalizer_1.unifiedNormalizeNodeType)(node), provider)]);
    }
}
exports.CredentialInjector = CredentialInjector;
exports.credentialInjector = new CredentialInjector();
