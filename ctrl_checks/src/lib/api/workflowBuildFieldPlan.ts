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
  /**
   * Set ONLY when the server could not resolve the node's type, carrying the type as it
   * arrived. The one condition under which `groups` is meaningless.
   *
   * Gate "could not be analysed" on this, never on `diagnostics.length`: diagnostics also
   * carry informational notes — `generated_runtime_contract` means the node simply declared
   * no explicit operation contract, which describes a perfectly healthy node. Treating any
   * diagnostic as a failure made good nodes render as errors and lose their three sections.
   */
  unresolvedNodeType?: string;
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

/**
 * Display order and copy for the five groups.
 *
 * `aiFilled` leads (plan RC-4): the review flow is *see what AI filled → fill what is
 * left → then optional*, so the group the user reviews must come before the group they
 * complete. `defaultExpandedGroup()` derives from this same constant, so the reordering
 * also changes which accordion opens first — that is the intended effect, not a side one.
 */
export const FIELD_GROUP_ORDER: FieldGroupKey[] = [
  'aiFilled',
  'required',
  'credential',
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

/* -------------------------------------------------------------------------- */
/* Three-section view                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The step presents every node as exactly three sections, in this order.
 *
 * The server returns five buckets, which is the right shape for *deciding* things — a
 * credential is not a required text field, and a runtime-AI value is not a build-time one —
 * but five headings per node is more taxonomy than a person reviewing a workflow needs.
 * These three are the three questions actually being asked:
 *
 *   aiBuilt  — "the AI chose these; are they right?"
 *   required — "these are yours to provide before this step can run"
 *   optional — "these exist; ignore them unless you need them"
 *
 * The mapping is fixed here rather than at each call site so the sections cannot drift
 * between the card, the rail and the check report.
 */
export type FieldSectionKey = 'aiBuilt' | 'recommended' | 'optional';

export const FIELD_SECTION_ORDER: FieldSectionKey[] = ['aiBuilt', 'recommended', 'optional'];

export const FIELD_SECTION_TITLES: Record<FieldSectionKey, string> = {
  aiBuilt: 'AI built — review these',
  recommended: 'Recommended — you provide these',
  optional: 'Optional',
};

export const FIELD_SECTION_BLURBS: Record<FieldSectionKey, string> = {
  aiBuilt:
    'The AI chose these from what you asked for. Check them and change any that are wrong.',
  recommended:
    'Needed for what you asked for, and the AI did not fill them. This step cannot run until they have values.',
  optional: 'Not needed for this step. Set them only if you want to.',
};

/**
 * Which section a field belongs in.
 *
 * Grouped by **whether the field actually has a value**, not by how it was *meant* to be
 * filled. That distinction is the whole point: a field the AI was supposed to fill but left
 * empty is precisely the one a user would otherwise miss, so it belongs under Recommended
 * where they will act on it — not under "AI built" alongside values that really were
 * produced. Grouping by intended fill mode hid exactly those fields.
 *
 *  aiBuilt      — the AI really did produce this value (or will, at run time). Review it.
 *  recommended  — needed for this step, and nobody has supplied it yet. The user's turn.
 *  optional     — everything else, including fields this operation does not use at all.
 */
export function sectionForPlanField(
  groupKey: FieldGroupKey,
  field: FieldPlanField,
): FieldSectionKey {
  // Empty by design — the value arrives at run time. Not something to ask the user for.
  if (groupKey === 'aiRuntime') return 'aiBuilt';
  // Connecting an account is something the user must do for the step to run.
  if (groupKey === 'credential') return 'recommended';
  // The key case: build-time AI was meant to fill it. Did it?
  if (groupKey === 'aiFilled') return field.hasValue ? 'aiBuilt' : 'recommended';
  if (field.required) return 'recommended';
  return 'optional';
}

/** The plan fields for one section of one node, in group order. */
export function fieldsForSection(
  node: FieldPlanNode | undefined,
  section: FieldSectionKey,
): FieldPlanField[] {
  if (!node?.groups) return [];
  return FIELD_GROUP_ORDER.flatMap((key) =>
    (node.groups[key] ?? []).filter((field) => sectionForPlanField(key, field) === section),
  );
}

/**
 * The section a node's card should open on.
 *
 * Keyed to whether anything is actually **missing**, not to whether Recommended has rows in
 * it. Recommended legitimately holds fields the user has already filled; opening there when
 * everything has a value would bury the AI's work — the thing the user is here to review —
 * behind a section with nothing left to do.
 */
export function defaultExpandedSection(node: FieldPlanNode | undefined): FieldSectionKey {
  if (outstandingRequiredFields(node).length > 0) return 'recommended';
  if (fieldsForSection(node, 'aiBuilt').length > 0) return 'aiBuilt';
  return fieldsForSection(node, 'recommended').length > 0 ? 'recommended' : 'optional';
}

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

/**
 * Groups excluded from the "still needs a value" count.
 *
 * `credential` — secrets are never written into the workflow JSON (they are injected at
 * execution time from the vault), so a credential field's `hasValue` is false even when the
 * account is perfectly connected. Counting it would make such a node permanently unready.
 * Connections are gated by their own readiness flow at node selection instead.
 *
 * `aiRuntime` — empty *by design*: the value is produced at runtime, so its absence at build
 * time is the intended state, not an omission.
 */
const GROUPS_EXCLUDED_FROM_COMPLETENESS: FieldGroupKey[] = ['credential', 'aiRuntime'];

/**
 * The fields of one node that are required for its **currently chosen operation** and still
 * have no value.
 *
 * The operation-awareness is entirely the server's: `resolveFieldPolicyForNode` recomputes
 * `activeFields` / `requiredFields` from the node's live config, so a field only appears here
 * while it is genuinely required for the operation the user has selected. Changing the
 * operation changes this set, with no node-type knowledge on either side.
 *
 * Note this reads `required`, not the group. A required field that build-time AI was meant to
 * fill lands in `aiFilled`; if the AI produced nothing, it is still missing and still counts.
 */
export function outstandingRequiredFields(node: FieldPlanNode | undefined): FieldPlanField[] {
  if (!node?.groups) return [];
  const missing: FieldPlanField[] = [];
  for (const key of FIELD_GROUP_ORDER) {
    if (GROUPS_EXCLUDED_FROM_COMPLETENESS.includes(key)) continue;
    for (const field of node.groups[key] ?? []) {
      if (field.required && !field.hasValue) missing.push(field);
    }
  }
  return missing;
}

/** A node is complete when nothing required for its chosen operation is still empty. */
export function isPlanNodeComplete(node: FieldPlanNode | undefined): boolean {
  return outstandingRequiredFields(node).length === 0;
}

/** Every node that still has required fields to fill, in plan order. */
export function incompletePlanNodes(
  plan: FieldPlan | null | undefined,
): Array<{ node: FieldPlanNode; missing: FieldPlanField[] }> {
  if (!plan?.nodes) return [];
  return plan.nodes
    .map((node) => ({ node, missing: outstandingRequiredFields(node) }))
    .filter((entry) => entry.missing.length > 0);
}

/** True when every populated field sits in one group — then the accordion adds clicks, not clarity. */
export function hasSinglePopulatedGroup(
  groups: Record<FieldGroupKey, FieldPlanField[]> | undefined,
): boolean {
  if (!groups) return false;
  return FIELD_GROUP_ORDER.filter((key) => (groups[key]?.length ?? 0) > 0).length <= 1;
}
