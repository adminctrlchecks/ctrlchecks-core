"use strict";
/**
 * ✅ GITLAB NODE - Migrated to Registry
 *
 * GitLab integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideGitlab = overrideGitlab;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideGitlab(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
