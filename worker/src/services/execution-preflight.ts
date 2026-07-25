import {
  getWorkflowConnectionReadiness,
  type ConnectionReadinessRow,
  type ReadinessNode,
  type WorkflowConnectionReadinessResponse,
} from './workflow-connection-readiness';

export interface PreflightNode extends ReadinessNode {}

export interface ExecutionPreflightFailure {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  provider: string;
  requiredScopes: string[];
  status: string;
  action: string;
  connectionId?: string;
  connectionName?: string;
  operation?: string;
  operationLabel?: string;
  error: unknown;
}

export interface ExecutionPreflightResult {
  ok: boolean;
  failures: ExecutionPreflightFailure[];
  readiness: WorkflowConnectionReadinessResponse;
}

function rowToFailure(row: ConnectionReadinessRow): ExecutionPreflightFailure {
  return {
    nodeId: row.nodeId,
    nodeName: row.nodeLabel,
    nodeType: row.nodeType,
    provider: row.provider,
    requiredScopes: row.requiredScopes,
    status: row.status,
    action: row.action,
    connectionId: row.connectionId,
    connectionName: row.connectionName,
    operation: row.operation,
    operationLabel: row.operationLabel,
    error: {
      status: row.status,
      action: row.action,
      message: row.reason || `${row.provider} connection is not ready.`,
      provider: row.provider,
      requiredScopes: row.requiredScopes,
      availableScopes: row.availableScopes,
    },
  };
}

export async function executionPreflight(input: {
  workflowId: string;
  ownerId: string;
  nodes: PreflightNode[];
}): Promise<ExecutionPreflightResult> {
  const readiness = await getWorkflowConnectionReadiness({
    workflowId: input.workflowId,
    userId: input.ownerId,
    nodes: input.nodes,
    includeSatisfied: true,
  });

  return {
    ok: readiness.ready,
    failures: readiness.missing.map(rowToFailure),
    readiness,
  };
}
