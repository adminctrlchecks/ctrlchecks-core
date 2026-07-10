"use strict";
/**
 * ✅ IF_ELSE NODE - Real Execution Logic
 *
 * Implements actual conditional branching:
 * - Evaluates conditions using legacy executor (has full condition evaluation logic)
 * - Routes to 'true' or 'false' branch based on condition result
 * - Preserves all input data for downstream nodes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideIfElse = overrideIfElse;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
const fill_mode_resolver_1 = require("../../utils/fill-mode-resolver");
const if_else_conditions_1 = require("../../utils/if-else-conditions");
const system_key_filter_1 = require("../../execution/system-key-filter");
function overrideIfElse(def, schema) {
    const baseValidate = def.validateConfig.bind(def);
    const inputSchema = {
        ...def.inputSchema,
        conditions: {
            ...def.inputSchema.conditions,
            fillMode: {
                default: 'buildtime_ai_once',
                supportsRuntimeAI: false,
                supportsBuildtimeAI: true,
            },
            // Structural JSON that defines branching shape; planner/AI own this at build time.
            ownership: 'structural',
            role: 'raw_json',
        },
        ...(def.inputSchema.combineOperation
            ? {
                combineOperation: {
                    ...def.inputSchema.combineOperation,
                    fillMode: {
                        default: 'manual_static',
                        supportsRuntimeAI: false,
                        supportsBuildtimeAI: false,
                    },
                    ownership: 'value',
                    role: 'content',
                },
            }
            : {}),
    };
    return {
        ...def,
        inputSchema,
        isBranching: true,
        outgoingPorts: ['true', 'false'],
        tags: Array.from(new Set([...(def.tags || []), 'conditional'])),
        validateConfig: (config) => {
            const normalizedConfig = (0, if_else_conditions_1.normalizeIfElseConfig)(config);
            const base = baseValidate(normalizedConfig);
            const extraErrors = [];
            const mode = (0, fill_mode_resolver_1.resolveEffectiveFieldFillMode)('conditions', inputSchema, normalizedConfig);
            const cond = normalizedConfig.conditions;
            const empty = cond === undefined || cond === null || (Array.isArray(cond) && cond.length === 0);
            // Allow buildtime_ai_once with empty conditions — AI fill is still pending; only block
            // when the user explicitly owns the field (manual_static) and hasn't provided a value.
            if (!(0, fill_mode_resolver_1.isAiOwnedFillMode)(mode) && empty) {
                extraErrors.push("If/Else: 'conditions' must be set unless fill mode is AI-owned");
            }
            if (!empty) {
                extraErrors.push(...(0, if_else_conditions_1.validateCanonicalIfElseConditions)(cond));
            }
            const allErrors = [...(base.errors || []), ...extraErrors];
            return {
                valid: allErrors.length === 0,
                errors: allErrors,
                warnings: base.warnings,
            };
        },
        execute: async (context) => {
            const result = await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({
                context,
                schema,
                hooks: {
                    beforeExecute: (prepared) => {
                        const preparedConfig = (0, if_else_conditions_1.normalizeIfElseConfig)((prepared.mergedConfig || {}));
                        // Use the clean upstream business payload (rawInput) instead of merging
                        // all upstreamOutputs — that merge brought in audit/observability keys
                        // like nodeId, nodeType, rollout, kpis that polluted downstream nodes.
                        const cleanUpstream = context.rawInput != null &&
                            typeof context.rawInput === 'object' &&
                            !Array.isArray(context.rawInput)
                            ? (0, system_key_filter_1.stripSystemKeys)(context.rawInput)
                            : {};
                        const configInputs = typeof prepared.executionInput === 'object' && prepared.executionInput !== null
                            ? prepared.executionInput
                            : {};
                        return { executionInput: { ...cleanUpstream, ...configInputs }, mergedConfig: preparedConfig };
                    },
                },
            });
            if (result.success && result.output) {
                const outObj = result.output;
                // Forward clean upstream business data to downstream nodes.
                // Do NOT spread context.inputs (if_else routing config: conditions, combineOperation) —
                // that would push branching config into downstream nodes as if it were business data.
                const cleanUpstream = context.rawInput != null &&
                    typeof context.rawInput === 'object' &&
                    !Array.isArray(context.rawInput)
                    ? (0, system_key_filter_1.stripRoutingMeta)((0, system_key_filter_1.stripSystemKeys)(context.rawInput))
                    : {};
                const finalOutput = {
                    ...cleanUpstream,
                    ...(typeof outObj === 'object' && outObj !== null ? outObj : {}),
                };
                if (outObj.conditionResult !== undefined) {
                    finalOutput.conditionResult = outObj.conditionResult;
                }
                return {
                    success: true,
                    output: finalOutput,
                    metadata: {
                        branch: outObj.conditionResult ? 'true' : 'false',
                        conditionEvaluated: true,
                    },
                };
            }
            return result;
        },
    };
}
