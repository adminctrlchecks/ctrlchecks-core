import { awsClient } from '@/integrations/aws/client';
import { getBackendUrl } from './getBackendUrl';

/**
 * Field plan for the field-ownership step.
 *
 * Sends `{ nodes, edges }` inline because at this point the workflow is a draft that may
 * not be persisted, so there is no id to load. The endpoint performs no DB write, makes
 * no LLM call, and executes nothing.
 */

export type FieldGroupKey = 'required' | 'aiFilled' | 'aiRuntime' | 'optional' | 'credential';

export interface FieldPlanProducer {
  fieldName: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
}

export interface FieldPlanField {
  fieldName: string;
  label: string;
  description?: string;
  required: boolean;
  hasValue: boolean;
  fillMode: string;
  producedBy?: FieldPlanProducer[];
  hasUnresolvedReferences?: boolean;
}

export interface FieldPlanNode {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  operation?: string;
  /** Populated from Phase 6 onward; null until `firstRunClass` exists. */
  firstRunClass: string | null;
  groups: Record<FieldGroupKey, FieldPlanField[]>;
  diagnostics: string[];
}

export interface FieldPlan {
  nodes: FieldPlanNode[];
  summary: {
    nodeCount: number;
    requiredCount: number;
    unresolvedReferenceCount: number;
  };
}

export interface FieldPlanRequestNode {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
}

export async function fetchFieldPlan(
  nodes: FieldPlanRequestNode[],
  edges: Array<{ source: string; target: string }>,
): Promise<FieldPlan | null> {
  if (!nodes || nodes.length === 0) return null;

  const token = (await awsClient.auth.getSession()).data.session?.access_token;
  if (!token) return null;

  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}/api/workflow-build/field-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nodes, edges }),
    });
  } catch {
    // The step degrades to its ungrouped rendering when the plan is unavailable.
    return null;
  }

  if (!response.ok) return null;

  try {
    return (await response.json()) as FieldPlan;
  } catch {
    return null;
  }
}

/** Display order and copy for the five groups. */
export const FIELD_GROUP_ORDER: FieldGroupKey[] = [
  'required',
  'credential',
  'aiFilled',
  'aiRuntime',
  'optional',
];

export const FIELD_GROUP_TITLES: Record<FieldGroupKey, string> = {
  required: 'You provide',
  credential: 'Connection',
  aiFilled: 'AI filled — review',
  aiRuntime: 'AI at runtime',
  optional: 'Optional',
};

/**
 * The group a card should open by default: the first non-empty group in priority order,
 * i.e. the one the user most likely needs to act on (plan §4.3).
 */
export function defaultExpandedGroup(
  groups: Record<FieldGroupKey, FieldPlanField[]> | undefined,
): FieldGroupKey | null {
  if (!groups) return null;
  return FIELD_GROUP_ORDER.find((key) => (groups[key]?.length ?? 0) > 0) ?? null;
}

/** True when every populated field sits in one group — then the accordion adds clicks, not clarity. */
export function hasSinglePopulatedGroup(
  groups: Record<FieldGroupKey, FieldPlanField[]> | undefined,
): boolean {
  if (!groups) return false;
  return FIELD_GROUP_ORDER.filter((key) => (groups[key]?.length ?? 0) > 0).length <= 1;
}
