import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * One collapsible field group inside a node card (plan §4.3).
 *
 * Exactly one group per card is expanded by default — the actionable one. The rest
 * collapse to a header with a count.
 *
 * When a card's fields all land in a single group (measured: `http_request` and `code`
 * put everything in one bucket), the accordion adds a click and no clarity, so the
 * caller renders the rows without chrome instead. See `hasSinglePopulatedGroup`.
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
    if (count === 0) return null;

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
