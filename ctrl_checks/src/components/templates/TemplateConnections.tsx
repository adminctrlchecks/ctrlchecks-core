import { Plug } from 'lucide-react';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TemplateConnection } from '@/lib/templateConnections';

interface Props {
  connections: TemplateConnection[];
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
export function TemplateConnections({ connections, loading, className }: Props) {
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

  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Plug className="h-3 w-3 shrink-0" aria-hidden />
        Needs {connections.length} {connections.length === 1 ? 'connection' : 'connections'}
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Connections this template requires">
        {connections.map((connection) => (
          <li key={connection.provider}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 py-0.5 pl-0.5 pr-2 text-xs"
                  data-testid={`template-connection-${connection.provider}`}
                >
                  <ProviderLogo provider={connection.provider} size={18} />
                  <span className="font-medium">{connection.label}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{connection.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  Connect this once on the Connections page to run this template.
                </p>
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </div>
  );
}
