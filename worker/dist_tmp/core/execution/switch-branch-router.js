"use strict";
/**
 * Universal switch → outgoing-edge resolution for execution and orchestration.
 *
 * Graphs may label branch edges as semantic values (e.g. "success"), indexed ports
 * (`case_1`, `case_2`), explicit `branchName` / `sourceIndex` / `isDefault`, or a mix.
 * Switch node outputs carry `matchedCase` (string | null) and optionally `expressionValue`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwitchRoutingError = void 0;
exports.parseCaseHandleIndex = parseCaseHandleIndex;
exports.orderedSwitchCaseValues = orderedSwitchCaseValues;
exports.resolveWinningSwitchEdgeId = resolveWinningSwitchEdgeId;
exports.resolveWinningSwitchEdgeIdOrThrow = resolveWinningSwitchEdgeIdOrThrow;
exports.shouldSkipForSwitchIncomingEdge = shouldSkipForSwitchIncomingEdge;
class SwitchRoutingError extends Error {
    constructor(message, switchNodeId, availableBranches) {
        super(message);
        this.switchNodeId = switchNodeId;
        this.availableBranches = availableBranches;
        this.name = 'SwitchRoutingError';
    }
}
exports.SwitchRoutingError = SwitchRoutingError;
function parseCaseHandleIndex(sourceHandleOrType) {
    if (!sourceHandleOrType)
        return null;
    const m = /^case_(\d+)$/i.exec(String(sourceHandleOrType).trim());
    if (!m)
        return null;
    return parseInt(m[1], 10) - 1;
}
/** Ordered case values (index 0 = case_1 / first branch). */
function orderedSwitchCaseValues(config) {
    if (!config)
        return [];
    try {
        const casesRaw = config.cases ?? config.rules ?? [];
        let cases = [];
        if (typeof casesRaw === 'string') {
            const parsed = JSON.parse(casesRaw);
            if (Array.isArray(parsed))
                cases = parsed;
        }
        else if (Array.isArray(casesRaw)) {
            cases = casesRaw;
        }
        const values = [];
        for (const c of cases) {
            const raw = typeof c === 'string' ? c : c?.value != null ? String(c.value) : '';
            const value = raw.trim();
            if (value)
                values.push(value);
        }
        return values;
    }
    catch {
        return [];
    }
}
function normalizeSwitchString(a) {
    return a.trim();
}
function stringsMatchCase(a, b) {
    const x = normalizeSwitchString(a);
    const y = normalizeSwitchString(b);
    if (x === y)
        return true;
    if (x.length === 0 || y.length === 0)
        return false;
    return x.toLowerCase() === y.toLowerCase();
}
/**
 * Sort outgoing switch edges so their order matches the case declaration order in config.
 * Edges whose branchName/sourceHandle matches caseValues[i] are placed at position i.
 * Unrecognized edges are appended after the known ones in stable UUID order.
 */
function sortEdgesByCaseOrder(edges, caseValues) {
    const getSemanticLabel = (e) => String(e.branchName ??
        e.data?.branchName ??
        e.sourceHandle ??
        e.type ??
        '').trim();
    const known = new Array(caseValues.length).fill(null);
    const unknown = [];
    for (const e of edges) {
        const label = getSemanticLabel(e);
        const idx = label ? caseValues.findIndex(cv => stringsMatchCase(cv, label)) : -1;
        if (idx !== -1 && known[idx] === null) {
            known[idx] = e;
        }
        else {
            unknown.push(e);
        }
    }
    const result = [];
    for (let i = 0; i < caseValues.length; i++) {
        if (known[i] !== null)
            result.push(known[i]);
    }
    unknown.sort((a, b) => a.id.localeCompare(b.id));
    result.push(...unknown);
    return result;
}
function coerceSwitchNumber(expressionValue, matchedCase) {
    if (typeof expressionValue === 'number' && !Number.isNaN(expressionValue)) {
        return expressionValue;
    }
    if (typeof expressionValue === 'string') {
        const t = expressionValue.trim();
        if (/^-?\d+$/.test(t))
            return parseInt(t, 10);
    }
    if (matchedCase != null) {
        const t = String(matchedCase).trim();
        if (/^-?\d+$/.test(t))
            return parseInt(t, 10);
    }
    return undefined;
}
/**
 * Resolves which outgoing edge from a switch should run for the given output.
 *
 * Priority:
 * 1. edge.branchName === string output (matched case / semantic)
 * 2. edge.sourceIndex === numeric output OR case_N index matches numeric output
 * 3. edge.isDefault === true
 * 4. last outgoing edge (stable order)
 *
 * @returns Winning edge id, or `null` if there are no outgoing edges.
 */
