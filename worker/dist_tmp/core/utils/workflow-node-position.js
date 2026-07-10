"use strict";
/**
 * Coerce React Flow node positions from JSON/DB (numeric strings must not break layout).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.coerceWorkflowNodePosition = coerceWorkflowNodePosition;
exports.mergePreservedNodePositions = mergePreservedNodePositions;
exports.buildPositionSnapshotFromNodes = buildPositionSnapshotFromNodes;
function coerceWorkflowNodePosition(position) {
    if (!position || typeof position !== 'object')
        return null;
    const p = position;
    const toNum = (v) => {
        if (typeof v === 'number' && Number.isFinite(v))
            return v;
        if (typeof v === 'string' && v.trim() !== '') {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        }
        return null;
    };
    const x = toNum(p.x);
    const y = toNum(p.y);
    if (x === null || y === null)
        return null;
    return { x, y };
}
/**
 * Merge positions from a snapshot (e.g. DB row as loaded) onto normalized nodes when current position is missing.
 */
function mergePreservedNodePositions(nodes, snapshotById) {
    return nodes.map((n) => {
        const cur = coerceWorkflowNodePosition(n?.position);
        if (cur) {
            return { ...n, position: cur };
        }
        const fb = snapshotById.get(n.id);
        if (fb) {
            return { ...n, position: fb };
        }
        return { ...n, position: cur ?? { x: 0, y: 0 } };
    });
}
function buildPositionSnapshotFromNodes(nodes) {
    const map = new Map();
    if (!Array.isArray(nodes))
        return map;
    for (const n of nodes) {
        if (!n || typeof n !== 'object' || !n.id)
            continue;
        const c = coerceWorkflowNodePosition(n.position);
        if (c) {
            map.set(String(n.id), c);
        }
    }
    return map;
}
