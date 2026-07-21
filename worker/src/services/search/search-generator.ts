/**
 * Smart Search — LLM call using the exact fixed runtime prompt.
 *
 * The model only ranks/explains/phrases; it never controls which
 * urls/targets exist. After parsing, every result's url and every
 * suggested_action's target is checked against the real candidate index by
 * exact match — anything that doesn't match is dropped, and `type` is
 * always overwritten with the candidate's real type. Same enforcement
 * pattern as onboarding/onboarding-generator.ts's reconcileSteps().
 */

import { geminiOrchestrator } from '../ai/gemini-orchestrator';
import { logger } from '../../core/logger';
import { parseSearchResponse } from './schema';
import type { SearchCandidate, SearchResponse, SearchResultItem, SearchSuggestedAction, SearchUserContext } from './types';

const FIXED_PROMPT = `You are a smart search engine inside a digital product.
Understand the user's natural language query and return a helpful results page using only the provided product data and user context.
Return only valid JSON.

Context: {{AUTO_CONTEXT}}
Search query: {{SEARCH_QUERY}}
Searchable product data: {{SEARCHABLE_DATA}}
User context: {{CURRENT_USER_CONTEXT}}

Return this JSON:
{
  "interpreted_intent": "What the user is trying to do",
  "answer": "Short helpful answer",
  "results": [
    {
      "title": "Result title",
      "description": "Short description",
      "type": "page | feature | product | article | template | setting | action | other",
      "url": "Existing route or URL",
      "reason": "Why this matches",
      "action_label": "CTA label"
    }
  ],
  "suggested_actions": [ { "label": "Suggested action", "target": "Existing route or action" } ],
  "related_searches": [ "Related 1", "Related 2", "Related 3" ],
  "confidence": "high | medium | low"
}

Rules:
- Use only existing product data. Match intent, not just keywords.
- Return at most 8 results, ranked by relevance.
- Keep the answer short. Explain why each result matches.
- If there are no exact matches, show the closest ones plus suggested refinements.
- Do not mention AI. Do not expose internal logic. Do not show results the user cannot access.
- Every result's url and every suggested_action's target MUST be copied exactly from one of the candidates in Searchable product data — never write a new one.`;

function buildPrompt(query: string, candidates: SearchCandidate[], user: SearchUserContext): string {
  const autoContext = JSON.stringify({ candidateCount: candidates.length });
  const currentUserContext = JSON.stringify({ role: user.role, subscriptionPlan: user.subscriptionPlan });
  const searchableData = JSON.stringify(
    candidates.map((c) => ({ title: c.title, description: c.description, type: c.type, url: c.url, keywords: c.keywords })),
  );

  return FIXED_PROMPT.replace('{{AUTO_CONTEXT}}', autoContext)
    .replace('{{SEARCH_QUERY}}', query)
    .replace('{{SEARCHABLE_DATA}}', searchableData)
    .replace('{{CURRENT_USER_CONTEXT}}', currentUserContext);
}

export function reconcileResults(rawResults: SearchResultItem[], candidates: SearchCandidate[]): SearchResultItem[] {
  const byUrl = new Map(candidates.map((c) => [c.url, c]));
  return rawResults
    .map((result) => {
      const candidate = byUrl.get(result.url);
      if (!candidate) return null; // hallucinated url — drop, never expose
      return { ...result, url: candidate.url, type: candidate.type };
    })
    .filter((result): result is SearchResultItem => result !== null)
    .slice(0, 8);
}

export function reconcileSuggestedActions(
  rawActions: SearchSuggestedAction[],
  candidates: SearchCandidate[],
): SearchSuggestedAction[] {
  const validTargets = new Set(candidates.map((c) => c.url));
  return rawActions.filter((action) => validTargets.has(action.target)).slice(0, 5);
}

function deterministicSearch(query: string, candidates: SearchCandidate[]): SearchResponse {
  const needle = query.trim().toLowerCase();
  const scored = candidates
    .map((candidate) => {
      const haystack = `${candidate.title} ${candidate.description} ${candidate.keywords}`.toLowerCase();
      const matches = needle.length > 0 && haystack.includes(needle);
      return { candidate, matches };
    })
    .filter((entry) => entry.matches)
    .slice(0, 8);

  return {
    interpreted_intent: query,
    answer: scored.length > 0 ? `Here's what matches "${query}".` : `No direct matches for "${query}" yet.`,
    results: scored.map(({ candidate }) => ({
      title: candidate.title,
      description: candidate.description,
      type: candidate.type,
      url: candidate.url,
      reason: `Matches your search for "${query}".`,
      action_label: 'Open',
    })),
    suggested_actions: [],
    related_searches: [],
    confidence: scored.length > 0 ? 'medium' : 'low',
  };
}

export async function generateSearchResults(
  query: string,
  candidates: SearchCandidate[],
  user: SearchUserContext,
): Promise<SearchResponse> {
  try {
    const prompt = buildPrompt(query, candidates, user);
    const raw = await geminiOrchestrator.processRequest(
      'text-completion',
      { prompt },
      { temperature: 0.3, max_tokens: 700, cache: false, structuredOutput: { mimeType: 'application/json' } },
    );

    const text = typeof raw === 'string' ? raw : raw?.text || raw?.content || JSON.stringify(raw);
    const jsonMatch = typeof text === 'string' ? text.match(/\{[\s\S]*\}/) : null;
    if (!jsonMatch) throw new Error('No JSON object in model response');

    const candidate = JSON.parse(jsonMatch[0]);
    const parsed = parseSearchResponse(candidate);
    if (!parsed) throw new Error('Model response failed schema validation');

    return {
      interpreted_intent: parsed.interpreted_intent,
      answer: parsed.answer,
      results: reconcileResults(parsed.results as SearchResultItem[], candidates),
      suggested_actions: reconcileSuggestedActions(parsed.suggested_actions as SearchSuggestedAction[], candidates),
      related_searches: parsed.related_searches,
      confidence: parsed.confidence,
    };
  } catch (error) {
    logger.warn('[SmartSearch] Search generation failed, using deterministic fallback:', error);
    return deterministicSearch(query, candidates);
  }
}
