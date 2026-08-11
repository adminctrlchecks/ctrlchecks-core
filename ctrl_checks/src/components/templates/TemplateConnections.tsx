import { Plug } from 'lucide-react';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TemplateConnection } from '@/lib/templateConnections';
import type { TemplateConnectionMatchSummary } from '@/lib/templateConnectionFilter';

interface Props {
  connections: TemplateConnection[];
  matchSummary?: TemplateConnectionMatchSummary;
  /** True while the connection catalog is still loading. */
  loading?: boolean;
  className?: string;
}

/**
 * The services a template needs connected, shown on the gallery card before
 * anyone commits to using it.
 *
 * Deliberately does NOT reflect what the viewer has already connected — it is the
 * same for every visitor. This answers "what does this template plug into?", not
 * "am I ready to run it?". The second question is the readiness gate's job, after
 * the template has been copied.
 */
export function TemplateConnections({ connections, matchSummary, loading, className }: Props) {
  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)} aria-hidden>
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        <div className="h-6 w-6 rounded-lg bg-muted animate-pulse" />
        <div className="h-6 w-6 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  // A template that needs nothing connected is a real (and good) case — the
  // Document Vault intake template only writes to Airtable. Say so rather than
  // rendering an empty row that looks like a loading bug.
  if (connections.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        No connections required
      </p>
    );
  }

  const matchedProviders = new Set(
    matchSummary?.matchedConnections.map((connection) => connection.provider) ?? [],
  );
  const missingProviders = new Set(
    matchSummary?.missingConnections.map((connection) => connection.provider) ?? [],
  );
  const showFit = Boolean(matchSummary?.hasTokens && matchSummary.hasSelectedConnectionMatch);
  const missingCount = matchSummary?.missingCount ?? connections.length;
  const heading = showFit
    ? matchSummary?.isReadyWithListedConnections
      ? 'Ready with listed connections'
      : `Needs ${missingCount} more ${missingCount === 1 ? 'connection' : 'connections'}`
    : `Needs ${connections.length} ${connections.length === 1 ? 'connection' : 'connections'}`;

  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Plug className="h-3 w-3 shrink-0" aria-hidden />
        {heading}
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Connections this template requires">
        {connections.map((connection) => (
          <li key={connection.provider}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border py-0.5 pl-0.5 pr-2 text-xs',
                    showFit && matchedProviders.has(connection.provider)
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : showFit && missingProviders.has(connection.provider)
                        ? 'border-amber-300/70 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200'
                        : 'border-border/60 bg-muted/40',
                  )}
                  data-testid={`template-connection-${connection.provider}`}
                >
                  <ProviderLogo provider={connection.provider} size={18} />
                  <span className="font-medium">{connection.label}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{connection.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {showFit && matchedProviders.has(connection.provider)
                    ? 'Covered by your listed connections.'
                    : 'Connect this once on the Connections page to run this template.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </div>
  );
}
