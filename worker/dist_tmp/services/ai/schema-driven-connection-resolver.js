"use strict";
/**
 * Schema-Driven Connection Resolver
 *
 * Implements schema-driven edge creation based on actual node handles.
 *
 * Rules:
 * - Each node declares inputs: string[] and outputs: string[]
 * - source.output must match target.input type
 * - Never guess handles - reject if no compatible handles
 * - Remove all fallback connection logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaDrivenConnectionResolver = exports.SchemaDrivenConnectionResolver = void 0;
exports.resolveCompatibleHandles = resolveCompatibleHandles;
const node_handle_registry_1 = require("../../core/utils/node-handle-registry");
const node_library_1 = require("../nodes/node-library");
const node_capability_registry_1 = require("../nodes/node-capability-registry");
/**
 * Schema-Driven Connection Resolver
 * Resolves compatible handles between source and target nodes
 */
class SchemaDrivenConnectionResolver {
    /**
     * Resolve compatible handles between source and target nodes
     *
     * @param sourceNode - Source workflow node
     * @param targetNode - Target workflow node
     * @returns Connection resolution with compatible handles or error
     */
    resolveCompatibleHandles(sourceNode, targetNode) {
        const sourceType = sourceNode.data?.type || sourceNode.type;
        const targetType = targetNode.data?.type || targetNode.type;
        console.log(`[SchemaDrivenConnectionResolver] Resolving handles: ${sourceType} → ${targetType}`);
        // Get handle contracts from registry
        const sourceContract = (0, node_handle_registry_1.getNodeHandleContract)(sourceType);
        const targetContract = (0, node_handle_registry_1.getNodeHandleContract)(targetType);
        // Validate contracts exist
        if (!sourceContract || sourceContract.outputs.length === 0) {
            return {
                success: false,
                sourceHandle: null,
                targetHandle: null,
                error: `Source node "${sourceType}" has no output handles defined`,
            };
        }
        if (!targetContract || targetContract.inputs.length === 0) {
            return {
                success: false,
                sourceHandle: null,
                targetHandle: null,
                error: `Target node "${targetType}" has no input handles defined`,
            };
        }
        // Find compatible handle pairs
        const compatibleHandles = [];
        for (const sourceHandle of sourceContract.outputs) {
            for (const targetHandle of targetContract.inputs) {
                // Check if handles are compatible based on type matching
                const compatible = this.areHandlesCompatible(sourceType, sourceHandle, targetType, targetHandle);
                if (compatible) {
                    compatibleHandles.push({
                        sourceHandle,
                        targetHandle,
                        compatible: true,
                    });
                }
            }
        }
        // If no compatible handles found, reject connection
        if (compatibleHandles.length === 0) {
            return {
                success: false,
                sourceHandle: null,
                targetHandle: null,
                error: `No compatible handles found between "${sourceType}" (outputs: ${sourceContract.outputs.join(', ')}) and "${targetType}" (inputs: ${targetContract.inputs.join(', ')})`,
                compatibleHandles: [],
            };
        }
        // Select best compatible handle pair (prefer first match, can be enhanced with priority)
        const bestMatch = compatibleHandles[0];
        console.log(`[SchemaDrivenConnectionResolver] ✅ Found compatible handles: ${bestMatch.sourceHandle} → ${bestMatch.targetHandle}`);
        if (compatibleHandles.length > 1) {
            console.log(`[SchemaDrivenConnectionResolver] ℹ️  ${compatibleHandles.length - 1} other compatible pairs available`);
        }
        return {
            success: true,
            sourceHandle: bestMatch.sourceHandle,
            targetHandle: bestMatch.targetHandle,
            compatibleHandles,
        };
    }
    /**
     * Check if two handles are compatible
     *
     * @param sourceType - Source node type
     * @param sourceHandle - Source handle ID
     * @param targetType - Target node type
     * @param targetHandle - Target handle ID
     * @returns True if handles are compatible
     */
    areHandlesCompatible(sourceType, sourceHandle, targetType, targetHandle) {
        // Normalize aliases (e.g., gmail → google_gmail) so compatibility rules work
        // even when upstream uses virtual node types.
        const sourceCanonical = node_library_1.nodeLibrary.getCanonicalType(sourceType);
        const targetCanonical = node_library_1.nodeLibrary.getCanonicalType(targetType);
        // Get node schemas for type information
        const sourceSchema = node_library_1.nodeLibrary.getSchema(sourceCanonical);
        const targetSchema = node_library_1.nodeLibrary.getSchema(targetCanonical);
        // Basic compatibility rules:
        // 1. If handles have same name and semantic meaning, they're compatible
        // 2. Generic handles (input/output) are compatible with generic handles
        // 3. Specific handles must match exactly or have semantic compatibility
        // Rule 1: Exact handle name match (e.g., "output" → "input")
        if (sourceHandle === 'output' && targetHandle === 'input') {
            return true;
        }
        // Rule 2: Specific handle matches (e.g., "rows" → "input", "data" → "input")
        const genericCompatible = ((sourceHandle === 'output' || sourceHandle === 'data' || sourceHandle === 'rows') &&
            (targetHandle === 'input' || targetHandle === 'userInput'));
        if (genericCompatible) {
            return true;
        }
        // Rule 3: AI Agent specific handles
        if (targetCanonical === 'ai_agent') {
            // AI Agent accepts: userInput, chat_model, memory, tool
            // Most outputs can go to userInput
            if (targetHandle === 'userInput' && (sourceHandle === 'output' || sourceHandle === 'data' || sourceHandle === 'text')) {
                return true;
            }
        }
        // Rule 4: Gmail/Email specific handles
        if (targetCanonical === 'google_gmail' || targetCanonical === 'email') {
            // Gmail accepts: input, body
            if (targetHandle === 'input' || targetHandle === 'body') {
                // Most outputs can go to body/input
                if (sourceHandle === 'output' || sourceHandle === 'text' || sourceHandle === 'data') {
                    return true;
                }
            }
        }
        // Rule 5: Text summarizer specific handles
        if (targetCanonical === 'text_summarizer') {
            // Text summarizer accepts: input, text
            if (targetHandle === 'input' || targetHandle === 'text') {
                // Most outputs can go to text/input
                if (sourceHandle === 'output' || sourceHandle === 'text' || sourceHandle === 'data') {
                    return true;
                }
            }
        }
        // Rule 6: Google Sheets specific handles
        if (sourceCanonical === 'google_sheets') {
            // Google Sheets outputs: output, rows, data
            if (sourceHandle === 'output' || sourceHandle === 'rows' || sourceHandle === 'data') {
                // Can connect to most inputs
                if (targetHandle === 'input' || targetHandle === 'text' || targetHandle === 'userInput') {
                    return true;
                }
            }
        }
        // Rule 7: If/Else specific handles
        if (sourceCanonical === 'if_else') {
            // If/Else outputs: true, false
            if (sourceHandle === 'true' || sourceHandle === 'false') {
                // Can connect to most inputs
                if (targetHandle === 'input' || targetHandle === 'userInput') {
                    return true;
                }
            }
        }
        // Rule 8: Manual trigger specific handles
        if (sourceCanonical === 'manual_trigger') {
            // Manual trigger outputs: output, inputData
            if (sourceHandle === 'output' || sourceHandle === 'inputData') {
                // Can connect to most inputs
                if (targetHandle === 'input' || targetHandle === 'userInput') {
                    return true;
                }
            }
        }
        // Default: Reject if no specific compatibility rule matches
        return false;
    }
    /**
     * Validate that a connection is valid before creating edge
     *
     * @param sourceNode - Source workflow node
     * @param targetNode - Target workflow node
     * @param sourceHandle - Proposed source handle
     * @param targetHandle - Proposed target handle
     * @returns True if connection is valid
     */
    validateConnection(sourceNode, targetNode, sourceHandle, targetHandle) {
        const sourceType = sourceNode.data?.type || sourceNode.type;
        const targetType = targetNode.data?.type || targetNode.type;
        // Validate source handle exists
        if (!(0, node_handle_registry_1.isValidHandle)(sourceType, sourceHandle, true)) {
            return {
                valid: false,
                error: `Invalid source handle "${sourceHandle}" for node type "${sourceType}"`,
            };
        }
        // Validate target handle exists
        if (!(0, node_handle_registry_1.isValidHandle)(targetType, targetHandle, false)) {
            return {
                valid: false,
                error: `Invalid target handle "${targetHandle}" for node type "${targetType}"`,
            };
        }
        // Check compatibility using Node Capability Registry
        const areCompatible = node_capability_registry_1.nodeCapabilityRegistry.areCompatible(sourceType, targetType);
        if (!areCompatible) {
            return {
                valid: false,
                error: `Nodes "${sourceType}" and "${targetType}" are not compatible (data type mismatch)`,
            };
        }
        // Check handle compatibility
        if (!this.areHandlesCompatible(sourceType, sourceHandle, targetType, targetHandle)) {
            return {
                valid: false,
                error: `Handles "${sourceHandle}" (${sourceType}) and "${targetHandle}" (${targetType}) are not compatible`,
            };
        }
        return { valid: true };
    }
}
exports.SchemaDrivenConnectionResolver = SchemaDrivenConnectionResolver;
// Export singleton instance
exports.schemaDrivenConnectionResolver = new SchemaDrivenConnectionResolver();
// Export convenience function
function resolveCompatibleHandles(sourceNode, targetNode) {
    return exports.schemaDrivenConnectionResolver.resolveCompatibleHandles(sourceNode, targetNode);
}
