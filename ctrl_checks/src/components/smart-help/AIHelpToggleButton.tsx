import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSmartHelpStore } from '@/stores/smartHelpStore';

export function AIHelpToggleButton() {
  const { active, toggle } = useSmartHelpStore();

  return (
    <button
      type="button"
      data-smart-help-ignore
      onClick={toggle}
      aria-pressed={active}
      title={active ? 'Exit AI Help (Esc)' : 'Turn on AI Help'}
      className={cn(
        'fixed bottom-5 right-5 z-[9996] flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all duration-200',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-glow'
          : 'border-border bg-card text-primary hover:shadow-glow',
      )}
    >
      {active ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5 animate-pulse-glow" />}
    </button>
  );
}
