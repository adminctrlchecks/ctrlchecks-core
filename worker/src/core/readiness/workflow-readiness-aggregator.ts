import {
  buildReadinessDetails,
  buildWorkflowReadinessIssues,
  readinessErrorCode,
  type CredentialReadinessInput,
  type NodeReadinessDetails,
  type NodeReadinessIssue,
} from './node-readiness-resolver';
import {
  getWorkflowConnectionReadiness,
  type ConnectionReadinessRow,
  type WorkflowConnectionReadinessResponse,
} from '../../services/workflow-connection-readiness';
import type { WorkflowNode } from '../types/ai-types';

export interface WorkflowReadinessSummary {
  totalNodes: number;
  checkedNodes: number;
  issueCount: number;
  missingInputCount: number;
  missingCredentialCount: number;
  invalidInputCount: number;
  runtimeValidationIssueCount: number;
}

export interface WorkflowReadinessEnvelope extends NodeReadinessDetails {
  ready: boolean;
  workflowId: string;
  code: ReturnType<typeof readinessErrorCode> | null;
  summary: WorkflowReadinessSummary;
  groupedIssues: NodeReadinessDetails['issues'];
  connectionReadiness?: WorkflowConnectionReadinessResponse;
  technicalDetails?: Record<string, unknown>;
}

function canonicalRowsToCredentialInputs(rows: ConnectionReadinessRow[]): CredentialReadinessInput[] {
  return rows
    .filter((row) => row.status !== 'ready')
    .map((row) => ({
      provider: row.provider,
      type: row.authType,
      displayName: row.credentialLabel || row.providerLabel,
      required: true,
      satisfied: false,
      nodeId: row.nodeId,
      nodeIds: [row.nodeId],
      nodeType: row.nodeType,
      nodeTypes: [row.nodeType],
      nodeLabel: row.nodeLabel,
      operation: row.operation,
      operationLabel: row.operationLabel,
      scopes: row.requiredScopes,
      requiredScopes: row.requiredScopes,
      availableScopes: row.availableScopes,
      credentialId: row.credentialTypeId,
      connectionId: row.connectionId,
      connectionName: row.connectionName,
      status: row.status,
      action: row.action,
      simpleDescription: row.reason,
      technicalDescription: row.reason,
      howToObtain: row.reason,
    }));
}

function appendRuntimeIssues(
  base: NodeReadinessIssue[],
  runtimeIssues: NodeReadinessIssue[] | undefined,
): NodeReadinessIssue[] {
  if (!runtimeIssues || runtimeIssues.length === 0) return base;
  const blockedNodes = new Set(
    base
      .filter((issue) => issue.kind === 'missing_input' || issue.kind === 'invalid_input')
      .map((issue) => issue.nodeId)
      .filter(Boolean),
  );
  const filteredRuntimeIssues = runtimeIssues.filter((issue) => {
    if (issue.kind === 'missing_credential' && blockedNodes.has(issue.nodeId)) {
      return false;
    }
    return true;
  });
  return [...base, ...filteredRuntimeIssues];
}

export async function buildWorkflowReadinessEnvelope(input: {
  workflowId: string;
  userId?: string;
  nodes: WorkflowNode[];
  includeSatisfiedConnections?: boolean;
  additionalRuntimeIssues?: NodeReadinessIssue[];
  technicalDetails?: Record<string, unknown>;
}): Promise<WorkflowReadinessEnvelope> {
  const nodes = input.nodes || [];
  let connectionReadiness: WorkflowConnectionReadinessResponse | undefined;
  const credentialInputs: CredentialReadinessInput[] = [];

  if (input.userId) {
    connectionReadiness = await getWorkflowConnectionReadiness({
      workflowId: input.workflowId,
      userId: input.userId,
      nodes: nodes as any[],
      includeSatisfied: input.includeSatisfiedConnections !== false,
    });
    credentialInputs.push(...canonicalRowsToCredentialInputs(connectionReadiness.missing));
  }

  const baseIssues = buildWorkflowReadinessIssues({
    nodes,
    credentials: credentialInputs,
  });
  const details = buildReadinessDetails(
    appendRuntimeIssues(baseIssues, input.additionalRuntimeIssues),
  );
  const ready = details.readinessIssues.length === 0;

  return {
    ...details,
    ready,
    workflowId: input.workflowId,
    code: ready ? null : readinessErrorCode(details.readinessIssues),
    groupedIssues: details.issues,
    summary: {
      totalNodes: nodes.length,
      checkedNodes: nodes.length,
      issueCount: details.readinessIssues.length,
      missingInputCount: details.missingInputs.length,
      missingCredentialCount: details.missingCredentials.length,
      invalidInputCount: details.invalidInputs.length,
      runtimeValidationIssueCount: details.runtimeValidationIssues.length,
    },
    ...(connectionReadiness ? { connectionReadiness } : {}),
    ...(input.technicalDetails ? { technicalDetails: input.technicalDetails } : {}),
  };
}

export function workflowReadinessResponseFields(readiness: WorkflowReadinessEnvelope) {
  return {
    ready: readiness.ready,
    workflowId: readiness.workflowId,
    summary: readiness.summary,
    readinessIssues: readiness.readinessIssues,
    missingInputs: readiness.missingInputs,
    missingCredentials: readiness.missingCredentials,
    invalidInputs: readiness.invalidInputs,
    runtimeValidationIssues: readiness.runtimeValidationIssues,
    issues: readiness.issues,
    groupedIssues: readiness.groupedIssues,
    ...(readiness.connectionReadiness ? { connectionReadiness: readiness.connectionReadiness } : {}),
    ...(readiness.technicalDetails ? { technicalDetails: readiness.technicalDetails } : {}),
  };
}
