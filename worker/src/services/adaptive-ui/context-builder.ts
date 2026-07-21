/**
 * Adaptive UI Engine — Context Builder
 *
 * Assembles context purely from existing sources (Cognito-authenticated
 * request, the `workflows` table). Never invents data — if a workflow can't
 * be loaded, callers get `null` and treat the request as "no workflow yet"
 * rather than fabricating a graph.
 */

import type { AuthenticatedRequest } from '../../core/middleware/subscription-auth';
import { getDbClient } from '../../core/database/aws-db-client';
import { logger } from '../../core/logger';
import type { AdaptiveUIUserContext, AdaptiveUIWorkflowContext } from './types';

export function buildUserContext(req: AuthenticatedRequest): AdaptiveUIUserContext | null {
  if (!req.user?.id) return null;
  return {
    userId: req.user.id,
    role: req.user.role || 'user',
    subscriptionPlan: req.user.subscriptionPlan || 'Free',
    workflowLimit: req.user.workflowLimit ?? 2,
  };
}

export async function loadWorkflowContext(workflowId: string): Promise<AdaptiveUIWorkflowContext | null> {
  try {
    const db = getDbClient();
    const { data: workflowRow } = await db
      .from('workflows')
      .select('nodes, graph')
      .eq('id', workflowId)
      .single();

    if (!workflowRow) return null;

    const graphData =
      typeof workflowRow.graph === 'string' ? JSON.parse(workflowRow.graph) : workflowRow.graph || {};
    const nodes: AdaptiveUIWorkflowContext['nodes'] = workflowRow.nodes || graphData.nodes || [];

    const existingNodeTypes = new Set<string>(
      nodes.map((node) => (node.data?.type || node.type || '').trim()).filter(Boolean),
    );

    return { workflowId, nodes, existingNodeTypes };
  } catch (error) {
    logger.warn('[AdaptiveUI] Failed to load workflow context (non-fatal):', error);
    return null;
  }
}
