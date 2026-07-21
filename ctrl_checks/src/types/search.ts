/**
 * Frontend-facing type contracts for Smart Search.
 * Mirrors worker/src/services/search/types.ts.
 */

export type SearchResultType = 'page' | 'feature' | 'product' | 'article' | 'template' | 'setting' | 'action' | 'other';

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
