/**
 * Smart Search — Shared Type Contracts
 *
 * A single-call generator (like adaptive-ui/help-generator.ts), not a
 * two-stage intent+grouping pipeline — search doesn't need
 * runIntentAnalysis/runCapabilityGrouping. Every result's url/target is
 * validated against a deterministic candidate index built from real
 * sources (node registry, templates table, a curated real-route list, plus
 * optional docs candidates the frontend prefiltered from its own bundled
 * docs index) — never trusted from the model, same guard pattern as
 * onboarding/onboarding-generator.ts's reconcileSteps().
 */

export type SearchResultType = 'page' | 'feature' | 'product' | 'article' | 'template' | 'setting' | 'action' | 'other';

/** A real, deterministically-sourced candidate the model may select/explain — never invented. */
export interface SearchCandidate {
  title: string;
  description: string;
  type: SearchResultType;
  url: string;
  keywords: string;
}

export interface SearchResultItem {
  title: string;
  description: string;
  type: SearchResultType;
  url: string;
  reason: string;
  action_label: string;
}

export interface SearchSuggestedAction {
  label: string;
  target: string;
}

export interface SearchResponse {
  interpreted_intent: string;
  answer: string;
  results: SearchResultItem[];
  suggested_actions: SearchSuggestedAction[];
  related_searches: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface DocsCandidateInput {
  title: string;
  href: string;
  snippet: string;
}

export interface SearchUserContext {
  userId: string;
  role: string;
  subscriptionPlan: string;
}
