/**
 * Workflow Graph Validator
 * 
 * Validates workflow topology before save/execution:
 * - Exactly 1 trigger node
 * - All nodes reachable from trigger
 * - Each node (except trigger) has exactly 1 incoming edge
 * - If/Else nodes can have 2 outgoing edges (true/false)
 * - Switch nodes can have multiple outgoing edges (one per case)
 * - Other nodes can have 1 outgoing edge
 * - No cycles
 * - Topological order exists
 */

import { Node, Edge } from 'reactflow';

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validate workflow graph topology
 */
export function validateWorkflowGraph(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (nodes.length === 0) {
    errors.push({
      code: 'NO_NODES',
      message: 'Workflow must have at least one node',
    });
    return { valid: false, errors, warnings };
  }

  // 1. Exactly 1 trigger node
  // ✅ Use category-based detection to recognize ANY node from triggers category
  const triggerNodes = nodes.filter(n => {
    const type = n.data?.type || n.type || '';
    const category = n.data?.category || '';
    
    // ✅ PRIMARY: Check if node is in "triggers" category (any node from triggers category)
    if (category.toLowerCase() === 'triggers' || category.toLowerCase() === 'trigger') {
      return true;
    }
    
    // ✅ SECONDARY: Check if type includes 'trigger'
    if (type.includes('trigger')) {
      return true;
    }
    
    // ✅ TERTIARY: Check known trigger types (fallback for nodes without category)
    const knownTriggerTypes = [
      'manual_trigger',
      'webhook',
      'schedule',
      'chat_trigger',
      'telegram_trigger',
      'whatsapp_trigger',
      'instagram_trigger',
      'facebook_trigger',
      'form_trigger',
      'form',
      'workflow_trigger',
      'error_trigger',
      'interval',
      'gmail_trigger',
      'slack_trigger',
      'discord_trigger',
      'microsoft_teams_trigger',
      'outlook_trigger',
      'google_calendar_trigger',
      'google_sheets_trigger',
      'google_drive_trigger',
      'typeform_trigger',
      'tally_trigger',
      'github_trigger',
      'gitlab_trigger',
      'jira_trigger',
      'linear_trigger',
      'trello_trigger',
      'stripe_trigger',
      'shopify_trigger',
    ];

    return knownTriggerTypes.includes(type);
  });

  if (triggerNodes.length === 0) {
    errors.push({
      code: 'NO_TRIGGER',
      message: 'Workflow must have exactly one trigger node',
    });
  } else if (triggerNodes.length > 1) {
    errors.push({
      code: 'MULTIPLE_TRIGGERS',
      message: `Workflow has ${triggerNodes.length} trigger nodes, but should have exactly one`,
      nodeId: triggerNodes[1].id,
    });
  }

  const triggerNode = triggerNodes[0];
  if (!triggerNode) {
    return { valid: false, errors, warnings };
  }

  // 2. Build adjacency maps
  const incomingEdges = new Map<string, Edge[]>();
  const outgoingEdges = new Map<string, Edge[]>();
  const nodeMap = new Map<string, Node>();

  nodes.forEach(node => nodeMap.set(node.id, node));
  edges.forEach(edge => {
    if (!incomingEdges.has(edge.target)) {
      incomingEdges.set(edge.target, []);
    }
    incomingEdges.get(edge.target)!.push(edge);

    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source)!.push(edge);
  });

  // 3. Check reachability from trigger
  const reachable = new Set<string>();
  const queue = [triggerNode.id];
  reachable.add(triggerNode.id);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const outgoing = outgoingEdges.get(nodeId) || [];
    for (const edge of outgoing) {
      if (!reachable.has(edge.target)) {
        reachable.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  // Check for unreachable nodes
  const unreachable = nodes.filter(n => !reachable.has(n.id));
  if (unreachable.length > 0) {
    warnings.push(`${unreachable.length} node(s) are not reachable from trigger`);
    unreachable.forEach(node => {
      errors.push({
        code: 'UNREACHABLE_NODE',
        message: `Node "${node.data?.label || node.id}" is not reachable from trigger`,
        nodeId: node.id,
      });
    });
  }

  // 4. Each node (except trigger and merge nodes) must have exactly 1 incoming edge.
  // Exception: in branching workflows (switch/if_else), terminal/output nodes may
  // legitimately converge inputs from multiple branches as long as each source is distinct.
  const hasBranchingNode = nodes.some(n => {
    const t = n.data?.type || '';
    return t === 'switch' || t === 'if_else';
  });

  nodes.forEach(node => {
    if (node.id === triggerNode.id) {
      return; // Trigger has no incoming
    }

    const nodeType = node.data?.type || '';
    const isMergeNode = nodeType === 'merge';

    const incoming = incomingEdges.get(node.id) || [];
    if (incoming.length === 0) {
      errors.push({
        code: 'NO_INCOMING',
        message: `Node "${node.data?.label || node.id}" has no incoming edges`,
        nodeId: node.id,
      });
    } else if (incoming.length > 1 && !isMergeNode) {
      // In a branching workflow, a node is a valid convergence point when all
      // of its incoming edges come from distinct upstream nodes (no duplicate sources).
      const sourceIds = incoming.map(e => e.source);
      const allSourcesDistinct = new Set(sourceIds).size === sourceIds.length;
      if (hasBranchingNode && allSourcesDistinct) {
        // Legitimate multi-branch convergence — not an error.
        return;
      }
      errors.push({
        code: 'MULTIPLE_INCOMING',
        message: `Node "${node.data?.label || node.id}" has ${incoming.length} incoming edges, but should have exactly one`,
        nodeId: node.id,
      });
    }
  });

  // 5. Validate outgoing edges based on node type
  // - If/Else nodes can have exactly 2 outgoing edges (true/false)
  // - Switch nodes can have multiple outgoing edges (one per case)
  // - Other nodes can have 1 outgoing edge
  nodes.forEach(node => {
    const outgoing = outgoingEdges.get(node.id) || [];
    const nodeType = node.data?.type || '';
    const isIfElse = nodeType === 'if_else';
    const isSwitch = nodeType === 'switch';

    if (isSwitch) {
      // Switch nodes can have multiple outgoing edges (one per case)
      if (outgoing.length === 0) {
        warnings.push(`Switch node "${node.data?.label || node.id}" should have at least one outgoing edge (one per case)`);
      }
      // No error for multiple outgoing edges on Switch nodes - they're allowed
    } else if (isIfElse) {
      // If/Else nodes should have exactly 2 outgoing edges
      if (outgoing.length !== 2) {
        warnings.push(`If/Else node "${node.data?.label || node.id}" should have exactly 2 outgoing edges (true/false branches)`);
      }
    } else {
      // Other nodes can have at most 1 outgoing edge
      if (outgoing.length > 1) {
        errors.push({
          code: 'TOO_MANY_OUTGOING',
          message: `Node "${node.data?.label || node.id}" has ${outgoing.length} outgoing edges, but maximum is 1 (for this node type)`,
          nodeId: node.id,
        });
      }
    }
  });

  // 6. Check for cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoing = outgoingEdges.get(nodeId) || [];
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        if (hasCycle(edge.target)) {
          return true;
        }
      } else if (recursionStack.has(edge.target)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        errors.push({
          code: 'CYCLE_DETECTED',
          message: 'Workflow contains a cycle (circular dependency)',
        });
        break;
      }
    }
  }

  // 7. Topological order must exist (already checked by cycle detection)
  // If no cycles, topological order exists

  const valid = errors.length === 0;
  return { valid, errors, warnings };
}

