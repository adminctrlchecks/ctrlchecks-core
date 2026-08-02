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

/**
 * Shown as clickable chips on the empty state. These were previously quoted
 * inline in the intro paragraph, where they read as cramped prose and could not
 * be acted on.
 */
const EXAMPLE_QUERIES = [
  'How do I set up my first project?',
  'Templates for landing pages',
  'Where do I change my billing?',
  'How do I connect Slack?',
];

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
        <div key={key} className="animate-pulse space-y-2.5 rounded-xl border border-border/50 bg-card p-5">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResultItem }) {
  const navigate = useNavigate();
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{result.title}</p>
            <Badge variant="outline" className="text-[10px] font-medium">
              {RESULT_TYPE_LABEL[result.type]}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{result.description}</p>
          <p className="text-xs italic text-muted-foreground/70">{result.reason}</p>
        </div>
        <Button
          className="shrink-0 self-start sm:self-auto"
          onClick={() => navigate(result.url)}
        >
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
      <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        <WorkflowAuthGate>
          <header className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Search</h1>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Ask in plain language and we'll point you to the right page, template, or doc.
            </p>
          </header>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch(query)}
                placeholder="Ask a question…"
                className="h-12 pl-11 text-base"
                disabled={isSearching}
                autoFocus
              />
            </div>
            <Button
              size="lg"
              className="h-12 sm:w-32"
              onClick={() => handleSearch(query)}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? 'Searching…' : 'Search'}
            </Button>
          </div>

          <div className="mt-10 space-y-6">
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
            <div className="space-y-8">
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  {data.interpreted_intent}
                </div>
                <p className="mt-2.5 leading-relaxed text-foreground">{data.answer}</p>
              </div>

              {data.results.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No matches for "{lastQuery}" yet. Try one of the related searches below, or describe it differently.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.results.map((result, index) => (
                    <ResultCard key={`${result.url}-${index}`} result={result} />
                  ))}
                </div>
              )}

              {data.suggested_actions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggested actions
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.suggested_actions.map((action) => (
                      <Button key={action.target} size="sm" variant="outline" onClick={() => navigate(action.target)}>
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {data.related_searches.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Related searches
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.related_searches.map((related) => (
                      <button
                        key={related}
                        type="button"
                        onClick={() => {
                          setQuery(related);
                          handleSearch(related);
                        }}
                        className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground"
                      >
                        {related}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasSearched && (
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Try one of these
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUERIES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      handleSearch(example);
                    }}
                    className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground"
                  >
                    {example}
                  </button>
                ))}
              </div>
              <p className="mt-8 text-sm text-muted-foreground/80">
                Searches across pages, features, templates, and docs.
              </p>
            </div>
          )}
          </div>
        </WorkflowAuthGate>
      </div>
    </div>
  );
}
