import { queryAsService } from '../../core/database/db-pool';
import { getNestedValue } from '../../core/utils/object-utils';
import { logger } from '../../core/logger';

export interface ApprovalGateConfig {
  enabled?: boolean;
  thresholdField?: string;
  thresholdOperator?: '>' | '>=' | '<' | '<=';
  thresholdValue?: number;
}

export type ApprovalDecision = 'pending' | 'approved' | 'rejected' | 'none';

export interface NodeApprovalRow {
  id: string;
  execution_id: string;
  workflow_id: string;
  node_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  preview: Record<string, unknown>;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_reason: string | null;
}

/** Reads the threshold field from config first (literal values), then nodeInput (upstream-resolved values). */
export function isApprovalThresholdMet(gate: ApprovalGateConfig, config: Record<string, unknown>, nodeInput: unknown): boolean {
  if (!gate.thresholdField || !gate.thresholdOperator || gate.thresholdValue === undefined) {
    return true; // no threshold configured — always gate when enabled
  }
  const raw = getNestedValue(config, gate.thresholdField) ?? getNestedValue(nodeInput, gate.thresholdField);
  const value = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!Number.isFinite(value)) return true; // can't evaluate — fail safe by gating

  switch (gate.thresholdOperator) {
    case '>': return value > gate.thresholdValue;
    case '>=': return value >= gate.thresholdValue;
    case '<': return value < gate.thresholdValue;
    case '<=': return value <= gate.thresholdValue;
    default: return true;
  }
}

export async function getApprovalDecision(executionId: string, nodeId: string): Promise<ApprovalDecision> {
  try {
    const rows = await queryAsService<{ status: string }>(
      `SELECT status FROM execution_node_approvals WHERE execution_id = $1 AND node_id = $2 LIMIT 1`,
      [executionId, nodeId]
    );
    return (rows[0]?.status as ApprovalDecision) || 'none';
  } catch (error) {
    logger.error('[NodeApproval] Failed to read approval decision (failing safe to pending):', error);
    return 'pending';
  }
}

export async function createPendingApproval(params: {
  executionId: string;
  workflowId: string;
  nodeId: string;
  userId: string;
  preview: Record<string, unknown>;
}): Promise<NodeApprovalRow> {
  const rows = await queryAsService<NodeApprovalRow>(
    `INSERT INTO execution_node_approvals (execution_id, workflow_id, node_id, user_id, preview)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (execution_id, node_id) DO UPDATE SET preview = EXCLUDED.preview
     RETURNING *`,
    [params.executionId, params.workflowId, params.nodeId, params.userId, JSON.stringify(params.preview)]
  );
  return rows[0];
}

export async function getNodeApprovalById(id: string): Promise<NodeApprovalRow | null> {
  const rows = await queryAsService<NodeApprovalRow>(
    `SELECT * FROM execution_node_approvals WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function listPendingApprovalsForUser(userId: string): Promise<NodeApprovalRow[]> {
  return queryAsService<NodeApprovalRow>(
    `SELECT * FROM execution_node_approvals WHERE user_id = $1 AND status = 'pending' ORDER BY requested_at DESC`,
    [userId]
  );
}

export async function resolveNodeApproval(
  id: string,
  approved: boolean,
  resolvedBy: string,
  reason?: string
): Promise<NodeApprovalRow> {
  const rows = await queryAsService<NodeApprovalRow>(
    `UPDATE execution_node_approvals
     SET status = $2, resolved_at = NOW(), resolved_by = $3, resolved_reason = $4
     WHERE id = $1
     RETURNING *`,
    [id, approved ? 'approved' : 'rejected', resolvedBy, reason || null]
  );
  return rows[0];
}
