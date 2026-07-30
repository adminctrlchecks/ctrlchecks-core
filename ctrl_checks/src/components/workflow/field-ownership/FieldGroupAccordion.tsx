import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * One collapsible section inside a node card (plan §4.3).
 *
 * Exactly one section per card is expanded by default — the actionable one. The rest
 * collapse to a header with a count.
 *
 * Renders even at `count === 0`. It used to return null, which is why a node with nothing
 * optional simply had no Optional heading: the card's shape changed from step to step and
 * there was no fixed place to look for "what must I provide". Whether an empty section is
 * worth showing is the caller's call, not this component's.
 */
export interface FieldGroupAccordionProps {
    title: string;
    count: number;
    expanded: boolean;
    onToggle: () => void;
    children: ReactNode;
}

export function FieldGroupAccordion({
    title,
    count,
    expanded,
    onToggle,
    children,
}: FieldGroupAccordionProps) {
    return (
        <div className="rounded border border-border/40">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/20 transition-colors"
            >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                    {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    )}
                    {title}
                </span>
                <span className="text-[10px] rounded-full bg-muted/50 px-1.5 py-0.5 text-muted-foreground">
                    {count}
                </span>
            </button>
            {expanded && <div className="px-3 pb-3 space-y-3">{children}</div>}
        </div>
    );
}
