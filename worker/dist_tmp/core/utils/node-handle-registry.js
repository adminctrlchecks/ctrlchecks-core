"use strict";
/**
 * Node Handle Registry
 *
 * ✅ CRITICAL: Single source of truth for React Flow handle IDs
 *
 * This registry defines the valid handle IDs that exist in React node components.
 * All backend code (normalizer, edge generator, AI builder) must use these IDs.
 *
 * React components define handles in WorkflowNode.tsx:
 * - Most nodes: `input` (target) and `output` (source)
 * - If/Else: `true` and `false` (source handles)
 * - Switch: case values (source handles)
 * - AI Agent: standard single `input` (target), `output` (source)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NODE_HANDLE_REGISTRY = void 0;
exports.getNodeHandleContract = getNodeHandleContract;
exports.getDefaultSourceHandle = getDefaultSourceHandle;
exports.getDefaultTargetHandle = getDefaultTargetHandle;
exports.getDynamicOutputHandles = getDynamicOutputHandles;
exports.resolveSourceHandleDynamically = resolveSourceHandleDynamically;
exports.resolveTargetHandleDynamically = resolveTargetHandleDynamically;
exports.isValidHandle = isValidHandle;
exports.normalizeSourceHandle = normalizeSourceHandle;
exports.normalizeTargetHandle = normalizeTargetHandle;
exports.normalizeHandleId = normalizeHandleId;
exports.validateAndFixEdgeHandles = validateAndFixEdgeHandles;
/**
 * ✅ UNIVERSAL: Generate handle registry from unified-node-registry
 *
 * This registry is dynamically generated from the unified node registry,
 * ensuring all nodes automatically have correct handle definitions.
 *
 * These MUST match the Handle components in WorkflowNode.tsx
 */
const unified_node_registry_1 = require("../registry/unified-node-registry");
/**
 * ✅ UNIVERSAL: Generate handle contract from registry
 */
function generateHandleContractFromRegistry(nodeType) {
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    if (!nodeDef) {
        // Fallback to default for unknown nodes
        return {
            inputs: ['input'],
            outputs: ['output'],
        };
    }
    // ✅ UNIVERSAL: Use registry ports as single source of truth
    const inputs = nodeDef.incomingPorts && nodeDef.incomingPorts.length > 0
        ? nodeDef.incomingPorts
        : (nodeDef.category === 'trigger' ? [] : ['input']);
    const outputs = nodeDef.outgoingPorts && nodeDef.outgoingPorts.length > 0
        ? nodeDef.outgoingPorts
        : ['output'];
    // ✅ REGISTRY-DRIVEN: Use outgoingPorts from registry for branching nodes
    // This replaces hardcoded if_else/switch/manual_trigger/chat_trigger checks
    if (nodeDef.isBranching) {
        const ports = nodeDef.outgoingPorts || [];
        const hasSemanticPorts = ports.length > 0 && !ports.every((p) => p === 'output' || p === 'default');
        if (hasSemanticPorts) {
            // Fixed-port branching node (e.g. if_else → ['true','false'])
            return {
                inputs: nodeDef.incomingPorts && nodeDef.incomingPorts.length > 0 ? nodeDef.incomingPorts : ['input'],
                outputs: ports,
            };
        }
        // Dynamic branching node (switch with runtime case values) — no fixed output contract
        return {
            inputs: nodeDef.incomingPorts && nodeDef.incomingPorts.length > 0 ? nodeDef.incomingPorts : ['input'],
            outputs: [], // Dynamic — resolved at runtime from config.cases
        };
    }
    return {
        inputs,
        outputs,
    };
}
/**
 * ✅ UNIVERSAL: Lazy-loaded handle registry (generated from registry)
 */
let _handleRegistryCache = null;
function buildHandleRegistry() {
    if (_handleRegistryCache) {
        return _handleRegistryCache;
    }
    const registry = {
        // Default fallback
        default: {
            inputs: ['input'],
            outputs: ['output'],
        },
    };
    // ✅ UNIVERSAL: Generate handles for all nodes in registry
    const allNodeTypes = unified_node_registry_1.unifiedNodeRegistry.getAllTypes();
    for (const nodeType of allNodeTypes) {
        registry[nodeType] = generateHandleContractFromRegistry(nodeType);
    }
    _handleRegistryCache = registry;
    return registry;
}
/**
 * ✅ UNIVERSAL: Get handle registry (generated from unified registry)
 */
