/**
 * Adaptive UI Engine — Orchestrator
 *
 * Thin aggregator over existing pipelines. Does not reimplement intent
 * analysis, capability grouping, credential discovery, or connection
 * readiness — it calls the same functions the existing
 * `/api/capability-selection/analyze` and `/api/workflows/:id/missing-items`
 * routes already call, and adds only the two genuinely new pieces:
 * deterministic node re-ranking and the LLM-generated contextual-help slice.
 */

import { randomUUID } from 'crypto';
import { buildNodeCatalogText } from '../ai/node-catalog-builder';
import { runIntentAnalysis } from '../ai/stages/capability-intent-analyzer';
import { runCapabilityGrouping } from '../ai/stages/capability-grouper-stage';
import { getUnifiedMissingItems } from '../ai/credential-input-discovery';
import { getWorkflowConnectionReadiness } from '../workflow-connection-readiness';
import { logger } from '../../core/logger';
import { loadWorkflowContext } from './context-builder';
import { rankRecommendedNodes } from './recommendation-engine';
import { buildSetupGuide } from './setup-guide-generator';
import { generateContextualHelp } from './help-generator';
import type {
  AdaptiveUIFallback,
  AdaptiveUIResponse,
  AdaptiveUIUserContext,
  CapabilityContainerSummary,
} from './types';
import type { CapabilityContainer } from '../ai/stages/capability-types';

export interface RunAdaptiveUIParams {
  intent: string;
  workflowId?: string;
  correlationId?: string;
  user: AdaptiveUIUserContext;
}

function emptyEnvelope(correlationId: string, durationMs: number, fallback: AdaptiveUIFallback): AdaptiveUIResponse {
  return {
    correlationId,
    capabilities: [],
    recommendedNodes: [],
    setupGuide: [],
    contextualHelp: [],
    missingItems: null,
    connectionReadiness: null,
    validation: { isReady: true, missingCredentialCount: 0, missingInputCount: 0, warningCount: 0 },
    fallback,
    durationMs,
  };
}

export async function runAdaptiveUIEngine(params: RunAdaptiveUIParams): Promise<AdaptiveUIResponse> {
  const startedAt = Date.now();
  const correlationId = params.correlationId || randomUUID();
  const intent = params.intent.trim();

  if (!intent) {
    return emptyEnvelope(correlationId, Date.now() - startedAt, {
      reason: 'no_intent',
      message: 'Describe what you want your workflow to do to get personalized suggestions.',
    });
  }

  const nodeCatalog = buildNodeCatalogText();

  const intentResult = await runIntentAnalysis(intent, nodeCatalog, correlationId);
  if (!intentResult.ok) {
    return emptyEnvelope(correlationId, Date.now() - startedAt, {
      reason: 'intent_analysis_failed',
      message: "Couldn't quite parse that request — try describing the trigger and the action, e.g. \"When X happens, do Y.\"",
    });
  }

  const groupingResult = await runCapabilityGrouping(intentResult.units, nodeCatalog, params.user.userId, correlationId);
  if (!groupingResult.ok) {
    return emptyEnvelope(correlationId, Date.now() - startedAt, {
      reason: 'grouping_failed',
      message: "Found the intent but couldn't match it to available capabilities — try rephrasing with a specific app or service name.",
    });
  }

  const containers: CapabilityContainer[] = groupingResult.containers;

  const workflowContext = params.workflowId ? await loadWorkflowContext(params.workflowId) : null;
  const existingNodeTypes = workflowContext?.existingNodeTypes ?? new Set<string>();

  let missingItems = null;
  let connectionReadiness = null;
  if (workflowContext) {
    try {
      missingItems = await getUnifiedMissingItems(workflowContext.workflowId, params.user.userId);
    } catch (error) {
      logger.warn('[AdaptiveUI] getUnifiedMissingItems failed (non-fatal):', error);
    }
    try {
      connectionReadiness = await getWorkflowConnectionReadiness({
        workflowId: workflowContext.workflowId,
        userId: params.user.userId,
        nodes: workflowContext.nodes,
        includeSatisfied: true,
      });
    } catch (error) {
      logger.warn('[AdaptiveUI] getWorkflowConnectionReadiness failed (non-fatal):', error);
    }
  }

  const recommendedNodes = rankRecommendedNodes(containers, existingNodeTypes);
  const setupGuide = buildSetupGuide(missingItems, connectionReadiness);

  const capabilitiesSummary: CapabilityContainerSummary[] = containers.map((container) => ({
    containerId: container.containerId,
    label: container.label,
    candidateLabels: container.candidates.map((candidate) => candidate.label),
  }));

  const { contextualHelp, fallback: modelFallback } = await generateContextualHelp({
    intent,
    capabilitiesSummary,
    recommendedNodes,
    setupGuide,
    role: params.user.role,
    subscriptionPlan: params.user.subscriptionPlan,
  });

  const missingCredentialCount = setupGuide.filter((item) => item.kind === 'credential').length;
  const missingInputCount = setupGuide.filter((item) => item.kind === 'input').length;
  const warningCount = setupGuide.filter((item) => item.kind === 'validation').length;

  const fallback: AdaptiveUIFallback | null =
    modelFallback ??
    (containers.length === 0
      ? { reason: 'no_data', message: 'No matching capabilities were found for that request yet.' }
      : null);

  return {
    correlationId,
    capabilities: containers,
    recommendedNodes,
    setupGuide,
    contextualHelp,
    missingItems,
    connectionReadiness,
    validation: {
      isReady: missingCredentialCount === 0 && missingInputCount === 0,
      missingCredentialCount,
      missingInputCount,
      warningCount,
    },
    fallback,
    durationMs: Date.now() - startedAt,
  };
}
