/**
 * Graph-aware resolver for the data shape available to a node at run time.
 *
 * Field-ownership examples for payload/content fields (Google Sheets `values`/`data`,
 * an email body, a recipient, …) are only useful when they reference the fields the
 * workflow actually produces upstream — e.g. a job-application form that collects
 * name/email/phone/resumeLink should suggest `{{$json.name}}` rather than `sample-values`.
 *
 * This module answers "what output field names can flow into this node?" by walking the
 * workflow edges backwards. It is provider-agnostic: form/trigger nodes expose their
 * user-defined `config.fields[].key`, and every other node exposes its registry
 * outputSchema property names. No per-node branching — new node types are covered
 * automatically through the registry.
 */

import { unifiedNodeRegistry } from '../registry/unified-node-registry';

type WorkflowNodeLike = {
  id?: string;
  type?: string;
  data?: {
    type?: string;
    label?: string;
    config?: Record<string, unknown>;
  };
};

type WorkflowLike = {
  nodes?: WorkflowNodeLike[];
  edges?: Array<{ source?: string; target?: string }>;
};

const OUTPUT_SCHEMA_RESERVED = new Set(['type', 'structure', 'itemType', 'convertible', 'defaultValue']);
const MAX_UPSTREAM_DEPTH = 6;

function nodeType(node: WorkflowNodeLike): string {
  return String(node.data?.type || node.type || '').trim();
}

function nodeConfig(node: WorkflowNodeLike): Record<string, unknown> {
  const cfg = node.data?.config;
  return cfg && typeof cfg === 'object' ? (cfg as Record<string, unknown>) : {};
}

/**
 * Field names a form/trigger node emits from its user-defined `fields` array.
 * Matches any node whose config carries a `fields: [{ key | name, … }]` array, so it
 * works for the form node and any future node built on the same field-list config.
 */
function formFieldNames(node: WorkflowNodeLike): string[] {
  const fields = nodeConfig(node).fields;
  if (!Array.isArray(fields)) return [];
  const out: string[] = [];
  for (const entry of fields) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = (entry as Record<string, unknown>).key ?? (entry as Record<string, unknown>).name;
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value) out.push(value);
  }
  return out;
}

/** Property names declared by a node type's registry outputSchema. */
function registryOutputFieldNames(type: string): string[] {
  const raw = unifiedNodeRegistry.get(type)?.outputSchema as unknown;
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;

  // NodeOutputSchema with named fields: { structure: { fields: { a, b } } }
  const structure = obj.structure as Record<string, unknown> | undefined;
  if (structure?.fields && typeof structure.fields === 'object') {
    return Object.keys(structure.fields as Record<string, unknown>);
  }
  // Explicit properties dict.
  if (obj.properties && typeof obj.properties === 'object') {
    return Object.keys(obj.properties as Record<string, unknown>);
  }
  // Flat field-dict: keys that are not NodeOutputSchema envelope keys.
  const flat = Object.keys(obj).filter((key) => !OUTPUT_SCHEMA_RESERVED.has(key));
  return flat;
}

/** Output field names for a single upstream node (form fields first, else registry outputs). */
function nodeOutputFieldNames(node: WorkflowNodeLike): string[] {
  const formFields = formFieldNames(node);
  if (formFields.length > 0) return formFields;
  return registryOutputFieldNames(nodeType(node));
}

/**
 * Ordered, de-duplicated list of output field names reachable upstream of `nodeId`.
 * Nearest upstream nodes contribute first. Returns [] when nothing is knowable.
 */
export function resolveUpstreamOutputFields(workflow: WorkflowLike, nodeId: string): string[] {
  if (!workflow || !nodeId) return [];
  const nodesById = new Map<string, WorkflowNodeLike>();
  for (const node of workflow.nodes || []) {
    if (node.id) nodesById.set(String(node.id), node);
  }
  const edges = workflow.edges || [];

  const seen = new Set<string>();
  const collected: string[] = [];
  const pushFields = (names: string[]) => {
    for (const name of names) {
      if (!seen.has(name)) {
        seen.add(name);
        collected.push(name);
      }
    }
  };

  // Breadth-first walk backwards so nearest producers rank first.
  let frontier = [String(nodeId)];
  const visitedNodes = new Set<string>([String(nodeId)]);
  for (let depth = 0; depth < MAX_UPSTREAM_DEPTH && frontier.length > 0; depth++) {
    const parents: string[] = [];
    for (const targetId of frontier) {
      for (const edge of edges) {
        if (String(edge.target || '') !== targetId) continue;
        const sourceId = String(edge.source || '');
        if (!sourceId || visitedNodes.has(sourceId)) continue;
        visitedNodes.add(sourceId);
        parents.push(sourceId);
        const upstreamNode = nodesById.get(sourceId);
        if (upstreamNode) pushFields(nodeOutputFieldNames(upstreamNode));
      }
    }
    frontier = parents;
  }

  return collected;
}
