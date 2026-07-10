"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFieldOwnershipPolicy = resolveFieldOwnershipPolicy;
const unified_node_registry_1 = require("../registry/unified-node-registry");
const credential_field_vault_meta_1 = require("./credential-field-vault-meta");
const field_ownership_1 = require("./field-ownership");
const fill_mode_resolver_1 = require("./fill-mode-resolver");
function resolveFieldOwnershipPolicy(nodeType, fieldName, config = {}) {
    const definition = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    const field = definition?.inputSchema?.[fieldName];
    if (!field)
        return undefined;
    const ownership = field.ownership ?? (0, field_ownership_1.classifyFieldOwnership)(fieldName, field);
    const fillMode = (0, fill_mode_resolver_1.resolveEffectiveFieldFillMode)(fieldName, definition.inputSchema, config);
    const credentialPolicy = field.credentialTogglePolicy ?? 'locked';
    const credentialUnlocked = ownership === 'credential' &&
        credentialPolicy === 'unlockable' &&
        config._ownershipUnlock?.[fieldName] === true;
    const vaultMeta = ownership === 'credential'
        ? (0, credential_field_vault_meta_1.getCredentialVaultMetaForField)(nodeType, fieldName)
        : undefined;
    return {
        fillMode,
        mode: fillMode === 'runtime_ai'
            ? 'ai_runtime'
            : fillMode === 'buildtime_ai_once'
                ? 'ai_built'
                : 'user',
        ownership,
        supportsRuntimeAI: field.fillMode?.supportsRuntimeAI !== false,
        supportsBuildtimeAI: field.fillMode?.supportsBuildtimeAI !== false,
        isVaultCredential: ownership === 'credential' && !!vaultMeta,
        isLocked: ownership === 'credential' && !credentialUnlocked,
    };
}
