"use strict";
/**
 * ✅ SWITCH NODE - Real Execution Logic
 *
 * Implements case-based routing via legacy executor.
 * Outgoing port names come from persisted config.cases (or legacy rules) —
 * use unifiedNodeRegistry.getOutgoingPortsForWorkflowNode(node) for graph tooling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideSwitch = overrideSwitch;
exports.getSwitchCasePortsFromConfig = getSwitchCasePortsFromConfig;
const unified_node_registry_legacy_adapter_1 = require("../unified-node-registry-legacy-adapter");
const branching_node_ports_1 = require("../../utils/branching-node-ports");
const fill_mode_resolver_1 = require("../../utils/fill-mode-resolver");
const system_key_filter_1 = require("../../execution/system-key-filter");
const switchMigrations = [
    {
        fromVersion: '1.0.0',
        toVersion: '1.1.0',
        migrate: (oldConfig) => {
            const next = { ...oldConfig };
            const casesEmpty = !next.cases ||
                (Array.isArray(next.cases) && next.cases.length === 0);
            if (casesEmpty && next.rules != null) {
                next.cases = next.rules;
            }
            return next;
        },
    },
];
function overrideSwitch(def, schema) {
    const baseValidate = def.validateConfig.bind(def);
    const inputSchema = {
        ...def.inputSchema,
        expression: def.inputSchema.expression
            ? {
                ...def.inputSchema.expression,
                // Keep type as 'string' — converting to 'expression' breaks guaranteeInputForSchema
                // (isTypeCompatible does not handle 'expression', needFill fires and clears the value)
                type: 'string',
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
                ownership: 'value',
                role: 'config',
            }
            : def.inputSchema.expression,
        cases: def.inputSchema.cases
            ? {
                ...def.inputSchema.cases,
                fillMode: {
                    default: 'buildtime_ai_once',
                    supportsRuntimeAI: false,
                    supportsBuildtimeAI: true,
                },
                // Structural JSON that defines branch ports/case values.
                ownership: 'structural',
                role: 'raw_json',
            }
            : def.inputSchema.cases,
        ...(def.inputSchema.routingType
            ? {
                routingType: {
                    ...def.inputSchema.routingType,
                    default: 'string',
                    fillMode: {
                        default: 'manual_static',
                        supportsRuntimeAI: false,
                        supportsBuildtimeAI: false,
                    },
                },
            }
            : {}),
        ...(def.inputSchema.rules
            ? {
                rules: {
                    ...def.inputSchema.rules,
                    fillMode: {
                        default: 'manual_static',
                        supportsRuntimeAI: false,
                        supportsBuildtimeAI: false,
                    },
                    ownership: 'structural',
                    role: 'raw_json',
                },
            }
            : {}),
    };
    return {
        ...def,
        inputSchema,
        version: '1.1.0',
        isBranching: true,
        // Default to a generic 'output' port when no branch-specific ports
        // have been defined yet. Branch-aware helpers (getOutgoingPortsForWorkflowNode)
        // will derive case_* ports from config.cases when available; this fallback
        // only applies to minimal flows where the switch behaves like a linear step.
        outgoingPorts: def.outgoingPorts && def.outgoingPorts.length > 0 ? def.outgoingPorts : ['output'],
        migrations: [...(def.migrations || []), ...switchMigrations],
        validateConfig: (config) => {
            const base = baseValidate(config);
            const extraErrors = [];
            const exprMode = (0, fill_mode_resolver_1.resolveEffectiveFieldFillMode)('expression', inputSchema, config);
            if (exprMode !== 'runtime_ai') {
                const ex = config.expression;
                if (ex === undefined || ex === null || (typeof ex === 'string' && ex.trim() === '')) {
                    extraErrors.push("Switch: 'expression' is required unless fill mode is runtime_ai");
                }
            }
            const casesMode = (0, fill_mode_resolver_1.resolveEffectiveFieldFillMode)('cases', inputSchema, config);
            const rawCases = config.cases ?? config.rules;
            let parsedCases = rawCases;
            if (typeof parsedCases === 'string') {
                try {
                    parsedCases = JSON.parse(parsedCases);
                }
                catch {
                    parsedCases = null;
                }
            }
            if (casesMode !== 'runtime_ai') {
                if (!Array.isArray(parsedCases) || parsedCases.length === 0) {
                    extraErrors.push("Switch: 'cases' must contain at least one case unless fill mode is runtime_ai");
                }
                else {
                    const values = parsedCases
                        .map((c) => (typeof c === 'string' ? c : c?.value != null ? String(c.value) : ''))
                        .map((v) => v.trim())
                        .filter(Boolean);
                    const seen = new Set();
                    for (const v of values) {
                        if (seen.has(v)) {
                            extraErrors.push(`Switch: duplicate case value "${v}" — port IDs must be unique`);
                        }
                        seen.add(v);
                    }
                }
            }
            const allErrors = [...(base.errors || []), ...extraErrors];
            return {
                valid: allErrors.length === 0,
                errors: allErrors,
                warnings: base.warnings || [],
            };
        },
        execute: async (context) => {
            const result = await (0, unified_node_registry_legacy_adapter_1.executeViaLegacyExecutor)({
                context,
                schema,
                hooks: {
                    beforeExecute: (prepared) => {
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
                        return { executionInput: { ...cleanUpstream, ...configInputs } };
                    },
                },
            });
            if (result.success && result.output) {
                const outObj = result.output;
                // Do NOT spread context.inputs (routing config: cases, rules, expression, routingType) —
                // that would push switch routing config into downstream nodes as if it were business data.
                const finalOutput = typeof outObj === 'object' && outObj !== null ? { ...outObj } : {};
                const routing = finalOutput.__routing;
                const matchedCase = routing?.matchedCase ?? outObj.matchedCase ?? null;
                return {
                    success: true,
                    output: finalOutput,
                    metadata: {
                        branch: matchedCase || null,
                        caseMatched: matchedCase !== null && matchedCase !== undefined,
                    },
                };
            }
            return result;
        },
    };
}
/** Used by tests and tooling; ports match edge sourceHandle for switch. */
function getSwitchCasePortsFromConfig(config) {
    return (0, branching_node_ports_1.extractSwitchCasePortNames)(config);
}
