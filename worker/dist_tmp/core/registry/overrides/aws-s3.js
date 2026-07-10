"use strict";
/**
 * ✅ AWS S3 NODE - Migrated to Registry
 *
 * AWS S3 storage operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideAwsS3 = overrideAwsS3;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
function overrideAwsS3(def, schema) {
    return {
        ...def,
        execute: async (context) => {
            return await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({ context, schema });
        },
    };
}
