/**
 * Smart Search results page.
 *
 * Natural-language search over pages, features, templates, settings, and
 * docs — via POST /api/search (worker/src/services/search/). Every result
 * link is guaranteed to be a real, existing route; the backend never trusts
 * the model's url/target, only its ranking/phrasing.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, Sparkles } from 'lucide-react';
import { AppChromeHeader } from '@/components/layout/AppChromeHeader';
import { WorkflowAuthGate } from '@/components/WorkflowAuthGate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSmartSearch } from '@/hooks/useSmartSearch';
import type { SearchResultItem } from '@/types/search';

const RESULT_TYPE_LABEL: Record<SearchResultItem['type'], string> = {
  page: 'Page',
  feature: 'Feature',
  product: 'Product',
  article: 'Article',
  template: 'Template',
  setting: 'Setting',
  action: 'Action',
  other: 'Other',
};

function ResultsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((key) => (
        <div key={key} className="animate-pulse space-y-2 rounded-lg border border-border/50 bg-card p-4">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResultItem }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{result.title}</p>
            <Badge variant="outline" className="text-[10px]">
              {RESULT_TYPE_LABEL[result.type]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{result.description}</p>
          <p className="mt-1.5 text-xs italic text-muted-foreground/70">{result.reason}</p>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => navigate(result.url)}>
          {result.action_label}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SmartSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const { data, isSearching, isError, error, lastQuery, search, retry } = useSmartSearch();

  useEffect(() => {
    const initial = searchParams.get('q');
    if (initial && initial.trim()) {
      search(initial.trim());
    }
    // Only run once on mount — subsequent searches are user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSearchParams({ q: trimmed });
    search(trimmed);
  };

  const hasSearched = Boolean(data) || isSearching || isError;

  return (
    <div className="min-h-screen bg-background">
      <AppChromeHeader />
      <div className="container mx-auto max-w-3xl space-y-6 p-6">
        <WorkflowAuthGate>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Search</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask in plain language — "how do I set up my first project?", "templates for landing pages", "where do I
              change my billing?"
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch(query)}
                placeholder="Search..."
                className="pl-9"
                disabled={isSearching}
                autoFocus
              />
            </div>
            <Button onClick={() => handleSearch(query)} disabled={isSearching || !query.trim()}>
              {isSearching ? 'Searching…' : 'Search'}
            </Button>
          </div>

          {isSearching && <ResultsSkeleton />}

          {isError && !isSearching && (
            <Alert variant="destructive">
              <AlertTitle>Couldn't run that search</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{error?.message || 'Something went wrong. Try again.'}</span>
                <Button size="sm" variant="outline" onClick={retry}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isSearching && !isError && data && (
            <div className="space-y-5">
              <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {data.interpreted_intent}
                </div>
                <p className="mt-1.5 text-sm text-foreground">{data.answer}</p>
              </div>

              {data.results.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No matches for "{lastQuery}" yet. Try one of the related searches below, or describe it differently.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.results.map((result, index) => (
                    <ResultCard key={`${result.url}-${index}`} result={result} />
                  ))}
                </div>
              )}

              {data.suggested_actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.suggested_actions.map((action) => (
                    <Button key={action.target} size="sm" variant="outline" onClick={() => navigate(action.target)}>
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {data.related_searches.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.related_searches.map((related) => (
                    <button
                      key={related}
                      type="button"
                      onClick={() => {
                        setQuery(related);
                        handleSearch(related);
                      }}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {related}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasSearched && (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Type a question above to search across pages, features, templates, and docs.
            </p>
          )}
        </WorkflowAuthGate>
      </div>
    </div>
  );
}