exports.NODE_HANDLE_REGISTRY = new Proxy({}, {
    get(target, prop) {
        const registry = buildHandleRegistry();
        return registry[prop] || registry.default;
    },
    ownKeys() {
        const registry = buildHandleRegistry();
        return Object.keys(registry);
    },
    has(target, prop) {
        const registry = buildHandleRegistry();
        return prop in registry;
    },
});
/**
 * Get valid handle contract for a node type
 */
function getNodeHandleContract(nodeType) {
    return exports.NODE_HANDLE_REGISTRY[nodeType] || exports.NODE_HANDLE_REGISTRY.default;
}
/**
 * Get default source handle for a node type
 */
function getDefaultSourceHandle(nodeType) {
    const contract = getNodeHandleContract(nodeType);
    // Return first output handle or 'output'
    return contract.outputs[0] || 'output';
}
/**
 * Get default target handle for a node type
 */
function getDefaultTargetHandle(nodeType) {
    const contract = getNodeHandleContract(nodeType);
    // Return first input handle or 'input'
    return contract.inputs[0] || 'input';
}
/**
 * ✅ UNIVERSAL: Get dynamic output handles for a node
 *
 * This function analyzes the node dynamically and returns valid output handles:
 * - Switch nodes: Reads cases from node.config.cases (dynamic)
 * - if_else nodes: Returns ['true', 'false']
 * - Other nodes: Returns from registry
 *
 * @param nodeType - Node type
 * @param nodeConfig - Optional node config (for switch nodes to read cases)
 * @returns Array of valid output handle IDs
 */
function getDynamicOutputHandles(nodeType, nodeConfig) {
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
    // Branching nodes with dynamic cases (switch-like): read from config
    if (nodeDef?.isBranching) {
        const staticPorts = nodeDef.outgoingPorts || [];
        // If registry declares semantically meaningful fixed ports (e.g. if_else → ['true','false']), use them
        const hasSemanticPorts = staticPorts.length > 0 && !staticPorts.every((p) => p === 'output' || p === 'default');
        if (hasSemanticPorts) {
            return staticPorts;
        }
        // Dynamic branching node (switch): read cases from config
        if (nodeConfig?.cases) {
            try {
                const cases = typeof nodeConfig.cases === 'string'
                    ? JSON.parse(nodeConfig.cases)
                    : Array.isArray(nodeConfig.cases)
                        ? nodeConfig.cases
                        : [];
                const caseHandles = cases
                    .map((c) => c?.value != null ? String(c.value) : null)
                    .filter((v) => v !== null);
                if (caseHandles.length > 0)
                    return caseHandles;
            }
            catch (error) {
                console.warn(`[getDynamicOutputHandles] Failed to parse cases for ${nodeType}: ${error}`);
            }
        }
        return []; // Dynamic — no cases configured yet
    }
    // Non-branching nodes: use registry ports or default
    const contract = getNodeHandleContract(nodeType);
    return contract.outputs.length > 0 ? contract.outputs : ['output'];
}
/**
 * ✅ UNIVERSAL: Validate and resolve source handle dynamically
 *
 * This function:
 * 1. If structure specifies sourceOutput → validate it against node's dynamic outputs
 * 2. If invalid → auto-correct to first valid output
 * 3. If missing → returns null (caller should use resolver)
 *
 * @param sourceNode - Source workflow node
 * @param structureSourceOutput - Optional sourceOutput from structure
 * @returns Valid source handle ID, or null if not specified in structure
 */