function resolveWinningSwitchEdgeId(options) {
    const { switchNode, allEdges, matchedCase, expressionValue } = options;
    const caseValues = orderedSwitchCaseValues((switchNode.data?.config || {}));
    const outEdges = sortEdgesByCaseOrder(allEdges.filter(e => e.source === switchNode.id), caseValues);
    if (outEdges.length === 0)
        return null;
    const switchOutStr = matchedCase != null && matchedCase !== undefined ? String(matchedCase) : '';
    const switchOutNum = coerceSwitchNumber(expressionValue, matchedCase);
    const branchNameOf = (e) => e.branchName
        ?? e.data?.branchName;
    const explicitSourceIndex = (e) => {
        const raw = e.sourceIndex;
        return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
    };
    const isDefaultEdge = (e) => e.isDefault === true;
    const handle = (e) => String(e.sourceHandle || e.type || '').trim();
    // 1) branchName === string output
    if (switchOutStr.length > 0) {
        for (const e of outEdges) {
            const bn = branchNameOf(e);
            if (bn != null && stringsMatchCase(String(bn), switchOutStr)) {
                return e.id;
            }
        }
        // 1b) sourceHandle / type equals semantic value
        for (const e of outEdges) {
            const h = handle(e);
            if (h && !/^case_\d+$/i.test(h) && stringsMatchCase(h, switchOutStr)) {
                return e.id;
            }
        }
        // 1c) case_N → caseValues[N] matches output
        for (const e of outEdges) {
            const idx = parseCaseHandleIndex(handle(e) || undefined);
            if (idx !== null && idx >= 0 && idx < caseValues.length) {
                if (stringsMatchCase(caseValues[idx], switchOutStr)) {
                    return e.id;
                }
            }
        }
        // 1d) Edge ID embeds the case value (format: `${switchId}-${caseValue}-${targetId}`).
        // Covers pre-fix workflows where branchName/sourceHandle were stripped by the frontend
        // but the edge ID was generated by wireSwitchCaseEdges and still contains the case value.
        for (const e of outEdges) {
            if (e.id.toLowerCase().includes(`-${switchOutStr.toLowerCase()}-`)) {
                console.warn('[SwitchRouter] ID-substring match for matchedCase=%s → edge %s', switchOutStr, e.id);
                return e.id;
            }
        }
    }
    // 2) Numeric / sourceIndex
    if (switchOutNum !== undefined && !Number.isNaN(switchOutNum)) {
        for (const e of outEdges) {
            const si = explicitSourceIndex(e);
            if (si !== undefined && si === switchOutNum) {
                return e.id;
            }
        }
        for (const e of outEdges) {
            const idx = parseCaseHandleIndex(handle(e) || undefined);
            if (idx !== null && idx === switchOutNum) {
                return e.id;
            }
        }
    }
    // 3) Positional fallback: matchedCase is at position N in the ordered case values →
    // use the N-th outgoing edge. Handles edges where sourceHandle is missing/generic
    // (e.g. all "main") but the edge ORDER matches the case declaration order.
    if (switchOutStr.length > 0 && caseValues.length > 0) {
        const caseIdx = caseValues.findIndex((cv) => stringsMatchCase(cv, switchOutStr));
        if (caseIdx !== -1 && caseIdx < outEdges.length) {
            console.warn('[SwitchRouter] Positional fallback: no semantic/case_N match for matchedCase=%s — using outEdges[%d] (edge %s)', switchOutStr, caseIdx, outEdges[caseIdx].id);
            return outEdges[caseIdx].id;
        }
    }
    // 4) No string/number match (including null matchedCase): default edge
    for (const e of outEdges) {
        if (isDefaultEdge(e))
            return e.id;
    }
    // 5) Last edge (never drop execution when at least one edge exists)
    console.warn('[SwitchRouter] Last-edge fallback for switch %s — matchedCase=%s did not match any branch. Routing to last edge: %s. Edge sourceHandles: [%s]', switchNode.id, switchOutStr, outEdges[outEdges.length - 1].id, outEdges.map((e) => handle(e) || '(empty)').join(', '));
    return outEdges[outEdges.length - 1].id;
}
/**
 * Throws only when the switch has no outgoing edges; otherwise always returns an edge id.
 */
function resolveWinningSwitchEdgeIdOrThrow(options) {
    const id = resolveWinningSwitchEdgeId(options);
    if (id === null) {
        const outs = options.allEdges.filter(e => e.source === options.switchNode.id);
        throw new SwitchRoutingError('no matching branch for switch output (no outgoing edges)', options.switchNode.id, outs.map(e => e.id));
    }
    return id;
}
/**
 * For skip logic: `true` if this incoming edge is NOT the winning branch from its switch source.
 */
function shouldSkipForSwitchIncomingEdge(edge, switchNode, allEdges, matchedCase, expressionValue) {
    const winning = resolveWinningSwitchEdgeId({
        switchNode,
        allEdges,
        matchedCase,
        expressionValue,
    });
    if (winning === null)
        return true;
    return edge.id !== winning;
}
