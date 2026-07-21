/**
 * POST /api/search
 *
 * Body: { query: string, docsCandidates?: { title, href, snippet }[] }
 *
 * Smart Search — see worker/src/services/search/ for the candidate index
 * and the fixed-prompt generator with its url-reconciliation guard.
 */

import { Response } from 'express';
import { buildSearchCandidates } from '../services/search/candidate-index';
import { generateSearchResults } from '../services/search/search-generator';
import type { DocsCandidateInput } from '../services/search/types';
import type { AuthenticatedRequest } from '../core/middleware/subscription-auth';
import { logger } from '../core/logger';

const MAX_QUERY_LENGTH = 200;

function sanitizeDocsCandidates(raw: unknown): DocsCandidateInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is DocsCandidateInput =>
      item && typeof item.title === 'string' && typeof item.href === 'string' && typeof item.snippet === 'string',
    )
    .slice(0, 10);
}

export default async function searchHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const query = typeof body.query === 'string' ? body.query.trim().slice(0, MAX_QUERY_LENGTH) : '';

  if (!query) {
    res.status(400).json({ error: 'query is required', code: 'MISSING_QUERY' });
    return;
  }

  try {
    const docsCandidates = sanitizeDocsCandidates(body.docsCandidates);
    const candidates = await buildSearchCandidates(docsCandidates);

    const result = await generateSearchResults(query, candidates, {
      userId: req.user.id,
      role: req.user.role || 'user',
      subscriptionPlan: req.user.subscriptionPlan || 'Free',
    });

    res.json(result);
  } catch (error) {
    logger.error('[SmartSearch] search failed:', error);
    res.status(500).json({
      interpreted_intent: query,
      answer: 'Something went wrong running that search. Try again in a moment.',
      results: [],
      suggested_actions: [],
      related_searches: [],
      confidence: 'low',
    });
  }
}
