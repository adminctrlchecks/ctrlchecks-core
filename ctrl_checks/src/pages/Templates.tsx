/**
 * Templates Page (User View)
 * Browse and copy workflow templates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Star, Clock, TrendingUp, Search, X, LayoutTemplate } from 'lucide-react';
import { WorkflowAuthGate } from '@/components/WorkflowAuthGate';
import { WorkflowActionButton } from '@/components/WorkflowActionButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getActiveTemplates, copyTemplate } from '@/lib/api/templates';
import { useToast } from '@/hooks/use-toast';
import { AppChromeHeader } from '@/components/layout/AppChromeHeader';
import { TemplateConnections } from '@/components/templates/TemplateConnections';
import { fetchConnectionCatalog, type ConnectionCatalogEntry } from '@/lib/connections-catalog';
import { getTemplateConnections, type TemplateConnection } from '@/lib/templateConnections';
import ConnectionFilterInput from '@/components/templates/ConnectionFilterInput';
import {
  compareTemplateConnectionFit,
  collectConnectionOptions,
  getTemplateConnectionMatchSummary,
  templateMatchesConnectionFilter,
} from '@/lib/templateConnectionFilter';
import { TEMPLATE_SECTOR_OPTIONS, type TemplateSectorFilter } from '@/lib/templateSectors';
import type { Database } from '@/integrations/aws/types';

type Template = Database['public']['Tables']['templates']['Row'] & {
  difficulty?: string;
  estimated_setup_time?: number;
  tags?: string[];
};

/** Placeholder cards sized like the real ones, so the grid does not jump when data lands. */
function TemplateCardSkeleton() {
  return (
    <Card className="flex h-full flex-col motion-safe:hover:scale-100" aria-hidden>
      <CardHeader className="gap-3 pb-4">
        <div className="flex gap-1.5">
          <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="space-y-1.5">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-0">
        <div className="mt-auto space-y-4">
          <div className="border-t border-border/50 pt-4">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Committed service chips plus the word still being typed. Both filter, so results
  // move while the user types rather than only once they hit a comma.
  const [connectionTokens, setConnectionTokens] = useState<string[]>([]);
  const [connectionDraft, setConnectionDraft] = useState('');
  const [sectorFilter, setSectorFilter] = useState<TemplateSectorFilter>('All sectors');
  const [catalog, setCatalog] = useState<ConnectionCatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getActiveTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // The connection catalog tells us which node types map to which connectable
  // service. It is public and static, so a failure here should degrade the cards
  // quietly rather than block the gallery.
  useEffect(() => {
    let cancelled = false;
    fetchConnectionCatalog()
      .then((entries) => {
        if (!cancelled) setCatalog(entries);
      })
      .catch((error) => {
        console.error('Failed to load connection catalog:', error);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopyTemplate(template: Template) {
    try {
      const result = await copyTemplate(template.id, `${template.name} (Copy)`);
      toast({
        title: 'Success',
        description: 'Template copied to your workflows',
      });
      navigate(`/workflow/${result.workflow.id}`);
    } catch (error) {
      console.error('Failed to copy template:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to copy template',
        variant: 'destructive',
      });
    }
  }

  // Computed once per template rather than per render of each card — the cards read
  // from this map too, so the filter and the chips can never disagree.
  const connectionsByTemplate = useMemo(() => {
    const map = new Map<string, TemplateConnection[]>();
    for (const template of templates) {
      map.set(
        template.id,
        getTemplateConnections(
          template.nodes as Parameters<typeof getTemplateConnections>[0],
          catalog,
        ),
      );
    }
    return map;
  }, [templates, catalog]);

  const connectionOptions = useMemo(
    () => collectConnectionOptions([...connectionsByTemplate.values()]),
    [connectionsByTemplate],
  );

  const activeConnectionTokens = useMemo(() => {
    const draft = connectionDraft.trim();
    return draft ? [...connectionTokens, draft] : connectionTokens;
  }, [connectionTokens, connectionDraft]);

  const connectionMatchByTemplate = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getTemplateConnectionMatchSummary>>();
    for (const template of templates) {
      map.set(
        template.id,
        getTemplateConnectionMatchSummary(
          connectionsByTemplate.get(template.id) ?? [],
          activeConnectionTokens,
        ),
      );
    }
    return map;
  }, [templates, connectionsByTemplate, activeConnectionTokens]);

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const hasConnectionTokens = activeConnectionTokens.length > 0;

    const matches = templates
      .map((template, index) => ({
        template,
        index,
        connectionFit: connectionMatchByTemplate.get(template.id),
      }))
      .filter(({ template }) =>
        (sectorFilter === 'All sectors' || template.category === sectorFilter)
        &&
        (template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query))
      )
      .filter(({ template }) =>
        templateMatchesConnectionFilter(
          connectionsByTemplate.get(template.id) ?? [],
          activeConnectionTokens,
        )
      );

    if (hasConnectionTokens) {
      matches.sort((a, b) => {
        const emptyFit = getTemplateConnectionMatchSummary([], activeConnectionTokens);
        const connectionDelta = compareTemplateConnectionFit(
          a.connectionFit ?? emptyFit,
          b.connectionFit ?? emptyFit,
        );
        if (connectionDelta !== 0) return connectionDelta;

        const featuredDelta = Number(Boolean(b.template.is_featured)) - Number(Boolean(a.template.is_featured));
        if (featuredDelta !== 0) return featuredDelta;

        const usesDelta = (b.template.use_count || 0) - (a.template.use_count || 0);
        if (usesDelta !== 0) return usesDelta;

        return a.index - b.index;
      });
    }

    return matches.map(({ template }) => template);
  }, [
    templates,
    searchQuery,
    sectorFilter,
    connectionsByTemplate,
    connectionMatchByTemplate,
    activeConnectionTokens,
  ]);

  const isSearching = searchQuery.trim().length > 0;
  const isFilteringConnections = activeConnectionTokens.length > 0;
  const isFilteringSector = sectorFilter !== 'All sectors';
  const hasFilters = isSearching || isFilteringConnections || isFilteringSector;

  const clearAllFilters = () => {
    setSearchQuery('');
    setConnectionTokens([]);
    setConnectionDraft('');
    setSectorFilter('All sectors');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppChromeHeader />
      <div className="container mx-auto max-w-7xl px-6 py-8">
        <WorkflowAuthGate>
          {/* Page header — title block and search on one baseline, separated from the
              grid by a rule so the input never reads as part of the first card. */}
          <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">Workflow Templates</h1>
              <p className="mt-1.5 text-muted-foreground">
                Browse pre-built workflow templates. Copy any template to start customizing.
              </p>
            </div>
            <div className="relative w-full shrink-0 md:w-80">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
                aria-label="Search templates"
              />
              {isSearching && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </header>

          {/* Connection filter — name the services you have, see only what you can run. */}
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap gap-2" aria-label="Filter templates by sector">
              {TEMPLATE_SECTOR_OPTIONS.map((sector) => (
                <button
                  key={sector}
                  type="button"
                  onClick={() => setSectorFilter(sector)}
                  className={[
                    'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                    sectorFilter === sector
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                  ].join(' ')}
                >
                  {sector}
                </button>
              ))}
            </div>
            <ConnectionFilterInput
              tokens={connectionTokens}
              onTokensChange={setConnectionTokens}
              draft={connectionDraft}
              onDraftChange={setConnectionDraft}
              options={connectionOptions}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Separate services with commas. Templates using those connections stay visible
              and are sorted by fewest extra connections needed.
            </p>
          </div>

          {loading ? (
            <>
              <div className="mt-6 h-5 w-32 animate-pulse rounded bg-muted" aria-hidden />
              <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <TemplateCardSkeleton key={i} />
                ))}
              </div>
              <p className="sr-only" role="status">Loading templates…</p>
            </>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                  {filteredTemplates.length}{' '}
                  {filteredTemplates.length === 1 ? 'template' : 'templates'}
                  {isSearching && <> matching &ldquo;{searchQuery}&rdquo;</>}
                  {isFilteringConnections && (
                    <> using {activeConnectionTokens.join(', ')}, closest setup first</>
                  )}
                  {isFilteringSector && <> in {sectorFilter}</>}
                  {hasFilters && <> of {templates.length}</>}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              {filteredTemplates.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredTemplates.map((template) => {
                    const tags = template.tags ?? [];
                    const visibleTags = tags.slice(0, 3);
                    const hiddenTagCount = tags.length - visibleTags.length;

                    return (
                      // h-full + flex column is what lets the footer pin to the bottom, so
                      // "Use Template" lands on the same line in every card of a row.
                      <Card key={template.id} className="flex h-full flex-col">
                        <CardHeader className="gap-3 space-y-0 pb-4">
                          {/* One meta row — category, difficulty and setup time read as a
                              single line of context instead of three wrapping rows. */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {template.category && (
                              <Badge variant="secondary" className="font-medium">
                                {template.category}
                              </Badge>
                            )}
                            {template.difficulty && (
                              <Badge variant="outline" className="font-normal capitalize">
                                {template.difficulty}
                              </Badge>
                            )}
                            {template.estimated_setup_time && (
                              <Badge variant="outline" className="items-center gap-1 font-normal">
                                <Clock className="h-3 w-3 shrink-0" aria-hidden />
                                {template.estimated_setup_time} min
                              </Badge>
                            )}
                          </div>

                          <CardTitle className="flex items-start gap-2 text-lg leading-snug">
                            <span className="line-clamp-2 min-w-0">{template.name}</span>
                            {template.is_featured && (
                              <Star
                                className="mt-0.5 h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500"
                                aria-label="Featured"
                              />
                            )}
                          </CardTitle>

                          {/* Clamped to three lines with the space always reserved, so a long
                              description cannot shove one card's layout out of step. */}
                          <CardDescription
                            className="line-clamp-3 min-h-[3.75rem]"
                            title={template.description ?? undefined}
                          >
                            {template.description}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="flex flex-1 flex-col pt-0">
                          <div className="flex min-h-[1.5rem] flex-wrap gap-1.5">
                            {visibleTags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs font-normal">
                                {tag}
                              </Badge>
                            ))}
                            {hiddenTagCount > 0 && (
                              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                                +{hiddenTagCount}
                              </Badge>
                            )}
                          </div>

                          {/* Bottom-anchored group: connections sit directly above the action
                              row, and both stay flush with the bottom of the card. */}
                          <div className="mt-auto space-y-4 pt-4">
                            <div className="border-t border-border/50 pt-4">
                              <TemplateConnections
                                connections={connectionsByTemplate.get(template.id) ?? []}
                                matchSummary={connectionMatchByTemplate.get(template.id)}
                                loading={catalogLoading}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
                                {template.use_count || 0} uses
                              </span>
                              <WorkflowActionButton onClick={() => handleCopyTemplate(template)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Use Template
                              </WorkflowActionButton>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    {hasFilters ? (
                      <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
                    ) : (
                      <LayoutTemplate className="h-5 w-5 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <p className="font-medium">
                    {hasFilters ? 'No templates match your filters' : 'No templates available yet'}
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    {isFilteringConnections
                      ? 'No templates use those services with the current filters. Try another connection or reset filters.'
                      : isSearching
                        ? 'Try a different name, service or keyword.'
                        : 'Templates published by your workspace will appear here.'}
                  </p>
                  {hasFilters && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={clearAllFilters}>
                      Reset filters
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </WorkflowAuthGate>
      </div>
    </div>
  );
}
