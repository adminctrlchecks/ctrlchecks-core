import { resolveNodeType } from '../registry/node-type-resolution';
import { resolveUpstreamFields, type UpstreamGraph } from './upstream-field-resolver';

export interface TemplateGroundingRepair {
  nodeId: string;
  nodeType: string;
  fieldName: string;
  from: string;
  to: string;
}

export interface TemplateGroundingDeferredField {
  nodeId: string;
  nodeType: string;
  fieldName: string;
  invalidRefs: string[];
}

export interface TemplateGroundingResult<TWorkflow extends UpstreamGraph> {
  workflow: TWorkflow;
  repairs: TemplateGroundingRepair[];
  deferredFields: TemplateGroundingDeferredField[];
}

const JSON_REF_RE = /\$json\.([A-Za-z_][A-Za-z0-9_.]*)/g;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function extractJsonRefs(value: unknown): string[] {
  const refs = new Set<string>();
  const visit = (candidate: unknown): void => {
    if (typeof candidate === 'string') {
      for (const match of candidate.matchAll(JSON_REF_RE)) refs.add(match[1]);
      return;
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (isPlainObject(candidate)) {
      for (const item of Object.values(candidate)) visit(item);
    }
  };
  visit(value);
  return [...refs];
}

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fieldTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function scoreReplacement(ref: string, candidate: string, containingText: string): number {
  const refNorm = normalizeFieldName(ref);
  const candidateNorm = normalizeFieldName(candidate);
  if (!refNorm || !candidateNorm) return 0;
  if (candidate === ref) return 1000;
  if (candidate.toLowerCase() === ref.toLowerCase()) return 950;
  if (candidateNorm === refNorm) return 900;

  const candidateLower = candidate.toLowerCase();
  const textLower = containingText.toLowerCase();
  let score = 0;

  if (candidateLower.endsWith(`_${ref.toLowerCase()}`)) score += 220;
  if (candidateLower.endsWith(`.${ref.toLowerCase()}`)) score += 220;
  if (candidateLower.includes(`_${ref.toLowerCase()}_`)) score += 150;
  if (candidateNorm.endsWith(refNorm)) score += 120;
  if (candidateNorm.includes(refNorm)) score += 90;

  for (const token of fieldTokens(candidate)) {
    if (token !== ref.toLowerCase() && textLower.includes(token)) score += 35;
  }

  return score;
}

function findGroundedReplacement(
  ref: string,
  allowedFields: string[],
  containingText: string,
): string | undefined {
  let best: { field: string; score: number } | undefined;
  let ambiguous = false;
  for (const field of allowedFields) {
    const score = scoreReplacement(ref, field, containingText);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { field, score };
      ambiguous = false;
    } else if (score === best.score) {
      ambiguous = true;
    }
  }
  return best && !ambiguous && best.score >= 120 ? best.field : undefined;
}

function replaceJsonRef(value: string, from: string, to: string): string {
  return value.replace(JSON_REF_RE, (match, ref) => (ref === from ? match.replace(from, to) : match));
}

function repairValue(params: {
  value: unknown;
  allowedFields: string[];
  nodeId: string;
  nodeType: string;
  fieldName: string;
  repairs: TemplateGroundingRepair[];
}): { value: unknown; invalidRefs: string[]; changed: boolean } {
  const { value, allowedFields, nodeId, nodeType, fieldName, repairs } = params;

  if (typeof value === 'string') {
    let nextValue = value;
    const invalidRefs: string[] = [];
    for (const ref of extractJsonRefs(value)) {
      if (allowedFields.includes(ref)) continue;
      const replacement = findGroundedReplacement(ref, allowedFields, nextValue);
      if (replacement) {
        nextValue = replaceJsonRef(nextValue, ref, replacement);
        repairs.push({ nodeId, nodeType, fieldName, from: ref, to: replacement });
      } else {
        invalidRefs.push(ref);
      }
    }
    return { value: nextValue, invalidRefs, changed: nextValue !== value };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const invalidRefs: string[] = [];
    const next = value.map((item) => {
      const repaired = repairValue({ value: item, allowedFields, nodeId, nodeType, fieldName, repairs });
      changed ||= repaired.changed;
      invalidRefs.push(...repaired.invalidRefs);
      return repaired.value;
    });
    return { value: next, invalidRefs, changed };
  }

  if (isPlainObject(value)) {
    let changed = false;
    const invalidRefs: string[] = [];
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const repaired = repairValue({ value: item, allowedFields, nodeId, nodeType, fieldName, repairs });
      changed ||= repaired.changed;
      invalidRefs.push(...repaired.invalidRefs);
      next[key] = repaired.value;
    }
    return { value: next, invalidRefs, changed };
  }

  return { value, invalidRefs: [], changed: false };
}

/**
 * Grounds every generated {{$json.*}} config reference against the data that can
 * actually flow into each node. This is deliberately node-agnostic: it reads the
 * graph, node registry output shapes, and field fill-mode metadata instead of
 * hard-coding Slack/Gmail/Switch rules.
 */
export function groundWorkflowTemplateReferences<TWorkflow extends UpstreamGraph>(
  workflow: TWorkflow,
): TemplateGroundingResult<TWorkflow> {
  const repairs: TemplateGroundingRepair[] = [];
  const deferredFields: TemplateGroundingDeferredField[] = [];
  let workflowChanged = false;

  const nodes = workflow.nodes.map((node) => {
    const config = node.data?.config;
    if (!config || typeof config !== 'object') return node;

    const upstream = resolveUpstreamFields(workflow, node.id);
    if (upstream.names.size === 0) return node;

    const allowedFields = [...upstream.names];
    const nodeType = resolveNodeType(node).nodeType || String(node.data?.type || node.type || '');
    const priorFillMode =
      isPlainObject(config._fillMode) ? { ...(config._fillMode as Record<string, unknown>) } : {};
    const nextConfig: Record<string, unknown> = { ...config };
    let nodeChanged = false;

    for (const [fieldName, value] of Object.entries(config)) {
      if (fieldName.startsWith('_')) continue;
      if (extractJsonRefs(value).length === 0) continue;

      const repaired = repairValue({ value, allowedFields, nodeId: node.id, nodeType, fieldName, repairs });
      if (repaired.changed) {
        nextConfig[fieldName] = repaired.value;
        nodeChanged = true;
      }

      if (repaired.invalidRefs.length > 0) {
        deferredFields.push({ nodeId: node.id, nodeType, fieldName, invalidRefs: repaired.invalidRefs });
        delete nextConfig[fieldName];
        priorFillMode[fieldName] = 'manual_static';
        nodeChanged = true;
      }
    }

    if (!nodeChanged) return node;
    workflowChanged = true;
    nextConfig._fillMode = priorFillMode;
    return {
      ...node,
      data: {
        ...node.data,
        config: nextConfig,
      },
    };
  });

  return {
    workflow: workflowChanged ? ({ ...workflow, nodes } as TWorkflow) : workflow,
    repairs,
    deferredFields,
  };
}