function resolveSourceHandleDynamically(sourceNode, structureSourceOutput) {
    const sourceType = (sourceNode.data?.type || sourceNode.type || 'default');
    const nodeConfig = sourceNode.data?.config;
    // If no structure sourceOutput specified, return null (caller should use resolver)
    if (!structureSourceOutput) {
        return null;
    }
    // Get dynamic outputs for this node type
    const validOutputs = getDynamicOutputHandles(sourceType, nodeConfig);
    const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(sourceType);
    // Dynamic branching nodes (switch with runtime case values): accept any non-empty handle
    if (nodeDef?.isBranching) {
        const fixedPorts = nodeDef.outgoingPorts || [];
        const hasSemanticPorts = fixedPorts.length > 0 && !fixedPorts.every((p) => p === 'output' || p === 'default');
        if (!hasSemanticPorts) {
            return structureSourceOutput; // Dynamic case values — pass through
        }
    }
    // For other nodes, validate against valid outputs
    if (validOutputs.includes(structureSourceOutput)) {
        return structureSourceOutput; // Valid - use as-is
    }
    // ✅ PRODUCTION-READY: For branching nodes with fixed semantic ports (e.g. if_else), FAIL on invalid handles
    if (nodeDef?.isBranching && nodeDef.outgoingPorts && nodeDef.outgoingPorts.length > 0) {
        const fixedPorts = nodeDef.outgoingPorts;
        const hasSemanticPorts = !fixedPorts.every((p) => p === 'output' || p === 'default');
        if (hasSemanticPorts) {
            const error = `Invalid sourceOutput "${structureSourceOutput}" for ${sourceType} node. ` +
                `Must be one of: ${fixedPorts.join(', ')}. ` +
                `This indicates a structure builder error that must be fixed.`;
            console.error(`[resolveSourceHandleDynamically] ❌ ${error}`);
            throw new Error(`Workflow invalid: ${error}. Branching edges must have explicit sourceOutput matching declared ports.`);
        }
    }
    // For other nodes, auto-correct with warning (less critical)
    console.warn(`[resolveSourceHandleDynamically] Invalid sourceOutput "${structureSourceOutput}" for ${sourceType}. ` +
        `Valid outputs: ${validOutputs.join(', ')}. Auto-correcting to "${validOutputs[0] || 'output'}"`);
    return validOutputs[0] || 'output';
}
/**
 * ✅ PRODUCTION-READY: Validate and resolve target handle dynamically
 *
 * This function:
 * 1. If structure specifies targetInput → validate it against node's inputs
 * 2. If invalid → auto-correct to first valid input (with warning)
 * 3. If missing → returns null (caller should use resolver)
 *
 * @param targetNode - Target workflow node
 * @param structureTargetInput - Optional targetInput from structure
 * @returns Valid target handle ID, or null if not specified in structure
 */
function resolveTargetHandleDynamically(targetNode, structureTargetInput) {
    const targetType = (targetNode.data?.type || targetNode.type || 'default');
    // If no structure targetInput specified, return null (caller should use resolver)
    if (!structureTargetInput) {
        return null;
    }
    // Get valid inputs for this node type
    const contract = getNodeHandleContract(targetType);
    const validInputs = contract.inputs;
    // Validate against valid inputs
    if (validInputs.includes(structureTargetInput)) {
        return structureTargetInput; // Valid - use as-is
    }
    // Invalid handle - auto-correct to first valid input (with warning)
    console.warn(`[resolveTargetHandleDynamically] Invalid targetInput "${structureTargetInput}" for ${targetType}. ` +
        `Valid inputs: ${validInputs.join(', ')}. Auto-correcting to "${validInputs[0] || 'input'}"`);
    return validInputs[0] || 'input';
}
/**
 * ✅ ROOT-LEVEL FIX: Validate if a handle ID is valid for a node type
 *
 * Uses unified node registry as single source of truth (not hardcoded registry)
 * This ensures validation matches the actual node definitions
 */
