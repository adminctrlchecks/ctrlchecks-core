"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executionPreflight = executionPreflight;
const credential_resolver_1 = require("./credential-resolver");
const credential_scope_registry_1 = require("./credential-scope-registry");
async function executionPreflight(input) {
    const failures = [];
    for (const node of input.nodes) {
        const nodeType = node.data?.type || node.type || '';
        const requirement = (0, credential_scope_registry_1.credentialRequirementForNode)(nodeType);
        if (!requirement)
            continue;
        try {
            await (0, credential_resolver_1.resolveCredentialDryRun)({
                userId: input.ownerId,
                provider: requirement.provider,
                requiredScopes: requirement.requiredScopes,
                action: node.data?.label || node.data?.name || nodeType,
            });
        }
        catch (error) {
            failures.push({
                nodeId: node.id || nodeType,
                nodeName: node.data?.label || node.data?.name || nodeType,
                nodeType,
                provider: requirement.provider,
                requiredScopes: requirement.requiredScopes,
                error: (0, credential_resolver_1.formatCredentialError)(error, node.data?.label || nodeType),
            });
        }
    }
    return { ok: failures.length === 0, failures };
}