/** Minimal node shape for ordering (matches persisted workflow nodes + React Flow). */
type OrderableNode = {
  id: string;
  data?: { type?: string; category?: string };
  type?: string;
};

function isTriggerNodeForOrder(node: OrderableNode): boolean {
  const type = node.data?.type || node.type || '';
  const category = String(node.data?.category || '').toLowerCase();
  if (category === 'triggers' || category === 'trigger') return true;
  if (type.includes('trigger')) return true;
  const knownTriggerTypes = [
    'manual_trigger',
    'webhook',
    'schedule',
    'chat_trigger',
    'telegram_trigger',
    'whatsapp_trigger',
    'instagram_trigger',
    'facebook_trigger',
    'form_trigger',
    'form',
    'workflow_trigger',
    'error_trigger',
    'interval',
    'gmail_trigger',
    'slack_trigger',
    'discord_trigger',
    'microsoft_teams_trigger',
    'outlook_trigger',
    'google_calendar_trigger',
    'google_sheets_trigger',
    'google_drive_trigger',
    'typeform_trigger',
    'tally_trigger',
    'github_trigger',
    'gitlab_trigger',
    'jira_trigger',
    'linear_trigger',
    'trello_trigger',
    'stripe_trigger',
    'shopify_trigger',
  ];
  return knownTriggerTypes.includes(type);
}

/**
 * BFS rank from the workflow trigger along edges (stable: sorted outgoing targets).
 * Used to present post-credential / manual configuration in execution order.
 */
export function computeExecutionOrderRank(
  nodes: OrderableNode[],
  edges: Array<{ source: string; target: string }>
): Map<string, number> {
  const rank = new Map<string, number>();
  if (!Array.isArray(nodes) || nodes.length === 0) return rank;

  const trigger = nodes.find(isTriggerNodeForOrder);
  if (!trigger) {
    nodes.forEach((n, i) => rank.set(n.id, i));
    return rank;
  }

  const outgoing = new Map<string, string[]>();
  for (const e of edges || []) {
    if (!e?.source || !e?.target) continue;
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e.target);
  }

  const queue: string[] = [trigger.id];
  const seen = new Set<string>(queue);
  let r = 0;
  rank.set(trigger.id, r++);
  while (queue.length > 0) {
    const id = queue.shift()!;
    const outs = (outgoing.get(id) || []).slice().sort();
    for (const t of outs) {
      if (seen.has(t)) continue;
      seen.add(t);
      rank.set(t, r++);
      queue.push(t);
    }
  }

  for (const n of nodes) {
    if (!rank.has(n.id)) rank.set(n.id, 9999);
  }
  return rank;
}