function isValidHandle(nodeType, handleId, isSource) {
    // ✅ ROOT-LEVEL FIX: Use unified node registry as single source of truth
    const { unifiedNodeRegistry } = require('../registry/unified-node-registry');
    const { unifiedNormalizeNodeTypeString } = require('./unified-node-type-normalizer');
    const normalizedType = unifiedNormalizeNodeTypeString(nodeType);
    const nodeDef = unifiedNodeRegistry.get(normalizedType);
    if (!nodeDef) {
        // Node not in registry - fallback to hardcoded registry for backward compatibility
        const contract = getNodeHandleContract(nodeType);
        if (isSource) {
            if (nodeType === 'switch') {
                return true; // Accept any handle ID for switch (validated at runtime)
            }
            return contract.outputs.includes(handleId);
        }
        else {
            return contract.inputs.includes(handleId);
        }
    }
    // ✅ Use unified registry ports (single source of truth)
    if (isSource) {
        const nodeDef2 = unifiedNodeRegistry.get(normalizedType);
        // Branching nodes: accept any non-empty handle.
        // For nodes with fixed ports (e.g. if_else → ['true','false']), the declared ports
        // are the valid set. For nodes with dynamic case values (e.g. switch), the declared
        // outgoingPorts is only a fallback for the orchestrator — actual case values like
        // "editor", "inactive", "shipped" are valid at runtime and must be accepted.
        if (nodeDef2?.isBranching) {
            const fixedPorts = nodeDef2.outgoingPorts || [];
            // If the handle matches a declared port, always valid
            if (fixedPorts.includes(handleId))
                return true;
            // If the node has fixed ports that are semantically meaningful (not just ['output'] fallback),
            // reject handles not in that set. 'output' is a generic fallback, not a semantic constraint.
            const hasSemanticPorts = fixedPorts.length > 0 && !fixedPorts.every((p) => p === 'output' || p === 'default');
            if (hasSemanticPorts) {
                // Fixed-port branching node (e.g. if_else) — only declared ports are valid
                return false;
            }
            // Dynamic branching node (switch with runtime case values) — any non-empty handle is valid
            return handleId.length > 0;
        }
        const validPorts = nodeDef.outgoingPorts || [];
        return validPorts.includes(handleId);
    }
    else {
        const validPorts = nodeDef.incomingPorts && nodeDef.incomingPorts.length > 0
            ? nodeDef.incomingPorts
            : ['input'];
        // React Flow / legacy graphs often use "default" for the primary input handle
        if (handleId === 'default' && validPorts.includes('input')) {
            return true;
        }
        return validPorts.includes(handleId);
    }
}
/**
 * ✅ ENHANCED: Normalize source handle with alias support
 *
 * Maps backend field names to React handle IDs using alias registry
 */
function normalizeSourceHandle(nodeType, handleId) {
    return normalizeHandleId(nodeType, handleId, true);
}
/**
 * ✅ ENHANCED: Normalize target handle with alias support
 *
 * Maps backend field names to React handle IDs using alias registry
 */
function normalizeTargetHandle(nodeType, handleId) {
    return normalizeHandleId(nodeType, handleId, false);
}
/**
 * Normalize handle ID to a valid one for the node type
 *
 * Maps common backend field names to React handle IDs
 * ✅ ENHANCED: Extended alias mappings for better compatibility
 */
