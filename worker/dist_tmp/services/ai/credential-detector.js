"use strict";
/**
 * Credential Detector
 *
 * Rule-based credential detection from workflow structure.
 * This is STEP 3 of the pipeline: Detect Required Credentials
 *
 * Rules:
 * - Must be rule-based (not AI-based)
 * - Scan all action nodes
 * - Extract required connectors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialDetector = exports.CredentialDetector = void 0;
const unified_node_registry_1 = require("../../core/registry/unified-node-registry");
class CredentialDetector {
    /**
     * Detect required credentials from workflow structure
     */
    detectCredentials(structure, existingCredentials) {
        console.log(`[CredentialDetector] Detecting credentials for workflow structure`);
        const requiredCredentials = [];
        const satisfiedCredentials = [];
        const missingCredentials = [];
        // Scan all nodes for required credentials
        structure.nodes.forEach(node => {
            const credential = this.detectNodeCredentials(node);
            if (credential) {
                requiredCredentials.push(credential);
                // Check if credential is satisfied
                const isSatisfied = existingCredentials &&
                    existingCredentials[credential.provider] &&
                    this.validateCredentialFields(credential, existingCredentials[credential.provider]);
                if (isSatisfied) {
                    satisfiedCredentials.push(credential);
                }
                else {
                    missingCredentials.push(credential);
                }
            }
        });
        // Also check trigger for credentials (e.g., webhook might need API key)
        const triggerCredential = this.detectTriggerCredentials(structure.trigger, structure.trigger_config);
        if (triggerCredential) {
            requiredCredentials.push(triggerCredential);
            const isSatisfied = existingCredentials &&
                existingCredentials[triggerCredential.provider] &&
                this.validateCredentialFields(triggerCredential, existingCredentials[triggerCredential.provider]);
            if (isSatisfied) {
                satisfiedCredentials.push(triggerCredential);
            }
            else {
                missingCredentials.push(triggerCredential);
            }
        }
        return {
            required_credentials: requiredCredentials,
            missing_credentials: missingCredentials,
            satisfied_credentials: satisfiedCredentials,
        };
    }
    /**
     * Detect credentials required by a node
     */
    detectNodeCredentials(node) {
        const nodeType = node.type;
        const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
        const credSchema = nodeDef?.credentialSchema;
        // No credential schema or no requirements → node doesn't need credentials
        if (!credSchema || !credSchema.requirements || credSchema.requirements.length === 0) {
            return null;
        }
        const req = credSchema.requirements[0];
        const fields = credSchema.credentialFields && credSchema.credentialFields.length > 0
            ? credSchema.credentialFields
            : [];
        if (fields.length === 0)
            return null;
        return {
            provider: req.provider,
            vaultKey: req.vaultKey || req.provider,
            fields,
            node_id: node.id,
            node_type: nodeType,
        };
    }
    /**
     * Detect credentials required by trigger
     */
    detectTriggerCredentials(trigger, triggerConfig) {
        // Most triggers don't need credentials, but webhook might need API key
        if (trigger === 'webhook' && triggerConfig?.requires_auth) {
            return {
                provider: 'webhook',
                vaultKey: 'webhook',
                fields: ['api_key'],
            };
        }
        return null;
    }
    /**
     * Validate credential fields are present
     */
    validateCredentialFields(credential, credentialData) {
        return credential.fields.every(field => {
            // Check if field exists and is not empty
            const value = credentialData[field];
            return value !== undefined && value !== null && value !== '';
        });
    }
    /**
     * Get credential field descriptions for UI
     */
    getCredentialFieldDescriptions(provider) {
        const descriptions = {
            'hubspot': {
                'access_token': 'HubSpot access token',
                'refresh_token': 'HubSpot refresh token',
            },
            'zoho_crm': {
                'client_id': 'Zoho CRM client ID',
                'client_secret': 'Zoho CRM client secret',
                'refresh_token': 'Zoho CRM refresh token',
            },
            'google_sheets': {
                'client_id': 'Google OAuth client ID',
                'client_secret': 'Google OAuth client secret',
                'refresh_token': 'Google OAuth refresh token',
            },
            'slack': {
                'webhook_url': 'Slack webhook URL',
            },
            'discord': {
                'webhook_url': 'Discord webhook URL',
            },
        };
        return descriptions[provider] || {};
    }
}
exports.CredentialDetector = CredentialDetector;
exports.credentialDetector = new CredentialDetector();
