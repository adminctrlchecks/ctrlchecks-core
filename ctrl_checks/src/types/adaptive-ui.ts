/**
 * Frontend-facing type contracts for the Adaptive UI Engine.
 *
 * Mirrors worker/src/services/adaptive-ui/types.ts — this repo keeps
 * frontend and backend types as separate mirrored files (see
 * types/capability-selection.ts for the established precedent) since the
 * two packages are deployed independently.
 */

import type { CapabilityContainer } from './capability-selection';

export interface AdaptiveUIRequest {
  intent: string;
  workflowId?: string;
  correlationId?: string;
}

export interface RecommendedNodeItem {
  nodeType: string;
  label: string;
  category: string;
  reason: string;
  score: number;
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
  missingItems: unknown | null;
  connectionReadiness: unknown | null;
  validation: AdaptiveUIValidationSummary;
  fallback: AdaptiveUIFallback | null;
  durationMs: number;
}