function normalizeHandleId(nodeType, handleId, isSource) {
    if (!handleId) {
        // ✅ REGISTRY-DRIVEN: For branching nodes with fixed semantic ports, warn if handle is missing
        const nodeDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
        if (isSource && nodeDef?.isBranching) {
            const fixedPorts = nodeDef.outgoingPorts || [];
            const hasSemanticPorts = fixedPorts.length > 0 && !fixedPorts.every((p) => p === 'output' || p === 'default');
            if (hasSemanticPorts) {
                console.warn(`[normalizeHandleId] ⚠️ Branching node ${nodeType} edge missing sourceHandle - should be one of: ${fixedPorts.join(', ')}`);
                return fixedPorts[0]; // Return first declared port as fallback
            }
        }
        return isSource ? getDefaultSourceHandle(nodeType) : getDefaultTargetHandle(nodeType);
    }
    const handleIdLower = handleId.toLowerCase();
    const contract = getNodeHandleContract(nodeType);
    // ✅ CRITICAL: Check if handle is already valid BEFORE mapping
    // This preserves specific handles like 'message' for chat_trigger, 'inputData' for manual_trigger
    if (isSource) {
        // If handle is already valid, return it (preserves specific handles)
        if (contract.outputs.includes(handleId)) {
            return handleId;
        }
        // ✅ ENHANCED: Extended source handle mappings (outputs)
        // Maps common backend field names to React handle IDs
        const sourceMappings = {
            'data': 'output',
            'output': 'output',
            'result': 'output',
            'response': 'output',
            'response_text': 'output',
            'response_json': 'output',
            'formdata': 'output',
            'body': 'output',
            'content': 'output',
            'message': 'output',
            'text': 'output',
            'json': 'output',
            'value': 'output',
            'items': 'output',
            'rows': 'output',
            'triggertime': 'output',
            'inputdata': 'inputData', // ✅ CRITICAL: manual_trigger uses 'inputData', not 'output'
            'parsed': 'output',
            'formatted': 'output',
            'true': 'true', // if_else
            'false': 'false', // if_else
        };
        // ✅ CRITICAL: Special handling for trigger nodes - preserve their specific outputs
        if (nodeType === 'chat_trigger' && handleIdLower === 'message') {
            // chat_trigger outputs 'message' - preserve it if it exists in contract
            if (contract.outputs.includes('message')) {
                return 'message';
            }
        }
        if (nodeType === 'manual_trigger' && handleIdLower === 'inputdata') {
            // manual_trigger outputs 'inputData' - preserve it if it exists in contract
            if (contract.outputs.includes('inputData')) {
                return 'inputData';
            }
        }
        if (nodeType === 'workflow_trigger' && handleIdLower === 'inputdata') {
            // workflow_trigger outputs 'inputData' - preserve it if it exists in contract
            if (contract.outputs.includes('inputData')) {
                return 'inputData';
            }
        }
        const mapped = sourceMappings[handleIdLower];
        if (mapped && contract.outputs.includes(mapped)) {
            return mapped;
        }
        // ✅ CRITICAL: For 'message' from non-chat_trigger nodes, map to 'output' only if 'message' is not valid
        if (handleIdLower === 'message' && nodeType !== 'chat_trigger') {
            if (contract.outputs.includes('output')) {
                return 'output';
            }
        }
        // ✅ REGISTRY-DRIVEN: Dynamic branching nodes (switch-like) accept any case value
        const srcDef = unified_node_registry_1.unifiedNodeRegistry.get(nodeType);
        if (srcDef?.isBranching && (!srcDef.outgoingPorts || srcDef.outgoingPorts.length === 0)) {
            return handleId; // Dynamic case values — pass through as-is
        }
        // Default to first valid output handle
        return contract.outputs[0] || 'output';
    }
    else {
        // ✅ ENHANCED: Extended target handle mappings (inputs)
        // Maps common backend field names to React handle IDs
        const targetMappings = {
            'data': 'input',
            'input': 'input',
            'message': 'input',
            'text': 'input',
            'body': 'input',
            'content': 'input',
            'userinput': 'input',
            'user_input': 'input',
            'chatmodel': 'input',
            'chat_model': 'input',
            'memory': 'input',
            'tool': 'input',
            'values': 'input',
            'json': 'input',
            'template': 'input',
            'default': 'input',
            'result': 'input',
            'response': 'input',
            'output': 'input',
            'value': 'input',
            'items': 'input',
            'rows': 'input',
        };
        const mapped = targetMappings[handleIdLower];
        if (mapped && contract.inputs.includes(mapped)) {
            return mapped;
        }
        // If handle is already valid, return it
        if (contract.inputs.includes(handleId)) {
            return handleId;
        }
        // Default to first valid input handle
        return contract.inputs[0] || 'input';
    }
}
/**
 * Validate and fix edge handles
 */
function validateAndFixEdgeHandles(sourceNodeType, targetNodeType, sourceHandle, targetHandle) {
    const normalizedSource = normalizeHandleId(sourceNodeType, sourceHandle, true);
    const normalizedTarget = normalizeHandleId(targetNodeType, targetHandle, false);
    return {
        sourceHandle: normalizedSource,
        targetHandle: normalizedTarget,
    };
}
