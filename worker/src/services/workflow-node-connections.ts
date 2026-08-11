import { queryAsService } from '../core/database/db-pool';
import { logger } from '../core/logger';

export interface WorkflowNodeConnectionBinding {
  id: string;
  workflowId: string;
  userId: string;
  nodeId: string;
  nodeType: string;
  provider: string;
  credentialTypeId: string | null;
  connectionId: string;
  role: string;
  metadata: Record<string, unknown>;
  connectionName?: string;
  connectionStatus?: string;
  authType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BindingUpsertInput {
  userId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
  provider: string;
  credentialTypeId?: string | null;
  connectionId: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

type BindingRow = {
  id: string;
  workflow_id: string;
  user_id: string;
  node_id: string;
  node_type: string;
  provider: string;
  credential_type_id: string | null;
  connection_id: string;
  role: string;
  metadata: Record<string, unknown> | null;
  connection_name?: string | null;
  connection_status?: string | null;
  auth_type?: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeBindingProvider(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function mapBinding(row: BindingRow): WorkflowNodeConnectionBinding {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    userId: row.user_id,
    nodeId: row.node_id,
    nodeType: row.node_type,
    provider: row.provider,
    credentialTypeId: row.credential_type_id,
    connectionId: row.connection_id,
    role: row.role,
    metadata: row.metadata || {},
    connectionName: row.connection_name || undefined,
    connectionStatus: row.connection_status || undefined,
    authType: row.auth_type || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function tableMissing(error: unknown): boolean {
  return (error as { code?: string })?.code === '42P01';
}

function validateId(value: string, name: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) throw new Error(`${name} is required`);
  return trimmed;
}

async function assertWorkflowOwner(userId: string, workflowId: string): Promise<void> {
  const rows = await queryAsService<{ id: string }>(
    `SELECT id
       FROM workflows
      WHERE id = $1::uuid
        AND user_id::text = $2
      LIMIT 1`,
    [workflowId, userId],
  );
  if (!rows[0]) throw new Error('Workflow not found');
}

async function assertConnectionOwner(input: {
  userId: string;
  connectionId: string;
  provider: string;
  credentialTypeId?: string | null;
}): Promise<{ provider: string; credentialTypeId: string; authType: string }> {
  const rows = await queryAsService<{
    provider: string;
    credential_type_id: string;
    auth_type: string;
  }>(
    `SELECT provider, credential_type_id, auth_type
       FROM connections
      WHERE user_id = $1
        AND id = $2::uuid
        AND status <> 'revoked'
      LIMIT 1`,
    [input.userId, input.connectionId],
  );
  const row = rows[0];
  if (!row) throw new Error('Connection not found');

  const expectedProvider = normalizeBindingProvider(input.provider);
  const actualProvider = normalizeBindingProvider(row.provider);
  if (expectedProvider && expectedProvider !== actualProvider) {
    throw new Error(`Connection provider mismatch: selected ${actualProvider}, node needs ${expectedProvider}`);
  }

  if (
    input.credentialTypeId &&
    input.credentialTypeId.trim() &&
    input.credentialTypeId !== row.credential_type_id
  ) {
    throw new Error(`Connection credential type mismatch: selected ${row.credential_type_id}, node needs ${input.credentialTypeId}`);
  }

  return {
    provider: actualProvider,
    credentialTypeId: row.credential_type_id,
    authType: row.auth_type,
  };
}

export async function listWorkflowNodeConnectionBindings(
  userId: string,
  workflowId: string,
): Promise<WorkflowNodeConnectionBinding[]> {
  try {
    await assertWorkflowOwner(userId, workflowId);
    const rows = await queryAsService<BindingRow>(
      `SELECT b.id, b.workflow_id, b.user_id, b.node_id, b.node_type, b.provider,
              b.credential_type_id, b.connection_id, b.role, b.metadata,
              c.name AS connection_name, c.status AS connection_status, c.auth_type,
              b.created_at, b.updated_at
         FROM workflow_node_connections b
         JOIN connections c
           ON c.id = b.connection_id
          AND c.user_id = b.user_id
        WHERE b.workflow_id = $1::uuid
          AND b.user_id = $2
        ORDER BY b.node_id ASC, b.role ASC`,
      [workflowId, userId],
    );
    return rows.map(mapBinding);
  } catch (error) {
    if (tableMissing(error)) return [];
    throw error;
  }
}

export async function upsertWorkflowNodeConnectionBinding(
  input: BindingUpsertInput,
): Promise<WorkflowNodeConnectionBinding> {
  const userId = validateId(input.userId, 'userId');
  const workflowId = validateId(input.workflowId, 'workflowId');
  const nodeId = validateId(input.nodeId, 'nodeId');
  const nodeType = validateId(input.nodeType, 'nodeType');
  const connectionId = validateId(input.connectionId, 'connectionId');
  const role = String(input.role || 'primary').trim() || 'primary';

  await assertWorkflowOwner(userId, workflowId);
  const connection = await assertConnectionOwner({
    userId,
    connectionId,
    provider: input.provider,
    credentialTypeId: input.credentialTypeId,
  });

  const provider = normalizeBindingProvider(connection.provider || input.provider);
  const credentialTypeId = input.credentialTypeId?.trim() || connection.credentialTypeId;

  const rows = await queryAsService<BindingRow>(
    `INSERT INTO workflow_node_connections (
       workflow_id, user_id, node_id, node_type, provider, credential_type_id,
       connection_id, role, metadata, created_at, updated_at
     )
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid, $8, $9::jsonb, NOW(), NOW())
     ON CONFLICT (workflow_id, node_id, provider, role)
     DO UPDATE SET
       node_type = EXCLUDED.node_type,
       credential_type_id = EXCLUDED.credential_type_id,
       connection_id = EXCLUDED.connection_id,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING id, workflow_id, user_id, node_id, node_type, provider, credential_type_id,
               connection_id, role, metadata, created_at, updated_at`,
    [
      workflowId,
      userId,
      nodeId,
      nodeType,
      provider,
      credentialTypeId,
      connectionId,
      role,
      JSON.stringify(input.metadata || {}),
    ],
  );

  return {
    ...mapBinding(rows[0]),
    authType: connection.authType,
  };
}

export async function deleteWorkflowNodeConnectionBinding(input: {
  userId: string;
  workflowId: string;
  nodeId: string;
  provider: string;
  role?: string;
}): Promise<void> {
  const userId = validateId(input.userId, 'userId');
  const workflowId = validateId(input.workflowId, 'workflowId');
  const nodeId = validateId(input.nodeId, 'nodeId');
  const provider = normalizeBindingProvider(input.provider);
  const role = String(input.role || 'primary').trim() || 'primary';

  await assertWorkflowOwner(userId, workflowId);
  try {
    await queryAsService(
      `DELETE FROM workflow_node_connections
        WHERE workflow_id = $1::uuid
          AND user_id = $2
          AND node_id = $3
          AND provider = $4
          AND role = $5`,
      [workflowId, userId, nodeId, provider, role],
    );
  } catch (error) {
    if (!tableMissing(error)) throw error;
  }
}

function bindingRefKeys(binding: WorkflowNodeConnectionBinding): string[] {
  const keys = new Set<string>();
  if (binding.credentialTypeId) keys.add(binding.credentialTypeId);
  if (binding.provider) {
    keys.add(binding.provider);
    if (binding.authType === 'oauth2') keys.add(`${binding.provider}_oauth2`);
    if (binding.authType && binding.authType !== 'oauth2') keys.add(`${binding.provider}_api_key`);
    keys.add(`${binding.provider}_token`);
  }
  return Array.from(keys).filter(Boolean);
}

export function applyWorkflowNodeConnectionBindings<T extends { id?: string; data?: any }>(
  nodes: T[],
  bindings: WorkflowNodeConnectionBinding[],
  options: { overrideExisting?: boolean } = {},
): T[] {
  const overrideExisting = options.overrideExisting !== false;
  if (!Array.isArray(nodes) || nodes.length === 0 || bindings.length === 0) return nodes;

  const byNodeId = new Map<string, WorkflowNodeConnectionBinding[]>();
  for (const binding of bindings) {
    const list = byNodeId.get(binding.nodeId) || [];
    list.push(binding);
    byNodeId.set(binding.nodeId, list);
  }

  return nodes.map((node) => {
    const nodeId = String(node?.id || '');
    const nodeBindings = byNodeId.get(nodeId);
    if (!nodeBindings?.length) return node;

    const data = { ...(node.data || {}) };
    const existingRefs = {
      ...(((data.config || {}).connectionRefs || {}) as Record<string, string>),
      ...((data.connectionRefs || {}) as Record<string, string>),
    };
    const nextRefs = { ...existingRefs };

    for (const binding of nodeBindings) {
      for (const key of bindingRefKeys(binding)) {
        if (overrideExisting || !nextRefs[key]) nextRefs[key] = binding.connectionId;
      }
    }

    return {
      ...node,
      data: {
        ...data,
        connectionRefs: nextRefs,
      },
    };
  });
}

export async function hydrateWorkflowNodeConnectionBindings<T extends { id?: string; data?: any }>(input: {
  userId?: string | null;
  workflowId: string;
  nodes: T[];
  overrideExisting?: boolean;
}): Promise<T[]> {
  if (!input.userId || !input.workflowId || input.workflowId === 'capability-selection-preview') {
    return input.nodes;
  }
  try {
    const bindings = await listWorkflowNodeConnectionBindings(input.userId, input.workflowId);
    return applyWorkflowNodeConnectionBindings(input.nodes, bindings, {
      overrideExisting: input.overrideExisting,
    });
  } catch (error) {
    logger.warn('[workflow-node-connections] Failed to hydrate bindings; using node refs only', {
      workflowId: input.workflowId,
      error: error instanceof Error ? error.message : String(error),
    });
    return input.nodes;
  }
}
