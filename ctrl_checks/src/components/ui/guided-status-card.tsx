import { Sparkles, PlugZap, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GuidedStatusTone } from '@/lib/workflow-guidance';

interface GuidedStatusCardProps {
  title: string;
  description: string;
  resolution?: string;
  details?: string;
  missingItems?: string[];
  nextSteps?: string[];
  tone?: GuidedStatusTone;
  onDismiss?: () => void;
}

const toneStyles: Record<GuidedStatusTone, { ring: string; bg: string; iconClass: string }> = {
  configuration: {
    ring: 'ring-indigo-500/30',
    bg: 'from-indigo-500/12 via-violet-500/8 to-transparent',
    iconClass: 'text-indigo-300',
  },
  connection: {
    ring: 'ring-cyan-500/30',
    bg: 'from-cyan-500/12 via-sky-500/8 to-transparent',
    iconClass: 'text-cyan-300',
  },
  attention: {
    ring: 'ring-amber-500/30',
    bg: 'from-amber-500/12 via-orange-500/8 to-transparent',
    iconClass: 'text-amber-300',
  },
  success: {
    ring: 'ring-emerald-500/30',
    bg: 'from-emerald-500/12 via-green-500/8 to-transparent',
    iconClass: 'text-emerald-300',
  },
};

function ToneIcon({ tone }: { tone: GuidedStatusTone }) {
  if (tone === 'connection') return <PlugZap className="h-4 w-4" />;
  if (tone === 'attention') return <ShieldAlert className="h-4 w-4" />;
  if (tone === 'success') return <CheckCircle2 className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
}

export function GuidedStatusCard({
  title,
  description,
  resolution,
  details,
  missingItems = [],
  nextSteps = [],
  tone = 'configuration',
  onDismiss,
}: GuidedStatusCardProps) {
  const style = toneStyles[tone];

  return (
    <div
      className={cn(
        'relative max-h-[min(70vh,620px)] overflow-y-auto overflow-x-hidden rounded-xl border border-border/50 bg-background/80 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.18)]',
        'ring-1 backdrop-blur-sm transition-all duration-300',
        style.ring
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70 animate-pulse', style.bg)} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background/70', style.iconClass)}>
              <ToneIcon tone={tone} />
            </span>
            <p className="min-w-0 break-words text-sm font-semibold text-foreground/95">{title}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed break-words">{description}</p>
          {resolution && <p className="text-xs text-foreground/85 break-words">{resolution}</p>}
          {missingItems.length > 0 && (
            <div className="rounded-md border border-border/50 bg-background/60 p-2">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
                Needs attention
              </p>
              <ul className="space-y-1">
                {missingItems.map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-relaxed text-foreground/90">
                    <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current', style.iconClass)} />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {nextSteps.length > 0 && (
            <div className="rounded-md border border-border/40 bg-muted/25 p-2">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
                Next steps
              </p>
              <ol className="space-y-1">
                {nextSteps.map((step, index) => (
                  <li key={`${index}-${step}`} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="shrink-0 font-medium text-foreground/70">{index + 1}.</span>
                    <span className="min-w-0 break-words">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {details && (
            <p className="rounded-md bg-muted/30 px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground/85 break-words">
              Details: {details}
            </p>
          )}
        </div>
        {onDismiss && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground/70 hover:text-foreground"
            onClick={onDismiss}
            aria-label="Dismiss guidance"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

