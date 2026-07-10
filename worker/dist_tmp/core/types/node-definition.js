"use strict";
/**
 * Unified Node Definition Contract
 *
 * Every node in the system must conform to this interface.
 * This ensures consistency, validation, and deterministic execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeDefinitionRegistry = exports.NodeDefinitionRegistry = void 0;
const unified_node_registry_1 = require("../registry/unified-node-registry");
/**
 * Node Definition Registry
 *
 * Central registry for all node definitions.
 * Backend is the source of truth.
 */
class NodeDefinitionRegistry {
    /**
     * Compatibility shim.
     *
     * 🚨 Single Source of Truth: UnifiedNodeRegistry
     * This legacy registry now delegates to `unifiedNodeRegistry` so ALL schemas/defaults/migrations
     * come from one place for existing + future workflows.
     */
    register(_definition) {
        // Legacy no-op: definitions must be registered in UnifiedNodeRegistry (or NodeLibrary feeding it).
        // Kept to avoid breaking old imports that auto-register node definitions.
    }
    toLegacy(def) {
        const inputSchema = {};
        for (const [k, v] of Object.entries(def.inputSchema || {})) {
            inputSchema[k] = {
                type: v.type === 'expression' ? 'string' : v.type,
                description: v.description || '',
                required: !!v.required,
                default: v.default,
                examples: v.examples,
                helpCategory: v.helpCategory,
                docsUrl: v.docsUrl,
                exampleValue: v.exampleValue,
                fillMode: v.fillMode,
                role: v.role,
                ownership: v.ownership,
                essentialForExecution: v.essentialForExecution,
                ...(v.ui ? { ui: v.ui } : {}),
            };
        }
        const outputSchema = {};
        for (const [port, pdef] of Object.entries(def.outputSchema || {})) {
            outputSchema[port] = {
                type: pdef.schema?.type || 'object',
                description: pdef.description || '',
            };
        }
        return {
            type: def.type,
            label: def.label,
            category: def.category,
            description: def.description,
            icon: def.icon,
            version: 1,
            inputSchema,
            outputSchema,
            requiredInputs: def.requiredInputs || [],
            outgoingPorts: def.outgoingPorts || ['default'],
            incomingPorts: def.incomingPorts || ['default'],
            isBranching: !!def.isBranching,
            validateInputs: (inputs) => {
                const res = def.validateConfig(inputs || {});
                return { valid: res.valid, errors: res.errors };
            },
            defaultInputs: () => def.defaultConfig(),
            credentialSchema: def.credentialSchema
                ? {
                    providers: Array.from(new Set(def.credentialSchema.requirements
                        .map((r) => r.provider)
                        .filter((p) => typeof p === 'string' && p.length > 0))),
                    required: def.credentialSchema.requirements.filter((r) => r.required).map((r) => r.category),
                    requirements: def.credentialSchema.requirements,
                    credentialFields: def.credentialSchema.credentialFields,
                }
                : undefined,
            migrations: undefined,
            run: undefined,
        };
    }
    get(type) {
        const def = unified_node_registry_1.unifiedNodeRegistry.get(type);
        return def ? this.toLegacy(def) : undefined;
    }
    getAll() {
        return unified_node_registry_1.unifiedNodeRegistry.getAllTypes().map((t) => this.get(t)).filter(Boolean);
    }
    getAllByCategory() {
        const byCategory = {};
        for (const def of this.getAll()) {
            if (!byCategory[def.category])
                byCategory[def.category] = [];
            byCategory[def.category].push(def);
        }
        return byCategory;
    }
    /**
     * Migrate node inputs to latest version
     */
    migrateInputs(nodeType, inputs, fromVersion) {
        // UnifiedNodeRegistry owns migrations (string versioning).
        // fromVersion is ignored here for compatibility; runtime always migrates to latest.
        void fromVersion;
        return unified_node_registry_1.unifiedNodeRegistry.migrateConfig(nodeType, inputs || {});
    }
    /**
     * Validate node inputs against schema
     * ✅ STRICT ARCHITECTURE: Pre-validation guard before registry
     */
    validateNodeInputs(nodeType, inputs) {
        // Pre-validation: ensure node type is canonical
        try {
            const { assertValidNodeType } = require('../../core/utils/node-authority');
            assertValidNodeType(nodeType);
        }
        catch (error) {
            return { valid: false, errors: [error.message] };
        }
        // Registry validation (only reached if pre-validation passes)
        const res = unified_node_registry_1.unifiedNodeRegistry.validateConfig(nodeType, inputs || {});
        return { valid: res.valid, errors: res.errors };
    }
    /**
     * Get default inputs for a node type
     */
    getDefaultInputs(nodeType) {
        return unified_node_registry_1.unifiedNodeRegistry.getDefaultConfig(nodeType) || {};
    }
}
exports.NodeDefinitionRegistry = NodeDefinitionRegistry;
// Global registry instance
exports.nodeDefinitionRegistry = new NodeDefinitionRegistry();
