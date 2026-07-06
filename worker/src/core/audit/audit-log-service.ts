import { queryAsService } from '../database/db-pool';
import { logger } from '../logger';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'admin.user.role_changed'
  | 'admin.user.suspended'
  | 'admin.user.reinstated'
  | 'admin.user.deleted'
  | 'credential.created'
  | 'credential.updated'
  | 'credential.deleted'
  | 'credential.tested'
  | 'workflow.execution.started'
  | 'workflow.execution.finished'
  | 'workflow.execution.failed'
  | 'workflow.confirmed'
  | 'workflow.rejected'
  | 'security.event';

export interface AuditEventInput {
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  status?: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Writes one durable audit event. Never throws — a failure to persist an
 * audit record must not break the business flow that triggered it.
 */
export async function recordAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    await queryAsService(
      `INSERT INTO audit_logs (
         actor_user_id, actor_email, actor_role, action,
         resource_type, resource_id, status, ip_address, user_agent, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        event.actorUserId || null,
        event.actorEmail || null,
        event.actorRole || null,
        event.action,
        event.resourceType || null,
        event.resourceId || null,
        event.status || 'success',
        event.ipAddress || null,
        event.userAgent || null,
        JSON.stringify(event.metadata || {}),
      ]
    );
  } catch (error) {
    logger.error('[Audit] Failed to record audit event', { action: event.action, error });
  }
}

export async function queryAuditLogs(
  filters: AuditLogFilters = {}
): Promise<{ rows: AuditLogRow[]; limit: number; offset: number }> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.userId) {
    params.push(filters.userId);
    conditions.push(`actor_user_id = $${params.length}`);
  }
  if (filters.action) {
    params.push(filters.action);
    conditions.push(`action = $${params.length}`);
  }
  if (filters.resourceType) {
    params.push(filters.resourceType);
    conditions.push(`resource_type = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`created_at <= $${params.length}`);
  }

  const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
  const offset = Math.max(filters.offset || 0, 0);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit);
  const limitParam = params.length;
  params.push(offset);
  const offsetParam = params.length;

  const rows = await queryAsService<AuditLogRow>(
    `SELECT * FROM audit_logs ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params
  );

  return { rows, limit, offset };
}
