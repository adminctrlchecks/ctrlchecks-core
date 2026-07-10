"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWorkflowGraphState = resolveWorkflowGraphState;
exports.buildSyncedGraphPayload = buildSyncedGraphPayload;
const crypto_1 = __importDefault(require("crypto"));
function parseArrayField(value) {
    if (Array.isArray(value))
        return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    }
    return [];
}
function parseGraphObject(rawGraph) {
    if (!rawGraph)
        return null;
    let candidate = rawGraph;
    if (typeof rawGraph === 'string') {
        try {
            candidate = JSON.parse(rawGraph);
        }
        catch {
            return null;
        }
    }
    if (!candidate || typeof candidate !== 'object')
        return null;
    return {
        nodes: parseArrayField(candidate.nodes),
        edges: parseArrayField(candidate.edges),
    };
}
function hashGraph(nodes, edges) {
    return crypto_1.default
        .createHash('sha1')
        .update(JSON.stringify({ nodes, edges }))
        .digest('hex');
}
function hasGraphShape(nodes, edges) {
    return nodes.length > 0 || edges.length > 0;
}
function nodeIdSet(nodes) {
    return new Set(nodes
        .map((node) => String(node?.id || '').trim())
        .filter(Boolean));
}
function isStrictSuperset(candidate, other) {
    if (candidate.size <= other.size)
        return false;
    for (const id of other) {
        if (!candidate.has(id))
            return false;
    }
    return true;
}
function graphCompletenessScore(nodes, edges) {
    return nodes.length * 10000 + edges.length;
}
function resolveWorkflowGraphState(workflow) {
    const columnNodes = parseArrayField(workflow.nodes);
    const columnEdges = parseArrayField(workflow.edges);
    const graphObject = parseGraphObject(workflow.graph);
    if (!graphObject) {
        if (hasGraphShape(columnNodes, columnEdges)) {
            return {
                nodes: columnNodes,
                edges: columnEdges,
                source: 'columns',
                inSync: true,
                needsHealing: true,
                reason: 'graph_missing_or_invalid',
            };
        }
        return {
            nodes: [],
            edges: [],
            source: 'empty',
            inSync: true,
            needsHealing: false,
            reason: 'graph_empty',
        };
    }
    const graphNodes = graphObject.nodes;
    const graphEdges = graphObject.edges;
    const graphHasContent = hasGraphShape(graphNodes, graphEdges);
    const columnsHaveContent = hasGraphShape(columnNodes, columnEdges);
    if (!graphHasContent && columnsHaveContent) {
        return {
            nodes: columnNodes,
            edges: columnEdges,
            source: 'columns',
            inSync: true,
            needsHealing: true,
            reason: 'graph_empty_columns_present',
        };
    }
    if (graphHasContent && !columnsHaveContent) {
        return {
            nodes: graphNodes,
            edges: graphEdges,
            source: 'graph',
            inSync: true,
            needsHealing: true,
            reason: 'columns_empty_graph_present',
        };
    }
    if (!graphHasContent && !columnsHaveContent) {
        return {
            nodes: [],
            edges: [],
            source: 'empty',
            inSync: true,
            needsHealing: false,
            reason: 'graph_and_columns_empty',
        };
    }
    const graphHash = hashGraph(graphNodes, graphEdges);
    const columnsHash = hashGraph(columnNodes, columnEdges);
    if (graphHash === columnsHash) {
        return {
            nodes: graphNodes,
            edges: graphEdges,
            source: 'graph',
            inSync: true,
            needsHealing: false,
            reason: 'graph_columns_in_sync',
        };
    }
    const graphNodeIds = nodeIdSet(graphNodes);
    const columnNodeIds = nodeIdSet(columnNodes);
    const graphIsStrictSuperset = isStrictSuperset(graphNodeIds, columnNodeIds);
    const columnsAreStrictSuperset = isStrictSuperset(columnNodeIds, graphNodeIds);
    if (graphIsStrictSuperset && !columnsAreStrictSuperset) {
        return {
            nodes: graphNodes,
            edges: graphEdges,
            source: 'graph',
            inSync: false,
            needsHealing: true,
            reason: 'graph_columns_mismatch_graph_has_more_nodes',
        };
    }
    if (columnsAreStrictSuperset && !graphIsStrictSuperset) {
        return {
            nodes: columnNodes,
            edges: columnEdges,
            source: 'columns',
            inSync: false,
            needsHealing: true,
            reason: 'graph_columns_mismatch_columns_have_more_nodes',
        };
    }
    const graphScore = graphCompletenessScore(graphNodes, graphEdges);
    const columnsScore = graphCompletenessScore(columnNodes, columnEdges);
    if (graphScore > columnsScore) {
        return {
            nodes: graphNodes,
            edges: graphEdges,
            source: 'graph',
            inSync: false,
            needsHealing: true,
            reason: 'graph_columns_mismatch_graph_more_complete',
        };
    }
    return {
        nodes: columnNodes,
        edges: columnEdges,
        source: 'columns',
        inSync: false,
        needsHealing: true,
        reason: 'graph_columns_mismatch_columns_authoritative',
    };
}
function buildSyncedGraphPayload(nodes, edges, metadata) {
    const payload = {
        nodes,
        edges,
    };
    if (metadata && typeof metadata === 'object') {
        payload.metadata = metadata;
    }
    return payload;
}
