import { Sparkles, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorMode } from '@/hooks/useEditorMode';

const OPTIONS: Array<{ value: EditorMode; label: string; icon: LucideIcon; hint: string }> = [
  {
    value: 'prompt',
    label: 'Prompt AI',
    icon: Sparkles,
    hint: 'Canvas, AI Editor and the execution console — no node library or properties',
  },
  {
    value: 'expert',
    label: 'Expert AI',
    icon: SlidersHorizontal,
    hint: 'Full editor: node library, canvas and properties panel',
  },
];

interface WorkflowModeSwitchProps {
  mode: EditorMode;
  onChange: (next: EditorMode) => void;
}

export default function WorkflowModeSwitch({ mode, onChange }: WorkflowModeSwitchProps) {
  return (
    <div
      role="group"
      aria-label="Editor mode"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon, hint }) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={isActive}
            title={hint}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
