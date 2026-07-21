/**
 * POST /api/adaptive-ui
 *
 * Personalizes existing screens from user intent + existing product data
 * (capability grouper, credential/connection readiness, node registry).
 * See worker/src/services/adaptive-ui/ for the engine itself.
 */

import { Response } from 'express';
import { runAdaptiveUIEngine } from '../services/adaptive-ui/adaptive-ui-engine';
import { buildUserContext } from '../services/adaptive-ui/context-builder';
import type { AuthenticatedRequest } from '../core/middleware/subscription-auth';
import { logger } from '../core/logger';

export default async function adaptiveUIHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userContext = buildUserContext(req);
  if (!userContext) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const intent = typeof body.intent === 'string' ? body.intent : '';
  const workflowId = typeof body.workflowId === 'string' && body.workflowId.trim() ? body.workflowId.trim() : undefined;
  const correlationId =
    typeof body.correlationId === 'string' && body.correlationId.trim() ? body.correlationId.trim() : undefined;

  try {
    const result = await runAdaptiveUIEngine({ intent, workflowId, correlationId, user: userContext });
    res.json(result);
  } catch (error) {
    logger.error('[AdaptiveUI] Unhandled engine error:', error);
    res.status(500).json({
      correlationId: correlationId || 'unknown',
      capabilities: [],
      recommendedNodes: [],
      setupGuide: [],
      contextualHelp: [],
      missingItems: null,
      connectionReadiness: null,
      validation: { isReady: true, missingCredentialCount: 0, missingInputCount: 0, warningCount: 0 },
      fallback: { reason: 'no_data', message: 'Something went wrong generating suggestions. Try again in a moment.' },
      durationMs: 0,
    });
  }
}
