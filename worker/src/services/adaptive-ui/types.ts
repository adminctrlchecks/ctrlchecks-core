/**
 * Adaptive UI Engine — Shared Type Contracts
 *
 * The engine is a thin aggregator over existing pipelines:
 *   - capabilities      -> runIntentAnalysis + runCapabilityGrouping (capability-selection pipeline)
 *   - recommendedNodes  -> deterministic re-rank of candidates already returned by the grouper
 *   - setupGuide/missingItems -> getUnifiedMissingItems + getWorkflowConnectionReadiness
 *   - contextualHelp    -> same fixed-prompt/Gemini pattern as SmartHelpLayer's /api/ai-help
 *
 * No new node registry, credential store, or capability generator is created here.
 */

import type { CapabilityContainer } from '../ai/stages/capability-types';
import type { UnifiedMissingItems } from '../ai/credential-input-discovery';
import type { WorkflowConnectionReadinessResponse } from '../workflow-connection-readiness';

export interface AdaptiveUIRequest {
  intent: string;
  workflowId?: string;
  correlationId?: string;
}

/** Compact projection of a CapabilityContainer for the LLM prompt context — keeps token usage down. */
export interface CapabilityContainerSummary {
  containerId: string;
  label: string;
  candidateLabels: string[];
}

export interface RecommendedNodeItem {
  nodeType: string;
  label: string;
  category: string;
  reason: string;
  score: number; // 0..1
  hasCredentials: boolean;
  alreadyInWorkflow: boolean;
}

export type SetupGuideItemKind = 'credential' | 'input' | 'validation';
export type SetupGuideItemStatus = 'missing' | 'expired' | 'missing_scope' | 'warning';

export interface SetupGuideItem {
  id: string;
  kind: SetupGuideItemKind;
  status: SetupGuideItemStatus;
  label: string;
  description?: string;
  provider?: string;
  nodeId?: string;
  nodeLabel?: string;
  actionRoute?: string;
}

export type TipConfidence = 'high' | 'medium' | 'low';

export interface ContextualHelpItem {
  title: string;
  tooltip: string;
  expanded_help: string;
  suggested_action: string;
  confidence: TipConfidence;
}

export interface AdaptiveUIValidationSummary {
  isReady: boolean;
  missingCredentialCount: number;
  missingInputCount: number;
  warningCount: number;
}

export interface AdaptiveUIFallback {
  reason: 'no_intent' | 'intent_analysis_failed' | 'grouping_failed' | 'no_data';
  message: string;
}

export interface AdaptiveUIResponse {
  correlationId: string;
  capabilities: CapabilityContainer[];
  recommendedNodes: RecommendedNodeItem[];
  setupGuide: SetupGuideItem[];
  contextualHelp: ContextualHelpItem[];
  missingItems: UnifiedMissingItems | null;
  connectionReadiness: WorkflowConnectionReadinessResponse | null;
  validation: AdaptiveUIValidationSummary;
  fallback: AdaptiveUIFallback | null;
  durationMs: number;
}

export interface AdaptiveUIUserContext {
  userId: string;
  role: string;
  subscriptionPlan: string;
  workflowLimit: number;
}

export interface AdaptiveUIWorkflowContext {
  workflowId: string;
  nodes: Array<{ id?: string; type?: string; data?: { type?: string; label?: string } }>;
  existingNodeTypes: Set<string>;
}
