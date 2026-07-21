/**
 * Cheap local prefilter over the already-bundled docs search index —
 * reuses the same loader and substring-match logic as
 * components/docs/DocsSearch.tsx, so docs content can feed Smart Search's
 * candidate pool without duplicating docs-content/ into the worker.
 */

import type { DocsCandidateInput } from '@/types/search';

const SNIPPET_LENGTH = 200;
const MAX_CANDIDATES = 10;

export async function prefilterDocsCandidates(query: string): Promise<DocsCandidateInput[]> {
  const value = query.trim().toLowerCase();
  if (!value) return [];

  const { loadDocsSearchIndex } = await import('@/docs-content/search-index');
  const index = await loadDocsSearchIndex();

  return index
    .filter((item) => item.text.toLowerCase().includes(value))
    .slice(0, MAX_CANDIDATES)
    .map((item) => ({
      title: item.title,
      href: item.href,
      snippet: item.text.slice(0, SNIPPET_LENGTH),
    }));
}
