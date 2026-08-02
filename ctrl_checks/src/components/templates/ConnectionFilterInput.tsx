import { useRef, useState } from 'react';
import { Plug, X } from 'lucide-react';
import { ProviderLogo } from '@/components/connections/ProviderLogo';
import { cn } from '@/lib/utils';
import { suggestConnectionOptions, type ConnectionOption } from '@/lib/templateConnectionFilter';

interface Props {
  /** Committed service names, in the order the user added them. */
  tokens: string[];
  onTokensChange: (next: string[]) => void;
  /** Uncommitted text — still counts towards filtering so results move as you type. */
  draft: string;
  onDraftChange: (next: string) => void;
  options: ConnectionOption[];
  className?: string;
}

/**
 * Comma-separated service entry for the Templates gallery.
 *
 * Typing a comma (or Enter) commits the current word as a chip, so the raw
 * "airtable, whatsapp" typing style works exactly as described, while the committed
 * values stay visible and individually removable. Suggestions come from the real
 * connection catalog, so a typo cannot silently produce an empty gallery.
 */
export default function ConnectionFilterInput({
  tokens,
  onTokensChange,
  draft,
  onDraftChange,
  options,
  className,
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = suggestConnectionOptions(options, draft, tokens);

  const commit = (value: string) => {
    const trimmed = value.trim();
    onDraftChange('');
    if (!trimmed) return;
    const exists = tokens.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (!exists) onTokensChange([...tokens, trimmed]);
  };

  const removeAt = (index: number) => {
    onTokensChange(tokens.filter((_, i) => i !== index));
  };

  const handleChange = (raw: string) => {
    // Typing or pasting a comma commits everything before it, so pasted lists
    // like "airtable, whatsapp, google" expand into chips in one go.
    if (raw.includes(',')) {
      const parts = raw.split(',');
      const tail = parts.pop() ?? '';
      const additions: string[] = [];
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const dupe =
          tokens.some((t) => t.toLowerCase() === trimmed.toLowerCase()) ||
          additions.some((t) => t.toLowerCase() === trimmed.toLowerCase());
        if (!dupe) additions.push(trimmed);
      }
      if (additions.length) onTokensChange([...tokens, ...additions]);
      onDraftChange(tail);
      return;
    }
    onDraftChange(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(draft);
      return;
    }
    // Backspace on an empty box removes the last chip — standard token-field behaviour.
    if (e.key === 'Backspace' && draft === '' && tokens.length > 0) {
      e.preventDefault();
      removeAt(tokens.length - 1);
    }
  };

  const hasAny = tokens.length > 0 || draft.length > 0;

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors',
          focused && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <Plug className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />

        {tokens.map((token, index) => (
          <span
            key={`${token}-${index}`}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/60 py-0.5 pl-2 pr-1 text-xs font-medium"
          >
            {token}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(index);
              }}
              aria-label={`Remove ${token}`}
              className="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          // Delay so a click on a suggestion registers before the list unmounts.
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          placeholder={tokens.length === 0 ? 'Filter by connections — e.g. airtable, whatsapp' : 'Add another…'}
          aria-label="Filter templates by the connections you have"
          className="min-w-[12rem] flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted-foreground"
        />

        {hasAny && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTokensChange([]);
              onDraftChange('');
            }}
            className="ml-auto shrink-0 rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {focused && suggestions.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md"
          role="listbox"
          aria-label="Connection suggestions"
        >
          {suggestions.map((option) => (
            <li key={option.provider + option.label}>
              <button
                type="button"
                // onMouseDown fires before the input's blur, so the click is not lost.
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(option.label);
                  inputRef.current?.focus();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/10"
              >
                <ProviderLogo provider={option.provider} size={18} />
                <span>{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
